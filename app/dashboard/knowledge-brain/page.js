'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

const CAT_COLORS = { Network:'#2563eb', Application:'#7c3aed', Database:'#d97706', Security:'#dc2626', Access:'#059669', Hardware:'#6b7280', Performance:'#ec4899', Other:'#9ca3af' }
const SKILL_C = { expert:'#16a34a', advanced:'#2563eb', intermediate:'#d97706', beginner:'#9ca3af' }
const STAT_C = { active:'#16a34a', needs_review:'#d97706', stale:'#dc2626', archived:'#6b7280' }
const REL_ICON = { fixes:'🔧', causes:'💥', related_to:'🔗', expert_in:'👤', recurring_pattern:'🔄', depends_on:'📌', supersedes:'⬆️' }

export default function KnowledgeBrainDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState({})
  const [articles, setArticles] = useState([])
  const [graph, setGraph] = useState([])
  const [skills, setSkills] = useState([])
  const [runs, setRuns] = useState([])
  const [messages, setMessages] = useState([])
  const [scanning, setScanning] = useState(false)
  const [scanStage, setScanStage] = useState('')
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [fixQuery, setFixQuery] = useState('')
  const [fixResults, setFixResults] = useState(null)
  const [findingFix, setFindingFix] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { user } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    await loadAll()
    setLoading(false)
  }

  async function loadAll() {
    const [statsR, articlesR, graphR, skillsR, runsR, msgsR] = await Promise.all([
      fetch('/api/knowledge-brain?type=stats').then(r => r.json()),
      fetch('/api/knowledge-brain?type=articles').then(r => r.json()),
      fetch('/api/knowledge-brain?type=graph').then(r => r.json()),
      fetch('/api/knowledge-brain?type=skills').then(r => r.json()),
      fetch('/api/knowledge-brain?type=runs').then(r => r.json()),
      fetch('/api/knowledge-brain?type=messages').then(r => r.json()),
    ])
    setStats(statsR.stats || {})
    setArticles(articlesR.articles || [])
    setGraph(graphR.edges || [])
    setSkills(skillsR.skills || [])
    setRuns(runsR.runs || [])
    setMessages(msgsR.messages || [])
  }

  async function runBrainScan() {
    setScanning(true)
    setScanStage('🔍 Collector Agent scanning resolved tickets...')
    try {
      setTimeout(() => setScanStage('🧠 Analysis Agent finding patterns & extracting knowledge...'), 4000)
      setTimeout(() => setScanStage('⚡ Action Agent creating KB articles & updating skill map...'), 9000)
      const res = await fetch('/api/knowledge-brain', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'full_scan' }),
      })
      const data = await res.json()
      if (data.success) {
        setScanStage('✅ Brain scan complete!')
        await loadAll()
        setTimeout(() => { setScanStage(''); setTab('articles') }, 2000)
      } else setScanStage(`❌ ${data.error}`)
    } catch (e) { setScanStage(`❌ ${e.message}`) }
    setScanning(false)
  }

  async function searchFix() {
    if (!fixQuery.trim()) return
    setFindingFix(true)
    try {
      const res = await fetch('/api/knowledge-brain', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recommend_fix', title: fixQuery, description: fixQuery }),
      })
      const data = await res.json()
      setFixResults(data.matches || [])
    } catch (e) { /* ignore */ }
    setFindingFix(false)
  }

  async function validateArticle(id) {
    await fetch('/api/knowledge-brain', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'active', last_validated_at: new Date().toISOString(), staleness_score: 0 }),
    })
    await loadAll()
  }

  const S = {
    page: { minHeight:'100vh', background:'#f8fafc', fontFamily:"'DM Sans',sans-serif", color:'#111827' },
    card: { background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' },
    badge: (c, bg) => ({ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:600, background:bg||c+'15', color:c, border:`1px solid ${c}30`, display:'inline-block' }),
    input: { width:'100%', padding:'10px 14px', background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', color:'#111827' },
    btn: (c='#2563eb') => ({ padding:'10px 20px', background:c, border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', transition:'all 0.15s' }),
    btnO: { padding:'8px 14px', background:'transparent', border:'1px solid #e5e7eb', borderRadius:8, color:'#374151', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:'inherit' },
  }

  if (loading) return (
    <div style={S.page}><GlobalNav title="Knowledge Brain" />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'80vh' }}>
        <div style={{ textAlign:'center' }}><div style={{ fontSize:48, marginBottom:12 }}>🧠</div>
        <div style={{ color:'#6b7280', fontSize:14 }}>Loading Knowledge Brain...</div></div>
      </div></div>
  )

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        * { box-sizing:border-box; }
        .kb-tab { padding:8px 16px; border-radius:8px; font-size:13px; font-weight:500; cursor:pointer; border:1px solid #e5e7eb; background:#fff; color:#6b7280; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .kb-tab:hover { border-color:#d1d5db; color:#374151; }
        .kb-tab.active { background:#f5f3ff; color:#7c3aed; border-color:#c4b5fd; font-weight:600; }
        .kb-row { padding:16px 20px; border-bottom:1px solid #f3f4f6; cursor:pointer; transition:background 0.1s; }
        .kb-row:hover { background:#f8fafc; }
        .kb-btn:hover { filter:brightness(0.9); transform:translateY(-1px); }
      `}</style>

      <GlobalNav title="Support Knowledge Brain" />

      <div style={{ maxWidth:1400, margin:'0 auto', padding:'28px 24px' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>🧠 Support Knowledge Brain</h1>
            <p style={{ color:'#6b7280', fontSize:13, margin:'4px 0 0' }}>Multi-Agent AI — Collector → Analysis → Action | Auto-learns from resolved tickets</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button style={S.btnO} onClick={loadAll}>↻ Refresh</button>
            <button style={S.btn('#7c3aed')} className="kb-btn" onClick={runBrainScan} disabled={scanning}>
              {scanning ? '⏳ Running...' : '🧠 Run Brain Scan'}
            </button>
          </div>
        </div>

        {/* Scan Progress */}
        {scanStage && (
          <div style={{ padding:16, background:'linear-gradient(135deg,#f5f3ff,#eff6ff)', border:'1px solid #c4b5fd', borderRadius:12, marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
            {scanning && <div style={{ width:24, height:24, borderRadius:'50%', border:'3px solid #c4b5fd', borderTopColor:'#7c3aed', animation:'spin 0.7s linear infinite' }} />}
            <div><div style={{ fontSize:14, color:'#7c3aed', fontWeight:700 }}>{scanStage}</div>
            <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>Agents communicate via message bus</div></div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:24 }}>
          {[
            { icon:'📚', label:'KB Articles', val:stats.total_articles||0, c:'#7c3aed' },
            { icon:'🎯', label:'Avg Confidence', val:`${stats.avg_confidence||0}%`, c:((stats.avg_confidence||0)>70)?'#16a34a':'#d97706' },
            { icon:'🔗', label:'Graph Edges', val:stats.total_edges||0, c:'#2563eb' },
            { icon:'👤', label:'Skill Maps', val:stats.total_skills||0, c:'#059669' },
            { icon:'📨', label:'Agent Messages', val:stats.total_messages||0, c:'#ec4899' },
            { icon:'⚠️', label:'Stale Articles', val:stats.stale_count||0, c:(stats.stale_count||0)>0?'#dc2626':'#16a34a' },
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
            { key:'articles', label:`📚 KB Articles (${articles.length})` },
            { key:'search', label:'🔍 Smart Fix Finder' },
            { key:'graph', label:`🔗 Knowledge Graph (${graph.length})` },
            { key:'skills', label:`👤 Engineer Skills (${skills.length})` },
            { key:'agents', label:'🤖 Agent Console' },
            { key:'runs', label:`📊 Scan History (${runs.length})` },
          ].map(t => (
            <button key={t.key} className={`kb-tab${tab===t.key?' active':''}`} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        {/* ═══ OVERVIEW ═══ */}
        {tab === 'overview' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {/* Agent Architecture */}
            <div style={{ ...S.card, padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 16px' }}>🤖 Multi-Agent Architecture</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[
                  { agent:'🔍 Collector Agent', desc:'Scans resolved tickets, extracts data, sends to Analysis', color:'#2563eb' },
                  { agent:'🧠 Analysis Agent', desc:'Finds patterns, clusters issues, extracts knowledge articles', color:'#7c3aed' },
                  { agent:'⚡ Action Agent', desc:'Creates KB articles, updates skills, builds knowledge graph', color:'#ec4899' },
                ].map((a,i) => (
                  <div key={i} style={{ padding:14, background:a.color+'08', border:`1px solid ${a.color}20`, borderRadius:10, borderLeft:`4px solid ${a.color}` }}>
                    <div style={{ fontSize:13, fontWeight:700, color:a.color }}>{a.agent}</div>
                    <div style={{ fontSize:12, color:'#6b7280', marginTop:4 }}>{a.desc}</div>
                    {i < 2 && <div style={{ textAlign:'center', fontSize:18, marginTop:8 }}>⬇️</div>}
                  </div>
                ))}
              </div>
            </div>
            {/* Recent Articles */}
            <div style={{ ...S.card, padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 16px' }}>📚 Recent Knowledge Articles</h3>
              {articles.length === 0 ? (
                <div style={{ padding:30, textAlign:'center' }}>
                  <div style={{ fontSize:36, opacity:0.3 }}>📚</div>
                  <div style={{ fontSize:13, color:'#6b7280', marginTop:8 }}>No articles yet. Run a Brain Scan to extract knowledge from resolved tickets.</div>
                </div>
              ) : articles.slice(0, 5).map(a => (
                <div key={a.id} className="kb-row" style={{ padding:'10px 0', borderBottom:'1px solid #f3f4f6' }} onClick={() => { setSelectedArticle(a); setTab('articles') }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <span style={{ fontSize:11, fontWeight:700, color:'#7c3aed', fontFamily:'monospace', marginRight:6 }}>{a.article_number}</span>
                      <span style={{ fontSize:13, fontWeight:600 }}>{a.title}</span>
                    </div>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <span style={S.badge(STAT_C[a.status]||'#6b7280')}>{a.status}</span>
                      <div style={{ width:30, height:30, borderRadius:'50%', background:(a.confidence_score||0)>70?'#16a34a':(a.confidence_score||0)>40?'#d97706':'#dc2626', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:800 }}>{a.confidence_score||0}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Category Distribution */}
            <div style={{ ...S.card, padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 16px' }}>📊 Knowledge by Category</h3>
              {(stats.categories || []).length === 0 ? (
                <div style={{ padding:20, textAlign:'center', color:'#9ca3af', fontSize:13 }}>No categories yet</div>
              ) : (stats.categories || []).map(cat => {
                const count = articles.filter(a => a.category === cat).length
                const pct = articles.length ? Math.round(count / articles.length * 100) : 0
                return (
                  <div key={cat} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                      <span style={{ color:'#374151' }}>{cat}</span>
                      <span style={{ fontWeight:700, color:CAT_COLORS[cat]||'#6b7280' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height:6, borderRadius:3, background:'#e5e7eb' }}>
                      <div style={{ height:'100%', borderRadius:3, background:CAT_COLORS[cat]||'#6b7280', width:`${pct}%`, transition:'width 0.5s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Top Engineers */}
            <div style={{ ...S.card, padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 16px' }}>👤 Top Engineers by Knowledge</h3>
              {skills.length === 0 ? (
                <div style={{ padding:20, textAlign:'center', color:'#9ca3af', fontSize:13 }}>No skill data yet</div>
              ) : skills.slice(0, 5).map((s, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f3f4f6' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{s.engineer_email}</div>
                    <div style={{ fontSize:11, color:'#6b7280' }}>{s.category} • {s.tickets_resolved} tickets</div>
                  </div>
                  <span style={S.badge(SKILL_C[s.skill_level]||'#6b7280')}>{s.skill_level}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ ARTICLES ═══ */}
        {tab === 'articles' && (
          <div style={{ display:'grid', gridTemplateColumns: selectedArticle ? '1fr 1fr' : '1fr', gap:16 }}>
            <div style={{ ...S.card, overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:14, fontWeight:700 }}>📚 Knowledge Articles</span>
                <span style={{ fontSize:12, color:'#6b7280' }}>{articles.length} total</span>
              </div>
              {articles.length === 0 ? (
                <div style={{ padding:60, textAlign:'center' }}>
                  <div style={{ fontSize:48, opacity:0.3 }}>📚</div>
                  <div style={{ fontSize:14, color:'#6b7280', marginTop:12 }}>No KB articles. Run a Brain Scan first.</div>
                  <button style={{ ...S.btn('#7c3aed'), marginTop:12 }} className="kb-btn" onClick={runBrainScan}>🧠 Run Brain Scan</button>
                </div>
              ) : articles.map(a => (
                <div key={a.id} className="kb-row" onClick={() => setSelectedArticle(a)}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:4 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:'#7c3aed', fontFamily:'monospace' }}>{a.article_number}</span>
                        <span style={S.badge(STAT_C[a.status]||'#6b7280')}>{a.status}</span>
                        {a.category && <span style={S.badge(CAT_COLORS[a.category]||'#6b7280')}>{a.category}</span>}
                      </div>
                      <div style={{ fontSize:13, fontWeight:600 }}>{a.title}</div>
                      {a.quick_fix && <div style={{ fontSize:12, color:'#059669', marginTop:4 }}>⚡ Quick fix: {a.quick_fix.substring(0, 80)}...</div>}
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0, marginLeft:12 }}>
                      <div style={{ width:34, height:34, borderRadius:'50%', background:(a.confidence_score||0)>70?'#16a34a':(a.confidence_score||0)>40?'#d97706':'#dc2626', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:800 }}>{a.confidence_score||0}</div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:10, color:'#9ca3af' }}>{a.source_ticket_count||0} tickets</div>
                        <div style={{ fontSize:10, color:'#9ca3af' }}>{a.times_used||0} used</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {selectedArticle && (
              <div style={{ ...S.card, padding:20, position:'sticky', top:20, maxHeight:'80vh', overflow:'auto' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>{selectedArticle.article_number}</h3>
                  <button style={S.btnO} onClick={() => setSelectedArticle(null)}>✕ Close</button>
                </div>
                <h2 style={{ fontSize:16, fontWeight:700, margin:'0 0 12px', lineHeight:1.4 }}>{selectedArticle.title}</h2>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
                  {selectedArticle.category && <span style={S.badge(CAT_COLORS[selectedArticle.category]||'#6b7280')}>{selectedArticle.category}</span>}
                  <span style={S.badge(STAT_C[selectedArticle.status]||'#6b7280')}>{selectedArticle.status}</span>
                  <span style={S.badge('#7c3aed')}>Confidence: {selectedArticle.confidence_score}%</span>
                </div>
                {[
                  { label:'🔴 Problem', content:selectedArticle.problem_description, bg:'#fef2f2', border:'#fecaca' },
                  { label:'🔍 Root Cause', content:selectedArticle.root_cause, bg:'#fffbeb', border:'#fde68a' },
                  { label:'✅ Solution Steps', content:selectedArticle.solution_steps, bg:'#f0fdf4', border:'#bbf7d0' },
                  { label:'⚡ Quick Fix', content:selectedArticle.quick_fix, bg:'#eff6ff', border:'#bfdbfe' },
                  { label:'🛡️ Prevention', content:selectedArticle.prevention_tips, bg:'#f5f3ff', border:'#c4b5fd' },
                ].map((section, i) => section.content && (
                  <div key={i} style={{ padding:14, background:section.bg, borderRadius:10, border:`1px solid ${section.border}`, marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>{section.label}</div>
                    <div style={{ fontSize:13, color:'#374151', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{section.content}</div>
                  </div>
                ))}
                {(selectedArticle.error_signatures || []).length > 0 && (
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#6b7280', marginBottom:6 }}>Error Signatures:</div>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {selectedArticle.error_signatures.map((e,i) => <span key={i} style={{ ...S.badge('#dc2626'), fontFamily:'monospace', fontSize:10 }}>{e}</span>)}
                    </div>
                  </div>
                )}
                {selectedArticle.status === 'needs_review' && (
                  <button style={{ ...S.btn('#16a34a'), marginTop:16, width:'100%' }} className="kb-btn" onClick={() => validateArticle(selectedArticle.id)}>✅ Validate & Mark Active</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ SMART FIX FINDER ═══ */}
        {tab === 'search' && (
          <div style={{ ...S.card, padding:28 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#059669,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🔍</div>
              <div>
                <h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>Smart Fix Finder</h2>
                <p style={{ margin:0, fontSize:12, color:'#6b7280' }}>Describe the issue → AI searches Knowledge Base for the best fix</p>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:20 }}>
              <input style={{ ...S.input, flex:1 }} placeholder="Describe the error or issue... e.g. 'Redis connection timeout on production'" value={fixQuery} onChange={e => setFixQuery(e.target.value)} onKeyDown={e => e.key==='Enter' && searchFix()} />
              <button style={S.btn('#059669')} className="kb-btn" onClick={searchFix} disabled={findingFix}>{findingFix ? '⏳...' : '🔍 Find Fix'}</button>
            </div>
            {fixResults && (
              <div>
                {fixResults.length === 0 ? (
                  <div style={{ padding:30, textAlign:'center', color:'#6b7280' }}>No matching KB articles found. Run a Brain Scan to build more knowledge.</div>
                ) : fixResults.map((m, i) => (
                  <div key={i} style={{ ...S.card, padding:16, marginBottom:12, borderLeft:`4px solid ${(m.relevance_score||0)>80?'#16a34a':(m.relevance_score||0)>50?'#d97706':'#dc2626'}`, animation:`fadeUp 0.3s ${i*0.1}s ease both` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:'#7c3aed', fontFamily:'monospace' }}>{m.article_number}</span>
                      <span style={S.badge((m.relevance_score||0)>80?'#16a34a':'#d97706')}>{m.relevance_score}% match</span>
                    </div>
                    <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>{m.article?.title}</div>
                    <div style={{ fontSize:12, color:'#6b7280', marginBottom:8 }}>{m.match_reason}</div>
                    {m.article?.quick_fix && (
                      <div style={{ padding:10, background:'#f0fdf4', borderRadius:8, border:'1px solid #bbf7d0' }}>
                        <div style={{ fontSize:10, fontWeight:600, color:'#059669', marginBottom:4 }}>⚡ QUICK FIX</div>
                        <div style={{ fontSize:13, color:'#374151', fontWeight:600 }}>{m.article.quick_fix}</div>
                      </div>
                    )}
                    {m.article?.solution_steps && (
                      <div style={{ padding:10, background:'#f8fafc', borderRadius:8, marginTop:8 }}>
                        <div style={{ fontSize:10, fontWeight:600, color:'#6b7280', marginBottom:4 }}>SOLUTION STEPS</div>
                        <div style={{ fontSize:12, color:'#374151', whiteSpace:'pre-wrap', lineHeight:1.7 }}>{m.article.solution_steps}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ KNOWLEDGE GRAPH ═══ */}
        {tab === 'graph' && (
          <div style={{ ...S.card, padding:20 }}>
            <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 16px' }}>🔗 Knowledge Graph — {graph.length} Connections</h3>
            {graph.length === 0 ? (
              <div style={{ padding:40, textAlign:'center' }}>
                <div style={{ fontSize:48, opacity:0.3 }}>🔗</div>
                <div style={{ fontSize:13, color:'#6b7280', marginTop:8 }}>No graph edges yet. Run a Brain Scan.</div>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10 }}>
                {graph.map((e, i) => {
                  const relColor = e.relationship === 'fixes' ? '#16a34a' : e.relationship === 'causes' ? '#dc2626' : e.relationship === 'recurring_pattern' ? '#d97706' : '#2563eb'
                  return (
                    <div key={i} style={{ padding:12, background:relColor+'08', border:`1px solid ${relColor}20`, borderRadius:10, animation:`fadeUp 0.3s ${i*0.02}s ease both` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                        <span style={{ fontSize:16 }}>{REL_ICON[e.relationship]||'🔗'}</span>
                        <span style={S.badge(relColor)}>{e.relationship}</span>
                        {e.weight > 1 && <span style={{ fontSize:10, color:'#6b7280' }}>×{e.weight}</span>}
                      </div>
                      <div style={{ fontSize:12, color:'#374151' }}>
                        <span style={{ fontWeight:600 }}>{e.source_label}</span>
                        <span style={{ color:'#9ca3af', margin:'0 4px' }}>→</span>
                        <span style={{ fontWeight:600 }}>{e.target_label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ ENGINEER SKILLS ═══ */}
        {tab === 'skills' && (
          <div style={{ ...S.card, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #f3f4f6' }}>
              <span style={{ fontSize:14, fontWeight:700 }}>👤 Engineer Skill Map — AI-Generated from Resolution History</span>
            </div>
            {skills.length === 0 ? (
              <div style={{ padding:60, textAlign:'center' }}>
                <div style={{ fontSize:48, opacity:0.3 }}>👤</div>
                <div style={{ fontSize:13, color:'#6b7280', marginTop:12 }}>No skill data. Run a Brain Scan to analyze engineer resolutions.</div>
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'#f9fafb' }}>
                  {['Engineer','Category','Level','Tickets','Specialties','Gaps'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', borderBottom:'1px solid #f3f4f6' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{skills.map(s => (
                  <tr key={s.id} style={{ borderBottom:'1px solid #f3f4f6' }}>
                    <td style={{ padding:'12px 14px', fontSize:13, fontWeight:600 }}>{s.engineer_email}</td>
                    <td style={{ padding:'12px 14px' }}><span style={S.badge(CAT_COLORS[s.category]||'#6b7280')}>{s.category}</span></td>
                    <td style={{ padding:'12px 14px' }}><span style={S.badge(SKILL_C[s.skill_level]||'#6b7280')}>{s.skill_level}</span></td>
                    <td style={{ padding:'12px 14px', fontSize:13, fontWeight:700 }}>{s.tickets_resolved}</td>
                    <td style={{ padding:'12px 14px' }}><div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>{(s.specialties||[]).map((sp,i) => <span key={i} style={{ ...S.badge('#059669'), fontSize:10 }}>{sp}</span>)}</div></td>
                    <td style={{ padding:'12px 14px' }}><div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>{(s.knowledge_gaps||[]).map((g,i) => <span key={i} style={{ ...S.badge('#dc2626'), fontSize:10 }}>{g}</span>)}</div></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        )}

        {/* ═══ AGENT CONSOLE ═══ */}
        {tab === 'agents' && (
          <div style={{ ...S.card, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #f3f4f6' }}>
              <span style={{ fontSize:14, fontWeight:700 }}>🤖 Agent Communication Bus — {messages.length} Messages</span>
            </div>
            {messages.length === 0 ? (
              <div style={{ padding:60, textAlign:'center' }}>
                <div style={{ fontSize:48, opacity:0.3 }}>🤖</div>
                <div style={{ fontSize:13, color:'#6b7280', marginTop:12 }}>No agent messages yet. Run a Brain Scan to see agents communicate.</div>
              </div>
            ) : messages.map(m => {
              const fromC = m.from_agent === 'collector' ? '#2563eb' : m.from_agent === 'analysis' ? '#7c3aed' : '#ec4899'
              const toC = m.to_agent === 'collector' ? '#2563eb' : m.to_agent === 'analysis' ? '#7c3aed' : '#ec4899'
              const stC = m.status === 'completed' ? '#16a34a' : m.status === 'failed' ? '#dc2626' : '#d97706'
              return (
                <div key={m.id} style={{ padding:'12px 20px', borderBottom:'1px solid #f3f4f6' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={S.badge(fromC)}>🔍 {m.from_agent}</span>
                      <span style={{ color:'#9ca3af' }}>→</span>
                      <span style={S.badge(toC)}>📨 {m.to_agent}</span>
                      <span style={{ fontSize:12, fontWeight:600, color:'#374151' }}>{m.message_type}</span>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <span style={S.badge(stC)}>{m.status}</span>
                      <span style={{ fontSize:11, color:'#9ca3af' }}>{new Date(m.created_at).toLocaleTimeString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ═══ SCAN HISTORY ═══ */}
        {tab === 'runs' && (
          <div style={{ ...S.card, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #f3f4f6' }}>
              <span style={{ fontSize:14, fontWeight:700 }}>📊 Brain Scan History</span>
            </div>
            {runs.length === 0 ? (
              <div style={{ padding:60, textAlign:'center' }}>
                <div style={{ fontSize:48, opacity:0.3 }}>📊</div>
                <div style={{ fontSize:13, color:'#6b7280', marginTop:12 }}>No scans yet. Click "Run Brain Scan" to begin.</div>
              </div>
            ) : runs.map(r => (
              <div key={r.id} style={{ padding:'16px 20px', borderBottom:'1px solid #f3f4f6' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span style={S.badge(r.status==='completed'?'#16a34a':r.status==='failed'?'#dc2626':'#d97706')}>{r.status}</span>
                    <span style={{ fontSize:12, color:'#6b7280' }}>{r.run_type}</span>
                  </div>
                  <span style={{ fontSize:11, color:'#9ca3af' }}>{new Date(r.created_at).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display:'flex', gap:16, fontSize:12, color:'#374151' }}>
                  <span>📋 {r.tickets_scanned} scanned</span>
                  <span>✨ {r.articles_created} created</span>
                  <span>📝 {r.articles_updated} updated</span>
                  <span>🔄 {r.patterns_found} patterns</span>
                  <span>👤 {r.skills_updated} skills</span>
                  <span>🔗 {r.graph_edges_created} edges</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

