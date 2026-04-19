'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import { STATUS_CONFIG, PRIORITY_CONFIG, getSLAStatus } from '../../../lib/ticketRouter'
import GlobalNav from '../../components/GlobalNav'

const CAT_COLORS = {
  frontend:   { color:'#60a5fa', bg:'#1e3a5f' },
  backend:    { color:'#34d399', bg:'#022c22' },
  mobile:     { color:'#f59e0b', bg:'#1c1000' },
  devops:     { color:'#a78bfa', bg:'#2e1065' },
  database:   { color:'#22d3ee', bg:'#083344' },
  ml:         { color:'#f472b6', bg:'#2d0a3a' },
  bigdata:    { color:'#fb923c', bg:'#431407' },
  blockchain: { color:'#fbbf24', bg:'#161005' },
}

export default function DeveloperDashboard() {
  const router   = useRouter()
  const supabase = createClient()

  const [tickets,  setTickets]  = useState([])
  const [filter,   setFilter]   = useState('all')
  const [loading,  setLoading]  = useState(true)

  // Slide panel state
  const [panel,       setPanel]       = useState(null)   // selected ticket
  const [diagnosis,   setDiagnosis]   = useState(null)
  const [diagLoading, setDiagLoading] = useState(false)
  const [diagRunning, setDiagRunning] = useState(false)
  const [diagError,   setDiagError]   = useState('')
  const [activeTab,   setActiveTab]   = useState('fix')  // fix | rca | prevention | raw

  useEffect(() => { init() }, [])

  async function init() {
    try {
      const { user } = await getCurrentUserProfile(supabase)
      if (!user) { router.replace('/login'); return }
      await loadTickets()
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  async function loadTickets() {
    try {
      const { data } = await supabase
        .from('tickets')
        .select('id, ticket_number, title, status, priority, assigned_team, ai_routing_reason, assigned_dev_reason, sla_resolve_due, created_at, source, categories(name, icon)')
        .order('created_at', { ascending: false })
      if (!data) return
      setTickets(data.filter(t => t.assigned_team === 'DEVELOPER' && !['resolved','closed'].includes(t.status)))
    } catch(e) { console.error(e) }
  }

  // Open slide panel — load diagnosis
  async function openPanel(ticket) {
    setPanel(ticket)
    setDiagnosis(null)
    setDiagError('')
    setActiveTab('fix')
    setDiagLoading(true)

    const { data } = await supabase
      .from('ticket_diagnosis')
      .select('*')
      .eq('ticket_id', ticket.id)
      .maybeSingle()

    setDiagnosis(data || null)
    setDiagLoading(false)
  }

  // Run AI diagnosis on demand
  async function runDiagnosis() {
    if (!panel) return
    setDiagRunning(true)
    setDiagError('')
    try {
      const res  = await fetch('/api/ticket-diagnosis', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ticket_id: panel.id }),
      })
      const data = await res.json()
      if (data.success && data.diagnosis) {
        setDiagnosis(data.diagnosis)
      } else {
        setDiagError(data.error || 'AI diagnosis failed — check ANTHROPIC_API_KEY in .env.local')
      }
    } catch(e) {
      setDiagError('Network error: ' + e.message)
      console.error('[runDiagnosis]', e)
    }
    setDiagRunning(false)
  }

  const filtered = filter === 'all' ? tickets : tickets.filter(t => {
    if (filter === 'critical') return t.priority === 'critical'
    if (filter === 'high')     return t.priority === 'high'
    if (filter === 'breached') return getSLAStatus(t.sla_resolve_due, t.status, t.created_at, t.priority).label.includes('BREACHED')
    return t.status === filter
  })

  const stats = {
    total:    tickets.length,
    open:     tickets.filter(t => t.status === 'open').length,
    progress: tickets.filter(t => t.status === 'in_progress').length,
    breached: tickets.filter(t => getSLAStatus(t.sla_resolve_due, t.status, t.created_at, t.priority).label.includes('BREACHED')).length,
    critical: tickets.filter(t => t.priority === 'critical').length,
    high:     tickets.filter(t => t.priority === 'high').length,
  }

  if (loading) return <Loader />

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0', display:'flex', flexDirection:'column' }}>
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        .trow:hover { background:#0f172a!important; cursor:pointer; }
        .fchip:hover { opacity:0.85!important; }
        .ptab:hover  { background:#1a2236!important; }
        pre { white-space: pre-wrap; word-break: break-word; }
      `}</style>

      <GlobalNav title="Developer Queue" />

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* ── MAIN CONTENT ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'28px 24px', transition:'all 0.3s' }}>
          <div style={{ maxWidth: panel ? '100%' : 1200, margin:'0 auto' }}>

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:24 }}>
              {[
                ['👨‍💻','Dev Tickets', stats.total,    '#06b6d4','#083344'],
                ['📂','Open',        stats.open,     '#f59e0b','#451a03'],
                ['⚙️','In Progress', stats.progress, '#8b5cf6','#2e1065'],
                ['🔴','SLA Breach',  stats.breached, '#ef4444','#450a0a'],
                ['🚨','Critical P1', stats.critical, '#f97316','#431407'],
                ['🟠','High P2',     stats.high,     '#fbbf24','#451a03'],
              ].map(([icon,label,val,color,bg],i) => (
                <div key={label} style={{ background:'#111827', border:`1px solid ${color}30`, borderRadius:14, padding:'14px 16px', animation:`fadeUp 0.4s ${i*0.05}s ease both` }}>
                  <div style={{ fontSize:18, marginBottom:4 }}>{icon}</div>
                  <div style={{ fontSize:22, fontWeight:700, color, fontFamily:"'Syne',sans-serif" }}>{val}</div>
                  <div style={{ fontSize:10, color:'#64748b', marginTop:1 }}>{label}</div>
                </div>
              ))}
            </div>

            {stats.breached > 0 && (
              <div style={{ background:'#450a0a', border:'1px solid #ef444440', borderRadius:10, padding:'11px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
                <span>🚨</span>
                <span style={{ color:'#fca5a5', fontSize:13 }}><strong>{stats.breached} SLA BREACH{stats.breached>1?'ES':''}</strong> — Code fix needed urgently!</span>
                <button onClick={() => setFilter('breached')} style={{ marginLeft:'auto', background:'#ef4444', border:'none', color:'#fff', padding:'5px 12px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600 }}>View →</button>
              </div>
            )}

            {/* Filters */}
            <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
              {[['all','All'],['open','Open'],['in_progress','In Progress'],['critical','🚨 Critical'],['high','🟠 High'],['breached','🔴 Breached']].map(([val,label]) => (
                <button key={val} className="fchip" onClick={() => setFilter(val)}
                  style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', transition:'all 0.2s', border:'1px solid', background:filter===val?'#083344':'transparent', color:filter===val?'#06b6d4':'#64748b', borderColor:filter===val?'#06b6d440':'#1f2d45' }}>
                  {label}
                </button>
              ))}
              <button onClick={loadTickets} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, border:'1px solid #1f2d45', background:'transparent', color:'#475569', cursor:'pointer', marginLeft:'auto' }}>🔄</button>
            </div>

            {/* Table */}
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid #1f2d45' }}>
                <h2 style={{ fontSize:15, fontWeight:700, margin:0 }}>Code Bug Tickets <span style={{ fontSize:12, color:'#475569', fontWeight:400 }}>({filtered.length})</span></h2>
              </div>
              {filtered.length === 0 ? (
                <div style={{ padding:48, textAlign:'center' }}>
                  <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
                  <p style={{ color:'#475569', marginBottom:8 }}>No tickets in this view</p>
                  <button onClick={() => { setFilter('all'); loadTickets() }} style={{ padding:'8px 20px', background:'#083344', border:'1px solid #06b6d440', color:'#06b6d4', borderRadius:8, cursor:'pointer', fontSize:13 }}>Show All</button>
                </div>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ background:'#0a0e1a' }}>
                        {['Ticket','Title','Priority','SLA','Stack','Dev Reason','Actions'].map(h => (
                          <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(t => {
                        const sla  = getSLAStatus(t.sla_resolve_due, t.status, t.created_at, t.priority)
                        const prio = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium
                        const isActive = panel?.id === t.id
                        return (
                          <tr key={t.id} className="trow"
                            onClick={() => isActive ? setPanel(null) : openPanel(t)}
                            style={{ borderTop:'1px solid #1f2d45', transition:'background 0.15s', background: isActive ? '#0f172a' : 'transparent' }}>
                            <td style={{ padding:'11px 14px' }}>
                              <span style={{ fontSize:11, fontWeight:700, color:'#06b6d4', fontFamily:'monospace' }}>{t.ticket_number}</span>
                            </td>
                            <td style={{ padding:'11px 14px', maxWidth:180 }}>
                              <span style={{ fontSize:13, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</span>
                              <span style={{ fontSize:11, color:'#475569' }}>{t.categories?.icon} {t.categories?.name}</span>
                            </td>
                            <td style={{ padding:'11px 14px' }}>
                              <span style={{ fontSize:11, fontWeight:600, padding:'3px 7px', borderRadius:5, background:prio.bg, color:prio.color }}>{prio.label}</span>
                            </td>
                            <td style={{ padding:'11px 14px' }}>
                              <span style={{ fontSize:11, fontWeight:600, padding:'3px 7px', borderRadius:5, background:sla.bg, color:sla.color }}>{sla.icon} {sla.label}</span>
                            </td>
                            <td style={{ padding:'11px 14px' }}>
                              {/* Framework chips — shown if source matches app */}
                              {t.source && t.source !== 'portal' ? (
                                <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#1e3a5f', color:'#60a5fa', border:'1px solid #3b82f640' }}>{t.source}</span>
                              ) : <span style={{ color:'#334155', fontSize:11 }}>—</span>}
                            </td>
                            <td style={{ padding:'11px 14px' }}>
                              <span style={{ fontSize:10, color:'#06b6d4', maxWidth:140, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.assigned_dev_reason || t.ai_routing_reason || '—'}</span>
                            </td>
                            <td style={{ padding:'11px 14px' }} onClick={e => e.stopPropagation()}>
                              <div style={{ display:'flex', gap:6 }}>
                                <button onClick={() => isActive ? setPanel(null) : openPanel(t)}
                                  style={{ background: isActive ? '#1e3a5f' : '#083344', border:'none', color:'#06b6d4', padding:'5px 10px', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:600 }}>
                                  {isActive ? 'Close' : '🧠 AI Fix'}
                                </button>
                                <button onClick={() => router.push(`/tickets/${t.id}`)}
                                  style={{ background:'transparent', border:'1px solid #1f2d45', color:'#64748b', padding:'5px 10px', borderRadius:6, cursor:'pointer', fontSize:11 }}>
                                  Full →
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── SLIDE PANEL — FRAMEWORK FIX ── */}
        {panel && (
          <div style={{ width:480, background:'#111827', borderLeft:'1px solid #1f2d45', display:'flex', flexDirection:'column', animation:'slideIn 0.3s ease', overflow:'hidden', flexShrink:0 }}>

            {/* Panel Header */}
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #1f2d45', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:11, color:'#06b6d4', fontWeight:700, fontFamily:'monospace', marginBottom:4 }}>{panel.ticket_number}</div>
                <div style={{ fontSize:14, fontWeight:700, color:'#e2e8f0', lineHeight:1.4, maxWidth:380, wordBreak:'break-word' }}>{panel.title}</div>
              </div>
              <button onClick={() => setPanel(null)}
                style={{ background:'transparent', border:'none', color:'#475569', cursor:'pointer', fontSize:20, lineHeight:1, marginLeft:8, flexShrink:0 }}>×</button>
            </div>

            {/* Framework Badges */}
            {diagnosis?.detected_frameworks?.length > 0 && (
              <div style={{ padding:'12px 20px', borderBottom:'1px solid #0f172a', display:'flex', flexWrap:'wrap', gap:6 }}>
                <span style={{ fontSize:11, color:'#475569', marginRight:4 }}>🧩 Detected:</span>
                {diagnosis.detected_frameworks.map(fw => (
                  <span key={fw} style={{ fontSize:11, padding:'2px 10px', borderRadius:20, background:'#1e3a5f', color:'#60a5fa', border:'1px solid #3b82f640', fontWeight:600 }}>{fw}</span>
                ))}
              </div>
            )}

            {/* Panel Tabs */}
            <div style={{ display:'flex', borderBottom:'1px solid #1f2d45' }}>
              {[
                { key:'fix',        label:'🔧 Fix Steps'  },
                { key:'rca',        label:'🔍 Root Cause'  },
                { key:'prevention', label:'🛡️ Prevention' },
                { key:'context',    label:'📊 Context'     },
              ].map(t => (
                <button key={t.key} className="ptab" onClick={() => setActiveTab(t.key)}
                  style={{ flex:1, padding:'10px 4px', background: activeTab===t.key ? '#1e3a5f' : 'transparent', border:'none', borderBottom:`2px solid ${activeTab===t.key ? '#3b82f6' : 'transparent'}`, color: activeTab===t.key ? '#60a5fa' : '#64748b', cursor:'pointer', fontSize:11, fontWeight: activeTab===t.key ? 700 : 400, transition:'all 0.15s', fontFamily:"'DM Sans',sans-serif" }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Panel Content */}
            <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>

              {diagLoading ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, height:200 }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#06b6d4', animation:'spin 0.7s linear infinite' }}/>
                  <span style={{ color:'#64748b', fontSize:13 }}>Loading AI diagnosis...</span>
                </div>
              ) : !diagnosis ? (
                <div style={{ textAlign:'center', paddingTop:40 }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🤖</div>
                  <div style={{ fontSize:14, color:'#64748b', marginBottom:8 }}>No diagnosis yet</div>
                  <div style={{ fontSize:12, color:'#334155', marginBottom:20 }}>Run AI to get framework-specific fix steps</div>
                  {diagError && (
                    <div style={{ padding:'10px 14px', background:'#1c0000', border:'1px solid #ef444440', borderRadius:8, color:'#fca5a5', fontSize:12, marginBottom:16, textAlign:'left' }}>
                      ❌ {diagError}
                    </div>
                  )}
                  <button onClick={runDiagnosis} disabled={diagRunning}
                    style={{ padding:'10px 24px', background:'linear-gradient(135deg,#2563eb,#06b6d4)', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:14, fontWeight:700, opacity: diagRunning ? 0.6 : 1 }}>
                    {diagRunning ? '⏳ Analyzing...' : '🧠 Run AI Diagnosis'}
                  </button>
                </div>
              ) : (
                <div>
                  {/* Confidence + Layer */}
                  <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                    <div style={{ flex:1, background:'#0f172a', borderRadius:8, padding:'10px 14px', textAlign:'center' }}>
                      <div style={{ fontSize:20, fontWeight:800, color: (diagnosis.confidence||0) >= 80 ? '#34d399' : (diagnosis.confidence||0) >= 50 ? '#f59e0b' : '#ef4444' }}>{diagnosis.confidence || 0}%</div>
                      <div style={{ fontSize:10, color:'#475569' }}>Confidence</div>
                    </div>
                    <div style={{ flex:1, background:'#0f172a', borderRadius:8, padding:'10px 14px', textAlign:'center' }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#a78bfa' }}>{diagnosis.affected_layer || 'unknown'}</div>
                      <div style={{ fontSize:10, color:'#475569' }}>Affected Layer</div>
                    </div>
                    <div style={{ flex:1, background:'#0f172a', borderRadius:8, padding:'10px 14px', textAlign:'center' }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#f59e0b' }}>{diagnosis.estimated_resolution_mins || '?'} min</div>
                      <div style={{ fontSize:10, color:'#475569' }}>Est. Fix Time</div>
                    </div>
                  </div>

                  {/* Summary for agent */}
                  {diagnosis.summary_for_agent && (
                    <div style={{ background:'#0c1a2e', border:'1px solid #3b82f640', borderRadius:10, padding:'12px 14px', marginBottom:16, display:'flex', gap:10 }}>
                      <span style={{ fontSize:16 }}>💡</span>
                      <div style={{ fontSize:13, color:'#93c5fd', lineHeight:1.6 }}>{diagnosis.summary_for_agent}</div>
                    </div>
                  )}

                  {/* ── FIX STEPS TAB ── */}
                  {activeTab === 'fix' && (
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#34d399', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>🔧 Step-by-Step Fix</div>
                      {diagnosis.resolution_steps ? (
                        <div>
                          {diagnosis.resolution_steps.split('\n').filter(l => l.trim()).map((step, i) => {
                            const isStep = /^\d+\./.test(step.trim())
                            return (
                              <div key={i} style={{ display:'flex', gap:10, marginBottom:10, padding:'10px 12px', background: isStep ? '#0f172a' : 'transparent', borderRadius: isStep ? 8 : 0, borderLeft: isStep ? '3px solid #10b981' : 'none' }}>
                                {isStep && (
                                  <div style={{ width:22, height:22, borderRadius:'50%', background:'#10b981', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff', flexShrink:0 }}>
                                    {step.trim().match(/^\d+/)?.[0]}
                                  </div>
                                )}
                                <div style={{ fontSize:13, color: isStep ? '#e2e8f0' : '#64748b', lineHeight:1.6 }}>
                                  {isStep ? step.replace(/^\d+\.\s*/, '') : step}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : <p style={{ color:'#334155', fontSize:13 }}>No fix steps available</p>}

                      {/* Similar tickets */}
                      {diagnosis.similar_ticket_refs?.length > 0 && (
                        <div style={{ marginTop:16, padding:'12px', background:'#1a1208', border:'1px solid #f59e0b40', borderRadius:8 }}>
                          <div style={{ fontSize:11, color:'#f59e0b', fontWeight:700, marginBottom:6 }}>📋 Similar Tickets (check their resolution)</div>
                          {diagnosis.similar_ticket_refs.map(ref => (
                            <div key={ref} style={{ fontSize:12, color:'#fbbf24', fontFamily:'monospace', marginBottom:2 }}>→ {ref}</div>
                          ))}
                        </div>
                      )}

                      {/* Auto-resolvable badge */}
                      {diagnosis.auto_resolvable && (
                        <div style={{ marginTop:12, padding:'10px 14px', background:'#022c22', border:'1px solid #10b98140', borderRadius:8, fontSize:12, color:'#34d399' }}>
                          ✅ This issue can be auto-resolved by NexDesk Autonomous Agent (Phase 10)
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── ROOT CAUSE TAB ── */}
                  {activeTab === 'rca' && (
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#f97316', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>🔍 Root Cause Analysis</div>
                      <div style={{ background:'#1c0a00', border:'1px solid #f9731640', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
                        <div style={{ fontSize:11, color:'#f97316', fontWeight:700, marginBottom:6 }}>ROOT CAUSE</div>
                        <div style={{ fontSize:13, color:'#fed7aa', lineHeight:1.7 }}>{diagnosis.root_cause || '—'}</div>
                      </div>
                      {diagnosis.rca && (
                        <div style={{ background:'#0f172a', borderRadius:10, padding:'14px 16px' }}>
                          <div style={{ fontSize:11, color:'#64748b', fontWeight:700, marginBottom:6 }}>FULL ANALYSIS</div>
                          <div style={{ fontSize:13, color:'#94a3b8', lineHeight:1.8 }}>{diagnosis.rca}</div>
                        </div>
                      )}
                      {diagnosis.is_recurring && (
                        <div style={{ marginTop:12, padding:'10px 14px', background:'#1c0000', border:'1px solid #ef444440', borderRadius:8, fontSize:12, color:'#fca5a5' }}>
                          🔁 {diagnosis.recurrence_note}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── PREVENTION TAB ── */}
                  {activeTab === 'prevention' && (
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#a78bfa', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>🛡️ Prevention Actions</div>
                      {diagnosis.prevention_actions ? (
                        diagnosis.prevention_actions.split('\n').filter(l => l.trim()).map((line, i) => {
                          const isStep = /^\d+\./.test(line.trim())
                          return (
                            <div key={i} style={{ display:'flex', gap:10, marginBottom:8, padding: isStep ? '10px 12px' : '0', background: isStep ? '#1a0a2e' : 'transparent', borderRadius: isStep ? 8 : 0, borderLeft: isStep ? '3px solid #8b5cf6' : 'none' }}>
                              {isStep && <span style={{ fontSize:14 }}>🛡️</span>}
                              <div style={{ fontSize:13, color: isStep ? '#ddd6fe' : '#64748b', lineHeight:1.6 }}>
                                {isStep ? line.replace(/^\d+\.\s*/, '') : line}
                              </div>
                            </div>
                          )
                        })
                      ) : <p style={{ color:'#334155', fontSize:13 }}>No prevention actions available</p>}
                    </div>
                  )}

                  {/* ── CONTEXT TAB ── */}
                  {activeTab === 'context' && (
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#22d3ee', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>📊 Diagnosis Context</div>
                      {[
                        { label:'Frameworks Detected', val: diagnosis.detected_frameworks?.join(', ') || 'None detected' },
                        { label:'Affected Layer',       val: diagnosis.affected_layer || '—'  },
                        { label:'Priority Action',      val: diagnosis.priority_recommendation || '—' },
                        { label:'Escalate To',          val: diagnosis.escalate_to || 'No escalation needed' },
                        { label:'Past Occurrences',     val: diagnosis.past_occurrences || 0  },
                        { label:'Same User Before',     val: diagnosis.same_user_before ? 'Yes' : 'No' },
                        { label:'Session Errors Found', val: diagnosis.session_errors_found?.length || 0 },
                        { label:'Health Issues Found',  val: diagnosis.health_issues_found?.length || 0 },
                      ].map(({ label, val }) => (
                        <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', background:'#0f172a', borderRadius:6, marginBottom:6 }}>
                          <span style={{ fontSize:12, color:'#475569' }}>{label}</span>
                          <span style={{ fontSize:12, color:'#94a3b8', fontWeight:600, maxWidth:200, textAlign:'right' }}>{String(val)}</span>
                        </div>
                      ))}
                      {diagnosis.screenshot_findings && diagnosis.screenshot_findings !== 'No screenshot provided' && (
                        <div style={{ marginTop:10, padding:'10px 12px', background:'#1a1208', border:'1px solid #f59e0b40', borderRadius:8 }}>
                          <div style={{ fontSize:11, color:'#f59e0b', fontWeight:700, marginBottom:4 }}>📸 Screenshot Findings</div>
                          <div style={{ fontSize:12, color:'#fcd34d' }}>{diagnosis.screenshot_findings}</div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div style={{ padding:'14px 20px', borderTop:'1px solid #1f2d45', display:'flex', gap:8 }}>
              {diagnosis && (
                <button onClick={runDiagnosis} disabled={diagRunning}
                  style={{ flex:1, padding:'9px', background:'linear-gradient(135deg,#1e3a5f,#083344)', border:'1px solid #3b82f640', borderRadius:8, color:'#60a5fa', cursor:'pointer', fontSize:12, fontWeight:600, opacity: diagRunning ? 0.6 : 1 }}>
                  {diagRunning ? '⏳ Re-analyzing...' : '🔄 Re-run AI'}
                </button>
              )}
              <button onClick={() => router.push(`/tickets/${panel.id}`)}
                style={{ flex:1, padding:'9px', background:'#083344', border:'none', borderRadius:8, color:'#06b6d4', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                Open Full Ticket →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Loader() {
  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#06b6d4', animation:'spin 0.7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

