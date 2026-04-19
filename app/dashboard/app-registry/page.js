'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import { FRAMEWORK_CATEGORIES, getFrameworksByCategory, FRAMEWORKS } from '../../../lib/frameworkDetector'

const ENVIRONMENTS = ['Production', 'Staging', 'Development', 'UAT']

export default function AppRegistryPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [profile,    setProfile]    = useState(null)
  const [apps,       setApps]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [editApp,    setEditApp]    = useState(null)
  const [msg,        setMsg]        = useState('')
  const [saving,     setSaving]     = useState(false)
  const [activeTab,  setActiveTab]  = useState('apps')
  const [form,       setForm]       = useState({
    name: '', app_identifier: '', description: '',
    environment: 'Production', tech_stack: [], url: '',
    contact_email: '', is_active: true,
  })

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    setProfile(p)
    await loadApps()
    setLoading(false)
  }

  async function loadApps() {
    const { data } = await supabase
      .from('app_registry')
      .select('*')
      .order('created_at', { ascending: false })
    setApps(data || [])
  }

  function toggleStack(key) {
    setForm(p => ({
      ...p,
      tech_stack: p.tech_stack.includes(key)
        ? p.tech_stack.filter(k => k !== key)
        : [...p.tech_stack, key]
    }))
  }

  // Auto-generate app_identifier from name
  function handleNameChange(val) {
    const id = val.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
    setForm(p => ({ ...p, name: val, app_identifier: id }))
  }

  async function saveApp() {
    if (!form.name.trim()) { setMsg('❌ App name is required'); return }
    if (!form.app_identifier.trim()) { setMsg('❌ App identifier is required'); return }
    setSaving(true)
    try {
      if (editApp) {
        const { error } = await supabase.from('app_registry')
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq('id', editApp.id)
        if (error) throw error
        setMsg('✅ App updated!')
      } else {
        const { error } = await supabase.from('app_registry').insert(form)
        if (error) throw error
        setMsg('✅ App registered! NexDesk will now auto-detect its tech stack.')
      }
      await loadApps()
      setShowForm(false)
      setEditApp(null)
      setForm({ name:'', app_identifier:'', description:'', environment:'Production', tech_stack:[], url:'', contact_email:'', is_active:true })
    } catch(e) { setMsg('❌ ' + e.message) }
    setSaving(false)
    setTimeout(() => setMsg(''), 4000)
  }

  async function toggleActive(app) {
    await supabase.from('app_registry').update({ is_active: !app.is_active }).eq('id', app.id)
    await loadApps()
  }

  async function deleteApp(app) {
    if (!confirm(`Delete "${app.name}"? This cannot be undone.`)) return
    await supabase.from('app_registry').delete().eq('id', app.id)
    await loadApps()
    setMsg('✅ App removed')
    setTimeout(() => setMsg(''), 3000)
  }

  const S = {
    page:  { minHeight:'100vh', background:'var(--bg-secondary)', color:'var(--text-primary)', fontFamily:'Calibri, sans-serif' },
    card:  { background:'var(--bg-card)', border:'1px solid var(--border-light)', borderRadius:12 },
    input: { width:'100%', padding:'9px 12px', background:'var(--bg-primary)', border:'1px solid var(--border-light)', borderRadius:8, color:'var(--text-primary)', fontSize:13, fontFamily:'Calibri, sans-serif', outline:'none', boxSizing:'border-box' },
    label: { fontSize:11, color:'var(--text-secondary)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 },
  }

  const CAT_COLORS = {
    frontend:   { color:'#60a5fa', bg:'#1e3a5f' },
    backend:    { color:'#34d399', bg:'#022c22' },
    mobile:     { color:'#f59e0b', bg:'#1c1000' },
    devops:     { color:'#a78bfa', bg:'#2e1065' },
    database:   { color:'#22d3ee', bg:'#083344' },
    ml:         { color:'#f472b6', bg:'#2d0a3a' },
    bigdata:    { color:'#fb923c', bg:'#431407' },
    blockchain: { color:'#fbbf24', bg:'#161005' },
  }

  if (loading) return (
    <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:36, marginBottom:12 }}>📱</div>
        <div style={{ color:'var(--text-secondary)' }}>Loading App Registry...</div>
      </div>
    </div>
  )

  const agentScript = (app) => `<script
  src="https://your-nexdesk.vercel.app/nexdesk-agent-v2.js"
  data-nexdesk-url="https://your-nexdesk.vercel.app"
  data-app-name="${app.name}"
  data-app-id="${app.app_identifier}"
  data-environment="${app.environment?.toLowerCase()}"
  async>
</script>`

  return (
    <div style={S.page}>

      {/* NAV */}
      <nav style={{ background:'var(--bg-card)', borderBottom:'1px solid var(--border-light)', padding:'0 24px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#2563eb,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⚡</div>
          <span style={{ fontWeight:800, fontSize:18 }}>Nex<span style={{ color:'#06b6d4' }}>Desk</span></span>
          <span style={{ color:'#334155' }}>›</span>
          <span style={{ color:'var(--text-secondary)', fontSize:13 }}>📱 App Registry</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => { setEditApp(null); setForm({ name:'', app_identifier:'', description:'', environment:'Production', tech_stack:[], url:'', contact_email:'', is_active:true }); setShowForm(true); setActiveTab('form') }}
            style={{ padding:'7px 16px', background:'linear-gradient(135deg,#2563eb,#1d4ed8)', border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
            + Register App
          </button>
          <button onClick={() => router.push('/dashboard/admin')}
            style={{ padding:'7px 14px', background:'transparent', border:'1px solid var(--border-light)', borderRadius:8, color:'var(--text-secondary)', cursor:'pointer', fontSize:12 }}>
            ← Back
          </button>
        </div>
      </nav>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 20px' }}>

        {/* HEADER */}
        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:24, fontWeight:800, margin:0 }}>📱 App Registry</h1>
          <p style={{ color:'var(--text-secondary)', fontSize:14, margin:'6px 0 0' }}>
            Register your applications here. NexDesk will auto-detect their tech stack and give framework-specific AI diagnosis for every error.
          </p>
        </div>

        {/* STATS */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'Registered Apps',  val: apps.length,                         icon:'📱', color:'#60a5fa' },
            { label:'Active',           val: apps.filter(a => a.is_active).length, icon:'✅', color:'#34d399' },
            { label:'Total Frameworks', val: [...new Set(apps.flatMap(a => a.tech_stack||[]))].length, icon:'🧩', color:'#f59e0b' },
            { label:'Environments',     val: [...new Set(apps.map(a => a.environment).filter(Boolean))].length, icon:'🌍', color:'#a78bfa' },
          ].map((s,i) => (
            <div key={i} style={{ ...S.card, padding:'16px 20px', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ fontSize:26 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.val}</div>
                <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {msg && (
          <div style={{ padding:'10px 14px', background: msg.startsWith('✅') ? '#022c22' : '#1c0000', border:`1px solid ${msg.startsWith('✅') ? '#10b98140' : '#ef444440'}`, borderRadius:8, color: msg.startsWith('✅') ? '#34d399' : '#fca5a5', fontSize:13, marginBottom:16 }}>
            {msg}
          </div>
        )}

        {/* TABS */}
        <div style={{ display:'flex', gap:6, marginBottom:20 }}>
          {[
            { key:'apps',      label:`📱 My Apps (${apps.length})` },
            { key:'form',      label: editApp ? '✏️ Edit App' : '+ Register App' },
            { key:'frameworks',label:'🧩 Framework Library' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ padding:'8px 16px', borderRadius:10, border:`1px solid ${activeTab===t.key?'#3b82f640':'var(--border-light)'}`, background:activeTab===t.key?'#1e3a5f':'var(--bg-primary)', color:activeTab===t.key?'#60a5fa':'var(--text-secondary)', cursor:'pointer', fontSize:13, fontWeight:activeTab===t.key?700:400 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ APPS LIST ══ */}
        {activeTab === 'apps' && (
          <div>
            {apps.length === 0 ? (
              <div style={{ ...S.card, padding:60, textAlign:'center' }}>
                <div style={{ fontSize:48, marginBottom:16 }}>📱</div>
                <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>No apps registered yet</div>
                <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:20 }}>Register your first application to enable framework-aware AI diagnosis</div>
                <button onClick={() => setActiveTab('form')}
                  style={{ padding:'10px 24px', background:'linear-gradient(135deg,#2563eb,#1d4ed8)', border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:14, fontWeight:600 }}>
                  + Register First App
                </button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {apps.map(app => (
                  <div key={app.id} style={{ ...S.card, padding:20, borderColor: app.is_active ? 'var(--border-light)' : 'var(--bg-primary)', opacity: app.is_active ? 1 : 0.6 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                          <span style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)' }}>{app.name}</span>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:5, background: app.is_active ? '#022c22' : '#1c0000', color: app.is_active ? '#34d399' : '#f87171', fontWeight:600 }}>
                            {app.is_active ? '● Active' : '○ Inactive'}
                          </span>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:5, background:'#1e1b4b', color:'#a5b4fc' }}>{app.environment}</span>
                        </div>
                        <div style={{ fontSize:12, color:'var(--text-disabled)', marginBottom:8, fontFamily:'monospace' }}>
                          ID: {app.app_identifier} {app.url && `· ${app.url}`}
                        </div>
                        {app.description && <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:10 }}>{app.description}</div>}

                        {/* Tech Stack Chips */}
                        {app.tech_stack?.length > 0 && (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                            {app.tech_stack.map(k => {
                              const fw = FRAMEWORKS?.[k]
                              const cat = fw?.category || 'backend'
                              const cc  = CAT_COLORS[cat] || CAT_COLORS.backend
                              return (
                                <span key={k} style={{ fontSize:11, padding:'2px 10px', borderRadius:20, background:cc.bg, color:cc.color, border:`1px solid ${cc.color}40`, fontWeight:600 }}>
                                  {fw?.name || k}
                                </span>
                              )
                            })}
                          </div>
                        )}

                        {/* Agent embed snippet */}
                        <details style={{ marginTop:8 }}>
                          <summary style={{ fontSize:12, color:'#3b82f6', cursor:'pointer', userSelect:'none' }}>📋 View Agent Embed Code</summary>
                          <pre style={{ background:'var(--bg-primary)', border:'1px solid var(--border-light)', borderRadius:8, padding:12, fontSize:11, color:'#6ee7b7', overflowX:'auto', marginTop:8 }}>
                            {agentScript(app)}
                          </pre>
                        </details>
                      </div>

                      <div style={{ display:'flex', gap:6, marginLeft:16 }}>
                        <button onClick={() => { setEditApp(app); setForm({ name:app.name, app_identifier:app.app_identifier, description:app.description||'', environment:app.environment||'Production', tech_stack:app.tech_stack||[], url:app.url||'', contact_email:app.contact_email||'', is_active:app.is_active??true }); setActiveTab('form') }}
                          style={{ padding:'5px 12px', background:'#1e3a5f', border:'1px solid #3b82f640', borderRadius:6, color:'#60a5fa', cursor:'pointer', fontSize:11, fontWeight:600 }}>Edit</button>
                        <button onClick={() => toggleActive(app)}
                          style={{ padding:'5px 12px', background: app.is_active ? '#1c0000' : '#022c22', border:`1px solid ${app.is_active ? '#ef444440' : '#10b98140'}`, borderRadius:6, color: app.is_active ? '#f87171' : '#34d399', cursor:'pointer', fontSize:11, fontWeight:600 }}>
                          {app.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => deleteApp(app)}
                          style={{ padding:'5px 10px', background:'transparent', border:'1px solid #334155', borderRadius:6, color:'var(--text-disabled)', cursor:'pointer', fontSize:11 }}>🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ REGISTER / EDIT FORM ══ */}
        {activeTab === 'form' && (
          <div style={{ ...S.card, padding:28 }}>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:20 }}>
              {editApp ? `✏️ Edit — ${editApp.name}` : '➕ Register New Application'}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              <div>
                <label style={S.label}>App Name *</label>
                <input style={S.input} value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="ZenWealth MF App"/>
              </div>
              <div>
                <label style={S.label}>App Identifier (auto-generated)</label>
                <input style={S.input} value={form.app_identifier} onChange={e => setForm(p => ({ ...p, app_identifier: e.target.value }))} placeholder="zenwealth_mf_app"/>
                <div style={{ fontSize:11, color:'#334155', marginTop:4 }}>Used to match tickets from this app's agent</div>
              </div>
              <div>
                <label style={S.label}>App URL</label>
                <input style={S.input} value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://app.example.com"/>
              </div>
              <div>
                <label style={S.label}>Environment</label>
                <select style={S.input} value={form.environment} onChange={e => setForm(p => ({ ...p, environment: e.target.value }))}>
                  {ENVIRONMENTS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Contact Email</label>
                <input style={S.input} value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} placeholder="dev@example.com"/>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, paddingTop:20 }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ width:16, height:16, accentColor:'#10b981' }}/>
                <label style={{ fontSize:13, color:'var(--text-disabled)' }}>Active (accept tickets)</label>
              </div>
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={S.label}>Description</label>
              <textarea style={{ ...S.input, minHeight:70, resize:'vertical' }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of this application..."/>
            </div>

            {/* TECH STACK SELECTOR */}
            <div style={{ marginBottom:24 }}>
              <label style={S.label}>Tech Stack — Select All That Apply</label>
              <div style={{ fontSize:12, color:'var(--text-disabled)', marginBottom:12 }}>
                Selected: <strong style={{ color:'#60a5fa' }}>{form.tech_stack.length} frameworks</strong>
                {form.tech_stack.length > 0 && <span style={{ color:'#334155' }}> — {form.tech_stack.join(', ')}</span>}
              </div>

              {Object.entries(FRAMEWORK_CATEGORIES).map(([catKey, catLabel]) => {
                const fws = getFrameworksByCategory(catKey)
                if (fws.length === 0) return null
                const cc  = CAT_COLORS[catKey] || CAT_COLORS.backend
                return (
                  <div key={catKey} style={{ marginBottom:16 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:cc.color, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.5px' }}>
                      {catLabel}
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {fws.map(fw => {
                        const selected = form.tech_stack.includes(fw.key)
                        return (
                          <button key={fw.key} onClick={() => toggleStack(fw.key)}
                            style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${selected ? cc.color : 'var(--border-light)'}40`, background: selected ? cc.bg : 'transparent', color: selected ? cc.color : 'var(--text-secondary)', cursor:'pointer', fontSize:12, fontWeight: selected ? 700 : 400, transition:'all 0.15s', fontFamily:'Calibri, sans-serif' }}>
                            {selected ? '✓ ' : ''}{fw.name}
                            <span style={{ fontSize:10, opacity:0.6, marginLeft:4 }}>{fw.language}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={saveApp} disabled={saving}
                style={{ padding:'10px 24px', background:'linear-gradient(135deg,#2563eb,#1d4ed8)', border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:14, fontWeight:600, opacity: saving ? 0.6 : 1 }}>
                {saving ? '⏳ Saving...' : editApp ? '💾 Save Changes' : '➕ Register App'}
              </button>
              <button onClick={() => { setActiveTab('apps'); setEditApp(null) }}
                style={{ padding:'10px 18px', background:'transparent', border:'1px solid var(--border-light)', borderRadius:8, color:'var(--text-secondary)', cursor:'pointer', fontSize:13 }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ══ FRAMEWORK LIBRARY ══ */}
        {activeTab === 'frameworks' && (
          <div>
            <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:20 }}>
              NexDesk has built-in knowledge of <strong style={{ color:'var(--text-primary)' }}>90+ frameworks</strong>. When an error is detected from any of these, AI gives framework-specific solutions — not generic answers.
            </div>
            {Object.entries(FRAMEWORK_CATEGORIES).map(([catKey, catLabel]) => {
              const fws = getFrameworksByCategory(catKey)
              if (fws.length === 0) return null
              const cc  = CAT_COLORS[catKey] || CAT_COLORS.backend
              return (
                <div key={catKey} style={{ ...S.card, padding:20, marginBottom:12 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:cc.color, marginBottom:12 }}>{catLabel}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {fws.map(fw => (
                      <div key={fw.key} style={{ padding:'6px 14px', background:cc.bg, border:`1px solid ${cc.color}30`, borderRadius:8 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:cc.color }}>{fw.name}</div>
                        <div style={{ fontSize:10, color:'var(--text-disabled)' }}>{fw.language}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
      <style>{`* { box-sizing:border-box; } select option { background:var(--bg-card); } details summary::-webkit-details-marker { display:none; }`}</style>
    </div>
  )
}

