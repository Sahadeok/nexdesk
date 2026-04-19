'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'

export default function UserDashboard() {
  const router   = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('tickets') // 'tickets' | 'new'

  // New ticket form state
  const [form, setForm]           = useState({ title: '', description: '', priority: 'medium' })
  const [screenshot, setScreenshot] = useState(null)   // { base64, type, name, preview }
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg]   = useState('')
  const [submitted, setSubmitted]   = useState(false)
  const [newTicketId, setNewTicketId] = useState(null)
  const fileRef = useRef()

  const STATUS = {
    open:        { label:'Open',        bg:'#1e3a5f', color:'#60a5fa' },
    in_progress: { label:'In Progress', bg:'#1e1b4b', color:'#a78bfa' },
    resolved:    { label:'Resolved',    bg:'#022c22', color:'#34d399' },
    closed:      { label:'Closed',      bg:'#1f2937', color:'#6b7280' },
  }
  const PRIORITY = {
    low:      { label:'Low',      color:'#34d399' },
    medium:   { label:'Medium',   color:'#f59e0b' },
    high:     { label:'High',     color:'#f97316' },
    critical: { label:'Critical', color:'#ef4444' },
  }

  useEffect(() => {
    async function init() {
      try { await supabase.auth.refreshSession() } catch(_) {}
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { user: u, profile: p } = await getCurrentUserProfile(supabase)
      if (!u || !p) { router.replace('/login'); return }
      // Redirect non-END_USER to their dashboard
      if (p.role !== 'END_USER') {
        const dash = {
          ADMIN: '/dashboard/admin', IT_MANAGER: '/dashboard/admin',
          L1_AGENT: '/dashboard/l1', L2_AGENT: '/dashboard/l2',
          DEVELOPER: '/dashboard/developer',
        }
        router.replace(dash[p.role] || '/dashboard/admin')
        return
      }
      setProfile(p)
      await loadTickets(u.id)
      setLoading(false)
    }
    init()
  }, [])

  async function loadTickets(userId) {
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
    setTickets(data || [])
  }

  // ── Screenshot handler ─────────────────────────────────────
  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Please upload an image file'); return }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64Full = ev.target.result           // data:image/png;base64,XXXX
      const base64     = base64Full.split(',')[1]   // just the base64 part
      setScreenshot({ base64, type: file.type, name: file.name, preview: base64Full })
    }
    reader.readAsDataURL(file)
  }

  function removeScreenshot() {
    setScreenshot(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Submit ticket ──────────────────────────────────────────
  async function handleSubmit() {
    if (!form.title.trim())       { setSubmitMsg('❌ Please enter a title'); return }
    if (!form.description.trim()) { setSubmitMsg('❌ Please describe your issue'); return }
    setSubmitting(true)
    setSubmitMsg('')

    try {
      // Generate ticket number
      const { count } = await supabase.from('tickets').select('*', { count: 'exact', head: true })
      const ticketNumber = `TKT-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`

      const { data: ticket, error } = await supabase.from('tickets').insert({
        title:         form.title.trim(),
        description:   form.description.trim(),
        priority:      form.priority,
        status:        'open',
        category:      'general',
        ticket_number: ticketNumber,
        created_by:    profile?.id,
        raised_by:     profile?.id,
        source:        'user_portal',
        assigned_team: 'L1',
        created_at:    new Date().toISOString(),
      }).select().single()

      if (error) { setSubmitMsg('❌ ' + error.message); setSubmitting(false); return }

      setNewTicketId(ticket.id)

      // 🤖 Auto-trigger AI Diagnosis
      try {
        fetch('/api/ticket-diagnosis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket_id: ticket.id })
        })
      } catch(_) {}

      // 📸 Screenshot analysis if uploaded
      if (screenshot) {
        try {
          fetch('/api/screenshot-analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_base64: screenshot.base64,
              media_type:   screenshot.type,
              ticket_id:    ticket.id
            })
          })
        } catch(_) {}
      }

      setSubmitted(true)
      await loadTickets(profile?.id)
      setForm({ title: '', description: '', priority: 'medium' })
      setScreenshot(null)

    } catch(e) {
      setSubmitMsg('❌ Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  function startNewTicket() {
    setSubmitted(false)
    setSubmitting(false)
    setSubmitMsg('')
    setNewTicketId(null)
    setForm({ title: '', description: '', priority: 'medium' })
    setScreenshot(null)
    setTab('new')
  }

  // ── Styles ─────────────────────────────────────────────────
  const S = {
    page:   { minHeight:'100vh', background:'#0a0e1a', color:'#e2e8f0', fontFamily:'Calibri, sans-serif' },
    nav:    { background:'#111827', borderBottom:'1px solid #1f2d45', padding:'0 24px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' },
    logo:   { display:'flex', alignItems:'center', gap:10 },
    logoBox:{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#2563eb,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 },
    body:   { maxWidth:900, margin:'0 auto', padding:'32px 16px' },
    card:   { background:'#111827', border:'1px solid #1f2d45', borderRadius:14, padding:24, marginBottom:20 },
    tabBar: { display:'flex', gap:8, marginBottom:24 },
    tab:    (active) => ({ padding:'8px 20px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
                background: active ? '#2563eb' : '#1f2937', color: active ? '#fff' : '#64748b', transition:'all 0.15s' }),
    input:  { width:'100%', padding:'10px 14px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:8,
               color:'#e2e8f0', fontSize:14, fontFamily:'Calibri, sans-serif', boxSizing:'border-box', outline:'none' },
    label:  { display:'block', marginBottom:6, fontSize:13, color:'#94a3b8', fontWeight:600 },
    btn:    (col='#2563eb') => ({ padding:'10px 24px', background:col, border:'none', borderRadius:8, color:'#fff',
               cursor:'pointer', fontSize:14, fontWeight:600 }),
    badge:  (st) => ({ padding:'3px 10px', borderRadius:6, fontSize:11, fontWeight:600,
               background: STATUS[st]?.bg || '#1f2937', color: STATUS[st]?.color || '#fff' }),
  }

  if (loading) return (
    <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⚡</div>
        <div style={{ color:'#64748b' }}>Loading your dashboard...</div>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      {/* ── NAV ── */}
      <nav style={S.nav}>
        <div style={S.logo}>
          <div style={S.logoBox}>⚡</div>
          <span style={{ fontWeight:800, fontSize:18, color:'#e2e8f0' }}>
            Nex<span style={{ color:'#06b6d4' }}>Desk</span>
          </span>
          <span style={{ color:'#334155', margin:'0 4px' }}>›</span>
          <span style={{ color:'#64748b', fontSize:13 }}>My Support</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:13, color:'#64748b' }}>👤 {profile?.full_name || profile?.email}</span>
          <button onClick={() => router.push('/ai-resolution')}
            style={{ padding:'6px 14px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:600 }}>
            🤖 Get AI Help
          </button>
          <button onClick={async () => { await supabase.auth.signOut({ scope: 'global' }); window.location.replace('/login') }}
            style={{ padding:'6px 14px', background:'transparent', border:'1px solid #1f2d45', borderRadius:8, color:'#64748b', cursor:'pointer', fontSize:12 }}>
            Sign Out
          </button>
        </div>
      </nav>

      <div style={S.body}>
        {/* ── WELCOME ── */}
        <div style={{ marginBottom:24 }}>
          <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:'#e2e8f0' }}>
            Welcome back, {profile?.full_name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p style={{ margin:'6px 0 0', color:'#64748b', fontSize:14 }}>
            Raise a support ticket or track your existing requests below.
          </p>
        </div>

        {/* ── STATS ROW ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'Total Tickets',   val: tickets.length,                                        icon:'🎫', col:'#2563eb' },
            { label:'Open / In Progress', val: tickets.filter(t=>['open','in_progress'].includes(t.status)).length, icon:'⏳', col:'#f59e0b' },
            { label:'Resolved',        val: tickets.filter(t=>['resolved','closed'].includes(t.status)).length,    icon:'✅', col:'#10b981' },
          ].map((st,i) => (
            <div key={i} style={{ ...S.card, display:'flex', alignItems:'center', gap:14, padding:16, marginBottom:0 }}>
              <div style={{ width:42, height:42, borderRadius:10, background:`${st.col}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{st.icon}</div>
              <div>
                <div style={{ fontSize:24, fontWeight:800, color:st.col }}>{st.val}</div>
                <div style={{ fontSize:12, color:'#64748b' }}>{st.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── TABS ── */}
        <div style={S.tabBar}>
          <button style={S.tab(tab==='tickets')} onClick={() => setTab('tickets')}>🎫 My Tickets ({tickets.length})</button>
          <button style={S.tab(tab==='new')}     onClick={startNewTicket}>+ Raise New Ticket</button>
        </div>

        {/* ══ TAB: MY TICKETS ══ */}
        {tab === 'tickets' && (
          <div style={S.card}>
            {tickets.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 0' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🎫</div>
                <div style={{ color:'#64748b', marginBottom:16 }}>No tickets yet</div>
                <button style={S.btn()} onClick={startNewTicket}>Raise Your First Ticket</button>
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid #1f2d45' }}>
                    {['Ticket #','Title','Priority','Status','Date'].map(h => (
                      <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:12, color:'#64748b', fontWeight:600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.id} onClick={() => router.push(`/tickets/${t.id}`)}
                      style={{ borderBottom:'1px solid #1f2937', cursor:'pointer' }}
                      onMouseOver={e=>e.currentTarget.style.background='#0f172a'}
                      onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'10px 12px', fontSize:12, color:'#06b6d4', fontWeight:600 }}>{t.ticket_number}</td>
                      <td style={{ padding:'10px 12px', fontSize:13, color:'#e2e8f0', maxWidth:280 }}>
                        <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <span style={{ fontSize:11, fontWeight:600, color: PRIORITY[t.priority]?.color || '#fff' }}>
                          {PRIORITY[t.priority]?.label || t.priority}
                        </span>
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <span style={S.badge(t.status)}>{STATUS[t.status]?.label || t.status}</span>
                      </td>
                      <td style={{ padding:'10px 12px', fontSize:12, color:'#64748b' }}>
                        {new Date(t.created_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ══ TAB: NEW TICKET ══ */}
        {tab === 'new' && (
          <div>
            {/* AI Help Banner */}
            <div style={{ background:'linear-gradient(135deg,#1e1b4b,#1e3a5f)', border:'1px solid #4f46e5', borderRadius:12, padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontWeight:700, color:'#a5b4fc', fontSize:14 }}>🤖 Try AI Resolution First!</div>
                <div style={{ color:'#64748b', fontSize:12, marginTop:2 }}>80% of issues are resolved instantly — no ticket needed.</div>
              </div>
              <button onClick={() => router.push('/ai-resolution')}
                style={{ padding:'8px 18px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, whiteSpace:'nowrap' }}>
                Get AI Help →
              </button>
            </div>

            {submitted ? (
              /* ── SUCCESS STATE ── */
              <div style={{ ...S.card, textAlign:'center', padding:'48px 24px' }}>
                <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
                <h2 style={{ margin:'0 0 8px', color:'#34d399', fontSize:22 }}>Ticket Raised Successfully!</h2>
                <p style={{ color:'#64748b', margin:'0 0 8px' }}>Our support team has been notified and will get back to you shortly.</p>
                {screenshot && (
                  <p style={{ color:'#a5b4fc', fontSize:13, margin:'0 0 20px' }}>📸 Screenshot uploaded — AI is analyzing it for faster resolution.</p>
                )}
                <div style={{ display:'flex', gap:12, justifyContent:'center', marginTop:20 }}>
                  <button style={S.btn()} onClick={() => { setTab('tickets'); setSubmitted(false) }}>
                    View My Tickets
                  </button>
                  <button style={{ ...S.btn('#1f2937'), border:'1px solid #1f2d45' }} onClick={startNewTicket}>
                    Raise Another
                  </button>
                </div>
              </div>
            ) : (
              /* ── FORM ── */
              <div style={S.card}>
                <h2 style={{ margin:'0 0 20px', fontSize:18, fontWeight:700, color:'#e2e8f0' }}>📝 Raise a Support Ticket</h2>

                {/* Title */}
                <div style={{ marginBottom:16 }}>
                  <label style={S.label}>Issue Title *</label>
                  <input
                    style={S.input}
                    placeholder="e.g. SIP payment failed, Unable to login, NAV not loading..."
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>

                {/* Description */}
                <div style={{ marginBottom:16 }}>
                  <label style={S.label}>Describe Your Issue *</label>
                  <textarea
                    style={{ ...S.input, height:110, resize:'vertical' }}
                    placeholder="Please describe what happened, what you were doing when it occurred, and any error messages you saw..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>

                {/* Priority */}
                <div style={{ marginBottom:20 }}>
                  <label style={S.label}>Priority</label>
                  <div style={{ display:'flex', gap:8 }}>
                    {['low','medium','high','critical'].map(p => (
                      <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))}
                        style={{ padding:'7px 18px', borderRadius:8, border:`2px solid ${form.priority===p ? PRIORITY[p].color : '#1f2d45'}`,
                                 background: form.priority===p ? `${PRIORITY[p].color}22` : 'transparent',
                                 color: PRIORITY[p].color, cursor:'pointer', fontSize:12, fontWeight:600, textTransform:'capitalize', transition:'all 0.15s' }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── SCREENSHOT UPLOAD ── */}
                <div style={{ marginBottom:20 }}>
                  <label style={S.label}>📸 Attach Screenshot (Optional)</label>
                  <div
                    onClick={() => !screenshot && fileRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); }}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) { const inp = fileRef.current; const dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files; handleFile({ target: inp }) } }}
                    style={{
                      border: `2px dashed ${screenshot ? '#10b981' : '#1f2d45'}`,
                      borderRadius:10, padding:20, textAlign:'center',
                      background: screenshot ? '#022c2222' : '#0f172a',
                      cursor: screenshot ? 'default' : 'pointer',
                      transition:'all 0.2s'
                    }}>

                    {screenshot ? (
                      /* Preview */
                      <div>
                        <img src={screenshot.preview} alt="screenshot"
                          style={{ maxWidth:'100%', maxHeight:200, borderRadius:8, marginBottom:10, border:'1px solid #1f2d45' }} />
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                          <span style={{ fontSize:12, color:'#34d399' }}>✅ {screenshot.name}</span>
                          <button onClick={e => { e.stopPropagation(); removeScreenshot() }}
                            style={{ padding:'3px 10px', background:'#450a0a', border:'1px solid #ef4444', borderRadius:6, color:'#ef4444', cursor:'pointer', fontSize:11 }}>
                            Remove
                          </button>
                        </div>
                        <div style={{ fontSize:11, color:'#64748b', marginTop:6 }}>
                          🤖 AI will analyze this screenshot for faster diagnosis
                        </div>
                      </div>
                    ) : (
                      /* Upload prompt */
                      <div>
                        <div style={{ fontSize:32, marginBottom:8 }}>📷</div>
                        <div style={{ color:'#94a3b8', fontSize:13, marginBottom:4 }}>
                          Click to upload or drag & drop
                        </div>
                        <div style={{ color:'#475569', fontSize:11 }}>PNG, JPG, GIF up to 5MB</div>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile} />
                </div>

                {/* Error message */}
                {submitMsg && (
                  <div style={{ padding:'10px 14px', background:'#450a0a', border:'1px solid #ef4444', borderRadius:8, color:'#fca5a5', fontSize:13, marginBottom:16 }}>
                    {submitMsg}
                  </div>
                )}

                {/* Submit */}
                <div style={{ display:'flex', gap:12 }}>
                  <button onClick={handleSubmit} disabled={submitting}
                    style={{ ...S.btn(), opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                    {submitting ? '⏳ Submitting...' : '🚀 Submit Ticket'}
                  </button>
                  <button onClick={() => router.push('/ai-resolution')}
                    style={{ ...S.btn('#6366f1') }}>
                    🤖 Try AI Help Instead
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

