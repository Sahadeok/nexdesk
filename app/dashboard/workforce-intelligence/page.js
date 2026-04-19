'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

const BURN_C = { low:'#16a34a', medium:'#d97706', high:'#dc2626', critical:'#dc2626' }
const FIX_C = { none:'#dc2626', temporary:'#d97706', permanent:'#16a34a', accepted_risk:'#6b7280' }
const PRI_C = { critical:'#dc2626', high:'#d97706', medium:'#2563eb', low:'#16a34a' }

export default function WorkforceDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState({})
  const [recurring, setRecurring] = useState([])
  const [snapshots, setSnapshots] = useState([])
  const [translations, setTranslations] = useState([])
  const [coaching, setCoaching] = useState([])
  const [predictions, setPredictions] = useState([])
  const [agents, setAgents] = useState([])
  const [tickets, setTickets] = useState([])
  const [genLoading, setGenLoading] = useState('')
  const [translateInput, setTranslateInput] = useState('')
  const [coachAgent, setCoachAgent] = useState('')
  const [coachTicket, setCoachTicket] = useState('')
  const [staffDate, setStaffDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedCoach, setSelectedCoach] = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { user } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    await loadAll()
    setLoading(false)
  }

  async function loadAll() {
    const [stR, recR, wlR, trR, coR, prR, agR, tkR] = await Promise.all([
      fetch('/api/workforce-intelligence?type=stats').then(r => r.json()),
      fetch('/api/workforce-intelligence?type=recurring').then(r => r.json()),
      fetch('/api/workforce-intelligence?type=workload').then(r => r.json()),
      fetch('/api/workforce-intelligence?type=translations').then(r => r.json()),
      fetch('/api/workforce-intelligence?type=coaching').then(r => r.json()),
      fetch('/api/workforce-intelligence?type=staffing').then(r => r.json()),
      fetch('/api/workforce-intelligence?type=agents').then(r => r.json()),
      fetch('/api/workforce-intelligence?type=tickets_for_coaching').then(r => r.json()),
    ])
    setStats(stR.stats || {})
    setRecurring(recR.issues || [])
    setSnapshots(wlR.snapshots || [])
    setTranslations(trR.translations || [])
    setCoaching(coR.sessions || [])
    setPredictions(prR.predictions || [])
    setAgents(agR.agents || [])
    setTickets(tkR.tickets || [])
  }

  async function action(a, body = {}) {
    setGenLoading(a)
    try {
      await fetch('/api/workforce-intelligence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: a, ...body }),
      })
      await loadAll()
    } catch (e) { /* ignore */ }
    setGenLoading('')
  }

  const S = {
    page: { minHeight:'100vh', background:'#f8fafc', fontFamily:"'DM Sans',sans-serif", color:'#111827' },
    card: { background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' },
    badge: (c) => ({ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:600, background:c+'15', color:c, border:`1px solid ${c}30`, display:'inline-block' }),
    input: { width:'100%', padding:'10px 14px', background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', color:'#111827' },
    btn: (c='#2563eb') => ({ padding:'10px 20px', background:c, border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit' }),
    btnO: { padding:'8px 14px', background:'transparent', border:'1px solid #e5e7eb', borderRadius:8, color:'#374151', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:'inherit' },
    select: { padding:'10px 14px', background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', color:'#111827' },
  }

  if (loading) return (
    <div style={S.page}><GlobalNav title="Workforce Intelligence" />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'80vh' }}>
        <div style={{ textAlign:'center' }}><div style={{ fontSize:48 }}>👥</div>
        <div style={{ color:'#6b7280', fontSize:14, marginTop:8 }}>Loading Workforce Intelligence...</div></div>
      </div></div>
  )

  const latestSnapshot = snapshots[0]
  const agentLoads = latestSnapshot?.agent_loads || []
  const heatmap = latestSnapshot?.hourly_heatmap || []

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing:border-box; }
        .wf-tab { padding:8px 16px; border-radius:8px; font-size:13px; font-weight:500; cursor:pointer; border:1px solid #e5e7eb; background:#fff; color:#6b7280; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .wf-tab:hover { border-color:#d1d5db; color:#374151; }
        .wf-tab.active { background:#f0fdf4; color:#059669; border-color:#bbf7d0; font-weight:600; }
        .wf-btn:hover { filter:brightness(0.9); transform:translateY(-1px); }
      `}</style>

      <GlobalNav title="Workforce Intelligence Hub" />

      <div style={{ maxWidth:1400, margin:'0 auto', padding:'28px 24px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>👥 Workforce Intelligence Hub</h1>
            <p style={{ color:'#6b7280', fontSize:13, margin:'4px 0 0' }}>P31-35 — Recurring Issues · Workload Heatmap · Plain English · AI Shadow · Predictive Staffing</p>
          </div>
          <button style={S.btnO} onClick={loadAll}>↻ Refresh</button>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:24 }}>
          {[
            { icon:'🔄', label:'Open Recurring', val:stats.recurring_open||0, c:(stats.recurring_open||0)>3?'#dc2626':'#d97706' },
            { icon:'📊', label:'Avg Agent Load', val:stats.avg_agent_load||0, c:(stats.avg_agent_load||0)>5?'#dc2626':'#16a34a' },
            { icon:'👤', label:'Active Agents', val:stats.total_agents||0, c:'#2563eb' },
            { icon:'📝', label:'Translations', val:stats.translations||0, c:'#7c3aed' },
            { icon:'🎓', label:'Avg Coach Score', val:stats.avg_coaching_score||0, c:(stats.avg_coaching_score||0)>70?'#16a34a':'#d97706' },
            { icon:'🔮', label:'Staff Predictions', val:stats.staffing_predictions||0, c:'#059669' },
          ].map((s,i) => (
            <div key={i} style={{ ...S.card, padding:'16px 20px', animation:`fadeUp 0.3s ${i*0.05}s ease both` }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
              <div style={{ fontSize:26, fontWeight:800, color:s.c, letterSpacing:'-1px' }}>{s.val}</div>
              <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
          {[
            { key:'overview', label:'📋 Overview' },
            { key:'recurring', label:`🔄 Recurring Issues (${recurring.length})` },
            { key:'heatmap', label:'🗺️ Workload Heatmap' },
            { key:'plaineng', label:'📝 Plain English' },
            { key:'shadow', label:`🎓 AI Shadow Coach (${coaching.length})` },
            { key:'staffing', label:`🔮 Predictive Staffing (${predictions.length})` },
          ].map(t => (
            <button key={t.key} className={`wf-tab${tab===t.key?' active':''}`} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        {/* ═══ OVERVIEW ═══ */}
        {tab === 'overview' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div style={{ ...S.card, padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 16px' }}>⚡ Quick Actions</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <button style={S.btn('#dc2626')} className="wf-btn" disabled={genLoading==='detect_recurring'} onClick={() => action('detect_recurring')}>{genLoading==='detect_recurring'?'⏳ Scanning...':'🔄 Detect Recurring Issues'}</button>
                <button style={S.btn('#2563eb')} className="wf-btn" disabled={genLoading==='workload_snapshot'} onClick={() => action('workload_snapshot')}>{genLoading==='workload_snapshot'?'⏳ Generating...':'🗺️ Generate Workload Snapshot'}</button>
                <button style={S.btn('#7c3aed')} className="wf-btn" onClick={() => setTab('shadow')}>🎓 Start Shadow Coaching</button>
                <button style={S.btn('#059669')} className="wf-btn" disabled={genLoading==='predict_staffing'} onClick={() => action('predict_staffing', { date: staffDate })}>{genLoading==='predict_staffing'?'⏳ Predicting...':'🔮 Predict Staffing for Today'}</button>
              </div>
            </div>
            <div style={{ ...S.card, padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 16px' }}>📊 Agent Workload (Latest)</h3>
              {agentLoads.length === 0 ? (
                <div style={{ padding:20, textAlign:'center', color:'#9ca3af', fontSize:13 }}>Generate a workload snapshot to see agent loads</div>
              ) : agentLoads.slice(0, 5).map((a, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f3f4f6' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{a.name || a.email}</div>
                    <div style={{ fontSize:11, color:'#6b7280' }}>{a.open_tickets} open · {a.critical_tickets} critical</div>
                  </div>
                  <span style={S.badge(BURN_C[a.burnout_risk]||'#6b7280')}>{a.burnout_risk} risk</span>
                </div>
              ))}
            </div>
            <div style={{ ...S.card, padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 16px' }}>🔄 Top Recurring Issues</h3>
              {recurring.length === 0 ? (
                <div style={{ padding:20, textAlign:'center', color:'#9ca3af', fontSize:13 }}>Run recurring detection first</div>
              ) : recurring.slice(0, 4).map(r => (
                <div key={r.id} style={{ padding:'8px 0', borderBottom:'1px solid #f3f4f6' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:13, fontWeight:600 }}>{r.title}</span>
                    <div style={{ display:'flex', gap:6 }}>
                      <span style={S.badge('#dc2626')}>{r.occurrence_count}x</span>
                      <span style={S.badge(FIX_C[r.fix_type]||'#dc2626')}>{r.fix_type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ ...S.card, padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 16px' }}>🔮 Latest Staffing Prediction</h3>
              {predictions.length === 0 ? (
                <div style={{ padding:20, textAlign:'center', color:'#9ca3af', fontSize:13 }}>Generate a prediction first</div>
              ) : (() => {
                const p = predictions[0]
                return (
                  <div>
                    <div style={{ fontSize:12, color:'#6b7280', marginBottom:8 }}>📅 {p.prediction_date} · Confidence: {p.ai_confidence_pct}%</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                      <div style={{ padding:10, background:'#eff6ff', borderRadius:8, textAlign:'center' }}>
                        <div style={{ fontSize:20, fontWeight:800, color:'#2563eb' }}>{p.predicted_ticket_volume}</div>
                        <div style={{ fontSize:10, color:'#6b7280' }}>Predicted Tickets</div>
                      </div>
                      <div style={{ padding:10, background:'#f0fdf4', borderRadius:8, textAlign:'center' }}>
                        <div style={{ fontSize:20, fontWeight:800, color:'#16a34a' }}>{(p.recommended_l1_agents||0)+(p.recommended_l2_agents||0)+(p.recommended_dev_agents||0)}</div>
                        <div style={{ fontSize:10, color:'#6b7280' }}>Staff Needed</div>
                      </div>
                      <div style={{ padding:10, background:'#fef2f2', borderRadius:8, textAlign:'center' }}>
                        <div style={{ fontSize:20, fontWeight:800, color:'#dc2626' }}>{p.predicted_critical_pct}%</div>
                        <div style={{ fontSize:10, color:'#6b7280' }}>Critical %</div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* ═══ RECURRING ISSUES ═══ */}
        {tab === 'recurring' && (
          <div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
              <button style={S.btn('#dc2626')} className="wf-btn" disabled={genLoading==='detect_recurring'} onClick={() => action('detect_recurring')}>{genLoading==='detect_recurring'?'⏳ Scanning...':'🔄 Detect Recurring Issues'}</button>
            </div>
            {recurring.length === 0 ? (
              <div style={{ ...S.card, padding:60, textAlign:'center' }}><div style={{ fontSize:48, opacity:0.3 }}>🔄</div><div style={{ fontSize:14, color:'#6b7280', marginTop:12 }}>No recurring issues detected yet</div></div>
            ) : recurring.map(r => (
              <div key={r.id} style={{ ...S.card, padding:20, marginBottom:12, borderLeft:`4px solid ${FIX_C[r.fix_type]||'#dc2626'}`, animation:'fadeUp 0.3s ease both' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:4 }}>
                      <span style={{ fontSize:15, fontWeight:700 }}>{r.title}</span>
                      <span style={S.badge('#dc2626')}>{r.occurrence_count}x occurrences</span>
                      <span style={S.badge(FIX_C[r.fix_type]||'#dc2626')}>{r.fix_type || 'no fix'}</span>
                      {r.category && <span style={S.badge('#6b7280')}>{r.category}</span>}
                    </div>
                    <div style={{ fontSize:13, color:'#6b7280' }}>{r.description}</div>
                  </div>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:(r.ai_priority_score||0)>70?'#dc2626':(r.ai_priority_score||0)>40?'#d97706':'#16a34a', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:800, flexShrink:0 }}>{r.ai_priority_score||0}</div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {r.ai_root_cause && <div style={{ padding:10, background:'#fef2f2', borderRadius:8, border:'1px solid #fecaca' }}>
                    <div style={{ fontSize:10, fontWeight:600, color:'#dc2626', marginBottom:4 }}>🔍 ROOT CAUSE</div>
                    <div style={{ fontSize:12, color:'#374151' }}>{r.ai_root_cause}</div>
                  </div>}
                  {r.ai_permanent_fix_suggestion && <div style={{ padding:10, background:'#f0fdf4', borderRadius:8, border:'1px solid #bbf7d0' }}>
                    <div style={{ fontSize:10, fontWeight:600, color:'#059669', marginBottom:4 }}>✅ PERMANENT FIX</div>
                    <div style={{ fontSize:12, color:'#374151' }}>{r.ai_permanent_fix_suggestion}</div>
                  </div>}
                </div>
                {r.ai_estimated_effort && <div style={{ fontSize:11, color:'#6b7280', marginTop:8 }}>⏱️ Effort: {r.ai_estimated_effort} · 💥 Impact: {r.ai_business_impact}</div>}
              </div>
            ))}
          </div>
        )}

        {/* ═══ WORKLOAD HEATMAP ═══ */}
        {tab === 'heatmap' && (
          <div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
              <button style={S.btn('#2563eb')} className="wf-btn" disabled={genLoading==='workload_snapshot'} onClick={() => action('workload_snapshot')}>{genLoading==='workload_snapshot'?'⏳...':'🗺️ Generate Snapshot'}</button>
            </div>
            {!latestSnapshot ? (
              <div style={{ ...S.card, padding:60, textAlign:'center' }}><div style={{ fontSize:48, opacity:0.3 }}>🗺️</div><div style={{ fontSize:14, color:'#6b7280', marginTop:12 }}>Generate a workload snapshot to see the heatmap</div></div>
            ) : (
              <div>
                {/* Agent Load Cards */}
                <div style={{ ...S.card, padding:20, marginBottom:16 }}>
                  <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 16px' }}>👤 Agent Load Distribution</h3>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                    {agentLoads.map((a, i) => (
                      <div key={i} style={{ padding:14, borderRadius:10, border:`1px solid ${BURN_C[a.burnout_risk]||'#e5e7eb'}30`, background:BURN_C[a.burnout_risk]+'08', animation:`fadeUp 0.3s ${i*0.05}s ease both` }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                          <div style={{ fontSize:13, fontWeight:700 }}>{a.name || a.email?.split('@')[0]}</div>
                          <span style={S.badge(BURN_C[a.burnout_risk]||'#16a34a')}>{a.burnout_risk}</span>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, fontSize:11 }}>
                          <div style={{ textAlign:'center' }}><div style={{ fontWeight:700, color:'#d97706', fontSize:16 }}>{a.open_tickets}</div><div style={{ color:'#9ca3af' }}>Open</div></div>
                          <div style={{ textAlign:'center' }}><div style={{ fontWeight:700, color:'#dc2626', fontSize:16 }}>{a.critical_tickets}</div><div style={{ color:'#9ca3af' }}>Critical</div></div>
                          <div style={{ textAlign:'center' }}><div style={{ fontWeight:700, color:'#16a34a', fontSize:16 }}>{a.total_resolved}</div><div style={{ color:'#9ca3af' }}>Resolved</div></div>
                        </div>
                        <div style={{ height:6, borderRadius:3, background:'#e5e7eb', marginTop:10 }}>
                          <div style={{ height:'100%', borderRadius:3, background:BURN_C[a.burnout_risk]||'#16a34a', width:`${Math.min(100, a.open_tickets * 10)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Heatmap Grid */}
                <div style={{ ...S.card, padding:20, marginBottom:16 }}>
                  <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 16px' }}>📊 Ticket Volume Heatmap (Last 7 Days)</h3>
                  <div style={{ display:'grid', gridTemplateColumns:'40px repeat(7,1fr)', gap:2, fontSize:10 }}>
                    <div></div>
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} style={{ textAlign:'center', color:'#6b7280', fontWeight:600, padding:4 }}>{d}</div>)}
                    {[...Array(24)].map((_, h) => (
                      <>{[<div key={`h-${h}`} style={{ display:'flex', alignItems:'center', color:'#9ca3af', fontSize:10, fontWeight:600 }}>{h}:00</div>, ...Array(7).fill(0).map((_, d) => {
                        const cell = heatmap.find(c => c.hour === h && c.day_index === d)
                        const val = cell?.tickets_created || 0
                        const maxVal = Math.max(1, ...heatmap.map(c => c.tickets_created || 0))
                        const intensity = val / maxVal
                        const bg = val === 0 ? '#f3f4f6' : `rgba(37,99,235,${0.1 + intensity * 0.8})`
                        return <div key={`${h}-${d}`} style={{ height:18, borderRadius:3, background:bg, display:'flex', alignItems:'center', justifyContent:'center', color:intensity > 0.5 ? '#fff' : '#6b7280', fontSize:9, fontWeight:600 }}>{val || ''}</div>
                      })]}</>
                    ))}
                  </div>
                </div>
                {/* AI Recommendations */}
                {(latestSnapshot.ai_burnout_alerts || []).length > 0 && (
                  <div style={{ ...S.card, padding:20 }}>
                    <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 12px', color:'#dc2626' }}>⚠️ AI Burnout Alerts</h3>
                    {latestSnapshot.ai_burnout_alerts.map((a, i) => (
                      <div key={i} style={{ padding:10, background:'#fef2f2', borderRadius:8, border:'1px solid #fecaca', marginBottom:8 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'#dc2626' }}>{a.agent} — {a.risk} risk</div>
                        <div style={{ fontSize:12, color:'#374151' }}>{a.recommendation}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ PLAIN ENGLISH ═══ */}
        {tab === 'plaineng' && (
          <div>
            <div style={{ ...S.card, padding:20, marginBottom:16 }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 12px' }}>📝 Plain English Resolver</h3>
              <p style={{ fontSize:12, color:'#6b7280', margin:'0 0 12px' }}>Paste any technical resolution → AI translates it into plain language for users, executives, and engineers</p>
              <div style={{ display:'flex', gap:8 }}>
                <textarea style={{ ...S.input, height:70, resize:'vertical' }} placeholder="Paste technical resolution text here... e.g. 'Fixed DNS cache poisoning by flushing resolver cache and updating TTL from 86400 to 300 in /etc/resolv.conf'" value={translateInput} onChange={e => setTranslateInput(e.target.value)} />
              </div>
              <button style={{ ...S.btn('#7c3aed'), marginTop:8 }} className="wf-btn" disabled={genLoading === 'translate_resolution' || !translateInput.trim()} onClick={() => action('translate_resolution', { resolution: translateInput })}>{genLoading === 'translate_resolution' ? '⏳ Translating...' : '📝 Translate to Plain English'}</button>
            </div>
            {translations.length === 0 ? (
              <div style={{ ...S.card, padding:40, textAlign:'center', color:'#9ca3af', fontSize:13 }}>No translations yet</div>
            ) : translations.map(t => (
              <div key={t.id} style={{ ...S.card, padding:20, marginBottom:12, animation:'fadeUp 0.3s ease both' }}>
                <div style={{ display:'flex', gap:6, marginBottom:12 }}>
                  <span style={S.badge('#6b7280')}>Complexity: {t.complexity_level}</span>
                  <span style={S.badge('#7c3aed')}>{(t.jargon_removed || []).length} jargon replaced</span>
                </div>
                <div style={{ padding:10, background:'#f8fafc', borderRadius:8, marginBottom:10, fontSize:12, color:'#6b7280' }}>
                  <strong>Original:</strong> {t.original_resolution?.substring(0, 150)}...
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  <div style={{ padding:12, background:'#f0fdf4', borderRadius:8, border:'1px solid #bbf7d0' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#059669', marginBottom:6 }}>👤 User-Friendly</div>
                    <div style={{ fontSize:12, color:'#374151', lineHeight:1.6 }}>{t.user_friendly}</div>
                  </div>
                  <div style={{ padding:12, background:'#eff6ff', borderRadius:8, border:'1px solid #bfdbfe' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#2563eb', marginBottom:6 }}>📊 Executive Summary</div>
                    <div style={{ fontSize:12, color:'#374151', lineHeight:1.6 }}>{t.executive_summary}</div>
                  </div>
                  <div style={{ padding:12, background:'#f5f3ff', borderRadius:8, border:'1px solid #c4b5fd' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#7c3aed', marginBottom:6 }}>🔧 Technical Steps</div>
                    <div style={{ fontSize:12, color:'#374151', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{t.technical_steps}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ AI SHADOW COACH ═══ */}
        {tab === 'shadow' && (
          <div style={{ display:'grid', gridTemplateColumns:selectedCoach?'1fr 1fr':'1fr', gap:16 }}>
            <div>
              <div style={{ ...S.card, padding:20, marginBottom:16 }}>
                <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 12px' }}>🎓 AI Shadow Coaching</h3>
                <p style={{ fontSize:12, color:'#6b7280', margin:'0 0 12px' }}>Select an agent and ticket → AI observes handling and provides real-time coaching</p>
                <div style={{ display:'flex', gap:8 }}>
                  <select style={{ ...S.select, flex:1 }} value={coachAgent} onChange={e => setCoachAgent(e.target.value)}>
                    <option value="">Select Agent</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.full_name || a.email} ({a.role})</option>)}
                  </select>
                  <select style={{ ...S.select, flex:1 }} value={coachTicket} onChange={e => setCoachTicket(e.target.value)}>
                    <option value="">Select Ticket</option>
                    {tickets.map(t => <option key={t.id} value={t.id}>{t.ticket_number}: {t.title?.substring(0,40)}</option>)}
                  </select>
                  <button style={S.btn('#059669')} className="wf-btn" disabled={genLoading==='shadow_coach'||!coachAgent||!coachTicket} onClick={() => action('shadow_coach', { agent_id: coachAgent, ticket_id: coachTicket })}>{genLoading==='shadow_coach'?'⏳...':'🎓 Coach'}</button>
                </div>
              </div>
              <div style={{ ...S.card, overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid #f3f4f6', fontSize:14, fontWeight:700 }}>Coaching Sessions ({coaching.length})</div>
                {coaching.length === 0 ? (
                  <div style={{ padding:40, textAlign:'center', color:'#9ca3af', fontSize:13 }}>No coaching sessions yet</div>
                ) : coaching.map(c => (
                  <div key={c.id} style={{ padding:'12px 16px', borderBottom:'1px solid #f3f4f6', cursor:'pointer', transition:'background 0.1s' }} onClick={() => setSelectedCoach(c)} onMouseOver={e => e.currentTarget.style.background='#f8fafc'} onMouseOut={e => e.currentTarget.style.background=''}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ fontSize:13, fontWeight:600 }}>{c.coaching_type} coaching</div>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <div style={{ width:30, height:30, borderRadius:'50%', background:(c.ai_quality_score||0)>70?'#16a34a':(c.ai_quality_score||0)>40?'#d97706':'#dc2626', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:800 }}>{c.ai_quality_score||0}</div>
                        <span style={{ fontSize:11, color:'#9ca3af' }}>{new Date(c.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {selectedCoach && (
              <div style={{ ...S.card, padding:20, position:'sticky', top:20, maxHeight:'80vh', overflow:'auto' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                  <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>🎓 Coaching Detail</h3>
                  <button style={S.btnO} onClick={() => setSelectedCoach(null)}>✕</button>
                </div>
                {/* Quality Score */}
                <div style={{ display:'flex', gap:12, marginBottom:16 }}>
                  <div style={{ width:60, height:60, borderRadius:'50%', background:(selectedCoach.ai_quality_score||0)>70?'#16a34a':(selectedCoach.ai_quality_score||0)>40?'#d97706':'#dc2626', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:20, fontWeight:800, flexShrink:0 }}>{selectedCoach.ai_quality_score||0}</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, flex:1 }}>
                    {Object.entries(selectedCoach.ai_quality_breakdown || {}).map(([k, v]) => (
                      <div key={k}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:2 }}>
                          <span style={{ color:'#6b7280', textTransform:'capitalize' }}>{k}</span><span style={{ fontWeight:700 }}>{v}</span>
                        </div>
                        <div style={{ height:4, borderRadius:2, background:'#e5e7eb' }}><div style={{ height:'100%', borderRadius:2, background:v>70?'#16a34a':v>40?'#d97706':'#dc2626', width:`${v}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Observations */}
                {(selectedCoach.ai_observations||[]).length > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>👁️ Observations</div>
                    {selectedCoach.ai_observations.map((o, i) => (
                      <div key={i} style={{ padding:8, background:o.severity==='critical'?'#fef2f2':o.severity==='warning'?'#fffbeb':'#f0fdf4', borderRadius:6, marginBottom:6, fontSize:12, display:'flex', gap:6, border:`1px solid ${o.severity==='critical'?'#fecaca':o.severity==='warning'?'#fde68a':'#bbf7d0'}` }}>
                        <span style={S.badge(o.severity==='critical'?'#dc2626':o.severity==='warning'?'#d97706':'#16a34a')}>{o.type}</span>
                        <span style={{ color:'#374151' }}>{o.message}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Suggestions */}
                {(selectedCoach.ai_suggestions||[]).length > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>💡 Suggestions</div>
                    {selectedCoach.ai_suggestions.map((s, i) => (
                      <div key={i} style={{ padding:8, background:'#eff6ff', borderRadius:6, marginBottom:6, fontSize:12, border:'1px solid #bfdbfe' }}>
                        <div style={{ display:'flex', gap:6, marginBottom:4 }}><span style={S.badge('#2563eb')}>{s.category}</span><span style={S.badge(PRI_C[s.priority]||'#6b7280')}>{s.priority}</span></div>
                        <div style={{ color:'#374151' }}>{s.suggestion}</div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Senior Approach */}
                {selectedCoach.senior_approach && (
                  <div style={{ padding:12, background:'#f5f3ff', borderRadius:8, border:'1px solid #c4b5fd' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#7c3aed', marginBottom:6 }}>🏆 What a Senior Would Do</div>
                    <div style={{ fontSize:12, color:'#374151', lineHeight:1.7 }}>{selectedCoach.senior_approach}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ PREDICTIVE STAFFING ═══ */}
        {tab === 'staffing' && (
          <div>
            <div style={{ ...S.card, padding:20, marginBottom:16 }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 12px' }}>🔮 Predictive Staffing</h3>
              <div style={{ display:'flex', gap:8 }}>
                <input type="date" style={{ ...S.input, width:200 }} value={staffDate} onChange={e => setStaffDate(e.target.value)} />
                <button style={S.btn('#059669')} className="wf-btn" disabled={genLoading==='predict_staffing'} onClick={() => action('predict_staffing', { date: staffDate })}>{genLoading==='predict_staffing'?'⏳ Predicting...':'🔮 Predict Staffing'}</button>
              </div>
            </div>
            {predictions.length === 0 ? (
              <div style={{ ...S.card, padding:60, textAlign:'center' }}><div style={{ fontSize:48, opacity:0.3 }}>🔮</div><div style={{ fontSize:14, color:'#6b7280', marginTop:12 }}>No predictions yet</div></div>
            ) : predictions.map(p => (
              <div key={p.id} style={{ ...S.card, padding:20, marginBottom:12, animation:'fadeUp 0.3s ease both' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700 }}>📅 {p.prediction_date}</div>
                    <div style={{ fontSize:12, color:'#6b7280' }}>Confidence: {p.ai_confidence_pct}% {p.is_market_day ? '· 📈 Market Day' : ''} {p.is_deployment_day ? '· 🚀 Deployment Day' : ''}</div>
                  </div>
                </div>
                {/* Top-level metrics */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
                  <div style={{ padding:12, background:'#eff6ff', borderRadius:10, textAlign:'center' }}>
                    <div style={{ fontSize:24, fontWeight:800, color:'#2563eb' }}>{p.predicted_ticket_volume}</div>
                    <div style={{ fontSize:11, color:'#6b7280' }}>Predicted Tickets</div>
                  </div>
                  <div style={{ padding:12, background:'#f0fdf4', borderRadius:10, textAlign:'center' }}>
                    <div style={{ fontSize:24, fontWeight:800, color:'#16a34a' }}>{p.recommended_l1_agents}</div>
                    <div style={{ fontSize:11, color:'#6b7280' }}>L1 Agents</div>
                  </div>
                  <div style={{ padding:12, background:'#f5f3ff', borderRadius:10, textAlign:'center' }}>
                    <div style={{ fontSize:24, fontWeight:800, color:'#7c3aed' }}>{p.recommended_l2_agents}</div>
                    <div style={{ fontSize:11, color:'#6b7280' }}>L2 Agents</div>
                  </div>
                  <div style={{ padding:12, background:'#fef2f2', borderRadius:10, textAlign:'center' }}>
                    <div style={{ fontSize:24, fontWeight:800, color:'#dc2626' }}>{p.recommended_dev_agents}</div>
                    <div style={{ fontSize:11, color:'#6b7280' }}>Developers</div>
                  </div>
                </div>
                {/* Shift Breakdown */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
                  {[
                    { label:'🌅 Morning', data:p.shift_morning, c:'#d97706' },
                    { label:'🌆 Evening', data:p.shift_evening, c:'#2563eb' },
                    { label:'🌙 Night', data:p.shift_night, c:'#7c3aed' },
                  ].map(sh => (
                    <div key={sh.label} style={{ padding:12, borderRadius:10, border:`1px solid ${sh.c}20`, background:`${sh.c}08` }}>
                      <div style={{ fontSize:13, fontWeight:700, color:sh.c, marginBottom:6 }}>{sh.label}</div>
                      <div style={{ fontSize:11, color:'#374151' }}>
                        📋 {sh.data?.predicted_volume||0} tickets<br/>
                        👤 {sh.data?.recommended_staff||0} staff<br/>
                        ⏰ Peak: {sh.data?.peak_hour||'—'}:00
                      </div>
                    </div>
                  ))}
                </div>
                {/* Peak Hours */}
                {(p.predicted_peak_hours || []).length > 0 && (
                  <div style={{ display:'flex', gap:4, alignItems:'center', marginBottom:8 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:'#374151' }}>⏰ Peak Hours:</span>
                    {p.predicted_peak_hours.map(h => <span key={h} style={S.badge('#dc2626')}>{h}:00</span>)}
                  </div>
                )}
                {/* AI Reasoning */}
                {p.ai_reasoning && (
                  <div style={{ padding:12, background:'#f8fafc', borderRadius:8, border:'1px solid #e5e7eb' }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'#6b7280', marginBottom:4 }}>🧠 AI Reasoning</div>
                    <div style={{ fontSize:12, color:'#374151', lineHeight:1.6 }}>{p.ai_reasoning}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

