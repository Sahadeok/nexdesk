'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'

const ROLES = ['ADMIN', 'AGENT', 'L1', 'L2', 'MANAGER', 'USER']
const TEAMS = ['L1', 'L2', 'L3', 'Network', 'Security', 'Database', 'DevOps']

export default function UsersPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [profile,   setProfile]   = useState(null)
  const [users,     setUsers]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [showForm,  setShowForm]  = useState(false)
  const [editUser,  setEditUser]  = useState(null)
  const [msg,       setMsg]       = useState('')
  const [form,      setForm]      = useState({ full_name:'', email:'', role:'L1', team:'L1', is_active:true })
  const [saving,    setSaving]    = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    if (!['ADMIN','MANAGER'].includes(p?.role)) { router.replace('/dashboard'); return }
    setProfile(p)
    await loadUsers()
    setLoading(false)
  }

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, team, is_active, created_at, last_seen')
      .order('created_at', { ascending: false })
    setUsers(data || [])
  }

  async function saveUser() {
    setSaving(true)
    try {
      if (editUser) {
        const { error } = await supabase.from('profiles')
          .update({ full_name: form.full_name, role: form.role, team: form.team, is_active: form.is_active })
          .eq('id', editUser.id)
        if (error) throw error
        setMsg('✅ User updated!')
      } else {
        // Create auth user + profile via admin (simplified — just creates profile)
        const { error } = await supabase.from('profiles').insert({
          full_name: form.full_name,
          email:     form.email,
          role:      form.role,
          team:      form.team,
          is_active: form.is_active,
        })
        if (error) throw error
        setMsg('✅ User created! They can sign up with this email.')
      }
      await loadUsers()
      setShowForm(false)
      setEditUser(null)
      setForm({ full_name:'', email:'', role:'L1', team:'L1', is_active:true })
    } catch(e) {
      setMsg('❌ ' + e.message)
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 4000)
  }

  async function toggleActive(user) {
    await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id)
    setMsg(`✅ ${user.full_name} ${user.is_active ? 'deactivated' : 'activated'}`)
    await loadUsers()
    setTimeout(() => setMsg(''), 3000)
  }

  async function changeRole(userId, newRole) {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    await loadUsers()
    setMsg('✅ Role updated')
    setTimeout(() => setMsg(''), 2000)
  }

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  )

  const ROLE_COLORS = {
    ADMIN:   { bg:'#1c0a00', color:'#f97316', border:'#f9731640' },
    MANAGER: { bg:'#1e1b4b', color:'#a5b4fc', border:'#6366f140' },
    L2:      { bg:'#0c1a2e', color:'#60a5fa', border:'#3b82f640' },
    L1:      { bg:'#031a22', color:'#22d3ee', border:'#06b6d440' },
    AGENT:   { bg:'#1a1208', color:'#fbbf24', border:'#f59e0b40' },
    USER:    { bg:'#0f1117', color:'#94a3b8', border:'#33415540' },
  }

  const S = {
    page:  { minHeight:'100vh', background:'#0a0e1a', color:'#e2e8f0', fontFamily:'Calibri, sans-serif' },
    card:  { background:'#111827', border:'1px solid #1f2d45', borderRadius:12 },
    input: { width:'100%', padding:'9px 12px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:8, color:'#e2e8f0', fontSize:13, fontFamily:'Calibri, sans-serif', outline:'none' },
    label: { fontSize:11, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 },
  }

  if (loading) return (
    <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:36, marginBottom:12 }}>👥</div>
        <div style={{ color:'#64748b' }}>Loading users...</div>
      </div>
    </div>
  )

  return (
    <div style={S.page}>

      {/* NAV */}
      <nav style={{ background:'#111827', borderBottom:'1px solid #1f2d45', padding:'0 24px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#2563eb,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⚡</div>
          <span style={{ fontWeight:800, fontSize:18 }}>Nex<span style={{ color:'#06b6d4' }}>Desk</span></span>
          <span style={{ color:'#334155' }}>›</span>
          <span style={{ color:'#64748b', fontSize:13 }}>👥 User Management</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => { setEditUser(null); setForm({ full_name:'', email:'', role:'L1', team:'L1', is_active:true }); setShowForm(true) }}
            style={{ padding:'7px 16px', background:'linear-gradient(135deg,#2563eb,#1d4ed8)', border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
            + Add User
          </button>
          <button onClick={() => router.push('/dashboard/admin')}
            style={{ padding:'7px 14px', background:'transparent', border:'1px solid #1f2d45', borderRadius:8, color:'#64748b', cursor:'pointer', fontSize:12 }}>
            ← Back
          </button>
        </div>
      </nav>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'28px 20px' }}>

        {/* STATS */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'Total Users',  val: users.length,                        color:'#60a5fa', icon:'👥' },
            { label:'Active',       val: users.filter(u => u.is_active).length,  color:'#34d399', icon:'✅' },
            { label:'Agents/L1/L2', val: users.filter(u => ['L1','L2','AGENT'].includes(u.role)).length, color:'#f59e0b', icon:'🎧' },
            { label:'Admins',       val: users.filter(u => u.role === 'ADMIN').length, color:'#f97316', icon:'🔐' },
          ].map((s,i) => (
            <div key={i} style={{ ...S.card, padding:'16px 20px', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ fontSize:26 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.val}</div>
                <div style={{ fontSize:12, color:'#64748b' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* MSG */}
        {msg && (
          <div style={{ padding:'10px 14px', background: msg.startsWith('✅') ? '#022c22' : '#1c0000', border:`1px solid ${msg.startsWith('✅') ? '#10b98140' : '#ef444440'}`, borderRadius:8, color: msg.startsWith('✅') ? '#34d399' : '#fca5a5', fontSize:13, marginBottom:16 }}>
            {msg}
          </div>
        )}

        {/* SEARCH */}
        <div style={{ marginBottom:16 }}>
          <input style={S.input} placeholder="🔍 Search by name, email or role..."
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>

        {/* ADD/EDIT FORM */}
        {showForm && (
          <div style={{ ...S.card, padding:24, marginBottom:20, borderColor:'#3b82f640' }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>
              {editUser ? `✏️ Edit — ${editUser.full_name}` : '➕ Add New User'}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:16 }}>
              <div>
                <label style={S.label}>Full Name *</label>
                <input style={S.input} value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Rahul Sharma"/>
              </div>
              {!editUser && (
                <div>
                  <label style={S.label}>Email *</label>
                  <input style={S.input} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="rahul@company.com"/>
                </div>
              )}
              <div>
                <label style={S.label}>Role *</label>
                <select style={S.input} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Team</label>
                <select style={S.input} value={form.team} onChange={e => setForm(p => ({ ...p, team: e.target.value }))}>
                  {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, paddingTop:20 }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ width:16, height:16, accentColor:'#10b981' }}/>
                <label style={{ fontSize:13, color:'#94a3b8' }}>Active Account</label>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={saveUser} disabled={saving}
                style={{ padding:'9px 22px', background:'linear-gradient(135deg,#2563eb,#1d4ed8)', border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, opacity: saving ? 0.6 : 1 }}>
                {saving ? '⏳ Saving...' : editUser ? '💾 Save Changes' : '➕ Create User'}
              </button>
              <button onClick={() => { setShowForm(false); setEditUser(null) }}
                style={{ padding:'9px 18px', background:'transparent', border:'1px solid #1f2d45', borderRadius:8, color:'#64748b', cursor:'pointer', fontSize:13 }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* USERS TABLE */}
        <div style={{ ...S.card, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid #1f2d45', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:14, fontWeight:700 }}>All Users ({filtered.length})</span>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#0a0e1a' }}>
                {['User','Email','Role','Team','Status','Last Active','Actions'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, color:'#475569', fontWeight:600, borderBottom:'1px solid #1f2d45', textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:'#334155' }}>No users found</td></tr>
              ) : filtered.map(u => {
                const rc = ROLE_COLORS[u.role] || ROLE_COLORS.USER
                return (
                  <tr key={u.id} style={{ borderBottom:'1px solid #0f172a' }}
                    onMouseOver={e => e.currentTarget.style.background='#0f172a'}
                    onMouseOut={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#2563eb,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff', flexShrink:0 }}>
                          {(u.full_name || u.email || '?')[0].toUpperCase()}
                        </div>
                        <span style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{u.full_name || '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:'#64748b' }}>{u.email}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                        style={{ padding:'3px 8px', background:rc.bg, border:`1px solid ${rc.border}`, borderRadius:6, color:rc.color, fontSize:12, fontWeight:600, cursor:'pointer', outline:'none' }}>
                        {ROLES.map(r => <option key={r} value={r} style={{ background:'#111827' }}>{r}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:'#94a3b8' }}>{u.team || '—'}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:600, background: u.is_active ? '#022c22' : '#1c0000', color: u.is_active ? '#34d399' : '#f87171', border:`1px solid ${u.is_active ? '#10b98140' : '#ef444440'}` }}>
                        {u.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:11, color:'#334155' }}>
                      {u.last_seen ? new Date(u.last_seen).toLocaleDateString('en-IN') : 'Never'}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => { setEditUser(u); setForm({ full_name: u.full_name || '', email: u.email || '', role: u.role || 'L1', team: u.team || 'L1', is_active: u.is_active ?? true }); setShowForm(true) }}
                          style={{ padding:'4px 10px', background:'#1e3a5f', border:'1px solid #3b82f640', borderRadius:6, color:'#60a5fa', cursor:'pointer', fontSize:11, fontWeight:600 }}>
                          Edit
                        </button>
                        <button onClick={() => toggleActive(u)}
                          style={{ padding:'4px 10px', background: u.is_active ? '#1c0000' : '#022c22', border:`1px solid ${u.is_active ? '#ef444440' : '#10b98140'}`, borderRadius:6, color: u.is_active ? '#f87171' : '#34d399', cursor:'pointer', fontSize:11, fontWeight:600 }}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

      </div>
      <style>{`* { box-sizing:border-box; } select option { background:#111827; }`}</style>
    </div>
  )
}
