'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

const PRIORITY_OPTIONS = ['critical','high','medium','low']
const TEAM_OPTIONS     = ['L1','L2','DEVELOPER']
const PRIORITY_COLOR   = { critical:{bg:'#450a0a',c:'#ef4444'}, high:{bg:'#431407',c:'#f97316'}, medium:{bg:'#451a03',c:'#fbbf24'}, low:{bg:'#052e16',c:'#10b981'} }

const DEFAULT_TEMPLATES = [
  { name:'Password Reset',        icon:'🔑', priority:'low',      team:'L1', category:'Account Access', description:'User unable to login or forgot password', steps:'1. Verify user identity\n2. Reset password in AD\n3. Send temporary password\n4. Ask user to change on first login', tags:'password,login,access' },
  { name:'VPN Not Connecting',    icon:'🔒', priority:'high',     team:'L1', category:'Network',        description:'User unable to connect to company VPN', steps:'1. Check VPN client version\n2. Verify credentials\n3. Check firewall rules\n4. Restart VPN service if needed', tags:'vpn,network,remote' },
  { name:'Email Configuration',   icon:'📧', priority:'medium',   team:'L1', category:'Email',          description:'Setup or fix email client configuration', steps:'1. Verify email credentials\n2. Check mail server settings\n3. Configure IMAP/SMTP\n4. Test send/receive', tags:'email,outlook,smtp' },
  { name:'Software Installation', icon:'💾', priority:'medium',   team:'L1', category:'Software',       description:'Install or update software on user machine', steps:'1. Verify software license\n2. Download from approved source\n3. Install with admin rights\n4. Test functionality', tags:'software,install,update' },
  { name:'Laptop Not Starting',   icon:'💻', priority:'high',     team:'L1', category:'Hardware',       description:'User laptop not powering on or boot issue', steps:'1. Check power adapter\n2. Hard reset (hold power 10s)\n3. Check battery\n4. Escalate if hardware fault', tags:'laptop,hardware,boot' },
  { name:'Application Error',     icon:'⚠️', priority:'high',     team:'L2', category:'Application',    description:'Business application throwing errors', steps:'1. Collect error logs\n2. Check app server status\n3. Review recent deployments\n4. Escalate to Dev if code issue', tags:'app,error,bug' },
  { name:'Database Connection',   icon:'🗄️', priority:'critical', team:'DEVELOPER', category:'Database', description:'Application unable to connect to database', steps:'1. Check DB server status\n2. Verify connection string\n3. Check firewall/ports\n4. Review DB logs', tags:'database,connection,sql' },
  { name:'Server Down',           icon:'🖥️', priority:'critical', team:'L2', category:'Infrastructure', description:'Production server not responding', steps:'1. Ping server\n2. Check hosting console\n3. Review system logs\n4. Restart services if safe', tags:'server,infrastructure,down' },
]

export default function TicketTemplates() {
  const router   = useRouter()
  const supabase = createClient()

  const [templates, setTemplates] = useState([])
  const [categories,setCategories]= useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState('')
  const [search,    setSearch]    = useState('')
  const [showForm,  setShowForm]  = useState(false)
  const [editTpl,   setEditTpl]   = useState(null)
  const [confirm,   setConfirm]   = useState(null)

  const blankForm = { name:'', icon:'📋', priority:'medium', team:'L1', category:'', description:'', steps:'', tags:'', is_active:true }
  const [form, setForm] = useState(blankForm)

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    if (!['ADMIN','IT_MANAGER'].includes(p?.role)) { router.replace('/dashboard'); return }
    await Promise.all([loadTemplates(), loadCategories()])
    setLoading(false)
  }

  async function loadTemplates() {
    const { data } = await supabase.from('ticket_templates').select('*').order('created_at', { ascending:false })
    if (data) setTemplates(data)
  }

  async function loadCategories() {
    const { data } = await supabase.from('categories').select('id, name, icon').order('name')
    if (data) setCategories(data)
  }

  async function seedDefaults() {
    setSaving(true)
    for (const t of DEFAULT_TEMPLATES) {
      await supabase.from('ticket_templates').upsert({ ...t, is_active:true }, { onConflict:'name' })
    }
    await loadTemplates()
    setMsg('✅ Default templates loaded!')
    setTimeout(() => setMsg(''), 3000)
    setSaving(false)
  }

  function openNew() {
    setForm(blankForm); setEditTpl(null); setShowForm(true); setMsg('')
  }

  function openEdit(t) {
    setForm({ name:t.name, icon:t.icon||'📋', priority:t.priority, team:t.team, category:t.category||'', description:t.description||'', steps:t.steps||'', tags:t.tags||'', is_active:t.is_active!==false })
    setEditTpl(t); setShowForm(true); setMsg('')
  }

  async function saveTemplate() {
    if (!form.name.trim()) { setMsg('❌ Template name is required'); return }
    setSaving(true); setMsg('')
    try {
      const payload = { name:form.name.trim(), icon:form.icon, priority:form.priority, team:form.team, category:form.category, description:form.description, steps:form.steps, tags:form.tags, is_active:form.is_active }
      if (editTpl) {
        await supabase.from('ticket_templates').update(payload).eq('id', editTpl.id)
        setMsg('✅ Template updated!')
      } else {
        await supabase.from('ticket_templates').insert(payload)
        setMsg('✅ Template created!')
      }
      await loadTemplates()
      setShowForm(false)
    } catch(e) { setMsg('❌ ' + e.message) }
    setSaving(false)
  }

  async function deleteTemplate() {
    await supabase.from('ticket_templates').delete().eq('id', confirm.id)
    setTemplates(prev => prev.filter(t => t.id !== confirm.id))
    setConfirm(null)
    setMsg('✅ Template deleted!')
    setTimeout(() => setMsg(''), 3000)
  }

  async function toggleActive(t) {
    await supabase.from('ticket_templates').update({ is_active:!t.is_active }).eq('id', t.id)
    setTemplates(prev => prev.map(x => x.id===t.id ? {...x, is_active:!x.is_active} : x))
  }

  const shown = templates.filter(t => !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.tags?.toLowerCase().includes(search.toLowerCase()) || t.category?.toLowerCase().includes(search.toLowerCase()))

  const ICONS = ['📋','🔑','💻','📧','🔒','💾','⚠️','🗄️','🖥️','🌐','📱','🔧','⚙️','🛡️','📊','🔌','🖨️','📡']

  if (loading) return <Loader />

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .tcard:hover { border-color:#3b82f640!important; transform:translateY(-2px); }
        .inp:focus   { border-color:#3b82f6!important; outline:none; }
      `}</style>

      <GlobalNav title="Ticket Templates" />

      <div style={{ maxWidth:1300, margin:'0 auto', padding:'28px 24px' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:4 }}>📋 Ticket Templates</h1>
            <p style={{ color:'#64748b', fontSize:13 }}>Pre-defined templates for common IT issues — speeds up ticket creation</p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            {templates.length === 0 && (
              <button onClick={seedDefaults} disabled={saving}
                style={{ padding:'10px 18px', background:'#1e3a5f', border:'1px solid #3b82f640', borderRadius:10, color:'#60a5fa', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                {saving ? '⏳ Loading...' : '⚡ Load Defaults'}
              </button>
            )}
            <button onClick={openNew}
              style={{ padding:'10px 20px', background:'linear-gradient(135deg,#2563eb,#3b82f6)', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:14, fontWeight:600 }}>
              + New Template
            </button>
          </div>
        </div>

        {msg && <div style={{ padding:'12px 18px', borderRadius:10, marginBottom:16, background:msg.startsWith('✅')?'#052e16':'#450a0a', color:msg.startsWith('✅')?'#34d399':'#fca5a5', fontSize:13 }}>{msg}</div>}

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
          {[
            ['📋','Total',   templates.length,                              '#3b82f6','#1e3a5f'],
            ['✅','Active',  templates.filter(t=>t.is_active!==false).length,'#10b981','#052e16'],
            ['🎫','L1',      templates.filter(t=>t.team==='L1').length,      '#60a5fa','#1e3a5f'],
            ['⚠️','L2/Dev',  templates.filter(t=>t.team!=='L1').length,      '#8b5cf6','#2e1065'],
          ].map(([icon,label,val,color,bg],i) => (
            <div key={label} style={{ background:'#111827', border:`1px solid ${color}30`, borderRadius:14, padding:'14px 18px', animation:`fadeUp 0.4s ${i*0.05}s ease both` }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{icon}</div>
              <div style={{ fontSize:22, fontWeight:700, color, fontFamily:"'Syne',sans-serif" }}>{val}</div>
              <div style={{ fontSize:11, color:'#64748b', marginTop:1 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <input className="inp" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search templates by name, category or tags..."
          style={{ width:'100%', padding:'10px 14px', background:'#111827', border:'1px solid #1f2d45', borderRadius:10, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, marginBottom:20, boxSizing:'border-box' }}/>

        {/* Template Cards */}
        {shown.length === 0 ? (
          <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:48, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📋</div>
            <p style={{ color:'#475569', marginBottom:16 }}>No templates yet</p>
            <button onClick={seedDefaults} style={{ padding:'10px 24px', background:'#1e3a5f', border:'1px solid #3b82f640', borderRadius:10, color:'#60a5fa', cursor:'pointer', fontSize:13 }}>⚡ Load 8 Default Templates</button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
            {shown.map((t,i) => {
              const pc = PRIORITY_COLOR[t.priority] || PRIORITY_COLOR.medium
              const tc = t.team==='DEVELOPER'?{bg:'#083344',c:'#06b6d4'}:t.team==='L2'?{bg:'#2e1065',c:'#a78bfa'}:{bg:'#1e3a5f',c:'#60a5fa'}
              return (
                <div key={t.id} className="tcard"
                  style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, padding:'18px 20px', transition:'all 0.2s', animation:`fadeUp 0.4s ${(i%6)*0.05}s ease both`, opacity:t.is_active!==false?1:0.5 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:28 }}>{t.icon||'📋'}</span>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700 }}>{t.name}</div>
                        <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{t.category||'General'}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:4 }}>
                      <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:5, background:pc.bg, color:pc.c }}>{t.priority}</span>
                      <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:5, background:tc.bg, color:tc.c }}>{t.team}</span>
                    </div>
                  </div>

                  <p style={{ fontSize:12, color:'#64748b', lineHeight:1.6, marginBottom:12, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                    {t.description||'No description'}
                  </p>

                  {t.tags && (
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:12 }}>
                      {t.tags.split(',').map(tag => (
                        <span key={tag} style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background:'#1e293b', color:'#475569' }}>{tag.trim()}</span>
                      ))}
                    </div>
                  )}

                  <div style={{ display:'flex', gap:6, borderTop:'1px solid #1f2d45', paddingTop:12 }}>
                    <button onClick={() => openEdit(t)} style={{ flex:1, padding:'6px', background:'#1e3a5f', border:'none', color:'#60a5fa', borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:600 }}>✏️ Edit</button>
                    <button onClick={() => toggleActive(t)} style={{ flex:1, padding:'6px', background:t.is_active!==false?'#1f2d45':'#052e16', border:'none', color:t.is_active!==false?'#475569':'#34d399', borderRadius:7, cursor:'pointer', fontSize:11 }}>
                      {t.is_active!==false?'🚫 Disable':'✅ Enable'}
                    </button>
                    <button onClick={() => setConfirm(t)} style={{ padding:'6px 10px', background:'#450a0a', border:'none', color:'#fca5a5', borderRadius:7, cursor:'pointer', fontSize:11 }}>🗑️</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Form Modal ── */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, animation:'fadeIn 0.2s', overflowY:'auto', padding:20 }}>
          <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:20, padding:'28px 32px', width:560, maxWidth:'95vw', animation:'fadeUp 0.3s ease' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800 }}>{editTpl?'✏️ Edit Template':'+ New Template'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background:'transparent', border:'none', color:'#475569', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>

            {msg && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:msg.startsWith('✅')?'#052e16':'#450a0a', color:msg.startsWith('✅')?'#34d399':'#fca5a5', fontSize:13 }}>{msg}</div>}

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {/* Icon picker */}
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:8 }}>Icon</label>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {ICONS.map(ic => (
                    <button key={ic} onClick={() => setForm(p => ({...p, icon:ic}))}
                      style={{ width:36, height:36, borderRadius:8, border:`2px solid ${form.icon===ic?'#3b82f6':'#1f2d45'}`, background:form.icon===ic?'#1e3a5f':'#0f172a', fontSize:18, cursor:'pointer', transition:'all 0.15s' }}>{ic}</button>
                  ))}
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:6 }}>Template Name *</label>
                  <input className="inp" value={form.name} onChange={e => setForm(p => ({...p, name:e.target.value}))} placeholder="e.g. Password Reset"
                    style={{ width:'100%', padding:'10px 12px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, boxSizing:'border-box' }}/>
                </div>
                {[['Priority','priority',PRIORITY_OPTIONS],['Team','team',TEAM_OPTIONS]].map(([label,key,opts]) => (
                  <div key={key}>
                    <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:6 }}>{label}</label>
                    <select value={form[key]} onChange={e => setForm(p => ({...p, [key]:e.target.value}))}
                      style={{ width:'100%', padding:'10px 12px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:'none' }}>
                      {opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:6 }}>Category</label>
                  <input className="inp" value={form.category} onChange={e => setForm(p => ({...p, category:e.target.value}))} placeholder="e.g. Network"
                    style={{ width:'100%', padding:'10px 12px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, boxSizing:'border-box' }}/>
                </div>
              </div>

              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:6 }}>Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({...p, description:e.target.value}))} rows={2} placeholder="Brief description of when to use this template"
                  style={{ width:'100%', padding:'10px 12px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, resize:'vertical', boxSizing:'border-box', outline:'none' }}/>
              </div>

              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:6 }}>Resolution Steps</label>
                <textarea value={form.steps} onChange={e => setForm(p => ({...p, steps:e.target.value}))} rows={4} placeholder="1. Step one&#10;2. Step two&#10;3. Step three"
                  style={{ width:'100%', padding:'10px 12px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:'monospace', fontSize:12, resize:'vertical', boxSizing:'border-box', outline:'none', lineHeight:1.7 }}/>
              </div>

              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:6 }}>Tags <span style={{ fontWeight:400 }}>(comma separated)</span></label>
                <input className="inp" value={form.tags} onChange={e => setForm(p => ({...p, tags:e.target.value}))} placeholder="e.g. password,login,access"
                  style={{ width:'100%', padding:'10px 12px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, boxSizing:'border-box' }}/>
              </div>
            </div>

            <div style={{ display:'flex', gap:10, marginTop:22 }}>
              <button onClick={saveTemplate} disabled={saving}
                style={{ flex:1, padding:'12px', background:'linear-gradient(135deg,#2563eb,#3b82f6)', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:14, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {saving ? <><div style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', animation:'spin 0.7s linear infinite' }}/>Saving...</> : editTpl ? '💾 Update' : '+ Create Template'}
              </button>
              <button onClick={() => setShowForm(false)} style={{ padding:'12px 20px', background:'transparent', border:'1px solid #1f2d45', borderRadius:10, color:'#64748b', cursor:'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500 }}>
          <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'28px 32px', width:380, textAlign:'center' }}>
            <div style={{ fontSize:44, marginBottom:12 }}>🗑️</div>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:17, marginBottom:8 }}>Delete Template?</h3>
            <p style={{ color:'#64748b', fontSize:13, marginBottom:22 }}>"{confirm.name}" will be permanently deleted.</p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={deleteTemplate} style={{ flex:1, padding:'11px', background:'#ef4444', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontWeight:600 }}>Delete</button>
              <button onClick={() => setConfirm(null)} style={{ flex:1, padding:'11px', background:'transparent', border:'1px solid #1f2d45', borderRadius:10, color:'#64748b', cursor:'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Loader() {
  return <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#3b82f6', animation:'spin 0.7s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}
