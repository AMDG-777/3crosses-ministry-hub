import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

async function callClaude(prompt, onChunk) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    const data = await res.json()
    const text = data.content?.map(c => c.text || '').join('') || 'Could not generate. Try again.'
    onChunk(text)
  } catch {
    onChunk('Error connecting to AI. Please try again.')
  }
}

function useToast() {
  const [toasts, setToasts] = useState([])
  const show = (msg, type = 'info') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }
  return { toasts, show }
}

const COLORS = ['#feebc8','#e9d8fd','#c6f6d5','#bee3f8','#fed7e2','#c6f6d5']
const TCOLORS = ['#7b341e','#553c9a','#276749','#2a69ac','#97266d','#276749']
function Avatar({ name, size = 38, idx = 0 }) {
  const initials = name?.split(' ').map(x => x[0]).join('').slice(0,2) || '??'
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.35, background: COLORS[idx % COLORS.length], color: TCOLORS[idx % TCOLORS.length] }}>
      {initials}
    </div>
  )
}

function AiComposer({ volunteer, defaultType = 'thank' }) {
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState(defaultType)
  const [copied, setCopied] = useState(false)

  const types = [
    { id: 'birthday', label: '🎂 Birthday' },
    { id: 'thank', label: '💛 Thank You' },
    { id: 'recruit', label: '📣 Invite to Serve' },
    { id: 'encourage', label: '🔥 Encourage' },
    { id: 'vision', label: '✨ Vision Cast' },
    { id: 'checkin', label: '👋 Check-In' },
  ]

  const prompts = {
    birthday: `You are a warm ministry director at 3Crosses Church in Castro Valley, CA. Write a personal birthday message for ${volunteer?.name || 'a volunteer'}, who serves as ${volunteer?.role || 'a volunteer'} and has been serving for ${volunteer?.years_of_service || 1} year(s). Under 100 words. Include a short scripture or blessing. Warm and personal.`,
    thank: `You are a ministry director at 3Crosses Church Castro Valley. Write a heartfelt thank-you to ${volunteer?.name || 'a volunteer'} (${volunteer?.role || 'volunteer'}) who has served ${volunteer?.hours_ytd || 0} hours this year. Under 100 words. Make them feel genuinely seen and valued.`,
    recruit: `You are a ministry director at 3Crosses Church Castro Valley. Write a warm, compelling invite for ${volunteer?.name || 'a volunteer'} (${volunteer?.role || 'volunteer'}) to sign up for an upcoming event or shift. Under 100 words. Inspire with purpose, not guilt.`,
    encourage: `You are a ministry director at 3Crosses Church Castro Valley. Write an encouraging message for ${volunteer?.name || 'a volunteer'} (${volunteer?.role || 'volunteer'}). Remind them their service has eternal impact. Under 100 words. Passionate and faith-filled.`,
    vision: `You are a ministry director at 3Crosses Church Castro Valley. Write a vision-casting message for ${volunteer?.name || 'a volunteer'} (${volunteer?.role || 'volunteer'}). Help them see the eternal significance of their role. Under 120 words.`,
    checkin: `You are a ministry director at 3Crosses Church Castro Valley. Write a warm personal check-in message to ${volunteer?.name || 'a volunteer'} (${volunteer?.role || 'volunteer'}). Ask how they are doing and acknowledge their faithfulness. Under 80 words. Pastoral and genuine.`,
  }

  const generate = async () => {
    setLoading(true)
    setOutput('')
    await callClaude(prompts[type], (text) => {
      setOutput(text)
      setLoading(false)
    })
  }

  const copy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="ai-composer">
      <div className="ai-label">🤖 AI Message Generator</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {types.map(t => (
          <button key={t.id} className={`filter-chip${type === t.id ? ' active' : ''}`} onClick={() => setType(t.id)} style={{ fontSize: 11 }}>{t.label}</button>
        ))}
      </div>
      <div className="ai-output" style={{ minHeight: 90 }}>
        {loading ? (
          <div className="ai-typing">
            <div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" />
          </div>
        ) : output || 'Select a type above and click Generate...'}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={generate} disabled={loading}>
          {loading ? 'Generating...' : '🤖 Generate'}
        </button>
        {output && <button className="btn btn-ghost btn-sm" onClick={copy}>{copied ? '✅ Copied!' : 'Copy'}</button>}
      </div>
    </div>
  )
}

function AddVolunteerModal({ onClose, onSaved, toast }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'Kids Ministry', birthday: '', status: 'active', hours_ytd: 0, years_of_service: 1 })
  const [saving, setSaving] = useState(false)
  const roles = ['Kids Ministry', 'Worship Team', 'Tech/Media', 'Hospitality', 'Prayer Team', 'Outreach']

  const save = async () => {
    if (!form.name || !form.email) { toast('Name and email are required', 'info'); return }
    setSaving(true)
    const { error } = await supabase.from('volunteers').insert([form])
    setSaving(false)
    if (error) { toast('Error saving: ' + error.message, 'info'); return }
    toast('✅ Volunteer added!', 'success')
    onSaved()
    onClose()
  }

  return (
    <div className="modal-backdrop open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-hero" style={{ justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, color: '#fff', fontWeight: 600 }}>Add Volunteer</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>3Crosses Ministry Hub</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        <div className="modal-body">
          <div className="two-col">
            <div className="form-row">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Sarah Mitchell" />
            </div>
            <div className="form-row">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="sarah@email.com" />
            </div>
            <div className="form-row">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(510) 555-0100" />
            </div>
            <div className="form-row">
              <label className="form-label">Ministry Role</label>
              <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                {roles.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label className="form-label">Birthday</label>
              <input className="form-input" type="date" value={form.birthday} onChange={e => setForm({ ...form, birthday: e.target.value })} />
            </div>
            <div className="form-row">
              <label className="form-label">Years of Service</label>
              <input className="form-input" type="number" min="0" value={form.years_of_service} onChange={e => setForm({ ...form, years_of_service: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="form-row">
              <label className="form-label">Hours YTD</label>
              <input className="form-input" type="number" min="0" value={form.hours_ytd} onChange={e => setForm({ ...form, hours_ytd: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="form-row">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Add Volunteer'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileModal({ volunteer, idx, onClose, onDelete, toast }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const roleClass = { 'Kids Ministry': 'role-kids', 'Worship Team': 'role-worship', 'Tech/Media': 'role-tech', 'Hospitality': 'role-host', 'Prayer Team': 'role-prayer' }

  const del = async () => {
    const { error } = await supabase.from('volunteers').delete().eq('id', volunteer.id)
    if (error) { toast('Error deleting: ' + error.message, 'info'); return }
    toast('🗑️ Volunteer removed', 'info')
    onDelete()
    onClose()
  }

  return (
    <div className="modal-backdrop open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-hero">
          <Avatar name={volunteer.name} size={64} idx={idx} />
          <div style={{ flex: 1, marginLeft: 16 }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, color: '#fff', fontWeight: 600 }}>{volunteer.name}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>{volunteer.role} · {volunteer.years_of_service || 0} yr{volunteer.years_of_service !== 1 ? 's' : ''} of service</div>
            <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
              {[{ val: volunteer.hours_ytd || 0, label: 'Hrs YTD' }, { val: volunteer.status === 'active' ? '✓' : '—', label: 'Status' }].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: '#e8a030' }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 18, alignSelf: 'flex-start' }}>×</button>
        </div>
        <div className="modal-body">
          <AiComposer volunteer={volunteer} defaultType="thank" />
          <hr className="divider" />
          <div className="two-col">
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Contact</div>
              <div style={{ fontSize: 13.5, lineHeight: 2, color: 'var(--text-mid)' }}>
                📧 {volunteer.email}<br />
                📱 {volunteer.phone || '—'}<br />
                🎂 {volunteer.birthday ? new Date(volunteer.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '—'}<br />
                <span className={`role-tag ${roleClass[volunteer.role] || 'role-host'}`} style={{ marginTop: 4, display: 'inline-block' }}>{volunteer.role}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Ministry Stats</div>
              <div style={{ fontSize: 13.5, lineHeight: 2, color: 'var(--text-mid)' }}>
                ⏱ Hours this year: <strong>{volunteer.hours_ytd || 0}</strong><br />
                📅 Years serving: <strong>{volunteer.years_of_service || 0}</strong><br />
                🔘 Status: <span className={`pill ${volunteer.status === 'active' ? 'pill-green' : 'pill-red'}`}>{volunteer.status}</span>
              </div>
            </div>
          </div>
          <hr className="divider" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {confirmDelete
              ? <><span style={{ fontSize: 13, color: 'var(--text-mid)', alignSelf: 'center' }}>Are you sure?</span>
                  <button className="btn btn-danger btn-sm" onClick={del}>Yes, Remove</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button></>
              : <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(true)} style={{ color: 'var(--danger)' }}>Remove Volunteer</button>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

function Dashboard({ volunteers, toast }) {
  const active = volunteers.filter(v => v.status === 'active').length
  const totalHours = volunteers.reduce((s, v) => s + (v.hours_ytd || 0), 0)
  const [aiOutput, setAiOutput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const quickAI = async (type) => {
    setAiLoading(true)
    setAiOutput('')
    const prompts = {
      vision: `You are a ministry director at 3Crosses Church Castro Valley. Write an inspiring vision-casting message for your ${active} volunteer team. Under 150 words. Bold, faith-filled, motivating.`,
      celebrate: `You are a ministry director at 3Crosses Church Castro Valley. Write a celebration message to your ${active} volunteers who have collectively served ${totalHours} hours this year. Under 120 words. Joyful and specific.`,
      easter: `You are a ministry director at 3Crosses Church Castro Valley. Write a compelling Easter volunteer recruitment message. Under 120 words. Inspiring urgency, no guilt.`,
    }
    await callClaude(prompts[type], (text) => { setAiOutput(text); setAiLoading(false) })
  }

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-val">{active}</div>
          <div className="stat-label">Active Volunteers</div>
          <div className="stat-sub">of {volunteers.length} total</div>
        </div>
        <div className="stat-card gold">
          <div className="stat-val">{totalHours}</div>
          <div className="stat-label">Total Hours YTD</div>
          <div className="stat-sub">across all ministries</div>
        </div>
        <div className="stat-card green">
          <div className="stat-val">{volunteers.filter(v => v.role === 'Kids Ministry').length}</div>
          <div className="stat-label">Kids Ministry</div>
          <div className="stat-sub">team members</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-val">{volunteers.filter(v => v.role === 'Worship Team').length}</div>
          <div className="stat-label">Worship Team</div>
          <div className="stat-sub">team members</div>
        </div>
      </div>
      <div className="dash-grid">
        <div className="card">
          <div className="card-header"><div className="card-title">👥 Team Breakdown</div></div>
          <div className="card-body">
            {['Kids Ministry','Worship Team','Tech/Media','Hospitality','Prayer Team','Outreach'].map(role => {
              const count = volunteers.filter(v => v.role === role).length
              const pct = volunteers.length ? Math.round(count / volunteers.length * 100) : 0
              return (
                <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 120, fontSize: 13, fontWeight: 500 }}>{role}</div>
                  <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pct + '%', background: 'var(--blue)', borderRadius: 4 }} />
                  </div>
                  <div style={{ width: 24, fontSize: 12, color: 'var(--text-light)', textAlign: 'right' }}>{count}</div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="card" style={{ border: '2px solid #c3d5f8' }}>
          <div className="card-header" style={{ background: '#f0f4ff' }}>
            <div className="card-title" style={{ color: 'var(--blue)' }}>🤖 AI Quick Actions</div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-primary" style={{ width: '100%', textAlign: 'left' }} onClick={() => quickAI('vision')}>✨ Cast vision to whole team</button>
            <button className="btn btn-gold" style={{ width: '100%', textAlign: 'left' }} onClick={() => quickAI('easter')}>🌅 Recruit Easter volunteers</button>
            <button className="btn btn-ghost" style={{ width: '100%', textAlign: 'left' }} onClick={() => quickAI('celebrate')}>🎉 Celebrate team hours</button>
            {aiLoading && <div className="ai-typing"><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /></div>}
            {aiOutput && !aiLoading && (
              <div style={{ background: '#f0f4ff', borderRadius: 8, padding: 12, fontSize: 13, lineHeight: 1.6, color: 'var(--navy)', marginTop: 4 }}>
                {aiOutput}
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => { navigator.clipboard.writeText(aiOutput); toast('📋 Copied!', 'info') }}>Copy</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setAiOutput('')}>Clear</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function VolunteersView({ volunteers, onRefresh, toast }) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const roleClass = { 'Kids Ministry': 'role-kids', 'Worship Team': 'role-worship', 'Tech/Media': 'role-tech', 'Hospitality': 'role-host', 'Prayer Team': 'role-prayer' }
  const roles = ['all', 'Kids Ministry', 'Worship Team', 'Tech/Media', 'Hospitality', 'Prayer Team']
  const filtered = volunteers.filter(v => {
    const matchSearch = v.name?.toLowerCase().includes(search.toLowerCase()) || v.role?.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || v.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input className="form-input" style={{ flex: 1, minWidth: 200 }} placeholder="🔍  Search by name or role..." value={search} onChange={e => setSearch(e.target.value)} />
        {roles.map(r => (
          <button key={r} className={`filter-chip${roleFilter === r ? ' active' : ''}`} onClick={() => setRoleFilter(r)}>{r === 'all' ? 'All' : r}</button>
        ))}
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Volunteer</button>
      </div>
      <div className="card">
        <table className="vol-table">
          <thead>
            <tr><th>Volunteer</th><th>Role</th><th>Hours YTD</th><th>Birthday</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-light)' }}>{volunteers.length === 0 ? 'No volunteers yet — add your first one!' : 'No results found.'}</td></tr>
              : filtered.map((v, i) => (
                <tr key={v.id} onClick={() => setSelected({ v, i })}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={v.name} idx={i} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{v.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{v.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`role-tag ${roleClass[v.role] || 'role-host'}`}>{v.role}</span></td>
                  <td>{v.hours_ytd || 0}h</td>
                  <td>{v.birthday ? new Date(v.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                  <td><span className={`pill ${v.status === 'active' ? 'pill-green' : 'pill-red'}`}>{v.status}</span></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {selected && <ProfileModal volunteer={selected.v} idx={selected.i} onClose={() => setSelected(null)} onDelete={() => { onRefresh(); setSelected(null) }} toast={toast} />}
      {showAdd && <AddVolunteerModal onClose={() => setShowAdd(false)} onSaved={onRefresh} toast={toast} />}
    </div>
  )
}

function MessagingView({ volunteers }) {
  const [msgType, setMsgType] = useState('birthday')
  const [tone, setTone] = useState('warm')
  const [context, setContext] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const types = [
    { id: 'birthday', label: '🎂 Birthday', desc: 'Personal celebration' },
    { id: 'thank', label: '💛 Thank You', desc: 'Appreciate service' },
    { id: 'recruit', label: '🙋 Recruit', desc: 'Invite to serve' },
    { id: 'vision', label: '✨ Vision Cast', desc: 'Inspire & motivate' },
    { id: 'impact', label: '🌟 Impact Story', desc: 'Share what God did' },
    { id: 'reminder', label: '📣 Reminder', desc: 'Upcoming shift' },
  ]
  const tones = ['warm', 'inspiring', 'brief', 'formal']
  const toneMap = { warm: 'Warm and personal', inspiring: 'Passionate and energetic', brief: 'Short and direct', formal: 'Professional and respectful' }

  const generate = async () => {
    setLoading(true); setOutput('')
    const base = `You are a ministry director at 3Crosses Church Castro Valley. Tone: ${toneMap[tone]}.`
    const prompts = {
      birthday: `${base} Write a birthday message for a volunteer. Context: ${context || 'A valued volunteer'}. Under 120 words. Include a scripture.`,
      thank: `${base} Write a thank-you message to a volunteer for their service. Context: ${context || 'They served faithfully this weekend'}. Under 120 words.`,
      recruit: `${base} Write a volunteer recruitment invite. Context: ${context || 'Big upcoming event needs volunteers'}. Under 130 words. Inspire with purpose.`,
      vision: `${base} Write a vision-casting message to your volunteer team. Context: ${context || 'Share the big picture of what God is doing'}. Under 150 words.`,
      impact: `${base} Write an impact story message. Context: ${context || 'Volunteers are making a real difference'}. Under 130 words.`,
      reminder: `${base} Write a friendly shift reminder. Context: ${context || 'Reminder about upcoming service'}. Under 80 words.`,
    }
    await callClaude(prompts[msgType], (text) => { setOutput(text); setLoading(false) })
  }

  return (
    <div className="two-col" style={{ alignItems: 'start' }}>
      <div>
        <div className="section-title">✉️ AI Message Composer</div>
        <div className="card">
          <div className="card-body">
            <div className="form-row">
              <label className="form-label">Message Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {types.map(t => (
                  <div key={t.id} onClick={() => setMsgType(t.id)} style={{ border: `2px solid ${msgType === t.id ? 'var(--blue)' : 'var(--border)'}`, borderRadius: 10, padding: 12, textAlign: 'center', cursor: 'pointer', background: msgType === t.id ? '#eef4ff' : '#fff' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Tone</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {tones.map(t => <button key={t} className={`filter-chip${tone === t ? ' active' : ''}`} onClick={() => setTone(t)} style={{ textTransform: 'capitalize' }}>{t}</button>)}
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Context (optional)</label>
              <textarea className="form-textarea" placeholder="e.g. Sarah led the Easter kids program..." value={context} onChange={e => setContext(e.target.value)} style={{ minHeight: 70 }} />
            </div>
            <div className="ai-composer" style={{ marginBottom: 0 }}>
              <div className="ai-label">🤖 Generated Message</div>
              <div className="ai-output" style={{ minHeight: 140 }}>
                {loading ? <div className="ai-typing"><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /></div> : output || 'Select a type and click Generate...'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={generate} disabled={loading}>{loading ? 'Generating...' : '🤖 Generate'}</button>
              {output && <button className="btn btn-ghost" onClick={() => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>{copied ? '✅ Copied!' : 'Copy'}</button>}
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="section-title">👥 Your Volunteers ({volunteers.length})</div>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
            {volunteers.length === 0
              ? <div style={{ color: 'var(--text-light)', fontSize: 13, textAlign: 'center', padding: 20 }}>Add volunteers first</div>
              : volunteers.map((v, i) => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <Avatar name={v.name} size={32} idx={i} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{v.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{v.role}</div>
                  </div>
                  <span className={`pill ${v.status === 'active' ? 'pill-green' : 'pill-red'}`}>{v.status}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function RecognitionView({ volunteers, toast }) {
  const [context, setContext] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    if (!context.trim()) { toast('Describe what the volunteer did first', 'info'); return }
    setLoading(true); setOutput('')
    await callClaude(`You are a ministry director at 3Crosses Church Castro Valley. Write a public recognition for a volunteer. Context: ${context}. Under 100 words. Warm, specific, celebratory.`, (text) => { setOutput(text); setLoading(false) })
  }

  return (
    <div className="two-col" style={{ alignItems: 'start' }}>
      <div>
        <div className="section-title">✍️ Write a Recognition</div>
        <div className="card">
          <div className="card-body">
            <div className="form-row">
              <label className="form-label">What did they do?</label>
              <textarea className="form-textarea" placeholder="e.g. Maria stayed 2 extra hours to welcome every family at Easter..." value={context} onChange={e => setContext(e.target.value)} />
            </div>
            <div className="ai-composer" style={{ marginBottom: 0 }}>
              <div className="ai-label">🤖 AI Recognition</div>
              <div className="ai-output" style={{ minHeight: 100 }}>
                {loading ? <div className="ai-typing"><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /></div> : output || 'AI will craft a heartfelt public recognition...'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={generate} disabled={loading}>{loading ? 'Generating...' : '🤖 Generate'}</button>
              {output && <button className="btn btn-gold" onClick={() => { navigator.clipboard.writeText(output); toast('🏆 Copied!', 'success') }}>Copy & Share</button>}
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="section-title">🏆 Milestone Badges</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          {[
            { icon: '🌱', name: 'First Serve', desc: 'First shift' },
            { icon: '🔥', name: 'On Fire', desc: '10+ shifts' },
            { icon: '⭐', name: 'All-Star', desc: '50+ hours' },
            { icon: '💎', name: 'Diamond', desc: '100+ hours' },
            { icon: '🌅', name: 'Easter Champion', desc: 'Easter service' },
            { icon: '🤝', name: 'Team Builder', desc: 'Recruited 3+' },
            { icon: '🎄', name: 'Christmas Hero', desc: 'Holiday service' },
            { icon: '👑', name: 'Ministry Leader', desc: 'Team leader' },
          ].map(b => (
            <div key={b.name} style={{ textAlign: 'center', padding: '14px 8px', background: '#fff', borderRadius: 10, boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{b.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>{b.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-light)' }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InspireView({ volunteers, toast }) {
  const [inspireType, setInspireType] = useState('impact')
  const [context, setContext] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const types = [
    { id: 'impact', icon: '🌊', label: 'Impact Story', desc: 'Share what God did' },
    { id: 'vision', icon: '🔭', label: 'Cast Vision', desc: 'Big picture direction' },
    { id: 'motivate', icon: '🔥', label: 'Motivate', desc: 'Rally before big event' },
    { id: 'value', icon: '💎', label: 'Show Their Value', desc: "You matter. Here's why." },
    { id: 'celebrate', icon: '🎉', label: 'Celebrate Wins', desc: 'Highlight victories' },
    { id: 'season', icon: '📖', label: 'Seasonal Word', desc: 'Advent, Easter, etc.' },
  ]

  const generate = async () => {
    setLoading(true); setOutput('')
    const count = volunteers.filter(v => v.status === 'active').length
    const prompts = {
      impact: `You are a ministry director at 3Crosses Church Castro Valley with ${count} active volunteers. Write an impact story message. Context: ${context || 'God is moving through our volunteers'}. Under 180 words.`,
      vision: `You are a ministry director at 3Crosses Church Castro Valley. Write a vision-casting message for ${count} volunteers. Context: ${context || 'Share where God is taking 3Crosses'}. Under 180 words.`,
      motivate: `You are a ministry director at 3Crosses Church Castro Valley. Write a pre-event rally message for ${count} volunteers. Context: ${context || 'Big event coming up'}. Under 150 words.`,
      value: `You are a ministry director at 3Crosses Church Castro Valley. Write a message helping ${count} volunteers understand their eternal significance. Context: ${context || 'Volunteers wonder if they matter'}. Under 160 words.`,
      celebrate: `You are a ministry director at 3Crosses Church Castro Valley. Write a celebration message for ${count} volunteers. Context: ${context || 'Great things have happened recently'}. Under 150 words.`,
      season: `You are a ministry director at 3Crosses Church Castro Valley. Write an Easter season message for ${count} volunteers connecting the resurrection to their service. Under 160 words.`,
    }
    await callClaude(prompts[inspireType], (text) => { setOutput(text); setLoading(false) })
  }

  return (
    <div className="two-col" style={{ alignItems: 'start' }}>
      <div>
        <div className="section-title">✨ Inspire & Cast Vision</div>
        <div className="card">
          <div className="card-body">
            <div className="form-row">
              <label className="form-label">What do you want to share?</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
                {types.map(t => (
                  <div key={t.id} onClick={() => setInspireType(t.id)} style={{ border: `2px solid ${inspireType === t.id ? 'var(--blue)' : 'var(--border)'}`, borderRadius: 10, padding: 12, textAlign: 'center', cursor: 'pointer', background: inspireType === t.id ? '#eef4ff' : '#fff' }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{t.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{t.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 2 }}>{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Specific details (optional)</label>
              <textarea className="form-textarea" placeholder="e.g. This Sunday 3 families gave their lives to Christ..." value={context} onChange={e => setContext(e.target.value)} style={{ minHeight: 70 }} />
            </div>
            <div className="ai-composer" style={{ marginBottom: 0 }}>
              <div className="ai-label">🤖 AI Vision Message</div>
              <div className="ai-output" style={{ minHeight: 180 }}>
                {loading ? <div className="ai-typing"><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /></div> : output || 'Your AI-crafted vision message will appear here...'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={generate} disabled={loading}>{loading ? 'Generating...' : '🤖 Generate'}</button>
              {output && <button className="btn btn-gold" onClick={() => { navigator.clipboard.writeText(output); toast('✨ Copied!', 'success') }}>Copy & Send</button>}
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="section-title">📌 Vision Statements</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { color: 'var(--gold)', text: '"Every Sunday, you\'re not setting up chairs — you\'re creating the moment someone first feels at home in God\'s house."' },
            { color: 'var(--blue)', text: '"3 families found Christ this month. They walked through doors that you held open — literally and spiritually."' },
            { color: 'var(--success)', text: '"Easter is our Super Bowl. And I want every single one of you standing on that field with us."' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ borderLeft: `4px solid ${s.color}`, borderRadius: 0 }}>
              <div className="card-body">
                <div style={{ fontSize: 13.5, color: 'var(--navy)', lineHeight: 1.65, fontStyle: 'italic' }}>{s.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState('dashboard')
  const [volunteers, setVolunteers] = useState([])
  const [loading, setLoading] = useState(true)
  const { toasts, show: toast } = useToast()

  const loadVolunteers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('volunteers').select('*').order('name')
    if (!error) setVolunteers(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadVolunteers() }, [loadVolunteers])

  const navItems = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard', section: 'Overview' },
    { id: 'volunteers', icon: '👥', label: 'Volunteers', section: 'Overview', badge: volunteers.length },
    { id: 'messaging', icon: '✉️', label: 'AI Messaging', section: 'Engagement' },
    { id: 'recognition', icon: '🏆', label: 'Recognition', section: 'Engagement' },
    { id: 'inspire', icon: '✨', label: 'Inspire & Vision', section: 'Engagement' },
  ]

  const sections = [...new Set(navItems.map(n => n.section))]
  const titles = { dashboard: 'Ministry Dashboard', volunteers: 'Volunteers', messaging: 'AI Messaging', recognition: 'Recognition', inspire: 'Inspire & Vision' }

  return (
    <div style={{ display: 'flex' }}>
      <nav className="sidebar">
        <div className="logo-area">
          <div className="logo-cross">✝ 3Crosses</div>
          <div className="logo-sub">Ministry Hub · Castro Valley</div>
        </div>
        {sections.map(section => (
          <div key={section} className="nav-section">
            <div className="nav-label">{section}</div>
            {navItems.filter(n => n.section === section).map(n => (
              <div key={n.id} className={`nav-item${view === n.id ? ' active' : ''}`} onClick={() => setView(n.id)}>
                <span style={{ width: 18, textAlign: 'center' }}>{n.icon}</span>
                {n.label}
                {n.badge > 0 && <span className="nav-badge">{n.badge}</span>}
              </div>
            ))}
          </div>
        ))}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8, cursor: 'pointer' }}>
            <div className="avatar" style={{ background: 'var(--gold)', color: 'var(--navy)', width: 32, height: 32, fontSize: 12 }}>MD</div>
            <div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', fontWeight: 500 }}>Ministry Director</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>3Crosses · Admin</div>
            </div>
          </div>
        </div>
      </nav>
      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{titles[view]}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={loadVolunteers}>↻ Refresh</button>
            <button className="btn btn-primary btn-sm" onClick={() => setView('volunteers')}>+ Add Volunteer</button>
            <button className="btn btn-gold btn-sm" onClick={() => setView('messaging')}>✨ AI Message</button>
          </div>
        </div>
        <div className="content">
          {loading
            ? <div className="spinner" />
            : <>
                {view === 'dashboard' && <Dashboard volunteers={volunteers} toast={toast} />}
                {view === 'volunteers' && <VolunteersView volunteers={volunteers} onRefresh={loadVolunteers} toast={toast} />}
                {view === 'messaging' && <MessagingView volunteers={volunteers} />}
                {view === 'recognition' && <RecognitionView volunteers={volunteers} toast={toast} />}
                {view === 'inspire' && <InspireView volunteers={volunteers} toast={toast} />}
              </>
          }
        </div>
      </div>
      <div className="toast-container">
        {toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>)}
      </div>
    </div>
  )
}
