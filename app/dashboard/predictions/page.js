'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'

const SERVICES = ['BSE_API','NSE_API','PAYMENT_GATEWAY','KYC_CAMS','SMS_GATEWAY']
const SERVICE_LABELS = {
  BSE_API:         { label:'BSE API',          icon:'📈', desc:'Bombay Stock Exchange feed'      },
  NSE_API:         { label:'NSE API',          icon:'📊', desc:'National Stock Exchange feed'    },
  PAYMENT_GATEWAY: { label:'Payment Gateway',  icon:'💳', desc:'Razorpay / payment processing'   },
  KYC_CAMS:        { label:'KYC / CAMS',       icon:'🪪', desc:'KYC & CAMS integration'          },
  SMS_GATEWAY:     { label:'SMS Gateway',      icon:'📱', desc:'OTP & notification delivery'     },
}
const RISK_CONFIG = {
  healthy:  { color:'#10b981', bg:'#022c22', border:'#10b98140', label:'🟢 Healthy',  barCol:'#10b981' },
  watch:    { color:'#f59e0b', bg:'#1c1000', border:'#f59e0b40', label:'🟡 Watch',    barCol:'#f59e0b' },
  warning:  { color:'#f97316', bg:'#1c0a00', border:'#f9731640', label:'🟠 Warning',  barCol:'#f97316' },
  critical: { color:'#ef4444', bg:'#1c0000', border:'#ef444440', label:'🔴 Critical', barCol:'#ef4444' },
}

export default function PredictionsPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [profile,      setProfile]     = useState(null)
  const [loading,      setLoading]     = useState(true)
  const [running,      setRunning]     = useState(false)
  const [predictions,  setPredictions] = useState([])
  const [trends,       setTrends]      = useState({})
  const [lastRun,      setLastRun]     = useState(null)
  const [accuracy,     setAccuracy]    = useState({})
  const [history,      setHistory]     = useState([])   // prediction_runs history
  const [selected,     setSelected]    = useState(null) // detailed service view
  const [msg,          setMsg]         = useState('')
  const [autoRefresh,  setAutoRefresh] = useState(true)
  const [tab,          setTab]         = useState('live')  // live | history | accuracy
  const intervalRef = useRef()

  const ALLOWED = ['ADMIN','IT_MANAGER','L1_AGENT','L2_AGENT','DEVELOPER']

  useEffect(() => {
    init()
    return () => clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => loadStatus(), 60 * 1000) // refresh every 60s
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [autoRefresh])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user || !ALLOWED.includes(p?.role)) { router.replace('/login'); return }
    setProfile(p)
    await loadStatus()
    await loadHistory()
    setLoading(false)
  }

  async function loadStatus() {
    const res  = await fetch('/api/predict-incidents')
    const data = await res.json()
    if (data.success) {
      setPredictions(data.predictions || [])
      setTrends(data.trends || {})
      setLastRun(data.lastRun)
      setAccuracy(data.accuracy || {})
    }
  }

  async function loadHistory() {
    const { data } = await supabase
      .from('prediction_runs')
      .select('*')
      .order('ran_at', { ascending: false })
      .limit(20)
    setHistory(data || [])
  }

  async function runPrediction() {
    setRunning(true)
    setMsg('🤖 AI is analyzing all services...')
    try {
      const res  = await fetch('/api/predict-incidents', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        const atRisk = data.services_at_risk?.length || 0
        const tickets= data.auto_tickets_raised  || 0
        setMsg(`✅ Analysis complete! ${atRisk} service${atRisk !== 1 ? 's' : ''} at risk.${tickets > 0 ? ` 🚨 ${tickets} P0 ticket${tickets > 1 ? 's' : ''} auto-raised!` : ''}`)
        await loadStatus()
        await loadHistory()
      } else {
        setMsg('❌ ' + (data.error || 'Prediction failed'))
      }
    } catch(e) { setMsg('❌ ' + e.message) }
    setRunning(false)
    setTimeout(() => setMsg(''), 6000)
  }

  const overallRisk = lastRun?.overall_risk || 0
  const overallLevel= overallRisk >= 86 ? 'critical' : overallRisk >= 61 ? 'warning' : overallRisk >= 31 ? 'watch' : 'healthy'
  const RC          = RISK_CONFIG[overallLevel]

  // ── MINI SPARKLINE ────────────────────────────────────────────
  function Sparkline({ data, color }) {
    if (!data || data.length < 2) return <span style={{ fontSize:11, color:'#334155' }}>No data</span>
    const vals  = data.map(d => d.avg_response_ms || 0)
    const max   = Math.max(...vals, 1)
    const w = 80, h = 28
    const pts = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * w
      const y = h - (v / max) * h
      return `${x},${y}`
    }).join(' ')
    return (
      <svg width={w} height={h} style={{ display:'block' }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx={pts.split(' ').pop().split(',')[0]} cy={pts.split(' ').pop().split(',')[1]} r="2.5" fill={color} />
      </svg>
    )
  }

  // ── RISK BAR ─────────────────────────────────────────────────
  function RiskBar({ score, level }) {
    const rc = RISK_CONFIG[level] || RISK_CONFIG.healthy
    return (
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ flex:1, height:8, background:'#1f2d45', borderRadius:4, overflow:'hidden' }}>
          <div style={{ width:`${score}%`, height:'100%', background:rc.barCol, borderRadius:4, transition:'width 0.8s ease' }}/>
        </div>
        <span style={{ fontSize:13, fontWeight:800, color:rc.color, minWidth:32 }}>{score}</span>
      </div>
    )
  }

  // ── SERVICE DETAIL PANEL ─────────────────────────────────────
  function ServiceDetail({ p, trendData, onClose }) {
    if (!p) return null
    const sl  = SERVICE_LABELS[p.service] || { label: p.service, icon:'⚡', desc:'' }
    const rc  = RISK_CONFIG[p.risk_level] || RISK_CONFIG.healthy
    const td  = trendData || []

    return (
      <div style={{ position:'fixed', top:0, right:0, width:'480px', height:'100vh', background:'#0f172a', borderLeft:'1px solid #1f2d45', overflowY:'auto', zIndex:1000, boxShadow:'-8px 0 32px #00000060' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #1f2d45', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'#0f172a', zIndex:1 }}>
          <div>
            <div style={{ fontSize:20 }}>{sl.icon} <span style={{ fontSize:16, fontWeight:800, color:'#e2e8f0' }}>{sl.label}</span></div>
            <div style={{ fontSize:12, color:'#475569', marginTop:2 }}>{sl.desc}</div>
          </div>
          <button onClick={onClose} style={{ padding:'6px 12px', background:'#1f2937', border:'none', borderRadius:8, color:'#64748b', cursor:'pointer', fontSize:16 }}>✕</button>
        </div>

        <div style={{ padding:20 }}>
          {/* Risk Score Big */}
          <div style={{ background:rc.bg, border:`1px solid ${rc.border}`, borderRadius:14, padding:20, marginBottom:16, textAlign:'center' }}>
            <div style={{ fontSize:56, fontWeight:900, color:rc.color, lineHeight:1 }}>{p.risk_score}</div>
            <div style={{ fontSize:13, color:rc.color, marginTop:4 }}>/ 100 Risk Score</div>
            <div style={{ fontSize:14, fontWeight:700, color:rc.color, marginTop:8 }}>{rc.label}</div>
          </div>

          {/* Stats row */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            {[
              { label:'Failure Probability', val:`${p.failure_probability || 0}%`, col: p.failure_probability > 60 ? '#ef4444' : p.failure_probability > 30 ? '#f59e0b' : '#10b981' },
              { label:'Trend',              val: p.trend_direction || 'stable',    col:'#60a5fa' },
              { label:'Predicted Failure',  val: p.predicted_failure ? 'YES ⚠️' : 'No', col: p.predicted_failure ? '#ef4444' : '#10b981' },
              { label:'Auto Ticket',        val: p.auto_ticket_id ? '🎫 Raised' : 'None', col: p.auto_ticket_id ? '#f59e0b' : '#64748b' },
            ].map((s,i) => (
              <div key={i} style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:10, padding:'10px 14px' }}>
                <div style={{ fontSize:11, color:'#475569', marginBottom:2 }}>{s.label}</div>
                <div style={{ fontSize:14, fontWeight:700, color:s.col }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* AI Reason */}
          {p.prediction_reason && (
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:10, padding:14, marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#a5b4fc', marginBottom:6 }}>🔬 AI ANALYSIS</div>
              <div style={{ fontSize:13, color:'#94a3b8', lineHeight:1.7 }}>{p.prediction_reason}</div>
            </div>
          )}

          {/* Recommended Action */}
          {p.recommended_action && (
            <div style={{ background:'#022c22', border:'1px solid #10b98140', borderRadius:10, padding:14, marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#34d399', marginBottom:6 }}>🛠️ RECOMMENDED ACTION</div>
              <div style={{ fontSize:13, color:'#6ee7b7', lineHeight:1.7 }}>{p.recommended_action}</div>
            </div>
          )}

          {/* Response Time Trend */}
          {td.length > 1 && (
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:10, padding:14, marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#60a5fa', marginBottom:10 }}>📈 RESPONSE TIME TREND (last hour)</div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ color:'#475569' }}>
                      <th style={{ textAlign:'left', padding:'4px 8px' }}>Time</th>
                      <th style={{ textAlign:'right', padding:'4px 8px' }}>Avg ms</th>
                      <th style={{ textAlign:'right', padding:'4px 8px' }}>Error%</th>
                      <th style={{ textAlign:'right', padding:'4px 8px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {td.map((t, i) => (
                      <tr key={i} style={{ borderTop:'1px solid #0f172a' }}>
                        <td style={{ padding:'4px 8px', color:'#64748b' }}>{new Date(t.captured_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</td>
                        <td style={{ padding:'4px 8px', textAlign:'right', color: t.avg_response_ms > 2000 ? '#ef4444' : t.avg_response_ms > 1000 ? '#f59e0b' : '#34d399' }}>{t.avg_response_ms}ms</td>
                        <td style={{ padding:'4px 8px', textAlign:'right', color: t.error_rate > 20 ? '#ef4444' : t.error_rate > 5 ? '#f59e0b' : '#34d399' }}>{t.error_rate}%</td>
                        <td style={{ padding:'4px 8px', textAlign:'right', color: t.status === 'UP' ? '#34d399' : '#ef4444' }}>{t.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ fontSize:11, color:'#334155', textAlign:'center' }}>
            Last predicted: {p.predicted_at ? new Date(p.predicted_at).toLocaleString('en-IN') : '—'}
          </div>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🔮</div>
        <div style={{ color:'#64748b' }}>Loading Prediction Engine...</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', color:'#e2e8f0', fontFamily:'Calibri, sans-serif' }}>

      {/* ── NAV ── */}
      <nav style={{ background:'#111827', borderBottom:'1px solid #1f2d45', padding:'0 24px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#2563eb,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⚡</div>
            <span style={{ fontWeight:800, fontSize:18, color:'#e2e8f0' }}>Nex<span style={{ color:'#06b6d4' }}>Desk</span></span>
          </button>
          <span style={{ color:'#334155' }}>›</span>
          <span style={{ color:'#64748b', fontSize:13 }}>🔮 Predictive Incident Prevention</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => setAutoRefresh(a => !a)}
            style={{ padding:'5px 12px', background: autoRefresh ? '#022c22' : '#1f2937', border:`1px solid ${autoRefresh ? '#10b98140' : '#1f2d45'}`, borderRadius:8, color: autoRefresh ? '#34d399' : '#64748b', cursor:'pointer', fontSize:12 }}>
            {autoRefresh ? '🔄 Auto ON' : '⏸ Auto OFF'}
          </button>
          <button onClick={runPrediction} disabled={running}
            style={{ padding:'7px 18px', background: running ? '#1e1b4b' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:8, color:'#fff', cursor: running ? 'not-allowed' : 'pointer', fontSize:13, fontWeight:600, opacity: running ? 0.7 : 1 }}>
            {running ? '⏳ Analyzing...' : '🔮 Run Prediction Now'}
          </button>
          <button onClick={() => router.push('/dashboard')} style={{ padding:'6px 14px', background:'transparent', border:'1px solid #1f2d45', borderRadius:8, color:'#64748b', cursor:'pointer', fontSize:12 }}>← Back</button>
        </div>
      </nav>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 20px' }}>

        {/* ── HEADER ── */}
        <div style={{ marginBottom:24 }}>
          <h1 style={{ margin:0, fontSize:26, fontWeight:800, color:'#e2e8f0' }}>🔮 Predictive Incident Prevention</h1>
          <p style={{ margin:'6px 0 0', color:'#64748b', fontSize:14 }}>
            AI predicts service failures 15-30 minutes before they happen — zero-ticket resolution
          </p>
        </div>

        {/* ── OVERALL RISK BANNER ── */}
        <div style={{ background:RC.bg, border:`2px solid ${RC.border}`, borderRadius:16, padding:'20px 24px', marginBottom:24, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:52, fontWeight:900, color:RC.color, lineHeight:1 }}>{overallRisk}</div>
              <div style={{ fontSize:12, color:RC.color }}>Overall Risk</div>
            </div>
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:RC.color }}>{RC.label}</div>
              <div style={{ fontSize:13, color:'#94a3b8', marginTop:4, maxWidth:500 }}>{lastRun?.prediction_summary || 'Run prediction to get system analysis'}</div>
              {lastRun?.auto_tickets_raised > 0 && (
                <div style={{ marginTop:6, fontSize:12, color:'#f59e0b', fontWeight:600 }}>
                  🚨 {lastRun.auto_tickets_raised} P0 ticket{lastRun.auto_tickets_raised > 1 ? 's' : ''} auto-raised
                </div>
              )}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:12, color:'#475569' }}>Last analyzed</div>
            <div style={{ fontSize:13, color:'#64748b', marginTop:2 }}>
              {lastRun?.ran_at ? new Date(lastRun.ran_at).toLocaleString('en-IN') : '—'}
            </div>
            {accuracy.percentage !== null && accuracy.percentage !== undefined && (
              <div style={{ marginTop:8, fontSize:13, color:'#10b981', fontWeight:600 }}>
                🎯 {accuracy.percentage}% prediction accuracy
              </div>
            )}
          </div>
        </div>

        {msg && (
          <div style={{ padding:'10px 14px', background: msg.startsWith('✅') ? '#022c22' : msg.startsWith('🤖') ? '#1e1b4b' : '#450a0a', border:`1px solid ${msg.startsWith('✅') ? '#10b98140' : msg.startsWith('🤖') ? '#6366f140' : '#ef444440'}`, borderRadius:8, color: msg.startsWith('✅') ? '#34d399' : msg.startsWith('🤖') ? '#a5b4fc' : '#fca5a5', fontSize:13, marginBottom:16 }}>
            {msg}
          </div>
        )}

        {/* ── TABS ── */}
        <div style={{ display:'flex', gap:6, marginBottom:20 }}>
          {[
            { key:'live',     label:'📡 Live Risk Scores'     },
            { key:'history',  label:'📜 Prediction History'   },
            { key:'accuracy', label:'🎯 Accuracy Tracking'    },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding:'8px 16px', borderRadius:10, border:`1px solid ${tab===t.key?'#3b82f640':'#1f2d45'}`, background:tab===t.key?'#1e3a5f':'#0f172a', color:tab===t.key?'#60a5fa':'#64748b', cursor:'pointer', fontSize:13, fontWeight:tab===t.key?700:400 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ TAB: LIVE RISK SCORES ══ */}
        {tab === 'live' && (
          <div>
            {/* Service Cards Grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px,1fr))', gap:14, marginBottom:24 }}>
              {SERVICES.map(svc => {
                const p   = predictions.find(x => x.service === svc)
                const sl  = SERVICE_LABELS[svc]
                const rc  = RISK_CONFIG[p?.risk_level || 'healthy']
                const td  = trends[svc] || []
                const score = p?.risk_score || 0

                return (
                  <div key={svc}
                    onClick={() => setSelected({ p, trendData: td })}
                    style={{ background:'#111827', border:`1px solid ${p?.risk_level && p.risk_level !== 'healthy' ? rc.border : '#1f2d45'}`, borderRadius:14, padding:18, cursor:'pointer', transition:'all 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.borderColor = rc.color + '60'}
                    onMouseOut={e  => e.currentTarget.style.borderColor = p?.risk_level && p.risk_level !== 'healthy' ? rc.border : '#1f2d45'}>

                    {/* Service header */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:38, height:38, borderRadius:10, background:`${rc.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{sl.icon}</div>
                        <div>
                          <div style={{ fontSize:14, fontWeight:700, color:'#e2e8f0' }}>{sl.label}</div>
                          <div style={{ fontSize:11, color:'#475569' }}>{sl.desc}</div>
                        </div>
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:6, background:rc.bg, color:rc.color, border:`1px solid ${rc.border}` }}>
                        {rc.label}
                      </span>
                    </div>

                    {/* Risk bar */}
                    <div style={{ marginBottom:12 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:11, color:'#475569' }}>Risk Score</span>
                        <span style={{ fontSize:11, color:'#475569' }}>Failure Probability: <strong style={{ color:rc.color }}>{p?.failure_probability || 0}%</strong></span>
                      </div>
                      <RiskBar score={score} level={p?.risk_level || 'healthy'} />
                    </div>

                    {/* Sparkline */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:11, color:'#334155', marginBottom:3 }}>Response time trend</div>
                        <Sparkline data={td} color={rc.color} />
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:11, color:'#475569' }}>Trend</div>
                        <div style={{ fontSize:13, fontWeight:600, color: p?.trend_direction === 'degrading' || p?.trend_direction === 'critical' ? '#ef4444' : p?.trend_direction === 'improving' ? '#10b981' : '#60a5fa' }}>
                          {p?.trend_direction === 'degrading' ? '📉 Degrading' :
                           p?.trend_direction === 'critical'  ? '🚨 Critical'  :
                           p?.trend_direction === 'improving' ? '📈 Improving' : '➡️ Stable'}
                        </div>
                      </div>
                    </div>

                    {/* AI reason snippet */}
                    {p?.prediction_reason && (
                      <div style={{ marginTop:10, fontSize:11, color:'#475569', borderTop:'1px solid #1f2937', paddingTop:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        🔬 {p.prediction_reason}
                      </div>
                    )}

                    {p?.auto_ticket_id && (
                      <div style={{ marginTop:6, fontSize:11, color:'#f59e0b', fontWeight:600 }}>
                        🎫 P0 ticket auto-raised
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Info note */}
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:20 }}>💡</span>
              <div>
                <span style={{ fontSize:13, color:'#64748b' }}>
                  <strong style={{ color:'#94a3b8' }}>Auto-refresh every 60s</strong> when enabled.
                  Risk {'>'} 85 → P0 ticket auto-raised + team alerted.
                  Risk {'>'} 60 → Warning notification sent.
                  Click any service card for full trend analysis.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: PREDICTION HISTORY ══ */}
        {tab === 'history' && (
          <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #1f2d45' }}>
              <span style={{ fontSize:14, fontWeight:700 }}>📜 Prediction Run History ({history.length})</span>
            </div>
            {history.length === 0 ? (
              <div style={{ padding:40, textAlign:'center', color:'#334155' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>📜</div>
                <p>No prediction runs yet. Click "Run Prediction Now" to start.</p>
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#0a0e1a' }}>
                    {['Time','Overall Risk','Services at Risk','AI Summary','P0 Tickets'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, color:'#475569', fontWeight:600, borderBottom:'1px solid #1f2d45' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map(r => {
                    const level = r.overall_risk >= 86 ? 'critical' : r.overall_risk >= 61 ? 'warning' : r.overall_risk >= 31 ? 'watch' : 'healthy'
                    const rc2   = RISK_CONFIG[level]
                    return (
                      <tr key={r.id} style={{ borderBottom:'1px solid #0f172a' }}>
                        <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b' }}>{new Date(r.ran_at).toLocaleString('en-IN')}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ fontSize:14, fontWeight:800, color:rc2.color }}>{r.overall_risk}</span>
                          <span style={{ fontSize:11, color:'#475569', marginLeft:6 }}>{rc2.label}</span>
                        </td>
                        <td style={{ padding:'10px 14px', fontSize:13, color: r.services_at_risk > 0 ? '#f59e0b' : '#34d399', fontWeight:600 }}>
                          {r.services_at_risk > 0 ? `⚠️ ${r.services_at_risk} service${r.services_at_risk > 1 ? 's' : ''}` : '✅ All clear'}
                        </td>
                        <td style={{ padding:'10px 14px', fontSize:12, color:'#94a3b8', maxWidth:320, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {r.prediction_summary || '—'}
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          {r.auto_tickets_raised > 0
                            ? <span style={{ fontSize:12, color:'#f59e0b', fontWeight:600 }}>🎫 {r.auto_tickets_raised} raised</span>
                            : <span style={{ fontSize:12, color:'#334155' }}>None</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ══ TAB: ACCURACY ══ */}
        {tab === 'accuracy' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
              {[
                { label:'Total Predictions',  val: accuracy.total || 0,      icon:'🔮', col:'#6366f1' },
                { label:'Correct Predictions', val: accuracy.correct || 0,   icon:'✅', col:'#10b981' },
                { label:'Accuracy Rate',       val: accuracy.percentage !== null && accuracy.percentage !== undefined ? `${accuracy.percentage}%` : 'N/A', icon:'🎯', col:'#f59e0b' },
              ].map((s,i) => (
                <div key={i} style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, padding:20, display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:`${s.col}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize:26, fontWeight:800, color:s.col }}>{s.val}</div>
                    <div style={{ fontSize:12, color:'#475569' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, padding:24, textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>🎯</div>
              <p style={{ color:'#64748b', margin:0 }}>
                Accuracy tracking is populated automatically as predictions are verified against actual incidents.
              </p>
              <p style={{ color:'#334155', fontSize:12, margin:'8px 0 0' }}>
                When a predicted service actually fails, NexDesk marks the prediction as correct.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* ── SERVICE DETAIL PANEL ── */}
      {selected && (
        <ServiceDetail
          p={selected.p}
          trendData={selected.trendData}
          onClose={() => setSelected(null)}
        />
      )}

      <style>{`
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:#0a0e1a; }
        ::-webkit-scrollbar-thumb { background:#1f2d45; border-radius:3px; }
      `}</style>
    </div>
  )
}
