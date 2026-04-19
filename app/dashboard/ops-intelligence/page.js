'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

const HEALTH_C = { improving:'#16a34a', stable:'#2563eb', declining:'#d97706', critical:'#dc2626' }
const RISK_C = { low:'#16a34a', medium:'#d97706', high:'#dc2626', critical:'#dc2626', unknown:'#9ca3af' }
const VENDOR_C = { healthy:'#16a34a', degraded:'#d97706', down:'#dc2626', unknown:'#9ca3af' }
const SHIFT_L = { morning:'🌅 Morning', evening:'🌆 Evening', night:'🌙 Night' }

export default function OpsIntelligenceDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  // Data
  const [stats, setStats] = useState({})
  const [proposals, setProposals] = useState([])
  const [healthScores, setHealthScores] = useState([])
  const [handovers, setHandovers] = useState([])
  const [vendors, setVendors] = useState([])
  const [vendorIncidents, setVendorIncidents] = useState([])

  // Forms
  const [slaClient, setSlaClient] = useState('')
  const [slaIndustry, setSlaIndustry] = useState('BFSI')
  const [genLoading, setGenLoading] = useState('')
  const [shiftFrom, setShiftFrom] = useState('morning')
  const [shiftTo, setShiftTo] = useState('evening')
  const [selectedProposal, setSelectedProposal] = useState(null)
  const [selectedHandover, setSelectedHandover] = useState(null)

  // Vendor form
  const [vName, setVName] = useState('')
  const [vUrl, setVUrl] = useState('')
  const [vType, setVType] = useState('cloud')
  const [vUptime, setVUptime] = useState('99.9')

  useEffect(() => { init() }, [])

  async function init() {
    const { user } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    await loadAll()
    setLoading(false)
  }

  async function loadAll() {
    const [statsR, slaR, healthR, hoR, vendorsR, incR] = await Promise.all([
      fetch('/api/ops-intelligence?type=stats').then(r => r.json()),
      fetch('/api/ops-intelligence?type=sla_proposals').then(r => r.json()),
      fetch('/api/ops-intelligence?type=health_scores').then(r => r.json()),
      fetch('/api/ops-intelligence?type=handovers').then(r => r.json()),
      fetch('/api/ops-intelligence?type=vendors').then(r => r.json()),
      fetch('/api/ops-intelligence?type=vendor_incidents').then(r => r.json()),
    ])
    setStats(statsR.stats || {})
    setProposals(slaR.proposals || [])
    setHealthScores(healthR.scores || [])
    setHandovers(hoR.handovers || [])
    setVendors(vendorsR.vendors || [])
    setVendorIncidents(incR.incidents || [])
  }

  async function generateSLA() {
    if (!slaClient.trim()) return
    setGenLoading('sla')
    try {
      await fetch('/api/ops-intelligence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_sla', client_name: slaClient, industry: slaIndustry }),
      })
      await loadAll(); setSlaClient('')
    } catch (e) { /* ignore */ }
    setGenLoading('')
  }

  async function calcHealth() {
    setGenLoading('health')
    try {
      await fetch('/api/ops-intelligence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'calculate_health' }),
      })
      await loadAll()
    } catch (e) { /* ignore */ }
    setGenLoading('')
  }

  async function genHandover() {
    setGenLoading('handover')
    try {
      await fetch('/api/ops-intelligence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_handover', shift_from: shiftFrom, shift_to: shiftTo }),
      })
      await loadAll()
    } catch (e) { /* ignore */ }
    setGenLoading('')
  }

  async function addVendor() {
    if (!vName.trim()) return
    setGenLoading('vendor')
    try {
      await fetch('/api/ops-intelligence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_vendor', vendor_name: vName, vendor_type: vType, health_check_url: vUrl, guaranteed_uptime: parseFloat(vUptime) }),
      })
      await loadAll(); setVName(''); setVUrl('')
    } catch (e) { /* ignore */ }
    setGenLoading('')
  }

  async function checkVendor(id) {
    setGenLoading('check_' + id)
    try {
      await fetch('/api/ops-intelligence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_vendor', vendor_id: id }),
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
    btn: (c='#2563eb') => ({ padding:'10px 20px', background:c, border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', transition:'all 0.15s' }),
    btnO: { padding:'8px 14px', background:'transparent', border:'1px solid #e5e7eb', borderRadius:8, color:'#374151', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:'inherit' },
    select: { padding:'10px 14px', background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', color:'#111827' },
  }

  if (loading) return (
    <div style={S.page}><GlobalNav title="Ops Intelligence" />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'80vh' }}>
        <div style={{ textAlign:'center' }}><div style={{ fontSize:48, marginBottom:12 }}>⚙️</div>
        <div style={{ color:'#6b7280', fontSize:14 }}>Loading Operations Intelligence...</div></div>
      </div></div>
  )

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        * { box-sizing:border-box; }
        .op-tab { padding:8px 16px; border-radius:8px; font-size:13px; font-weight:500; cursor:pointer; border:1px solid #e5e7eb; background:#fff; color:#6b7280; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .op-tab:hover { border-color:#d1d5db; color:#374151; }
        .op-tab.active { background:#eff6ff; color:#2563eb; border-color:#bfdbfe; font-weight:600; }
        .op-btn:hover { filter:brightness(0.9); transform:translateY(-1px); }
      `}</style>

      <GlobalNav title="Operations Intelligence Hub" />

      <div style={{ maxWidth:1400, margin:'0 auto', padding:'28px 24px' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>⚙️ Operations Intelligence Hub</h1>
            <p style={{ color:'#6b7280', fontSize:13, margin:'4px 0 0' }}>P18-22 — SLA Negotiator · Client Health · Shift Handover · Vendor SLA Tracker</p>
          </div>
          <button style={S.btnO} onClick={loadAll}>↻ Refresh</button>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:24 }}>
          {[
            { icon:'📋', label:'SLA Proposals', val:stats.sla_proposals||0, c:'#7c3aed' },
            { icon:'💚', label:'Health Score', val:stats.health_score||0, c:(stats.health_score||0)>70?'#16a34a':(stats.health_score||0)>40?'#d97706':'#dc2626' },
            { icon:'🔄', label:'Shift Handovers', val:stats.handovers||0, c:'#2563eb' },
            { icon:'🏢', label:'Vendors Tracked', val:stats.vendors||0, c:'#059669' },
            { icon:'🔴', label:'Vendors Down', val:stats.vendors_down||0, c:(stats.vendors_down||0)>0?'#dc2626':'#16a34a' },
            { icon:'📊', label:'Avg Uptime', val:`${stats.avg_uptime||100}%`, c:(stats.avg_uptime||100)>99.5?'#16a34a':'#dc2626' },
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
            { key:'sla', label:`💼 SLA Negotiator (${proposals.length})` },
            { key:'health', label:'💚 Client Health' },
            { key:'handover', label:`🔄 Shift Handover (${handovers.length})` },
            { key:'vendors', label:`🏢 Vendor Tracker (${vendors.length})` },
          ].map(t => (
            <button key={t.key} className={`op-tab${tab===t.key?' active':''}`} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        {/* ═══ OVERVIEW ═══ */}
        {tab === 'overview' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {/* Quick Actions */}
            <div style={{ ...S.card, padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 16px' }}>⚡ Quick Actions</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <button style={S.btn('#7c3aed')} className="op-btn" onClick={() => setTab('sla')}>💼 Generate SLA Proposal</button>
                <button style={S.btn('#059669')} className="op-btn" onClick={() => { calcHealth(); setTab('health') }}>💚 Calculate Client Health</button>
                <button style={S.btn('#2563eb')} className="op-btn" onClick={() => setTab('handover')}>🔄 Generate Shift Handover</button>
                <button style={S.btn('#dc2626')} className="op-btn" onClick={() => setTab('vendors')}>🏢 Check All Vendors</button>
              </div>
            </div>
            {/* Recent Activity */}
            <div style={{ ...S.card, padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 16px' }}>📊 System Status</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ padding:12, background:'#f0fdf4', borderRadius:10, border:'1px solid #bbf7d0' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#059669' }}>Churn Risk</div>
                  <div style={{ fontSize:20, fontWeight:800, color:RISK_C[stats.churn_risk||'unknown'] }}>{(stats.churn_risk||'unknown').toUpperCase()}</div>
                </div>
                <div style={{ padding:12, background:'#eff6ff', borderRadius:10, border:'1px solid #bfdbfe' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#2563eb' }}>Vendor Health</div>
                  <div style={{ fontSize:14, fontWeight:600, color:'#374151' }}>{(stats.vendors||0) - (stats.vendors_down||0)}/{stats.vendors||0} healthy · {stats.total_vendor_incidents||0} incidents</div>
                </div>
                <div style={{ padding:12, background:'#f5f3ff', borderRadius:10, border:'1px solid #c4b5fd' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#7c3aed' }}>Last Handover</div>
                  <div style={{ fontSize:14, fontWeight:600, color:'#374151' }}>{handovers[0]?.handover_number || 'None yet'} {handovers[0] ? `(${handovers[0].shift_from} → ${handovers[0].shift_to})` : ''}</div>
                </div>
              </div>
            </div>
            {/* Vendor Quick Status */}
            <div style={{ ...S.card, padding:20, gridColumn:'1/3' }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 16px' }}>🏢 Vendor Status Board</h3>
              {vendors.length === 0 ? (
                <div style={{ padding:20, textAlign:'center', color:'#9ca3af', fontSize:13 }}>No vendors configured yet. Add vendors in the Vendor Tracker tab.</div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                  {vendors.map(v => (
                    <div key={v.id} style={{ padding:14, borderRadius:10, border:`1px solid ${VENDOR_C[v.current_status]||'#e5e7eb'}30`, background:VENDOR_C[v.current_status]+'08' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                        <span style={{ fontSize:13, fontWeight:700 }}>{v.vendor_name}</span>
                        <span style={S.badge(VENDOR_C[v.current_status]||'#9ca3af')}>{v.current_status}</span>
                      </div>
                      <div style={{ fontSize:11, color:'#6b7280' }}>Uptime: {v.actual_uptime_pct}% | SLA: {v.guaranteed_uptime_pct}%</div>
                      <div style={{ fontSize:11, color:'#9ca3af' }}>{v.total_incidents||0} incidents · {v.total_downtime_min||0}m downtime</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ SLA NEGOTIATOR ═══ */}
        {tab === 'sla' && (
          <div style={{ display:'grid', gridTemplateColumns:selectedProposal?'1fr 1fr':'1fr', gap:16 }}>
            <div>
              {/* Generate Form */}
              <div style={{ ...S.card, padding:20, marginBottom:16 }}>
                <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 12px' }}>💼 Generate AI SLA Proposal</h3>
                <p style={{ fontSize:12, color:'#6b7280', margin:'0 0 12px' }}>AI analyzes your actual performance data to recommend realistic SLAs</p>
                <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                  <input style={{ ...S.input, flex:1 }} placeholder="Client name (e.g., HDFC Bank)" value={slaClient} onChange={e => setSlaClient(e.target.value)} />
                  <select style={S.select} value={slaIndustry} onChange={e => setSlaIndustry(e.target.value)}>
                    <option value="BFSI">BFSI</option><option value="Healthcare">Healthcare</option><option value="E-Commerce">E-Commerce</option><option value="Fintech">Fintech</option><option value="Other">Other</option>
                  </select>
                  <button style={S.btn('#7c3aed')} className="op-btn" onClick={generateSLA} disabled={genLoading==='sla'}>{genLoading==='sla'?'⏳...':'🧠 Generate'}</button>
                </div>
              </div>
              {/* Proposals List */}
              <div style={{ ...S.card, overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid #f3f4f6', fontSize:14, fontWeight:700 }}>SLA Proposals ({proposals.length})</div>
                {proposals.length === 0 ? (
                  <div style={{ padding:40, textAlign:'center', color:'#9ca3af', fontSize:13 }}>No proposals yet</div>
                ) : proposals.map(p => (
                  <div key={p.id} style={{ padding:'12px 16px', borderBottom:'1px solid #f3f4f6', cursor:'pointer', transition:'background 0.1s' }} onClick={() => setSelectedProposal(p)} onMouseOver={e => e.currentTarget.style.background='#f8fafc'} onMouseOut={e => e.currentTarget.style.background=''}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <span style={{ fontSize:11, fontWeight:700, color:'#7c3aed', fontFamily:'monospace', marginRight:8 }}>{p.proposal_number}</span>
                        <span style={{ fontSize:13, fontWeight:600 }}>{p.client_name}</span>
                        <span style={{ ...S.badge('#6b7280'), marginLeft:8 }}>{p.industry}</span>
                      </div>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <span style={S.badge(p.status==='active'?'#16a34a':'#d97706')}>{p.status}</span>
                        <span style={{ fontSize:11, color:'#9ca3af' }}>{p.ai_confidence_pct}% confidence</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {selectedProposal && (
              <div style={{ ...S.card, padding:20, position:'sticky', top:20, maxHeight:'80vh', overflow:'auto' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                  <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>{selectedProposal.proposal_number} — {selectedProposal.client_name}</h3>
                  <button style={S.btnO} onClick={() => setSelectedProposal(null)}>✕</button>
                </div>
                {/* Current Performance */}
                <div style={{ padding:14, background:'#f8fafc', borderRadius:10, marginBottom:12 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:8 }}>📊 Auto-Detected Performance</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <div><span style={{ fontSize:11, color:'#6b7280' }}>Avg Resolve:</span> <strong>{Math.round(selectedProposal.current_avg_resolve_min||0)}min</strong></div>
                    <div><span style={{ fontSize:11, color:'#6b7280' }}>SLA Compliance:</span> <strong>{selectedProposal.current_sla_compliance_pct||0}%</strong></div>
                    <div><span style={{ fontSize:11, color:'#6b7280' }}>Monthly Volume:</span> <strong>{selectedProposal.current_ticket_volume_monthly||0}</strong></div>
                    <div><span style={{ fontSize:11, color:'#6b7280' }}>Confidence:</span> <strong>{selectedProposal.ai_confidence_pct||0}%</strong></div>
                  </div>
                </div>
                {/* 3 Tier Cards */}
                <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>📋 SLA Tier Options</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
                  {[
                    { tier:selectedProposal.tier_basic, label:'Basic', c:'#6b7280', bg:'#f9fafb' },
                    { tier:selectedProposal.tier_standard, label:'Standard', c:'#2563eb', bg:'#eff6ff' },
                    { tier:selectedProposal.tier_premium, label:'Premium', c:'#7c3aed', bg:'#f5f3ff' },
                  ].map(t => (
                    <div key={t.label} style={{ padding:10, background:t.bg, borderRadius:8, border:`1px solid ${t.c}20` }}>
                      <div style={{ fontSize:12, fontWeight:700, color:t.c, marginBottom:6 }}>{t.label}</div>
                      <div style={{ fontSize:10, color:'#6b7280', lineHeight:1.6 }}>
                        Uptime: {t.tier?.uptime||'—'}<br/>
                        Price: {t.tier?.price_multiplier||1}x
                      </div>
                    </div>
                  ))}
                </div>
                {/* AI Analysis */}
                {[
                  { label:'⚠️ Risk Assessment', content:selectedProposal.ai_risk_assessment, bg:'#fffbeb', bc:'#fde68a' },
                  { label:'📊 Gap Analysis', content:selectedProposal.ai_gap_analysis, bg:'#eff6ff', bc:'#bfdbfe' },
                  { label:'💰 Cost Estimate', content:selectedProposal.ai_cost_estimate, bg:'#f0fdf4', bc:'#bbf7d0' },
                  { label:'🎯 Negotiation Tips', content:selectedProposal.ai_negotiation_tips, bg:'#f5f3ff', bc:'#c4b5fd' },
                ].map((s,i) => s.content && (
                  <div key={i} style={{ padding:12, background:s.bg, borderRadius:8, border:`1px solid ${s.bc}`, marginBottom:8 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:4 }}>{s.label}</div>
                    <div style={{ fontSize:12, color:'#374151', lineHeight:1.6 }}>{s.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ CLIENT HEALTH ═══ */}
        {tab === 'health' && (
          <div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
              <button style={S.btn('#059669')} className="op-btn" onClick={calcHealth} disabled={genLoading==='health'}>{genLoading==='health'?'⏳ Calculating...':'🧠 Recalculate Health'}</button>
            </div>
            {healthScores.length === 0 ? (
              <div style={{ ...S.card, padding:60, textAlign:'center' }}>
                <div style={{ fontSize:48, opacity:0.3 }}>💚</div>
                <div style={{ fontSize:14, color:'#6b7280', marginTop:12 }}>No health data yet. Click "Recalculate Health" to analyze.</div>
              </div>
            ) : healthScores.map(h => (
              <div key={h.id} style={{ ...S.card, padding:24, marginBottom:16, animation:'fadeUp 0.3s ease both' }}>
                {/* Score Circle + Overview */}
                <div style={{ display:'flex', gap:24, alignItems:'center', marginBottom:20 }}>
                  <div style={{ width:100, height:100, borderRadius:'50%', background:`conic-gradient(${(h.overall_score||0)>70?'#16a34a':(h.overall_score||0)>40?'#d97706':'#dc2626'} ${(h.overall_score||0)*3.6}deg, #e5e7eb 0)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <div style={{ width:80, height:80, borderRadius:'50%', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
                      <div style={{ fontSize:28, fontWeight:800, color:(h.overall_score||0)>70?'#16a34a':(h.overall_score||0)>40?'#d97706':'#dc2626' }}>{h.overall_score}</div>
                      <div style={{ fontSize:9, color:'#6b7280' }}>/ 100</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                      <span style={{ fontSize:18, fontWeight:700 }}>Client Health Score</span>
                      <span style={S.badge(HEALTH_C[h.trend]||'#6b7280')}>{h.trend}</span>
                      <span style={S.badge(RISK_C[h.churn_risk]||'#9ca3af')}>Churn: {h.churn_risk}</span>
                    </div>
                    <div style={{ fontSize:12, color:'#6b7280' }}>
                      Change: {(h.score_change||0) >= 0 ? '↑' : '↓'} {Math.abs(h.score_change||0)} pts | Previous: {h.previous_score||0}
                    </div>
                  </div>
                </div>
                {/* 6 Dimension Bars */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
                  {[
                    { l:'Ticket Volume', v:h.ticket_volume_score, c:'#2563eb' },
                    { l:'Resolution Speed', v:h.resolution_speed_score, c:'#7c3aed' },
                    { l:'SLA Compliance', v:h.sla_compliance_score, c:'#059669' },
                    { l:'Recurring Issues', v:h.recurring_issues_score, c:'#d97706' },
                    { l:'Satisfaction', v:h.satisfaction_score, c:'#ec4899' },
                    { l:'Escalation Rate', v:h.escalation_score, c:'#dc2626' },
                  ].map((d,i) => (
                    <div key={i}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                        <span style={{ color:'#374151' }}>{d.l}</span>
                        <span style={{ fontWeight:700, color:d.c }}>{d.v}/100</span>
                      </div>
                      <div style={{ height:8, borderRadius:4, background:'#e5e7eb' }}>
                        <div style={{ height:'100%', borderRadius:4, background:d.c, width:`${d.v}%`, transition:'width 0.5s' }} />
                      </div>
                    </div>
                  ))}
                </div>
                {/* AI Risk Factors + Recommendations */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div style={{ padding:14, background:'#fef2f2', borderRadius:10, border:'1px solid #fecaca' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#dc2626', marginBottom:8 }}>⚠️ Risk Factors</div>
                    {(h.ai_risk_factors||[]).map((f,i) => <div key={i} style={{ fontSize:12, color:'#374151', marginBottom:4 }}>• {f}</div>)}
                    {(h.ai_risk_factors||[]).length === 0 && <div style={{ fontSize:12, color:'#9ca3af' }}>No risk factors detected</div>}
                  </div>
                  <div style={{ padding:14, background:'#f0fdf4', borderRadius:10, border:'1px solid #bbf7d0' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#059669', marginBottom:8 }}>✅ AI Recommendations</div>
                    {(h.ai_recommendations||[]).map((r,i) => (
                      <div key={i} style={{ fontSize:12, color:'#374151', marginBottom:6 }}>
                        <div style={{ fontWeight:600 }}>• {r.action}</div>
                        <div style={{ color:'#6b7280', fontSize:11 }}>{r.impact} <span style={S.badge(r.priority==='high'?'#dc2626':r.priority==='medium'?'#d97706':'#16a34a')}>{r.priority}</span></div>
                      </div>
                    ))}
                    {(h.ai_recommendations||[]).length === 0 && <div style={{ fontSize:12, color:'#9ca3af' }}>No recommendations yet</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ SHIFT HANDOVER ═══ */}
        {tab === 'handover' && (
          <div style={{ display:'grid', gridTemplateColumns:selectedHandover?'1fr 1fr':'1fr', gap:16 }}>
            <div>
              {/* Generate */}
              <div style={{ ...S.card, padding:20, marginBottom:16 }}>
                <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 12px' }}>🔄 Generate Shift Handover</h3>
                <div style={{ display:'flex', gap:8 }}>
                  <select style={S.select} value={shiftFrom} onChange={e => setShiftFrom(e.target.value)}>
                    <option value="morning">🌅 Morning</option><option value="evening">🌆 Evening</option><option value="night">🌙 Night</option>
                  </select>
                  <span style={{ padding:'10px 0', color:'#9ca3af' }}>→</span>
                  <select style={S.select} value={shiftTo} onChange={e => setShiftTo(e.target.value)}>
                    <option value="evening">🌆 Evening</option><option value="night">🌙 Night</option><option value="morning">🌅 Morning</option>
                  </select>
                  <button style={S.btn('#2563eb')} className="op-btn" onClick={genHandover} disabled={genLoading==='handover'}>{genLoading==='handover'?'⏳...':'🧠 Generate'}</button>
                </div>
              </div>
              {/* Handover List */}
              <div style={{ ...S.card, overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid #f3f4f6', fontSize:14, fontWeight:700 }}>Handover Reports ({handovers.length})</div>
                {handovers.length === 0 ? (
                  <div style={{ padding:40, textAlign:'center', color:'#9ca3af', fontSize:13 }}>No handovers yet</div>
                ) : handovers.map(h => (
                  <div key={h.id} style={{ padding:'12px 16px', borderBottom:'1px solid #f3f4f6', cursor:'pointer', transition:'background 0.1s' }} onClick={() => setSelectedHandover(h)} onMouseOver={e => e.currentTarget.style.background='#f8fafc'} onMouseOut={e => e.currentTarget.style.background=''}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <span style={{ fontSize:11, fontWeight:700, color:'#2563eb', fontFamily:'monospace', marginRight:8 }}>{h.handover_number}</span>
                        <span style={{ fontSize:13, fontWeight:600 }}>{SHIFT_L[h.shift_from]||h.shift_from} → {SHIFT_L[h.shift_to]||h.shift_to}</span>
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <span style={{ fontSize:11, color:'#374151' }}>📋 {h.total_open} open · 🔴 {h.total_critical} critical · ⚠️ {h.sla_at_risk} SLA risk</span>
                        <span style={{ fontSize:11, color:'#9ca3af' }}>{new Date(h.created_at).toLocaleString('en-IN', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'short' })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {selectedHandover && (
              <div style={{ ...S.card, padding:20, position:'sticky', top:20, maxHeight:'80vh', overflow:'auto' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                  <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>{selectedHandover.handover_number}</h3>
                  <button style={S.btnO} onClick={() => setSelectedHandover(null)}>✕</button>
                </div>
                {/* Summary */}
                <div style={{ padding:14, background:'#eff6ff', borderRadius:10, border:'1px solid #bfdbfe', marginBottom:12 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#2563eb', marginBottom:4 }}>📝 AI Summary</div>
                  <div style={{ fontSize:13, color:'#374151', lineHeight:1.7 }}>{selectedHandover.ai_summary}</div>
                </div>
                {/* Metrics */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6, marginBottom:12 }}>
                  {[
                    { l:'Open', v:selectedHandover.total_open, c:'#d97706' },
                    { l:'Critical', v:selectedHandover.total_critical, c:'#dc2626' },
                    { l:'SLA Risk', v:selectedHandover.sla_at_risk, c:'#dc2626' },
                    { l:'Resolved', v:selectedHandover.resolved_this_shift, c:'#16a34a' },
                    { l:'New', v:selectedHandover.new_this_shift, c:'#2563eb' },
                  ].map((m,i) => (
                    <div key={i} style={{ padding:8, borderRadius:8, background:m.c+'10', textAlign:'center' }}>
                      <div style={{ fontSize:18, fontWeight:800, color:m.c }}>{m.v}</div>
                      <div style={{ fontSize:10, color:m.c }}>{m.l}</div>
                    </div>
                  ))}
                </div>
                {/* Critical Items */}
                {(selectedHandover.critical_items||[]).length > 0 && (
                  <div style={{ padding:12, background:'#fef2f2', borderRadius:10, border:'1px solid #fecaca', marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#dc2626', marginBottom:8 }}>🔴 Critical Items</div>
                    {selectedHandover.critical_items.map((c,i) => (
                      <div key={i} style={{ fontSize:12, color:'#374151', marginBottom:6 }}>
                        <strong>{c.ticket}:</strong> {c.issue} → <em>{c.action_needed}</em>
                      </div>
                    ))}
                  </div>
                )}
                {/* Watch Items */}
                {(selectedHandover.watch_items||[]).length > 0 && (
                  <div style={{ padding:12, background:'#fffbeb', borderRadius:10, border:'1px solid #fde68a', marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#d97706', marginBottom:8 }}>👀 Watch Items for Next Shift</div>
                    {selectedHandover.watch_items.map((w,i) => (
                      <div key={i} style={{ fontSize:12, color:'#374151', marginBottom:6 }}>
                        <strong>{w.item}</strong> — {w.reason} <span style={S.badge(w.priority==='high'?'#dc2626':'#d97706')}>{w.priority}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Service Health */}
                {selectedHandover.service_health?.overall && (
                  <div style={{ padding:12, background:selectedHandover.service_health.overall==='healthy'?'#f0fdf4':'#fef2f2', borderRadius:10, border:`1px solid ${selectedHandover.service_health.overall==='healthy'?'#bbf7d0':'#fecaca'}` }}>
                    <div style={{ fontSize:12, fontWeight:700, color:selectedHandover.service_health.overall==='healthy'?'#059669':'#dc2626', marginBottom:4 }}>🏥 Service Health: {selectedHandover.service_health.overall.toUpperCase()}</div>
                    <div style={{ fontSize:12, color:'#374151' }}>{selectedHandover.service_health.details}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ VENDOR TRACKER ═══ */}
        {tab === 'vendors' && (
          <div>
            {/* Add Vendor Form */}
            <div style={{ ...S.card, padding:20, marginBottom:16 }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 12px' }}>🏢 Add Vendor to Monitor</h3>
              <div style={{ display:'flex', gap:8 }}>
                <input style={{ ...S.input, flex:1 }} placeholder="Vendor name (e.g., AWS)" value={vName} onChange={e => setVName(e.target.value)} />
                <select style={S.select} value={vType} onChange={e => setVType(e.target.value)}>
                  <option value="cloud">☁️ Cloud</option><option value="payment">💳 Payment</option><option value="sms">📱 SMS</option><option value="api">🔌 API</option><option value="database">🗄️ Database</option>
                </select>
                <input style={{ ...S.input, width:180 }} placeholder="Health check URL" value={vUrl} onChange={e => setVUrl(e.target.value)} />
                <input style={{ ...S.input, width:80 }} placeholder="99.9" value={vUptime} onChange={e => setVUptime(e.target.value)} />
                <button style={S.btn('#059669')} className="op-btn" onClick={addVendor} disabled={genLoading==='vendor'}>{genLoading==='vendor'?'⏳...':'+ Add'}</button>
              </div>
            </div>
            {/* Vendor Cards */}
            {vendors.length === 0 ? (
              <div style={{ ...S.card, padding:60, textAlign:'center' }}>
                <div style={{ fontSize:48, opacity:0.3 }}>🏢</div>
                <div style={{ fontSize:14, color:'#6b7280', marginTop:12 }}>No vendors configured. Add your first vendor above.</div>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
                {vendors.map(v => (
                  <div key={v.id} style={{ ...S.card, padding:20, borderLeft:`4px solid ${VENDOR_C[v.current_status]||'#9ca3af'}`, animation:'fadeUp 0.3s ease both' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                      <div>
                        <div style={{ fontSize:16, fontWeight:700 }}>{v.vendor_name}</div>
                        <div style={{ fontSize:12, color:'#6b7280' }}>{v.vendor_type} · {v.health_check_url || 'No URL'}</div>
                      </div>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <span style={S.badge(VENDOR_C[v.current_status]||'#9ca3af')}>{v.current_status}</span>
                        <button style={S.btnO} onClick={() => checkVendor(v.id)} disabled={genLoading==='check_'+v.id}>{genLoading==='check_'+v.id?'⏳':'🔍 Check'}</button>
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
                      {[
                        { l:'Uptime', v:`${v.actual_uptime_pct||100}%`, c:(v.actual_uptime_pct||100)>=v.guaranteed_uptime_pct?'#16a34a':'#dc2626' },
                        { l:'SLA Target', v:`${v.guaranteed_uptime_pct}%`, c:'#2563eb' },
                        { l:'Downtime', v:`${v.total_downtime_min||0}m`, c:'#d97706' },
                        { l:'Incidents', v:v.total_incidents||0, c:'#dc2626' },
                      ].map((m,i) => (
                        <div key={i} style={{ padding:8, borderRadius:8, background:`${m.c}08`, textAlign:'center' }}>
                          <div style={{ fontSize:16, fontWeight:800, color:m.c }}>{m.v}</div>
                          <div style={{ fontSize:10, color:'#6b7280' }}>{m.l}</div>
                        </div>
                      ))}
                    </div>
                    {/* SLA breach warning */}
                    {(v.actual_uptime_pct || 100) < v.guaranteed_uptime_pct && (
                      <div style={{ marginTop:10, padding:10, background:'#fef2f2', borderRadius:8, border:'1px solid #fecaca' }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'#dc2626' }}>⚠️ SLA BREACHED — Uptime {v.actual_uptime_pct}% below {v.guaranteed_uptime_pct}% target</div>
                        <div style={{ fontSize:11, color:'#6b7280' }}>Estimated credit: ₹{v.monthly_credit_inr||0}</div>
                      </div>
                    )}
                    {v.last_check_at && <div style={{ fontSize:10, color:'#9ca3af', marginTop:8 }}>Last checked: {new Date(v.last_check_at).toLocaleString('en-IN')}</div>}
                  </div>
                ))}
              </div>
            )}
            {/* Vendor Incidents */}
            {vendorIncidents.length > 0 && (
              <div style={{ ...S.card, overflow:'hidden', marginTop:16 }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid #f3f4f6', fontSize:14, fontWeight:700 }}>📋 Recent Vendor Incidents ({vendorIncidents.length})</div>
                {vendorIncidents.slice(0,10).map(inc => (
                  <div key={inc.id} style={{ padding:'10px 16px', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <span style={{ fontSize:12, fontWeight:600 }}>{inc.vendor_sla_configs?.vendor_name||'Unknown'}</span>
                      <span style={{ ...S.badge(inc.incident_type==='outage'?'#dc2626':'#d97706'), marginLeft:8 }}>{inc.incident_type}</span>
                      {inc.duration_min && <span style={{ fontSize:11, color:'#6b7280', marginLeft:8 }}>{inc.duration_min}min</span>}
                    </div>
                    <span style={{ fontSize:11, color:'#9ca3af' }}>{new Date(inc.started_at).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

