'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../lib/supabase'
import GlobalNav from '../components/GlobalNav'

const CATEGORIES = [
  { key:'all',            icon:'📚', label:'All Articles' },
  { key:'account',        icon:'👤', label:'Account & Access' },
  { key:'network',        icon:'🌐', label:'Network & VPN' },
  { key:'email',          icon:'📧', label:'Email & Office' },
  { key:'hardware',       icon:'💻', label:'Hardware' },
  { key:'software',       icon:'💾', label:'Software' },
  { key:'security',       icon:'🔒', label:'Security' },
  { key:'infrastructure', icon:'🖥️', label:'Infrastructure' },
  { key:'howto',          icon:'📋', label:'How-To Guides' },
]

export default function KnowledgeBase() {
  const router   = useRouter()
  const supabase = createClient()

  const [profile,   setProfile]   = useState(null)
  const [articles,  setArticles]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [category,  setCategory]  = useState('all')
  const [selected,  setSelected]  = useState(null) // open article
  const [helpful,   setHelpful]   = useState({})   // articleId → true/false

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    setProfile(p)
    await loadArticles()
    setLoading(false)
  }

  async function loadArticles() {
    const { data } = await supabase
      .from('kb_articles')
      .select('id, title, slug, summary, content, category, tags, views, helpful_yes, helpful_no, author_name, is_featured, created_at, updated_at')
      .eq('is_published', true)
      .order('is_featured', { ascending: false })
      .order('views', { ascending: false })
    if (data) setArticles(data)
  }

  async function openArticle(article) {
    setSelected(article)
    // increment view count
    await supabase.from('kb_articles').update({ views: (article.views||0) + 1 }).eq('id', article.id)
    window.scrollTo({ top: 0, behavior:'smooth' })
  }

  async function markHelpful(articleId, isHelpful) {
    if (helpful[articleId] !== undefined) return // already voted
    const field = isHelpful ? 'helpful_yes' : 'helpful_no'
    const art   = articles.find(a => a.id === articleId)
    if (!art) return
    await supabase.from('kb_articles').update({ [field]: (art[field]||0) + 1 }).eq('id', articleId)
    setHelpful(prev => ({...prev, [articleId]: isHelpful}))
    setArticles(prev => prev.map(a => a.id===articleId ? {...a, [field]:(a[field]||0)+1} : a))
    if (selected?.id === articleId) setSelected(prev => ({...prev, [field]:(prev[field]||0)+1}))
  }

  const isAgent = ['ADMIN','IT_MANAGER','L1_AGENT','L2_AGENT','DEVELOPER'].includes(profile?.role)
  const isAdmin = ['ADMIN','IT_MANAGER'].includes(profile?.role)

  const filtered = articles.filter(a => {
    const matchCat    = category === 'all' || a.category === category
    const searchLower = search.toLowerCase()
    const matchSearch = !search ||
      a.title?.toLowerCase().includes(searchLower) ||
      a.summary?.toLowerCase().includes(searchLower) ||
      a.tags?.toLowerCase().includes(searchLower) ||
      a.content?.toLowerCase().includes(searchLower)
    return matchCat && matchSearch
  })

  const featured = articles.filter(a => a.is_featured).slice(0, 3)

  if (loading) return <Loader />

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        .acard:hover  { border-color:#3b82f640!important; transform:translateY(-2px); cursor:pointer; }
        .catbtn:hover { background:#1a2236!important; }
        .inp:focus    { border-color:#3b82f6!important; outline:none; }
        .back:hover   { color:#e2e8f0!important; }
        /* Article content styling */
        .kb-content h1,.kb-content h2,.kb-content h3 { color:#e2e8f0; margin:20px 0 10px; font-family:'Syne',sans-serif; }
        .kb-content h2 { font-size:18px; border-bottom:1px solid #1f2d45; padding-bottom:8px; }
        .kb-content h3 { font-size:15px; color:#60a5fa; }
        .kb-content p  { color:#94a3b8; line-height:1.8; margin:10px 0; }
        .kb-content ul,.kb-content ol { color:#94a3b8; line-height:1.8; padding-left:20px; }
        .kb-content li { margin:6px 0; }
        .kb-content code { background:#0f172a; color:#34d399; padding:2px 7px; border-radius:5px; font-size:12px; font-family:monospace; }
        .kb-content pre  { background:#0f172a; border:1px solid #1f2d45; border-radius:10px; padding:16px; overflow-x:auto; margin:14px 0; }
        .kb-content pre code { background:transparent; padding:0; color:#e2e8f0; }
        .kb-content strong { color:#e2e8f0; }
        .kb-content blockquote { border-left:3px solid #3b82f6; padding:10px 16px; margin:14px 0; background:#0f172a; border-radius:0 8px 8px 0; color:#64748b; }
        .kb-content a  { color:#60a5fa; }
        .kb-content hr { border:none; border-top:1px solid #1f2d45; margin:20px 0; }
      `}</style>

      <GlobalNav title="Knowledge Base" />

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 24px' }}>

        {/* ── Article Detail View ── */}
        {selected ? (
          <div style={{ animation:'fadeUp 0.3s ease' }}>
            {/* Back button */}
            <button className="back" onClick={() => setSelected(null)}
              style={{ display:'flex', alignItems:'center', gap:8, background:'transparent', border:'none', color:'#64748b', cursor:'pointer', fontSize:14, marginBottom:20, padding:0, transition:'color 0.2s' }}>
              ← Back to Knowledge Base
            </button>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:24, alignItems:'start' }}>
              {/* Article */}
              <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'28px 32px' }}>
                {/* Header */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'#1e3a5f', color:'#60a5fa', border:'1px solid #3b82f640' }}>
                      {CATEGORIES.find(c=>c.key===selected.category)?.icon} {CATEGORIES.find(c=>c.key===selected.category)?.label || selected.category}
                    </span>
                    {selected.is_featured && <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'#451a03', color:'#fbbf24', border:'1px solid #f59e0b40' }}>⭐ Featured</span>}
                  </div>
                  <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, marginBottom:12, lineHeight:1.4 }}>{selected.title}</h1>
                  <div style={{ display:'flex', gap:16, fontSize:12, color:'#475569' }}>
                    {selected.author_name && <span>✍️ {selected.author_name}</span>}
                    <span>👁️ {selected.views||0} views</span>
                    <span>🕒 {new Date(selected.updated_at||selected.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>
                  </div>
                </div>

                <hr style={{ border:'none', borderTop:'1px solid #1f2d45', margin:'20px 0' }}/>

                {/* Content */}
                <div className="kb-content" dangerouslySetInnerHTML={{ __html: markdownToHtml(selected.content||'') }}/>

                <hr style={{ border:'none', borderTop:'1px solid #1f2d45', margin:'24px 0' }}/>

                {/* Tags */}
                {selected.tags && (
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
                    {selected.tags.split(',').map(t => (
                      <span key={t} style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'#1e293b', color:'#475569' }}>#{t.trim()}</span>
                    ))}
                  </div>
                )}

                {/* Helpful */}
                <div style={{ background:'#0f172a', borderRadius:12, padding:'18px 20px', textAlign:'center' }}>
                  <p style={{ fontSize:14, color:'#94a3b8', marginBottom:14 }}>Was this article helpful?</p>
                  {helpful[selected.id] !== undefined ? (
                    <div style={{ fontSize:13, color:'#34d399' }}>
                      ✅ Thanks for your feedback!
                      <div style={{ fontSize:12, color:'#475569', marginTop:4 }}>
                        👍 {selected.helpful_yes||0} · 👎 {selected.helpful_no||0}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
                      <button onClick={() => markHelpful(selected.id, true)}
                        style={{ padding:'9px 24px', background:'#052e16', border:'1px solid #10b98130', borderRadius:10, color:'#34d399', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                        👍 Yes ({selected.helpful_yes||0})
                      </button>
                      <button onClick={() => markHelpful(selected.id, false)}
                        style={{ padding:'9px 24px', background:'#450a0a', border:'1px solid #ef444430', borderRadius:10, color:'#fca5a5', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                        👎 No ({selected.helpful_no||0})
                      </button>
                    </div>
                  )}
                </div>

                {/* Still need help */}
                <div style={{ background:'#1e1b4b', border:'1px solid #6366f130', borderRadius:12, padding:'16px 20px', marginTop:16, textAlign:'center' }}>
                  <p style={{ fontSize:13, color:'#94a3b8', marginBottom:10 }}>Still need help? Raise a support ticket.</p>
                  <button onClick={() => router.push('/tickets/new')}
                    style={{ padding:'9px 24px', background:'linear-gradient(135deg,#4f46e5,#6366f1)', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                    + Raise Ticket
                  </button>
                </div>
              </div>

              {/* Sidebar — Related */}
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, padding:'16px 18px' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#475569', textTransform:'uppercase', marginBottom:12 }}>📚 Related Articles</div>
                  {articles.filter(a => a.id !== selected.id && (a.category === selected.category || a.is_featured)).slice(0,5).map(a => (
                    <div key={a.id} onClick={() => openArticle(a)} style={{ padding:'10px 0', borderBottom:'1px solid #0f172a', cursor:'pointer' }}>
                      <div style={{ fontSize:12, color:'#94a3b8', lineHeight:1.5, transition:'color 0.15s' }} onMouseEnter={e=>e.target.style.color='#60a5fa'} onMouseLeave={e=>e.target.style.color='#94a3b8'}>{a.title}</div>
                      <div style={{ fontSize:10, color:'#334155', marginTop:3 }}>👁️ {a.views||0} views</div>
                    </div>
                  ))}
                  {articles.filter(a => a.id !== selected.id && (a.category === selected.category || a.is_featured)).length === 0 && (
                    <p style={{ fontSize:12, color:'#334155' }}>No related articles</p>
                  )}
                </div>

                {isAdmin && (
                  <button onClick={() => router.push(`/dashboard/kb-admin`)}
                    style={{ padding:'10px', background:'#451a03', border:'1px solid #f59e0b30', borderRadius:10, color:'#fbbf24', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                    ✏️ Edit in Admin
                  </button>
                )}
              </div>
            </div>
          </div>

        ) : (
          /* ── Article List View ── */
          <div>
            {/* Hero Search */}
            <div style={{ textAlign:'center', marginBottom:32, animation:'fadeUp 0.4s ease' }}>
              <div style={{ fontSize:44, marginBottom:10 }}>📚</div>
              <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, marginBottom:8 }}>
                Knowledge <span style={{ color:'#06b6d4' }}>Base</span>
              </h1>
              <p style={{ color:'#64748b', fontSize:14, marginBottom:20 }}>Find answers, guides and how-tos before raising a ticket</p>
              <div style={{ maxWidth:560, margin:'0 auto', position:'relative' }}>
                <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', fontSize:16, color:'#475569' }}>🔍</span>
                <input className="inp" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search articles... e.g. 'reset password', 'VPN not working'"
                  style={{ width:'100%', padding:'14px 16px 14px 44px', background:'#111827', border:'1px solid #1f2d45', borderRadius:14, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:14, boxSizing:'border-box' }}/>
              </div>
              <div style={{ marginTop:10, fontSize:12, color:'#334155' }}>{articles.length} articles available</div>
            </div>

            {/* Featured */}
            {!search && category === 'all' && featured.length > 0 && (
              <div style={{ marginBottom:28 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>⭐ Featured Articles</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
                  {featured.map((a,i) => (
                    <div key={a.id} className="acard" onClick={() => openArticle(a)}
                      style={{ background:'linear-gradient(135deg,#1e1b4b,#1e3a5f)', border:'1px solid #6366f130', borderRadius:14, padding:'18px 20px', transition:'all 0.2s', animation:`fadeUp 0.4s ${i*0.06}s ease both` }}>
                      <div style={{ fontSize:28, marginBottom:10 }}>{CATEGORIES.find(c=>c.key===a.category)?.icon||'📄'}</div>
                      <div style={{ fontSize:14, fontWeight:700, color:'#e2e8f0', marginBottom:6, lineHeight:1.4 }}>{a.title}</div>
                      <div style={{ fontSize:12, color:'#64748b', lineHeight:1.6, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{a.summary}</div>
                      <div style={{ fontSize:10, color:'#475569', marginTop:10 }}>👁️ {a.views||0} views · 👍 {a.helpful_yes||0}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:24 }}>
              {/* Category sidebar */}
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'#475569', textTransform:'uppercase', marginBottom:10 }}>Categories</div>
                {CATEGORIES.map(cat => {
                  const count = cat.key==='all' ? articles.length : articles.filter(a=>a.category===cat.key).length
                  return (
                    <button key={cat.key} className="catbtn" onClick={() => setCategory(cat.key)}
                      style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', borderRadius:10, fontSize:13, cursor:'pointer', border:'none', background:category===cat.key?'#1e3a5f':'transparent', color:category===cat.key?'#60a5fa':'#64748b', fontFamily:"'DM Sans',sans-serif", marginBottom:3, transition:'all 0.15s', textAlign:'left' }}>
                      <span>{cat.icon} {cat.label}</span>
                      <span style={{ fontSize:11, padding:'1px 6px', borderRadius:10, background:'#1f2d45', color:'#475569' }}>{count}</span>
                    </button>
                  )
                })}

                {isAdmin && (
                  <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid #1f2d45' }}>
                    <button onClick={() => router.push('/dashboard/kb-admin')}
                      style={{ width:'100%', padding:'10px', background:'#451a03', border:'1px solid #f59e0b30', borderRadius:10, color:'#fbbf24', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                      ⚙️ Manage Articles
                    </button>
                  </div>
                )}
              </div>

              {/* Articles grid */}
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <span style={{ fontSize:13, color:'#475569' }}>
                    {search ? `${filtered.length} results for "${search}"` : `${filtered.length} articles`}
                  </span>
                  {search && <button onClick={() => setSearch('')} style={{ fontSize:12, color:'#475569', background:'transparent', border:'none', cursor:'pointer' }}>✕ Clear</button>}
                </div>

                {filtered.length === 0 ? (
                  <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:48, textAlign:'center' }}>
                    <div style={{ fontSize:44, marginBottom:12 }}>🔍</div>
                    <p style={{ color:'#475569', marginBottom:16 }}>No articles found for "{search}"</p>
                    <button onClick={() => router.push('/tickets/new')}
                      style={{ padding:'10px 24px', background:'linear-gradient(135deg,#4f46e5,#6366f1)', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:13 }}>
                      + Raise a Ticket Instead
                    </button>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {filtered.map((a,i) => (
                      <div key={a.id} className="acard" onClick={() => openArticle(a)}
                        style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, padding:'16px 20px', transition:'all 0.2s', animation:`fadeUp 0.3s ${Math.min(i,5)*0.04}s ease both`, display:'flex', gap:16, alignItems:'flex-start' }}>
                        <div style={{ fontSize:28, flexShrink:0, marginTop:2 }}>{CATEGORIES.find(c=>c.key===a.category)?.icon||'📄'}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                            <span style={{ fontSize:14, fontWeight:700, color:'#e2e8f0' }}>{a.title}</span>
                            {a.is_featured && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:10, background:'#451a03', color:'#fbbf24' }}>⭐</span>}
                          </div>
                          <p style={{ fontSize:12, color:'#64748b', lineHeight:1.6, marginBottom:8, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{a.summary}</p>
                          <div style={{ display:'flex', gap:12, fontSize:11, color:'#334155', flexWrap:'wrap' }}>
                            <span>👁️ {a.views||0}</span>
                            <span>👍 {a.helpful_yes||0}</span>
                            <span>🕒 {new Date(a.updated_at||a.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span>
                            {a.tags && a.tags.split(',').slice(0,3).map(t => (
                              <span key={t} style={{ padding:'1px 7px', borderRadius:10, background:'#1e293b', color:'#475569' }}>#{t.trim()}</span>
                            ))}
                          </div>
                        </div>
                        <div style={{ fontSize:18, color:'#334155', flexShrink:0 }}>›</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Simple markdown to HTML converter
function markdownToHtml(md) {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2>$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`([^`]+)`/g,     '<code>$1</code>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/^> (.+)$/gm,    '<blockquote>$1</blockquote>')
    .replace(/^- (.+)$/gm,    '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm,'<li>$2</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, s => `<ul>${s}</ul>`)
    .replace(/^---$/gm,        '<hr/>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/\n\n/g,          '</p><p>')
    .replace(/^(?!<[hbuliproa])/gm, '')
    .replace(/(.+)/s, '<p>$1</p>')
}

function Loader() {
  return <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#06b6d4', animation:'spin 0.7s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}
