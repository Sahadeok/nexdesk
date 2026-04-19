'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

const SEV = {
  critical: { c:'#dc2626', bg:'#fef2f2', icon:'🔴' },
  high:     { c:'#d97706', bg:'#fffbeb', icon:'🟠' },
  medium:   { c:'#2563eb', bg:'#eff6ff', icon:'🔵' },
  low:      { c:'#16a34a', bg:'#f0fdf4', icon:'🟢' },
}
const STAT = {
  generating:{ c:'#7c3aed', bg:'#f5f3ff', l:'Generating' },
  draft:     { c:'#d97706', bg:'#fffbeb', l:'Draft' },
  review:    { c:'#2563eb', bg:'#eff6ff', l:'In Review' },
  approved:  { c:'#059669', bg:'#ecfdf5', l:'Approved' },
  published: { c:'#16a34a', bg:'#f0fdf4', l:'Published' },
  archived:  { c:'#6b7280', bg:'#f9fafb', l:'Archived' },
}
const EVT_ICON = { error:'🔴', alert:'🟠', detection:'🔍', action:'🔧', escalation:'⬆️', deployment:'🚀', rollback:'↩️', resolution:'✅', communication:'📢', recovery:'💚' }
const LEVEL_COLOR = ['#dc2626','#d97706','#f59e0b','#7c3aed','#6b7280']
const LEVEL_LABEL = ['Symptom','Proximate Cause','Contributing Factor','Systemic Root Cause','Organizational Factor']

export default function PostmortemDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [pms, setPms] = useState([])
  const [tickets, setTickets] = useState([])
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [genTicket, setGenTicket] = useState('')
  const [blameFree, setBlameFree] = useState(true)
  const [allActions, setAllActions] = useState([])
  const [reportTab, setReportTab] = useState('executive')
  const [genStage, setGenStage] = useState('')

  useEffect(() => { init() }, [])

  async function init() {
    const { user } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    await loadAll()
    setLoading(false)
  }

  async function loadAll() {
    const [pmRes, actRes] = await Promise.all([
      fetch('/api/postmortems').then(r => r.json()),
      fetch('/api/postmortem-actions?global=1').then(r => r.json()),
    ])
    setPms(pmRes.postmortems || [])
    setAllActions(actRes.action_items || [])
  }

  async function loadTickets() {
    const { data } = await supabase.from('tickets').select('id, title, priority, category, status, created_at')
      .in('status', ['resolved','closed']).order('created_at', { ascending: false }).limit(50)
    setTickets(data || [])
  }

  async function loadDetail(pmId) {
    const res = await fetch(`/api/postmortems?id=${pmId}`)
    const data = await res.json()
    setDetail(data)
    setSelected(pmId)
  }

  async function generatePM() {
    if (!genTicket) return
    setGenerating(true)
    setGenStage('🔍 Reconstructing incident timeline...')
    try {
      setTimeout(() => setGenStage('🧬 Analyzing root cause chain (5 levels)...'), 3000)
      setTimeout(() => setGenStage('📝 Writing 6 report formats...'), 7000)
      setTimeout(() => setGenStage('📊 Calculating PQI & historical patterns...'), 11000)
      const res = await fetch('/api/postmortems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: genTicket, blame_free: blameFree }),
      })
      const data = await res.json()
      if (data.success) {
        await loadAll()
        setGenStage('')
        setTab('overview')
        if (data.postmortem?.id) await loadDetail(data.postmortem.id)
      } else {
        setGenStage(`❌ Error: ${data.error}`)
      }
    } catch (e) { setGenStage(`❌ ${e.message}`) }
    setGenerating(false)
  }

  async function updateAction(actionId, status) {
    await fetch('/api/postmortem-actions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: actionId, status }),
    })
    await loadAll()
    if (selected) await loadDetail(selected)
  }

  async function updatePMStatus(pmId, status) {
    await fetch('/api/postmortems', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pmId, status }),
    })
    await loadAll()
  }

  // Stats
  const totalPMs = pms.length
  const avgPQI = totalPMs ? Math.round(pms.reduce((s,p) => s + (p.pqi_score||0), 0) / totalPMs) : 0
  const avgMTTR = totalPMs ? Math.round(pms.reduce((s,p) => s + (p.time_to_resolve_min||0), 0) / totalPMs) : 0
  const openActions = allActions.filter(a => a.status === 'open').length
  const completedActions = allActions.filter(a => a.status === 'completed').length
  const recurringCount = pms.filter(p => (p.similar_incident_count||0) > 0).length

  const S = {
    page: { minHeight:'100vh', background:'#f8fafc', fontFamily:"'DM Sans',sans-serif", color:'#111827' },
    card: { background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' },
    badge: (c, bg) => ({ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:600, background:bg, color:c, border:`1px solid ${c}30`, display:'inline-block' }),
    input: { width:'100%', padding:'10px 14px', background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', color:'#111827' },
    btn: (c='#2563eb') => ({ padding:'10px 20px', background:c, border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', transition:'all 0.15s' }),
    btnO: { padding:'8px 14px', background:'transparent', border:'1px solid #e5e7eb', borderRadius:8, color:'#374151', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:'inherit' },
  }

  if (loading) return (
    <div style={S.page}>
      <GlobalNav title="AI Postmortem Writer" />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'80vh' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>💀</div>
          <div style={{ color:'#6b7280', fontSize:14 }}>Loading Postmortem Intelligence...</div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse3 { 0%,100%{opacity:1} 50%{opacity:0.4} }
        * { box-sizing:border-box; }
        .pm-tab { padding:8px 16px; border-radius:8px; font-size:13px; font-weight:500; cursor:pointer; border:1px solid #e5e7eb; background:#fff; color:#6b7280; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .pm-tab:hover { border-color:#d1d5db; color:#374151; }
        .pm-tab.active { background:#eff6ff; color:#2563eb; border-color:#bfdbfe; font-weight:600; }
        .pm-row { padding:16px 20px; border-bottom:1px solid #f3f4f6; cursor:pointer; transition:background 0.1s; }
        .pm-row:hover { background:#f8fafc; }
        .pm-btn:hover { filter:brightness(0.9); transform:translateY(-1px); }
        .pm-pqi { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; color:#fff; }
      `}</style>

      <GlobalNav title="AI Postmortem Writer" />

      <div style={{ maxWidth:1400, margin:'0 auto', padding:'28px 24px' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, margin:0, letterSpacing:'-0.3px' }}>💀 AI Postmortem Writer</h1>
            <p style={{ color:'#6b7280', fontSize:13, margin:'4px 0 0' }}>AI Incident Forensics — Root Cause Chains, Interactive Timelines & Multi-Format Reports</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button style={S.btnO} onClick={loadAll}>↻ Refresh</button>
            <button style={S.btn()} className="pm-btn" onClick={() => { setTab('generate'); loadTickets() }}>🧠 Generate Postmortem</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:24 }}>
          {[
            { icon:'📋', label:'Total Postmortems', val:totalPMs, color:'#2563eb' },
            { icon:'🎯', label:'Avg PQI Score', val:avgPQI, color: avgPQI>70?'#16a34a':avgPQI>40?'#d97706':'#dc2626' },
            { icon:'⏱️', label:'Avg MTTR (min)', val:avgMTTR, color:'#7c3aed' },
            { icon:'📌', label:'Open Actions', val:openActions, color: openActions>5?'#dc2626':'#d97706' },
            { icon:'✅', label:'Completed Actions', val:completedActions, color:'#059669' },
            { icon:'🔄', label:'Recurring Issues', val:recurringCount, color:'#dc2626' },
          ].map((s,i) => (
            <div key={i} style={{ ...S.card, padding:'16px 20px', animation:`fadeUp 0.3s ${i*0.05}s ease both` }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
              <div style={{ fontSize:26, fontWeight:800, color:s.color, letterSpacing:'-1px' }}>{s.val}</div>
              <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
          {[
            { key:'overview', label:`📋 Overview (${totalPMs})` },
            { key:'generate', label:'🧠 Generate' },
            { key:'timeline', label:'📊 Timeline' },
            { key:'rootcause', label:'🔗 Root Cause Chain' },
            { key:'report', label:'📝 Report' },
            { key:'analytics', label:'📈 Analytics' },
            { key:'actions', label:`⚡ Action Tracker (${openActions})` },
          ].map(t => (
            <button key={t.key} className={`pm-tab${tab===t.key?' active':''}`} onClick={() => { setTab(t.key); if(t.key==='generate') loadTickets() }}>{t.label}</button>
          ))}
        </div>

        {/* ═══ OVERVIEW ═══ */}
        {tab === 'overview' && (
          <div style={{ ...S.card, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:14, fontWeight:700 }}>All Postmortems</span>
              <span style={{ fontSize:12, color:'#6b7280' }}>{pms.length} total</span>
            </div>
            {pms.length === 0 ? (
              <div style={{ padding:60, textAlign:'center' }}>
                <div style={{ fontSize:48, marginBottom:12, opacity:0.3 }}>💀</div>
                <div style={{ fontSize:15, fontWeight:600, color:'#6b7280', marginBottom:8 }}>No Postmortems Yet</div>
                <div style={{ fontSize:13, color:'#9ca3af', marginBottom:16 }}>Generate your first AI-powered incident postmortem</div>
                <button style={S.btn()} className="pm-btn" onClick={() => { setTab('generate'); loadTickets() }}>🧠 Generate Postmortem</button>
              </div>
            ) : pms.map(pm => {
              const sv = SEV[pm.incident_severity] || SEV.medium
              const st = STAT[pm.status] || STAT.draft
              const pqiColor = (pm.pqi_score||0)>70?'#16a34a':(pm.pqi_score||0)>40?'#d97706':'#dc2626'
              return (
                <div key={pm.id} className="pm-row" onClick={() => { loadDetail(pm.id); setTab('report') }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:'#7c3aed', fontFamily:'monospace' }}>{pm.pm_number}</span>
                        <span style={S.badge(st.c, st.bg)}>{st.l}</span>
                        <span style={S.badge(sv.c, sv.bg)}>{sv.icon} {pm.incident_severity}</span>
                        {pm.similar_incident_count > 0 && <span style={S.badge('#dc2626','#fef2f2')}>🔄 Recurring</span>}
                      </div>
                      <div style={{ fontSize:14, fontWeight:600, color:'#111827' }}>{pm.title}</div>
                      {pm.ai_summary && <div style={{ fontSize:12, color:'#6b7280', marginTop:4, lineHeight:1.5 }}>{pm.ai_summary.substring(0,200)}...</div>}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0, marginLeft:16 }}>
                      <div className="pm-pqi" style={{ background: pqiColor }}>{pm.pqi_score||0}</div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:11, color:'#9ca3af' }}>{new Date(pm.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}</div>
                        <div style={{ fontSize:11, color:'#6b7280' }}>MTTR: {pm.time_to_resolve_min || 0}m</div>
                        <div style={{ fontSize:10, color:'#9ca3af' }}>{pm.action_items_completed}/{pm.action_items_total} actions</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6, marginTop:8 }} onClick={e => e.stopPropagation()}>
                    {pm.status === 'draft' && <button style={{...S.btnO, borderColor:'#2563eb', color:'#2563eb'}} onClick={() => updatePMStatus(pm.id,'review')}>Submit for Review</button>}
                    {pm.status === 'review' && <button style={{...S.btnO, borderColor:'#16a34a', color:'#16a34a'}} onClick={() => updatePMStatus(pm.id,'approved')}>✓ Approve</button>}
                    {pm.status === 'approved' && <button style={{...S.btnO, borderColor:'#059669', color:'#059669'}} onClick={() => updatePMStatus(pm.id,'published')}>📢 Publish</button>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ═══ GENERATE ═══ */}
        {tab === 'generate' && (
          <div style={{ ...S.card, padding:28 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🧠</div>
              <div>
                <h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>AI Postmortem Generator</h2>
                <p style={{ margin:0, fontSize:12, color:'#6b7280' }}>Select a resolved ticket → AI reconstructs timeline, analyzes root cause chain, generates 6 report formats</p>
              </div>
            </div>

            {generating && (
              <div style={{ padding:20, background:'linear-gradient(135deg,#eff6ff,#f5f3ff)', border:'1px solid #bfdbfe', borderRadius:12, marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:24, height:24, borderRadius:'50%', border:'3px solid #bfdbfe', borderTopColor:'#7c3aed', animation:'spin 0.7s linear infinite' }} />
                <div>
                  <div style={{ fontSize:14, color:'#2563eb', fontWeight:700 }}>{genStage || '⏳ Processing...'}</div>
                  <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>This typically takes 15-30 seconds</div>
                </div>
              </div>
            )}

            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:8, display:'block' }}>Select Resolved Ticket *</label>
              <select style={S.input} value={genTicket} onChange={e => setGenTicket(e.target.value)}>
                <option value="">— Select a ticket —</option>
                {tickets.map(t => (
                  <option key={t.id} value={t.id}>{t.title} ({t.priority} | {t.category})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151' }}>Analysis Mode:</label>
              <button className={`pm-tab ${blameFree?'active':''}`} onClick={() => setBlameFree(true)}>🔒 Blame-Free</button>
              <button className={`pm-tab ${!blameFree?'active':''}`} onClick={() => setBlameFree(false)}>📋 Detailed</button>
              <span style={{ fontSize:11, color:'#6b7280', marginLeft:8 }}>{blameFree ? 'Focuses on systemic failures (Google SRE best practice)' : 'Includes individual actions/decisions'}</span>
            </div>

            <button style={S.btn('#7c3aed')} className="pm-btn" disabled={!genTicket || generating} onClick={generatePM}>
              {generating ? '⏳ AI Generating Postmortem...' : '🧠 Generate Full Postmortem'}
            </button>

            <div style={{ marginTop:20, padding:16, background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#059669', marginBottom:6 }}>🧠 What AI Does Automatically:</div>
              <div style={{ fontSize:12, color:'#374151', lineHeight:1.8 }}>
                ▸ Reconstructs full incident timeline from tickets, session events, health logs, deployments<br/>
                ▸ Performs 5-level root cause chain analysis (Symptom → Proximate → Contributing → Systemic → Organizational)<br/>
                ▸ Generates 6 report formats: Executive Brief, Technical Deep-Dive, Narrative Story, Regulatory, Lessons, Prevention<br/>
                ▸ Calculates Postmortem Quality Index (PQI) score 0-100<br/>
                ▸ Compares with historical incidents to detect recurring patterns<br/>
                ▸ Creates actionable items with owners and deadlines
              </div>
            </div>
          </div>
        )}

        {/* ═══ TIMELINE ═══ */}
        {tab === 'timeline' && (
          <div>
            {!detail ? (
              <div style={{ ...S.card, padding:40, textAlign:'center' }}>
                <div style={{ fontSize:48, opacity:0.3 }}>📊</div>
                <div style={{ fontSize:14, color:'#6b7280', marginTop:12 }}>Select a postmortem from Overview to view its timeline</div>
              </div>
            ) : (
              <div style={{ ...S.card, padding:24 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                  <div>
                    <h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>📊 Incident Timeline</h2>
                    <p style={{ fontSize:12, color:'#6b7280', margin:'4px 0 0' }}>{detail.postmortem?.pm_number} — {detail.timeline?.length || 0} events reconstructed</p>
                  </div>
                </div>
                <div style={{ position:'relative', paddingLeft:40 }}>
                  <div style={{ position:'absolute', left:15, top:0, bottom:0, width:2, background:'linear-gradient(to bottom,#2563eb,#7c3aed,#dc2626)', borderRadius:1 }} />
                  {(detail.timeline || []).map((evt, i) => {
                    const sevC = evt.severity === 'critical' ? '#dc2626' : evt.severity === 'high' ? '#d97706' : evt.severity === 'medium' ? '#2563eb' : '#6b7280'
                    return (
                      <div key={i} style={{ position:'relative', marginBottom:16, animation:`fadeUp 0.3s ${i*0.03}s ease both` }}>
                        <div style={{ position:'absolute', left:-33, top:4, width:28, height:28, borderRadius:'50%', background:'#fff', border:`3px solid ${sevC}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, zIndex:1 }}>
                          {EVT_ICON[evt.event_type] || '📌'}
                        </div>
                        <div style={{ padding:14, background: evt.is_key_moment ? `${sevC}08` : '#fff', border:`1px solid ${evt.is_key_moment ? sevC+'30' : '#e5e7eb'}`, borderRadius:10, borderLeft:`4px solid ${sevC}` }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                              <span style={{ fontSize:11, fontWeight:700, color:sevC, textTransform:'uppercase' }}>{evt.event_type}</span>
                              {evt.is_key_moment && <span style={S.badge('#dc2626','#fef2f2')}>KEY MOMENT</span>}
                            </div>
                            <span style={{ fontSize:11, color:'#9ca3af', fontFamily:'monospace' }}>{new Date(evt.event_time).toLocaleString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', day:'2-digit', month:'short' })}</span>
                          </div>
                          <div style={{ fontSize:13, fontWeight:600, color:'#111827' }}>{evt.title}</div>
                          {evt.description && <div style={{ fontSize:12, color:'#6b7280', marginTop:4 }}>{evt.description}</div>}
                          <div style={{ display:'flex', gap:12, marginTop:6, fontSize:11, color:'#9ca3af' }}>
                            {evt.actor && <span>👤 {evt.actor}</span>}
                            {evt.affected_system && <span>💻 {evt.affected_system}</span>}
                            <span style={S.badge(sevC, sevC+'15')}>{evt.severity}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ ROOT CAUSE CHAIN ═══ */}
        {tab === 'rootcause' && (
          <div>
            {!detail ? (
              <div style={{ ...S.card, padding:40, textAlign:'center' }}>
                <div style={{ fontSize:48, opacity:0.3 }}>🔗</div>
                <div style={{ fontSize:14, color:'#6b7280', marginTop:12 }}>Select a postmortem from Overview to view root cause chain</div>
              </div>
            ) : (
              <div style={{ ...S.card, padding:24 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                  <div>
                    <h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>🔗 Root Cause Chain Analysis</h2>
                    <p style={{ fontSize:12, color:'#6b7280', margin:'4px 0 0' }}>
                      {detail.postmortem?.blame_free_mode ? '🔒 Blame-Free Mode — focusing on systemic failures' : '📋 Detailed Mode'}
                    </p>
                  </div>
                </div>
                <div style={{ position:'relative', paddingLeft:20 }}>
                  {(detail.root_causes || []).map((rc, i) => {
                    const lc = LEVEL_COLOR[rc.level] || '#6b7280'
                    return (
                      <div key={i} style={{ marginBottom:i < (detail.root_causes||[]).length-1 ? 0 : 0, animation:`fadeUp 0.3s ${i*0.1}s ease both` }}>
                        <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
                          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                            <div style={{ width:44, height:44, borderRadius:'50%', background:lc, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:16, fontWeight:800 }}>{rc.level}</div>
                            {i < (detail.root_causes||[]).length-1 && <div style={{ width:3, height:40, background:`linear-gradient(${lc}, ${LEVEL_COLOR[(rc.level||0)+1]||'#6b7280'})`, margin:'4px 0' }} />}
                          </div>
                          <div style={{ flex:1, padding:16, background:'#fff', border:`1px solid ${lc}30`, borderRadius:12, borderLeft:`4px solid ${lc}`, marginBottom:8 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                              <span style={{ fontSize:11, fontWeight:700, color:lc, textTransform:'uppercase', letterSpacing:'0.5px' }}>{rc.level_label || LEVEL_LABEL[rc.level]}</span>
                              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                                <span style={S.badge(rc.is_preventable?'#16a34a':'#dc2626', rc.is_preventable?'#f0fdf4':'#fef2f2')}>{rc.is_preventable ? '✅ Preventable' : '⚠️ Not Preventable'}</span>
                                <span style={{ fontSize:11, fontWeight:700, color:lc }}>{rc.confidence_pct}% confident</span>
                              </div>
                            </div>
                            <div style={{ fontSize:14, fontWeight:700, color:'#111827', marginBottom:4 }}>{rc.title}</div>
                            <div style={{ fontSize:13, color:'#374151', lineHeight:1.6, marginBottom:8 }}>{rc.description}</div>
                            {rc.evidence && (
                              <div style={{ padding:10, background:'#f8fafc', borderRadius:8, marginBottom:6 }}>
                                <div style={{ fontSize:10, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', marginBottom:4 }}>Evidence</div>
                                <div style={{ fontSize:12, color:'#374151' }}>{rc.evidence}</div>
                              </div>
                            )}
                            {rc.ai_explanation && <div style={{ fontSize:12, color:'#6b7280', fontStyle:'italic' }}>💡 {rc.ai_explanation}</div>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ REPORT ═══ */}
        {tab === 'report' && (
          <div>
            {!detail ? (
              <div style={{ ...S.card, padding:40, textAlign:'center' }}>
                <div style={{ fontSize:48, opacity:0.3 }}>📝</div>
                <div style={{ fontSize:14, color:'#6b7280', marginTop:12 }}>Select a postmortem from Overview to view reports</div>
              </div>
            ) : (
              <div style={{ ...S.card, padding:24 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                  <div>
                    <h2 style={{ margin:0, fontSize:16, fontWeight:700 }}>{detail.postmortem?.pm_number} — {detail.postmortem?.title}</h2>
                    <p style={{ fontSize:12, color:'#6b7280', margin:'4px 0 0' }}>PQI: {detail.postmortem?.pqi_score}/100 | MTTR: {detail.postmortem?.time_to_resolve_min}min</p>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
                  {[
                    { key:'executive', label:'📊 Executive Brief' },
                    { key:'technical', label:'🔧 Technical Deep-Dive' },
                    { key:'narrative', label:'📖 Narrative Story' },
                    { key:'regulatory', label:'📜 Regulatory' },
                    { key:'lessons', label:'💡 Lessons Learned' },
                    { key:'prevention', label:'🛡️ Prevention Plan' },
                  ].map(rt => (
                    <button key={rt.key} className={`pm-tab${reportTab===rt.key?' active':''}`} onClick={() => setReportTab(rt.key)}>{rt.label}</button>
                  ))}
                </div>
                <div style={{ padding:20, background:'#f8fafc', borderRadius:12, border:'1px solid #e5e7eb', minHeight:200 }}>
                  <div style={{ fontSize:14, color:'#374151', lineHeight:1.8, whiteSpace:'pre-wrap' }}>
                    {reportTab === 'executive' && (detail.postmortem?.ai_executive_brief || 'No executive brief generated.')}
                    {reportTab === 'technical' && (detail.postmortem?.ai_technical_deepdive || 'No technical deep-dive generated.')}
                    {reportTab === 'narrative' && (detail.postmortem?.ai_narrative_story || 'No narrative story generated.')}
                    {reportTab === 'regulatory' && (detail.postmortem?.ai_regulatory_report || 'No regulatory report generated.')}
                    {reportTab === 'lessons' && (detail.postmortem?.ai_lessons_learned || 'No lessons learned generated.')}
                    {reportTab === 'prevention' && (detail.postmortem?.ai_prevention_plan || 'No prevention plan generated.')}
                  </div>
                </div>
                {/* Impact Summary */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginTop:20 }}>
                  {[
                    { l:'Users Affected', v:detail.postmortem?.users_affected||0, c:'#dc2626' },
                    { l:'Transactions', v:detail.postmortem?.transactions_affected||0, c:'#d97706' },
                    { l:'MTTR (min)', v:detail.postmortem?.time_to_resolve_min||0, c:'#7c3aed' },
                    { l:'Revenue Impact ₹', v:detail.postmortem?.revenue_impact_inr||0, c:'#059669' },
                  ].map((m,i) => (
                    <div key={i} style={{ padding:14, background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, textAlign:'center' }}>
                      <div style={{ fontSize:20, fontWeight:800, color:m.c }}>{m.v}</div>
                      <div style={{ fontSize:11, color:'#6b7280' }}>{m.l}</div>
                    </div>
                  ))}
                </div>
                {/* What went well / wrong */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:20 }}>
                  <div style={{ padding:16, background:'#f0fdf4', borderRadius:10, border:'1px solid #bbf7d0' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#059669', marginBottom:8 }}>✅ What Went Well</div>
                    <div style={{ fontSize:13, color:'#374151', lineHeight:1.7 }}>{detail.postmortem?.ai_what_went_well || '—'}</div>
                  </div>
                  <div style={{ padding:16, background:'#fef2f2', borderRadius:10, border:'1px solid #fecaca' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#dc2626', marginBottom:8 }}>⚠️ What Went Wrong</div>
                    <div style={{ fontSize:13, color:'#374151', lineHeight:1.7 }}>{detail.postmortem?.ai_what_went_wrong || '—'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ ANALYTICS ═══ */}
        {tab === 'analytics' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {/* PQI Distribution */}
            <div style={{ ...S.card, padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 16px' }}>🎯 PQI Score Distribution</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { l:'Excellent (80-100)', count: pms.filter(p=>(p.pqi_score||0)>=80).length, c:'#16a34a' },
                  { l:'Good (60-79)', count: pms.filter(p=>(p.pqi_score||0)>=60&&(p.pqi_score||0)<80).length, c:'#2563eb' },
                  { l:'Average (40-59)', count: pms.filter(p=>(p.pqi_score||0)>=40&&(p.pqi_score||0)<60).length, c:'#d97706' },
                  { l:'Poor (<40)', count: pms.filter(p=>(p.pqi_score||0)<40).length, c:'#dc2626' },
                ].map((b,i) => (
                  <div key={i}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                      <span style={{ color:'#374151' }}>{b.l}</span>
                      <span style={{ fontWeight:700, color:b.c }}>{b.count}</span>
                    </div>
                    <div style={{ height:8, borderRadius:4, background:'#e5e7eb' }}>
                      <div style={{ height:'100%', borderRadius:4, background:b.c, width:`${totalPMs?Math.round(b.count/totalPMs*100):0}%`, transition:'width 0.5s' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Severity Breakdown */}
            <div style={{ ...S.card, padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 16px' }}>📊 Severity Breakdown</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {['critical','high','medium','low'].map(sev => {
                  const sv = SEV[sev]
                  const cnt = pms.filter(p => p.incident_severity === sev).length
                  return (
                    <div key={sev} style={{ padding:14, background:sv.bg, borderRadius:10, border:`1px solid ${sv.c}20`, textAlign:'center' }}>
                      <div style={{ fontSize:24, fontWeight:800, color:sv.c }}>{cnt}</div>
                      <div style={{ fontSize:11, color:sv.c, fontWeight:600, textTransform:'uppercase' }}>{sv.icon} {sev}</div>
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Action Items Stats */}
            <div style={{ ...S.card, padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 16px' }}>⚡ Action Items Health</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                {[
                  { l:'Open', v:allActions.filter(a=>a.status==='open').length, c:'#d97706' },
                  { l:'In Progress', v:allActions.filter(a=>a.status==='in_progress').length, c:'#2563eb' },
                  { l:'Completed', v:allActions.filter(a=>a.status==='completed').length, c:'#16a34a' },
                ].map((s,i) => (
                  <div key={i} style={{ padding:12, background:s.c+'10', borderRadius:10, textAlign:'center' }}>
                    <div style={{ fontSize:22, fontWeight:800, color:s.c }}>{s.v}</div>
                    <div style={{ fontSize:11, color:s.c }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:12, height:8, borderRadius:4, background:'#e5e7eb' }}>
                <div style={{ height:'100%', borderRadius:4, background:'#16a34a', width:`${allActions.length?Math.round(completedActions/allActions.length*100):0}%` }} />
              </div>
              <div style={{ fontSize:11, color:'#6b7280', marginTop:4, textAlign:'center' }}>{allActions.length?Math.round(completedActions/allActions.length*100):0}% completion rate</div>
            </div>
            {/* MTTR Stats */}
            <div style={{ ...S.card, padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 16px' }}>⏱️ MTTR Analysis</h3>
              <div style={{ textAlign:'center', marginBottom:16 }}>
                <div style={{ fontSize:36, fontWeight:800, color:'#7c3aed' }}>{avgMTTR}<span style={{ fontSize:14, color:'#6b7280' }}>min</span></div>
                <div style={{ fontSize:12, color:'#6b7280' }}>Average MTTR</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div style={{ padding:10, background:'#f0fdf4', borderRadius:8, textAlign:'center' }}>
                  <div style={{ fontSize:16, fontWeight:700, color:'#16a34a' }}>{pms.length>0?Math.min(...pms.map(p=>p.time_to_resolve_min||999)):0}m</div>
                  <div style={{ fontSize:10, color:'#6b7280' }}>Best MTTR</div>
                </div>
                <div style={{ padding:10, background:'#fef2f2', borderRadius:8, textAlign:'center' }}>
                  <div style={{ fontSize:16, fontWeight:700, color:'#dc2626' }}>{pms.length>0?Math.max(...pms.map(p=>p.time_to_resolve_min||0)):0}m</div>
                  <div style={{ fontSize:10, color:'#6b7280' }}>Worst MTTR</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ ACTION TRACKER ═══ */}
        {tab === 'actions' && (
          <div style={{ ...S.card, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:14, fontWeight:700 }}>⚡ Action Items Tracker</span>
              <span style={{ fontSize:12, color:'#6b7280' }}>{allActions.length} total | {openActions} open</span>
            </div>
            {allActions.length === 0 ? (
              <div style={{ padding:60, textAlign:'center' }}>
                <div style={{ fontSize:48, opacity:0.3 }}>⚡</div>
                <div style={{ fontSize:14, color:'#6b7280', marginTop:12 }}>No action items yet. Generate a postmortem to create action items.</div>
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#f9fafb' }}>
                    {['PM #','Action','Type','Priority','Owner','Deadline','Status',''].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', borderBottom:'1px solid #f3f4f6' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allActions.map(a => {
                    const pc = a.priority==='critical'?'#dc2626':a.priority==='high'?'#d97706':a.priority==='medium'?'#2563eb':'#16a34a'
                    const sc = a.status==='completed'?'#16a34a':a.status==='in_progress'?'#2563eb':a.status==='overdue'?'#dc2626':'#d97706'
                    return (
                      <tr key={a.id} style={{ borderBottom:'1px solid #f3f4f6' }}>
                        <td style={{ padding:'10px 14px', fontSize:12, fontWeight:700, color:'#7c3aed', fontFamily:'monospace' }}>{a.postmortems?.pm_number||'—'}</td>
                        <td style={{ padding:'10px 14px', fontSize:12, maxWidth:250, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.title}</td>
                        <td style={{ padding:'10px 14px' }}><span style={S.badge('#6b7280','#f3f4f6')}>{a.action_type}</span></td>
                        <td style={{ padding:'10px 14px' }}><span style={S.badge(pc, pc+'15')}>{a.priority}</span></td>
                        <td style={{ padding:'10px 14px', fontSize:12, color:'#6b7280' }}>{a.owner||'—'}</td>
                        <td style={{ padding:'10px 14px', fontSize:12, color:'#6b7280' }}>{a.deadline||'—'}</td>
                        <td style={{ padding:'10px 14px' }}><span style={S.badge(sc, sc+'15')}>{a.status}</span></td>
                        <td style={{ padding:'10px 14px' }}>
                          {a.status === 'open' && <button style={{...S.btnO, fontSize:11}} onClick={() => updateAction(a.id,'in_progress')}>▶ Start</button>}
                          {a.status === 'in_progress' && <button style={{...S.btnO, fontSize:11, borderColor:'#16a34a', color:'#16a34a'}} onClick={() => updateAction(a.id,'completed')}>✓ Done</button>}
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
    </div>
  )
}

