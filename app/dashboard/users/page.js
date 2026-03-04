'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

const ROLES = ['ADMIN','IT_MANAGER','L1_AGENT','L2_AGENT','DEVELOPER','END_USER']
const ROLE_COLOR = {
  ADMIN:      { bg:'#451a03', c:'#fbbf24' },
  IT_MANAGER: { bg:'#451a03', c:'#fbbf24' },
  L1_AGENT:   { bg:'#1e3a5f', c:'#60a5fa' },
  L2_AGENT:   { bg:'#2e1065', c:'#a78bfa' },
  DEVELOPER:  { bg:'#083344', c:'#06b6d4' },
  END_USER:   { bg:'#052e16', c:'#34d399' },
}

export default function UserManagement() {
  const router   = useRouter()
  const supabase = createClient()

  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState(null) // null = new user
  const [confirm,  setConfirm]  = useState(null) // user to deactivate

  const [form, setForm] = useState({ full_name:'', email:'', role:'END_USER', department:'', phone:'', is_active:true })

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    if (!['ADMIN','IT_MANAGER'].includes(p?.role)) { router.replace('/dashboard'); return }
    await loadUsers()
    setLoading(false)
  }

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setUsers(data)
  }

  function openNew() {
    setForm({ full_name:'', email:'', role:'END_USER', department:'', phone:'', is_active:true })
    setEditUser(null)
    setShowForm(true)
    setMsg('')
  }

  function openEdit(u) {
    setForm({ full_name:u.full_name||'', email:u.email||'', role:u.role||'END_USER', department:u.department||'', phone:u.phone||'', is_active:u.is_active!==false })
    setEditUser(u)
    setShowForm(true)
    setMsg('')
  }

  async function saveUser() {
    if (!form.full_name.trim() || !form.email.trim()) { setMsg('❌ Name and Email are required'); return }
    setSaving(true); setMsg('')
    try {
      if (editUser) {
        // Update existing profile
        const { error } = await supabase.from('profiles').update({
          full_name:  form.full_name.trim(),
          role:       form.role,
          department: form.department.trim(),
          phone:      form.phone.trim(),
          is_active:  form.is_active,
          updated_at: new Date().toISOString(),
        }).eq('id', editUser.id)
        if (error) throw error
        setMsg('✅ User updated successfully!')
      } else {
        // Create new user via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email:    form.email.trim(),
          password: 'NexDesk@123', // default password
          email_confirm: true,
        })
        if (authError) throw authError
        // Insert profile
        const { error: profError } = await supabase.from('profiles').insert({
          id:         authData.user.id,
          email:      form.email.trim(),
          full_name:  form.full_name.trim(),
          role:       form.role,
          department: form.department.trim(),
          phone:      form.phone.trim(),
          is_active:  true,
        })
        if (profError) throw profError
        setMsg('✅ User created! Default password: NexDesk@123')
      }
      await loadUsers()
      if (!editUser) { setShowForm(false) }
    } catch(e) {
      setMsg('❌ ' + (e.message || 'Something went wrong'))
    }
    setSaving(false)
  }

  async function toggleActive(u) {
    const newStatus = !u.is_active
    await supabase.from('profiles').update({ is_active: newStatus }).eq('id', u.id)
    setUsers(prev => prev.map(x => x.id===u.id ? {...x, is_active:newStatus} : x))
    setConfirm(null)
    setMsg(`✅ User ${newStatus?'activated':'deactivated'} successfully!`)
    setTimeout(() => setMsg(''), 3000)
  }

  async function changeRole(userId, newRole) {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id===userId ? {...u, role:newRole} : u))
  }

  // Filter users
  const shown = users.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter==='all' || (filter==='active'&&u.is_active!==false) || (filter==='inactive'&&u.is_active===false) || u.role===filter
    return matchSearch && matchFilter
  })

  const stats = {
    total:    users.length,
    active:   users.filter(u=>u.is_active!==false).length,
    inactive: users.filter(u=>u.is_active===false).length,
    agents:   users.filter(u=>['L1_AGENT','L2_AGENT','DEVELOPER'].includes(u.role)).length,
  }

  if (loading) return <Loader />

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        .urow:hover  { background:#0f172a!important; }
        .inp:focus   { border-color:#3b82f6!important; outline:none; }
        .rbtn:hover  { opacity:0.8!important; }
      `}</style>

      <GlobalNav title="User Management" />

      <div style={{ maxWidth:1300, margin:'0 auto', padding:'28px 24px' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:4 }}>👥 User Management</h1>
            <p style={{ color:'#64748b', fontSize:13 }}>Create, edit, assign roles and manage all NexDesk users</p>
          </div>
          <button onClick={openNew}
            style={{ padding:'10px 20px', background:'linear-gradient(135deg,#2563eb,#3b82f6)', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:14, fontWeight:600, display:'flex', alignItems:'center', gap:8 }}>
            + Create User
          </button>
        </div>

        {msg && (
          <div style={{ padding:'12px 18px', borderRadius:10, marginBottom:16, background:msg.startsWith('✅')?'#052e16':'#450a0a', color:msg.startsWith('✅')?'#34d399':'#fca5a5', border:`1px solid ${msg.startsWith('✅')?'#10b98130':'#ef444430'}`, fontSize:13 }}>
            {msg}
          </div>
        )}

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
          {[
            ['👥','Total Users',  stats.total,    '#3b82f6','#1e3a5f'],
            ['✅','Active',        stats.active,   '#10b981','#052e16'],
            ['🚫','Inactive',      stats.inactive, '#ef4444','#450a0a'],
            ['🎫','Agents/Dev',    stats.agents,   '#8b5cf6','#2e1065'],
          ].map(([icon,label,val,color,bg],i) => (
            <div key={label} style={{ background:'#111827', border:`1px solid ${color}30`, borderRadius:14, padding:'14px 18px', animation:`fadeUp 0.4s ${i*0.06}s ease both` }}>
              <div style={{ fontSize:20, marginBottom:4 }}>{icon}</div>
              <div style={{ fontSize:22, fontWeight:700, color, fontFamily:"'Syne',sans-serif" }}>{val}</div>
              <div style={{ fontSize:11, color:'#64748b', marginTop:1 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
          <input className="inp" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search by name or email..."
            style={{ flex:1, minWidth:200, padding:'9px 14px', background:'#111827', border:'1px solid #1f2d45', borderRadius:10, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13 }}/>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {[['all','All'],['active','Active'],['inactive','Inactive'],['L1_AGENT','L1'],['L2_AGENT','L2'],['DEVELOPER','Dev'],['ADMIN','Admin'],['END_USER','Users']].map(([val,label]) => (
              <button key={val} onClick={() => setFilter(val)} style={{ padding:'8px 14px', borderRadius:20, fontSize:12, cursor:'pointer', border:'1px solid', background:filter===val?'#1e3a5f':'transparent', color:filter===val?'#60a5fa':'#64748b', borderColor:filter===val?'#3b82f640':'#1f2d45', transition:'all 0.2s' }}>{label}</button>
            ))}
          </div>
        </div>

        {/* User Table */}
        <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, overflow:'hidden' }}>
          <div style={{ padding:'14px 24px', borderBottom:'1px solid #1f2d45', display:'flex', justifyContent:'space-between' }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700 }}>
              All Users <span style={{ fontSize:12, color:'#475569', fontWeight:400 }}>({shown.length})</span>
            </h2>
            <button onClick={loadUsers} style={{ fontSize:12, color:'#475569', background:'transparent', border:'none', cursor:'pointer' }}>🔄 Refresh</button>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ background:'#0a0e1a' }}>
                {['Name','Email','Role','Department','Status','Tickets','Actions'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {shown.map(u => {
                  const rc = ROLE_COLOR[u.role] || ROLE_COLOR.END_USER
                  const isActive = u.is_active !== false
                  return (
                    <tr key={u.id} className="urow" style={{ borderTop:'1px solid #1f2d45', transition:'background 0.15s', opacity:isActive?1:0.6 }}>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:34, height:34, borderRadius:'50%', background:`linear-gradient(135deg,${rc.bg},${rc.c}30)`, border:`1px solid ${rc.c}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:rc.c, flexShrink:0 }}>
                            {(u.full_name||u.email||'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600 }}>{u.full_name||'—'}</div>
                            <div style={{ fontSize:10, color:'#475569' }}>ID: {u.id?.substring(0,8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'12px 14px' }}><span style={{ fontSize:12, color:'#94a3b8' }}>{u.email}</span></td>
                      <td style={{ padding:'12px 14px' }}>
                        {/* Inline role change */}
                        <select value={u.role||'END_USER'} onChange={e => changeRole(u.id, e.target.value)}
                          style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:6, background:rc.bg, color:rc.c, border:`1px solid ${rc.c}40`, cursor:'pointer', outline:'none', fontFamily:"'DM Sans',sans-serif" }}>
                          {ROLES.map(r => <option key={r} value={r} style={{ background:'#111827', color:'#e2e8f0' }}>{r}</option>)}
                        </select>
                      </td>
                      <td style={{ padding:'12px 14px' }}><span style={{ fontSize:12, color:'#64748b' }}>{u.department||'—'}</span></td>
                      <td style={{ padding:'12px 14px' }}>
                        <span style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:20, background:isActive?'#052e16':'#1f2d45', color:isActive?'#34d399':'#475569', border:`1px solid ${isActive?'#10b98130':'#334155'}` }}>
                          {isActive ? '✅ Active' : '🚫 Inactive'}
                        </span>
                      </td>
                      <td style={{ padding:'12px 14px' }}><span style={{ fontSize:12, color:'#475569' }}>—</span></td>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="rbtn" onClick={() => openEdit(u)}
                            style={{ padding:'5px 10px', background:'#1e3a5f', border:'none', color:'#60a5fa', borderRadius:6, cursor:'pointer', fontSize:11, transition:'all 0.2s' }}>✏️ Edit</button>
                          <button className="rbtn" onClick={() => setConfirm(u)}
                            style={{ padding:'5px 10px', background:isActive?'#450a0a':'#052e16', border:'none', color:isActive?'#fca5a5':'#34d399', borderRadius:6, cursor:'pointer', fontSize:11, transition:'all 0.2s' }}>
                            {isActive ? '🚫 Deactivate' : '✅ Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {shown.length === 0 && (
              <div style={{ padding:40, textAlign:'center' }}>
                <div style={{ fontSize:36, marginBottom:10 }}>👥</div>
                <p style={{ color:'#475569' }}>No users found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Create/Edit Modal ── */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, animation:'fadeIn 0.2s ease' }}>
          <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:20, padding:'28px 32px', width:480, maxWidth:'95vw', animation:'fadeUp 0.3s ease' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800 }}>{editUser ? '✏️ Edit User' : '+ Create New User'}</h2>
              <button onClick={() => { setShowForm(false); setMsg('') }} style={{ background:'transparent', border:'none', color:'#475569', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>

            {msg && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16, background:msg.startsWith('✅')?'#052e16':'#450a0a', color:msg.startsWith('✅')?'#34d399':'#fca5a5', fontSize:13 }}>{msg}</div>}

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[
                { label:'Full Name *', key:'full_name', type:'text', placeholder:'e.g. Rahul Sharma' },
                { label:'Email *',    key:'email',     type:'email', placeholder:'e.g. rahul@company.com', disabled:!!editUser },
                { label:'Department', key:'department', type:'text', placeholder:'e.g. IT, HR, Finance' },
                { label:'Phone',      key:'phone',      type:'tel',  placeholder:'e.g. +91 98765 43210' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:6 }}>{f.label}</label>
                  <input className="inp" type={f.type} value={form[f.key]} disabled={f.disabled}
                    onChange={e => setForm(p => ({...p, [f.key]:e.target.value}))}
                    placeholder={f.placeholder}
                    style={{ width:'100%', padding:'10px 12px', background:f.disabled?'#0a0e1a':'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:f.disabled?'#475569':'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, boxSizing:'border-box', cursor:f.disabled?'not-allowed':'text' }}/>
                </div>
              ))}

              {/* Role */}
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:6 }}>Role *</label>
                <select value={form.role} onChange={e => setForm(p => ({...p, role:e.target.value}))}
                  style={{ width:'100%', padding:'10px 12px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:'none', cursor:'pointer' }}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Active toggle — edit only */}
              {editUser && (
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'#475569' }}>Account Status:</label>
                  <button onClick={() => setForm(p => ({...p, is_active:!p.is_active}))}
                    style={{ padding:'6px 16px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', border:'1px solid', background:form.is_active?'#052e16':'#450a0a', color:form.is_active?'#34d399':'#fca5a5', borderColor:form.is_active?'#10b98130':'#ef444430' }}>
                    {form.is_active ? '✅ Active' : '🚫 Inactive'}
                  </button>
                </div>
              )}

              {!editUser && (
                <div style={{ background:'#0f172a', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#64748b' }}>
                  🔑 Default password: <strong style={{ color:'#fbbf24' }}>NexDesk@123</strong> — user must change on first login
                </div>
              )}
            </div>

            <div style={{ display:'flex', gap:10, marginTop:24 }}>
              <button onClick={saveUser} disabled={saving}
                style={{ flex:1, padding:'12px', background:'linear-gradient(135deg,#2563eb,#3b82f6)', border:'none', borderRadius:10, color:'#fff', cursor:saving?'not-allowed':'pointer', fontSize:14, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {saving ? <><div style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', animation:'spin 0.7s linear infinite' }}/>Saving...</> : editUser ? '💾 Update User' : '+ Create User'}
              </button>
              <button onClick={() => { setShowForm(false); setMsg('') }}
                style={{ padding:'12px 20px', background:'transparent', border:'1px solid #1f2d45', borderRadius:10, color:'#64748b', cursor:'pointer', fontSize:14 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Modal ── */}
      {confirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, animation:'fadeIn 0.2s ease' }}>
          <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'28px 32px', width:400, maxWidth:'95vw', textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>{confirm.is_active!==false ? '🚫' : '✅'}</div>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, marginBottom:8 }}>
              {confirm.is_active!==false ? 'Deactivate User?' : 'Activate User?'}
            </h3>
            <p style={{ color:'#64748b', fontSize:13, marginBottom:24 }}>
              {confirm.is_active!==false
                ? `${confirm.full_name||confirm.email} will lose access to NexDesk immediately.`
                : `${confirm.full_name||confirm.email} will regain access to NexDesk.`}
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => toggleActive(confirm)}
                style={{ flex:1, padding:'11px', background:confirm.is_active!==false?'#ef4444':'#10b981', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:14, fontWeight:600 }}>
                {confirm.is_active!==false ? '🚫 Deactivate' : '✅ Activate'}
              </button>
              <button onClick={() => setConfirm(null)}
                style={{ flex:1, padding:'11px', background:'transparent', border:'1px solid #1f2d45', borderRadius:10, color:'#64748b', cursor:'pointer', fontSize:14 }}>Cancel</button>
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
