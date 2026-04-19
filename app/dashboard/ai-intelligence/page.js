'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'

const ALLOWED_ROLES = ['ADMIN','IT_MANAGER','L1_AGENT','L2_AGENT','DEVELOPER']

const LAYER_COLOR = {
  frontend:   '#3b82f6', api: '#10b981', backend: '#8b5cf6',
  database:   '#f59e0b', thirdparty: '#ef4444', unknown: '#64748b',
}
const CONF_COLOR = (c) => c >= 80 ? '#10b981' : c >= 60 ? '#f59e0b' : '#ef4444'

export default function AIIntelligencePage() {
  const router   = useRouter()
  const supabase = createClient()

  const [profile,     setProfile]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('overview')
  const [diagnoses,   setDiagnoses]   = useState([])
  const [sessions,    setSessions]    = useState([])
  const [screenshots, setScreenshots] = useState([])
  const [memory,      setMemory]      = useState([])
  const [stats,       setStats]       = useState({})
  const [analyzing,   setAnalyzing]   = useState(null)
  const [msg,         setMsg]         = useState('')

  // Search & detail
  const [search,      setSearch]      = useState('')
  const [selected,    setSelected]    = useState(null)  // full diagnosis detail
  const [searchResults, setSearchResults] = useState([])
  const [searching,   setSearching]   = useState(false)
  const [undiagnosedTickets, setUndiagnosedTickets] = useState([])

  const TABS = [
    { key:'overview',    label:'🧠 AI Overview'        },
    { key:'search',      label:'🔍 Search Diagnoses'   },
    { key:'sessions',    label:'🔭 Session Intel'      },
    { key:'screenshots', label:'📸 Screenshot Analysis'},
    { key:'memory',      label:'💾 Resolution Memory'  },
  ]

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user || !ALLOWED_ROLES.includes(p?.role)) { router.replace('/login'); return }
    setProfile(p)
    await Promise.all([loadDiagnoses(), loadSessions(), loadScreenshots(), loadMemory(), loadStats()])
    setLoading(false)
  }

  async function loadDiagnoses() {
    const { data } = await supabase
      .from('ticket_diagnosis')
      .select('*, tickets(ticket_number, title, status, priority, created_by, description)')
      .order('created_at', { ascending: false })
      .limit(50)
    setDiagnoses(data || [])
  }

  async function loadSessions() {
    const { data } = await supabase
      .from('session_summaries')
      .select('*')
      .order('last_event_at', { ascending: false })
      .limit(20)
    setSessions(data || [])
  }

  async function loadScreenshots() {
    const { data } = await supabase
      .from('screenshot_analysis')
      .select('*, tickets(ticket_number, title)')
      .order('analyzed_at', { ascending: false })
      .limit(20)
    setScreenshots(data || [])
  }

  async function loadMemory() {
    const { data } = await supabase
      .from('resolution_memory')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
    setMemory(data || [])
  }

  async function loadStats() {
    const [d, s, m] = await Promise.all([
      supabase.from('ticket_diagnosis').select('*', { count: 'exact', head: true }),
      supabase.from('session_events').select('*', { count: 'exact', head: true }).eq('event_type','api_failure'),
      supabase.from('resolution_memory').select('*', { count: 'exact', head: true }),
    ])
    setStats({ diagnoses: d.count || 0, errorSessions: s.count || 0, memory: m.count || 0 })
  }

  async function runDiagnosis(ticketId) {
    setAnalyzing(ticketId)
    setMsg('')
    try {
      const res  = await fetch('/api/ticket-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId }),
      })
      const data = await res.json()
      if (data.success) {
        setMsg('✅ Re-analysis complete!')
        await loadDiagnoses()
        // Update selected if viewing this ticket
        if (selected?.ticket_id === ticketId) {
          setSelected(prev => ({ ...prev, ...data.diagnosis }))
        }
      } else {
        setMsg('❌ ' + (data.error || 'Analysis failed'))
      }
    } catch(e) { setMsg('❌ Error: ' + e.message) }
    setAnalyzing(null)
    setTimeout(() => setMsg(''), 4000)
  }

  // ── SEARCH ──────────────────────────────────────────────────
  async function handleSearch(q) {
    setSearch(q)
    if (q.length < 2) { setSearchResults([]); setUndiagnosedTickets([]); return }
    setSearching(true)

    // 1. Search existing diagnoses by root_cause / summary
    const { data: diagByContent } = await supabase
      .from('ticket_diagnosis')
      .select('*, tickets(id, ticket_number, title, status, priority, description, created_at)')
      .or(`summary_for_agent.ilike.%${q}%,root_cause.ilike.%${q}%,rca.ilike.%${q}%`)
      .limit(20)

    // 2. Search tickets by number or title
    const { data: matchedTickets } = await supabase
      .from('tickets')
      .select('id, ticket_number, title, status, priority, description, created_at')
      .or(`ticket_number.ilike.%${q}%,title.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(15)

    // 3. For matched tickets — fetch their diagnoses
    const ticketIds = (matchedTickets || []).map(t => t.id)
    let diagByTicket = []
    if (ticketIds.length > 0) {
      const { data: d2 } = await supabase
        .from('ticket_diagnosis')
        .select('*, tickets(id, ticket_number, title, status, priority, description, created_at)')
        .in('ticket_id', ticketIds)
      diagByTicket = d2 || []
    }

    // 4. Find tickets with NO diagnosis yet — show them separately
    const diagnosedIds = new Set([
      ...(diagByContent || []).map(d => d.ticket_id),
      ...(diagByTicket   || []).map(d => d.ticket_id),
    ])
    const notDiagnosed = (matchedTickets || []).filter(t => !diagnosedIds.has(t.id))
    setUndiagnosedTickets(notDiagnosed)

    // 5. Deduplicate diagnosed results
    const allResults = [...(diagByContent || []), ...(diagByTicket || [])]
    const seen = new Set()
    const unique = allResults.filter(d => {
      if (seen.has(d.ticket_id)) return false
      seen.add(d.ticket_id)
      return true
    })
    setSearchResults(unique)
    setSearching(false)
  }

  async function diagnoseAndShow(ticketId) {
    setAnalyzing(ticketId)
    setMsg('🤖 Running AI diagnosis...')
    try {
      const res  = await fetch('/api/ticket-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId }),
      })
      const data = await res.json()
      if (data.success) {
        setMsg('✅ Diagnosis complete!')
        await loadDiagnoses()
        // Re-run search to show new result
        await handleSearch(search)
      } else {
        setMsg('❌ ' + (data.error || 'Diagnosis failed'))
      }
    } catch(e) { setMsg('❌ ' + e.message) }
    setAnalyzing(null)
    setTimeout(() => setMsg(''), 4000)
  }

  // ── STYLES ───────────────────────────────────────────────────
  const C = {
    page:  { minHeight:'100vh', background:'#0a0e1a', color:'#e2e8f0', fontFamily:'Calibri, sans-serif' },
    card:  { background:'#111827', border:'1px solid #1f2d45', borderRadius:14 },
    badge: (col) => ({ display:'inline-block', padding:'2px 10px', borderRadius:6, fontSize:11, fontWeight:600, background:`${col}22`, color:col }),
  }

  // ── DIAGNOSIS DETAIL PANEL ────────────────────────────────────
  function DiagnosisCard({ d, onClose }) {
    if (!d) return null
    const t = d.tickets || {}
    return (
      <div style={{ position:'fixed', top:0, right:0, width:'55vw', maxWidth:720, height:'100vh', background:'#0f172a', borderLeft:'1px solid #1f2d45', overflowY:'auto', zIndex:1000, boxShadow:'-8px 0 32px #00000060' }}>
        {/* Header */}
        <div style={{ padding:'16px 24px', borderBottom:'1px solid #1f2d45', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'#0f172a', zIndex:1 }}>
          <div>
            <div style={{ fontSize:12, color:'#06b6d4', fontWeight:700 }}>{t.ticket_number || '—'}</div>
            <div style={{ fontSize:16, fontWeight:800, color:'#e2e8f0', marginTop:2 }}>{t.title || '—'}</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={() => runDiagnosis(d.ticket_id)} disabled={analyzing === d.ticket_id}
              style={{ padding:'6px 14px', background:'#1e1b4b', border:'1px solid #6366f140', borderRadius:8, color:'#a5b4fc', cursor:'pointer', fontSize:12 }}>
              {analyzing === d.ticket_id ? '⏳ Analyzing...' : '🔄 Re-Analyze'}
            </button>
            <button onClick={onClose} style={{ padding:'6px 12px', background:'#1f2937', border:'none', borderRadius:8, color:'#64748b', cursor:'pointer', fontSize:16 }}>✕</button>
          </div>
        </div>

        <div style={{ padding:24 }}>
          {/* Confidence + Layer + Priority */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:20 }}>
            <div style={{ padding:'6px 14px', background:`${CONF_COLOR(d.confidence)}18`, border:`1px solid ${CONF_COLOR(d.confidence)}40`, borderRadius:8 }}>
              <span style={{ fontSize:11, color:'#94a3b8' }}>Confidence: </span>
              <span style={{ fontSize:14, fontWeight:800, color:CONF_COLOR(d.confidence) }}>{d.confidence}%</span>
            </div>
            {d.affected_layer && (
              <div style={{ padding:'6px 14px', background:`${LAYER_COLOR[d.affected_layer] || '#64748b'}18`, border:`1px solid ${LAYER_COLOR[d.affected_layer] || '#64748b'}40`, borderRadius:8 }}>
                <span style={{ fontSize:11, color:'#94a3b8' }}>Layer: </span>
                <span style={{ fontSize:13, fontWeight:700, color: LAYER_COLOR[d.affected_layer] || '#64748b', textTransform:'uppercase' }}>{d.affected_layer}</span>
              </div>
            )}
            {d.escalate_to && d.escalate_to !== 'null' && (
              <div style={{ padding:'6px 14px', background:'#1e3a5f', border:'1px solid #3b82f640', borderRadius:8 }}>
                <span style={{ fontSize:11, color:'#94a3b8' }}>Route to: </span>
                <span style={{ fontSize:13, fontWeight:700, color:'#60a5fa' }}>{d.escalate_to}</span>
              </div>
            )}
            {d.past_occurrences > 0 && (
              <div style={{ padding:'6px 14px', background:'#451a0322', border:'1px solid #f59e0b40', borderRadius:8 }}>
                <span style={{ fontSize:11, color:'#94a3b8' }}>Past Occurrences: </span>
                <span style={{ fontSize:13, fontWeight:700, color:'#f59e0b' }}>{d.past_occurrences} time{d.past_occurrences > 1 ? 's' : ''}</span>
              </div>
            )}
            {d.same_user_before && (
              <div style={C.badge('#f97316')}>⚠️ Recurring for this user</div>
            )}
          </div>

          {/* Agent Summary */}
          {d.summary_for_agent && (
            <div style={{ background:'#1e3a5f', border:'1px solid #3b82f640', borderRadius:10, padding:'12px 16px', marginBottom:20 }}>
              <div style={{ fontSize:11, color:'#60a5fa', fontWeight:700, marginBottom:4 }}>📋 AGENT SUMMARY</div>
              <div style={{ fontSize:14, color:'#e2e8f0', lineHeight:1.6 }}>{d.summary_for_agent}</div>
            </div>
          )}

          {/* Issue Description */}
          {t.description && (
            <Section title="📝 User's Issue Description" color="#64748b">
              <p style={{ margin:0, fontSize:13, color:'#94a3b8', lineHeight:1.7 }}>{t.description}</p>
            </Section>
          )}

          {/* Screenshot Findings */}
          {d.screenshot_findings && d.screenshot_findings !== 'No screenshot provided' && (
            <Section title="📸 Screenshot Analysis" color="#a78bfa">
              <p style={{ margin:0, fontSize:13, color:'#c4b5fd', lineHeight:1.7 }}>{d.screenshot_findings}</p>
            </Section>
          )}

          {/* RCA */}
          {d.rca && (
            <Section title="🔬 Root Cause Analysis (RCA)" color="#ef4444">
              <p style={{ margin:0, fontSize:13, color:'#fca5a5', lineHeight:1.8, whiteSpace:'pre-line' }}>{d.rca}</p>
            </Section>
          )}

          {/* Resolution Steps */}
          {d.resolution_steps && (
            <Section title="🛠️ Resolution Steps" color="#10b981">
              <pre style={{ margin:0, fontSize:13, color:'#6ee7b7', lineHeight:1.8, whiteSpace:'pre-wrap', fontFamily:'Calibri, sans-serif' }}>{d.resolution_steps}</pre>
            </Section>
          )}

          {/* Prevention */}
          {d.prevention_actions && (
            <Section title="🛡️ Prevention Actions" color="#06b6d4">
              <pre style={{ margin:0, fontSize:13, color:'#67e8f9', lineHeight:1.8, whiteSpace:'pre-wrap', fontFamily:'Calibri, sans-serif' }}>{d.prevention_actions}</pre>
            </Section>
          )}

          {/* Session Errors Found */}
          {d.session_errors_found?.length > 0 && (
            <Section title={`⚡ Session Errors Used (${d.session_errors_found.length})`} color="#f59e0b">
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {d.session_errors_found.slice(0, 8).map((e, i) => (
                  <div key={i} style={{ background:'#0f172a', borderRadius:6, padding:'6px 10px', fontSize:12, color:'#94a3b8', fontFamily:'monospace' }}>
                    [{e.event_type?.toUpperCase()}] {e.endpoint || e.page} → {e.status_code || ''} {e.error_msg ? `— ${e.error_msg.substring(0,80)}` : ''}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Similar Past Tickets */}
          {d.similar_tickets?.length > 0 && (
            <Section title={`🔗 Similar Past Tickets (${d.similar_tickets.length})`} color="#6366f1">
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {d.similar_tickets.map((t, i) => (
                  <div key={i} style={{ background:'#0f172a', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:12, color:'#06b6d4', fontWeight:700 }}>{t.number}</div>
                    <div style={{ fontSize:12, color:'#e2e8f0', margin:'2px 0' }}>{t.title}</div>
                    {t.fix && <div style={{ fontSize:11, color:'#64748b' }}>Fix: {t.fix}</div>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Health Issues */}
          {d.health_issues_found?.length > 0 && (
            <Section title={`🏥 Infrastructure Issues Found (${d.health_issues_found.length})`} color="#ef4444">
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {d.health_issues_found.map((h, i) => (
                  <div key={i} style={{ background:'#0f172a', borderRadius:6, padding:'6px 10px', fontSize:12, color:'#fca5a5', fontFamily:'monospace' }}>
                    [{h.service}] {h.status_code || ''} {h.error_msg || ''} {h.response_time ? `(${h.response_time}ms)` : ''}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Footer */}
          <div style={{ marginTop:24, padding:'12px 0', borderTop:'1px solid #1f2d45', display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:11, color:'#334155' }}>
              Diagnosed: {d.reanalyzed_at ? new Date(d.reanalyzed_at).toLocaleString('en-IN') : new Date(d.created_at).toLocaleString('en-IN')}
            </span>
            <button onClick={() => router.push(`/tickets/${d.ticket_id}`)}
              style={{ padding:'6px 14px', background:'#1e3a5f', border:'1px solid #3b82f640', borderRadius:8, color:'#60a5fa', cursor:'pointer', fontSize:12 }}>
              View Full Ticket →
            </button>
          </div>
        </div>
      </div>
    )
  }

  function Section({ title, color, children }) {
    return (
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:700, color, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:3, height:14, background:color, borderRadius:2 }}/>
          {title}
        </div>
        <div style={{ background:'#111827', border:`1px solid ${color}30`, borderRadius:10, padding:'12px 14px' }}>
          {children}
        </div>
      </div>
    )
  }

  function DiagnosisRow({ d, onClick }) {
    const t = d.tickets || {}
    return (
      <tr onClick={onClick}
        style={{ borderBottom:'1px solid #0f172a', cursor:'pointer', transition:'background 0.15s' }}
        onMouseOver={e => e.currentTarget.style.background='#0f172a'}
        onMouseOut={e  => e.currentTarget.style.background='transparent'}>
        <td style={{ padding:'12px 14px' }}>
          <div style={{ fontSize:12, color:'#60a5fa', fontWeight:700 }}>{t.ticket_number || '—'}</div>
          <div style={{ fontSize:11, color:'#475569', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title || '—'}</div>
        </td>
        <td style={{ padding:'12px 14px' }}>
          <div style={{ fontSize:12, color:'#94a3b8', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
            {d.root_cause || '—'}
          </div>
        </td>
        <td style={{ padding:'12px 14px' }}>
          <span style={C.badge(LAYER_COLOR[d.affected_layer] || '#64748b')}>{d.affected_layer || '—'}</span>
        </td>
        <td style={{ padding:'12px 14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:36, height:5, borderRadius:3, background:'#1f2d45', overflow:'hidden' }}>
              <div style={{ width:`${d.confidence}%`, height:'100%', background:CONF_COLOR(d.confidence), borderRadius:3 }}/>
            </div>
            <span style={{ fontSize:11, color:CONF_COLOR(d.confidence), fontWeight:600 }}>{d.confidence}%</span>
          </div>
        </td>
        <td style={{ padding:'12px 14px' }}>
          {d.past_occurrences > 0
            ? <span style={C.badge('#f59e0b')}>⚠️ {d.past_occurrences}x seen</span>
            : <span style={C.badge('#10b981')}>✅ First time</span>
          }
        </td>
        <td style={{ padding:'12px 14px' }} onClick={e => e.stopPropagation()}>
          <button onClick={() => runDiagnosis(d.ticket_id)} disabled={analyzing === d.ticket_id}
            style={{ padding:'4px 10px', background:'#1e1b4b', border:'1px solid #6366f140', borderRadius:7, color:'#a5b4fc', cursor:'pointer', fontSize:11 }}>
            {analyzing === d.ticket_id ? '⏳' : '🔄'}
          </button>
        </td>
      </tr>
    )
  }

  if (loading) return (
    <div style={{ ...C.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>🧠</div>
        <div style={{ color:'#64748b' }}>Loading AI Intelligence...</div>
      </div>
    </div>
  )

  return (
    <div style={C.page}>
      {/* ── NAV ── */}
      <nav style={{ background:'#111827', borderBottom:'1px solid #1f2d45', padding:'0 24px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#2563eb,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⚡</div>
            <span style={{ fontWeight:800, fontSize:18, color:'#e2e8f0' }}>Nex<span style={{ color:'#06b6d4' }}>Desk</span></span>
          </button>
          <span style={{ color:'#334155' }}>›</span>
          <span style={{ color:'#64748b', fontSize:13 }}>AI Intelligence Platform</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, background:'#1e1b4b', color:'#a5b4fc' }}>🧠 Phase 6</span>
          <button onClick={() => router.push('/dashboard')} style={{ padding:'6px 14px', background:'transparent', border:'1px solid #1f2d45', borderRadius:8, color:'#64748b', cursor:'pointer', fontSize:12 }}>
            ← Dashboard
          </button>
        </div>
      </nav>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 20px' }}>

        {/* ── HEADER ── */}
        <div style={{ marginBottom:24 }}>
          <h1 style={{ margin:0, fontSize:26, fontWeight:800, color:'#e2e8f0' }}>🧠 AI Intelligence Platform</h1>
          <p style={{ margin:'6px 0 0', color:'#64748b', fontSize:14 }}>
            Auto-diagnosis, RCA, Resolution Steps & Prevention — powered by Claude AI
          </p>
        </div>

        {/* ── STATS ROW ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:28 }}>
          {[
            { icon:'🤖', label:'Tickets Diagnosed',    val: stats.diagnoses || 0,      col:'#6366f1' },
            { icon:'🔭', label:'Error Sessions',        val: stats.errorSessions || 0,  col:'#ef4444' },
            { icon:'💾', label:'Fixes in Memory',       val: stats.memory || 0,         col:'#10b981' },
            { icon:'📊', label:'Avg Confidence',
              val: diagnoses.length ? Math.round(diagnoses.reduce((a,d) => a + (d.confidence||0), 0) / diagnoses.length) + '%' : '—',
              col:'#f59e0b' },
          ].map((s,i) => (
            <div key={i} style={{ ...C.card, padding:16, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:`${s.col}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize:22, fontWeight:800, color:s.col }}>{s.val}</div>
                <div style={{ fontSize:11, color:'#475569' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {msg && (
          <div style={{ padding:'10px 14px', background: msg.startsWith('✅') ? '#022c22' : '#450a0a', border:`1px solid ${msg.startsWith('✅') ? '#10b98140' : '#ef444440'}`, borderRadius:8, color: msg.startsWith('✅') ? '#34d399' : '#fca5a5', fontSize:13, marginBottom:16 }}>
            {msg}
          </div>
        )}

        {/* ── TABS ── */}
        <div style={{ display:'flex', gap:6, marginBottom:20, overflowX:'auto', paddingBottom:4 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding:'8px 16px', borderRadius:10, border:`1px solid ${tab===t.key?'#3b82f640':'#1f2d45'}`, background:tab===t.key?'#1e3a5f':'#0f172a', color:tab===t.key?'#60a5fa':'#64748b', cursor:'pointer', fontSize:13, whiteSpace:'nowrap', transition:'all 0.2s', fontWeight:tab===t.key?700:400 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ TAB: AI OVERVIEW ══ */}
        {tab === 'overview' && (
          <div style={{ ...C.card, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #1f2d45', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14, fontWeight:700 }}>🤖 AI Ticket Diagnoses ({diagnoses.length})</span>
              <span style={{ fontSize:11, color:'#334155' }}>Click any row to see full RCA + Resolution Steps</span>
            </div>
            {diagnoses.length === 0 ? (
              <div style={{ padding:48, textAlign:'center', color:'#334155' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🤖</div>
                <p>No diagnoses yet — they run automatically when tickets are created.</p>
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#0a0e1a' }}>
                      {['Ticket','Root Cause','Layer','Confidence','Recurrence','Re-run'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, color:'#475569', fontWeight:600, borderBottom:'1px solid #1f2d45' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {diagnoses.map(d => (
                      <DiagnosisRow key={d.id} d={d} onClick={() => setSelected(d)} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: SEARCH ══ */}
        {tab === 'search' && (
          <div>
            {/* Search Bar */}
            <div style={{ ...C.card, padding:20, marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#e2e8f0', marginBottom:12 }}>
                🔍 Search AI Diagnoses by Ticket Number, Title or Issue
              </div>
              <div style={{ position:'relative' }}>
                <input
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Type ticket number (e.g. TKT-2026-0003) or keyword (e.g. SIP, login, NAV)..."
                  style={{ width:'100%', padding:'12px 16px 12px 40px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:10, color:'#e2e8f0', fontSize:14, fontFamily:'Calibri, sans-serif', boxSizing:'border-box', outline:'none' }}
                />
                <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16, color:'#475569' }}>🔍</span>
                {searching && <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', fontSize:12, color:'#6366f1' }}>Searching...</span>}
              </div>
              <div style={{ marginTop:8, fontSize:12, color:'#475569' }}>
                💡 L2 Agents: Search by ticket number to instantly get full AI diagnosis before opening the ticket
              </div>
            </div>

            {/* Results */}
            {search.length >= 2 && (
              <div style={{ ...C.card, overflow:'hidden' }}>
                <div style={{ padding:'12px 20px', borderBottom:'1px solid #1f2d45' }}>
                  <span style={{ fontSize:13, fontWeight:600 }}>
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{search}"
                  </span>
                </div>
                {/* ── UNDIAGNOSED TICKETS ── */}
                {undiagnosedTickets.length > 0 && (
                  <div>
                    {undiagnosedTickets.map(t => (
                      <div key={t.id} style={{ padding:'16px 20px', borderBottom:'1px solid #0f172a', background:'#110a0022' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div>
                            <span style={{ fontSize:12, color:'#06b6d4', fontWeight:700, marginRight:10 }}>{t.ticket_number}</span>
                            <span style={{ fontSize:14, fontWeight:700, color:'#e2e8f0' }}>{t.title}</span>
                            <span style={{ marginLeft:10, fontSize:11, padding:'2px 8px', borderRadius:5, background:'#451a0322', color:'#f59e0b' }}>⚠️ Not yet diagnosed</span>
                          </div>
                          <button
                            onClick={() => diagnoseAndShow(t.id)}
                            disabled={analyzing === t.id}
                            style={{ padding:'7px 16px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:8, color:'#fff', cursor: analyzing === t.id ? 'not-allowed' : 'pointer', fontSize:12, fontWeight:600, opacity: analyzing === t.id ? 0.7 : 1, whiteSpace:'nowrap' }}>
                            {analyzing === t.id ? '⏳ Analyzing...' : '🤖 Run AI Diagnosis'}
                          </button>
                        </div>
                        {t.description && (
                          <div style={{ fontSize:12, color:'#475569', marginTop:6 }}>
                            {t.description.substring(0, 120)}{t.description.length > 120 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* ── DIAGNOSED RESULTS ── */}
                {searchResults.length === 0 && undiagnosedTickets.length === 0 && !searching ? (
                  <div style={{ padding:32, textAlign:'center', color:'#475569' }}>
                    <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>
                    <p>No tickets found for "{search}"</p>
                    <p style={{ fontSize:12 }}>Try the ticket number (TKT-2026-XXXX) or a keyword from the issue</p>
                  </div>
                ) : (
                  <div>
                    {searchResults.map(d => {
                      const t = d.tickets || {}
                      return (
                        <div key={d.id} onClick={() => setSelected(d)}
                          style={{ padding:'16px 20px', borderBottom:'1px solid #0f172a', cursor:'pointer', transition:'background 0.15s' }}
                          onMouseOver={e => e.currentTarget.style.background='#0f172a'}
                          onMouseOut={e  => e.currentTarget.style.background='transparent'}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                            <div>
                              <span style={{ fontSize:12, color:'#06b6d4', fontWeight:700, marginRight:10 }}>{t.ticket_number || '—'}</span>
                              <span style={{ fontSize:14, fontWeight:700, color:'#e2e8f0' }}>{t.title || '—'}</span>
                            </div>
                            <div style={{ display:'flex', gap:8 }}>
                              <span style={C.badge(CONF_COLOR(d.confidence))}>{d.confidence}%</span>
                              {d.affected_layer && <span style={C.badge(LAYER_COLOR[d.affected_layer] || '#64748b')}>{d.affected_layer}</span>}
                            </div>
                          </div>
                          <div style={{ fontSize:12, color:'#94a3b8', marginBottom:4 }}>
                            🔬 <strong>Root Cause:</strong> {d.root_cause || '—'}
                          </div>
                          {d.summary_for_agent && (
                            <div style={{ fontSize:12, color:'#64748b' }}>
                              📋 {d.summary_for_agent}
                            </div>
                          )}
                          <div style={{ marginTop:6, fontSize:11, color:'#334155' }}>
                            Click to see full RCA, Resolution Steps & Prevention →
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {search.length < 2 && (
              <div style={{ ...C.card, padding:32, textAlign:'center' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>💡</div>
                <p style={{ color:'#64748b', margin:0 }}>Start typing to search AI diagnoses</p>
                <p style={{ color:'#334155', fontSize:12, margin:'8px 0 0' }}>
                  All {diagnoses.length} diagnosed tickets are searchable
                </p>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: SESSION INTELLIGENCE ══ */}
        {tab === 'sessions' && (
          <div>
            <div style={{ ...C.card, padding:'14px 20px', marginBottom:12 }}>
              <div style={{ fontSize:13, color:'#06b6d4', fontWeight:600, marginBottom:4 }}>🔒 RBI/SEBI Compliant — Zero PII Captured</div>
              <div style={{ fontSize:12, color:'#475569' }}>Only API routes, HTTP codes, response times & JS errors. No screen, no PAN, no Aadhaar, no user identity.</div>
            </div>
            {sessions.length === 0 ? (
              <div style={{ ...C.card, padding:40, textAlign:'center', color:'#334155' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>🔭</div>
                <p>No sessions captured yet. Embed nexdesk-agent-v2.js in your MF app to start capturing.</p>
              </div>
            ) : (
              <div style={{ ...C.card, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#0a0e1a' }}>
                      {['Session ID','Events','Errors','Last Seen','Status'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, color:'#475569', fontWeight:600, borderBottom:'1px solid #1f2d45' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(s => (
                      <tr key={s.id} style={{ borderBottom:'1px solid #0f172a' }}>
                        <td style={{ padding:'10px 14px', fontSize:12, color:'#94a3b8', fontFamily:'monospace' }}>{s.session_id?.substring(0,12)}...</td>
                        <td style={{ padding:'10px 14px', fontSize:13, color:'#e2e8f0', fontWeight:600 }}>{s.total_events || 0}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ fontSize:13, fontWeight:700, color: s.error_count > 0 ? '#ef4444' : '#34d399' }}>{s.error_count || 0}</span>
                        </td>
                        <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b' }}>{s.last_event_at ? new Date(s.last_event_at).toLocaleString('en-IN') : '—'}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={C.badge(s.has_errors ? '#ef4444' : '#10b981')}>{s.has_errors ? '⚠️ Errors' : '✅ Clean'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: SCREENSHOT ANALYSIS ══ */}
        {tab === 'screenshots' && (
          <div>
            {screenshots.length === 0 ? (
              <div style={{ ...C.card, padding:40, textAlign:'center', color:'#334155' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>📸</div>
                <p>No screenshots analyzed yet. Users can upload screenshots when raising tickets.</p>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:14 }}>
                {screenshots.map(sc => (
                  <div key={sc.id} style={{ ...C.card, padding:16 }}>
                    <div style={{ fontSize:12, color:'#06b6d4', fontWeight:700, marginBottom:4 }}>{sc.tickets?.ticket_number || '—'}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', marginBottom:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sc.tickets?.title || '—'}</div>
                    {sc.detected_page  && <div style={{ fontSize:12, color:'#94a3b8', marginBottom:2 }}>📄 Page: {sc.detected_page}</div>}
                    {sc.detected_error && <div style={{ fontSize:12, color:'#fca5a5', marginBottom:2 }}>❌ Error: {sc.detected_error}</div>}
                    {sc.ai_summary     && <div style={{ fontSize:12, color:'#64748b', marginTop:8, lineHeight:1.5 }}>{sc.ai_summary}</div>}
                    <div style={{ fontSize:11, color:'#334155', marginTop:8 }}>{new Date(sc.analyzed_at).toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: RESOLUTION MEMORY ══ */}
        {tab === 'memory' && (
          <div>
            <div style={{ ...C.card, padding:'14px 20px', marginBottom:12 }}>
              <div style={{ fontSize:13, color:'#10b981', fontWeight:600, marginBottom:4 }}>💡 AI learns from every resolved ticket</div>
              <div style={{ fontSize:12, color:'#475569' }}>High-confidence diagnoses ({'>'}= 80%) are automatically stored here for future reference.</div>
            </div>
            {memory.length === 0 ? (
              <div style={{ ...C.card, padding:40, textAlign:'center', color:'#334155' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>💾</div>
                <p>No patterns stored yet. Resolve tickets with notes to build the knowledge base.</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {memory.map(m => (
                  <div key={m.id} style={{ ...C.card, padding:16 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>{m.error_pattern}</div>
                      {m.resolution_time && (
                        <span style={C.badge('#10b981')}>⏱ {m.resolution_time} min</span>
                      )}
                    </div>
                    <div style={{ fontSize:12, color:'#fca5a5', marginBottom:4 }}>🔬 <strong>Cause:</strong> {m.root_cause}</div>
                    <div style={{ fontSize:12, color:'#6ee7b7' }}>🛠️ <strong>Fix:</strong> {m.fix_applied?.substring(0, 200)}</div>
                    <div style={{ fontSize:11, color:'#334155', marginTop:6 }}>{new Date(m.created_at).toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── DIAGNOSIS DETAIL SLIDE PANEL ── */}
      {selected && <DiagnosisCard d={selected} onClose={() => setSelected(null)} />}

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:#0a0e1a; }
        ::-webkit-scrollbar-thumb { background:#1f2d45; border-radius:3px; }
      `}</style>
    </div>
  )
}

