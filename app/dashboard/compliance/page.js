'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'

const ALLOWED = ['ADMIN','IT_MANAGER']

const REPORT_TYPES = [
  { key:'rbi_incident',       icon:'🏦', label:'RBI IT Incident Report',         color:'#ef4444', desc:'RBI Master Direction on IT Framework'         },
  { key:'sebi_cybersecurity', icon:'🔐', label:'SEBI Cybersecurity Report',       color:'#f59e0b', desc:'SEBI Cybersecurity & Cyber Resilience Framework'},
  { key:'internal_audit',     icon:'📋', label:'Internal IT Audit Report',        color:'#6366f1', desc:'Internal management & board reporting'         },
  { key:'sla_summary',        icon:'⏱️',  label:'SLA Compliance Summary',          color:'#10b981', desc:'SLA, RTO/RPO performance report'               },
]

const ACTION_ICONS = {
  created:         '🆕', updated:   '✏️',  assigned:  '👤',
  escalated:       '⬆️',  resolved:  '✅',  closed:    '🔒',
  commented:       '💬', sla_breach:'⚠️',  priority_changed:'🔺',
}

export default function CompliancePage() {
  const router   = useRouter()
  const supabase = createClient()

  const [profile,       setProfile]      = useState(null)
  const [loading,       setLoading]      = useState(true)
  const [tab,           setTab]          = useState('dashboard')
  const [score,         setScore]        = useState(null)
  const [history,       setHistory]      = useState([])
  const [auditLog,      setAuditLog]     = useState([])
  const [slaBreaches,   setSlaBreaches]  = useState([])
  const [reports,       setReports]      = useState([])
  const [generating,    setGenerating]   = useState(false)
  const [selectedReport,setSelectedReport] = useState(null)
  const [msg,           setMsg]          = useState('')
  const [refreshing,    setRefreshing]   = useState(false)

  // Report generation form
  const [form, setForm] = useState({
    report_type: 'rbi_incident',
    period_from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    period_to:   new Date().toISOString().split('T')[0],
  })

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user || !ALLOWED.includes(p?.role)) { router.replace('/dashboard'); return }
    setProfile(p)
    await Promise.all([loadScore(), loadReports()])
    setLoading(false)
  }

  async function loadScore() {
    setRefreshing(true)
    const res  = await fetch('/api/compliance-score')
    const data = await res.json()
    if (data.success) {
      setScore(data.score)
      setHistory(data.history || [])
      setAuditLog(data.recent_audit || [])
      setSlaBreaches(data.sla_breach_tickets || [])
    }
    setRefreshing(false)
  }

  async function loadReports() {
    try {
      const res  = await fetch('/api/generate-report')
      const data = await res.json()
      if (data.reports) setReports(data.reports)
    } catch(e) {
      console.error('loadReports error:', e)
    }
  }

  async function generateReport() {
    setGenerating(true)
    setMsg('🤖 AI is generating your compliance report...')
    try {
      const res  = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, generated_by: profile?.id }),
      })
      const data = await res.json()
      if (data.success) {
        setMsg('✅ Report generated successfully!')
        // Wait briefly for DB write to settle, then reload
        await new Promise(r => setTimeout(r, 800))
        await loadReports()
        if (data.report) setSelectedReport(data.report)
        setTab('reports')
      } else {
        setMsg('❌ ' + (data.error || 'Generation failed'))
      }
    } catch(e) { setMsg('❌ ' + e.message) }
    setGenerating(false)
    setTimeout(() => setMsg(''), 5000)
  }

  // Score color helpers
  const scoreColor  = (s) => s >= 90 ? '#10b981' : s >= 75 ? '#f59e0b' : '#ef4444'
  const scoreBg     = (s) => s >= 90 ? '#022c22' : s >= 75 ? '#1c1000' : '#1c0000'
  const scoreBorder = (s) => s >= 90 ? '#10b98140' : s >= 75 ? '#f59e0b40' : '#ef444440'
  const scoreLabel  = (s) => s >= 90 ? '✅ Compliant' : s >= 75 ? '⚠️ Needs Attention' : '❌ Non-Compliant'

  const METRICS = score ? [
    { label:'SLA Compliance',       val: score.sla_compliance_pct,    icon:'⏱️',  target: 99 },
    { label:'Documentation',        val: score.documentation_pct,     icon:'📝',  target: 100 },
    { label:'RTO Adherence',        val: score.rto_adherence_pct,     icon:'🎯',  target: 95 },
    { label:'Audit Trail',          val: score.audit_trail_pct,       icon:'🔍',  target: 100 },
    { label:'RCA Completion',       val: score.rca_completion_pct,    icon:'🔬',  target: 100 },
    { label:'Critical Resolved',    val: score.critical_resolved_pct, icon:'🚨',  target: 100 },
  ] : []

  // ── Print / Export helper ─────────────────────────────────────
  function exportReport(report) {
    const content = report.content || {}
    const lines   = []
    lines.push(`${'═'.repeat(60)}`)
    lines.push(report.report_title)
    lines.push(`Generated: ${new Date(report.created_at).toLocaleString('en-IN')}`)
    lines.push(`${'═'.repeat(60)}\n`)
    lines.push('EXECUTIVE SUMMARY')
    lines.push('-'.repeat(40))
    lines.push(report.ai_summary || '')
    lines.push('')
    lines.push('KEY METRICS')
    lines.push('-'.repeat(40))
    lines.push(`Total Incidents  : ${report.total_incidents}`)
    lines.push(`Critical         : ${report.critical_count}`)
    lines.push(`SLA Breaches     : ${report.sla_breaches}`)
    lines.push(`Compliance Score : ${report.compliance_score}/100`)
    lines.push('')

    // Section content
    Object.values(content).forEach(section => {
      if (typeof section === 'object' && section?.title) {
        lines.push(section.title)
        lines.push('-'.repeat(40))
        lines.push(JSON.stringify(section, null, 2))
        lines.push('')
      }
    })

    const blob = new Blob([lines.join('\n')], { type:'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${report.report_title.replace(/[^a-zA-Z0-9]/g,'_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
        <div style={{ color:'#64748b' }}>Loading Compliance Engine...</div>
      </div>
    </div>
  )

  const C = {
    page: { minHeight:'100vh', background:'#0a0e1a', color:'#e2e8f0', fontFamily:'Calibri, sans-serif' },
    card: { background:'#111827', border:'1px solid #1f2d45', borderRadius:14 },
  }

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
          <span style={{ color:'#64748b', fontSize:13 }}>📋 Regulatory Compliance Engine</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={loadScore} disabled={refreshing}
            style={{ padding:'6px 14px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:8, color:'#64748b', cursor:'pointer', fontSize:12 }}>
            {refreshing ? '⏳' : '🔄'} Refresh Score
          </button>
          <button onClick={() => router.push('/dashboard')}
            style={{ padding:'6px 14px', background:'transparent', border:'1px solid #1f2d45', borderRadius:8, color:'#64748b', cursor:'pointer', fontSize:12 }}>
            ← Back
          </button>
        </div>
      </nav>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 20px' }}>

        {/* ── HEADER ── */}
        <div style={{ marginBottom:24 }}>
          <h1 style={{ margin:0, fontSize:26, fontWeight:800 }}>📋 Regulatory Compliance Engine</h1>
          <p style={{ margin:'6px 0 0', color:'#64748b', fontSize:14 }}>
            RBI & SEBI compliant reports auto-generated from ticket data — one click, audit-ready
          </p>
        </div>

        {/* ── COMPLIANCE SCORE HERO ── */}
        {score && (
          <div style={{ background: scoreBg(score.overall_score), border:`2px solid ${scoreBorder(score.overall_score)}`, borderRadius:16, padding:'24px 28px', marginBottom:24, display:'flex', alignItems:'center', gap:32 }}>
            {/* Big score */}
            <div style={{ textAlign:'center', minWidth:120 }}>
              <div style={{ fontSize:64, fontWeight:900, color: scoreColor(score.overall_score), lineHeight:1 }}>{score.overall_score}</div>
              <div style={{ fontSize:12, color: scoreColor(score.overall_score), marginTop:2 }}>/ 100</div>
              <div style={{ fontSize:13, fontWeight:700, color: scoreColor(score.overall_score), marginTop:6 }}>{scoreLabel(score.overall_score)}</div>
            </div>

            {/* Score ring visual */}
            <div style={{ flex:1 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                {METRICS.map((m,i) => {
                  const pct  = Math.round(m.val || 0)
                  const col  = pct >= m.target * 0.95 ? '#10b981' : pct >= m.target * 0.8 ? '#f59e0b' : '#ef4444'
                  return (
                    <div key={i} style={{ background:'#0a0e1a', borderRadius:10, padding:'10px 14px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:12, color:'#94a3b8' }}>{m.icon} {m.label}</span>
                        <span style={{ fontSize:13, fontWeight:800, color:col }}>{pct}%</span>
                      </div>
                      <div style={{ height:5, background:'#1f2d45', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:`${pct}%`, height:'100%', background:col, borderRadius:3, transition:'width 1s ease' }}/>
                      </div>
                      <div style={{ fontSize:10, color:'#334155', marginTop:3 }}>Target: {m.target}%</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Alert counts */}
            <div style={{ display:'flex', flexDirection:'column', gap:10, minWidth:160 }}>
              {[
                { label:'Open Critical',        val: score.open_critical,         col:'#ef4444', icon:'🚨' },
                { label:'SLA Breaches (30d)',    val: score.sla_breaches_today,    col:'#f59e0b', icon:'⚠️' },
                { label:'Tickets Without RCA',   val: score.tickets_without_rca,   col:'#f97316', icon:'🔬' },
              ].map((a,i) => (
                <div key={i} style={{ background:'#0a0e1a', borderRadius:8, padding:'8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>{a.icon} {a.label}</span>
                  <span style={{ fontSize:16, fontWeight:800, color: a.val > 0 ? a.col : '#10b981' }}>{a.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {msg && (
          <div style={{ padding:'10px 14px', background: msg.startsWith('✅') ? '#022c22' : msg.startsWith('🤖') ? '#1e1b4b' : '#450a0a', border:`1px solid ${msg.startsWith('✅') ? '#10b98140' : msg.startsWith('🤖') ? '#6366f140' : '#ef444440'}`, borderRadius:8, color: msg.startsWith('✅') ? '#34d399' : msg.startsWith('🤖') ? '#a5b4fc' : '#fca5a5', fontSize:13, marginBottom:16 }}>
            {msg}
          </div>
        )}

        {/* ── TABS ── */}
        <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
          {[
            { key:'dashboard', label:'📊 Dashboard'         },
            { key:'generate',  label:'⚡ Generate Report'    },
            { key:'reports',   label:`📁 Reports (${reports.length})`},
            { key:'audit',     label:'🔍 Audit Trail'       },
            { key:'sla',       label:`⚠️ SLA Breaches (${slaBreaches.length})`},
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding:'8px 16px', borderRadius:10, border:`1px solid ${tab===t.key?'#3b82f640':'#1f2d45'}`, background:tab===t.key?'#1e3a5f':'#0f172a', color:tab===t.key?'#60a5fa':'#64748b', cursor:'pointer', fontSize:13, fontWeight:tab===t.key?700:400 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ TAB: DASHBOARD ══ */}
        {tab === 'dashboard' && (
          <div>
            {/* Score History Chart */}
            {history.length > 1 && (
              <div style={{ ...C.card, padding:20, marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:14, color:'#94a3b8' }}>📈 Compliance Score — Last 30 Days</div>
                <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:80 }}>
                  {history.map((h,i) => {
                    const col = h.overall_score >= 90 ? '#10b981' : h.overall_score >= 75 ? '#f59e0b' : '#ef4444'
                    return (
                      <div key={i} title={`${h.score_date}: ${h.overall_score}`}
                        style={{ flex:1, background:col, height:`${h.overall_score}%`, borderRadius:'2px 2px 0 0', minWidth:4, opacity:0.7, transition:'opacity 0.2s', cursor:'default' }}
                        onMouseOver={e => e.target.style.opacity=1}
                        onMouseOut={e  => e.target.style.opacity=0.7}/>
                    )
                  })}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                  <span style={{ fontSize:10, color:'#334155' }}>{history[0]?.score_date}</span>
                  <span style={{ fontSize:10, color:'#334155' }}>{history[history.length-1]?.score_date}</span>
                </div>
              </div>
            )}

            {/* Regulator status cards */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
              {[
                { reg:'RBI', framework:'IT Framework (2021)', score: score ? Math.round((score.sla_compliance_pct + score.rto_adherence_pct + score.audit_trail_pct) / 3) : 0, icon:'🏦', col:'#ef4444' },
                { reg:'SEBI', framework:'CSCRF 2023',          score: score ? Math.round((score.rca_completion_pct + score.documentation_pct + score.critical_resolved_pct) / 3) : 0, icon:'🔐', col:'#f59e0b' },
              ].map((r,i) => (
                <div key={i} style={{ ...C.card, padding:20 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                    <div>
                      <div style={{ fontSize:18, fontWeight:800, color:'#e2e8f0' }}>{r.icon} {r.reg} Compliance</div>
                      <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>{r.framework}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:32, fontWeight:900, color: scoreColor(r.score) }}>{r.score}</div>
                      <div style={{ fontSize:10, color: scoreColor(r.score) }}>/ 100</div>
                    </div>
                  </div>
                  <div style={{ height:6, background:'#1f2d45', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ width:`${r.score}%`, height:'100%', background: scoreColor(r.score), borderRadius:3 }}/>
                  </div>
                  <div style={{ marginTop:10 }}>
                    <button onClick={() => { setForm(f => ({ ...f, report_type: r.reg === 'RBI' ? 'rbi_incident' : 'sebi_cybersecurity' })); setTab('generate') }}
                      style={{ padding:'6px 14px', background:'#1e3a5f', border:'1px solid #3b82f640', borderRadius:8, color:'#60a5fa', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                      Generate {r.reg} Report →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent reports */}
            {reports.length > 0 && (
              <div style={{ ...C.card, overflow:'hidden' }}>
                <div style={{ padding:'12px 20px', borderBottom:'1px solid #1f2d45' }}>
                  <span style={{ fontSize:13, fontWeight:700 }}>📁 Recent Reports</span>
                </div>
                {reports.slice(0,5).map(r => (
                  <div key={r.id} onClick={() => { setSelectedReport(r); setTab('reports') }}
                    style={{ padding:'12px 20px', borderBottom:'1px solid #0f172a', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}
                    onMouseOver={e => e.currentTarget.style.background='#0f172a'}
                    onMouseOut={e  => e.currentTarget.style.background='transparent'}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{r.report_title}</div>
                      <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>{r.period_from} → {r.period_to} · {r.total_incidents} incidents</div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <span style={{ fontSize:12, fontWeight:700, color: scoreColor(r.compliance_score) }}>{r.compliance_score}/100</span>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:5, background: r.status === 'final' ? '#022c22' : '#1f2937', color: r.status === 'final' ? '#34d399' : '#64748b' }}>{r.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: GENERATE REPORT ══ */}
        {tab === 'generate' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            {/* Form */}
            <div>
              <div style={{ ...C.card, padding:24 }}>
                <div style={{ fontSize:15, fontWeight:800, marginBottom:20 }}>⚡ Generate New Report</div>

                {/* Report Type */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:12, color:'#64748b', marginBottom:10, fontWeight:600 }}>REPORT TYPE</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {REPORT_TYPES.map(rt => (
                      <label key={rt.key} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background: form.report_type === rt.key ? '#1e3a5f' : '#0f172a', border:`1px solid ${form.report_type === rt.key ? '#3b82f640' : '#1f2d45'}`, borderRadius:10, cursor:'pointer' }}>
                        <input type="radio" name="report_type" value={rt.key} checked={form.report_type === rt.key}
                          onChange={e => setForm(f => ({ ...f, report_type: e.target.value }))}
                          style={{ accentColor:rt.color }}/>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color: form.report_type === rt.key ? '#e2e8f0' : '#94a3b8' }}>{rt.icon} {rt.label}</div>
                          <div style={{ fontSize:11, color:'#475569' }}>{rt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Period */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
                  {[
                    { label:'Period From', key:'period_from' },
                    { label:'Period To',   key:'period_to'   },
                  ].map(f => (
                    <div key={f.key}>
                      <div style={{ fontSize:11, color:'#64748b', marginBottom:6, fontWeight:600 }}>{f.label}</div>
                      <input type="date" value={form[f.key]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        style={{ width:'100%', padding:'9px 12px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:8, color:'#e2e8f0', fontSize:13, fontFamily:'Calibri, sans-serif' }}/>
                    </div>
                  ))}
                </div>

                {/* Quick period buttons */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, color:'#64748b', marginBottom:8, fontWeight:600 }}>QUICK SELECT</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {[
                      { label:'This Month',  fn: () => {
                        const n = new Date(); const f = new Date(n.getFullYear(), n.getMonth(), 1)
                        setForm(p => ({ ...p, period_from: f.toISOString().split('T')[0], period_to: n.toISOString().split('T')[0] }))
                      }},
                      { label:'Last Month',  fn: () => {
                        const n = new Date(); const f = new Date(n.getFullYear(), n.getMonth()-1, 1); const t = new Date(n.getFullYear(), n.getMonth(), 0)
                        setForm(p => ({ ...p, period_from: f.toISOString().split('T')[0], period_to: t.toISOString().split('T')[0] }))
                      }},
                      { label:'Last 30 Days', fn: () => {
                        const n = new Date(); const f = new Date(n - 30*24*60*60*1000)
                        setForm(p => ({ ...p, period_from: f.toISOString().split('T')[0], period_to: n.toISOString().split('T')[0] }))
                      }},
                      { label:'Last Quarter', fn: () => {
                        const n = new Date(); const f = new Date(n - 90*24*60*60*1000)
                        setForm(p => ({ ...p, period_from: f.toISOString().split('T')[0], period_to: n.toISOString().split('T')[0] }))
                      }},
                    ].map((b,i) => (
                      <button key={i} onClick={b.fn}
                        style={{ padding:'5px 12px', background:'#1f2937', border:'1px solid #1f2d45', borderRadius:7, color:'#94a3b8', cursor:'pointer', fontSize:12 }}>
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={generateReport} disabled={generating}
                  style={{ width:'100%', padding:'13px', background: generating ? '#1e1b4b' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:10, color:'#fff', cursor: generating ? 'not-allowed' : 'pointer', fontSize:14, fontWeight:700, opacity: generating ? 0.7 : 1 }}>
                  {generating ? '⏳ Generating...' : '⚡ Generate Report with AI'}
                </button>
              </div>
            </div>

            {/* What's included */}
            <div>
              <div style={{ ...C.card, padding:24 }}>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:16, color:'#94a3b8' }}>📑 What's included in each report</div>
                {REPORT_TYPES.map(rt => (
                  <div key={rt.key} style={{ marginBottom:16, opacity: form.report_type === rt.key ? 1 : 0.5 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:rt.color, marginBottom:6 }}>{rt.icon} {rt.label}</div>
                    <div style={{ fontSize:12, color:'#64748b', lineHeight:1.7 }}>
                      {rt.key === 'rbi_incident' && '• Incident classification (Cat A/B/C)\n• Detection & resolution times\n• RTO/RPO compliance per priority\n• Root cause & corrective actions\n• Audit trail summary\n• AI executive summary'}
                      {rt.key === 'sebi_cybersecurity' && '• Cybersecurity incident count by type\n• Critical incident details with RCA\n• Preventive measures implemented\n• SLA compliance metrics\n• AI threat pattern analysis\n• AI executive summary'}
                      {rt.key === 'internal_audit' && '• Full ticket metrics & breakdown\n• SLA breach log with ticket refs\n• Unresolved ticket aging report\n• Complete audit action trail\n• AI executive summary'}
                      {rt.key === 'sla_summary' && '• SLA compliance % by priority\n• RTO target vs actual per ticket\n• SLA breach details with over-by\n• Trend analysis last 30 days\n• AI executive summary'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: REPORTS ══ */}
        {tab === 'reports' && (
          <div style={{ display:'grid', gridTemplateColumns: selectedReport ? '1fr 1.5fr' : '1fr', gap:20 }}>
            {/* Reports list */}
            <div style={{ ...C.card, overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid #1f2d45' }}>
                <span style={{ fontSize:14, fontWeight:700 }}>📁 All Reports ({reports.length})</span>
              </div>
              {reports.length === 0 ? (
                <div style={{ padding:40, textAlign:'center', color:'#334155' }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>📁</div>
                  <p>No reports yet. Generate your first report in the Generate tab.</p>
                </div>
              ) : reports.map(r => {
                const rt = REPORT_TYPES.find(x => x.key === r.report_type)
                return (
                  <div key={r.id} onClick={() => setSelectedReport(r)}
                    style={{ padding:'14px 20px', borderBottom:'1px solid #0f172a', cursor:'pointer', background: selectedReport?.id === r.id ? '#0f172a' : 'transparent' }}
                    onMouseOver={e => { if (selectedReport?.id !== r.id) e.currentTarget.style.background='#0a0e1a' }}
                    onMouseOut={e  => { if (selectedReport?.id !== r.id) e.currentTarget.style.background='transparent' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:700, color: rt?.color || '#94a3b8' }}>{rt?.icon} {rt?.label || r.report_type}</span>
                      <span style={{ fontSize:12, fontWeight:700, color: scoreColor(r.compliance_score) }}>{r.compliance_score}/100</span>
                    </div>
                    <div style={{ fontSize:11, color:'#475569' }}>{r.period_from} → {r.period_to}</div>
                    <div style={{ fontSize:11, color:'#334155', marginTop:2 }}>{r.total_incidents} incidents · {r.critical_count} critical · {r.sla_breaches} SLA breaches</div>
                    <div style={{ fontSize:11, color:'#1f2d45', marginTop:2 }}>{new Date(r.created_at).toLocaleString('en-IN')}</div>
                  </div>
                )
              })}
            </div>

            {/* Report detail */}
            {selectedReport && (
              <div style={{ ...C.card, overflow:'hidden' }}>
                <div style={{ padding:'14px 20px', borderBottom:'1px solid #1f2d45', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:14, fontWeight:700 }}>{selectedReport.report_title}</span>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => exportReport(selectedReport)}
                      style={{ padding:'6px 14px', background:'#022c22', border:'1px solid #10b98140', borderRadius:8, color:'#34d399', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                      ⬇️ Export
                    </button>
                    <button onClick={() => setSelectedReport(null)}
                      style={{ padding:'6px 12px', background:'#1f2937', border:'none', borderRadius:8, color:'#64748b', cursor:'pointer' }}>✕</button>
                  </div>
                </div>
                <div style={{ padding:20, overflowY:'auto', maxHeight:'70vh' }}>
                  {/* Executive Summary */}
                  <div style={{ background:'#1e3a5f', border:'1px solid #3b82f640', borderRadius:10, padding:16, marginBottom:16 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#60a5fa', marginBottom:6 }}>📝 AI EXECUTIVE SUMMARY</div>
                    <p style={{ margin:0, fontSize:13, color:'#e2e8f0', lineHeight:1.8 }}>{selectedReport.ai_summary}</p>
                  </div>

                  {/* Key metrics */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:16 }}>
                    {[
                      { label:'Total Incidents',  val: selectedReport.total_incidents  },
                      { label:'Critical',          val: selectedReport.critical_count,  col:'#ef4444' },
                      { label:'SLA Breaches',      val: selectedReport.sla_breaches,    col: selectedReport.sla_breaches > 0 ? '#f59e0b' : '#10b981' },
                      { label:'Compliance Score',  val: `${selectedReport.compliance_score}/100`, col: scoreColor(selectedReport.compliance_score) },
                    ].map((m,i) => (
                      <div key={i} style={{ background:'#0f172a', borderRadius:8, padding:'10px 14px' }}>
                        <div style={{ fontSize:11, color:'#475569' }}>{m.label}</div>
                        <div style={{ fontSize:18, fontWeight:800, color: m.col || '#e2e8f0' }}>{m.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Sections */}
                  {selectedReport.content && Object.entries(selectedReport.content)
                    .filter(([k,v]) => typeof v === 'object' && v?.title)
                    .map(([k, section]) => (
                      <div key={k} style={{ marginBottom:14 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#94a3b8', marginBottom:8, padding:'6px 0', borderBottom:'1px solid #1f2d45' }}>{section.title}</div>
                        <div style={{ background:'#0f172a', borderRadius:8, padding:12 }}>
                          {Object.entries(section)
                            .filter(([key]) => key !== 'title')
                            .map(([key, val]) => (
                              <div key={key} style={{ marginBottom:6 }}>
                                <span style={{ fontSize:11, color:'#475569', textTransform:'capitalize' }}>{key.replace(/_/g,' ')}: </span>
                                {typeof val === 'object'
                                  ? <pre style={{ margin:'4px 0 0', fontSize:11, color:'#64748b', overflowX:'auto', whiteSpace:'pre-wrap', background:'#111827', padding:8, borderRadius:6 }}>{JSON.stringify(val, null, 2)}</pre>
                                  : <span style={{ fontSize:12, color:'#94a3b8' }}>{String(val)}</span>
                                }
                              </div>
                            ))}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: AUDIT TRAIL ══ */}
        {tab === 'audit' && (
          <div style={{ ...C.card, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #1f2d45', display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:14, fontWeight:700 }}>🔍 Audit Trail — Recent Actions</span>
              <span style={{ fontSize:11, color:'#334155' }}>Every ticket action logged with WHO + WHEN + WHAT</span>
            </div>
            {auditLog.length === 0 ? (
              <div style={{ padding:40, textAlign:'center', color:'#334155' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>🔍</div>
                <p>No audit entries yet. Actions are logged automatically as tickets are updated.</p>
                <p style={{ fontSize:12 }}>Call <code style={{ background:'#0f172a', padding:'2px 6px', borderRadius:4 }}>POST /api/audit-trail</code> from your ticket update handlers.</p>
              </div>
            ) : (
              <div>
                {auditLog.map((entry, i) => (
                  <div key={entry.id || i} style={{ padding:'12px 20px', borderBottom:'1px solid #0f172a', display:'flex', gap:14, alignItems:'flex-start' }}>
                    <div style={{ fontSize:20, minWidth:28, textAlign:'center' }}>{ACTION_ICONS[entry.action_type] || '📌'}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                        <div>
                          <span style={{ fontSize:12, color:'#06b6d4', fontWeight:700, marginRight:8 }}>{entry.ticket_number || entry.tickets?.ticket_number || '—'}</span>
                          <span style={{ fontSize:13, color:'#e2e8f0', fontWeight:600, textTransform:'capitalize' }}>{entry.action_type?.replace(/_/g,' ')}</span>
                        </div>
                        <span style={{ fontSize:11, color:'#334155' }}>{new Date(entry.action_at).toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ fontSize:12, color:'#64748b' }}>
                        By: <strong style={{ color:'#94a3b8' }}>{entry.action_by_name || 'System'}</strong>
                        {entry.action_by_role && <span style={{ color:'#475569' }}> [{entry.action_by_role}]</span>}
                        {entry.field_changed && <span> · {entry.field_changed}: <span style={{ color:'#ef4444' }}>{entry.old_value}</span> → <span style={{ color:'#10b981' }}>{entry.new_value}</span></span>}
                      </div>
                      {entry.notes && <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>{entry.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: SLA BREACHES ══ */}
        {tab === 'sla' && (
          <div style={{ ...C.card, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #1f2d45' }}>
              <span style={{ fontSize:14, fontWeight:700 }}>⚠️ Open SLA Breach Tickets ({slaBreaches.length})</span>
            </div>
            {slaBreaches.length === 0 ? (
              <div style={{ padding:40, textAlign:'center', color:'#334155' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>✅</div>
                <p>No open SLA breaches! Great compliance standing.</p>
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#0a0e1a' }}>
                    {['Ticket','Title','Priority','Status','Assigned To','Age','Action'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, color:'#475569', fontWeight:600, borderBottom:'1px solid #1f2d45' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slaBreaches.map(t => {
                    const ageHrs = Math.round((new Date() - new Date(t.created_at)) / (1000 * 60 * 60))
                    return (
                      <tr key={t.id} style={{ borderBottom:'1px solid #0f172a' }}>
                        <td style={{ padding:'10px 14px', fontSize:12, color:'#60a5fa', fontWeight:700 }}>{t.ticket_number}</td>
                        <td style={{ padding:'10px 14px', fontSize:12, color:'#e2e8f0', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:5, fontWeight:600,
                            background: t.priority==='critical'?'#1c0000':t.priority==='high'?'#1c0a00':'#111',
                            color: t.priority==='critical'?'#ef4444':t.priority==='high'?'#f97316':'#f59e0b' }}>
                            {t.priority}
                          </span>
                        </td>
                        <td style={{ padding:'10px 14px', fontSize:12, color:'#94a3b8' }}>{t.status}</td>
                        <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b' }}>{t.assigned_team || '—'}</td>
                        <td style={{ padding:'10px 14px', fontSize:12, color: ageHrs > 48 ? '#ef4444' : '#f59e0b', fontWeight:600 }}>{ageHrs}h</td>
                        <td style={{ padding:'10px 14px' }}>
                          <button onClick={() => router.push(`/tickets/${t.id}`)}
                            style={{ padding:'4px 10px', background:'#1e3a5f', border:'1px solid #3b82f640', borderRadius:7, color:'#60a5fa', cursor:'pointer', fontSize:11 }}>
                            View →
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>

      <style>{`
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:#0a0e1a; }
        ::-webkit-scrollbar-thumb { background:#1f2d45; border-radius:3px; }
        pre { font-family: 'Courier New', monospace; }
      `}</style>
    </div>
  )
}

