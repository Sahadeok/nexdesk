'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

const RISK_COLORS = {
  critical: { color:'#dc2626', bg:'#fef2f2', icon:'🔴' },
  high:     { color:'#d97706', bg:'#fffbeb', icon:'🟠' },
  medium:   { color:'#2563eb', bg:'#eff6ff', icon:'🔵' },
  low:      { color:'#16a34a', bg:'#f0fdf4', icon:'🟢' },
}

const STATUS_COLORS = {
  draft:          { color:'#6b7280', bg:'#f9fafb', label:'Draft' },
  pending_review: { color:'#d97706', bg:'#fffbeb', label:'Pending Review' },
  approved:       { color:'#16a34a', bg:'#f0fdf4', label:'Approved' },
  rejected:       { color:'#dc2626', bg:'#fef2f2', label:'Rejected' },
  scheduled:      { color:'#2563eb', bg:'#eff6ff', label:'Scheduled' },
  in_progress:    { color:'#7c3aed', bg:'#f5f3ff', label:'In Progress' },
  deployed:       { color:'#059669', bg:'#ecfdf5', label:'Deployed' },
  rolled_back:    { color:'#dc2626', bg:'#fef2f2', label:'Rolled Back' },
  closed:         { color:'#6b7280', bg:'#f9fafb', label:'Closed' },
  cancelled:      { color:'#9ca3af', bg:'#f9fafb', label:'Cancelled' },
}

const CATEGORIES = ['infrastructure','application','database','network','security','config']

export default function ChangeIntelligence() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [crs, setCrs] = useState([])
  const [deployments, setDeployments] = useState([])
  const [analyses, setAnalyses] = useState([])
  const [creating, setCreating] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [riskAnalyzing, setRiskAnalyzing] = useState(null)
  const [conflictChecking, setConflictChecking] = useState(null)
  const [conflictResults, setConflictResults] = useState(null)
  const [deployingCR, setDeployingCR] = useState(null)
  const [generatingAnalysis, setGeneratingAnalysis] = useState(null)
  const [selectedCR, setSelectedCR] = useState(null)

  // Form state
  const [form, setForm] = useState({
    brief_description: '',
    category: 'infrastructure',
    change_type: 'standard',
    affected_services: '',
    affected_environments: 'production',
    planned_start: '',
    planned_end: '',
  })

  useEffect(() => { init() }, [])

  async function init() {
    const { user } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    await loadAll()
    setLoading(false)
  }

  async function loadAll() {
    await Promise.all([loadCRs(), loadDeployments(), loadAnalyses()])
  }

  async function loadCRs() {
    const res = await fetch('/api/change-requests')
    const data = await res.json()
    setCrs(data.change_requests || [])
  }

  async function loadDeployments() {
    const res = await fetch('/api/cr-deploy')
    const data = await res.json()
    setDeployments(data.deployments || [])
  }

  async function loadAnalyses() {
    const res = await fetch('/api/cr-post-analysis')
    const data = await res.json()
    setAnalyses(data.analyses || [])
  }

  async function createCR() {
    setCreating(true)
    setAiGenerating(true)
    try {
      const services = form.affected_services.split(',').map(s => s.trim()).filter(Boolean)
      const res = await fetch('/api/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief_description: form.brief_description,
          category: form.category,
          change_type: form.change_type,
          affected_services: services,
          affected_environments: form.affected_environments,
          planned_start: form.planned_start || null,
          planned_end: form.planned_end || null,
          use_ai: true,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setForm({ brief_description:'', category:'infrastructure', change_type:'standard', affected_services:'', affected_environments:'production', planned_start:'', planned_end:'' })
        await loadCRs()
        setTab('overview')
      }
    } catch (e) { console.error(e) }
    setCreating(false)
    setAiGenerating(false)
  }

  async function runRiskAnalysis(crId) {
    setRiskAnalyzing(crId)
    try {
      await fetch('/api/cr-risk-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cr_id: crId }),
      })
      await loadCRs()
    } catch (e) { console.error(e) }
    setRiskAnalyzing(null)
  }

  async function checkConflicts(crId) {
    setConflictChecking(crId)
    try {
      const res = await fetch('/api/cr-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cr_id: crId }),
      })
      const data = await res.json()
      setConflictResults(data)
    } catch (e) { console.error(e) }
    setConflictChecking(null)
  }

  async function startDeploy(crId) {
    setDeployingCR(crId)
    try {
      await fetch('/api/cr-deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cr_id: crId }),
      })
      await Promise.all([loadCRs(), loadDeployments()])
    } catch (e) { console.error(e) }
    setDeployingCR(null)
  }

  async function updateCRStatus(crId, status) {
    await fetch('/api/change-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: crId, status }),
    })
    await loadCRs()
  }

  async function generatePostAnalysis(crId) {
    setGeneratingAnalysis(crId)
    try {
      await fetch('/api/cr-post-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cr_id: crId }),
      })
      await loadAnalyses()
    } catch (e) { console.error(e) }
    setGeneratingAnalysis(null)
  }

  // Stats
  const activeCRs = crs.filter(c => !['closed','cancelled','rejected'].includes(c.status))
  const pendingApproval = crs.filter(c => c.status === 'pending_review')
  const inDeploy = crs.filter(c => c.status === 'in_progress')
  const avgRisk = activeCRs.length ? Math.round(activeCRs.reduce((s,c) => s + (c.ai_risk_score||0), 0) / activeCRs.length) : 0
  const successRate = crs.filter(c=>c.deployment_success===true).length
  const rolledBack = crs.filter(c=>c.status==='rolled_back').length

  const S = {
    page: { minHeight:'100vh', background:'#f8fafc', fontFamily:"'DM Sans',sans-serif", color:'#111827' },
    card: { background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' },
    badge: (color, bg) => ({ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:600, background:bg, color, border:`1px solid ${color}30`, display:'inline-block' }),
    input: { width:'100%', padding:'10px 14px', background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', color:'#111827', transition:'border 0.15s' },
    btn: (color='#2563eb') => ({ padding:'10px 20px', background:color, border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', transition:'all 0.15s' }),
    btnOutline: { padding:'8px 14px', background:'transparent', border:'1px solid #e5e7eb', borderRadius:8, color:'#374151', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:'inherit' },
  }

  if (loading) return (
    <div style={S.page}>
      <GlobalNav title="Change Intelligence" />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'80vh' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🔄</div>
          <div style={{ color:'#6b7280', fontSize:14 }}>Loading Change Intelligence...</div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse2 { 0%,100%{opacity:1} 50%{opacity:0.5} }
        * { box-sizing:border-box; }
        .ci-tab { padding:8px 16px; border-radius:8px; font-size:13px; font-weight:500; cursor:pointer; border:1px solid #e5e7eb; background:#fff; color:#6b7280; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .ci-tab:hover { border-color:#d1d5db; color:#374151; }
        .ci-tab.active { background:#eff6ff; color:#2563eb; border-color:#bfdbfe; font-weight:600; }
        .ci-cr-row { padding:16px 20px; border-bottom:1px solid #f3f4f6; cursor:pointer; transition:background 0.1s; }
        .ci-cr-row:hover { background:#f8fafc; }
        .ci-input:focus { border-color:#2563eb !important; box-shadow:0 0 0 3px rgba(37,99,235,0.1); }
        .ci-btn:hover { filter:brightness(0.9); transform:translateY(-1px); }
        .ci-risk-bar { height:8px; border-radius:4px; background:#e5e7eb; overflow:hidden; }
        .ci-risk-fill { height:100%; border-radius:4px; transition:width 0.5s ease; }
      `}</style>

      <GlobalNav title="Change Intelligence" />

      <div style={{ maxWidth:1400, margin:'0 auto', padding:'28px 24px' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, margin:0, letterSpacing:'-0.3px' }}>
              🧠 Change Intelligence
            </h1>
            <p style={{ color:'#6b7280', fontSize:13, margin:'4px 0 0' }}>AI-Powered Change Request Management — Risk Analysis, Conflict Detection & Deployment Intelligence</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button style={S.btnOutline} onClick={loadAll}>↻ Refresh</button>
            <button style={S.btn()} className="ci-btn" onClick={() => setTab('new_cr')}>+ New Change Request</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:24 }}>
          {[
            { icon:'📋', label:'Active CRs', val:activeCRs.length, color:'#2563eb' },
            { icon:'⏳', label:'Pending Approval', val:pendingApproval.length, color:'#d97706' },
            { icon:'🚀', label:'In Deployment', val:inDeploy.length, color:'#7c3aed' },
            { icon:'⚠️', label:'Avg Risk Score', val:avgRisk, color: avgRisk>70?'#dc2626':avgRisk>40?'#d97706':'#16a34a' },
            { icon:'✅', label:'Successful', val:successRate, color:'#059669' },
            { icon:'↩️', label:'Rolled Back', val:rolledBack, color:'#dc2626' },
          ].map((s,i) => (
            <div key={i} style={{ ...S.card, padding:'16px 20px', animation:`fadeUp 0.3s ${i*0.05}s ease both` }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
              <div style={{ fontSize:26, fontWeight:800, color:s.color, letterSpacing:'-1px' }}>{s.val}</div>
              <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:20 }}>
          {[
            { key:'overview', label:`📋 Overview (${activeCRs.length})` },
            { key:'new_cr', label:'✏️ New CR' },
            { key:'risk_matrix', label:'📊 Risk Matrix' },
            { key:'deployments', label:`🚀 Deployments (${deployments.length})` },
            { key:'analysis', label:`📈 Analysis (${analyses.length})` },
            { key:'calendar', label:'📅 Calendar' },
            { key:'architect', label:'🛠️ Technical Architect' },
          ].map(t => (
            <button key={t.key} className={`ci-tab${tab===t.key?' active':''}`} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        {/* ══ TECHNICAL ARCHITECT ══ */}
        {tab === 'architect' && (
          <div style={{ ...S.card, padding:28 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🛠️</div>
              <div>
                <h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>AI Technical Architect</h2>
                <p style={{ margin:0, fontSize:12, color:'#6b7280' }}>Paste a BRD or a developer's high-level prompt to get exact technical designs and code suggestions.</p>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:16 }}>
              <div>
                <div style={{ display:'flex', gap:10, marginBottom:10 }}>
                  <button className={`ci-tab ${form.architect_context==='developer_prompt'?'active':''}`} onClick={()=>setForm({...form, architect_context:'developer_prompt'})}>👨‍💻 Developer Prompt</button>
                  <button className={`ci-tab ${form.architect_context==='brd'?'active':''}`} onClick={()=>setForm({...form, architect_context:'brd'})}>📂 BRD Analysis</button>
                </div>
                <textarea className="ci-input" style={{ ...S.input, minHeight:150, resize:'vertical' }}
                  placeholder={form.architect_context==='brd' ? 'Paste your BRD text here...' : 'e.g., Integrate multi-currency support into our payment gateway using Stripe...'}
                  value={form.architect_prompt} onChange={e => setForm({...form, architect_prompt: e.target.value})} />
              </div>

              <button style={S.btn('#7c3aed')} className="ci-btn" disabled={!form.architect_prompt || creating} onClick={async () => {
                setCreating(true)
                try {
                  const res = await fetch('/api/cr-technical-design', {
                    method:'POST',
                    headers:{'Content-Type':'application/json'},
                    body: JSON.stringify({ prompt: form.architect_prompt, context: form.architect_context || 'developer_prompt' })
                  })
                  const data = await res.json()
                  if(data.success) setForm({...form, architect_result: data.design})
                } catch(e) { console.error(e) }
                setCreating(false)
              }}>
                {creating ? '⏳ Architecting Implementation...' : '🧠 Generate Technical Design & Code'}
              </button>
            </div>

            {form.architect_result && (
              <div style={{ marginTop:24, animation:'fadeUp 0.3s ease both' }}>
                <h3 style={{ fontSize:15, fontWeight:700, color:'#2563eb', marginBottom:12 }}>💡 Technical Implementation Plan</h3>
                <div style={{ background:'#f8fafc', padding:20, borderRadius:10, border:'1px solid #e5e7eb' }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:10 }}>{form.architect_result.summary}</p>
                  
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>Architecture Decision</div>
                      <div style={{ fontSize:12, color:'#374151' }}>{form.architect_result.architecture_decision}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>DB Migrations</div>
                      {form.architect_result.db_changes?.map((m,i)=>(<div key={i} style={{fontSize:11, color:'#059669', marginBottom:2}}>• {m}</div>))}
                    </div>
                  </div>

                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>API Schema Changes</div>
                    {form.architect_result.api_changes?.map((api,i)=>(<div key={i} style={{fontSize:11, color:'#7c3aed', marginBottom:2}}>⚡ {api}</div>))}
                  </div>

                  <div>
                    <div style={{ fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', marginBottom:12 }}>Implementation Code</div>
                    {form.architect_result.code_snippets?.map((snippet,i)=>(
                      <div key={i} style={{ marginBottom:20 }}>
                        <div style={{ fontSize:11, color:'#6b7280', marginBottom:4 }}>File: <code>{snippet.file}</code></div>
                        <pre style={{ background:'#0f172a', color:'#38bdf8', padding:16, borderRadius:10, fontSize:12, overflowX:'auto' }}>
                          {snippet.code}
                        </pre>
                        <div style={{ fontSize:11, color:'#64748b', marginTop:4 }}>{snippet.explanation}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                     <div>
                       <div style={{ fontSize:11, fontWeight:600, color:'#dc2626', textTransform:'uppercase', marginBottom:6 }}>Security Considerations</div>
                       {form.architect_result.security_considerations?.map((s,i)=>(<div key={i} style={{fontSize:11, color:'#dc2626', marginBottom:2}}>⚠️ {s}</div>))}
                     </div>
                     <div>
                       <div style={{ fontSize:11, fontWeight:600, color:'#059669', textTransform:'uppercase', marginBottom:6 }}>Verification Steps</div>
                       {form.architect_result.test_cases?.map((t,i)=>(<div key={i} style={{fontSize:11, color:'#059669', marginBottom:2}}>✅ {t}</div>))}
                     </div>
                  </div>
                </div>

                <div style={{ marginTop:20, display:'flex', gap:10 }}>
                   <button style={S.btn('#2563eb')} className="ci-btn" onClick={()=>{
                     setForm({
                       ...form,
                       brief_description: form.architect_result.summary,
                       affected_services: form.architect_result.api_changes?.join(', '),
                       affected_environments: 'production',
                       category: 'application'
                     })
                     setTab('new_cr')
                   }}>Convert this Design to CR →</button>
                   <button style={S.btnOutline} onClick={()=>setForm({...form, architect_result:null})}>ClearResult</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ OVERVIEW ══ */}
        {tab === 'overview' && (
          <div>
            <div style={{ ...S.card, overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:14, fontWeight:700 }}>All Change Requests</span>
                <span style={{ fontSize:12, color:'#6b7280' }}>{crs.length} total</span>
              </div>
              {crs.length === 0 ? (
                <div style={{ padding:60, textAlign:'center' }}>
                  <div style={{ fontSize:48, marginBottom:12, opacity:0.3 }}>📋</div>
                  <div style={{ fontSize:15, fontWeight:600, color:'#6b7280', marginBottom:8 }}>No Change Requests Yet</div>
                  <div style={{ fontSize:13, color:'#9ca3af', marginBottom:16 }}>Create your first AI-powered change request</div>
                  <button style={S.btn()} className="ci-btn" onClick={() => setTab('new_cr')}>+ Create CR</button>
                </div>
              ) : crs.map(cr => {
                const rc = RISK_COLORS[cr.risk_level] || RISK_COLORS.medium
                const sc = STATUS_COLORS[cr.status] || STATUS_COLORS.draft
                return (
                  <div key={cr.id} className="ci-cr-row" onClick={() => setSelectedCR(selectedCR?.id === cr.id ? null : cr)}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                          <span style={{ fontSize:12, fontWeight:700, color:'#d97706', fontFamily:'monospace' }}>{cr.cr_number}</span>
                          <span style={S.badge(sc.color, sc.bg)}>{sc.label}</span>
                          <span style={S.badge(rc.color, rc.bg)}>{rc.icon} {cr.risk_level}</span>
                          {cr.ai_risk_score > 0 && <span style={{ fontSize:11, color:'#6b7280' }}>Risk: {cr.ai_risk_score}/100</span>}
                        </div>
                        <div style={{ fontSize:14, fontWeight:600, color:'#111827' }}>{cr.title}</div>
                        {cr.ai_summary && <div style={{ fontSize:12, color:'#6b7280', marginTop:4 }}>{cr.ai_summary}</div>}
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0, marginLeft:16 }}>
                        <div style={{ fontSize:11, color:'#9ca3af' }}>{new Date(cr.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}</div>
                        <div style={{ fontSize:11, color:'#9ca3af' }}>{cr.category}</div>
                      </div>
                    </div>

                    {/* Risk bar */}
                    {cr.ai_risk_score > 0 && (
                      <div className="ci-risk-bar" style={{ marginBottom:8 }}>
                        <div className="ci-risk-fill" style={{ width:`${cr.ai_risk_score}%`, background: cr.ai_risk_score>70?'#dc2626':cr.ai_risk_score>40?'#d97706':'#16a34a' }} />
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }} onClick={e => e.stopPropagation()}>
                      {cr.status === 'draft' && <button style={S.btnOutline} onClick={() => updateCRStatus(cr.id, 'pending_review')}>Submit for Review</button>}
                      {cr.status === 'pending_review' && <button style={{ ...S.btnOutline, borderColor:'#16a34a', color:'#16a34a' }} onClick={() => updateCRStatus(cr.id, 'approved')}>✓ Approve</button>}
                      {cr.status === 'pending_review' && <button style={{ ...S.btnOutline, borderColor:'#dc2626', color:'#dc2626' }} onClick={() => updateCRStatus(cr.id, 'rejected')}>✗ Reject</button>}
                      {['approved','scheduled'].includes(cr.status) && (
                        <button style={S.btn('#7c3aed')} className="ci-btn" disabled={deployingCR===cr.id} onClick={() => startDeploy(cr.id)}>
                          {deployingCR===cr.id ? '⏳ Starting...' : '🚀 Start Deployment'}
                        </button>
                      )}
                      <button style={S.btnOutline} disabled={riskAnalyzing===cr.id} onClick={() => runRiskAnalysis(cr.id)}>
                        {riskAnalyzing===cr.id ? '⏳ Analyzing...' : '🧠 AI Risk Analysis'}
                      </button>
                      <button style={S.btnOutline} disabled={conflictChecking===cr.id} onClick={() => checkConflicts(cr.id)}>
                        {conflictChecking===cr.id ? '⏳ Checking...' : '🔍 Check Conflicts'}
                      </button>
                      {['deployed','rolled_back','closed'].includes(cr.status) && (
                        <button style={S.btnOutline} disabled={generatingAnalysis===cr.id} onClick={() => generatePostAnalysis(cr.id)}>
                          {generatingAnalysis===cr.id ? '⏳ Generating...' : '📈 Post Analysis'}
                        </button>
                      )}
                    </div>

                    {/* Expanded detail panel */}
                    {selectedCR?.id === cr.id && (
                      <div style={{ marginTop:16, padding:16, background:'#f8fafc', borderRadius:10, border:'1px solid #e5e7eb' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                          <div>
                            <div style={{ fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>Description</div>
                            <div style={{ fontSize:13, color:'#374151', lineHeight:1.6 }}>{cr.description || '—'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>AI Risk Reasoning</div>
                            <div style={{ fontSize:13, color:'#374151', lineHeight:1.6 }}>{cr.ai_risk_reasoning || '—'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>Rollback Plan</div>
                            <div style={{ fontSize:13, color:'#374151', lineHeight:1.6 }}>{cr.rollback_plan || '—'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>Affected Services</div>
                            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                              {(cr.affected_services || []).map((s,i) => <span key={i} style={S.badge('#2563eb','#eff6ff')}>{s}</span>)}
                              {(!cr.affected_services || cr.affected_services.length === 0) && <span style={{ fontSize:12, color:'#9ca3af' }}>—</span>}
                            </div>
                          </div>
                          {cr.ai_recommended_window && (
                            <div>
                              <div style={{ fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>AI Recommended Window</div>
                              <div style={{ fontSize:13, color:'#059669', fontWeight:600 }}>🕐 {cr.ai_recommended_window}</div>
                            </div>
                          )}
                          {cr.implementation_steps && cr.implementation_steps.length > 0 && (
                            <div>
                              <div style={{ fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>Implementation Steps</div>
                              {cr.implementation_steps.map((step, i) => (
                                <div key={i} style={{ fontSize:12, color:'#374151', marginBottom:4 }}>
                                  <span style={{ fontWeight:700, color:'#2563eb' }}>Step {step.step}:</span> {step.description}
                                  <span style={{ color:'#9ca3af' }}> ({step.duration_min}min)</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Conflict Results Modal */}
            {conflictResults && (
              <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }} onClick={() => setConflictResults(null)}>
                <div style={{ ...S.card, width:600, maxHeight:'80vh', overflow:'auto', padding:24 }} onClick={e => e.stopPropagation()}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                    <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>🔍 Conflict Analysis</h3>
                    <button style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'#6b7280' }} onClick={() => setConflictResults(null)}>✕</button>
                  </div>
                  <div style={{ ...S.badge(
                    conflictResults.overall_conflict_level === 'none' ? '#16a34a' : conflictResults.overall_conflict_level === 'critical' ? '#dc2626' : '#d97706',
                    conflictResults.overall_conflict_level === 'none' ? '#f0fdf4' : conflictResults.overall_conflict_level === 'critical' ? '#fef2f2' : '#fffbeb'
                  ), marginBottom:12 }}>
                    Level: {conflictResults.overall_conflict_level?.toUpperCase()}
                  </div>
                  <p style={{ fontSize:13, color:'#374151', marginBottom:16 }}>{conflictResults.summary}</p>
                  {(conflictResults.conflicts || []).length === 0 ? (
                    <div style={{ textAlign:'center', padding:20 }}>
                      <div style={{ fontSize:36 }}>✅</div>
                      <div style={{ fontSize:14, color:'#16a34a', fontWeight:600 }}>No conflicts detected!</div>
                    </div>
                  ) : conflictResults.conflicts.map((c, i) => (
                    <div key={i} style={{ padding:12, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, marginBottom:8 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#dc2626', marginBottom:4 }}>{c.conflict_type?.replace(/_/g,' ').toUpperCase()}</div>
                      <div style={{ fontSize:12, color:'#374151', marginBottom:6 }}>{c.description}</div>
                      <div style={{ fontSize:12, color:'#059669' }}>💡 {c.recommendation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ NEW CR ══ */}
        {tab === 'new_cr' && (
          <div style={{ ...S.card, padding:28 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#2563eb,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>✏️</div>
              <div>
                <h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>AI-Powered Change Request</h2>
                <p style={{ margin:0, fontSize:12, color:'#6b7280' }}>Describe your change — AI will generate the full CR document, risk analysis, and rollback plan</p>
              </div>
            </div>

            {/* AI indicator */}
            {aiGenerating && (
              <div style={{ padding:16, background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:20, height:20, borderRadius:'50%', border:'3px solid #bfdbfe', borderTopColor:'#2563eb', animation:'spin 0.7s linear infinite' }} />
                <span style={{ fontSize:13, color:'#2563eb', fontWeight:600 }}>AI is generating your CR document, risk analysis, and rollback plan...</span>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:6, display:'block' }}>What change do you want to make? *</label>
                <textarea className="ci-input" style={{ ...S.input, minHeight:100, resize:'vertical' }}
                  placeholder="e.g., Upgrade payment gateway SDK from v3.2 to v4.0 across all production servers..."
                  value={form.brief_description} onChange={e => setForm({...form, brief_description: e.target.value})} />
              </div>

              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:6, display:'block' }}>Category</label>
                <select className="ci-input" style={S.input} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:6, display:'block' }}>Change Type</label>
                <select className="ci-input" style={S.input} value={form.change_type} onChange={e => setForm({...form, change_type: e.target.value})}>
                  <option value="standard">Standard</option>
                  <option value="normal">Normal</option>
                  <option value="emergency">Emergency</option>
                  <option value="expedited">Expedited</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:6, display:'block' }}>Affected Services (comma-separated)</label>
                <input className="ci-input" style={S.input} placeholder="e.g., Payment Gateway, BSE API, User Auth"
                  value={form.affected_services} onChange={e => setForm({...form, affected_services: e.target.value})} />
              </div>

              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:6, display:'block' }}>Environment</label>
                <select className="ci-input" style={S.input} value={form.affected_environments} onChange={e => setForm({...form, affected_environments: e.target.value})}>
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:6, display:'block' }}>Planned Start</label>
                <input className="ci-input" type="datetime-local" style={S.input}
                  value={form.planned_start} onChange={e => setForm({...form, planned_start: e.target.value})} />
              </div>

              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:6, display:'block' }}>Planned End</label>
                <input className="ci-input" type="datetime-local" style={S.input}
                  value={form.planned_end} onChange={e => setForm({...form, planned_end: e.target.value})} />
              </div>
            </div>

            <div style={{ marginTop:24, display:'flex', gap:10 }}>
              <button style={S.btn()} className="ci-btn" disabled={!form.brief_description || creating} onClick={createCR}>
                {creating ? '⏳ AI Generating CR...' : '🧠 Generate CR with AI'}
              </button>
              <button style={S.btnOutline} onClick={() => setTab('overview')}>Cancel</button>
            </div>

            {/* Info box */}
            <div style={{ marginTop:20, padding:16, background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#059669', marginBottom:6 }}>🧠 What AI Does Automatically:</div>
              <div style={{ fontSize:12, color:'#374151', lineHeight:1.8 }}>
                ▸ Generates full professional CR document from your brief description<br/>
                ▸ Scores risk across 8 dimensions (complexity, blast radius, rollback difficulty...)<br/>
                ▸ Creates step-by-step implementation plan with rollback steps<br/>
                ▸ Writes rollback plan, testing plan, and communication plan<br/>
                ▸ Recommends optimal deployment window<br/>
                ▸ Detects conflicts with all active/scheduled CRs
              </div>
            </div>
          </div>
        )}

        {/* ══ RISK MATRIX ══ */}
        {tab === 'risk_matrix' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
              {['critical','high','medium','low'].map(level => {
                const rc = RISK_COLORS[level]
                const count = crs.filter(c => c.risk_level === level).length
                return (
                  <div key={level} style={{ ...S.card, padding:20, borderLeft:`4px solid ${rc.color}` }}>
                    <div style={{ fontSize:11, fontWeight:600, color:rc.color, textTransform:'uppercase', marginBottom:8 }}>{rc.icon} {level} RISK</div>
                    <div style={{ fontSize:28, fontWeight:800, color:rc.color }}>{count}</div>
                    <div style={{ fontSize:11, color:'#6b7280' }}>change requests</div>
                  </div>
                )
              })}
            </div>

            <div style={{ ...S.card, overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid #f3f4f6' }}>
                <span style={{ fontSize:14, fontWeight:700 }}>Risk Assessment Matrix</span>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#f9fafb' }}>
                    {['CR #','Title','Category','Risk','Score','Status','Confidence',''].map(h => (
                      <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', borderBottom:'1px solid #f3f4f6' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {crs.filter(c => c.ai_risk_score > 0).sort((a,b) => (b.ai_risk_score||0) - (a.ai_risk_score||0)).map(cr => {
                    const rc = RISK_COLORS[cr.risk_level] || RISK_COLORS.medium
                    const sc = STATUS_COLORS[cr.status] || STATUS_COLORS.draft
                    return (
                      <tr key={cr.id} style={{ borderBottom:'1px solid #f3f4f6' }}>
                        <td style={{ padding:'12px 16px', fontSize:12, fontWeight:700, color:'#d97706', fontFamily:'monospace' }}>{cr.cr_number}</td>
                        <td style={{ padding:'12px 16px', fontSize:13, maxWidth:250, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cr.title}</td>
                        <td style={{ padding:'12px 16px', fontSize:12, color:'#6b7280' }}>{cr.category}</td>
                        <td style={{ padding:'12px 16px' }}><span style={S.badge(rc.color, rc.bg)}>{rc.icon} {cr.risk_level}</span></td>
                        <td style={{ padding:'12px 16px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:60 }} className="ci-risk-bar"><div className="ci-risk-fill" style={{ width:`${cr.ai_risk_score}%`, background:rc.color }}/></div>
                            <span style={{ fontSize:13, fontWeight:700, color:rc.color }}>{cr.ai_risk_score}</span>
                          </div>
                        </td>
                        <td style={{ padding:'12px 16px' }}><span style={S.badge(sc.color, sc.bg)}>{sc.label}</span></td>
                        <td style={{ padding:'12px 16px', fontSize:12, color:'#6b7280' }}>{cr.ai_confidence}%</td>
                        <td style={{ padding:'12px 16px' }}>
                          <button style={S.btnOutline} disabled={riskAnalyzing===cr.id} onClick={() => runRiskAnalysis(cr.id)}>
                            {riskAnalyzing===cr.id ? '⏳' : '🔄 Re-analyze'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {crs.filter(c => c.ai_risk_score > 0).length === 0 && (
                <div style={{ padding:60, textAlign:'center' }}>
                  <div style={{ fontSize:48, opacity:0.3 }}>📊</div>
                  <div style={{ fontSize:14, color:'#6b7280', marginTop:12 }}>No risk analyses yet. Create a CR to see AI risk scoring.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ DEPLOYMENTS ══ */}
        {tab === 'deployments' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {deployments.length === 0 ? (
              <div style={{ ...S.card, padding:60, textAlign:'center' }}>
                <div style={{ fontSize:48, marginBottom:12, opacity:0.3 }}>🚀</div>
                <div style={{ fontSize:15, fontWeight:600, color:'#6b7280' }}>No deployments yet</div>
                <div style={{ fontSize:13, color:'#9ca3af', marginTop:4 }}>Deploy an approved CR to see live monitoring here</div>
              </div>
            ) : deployments.map(d => {
              const isActive = ['deploying','monitoring'].includes(d.status)
              const isFailed = ['rolling_back','rolled_back','failed'].includes(d.status)
              const statusColor = isFailed ? '#dc2626' : d.status==='completed' ? '#16a34a' : isActive ? '#2563eb' : '#6b7280'
              return (
                <div key={d.id} style={{ ...S.card, padding:20, borderLeft:`4px solid ${statusColor}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <div>
                      <span style={{ fontSize:12, fontWeight:700, color:'#d97706', fontFamily:'monospace' }}>{d.change_requests?.cr_number || '—'}</span>
                      <span style={{ fontSize:14, fontWeight:600, marginLeft:10 }}>{d.change_requests?.title || '—'}</span>
                    </div>
                    <span style={S.badge(statusColor, isFailed?'#fef2f2':d.status==='completed'?'#f0fdf4':'#eff6ff')}>
                      {d.status?.replace(/_/g,' ').toUpperCase()}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#6b7280', marginBottom:4 }}>
                      <span>Progress: {d.phase?.replace(/_/g,' ')}</span>
                      <span>{d.progress}%</span>
                    </div>
                    <div style={{ height:6, borderRadius:3, background:'#e5e7eb' }}>
                      <div style={{ height:'100%', borderRadius:3, background: statusColor, width:`${d.progress}%`, transition:'width 0.3s' }} />
                    </div>
                  </div>

                  {/* Metrics */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                    <div style={{ padding:10, background:'#f8fafc', borderRadius:8 }}>
                      <div style={{ fontSize:10, color:'#6b7280' }}>Error Rate</div>
                      <div style={{ fontSize:16, fontWeight:700, color: (d.error_rate_during||0)>5?'#dc2626':'#16a34a' }}>{d.error_rate_during||0}%</div>
                    </div>
                    <div style={{ padding:10, background:'#f8fafc', borderRadius:8 }}>
                      <div style={{ fontSize:10, color:'#6b7280' }}>Latency</div>
                      <div style={{ fontSize:16, fontWeight:700, color:'#374151' }}>{d.latency_during_ms||0}ms</div>
                    </div>
                    <div style={{ padding:10, background:'#f8fafc', borderRadius:8 }}>
                      <div style={{ fontSize:10, color:'#6b7280' }}>Health Score</div>
                      <div style={{ fontSize:16, fontWeight:700, color: (d.health_score||0)<60?'#dc2626':(d.health_score||0)<80?'#d97706':'#16a34a' }}>{d.health_score||100}</div>
                    </div>
                    <div style={{ padding:10, background:'#f8fafc', borderRadius:8 }}>
                      <div style={{ fontSize:10, color:'#6b7280' }}>Auto-Rollback</div>
                      <div style={{ fontSize:16, fontWeight:700, color: d.auto_rollback_triggered?'#dc2626':'#16a34a' }}>{d.auto_rollback_triggered?'YES':'NO'}</div>
                    </div>
                  </div>

                  {d.auto_rollback_triggered && (
                    <div style={{ marginTop:10, padding:10, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, fontSize:12, color:'#dc2626' }}>
                      🚨 <strong>Auto-Rollback:</strong> {d.rollback_reason}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ══ ANALYSIS ══ */}
        {tab === 'analysis' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {analyses.length === 0 ? (
              <div style={{ ...S.card, padding:60, textAlign:'center' }}>
                <div style={{ fontSize:48, marginBottom:12, opacity:0.3 }}>📈</div>
                <div style={{ fontSize:15, fontWeight:600, color:'#6b7280' }}>No post-deployment analyses yet</div>
                <div style={{ fontSize:13, color:'#9ca3af', marginTop:4 }}>Complete a deployment then generate AI analysis</div>
              </div>
            ) : analyses.map(a => {
              const verdictColor = a.overall_verdict==='success'?'#16a34a':a.overall_verdict==='failure'?'#dc2626':'#d97706'
              return (
                <div key={a.id} style={{ ...S.card, padding:24 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                    <div>
                      <span style={{ fontWeight:700, color:'#d97706', fontFamily:'monospace', fontSize:12 }}>{a.change_requests?.cr_number}</span>
                      <span style={{ fontWeight:600, marginLeft:8, fontSize:14 }}>{a.change_requests?.title}</span>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <span style={S.badge(verdictColor, verdictColor==='#16a34a'?'#f0fdf4':'#fef2f2')}>{a.overall_verdict?.replace(/_/g,' ').toUpperCase()}</span>
                      <span style={{ fontSize:20, fontWeight:800, color:verdictColor }}>{a.success_score}/100</span>
                    </div>
                  </div>
                  <div style={{ fontSize:13, color:'#374151', lineHeight:1.7, marginBottom:16 }}>{a.ai_summary}</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                    <div style={{ padding:14, background:'#f0fdf4', borderRadius:10, border:'1px solid #bbf7d0' }}>
                      <div style={{ fontSize:11, fontWeight:600, color:'#059669', marginBottom:6 }}>✅ What Went Well</div>
                      <div style={{ fontSize:12, color:'#374151', lineHeight:1.6 }}>{a.ai_what_went_well}</div>
                    </div>
                    <div style={{ padding:14, background:'#fef2f2', borderRadius:10, border:'1px solid #fecaca' }}>
                      <div style={{ fontSize:11, fontWeight:600, color:'#dc2626', marginBottom:6 }}>⚠️ What Could Improve</div>
                      <div style={{ fontSize:12, color:'#374151', lineHeight:1.6 }}>{a.ai_what_went_wrong}</div>
                    </div>
                  </div>
                  {a.ai_action_items && a.ai_action_items.length > 0 && (
                    <div style={{ marginTop:12 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:'#6b7280', marginBottom:6 }}>ACTION ITEMS</div>
                      {a.ai_action_items.map((item, i) => (
                        <div key={i} style={{ display:'flex', gap:8, padding:'6px 0', fontSize:12, borderBottom:'1px solid #f3f4f6' }}>
                          <span style={S.badge(item.priority==='high'?'#dc2626':'#2563eb', item.priority==='high'?'#fef2f2':'#eff6ff')}>{item.priority}</span>
                          <span style={{ color:'#374151', flex:1 }}>{item.action}</span>
                          <span style={{ color:'#6b7280' }}>{item.owner}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ══ CALENDAR ══ */}
        {tab === 'calendar' && (
          <div style={{ ...S.card, padding:24 }}>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>📅 Change Calendar</h3>
            {crs.filter(c => c.planned_start).length === 0 ? (
              <div style={{ textAlign:'center', padding:40 }}>
                <div style={{ fontSize:48, opacity:0.3 }}>📅</div>
                <div style={{ fontSize:14, color:'#6b7280', marginTop:12 }}>No scheduled changes yet</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {crs.filter(c => c.planned_start).sort((a,b) => new Date(a.planned_start) - new Date(b.planned_start)).map(cr => {
                  const rc = RISK_COLORS[cr.risk_level] || RISK_COLORS.medium
                  const sc = STATUS_COLORS[cr.status] || STATUS_COLORS.draft
                  const isPast = new Date(cr.planned_start) < new Date()
                  return (
                    <div key={cr.id} style={{ display:'flex', gap:16, padding:14, background:isPast?'#f9fafb':'#fff', border:'1px solid #e5e7eb', borderRadius:10, borderLeft:`4px solid ${rc.color}`, opacity:isPast?0.6:1 }}>
                      <div style={{ textAlign:'center', minWidth:60 }}>
                        <div style={{ fontSize:22, fontWeight:800, color:'#2563eb' }}>{new Date(cr.planned_start).getDate()}</div>
                        <div style={{ fontSize:11, color:'#6b7280' }}>{new Date(cr.planned_start).toLocaleDateString('en-IN',{month:'short'})}</div>
                        <div style={{ fontSize:10, color:'#9ca3af' }}>{new Date(cr.planned_start).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', gap:6, marginBottom:4 }}>
                          <span style={{ fontSize:12, fontWeight:700, color:'#d97706', fontFamily:'monospace' }}>{cr.cr_number}</span>
                          <span style={S.badge(sc.color, sc.bg)}>{sc.label}</span>
                          <span style={S.badge(rc.color, rc.bg)}>{rc.icon} {cr.risk_level}</span>
                        </div>
                        <div style={{ fontSize:13, fontWeight:600 }}>{cr.title}</div>
                        <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>{cr.category} · {cr.affected_environments}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

