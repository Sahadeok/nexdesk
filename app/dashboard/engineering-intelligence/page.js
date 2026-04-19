'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

const SEV_C = { critical: '#dc2626', high: '#d97706', medium: '#6366f1', low: '#16a34a' }
const GRADE_C = { 'A+': '#16a34a', A: '#22c55e', B: '#6366f1', C: '#d97706', D: '#dc2626', F: '#7f1d1d' }
const TYPE_ICON = { architectural: '🏛️', code: '💻', test: '🧪', documentation: '📄', process: '⚙️', infrastructure: '🖥️' }
const CAT_C = { process: '#8b5cf6', agent: '#06b6d4', technical: '#dc2626', sla: '#d97706', knowledge: '#16a34a', communication: '#ec4899' }
const ISSUE_ICON = { unhandled_exception: '💥', null_pointer: '🎯', memory_leak: '🔴', race_condition: '⚡', sql_injection: '🔓', dead_code: '💀', circular_dependency: '🔄' }

export default function EngineeringDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('improvements')
  const [stats, setStats] = useState({})
  const [improvements, setImprovements] = useState([])
  const [scans, setScans] = useState([])
  const [journeys, setJourneys] = useState([])
  const [debts, setDebts] = useState([])
  const [errorCosts, setErrorCosts] = useState([])
  const [tickets, setTickets] = useState([])
  const [genLoading, setGenLoading] = useState('')
  const [selectedTicket, setSelectedTicket] = useState('')
  const [errorSig, setErrorSig] = useState('')
  const [errorDesc, setErrorDesc] = useState('')
  const [expandedImp, setExpandedImp] = useState(null)
  const [expandedDebt, setExpandedDebt] = useState(null)
  const [selectedScan, setSelectedScan] = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { user } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    await loadAll()
    setLoading(false)
  }

  async function loadAll() {
    const res = await Promise.allSettled([
      fetch('/api/engineering-intelligence?type=stats').then(r => r.json()),
      fetch('/api/engineering-intelligence?type=improvements').then(r => r.json()),
      fetch('/api/engineering-intelligence?type=scans').then(r => r.json()),
      fetch('/api/engineering-intelligence?type=journeys').then(r => r.json()),
      fetch('/api/engineering-intelligence?type=debts').then(r => r.json()),
      fetch('/api/engineering-intelligence?type=error_costs').then(r => r.json()),
      fetch('/api/engineering-intelligence?type=tickets_list').then(r => r.json()),
    ])
    const [stR,impR,scR,jR,dR,ecR,tkR] = res.map(r => r.status === 'fulfilled' ? r.value : {})
    setStats(stR?.stats||{}); setImprovements(impR?.improvements||[]); setScans(scR?.scans||[])
    setJourneys(jR?.journeys||[]); setDebts(dR?.debts||[]); setErrorCosts(ecR?.costs||[]); setTickets(tkR?.tickets||[])
  }

  async function action(a, body={}) {
    setGenLoading(a)
    try {
      await fetch('/api/engineering-intelligence', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({action:a,...body}) })
      await loadAll()
    } catch(e){}
    setGenLoading('')
  }

  const S = {
    page: { minHeight:'100vh', background:'#04040e', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' },
    card: (c='rgba(255,255,255,0.03)') => ({ background:c, border:'1px solid rgba(255,255,255,0.07)', borderRadius:14 }),
    badge: c => ({ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:700, background:c+'20', color:c, border:`1px solid ${c}40`, display:'inline-block' }),
    input: { width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:'none', color:'#e2e8f0' },
    btn: c => ({ padding:'11px 22px', background:`linear-gradient(135deg,${c},${c}bb)`, border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif", transition:'all 0.2s', boxShadow:`0 4px 20px ${c}40` }),
    sel: { padding:'11px 14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:'none', color:'#e2e8f0' },
    pbar: (v,c) => ({ height:'100%', width:`${v}%`, borderRadius:3, background:`linear-gradient(90deg,${c},${c}88)`, transition:'width 0.8s ease' }),
  }

  if (loading) return (
    <div style={S.page}><GlobalNav title="Engineering Intelligence" />
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'80vh'}}>
        <div style={{textAlign:'center'}}><div style={{fontSize:64}}>⚙️</div><div style={{color:'#475569',fontSize:13,letterSpacing:2,marginTop:16}}>LOADING ENGINEERING INTELLIGENCE...</div></div>
      </div>
    </div>
  )

  const latestScan = scans[0]

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;}
        .ei-tab{padding:10px 20px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid rgba(255,255,255,0.07);background:transparent;color:#475569;font-family:'DM Sans',sans-serif;transition:all 0.25s;letter-spacing:0.5px;text-transform:uppercase;}
        .ei-tab:hover{color:#94a3b8;border-color:rgba(255,255,255,0.12);}
        .ei-tab.active{background:linear-gradient(135deg,rgba(99,102,241,0.25),rgba(168,85,247,0.15));color:#c7d2fe;border-color:rgba(99,102,241,0.5);}
        .ei-btn:hover{transform:translateY(-2px);filter:brightness(1.1);}
        .ei-row:hover{background:rgba(99,102,241,0.06)!important;cursor:pointer;}
        input:focus,select:focus,textarea:focus{border-color:rgba(99,102,241,0.6)!important;box-shadow:0 0 0 3px rgba(99,102,241,0.1)!important;outline:none;}
      `}</style>

      <GlobalNav title="Engineering Intelligence Hub" />

      <div style={{maxWidth:1500,margin:'0 auto',padding:'28px 24px'}}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:6}}>
              <span style={{fontSize:32}}>⚙️</span>
              <h1 style={{fontSize:26,fontWeight:900,margin:0,background:'linear-gradient(135deg,#6366f1,#8b5cf6,#06b6d4)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',letterSpacing:'-1px'}}>
                Engineering Intelligence Hub
              </h1>
            </div>
            <p style={{color:'#334155',fontSize:13,margin:0}}>P46-50 — Auto-Improve · Code Scanner · Journey Analytics · Tech Debt · Error Cost</p>
          </div>
          <button style={{...S.btn('#475569'),padding:'9px 16px',fontSize:12}} className="ei-btn" onClick={loadAll}>↻ Refresh</button>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:8,marginBottom:28}}>
          {[
            {icon:'💡',l:'Improvements',v:stats.improvements_pending||0,c:'#8b5cf6'},
            {icon:'💰',l:'ROI Opportunity',v:`₹${Math.round((stats.total_roi_opportunity||0)/1000)}K`,c:'#16a34a'},
            {icon:'🏥',l:'Code Health',v:stats.code_health_score||0,c:stats.code_health_score>70?'#16a34a':stats.code_health_score>50?'#d97706':'#dc2626'},
            {icon:'🔴',l:'Critical Issues',v:stats.critical_issues||0,c:'#dc2626'},
            {icon:'⚡',l:'Journey Efficiency',v:`${stats.avg_journey_efficiency||0}%`,c:'#06b6d4'},
            {icon:'😴',l:'Avg Idle Time',v:`${stats.avg_idle_pct||0}%`,c:stats.avg_idle_pct>40?'#dc2626':'#d97706'},
            {icon:'💸',l:'Tech Debt',v:`₹${Math.round((stats.total_tech_debt_inr||0)/1000)}K`,c:'#d97706'},
            {icon:'🚨',l:'Critical Debt',v:stats.critical_debt_count||0,c:'#dc2626'},
            {icon:'🐛',l:'Error Cost/mo',v:`₹${Math.round((stats.total_error_cost_inr||0)/1000)}K`,c:'#dc2626'},
            {icon:'📊',l:'Cost Analyses',v:stats.error_analyses||0,c:'#6366f1'},
          ].map((s,i) => (
            <div key={i} style={{...S.card(`${s.c}0a`),padding:'12px 10px',border:`1px solid ${s.c}20`,animation:`fadeUp 0.3s ${i*0.03}s ease both`,textAlign:'center'}}>
              <div style={{fontSize:18}}>{s.icon}</div>
              <div style={{fontSize:20,fontWeight:900,color:s.c,marginTop:4}}>{s.v}</div>
              <div style={{fontSize:9,color:'#334155',marginTop:3,fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:8,marginBottom:24,flexWrap:'wrap'}}>
          {[
            {key:'improvements',l:`💡 Auto-Improve (${improvements.length})`},
            {key:'scanner',l:`🔍 Code Scanner (${scans.length})`},
            {key:'journey',l:`🗺️ Journey Analytics (${journeys.length})`},
            {key:'debt',l:`💸 Tech Debt (${debts.length})`},
            {key:'errorcost',l:`🐛 Error Cost (${errorCosts.length})`},
          ].map(t => <button key={t.key} className={`ei-tab${tab===t.key?' active':''}`} onClick={()=>setTab(t.key)}>{t.l}</button>)}
        </div>

        {/* ═══ AUTO IMPROVEMENTS ═══ */}
        {tab==='improvements' && (
          <div>
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
              <button style={S.btn('#8b5cf6')} className="ei-btn" disabled={genLoading==='generate_improvements'} onClick={()=>action('generate_improvements')}>
                {genLoading==='generate_improvements'?'⏳ Scanning...':'💡 Generate Improvements'}
              </button>
            </div>
            {improvements.length===0
              ? <div style={{...S.card(),padding:70,textAlign:'center'}}><div style={{fontSize:56,opacity:0.15}}>💡</div><div style={{fontSize:14,color:'#334155',marginTop:16}}>Click "Generate Improvements" to start</div></div>
              : improvements.map(imp => (
                <div key={imp.id} className="ei-row" style={{...S.card(),padding:20,marginBottom:10,borderLeft:`4px solid ${CAT_C[imp.category]||'#6366f1'}`,animation:'fadeUp 0.3s ease both'}} onClick={()=>setExpandedImp(expandedImp===imp.id?null:imp.id)}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                    <div style={{flex:1,marginRight:16}}>
                      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
                        <span style={{fontSize:11,fontWeight:700,color:'#64748b'}}>{imp.suggestion_number}</span>
                        <span style={S.badge(CAT_C[imp.category]||'#6366f1')}>{imp.category}</span>
                        <span style={S.badge(imp.status==='pending'?'#d97706':imp.status==='accepted'?'#16a34a':'#64748b')}>{imp.status}</span>
                      </div>
                      <div style={{fontSize:14,fontWeight:700,color:'#e2e8f0',marginBottom:4}}>{imp.title}</div>
                      <div style={{fontSize:12,color:'#64748b'}}>{imp.problem_statement?.substring(0,120)}</div>
                    </div>
                    <div style={{display:'flex',gap:12,alignItems:'center',flexShrink:0}}>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:22,fontWeight:900,color:'#8b5cf6'}}>{imp.priority_score}</div>
                        <div style={{fontSize:9,color:'#64748b'}}>PRIORITY</div>
                      </div>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:18,fontWeight:800,color:'#16a34a'}}>₹{Math.round((imp.roi_estimate_inr||0)/1000)}K</div>
                        <div style={{fontSize:9,color:'#64748b'}}>ROI</div>
                      </div>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:18,fontWeight:800,color:'#06b6d4'}}>{imp.payback_days}d</div>
                        <div style={{fontSize:9,color:'#64748b'}}>PAYBACK</div>
                      </div>
                    </div>
                  </div>
                  {/* Scores */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                    {[{l:'Impact',v:imp.impact_score,c:'#16a34a'},{l:'Effort (lower=easier)',v:imp.effort_score,c:'#d97706'}].map((m,i)=>(
                      <div key={i}><div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><span style={{fontSize:10,color:'#64748b'}}>{m.l}</span><span style={{fontSize:10,fontWeight:700,color:m.c}}>{m.v}</span></div>
                        <div style={{height:5,borderRadius:3,background:'rgba(255,255,255,0.06)'}}><div style={S.pbar(m.v,m.c)}/></div></div>
                    ))}
                  </div>
                  {expandedImp===imp.id && (
                    <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:14,marginTop:8}}>
                      <div style={{fontSize:12,color:'#a5b4fc',marginBottom:10,lineHeight:1.7}}><strong>Action:</strong> {imp.suggested_action}</div>
                      <div style={{fontSize:12,color:'#94a3b8',marginBottom:10,lineHeight:1.7}}><strong>Expected:</strong> {imp.expected_outcome}</div>
                      {(imp.implementation_steps||[]).length>0 && (
                        <div style={{marginBottom:12}}>
                          <div style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:8}}>📋 STEPS</div>
                          {imp.implementation_steps.map((step,i)=>(
                            <div key={i} style={{display:'flex',gap:10,marginBottom:6,alignItems:'flex-start'}}>
                              <span style={{...S.badge('#6366f1'),minWidth:22,textAlign:'center'}}>{step.step}</span>
                              <span style={{fontSize:12,color:'#94a3b8'}}>{step.detail} <span style={{color:'#475569'}}>— {step.owner}</span></span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{display:'flex',gap:8}}>
                        {imp.status==='pending' && <>
                          <button style={{...S.btn('#16a34a'),padding:'8px 16px',fontSize:12}} className="ei-btn" onClick={e=>{e.stopPropagation();action('update_improvement',{id:imp.id,status:'accepted'})}}>✅ Accept</button>
                          <button style={{...S.btn('#dc2626'),padding:'8px 16px',fontSize:12}} className="ei-btn" onClick={e=>{e.stopPropagation();action('update_improvement',{id:imp.id,status:'rejected'})}}>❌ Reject</button>
                        </>}
                        {imp.status==='accepted' && <button style={{...S.btn('#8b5cf6'),padding:'8px 16px',fontSize:12}} className="ei-btn" onClick={e=>{e.stopPropagation();action('update_improvement',{id:imp.id,status:'implemented'})}}>🚀 Mark Done</button>}
                      </div>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        )}

        {/* ═══ CODE SCANNER ═══ */}
        {tab==='scanner' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              {latestScan && (
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <div style={{padding:'4px 14px',borderRadius:8,background:`${GRADE_C[latestScan.code_health_grade]||'#6366f1'}20`,border:`1px solid ${GRADE_C[latestScan.code_health_grade]||'#6366f1'}40`}}>
                    <span style={{fontSize:24,fontWeight:900,color:GRADE_C[latestScan.code_health_grade]||'#6366f1'}}>{latestScan.code_health_grade}</span>
                    <span style={{fontSize:11,color:'#64748b',marginLeft:6}}>Code Health</span>
                  </div>
                  <div style={{fontSize:13,color:'#64748b'}}>{latestScan.total_issues} issues · {latestScan.tickets_analyzed} tickets · {latestScan.scan_number}</div>
                </div>
              )}
              <button style={S.btn('#dc2626')} className="ei-btn" disabled={genLoading==='run_code_scan'} onClick={()=>action('run_code_scan')}>
                {genLoading==='run_code_scan'?'⏳ Scanning Codebase...':'🔍 Run Code Scan'}
              </button>
            </div>

            {!latestScan
              ? <div style={{...S.card(),padding:70,textAlign:'center'}}><div style={{fontSize:56,opacity:0.15}}>🔍</div><div style={{fontSize:14,color:'#334155',marginTop:16}}>Run your first code quality scan</div></div>
              : <div>
                  {/* Scan Summary */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
                    {[
                      {l:'🔴 Critical',v:latestScan.critical_issues,c:'#dc2626'},
                      {l:'🟠 High',v:latestScan.high_issues,c:'#d97706'},
                      {l:'🔵 Medium',v:latestScan.medium_issues,c:'#6366f1'},
                      {l:'🟢 Low',v:latestScan.low_issues,c:'#16a34a'},
                    ].map((m,i)=>(
                      <div key={i} style={{...S.card(`${m.c}0c`),padding:16,border:`1px solid ${m.c}25`,textAlign:'center'}}>
                        <div style={{fontSize:28,fontWeight:900,color:m.c}}>{m.v}</div>
                        <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{m.l}</div>
                      </div>
                    ))}
                  </div>

                  {/* AI Risk Prediction */}
                  {latestScan.ai_risk_prediction && (
                    <div style={{padding:16,borderRadius:12,background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.25)',marginBottom:16}}>
                      <div style={{fontSize:11,fontWeight:700,color:'#fca5a5',marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>🔮 AI RISK PREDICTION</div>
                      <div style={{fontSize:13,color:'#e2e8f0',lineHeight:1.7}}>{latestScan.ai_risk_prediction}</div>
                    </div>
                  )}

                  {/* Issues List */}
                  <div style={{...S.card(),overflow:'hidden'}}>
                    <div style={{padding:'14px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',justifyContent:'space-between'}}>
                      <span style={{fontSize:14,fontWeight:700,color:'#e2e8f0'}}>🐛 Issues Found</span>
                      <span style={{fontSize:12,color:'#64748b'}}>Est. {latestScan.estimated_total_fix_hours}h to fix · ₹{Math.round((latestScan.estimated_rework_cost_inr||0)/1000)}K cost</span>
                    </div>
                    {(latestScan.issues||[]).map((issue,i)=>(
                      <div key={i} style={{padding:'14px 20px',borderBottom:'1px solid rgba(255,255,255,0.04)',display:'flex',gap:14,alignItems:'flex-start'}}>
                        <div style={{fontSize:22,flexShrink:0}}>{ISSUE_ICON[issue.type]||'🔴'}</div>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',gap:8,marginBottom:6,alignItems:'center'}}>
                            <span style={S.badge(SEV_C[issue.severity]||'#6366f1')}>{issue.severity}</span>
                            <span style={S.badge('#475569')}>{issue.type?.replace(/_/g,' ')}</span>
                            <span style={{fontSize:11,color:'#475569'}}>↩ {issue.recurrence_count}x occurrences</span>
                          </div>
                          <div style={{fontSize:13,fontWeight:600,color:'#e2e8f0',marginBottom:4}}>{issue.description}</div>
                          <div style={{fontSize:11,color:'#64748b',marginBottom:4}}>{issue.file_pattern}</div>
                          {issue.ai_fix_suggestion && (
                            <div style={{padding:'8px 12px',borderRadius:8,background:'rgba(22,163,74,0.08)',border:'1px solid rgba(22,163,74,0.2)',marginTop:6}}>
                              <span style={{fontSize:11,color:'#86efac'}}>💊 Fix: </span>
                              <span style={{fontSize:11,color:'#94a3b8'}}>{issue.ai_fix_suggestion}</span>
                            </div>
                          )}
                          <div style={{fontSize:10,color:'#334155',marginTop:4}}>Est. {issue.estimated_fix_hours}h · {issue.evidence}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
            }
          </div>
        )}

        {/* ═══ JOURNEY ANALYTICS ═══ */}
        {tab==='journey' && (
          <div>
            <div style={{...S.card(),padding:20,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:700,color:'#e2e8f0',marginBottom:12}}>🗺️ Analyze Ticket Journey</div>
              <div style={{display:'flex',gap:8}}>
                <select style={{...S.sel,flex:1}} value={selectedTicket} onChange={e=>setSelectedTicket(e.target.value)}>
                  <option value="">Select ticket to map journey</option>
                  {tickets.map(t=><option key={t.id} value={t.id}>{t.ticket_number}: {t.title?.substring(0,50)}</option>)}
                </select>
                <button style={S.btn('#06b6d4')} className="ei-btn" disabled={genLoading==='analyze_journey'||!selectedTicket} onClick={()=>action('analyze_journey',{ticket_id:selectedTicket}).then(()=>setGenLoading(''))}>
                  {genLoading==='analyze_journey'?'⏳ Mapping...':'🗺️ Map Journey'}
                </button>
              </div>
            </div>

            {journeys.length===0
              ? <div style={{...S.card(),padding:70,textAlign:'center'}}><div style={{fontSize:56,opacity:0.15}}>🗺️</div><div style={{fontSize:14,color:'#334155',marginTop:16}}>No journeys mapped yet</div></div>
              : journeys.map(j => (
                <div key={j.id} style={{...S.card(),padding:22,marginBottom:14,borderLeft:`4px solid ${GRADE_C[j.ai_journey_grade]||'#6366f1'}`,animation:'fadeUp 0.3s ease both'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:'#e2e8f0',marginBottom:4}}>🗺️ {j.ticket_number||'Ticket'}</div>
                      <div style={{display:'flex',gap:8}}>
                        <span style={S.badge(GRADE_C[j.ai_journey_grade]||'#6366f1')}>Grade {j.ai_journey_grade}</span>
                        <span style={S.badge('#06b6d4')}>Efficiency {j.ai_efficiency_score}%</span>
                        <span style={S.badge(j.idle_pct>50?'#dc2626':'#d97706')}>Idle {j.idle_pct?.toFixed(0)}%</span>
                        <span style={S.badge(j.first_contact_resolution?'#16a34a':'#d97706')}>{j.first_contact_resolution?'FCR ✓':'Multi-touch'}</span>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:14}}>
                      {[
                        {l:'Total',v:`${j.total_journey_min}min`,c:'#6366f1'},
                        {l:'Active',v:`${j.active_work_min}min`,c:'#16a34a'},
                        {l:'Idle',v:`${j.idle_time_min}min`,c:'#d97706'},
                        {l:'CSAT',v:`${j.predicted_csat}/5`,c:j.predicted_csat>=4?'#16a34a':'#dc2626'},
                      ].map((m,i)=>(
                        <div key={i} style={{textAlign:'center'}}>
                          <div style={{fontSize:18,fontWeight:800,color:m.c}}>{m.v}</div>
                          <div style={{fontSize:9,color:'#475569'}}>{m.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Phase Timeline */}
                  <div style={{display:'flex',gap:4,marginBottom:14,overflowX:'auto',paddingBottom:4}}>
                    {(j.journey_phases||[]).map((phase,i)=>(
                      <div key={i} style={{minWidth:110,padding:'8px 10px',borderRadius:10,background:`${phase.outcome==='passed'?'#16a34a':phase.outcome==='escalated'?'#d97706':'#dc2626'}10`,border:`1px solid ${phase.outcome==='passed'?'#16a34a':phase.outcome==='escalated'?'#d97706':'#dc2626'}30`,flexShrink:0}}>
                        <div style={{fontSize:9,fontWeight:700,color:phase.outcome==='passed'?'#86efac':phase.outcome==='escalated'?'#fcd34d':'#fca5a5',textTransform:'uppercase',marginBottom:3}}>{phase.phase}</div>
                        <div style={{fontSize:12,fontWeight:700,color:'#e2e8f0'}}>{phase.duration_min}min</div>
                        <div style={{fontSize:10,color:'#64748b'}}>{phase.actor}</div>
                      </div>
                    ))}
                  </div>

                  {j.critical_bottleneck && (
                    <div style={{padding:10,borderRadius:10,background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.2)'}}>
                      <span style={{fontSize:11,fontWeight:700,color:'#fca5a5'}}>🔍 Bottleneck: </span>
                      <span style={{fontSize:11,color:'#94a3b8'}}>{j.critical_bottleneck}</span>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        )}

        {/* ═══ TECH DEBT ═══ */}
        {tab==='debt' && (
          <div>
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
              <button style={S.btn('#d97706')} className="ei-btn" disabled={genLoading==='detect_debt'} onClick={()=>action('detect_debt')}>
                {genLoading==='detect_debt'?'⏳ Detecting...':'💸 Detect Tech Debt'}
              </button>
            </div>
            {debts.length===0
              ? <div style={{...S.card(),padding:70,textAlign:'center'}}><div style={{fontSize:56,opacity:0.15}}>💸</div><div style={{fontSize:14,color:'#334155',marginTop:16}}>No tech debt items detected yet</div></div>
              : debts.map(d=>(
                <div key={d.id} className="ei-row" style={{...S.card(),padding:22,marginBottom:12,borderTop:`3px solid ${SEV_C[d.debt_severity]||'#6366f1'}`,animation:'fadeUp 0.3s ease both'}} onClick={()=>setExpandedDebt(expandedDebt===d.id?null:d.id)}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
                    <div>
                      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
                        <span style={{fontSize:18}}>{TYPE_ICON[d.debt_type]||'💸'}</span>
                        <span style={{fontSize:11,color:'#64748b',fontWeight:700}}>{d.debt_number}</span>
                        <span style={S.badge(SEV_C[d.debt_severity]||'#6366f1')}>{d.debt_severity}</span>
                        <span style={S.badge('#475569')}>{d.debt_type}</span>
                        <span style={S.badge(d.status==='identified'?'#d97706':'#16a34a')}>{d.status}</span>
                      </div>
                      <div style={{fontSize:14,fontWeight:700,color:'#e2e8f0',marginBottom:4}}>{d.title}</div>
                      <div style={{fontSize:12,color:'#64748b'}}>{d.component} · {d.recurring_ticket_count} recurring tickets</div>
                    </div>
                    <div style={{display:'flex',gap:14,flexShrink:0}}>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:18,fontWeight:800,color:'#dc2626'}}>₹{Math.round((d.total_debt_cost_inr||0)/1000)}K</div>
                        <div style={{fontSize:9,color:'#475569'}}>Current Debt</div>
                      </div>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:18,fontWeight:800,color:'#d97706'}}>₹{Math.round((d.projected_6m_cost_inr||0)/1000)}K</div>
                        <div style={{fontSize:9,color:'#475569'}}>6mo Projection</div>
                      </div>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:18,fontWeight:800,color:'#16a34a'}}>{d.fix_roi_multiple}x</div>
                        <div style={{fontSize:9,color:'#475569'}}>Fix ROI</div>
                      </div>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:18,fontWeight:800,color:'#f59e0b'}}>{d.interest_rate_pct}%</div>
                        <div style={{fontSize:9,color:'#475569'}}>/mo interest</div>
                      </div>
                    </div>
                  </div>
                  {expandedDebt===d.id && (
                    <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:12,marginTop:4}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                        <div style={{padding:12,borderRadius:10,background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.15)'}}>
                          <div style={{fontSize:11,fontWeight:700,color:'#fca5a5',marginBottom:4}}>📈 IMPACT PROJECTION</div>
                          <div style={{fontSize:12,color:'#94a3b8',lineHeight:1.7}}>{d.ai_impact_projection}</div>
                        </div>
                        <div style={{padding:12,borderRadius:10,background:'rgba(22,163,74,0.06)',border:'1px solid rgba(22,163,74,0.15)'}}>
                          <div style={{fontSize:11,fontWeight:700,color:'#86efac',marginBottom:4}}>💊 FIX RECOMMENDATION</div>
                          <div style={{fontSize:12,color:'#94a3b8',lineHeight:1.7}}>{d.ai_fix_recommendation}</div>
                        </div>
                      </div>
                      <div style={{fontSize:11,color:'#64748b',marginBottom:10}}>Monthly cost: ₹{Math.round((d.monthly_support_cost_inr||0)/1000)}K support + ₹{Math.round((d.monthly_customer_impact_inr||0)/1000)}K customer impact · Fix: {d.estimated_fix_hours}h @ ₹{Math.round((d.estimated_fix_cost_inr||0)/1000)}K</div>
                      <div style={{display:'flex',gap:8}}>
                        {d.status==='identified' && <button style={{...S.btn('#6366f1'),padding:'8px 16px',fontSize:12}} className="ei-btn" onClick={e=>{e.stopPropagation();action('update_debt',{id:d.id,status:'in_progress'})}}>🔧 Start Fix</button>}
                        {d.status==='in_progress' && <button style={{...S.btn('#16a34a'),padding:'8px 16px',fontSize:12}} className="ei-btn" onClick={e=>{e.stopPropagation();action('update_debt',{id:d.id,status:'resolved'})}}>✅ Resolved</button>}
                        <button style={{...S.btn('#475569'),padding:'8px 16px',fontSize:12}} className="ei-btn" onClick={e=>{e.stopPropagation();action('update_debt',{id:d.id,status:'accepted_risk'})}}>⚠️ Accept Risk</button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        )}

        {/* ═══ ERROR COST ═══ */}
        {tab==='errorcost' && (
          <div>
            <div style={{...S.card(),padding:20,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:700,color:'#e2e8f0',marginBottom:12}}>🐛 Error Cost Calculator</div>
              <div style={{display:'flex',gap:8}}>
                <input style={S.input} placeholder='Error signature (e.g. "NullPointerException in PaymentService")' value={errorSig} onChange={e=>setErrorSig(e.target.value)}/>
                <input style={{...S.input,flex:2}} placeholder="Error description / context" value={errorDesc} onChange={e=>setErrorDesc(e.target.value)}/>
                <button style={S.btn('#dc2626')} className="ei-btn" disabled={genLoading==='calculate_error_cost'||!errorSig.trim()} onClick={()=>action('calculate_error_cost',{error_signature:errorSig,error_description:errorDesc}).then(()=>{setGenLoading('');setErrorSig('');setErrorDesc('')})}>
                  {genLoading==='calculate_error_cost'?'⏳ Calculating...':'🐛 Calculate True Cost'}
                </button>
              </div>
            </div>
            {errorCosts.length===0
              ? <div style={{...S.card(),padding:70,textAlign:'center'}}><div style={{fontSize:56,opacity:0.15}}>🐛</div><div style={{fontSize:14,color:'#334155',marginTop:16}}>No error cost analyses yet</div></div>
              : errorCosts.map(ec => (
                <div key={ec.id} style={{...S.card(),padding:24,marginBottom:16,borderLeft:'4px solid #dc2626',animation:'fadeUp 0.3s ease both'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                    <div>
                      <div style={{fontSize:11,color:'#64748b',marginBottom:4}}>{ec.analysis_number} · {ec.error_frequency} occurrences · {ec.period_days} days</div>
                      <div style={{fontSize:14,fontWeight:700,color:'#fca5a5',marginBottom:4}}>{ec.error_signature}</div>
                      <div style={{fontSize:12,color:'#64748b'}}>{ec.affected_users_estimated} users impacted · {ec.error_type}</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:36,fontWeight:900,color:'#dc2626',letterSpacing:'-1px'}}>₹{Math.round((ec.true_total_cost_inr||0)/1000)}K</div>
                      <div style={{fontSize:11,color:'#64748b'}}>TRUE TOTAL COST/mo</div>
                      <span style={S.badge(ec.fix_priority==='immediate'?'#dc2626':ec.fix_priority==='high'?'#d97706':'#6366f1')}>{ec.fix_priority} priority fix</span>
                    </div>
                  </div>

                  {/* 3-column cost breakdown */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
                    {[
                      {title:'💰 Direct Costs',total:ec.total_direct_cost_inr,c:'#dc2626',items:[
                        {l:'Agent Time',v:ec.agent_time_cost_inr},{l:'L2 Escalation',v:ec.l2_escalation_cost_inr},{l:'Dev Fix Time',v:ec.developer_fix_time_cost_inr}
                      ]},
                      {title:'🌊 Indirect Costs',total:ec.total_indirect_cost_inr,c:'#d97706',items:[
                        {l:'Customer Downtime',v:ec.customer_downtime_cost_inr},{l:'SLA Penalties',v:ec.sla_penalty_cost_inr},{l:'Churn Risk',v:ec.churn_risk_cost_inr},{l:'Reputation',v:ec.reputation_cost_inr}
                      ]},
                      {title:'🕳️ Hidden Costs',total:ec.total_hidden_cost_inr,c:'#8b5cf6',items:[
                        {l:'Opportunity Cost',v:ec.rework_opportunity_cost_inr},{l:'Monitoring OH',v:ec.monitoring_overhead_inr},{l:'CS Overhead',v:ec.customer_service_overhead_inr}
                      ]},
                    ].map((col,i)=>(
                      <div key={i} style={{padding:14,borderRadius:12,background:`${col.c}08`,border:`1px solid ${col.c}20`}}>
                        <div style={{fontSize:12,fontWeight:700,color:col.c,marginBottom:8}}>{col.title}</div>
                        <div style={{fontSize:18,fontWeight:900,color:col.c,marginBottom:10}}>₹{Math.round((col.total||0)/1000)}K</div>
                        {col.items.map((item,j)=>(
                          <div key={j} style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                            <span style={{fontSize:10,color:'#64748b'}}>{item.l}</span>
                            <span style={{fontSize:10,fontWeight:700,color:'#94a3b8'}}>₹{Math.round((item.v||0)/1000)}K</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Fix Economics */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
                    <div style={{padding:12,borderRadius:10,background:'rgba(22,163,74,0.08)',border:'1px solid rgba(22,163,74,0.2)',textAlign:'center'}}>
                      <div style={{fontSize:22,fontWeight:900,color:'#16a34a'}}>{ec.fix_roi_multiple}x</div>
                      <div style={{fontSize:11,color:'#64748b'}}>Fix ROI Multiple</div>
                    </div>
                    <div style={{padding:12,borderRadius:10,background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)',textAlign:'center'}}>
                      <div style={{fontSize:22,fontWeight:900,color:'#6366f1'}}>{ec.fix_payback_days}d</div>
                      <div style={{fontSize:11,color:'#64748b'}}>Payback Period</div>
                    </div>
                    <div style={{padding:12,borderRadius:10,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',textAlign:'center'}}>
                      <div style={{fontSize:22,fontWeight:900,color:'#f59e0b'}}>₹{Math.round((ec.cost_per_occurrence_inr||0)/1000)}K</div>
                      <div style={{fontSize:11,color:'#64748b'}}>Cost Per Bug Hit</div>
                    </div>
                  </div>

                  {/* AI Narrative */}
                  {ec.ai_cost_narrative && (
                    <div style={{padding:12,borderRadius:10,background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.2)',marginBottom:10}}>
                      <div style={{fontSize:11,fontWeight:700,color:'#fca5a5',marginBottom:4}}>📢 EXECUTIVE SUMMARY</div>
                      <div style={{fontSize:12,color:'#e2e8f0',lineHeight:1.7}}>{ec.ai_cost_narrative}</div>
                    </div>
                  )}
                  {ec.ai_prevention_strategy && (
                    <div style={{padding:12,borderRadius:10,background:'rgba(22,163,74,0.06)',border:'1px solid rgba(22,163,74,0.2)'}}>
                      <div style={{fontSize:11,fontWeight:700,color:'#86efac',marginBottom:4}}>🛡️ PREVENTION STRATEGY</div>
                      <div style={{fontSize:12,color:'#94a3b8',lineHeight:1.7}}>{ec.ai_prevention_strategy}</div>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}

