'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import { STATUS_CONFIG, PRIORITY_CONFIG, getSLAStatus } from '../../../lib/ticketRouter'

export default function UserDashboard() {
  const router   = useRouter()
  const supabase = createClient()
  const [profile, setProfile]  = useState(null)
  const [tickets, setTickets]  = useState([])
  const [loading, setLoading]  = useState(true)

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    setProfile(p)
    await loadTickets(user.id)
    setLoading(false)
  }

  async function loadTickets(uid) {
    const { data: { user } } = await supabase.auth.getUser()
    const userId = uid || user?.id
    // Fetch ALL tickets — no status filter so resolved shows too
    const { data } = await supabase
      .from('tickets')
      .select('id, ticket_number, title, status, priority, assigned_team, sla_resolve_due, created_at, categories(name, icon)')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
    if (data) setTickets(data)
  }

  const stats = {
    total:      tickets.length,
    open:       tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => ['in_progress','escalated','assigned'].includes(t.status)).length,
    resolved:   tickets.filter(t => ['resolved','closed'].includes(t.status)).length,
  }

  if (loading) return <Loader />

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .trow:hover { background:#0f172a!important; cursor:pointer; }
      `}</style>

      {/* Navbar */}
      <div style={{ background:'#111827', borderBottom:'1px solid #1f2d45', padding:'0 28px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#3b82f6,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⚡</div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800 }}>Nex<span style={{ color:'#06b6d4' }}>Desk</span></span>
          <span style={{ color:'#334155', margin:'0 6px' }}>›</span>
          <span style={{ color:'#64748b', fontSize:14 }}>My Support Portal</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, background:'#052e16', color:'#34d399', border:'1px solid #10b98140' }}>END USER</span>
          <span style={{ fontSize:13, color:'#64748b' }}>{profile?.email}</span>
          <button onClick={async () => { await supabase.auth.signOut(); router.replace('/login') }} style={{ background:'transparent', border:'1px solid #1f2d45', color:'#64748b', padding:'6px 14px', borderRadius:8, cursor:'pointer', fontSize:12 }}>Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'32px 24px' }}>

        {/* Welcome */}
        <div style={{ marginBottom:28, animation:'fadeUp 0.4s ease' }}>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, marginBottom:6 }}>
            Hello, {profile?.full_name || 'User'} 👋
          </h1>
          <p style={{ color:'#64748b', fontSize:14 }}>Raise a new IT support ticket or track your existing requests.</p>
        </div>

        {/* Stats + Raise button */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 180px', gap:14, marginBottom:28 }}>
          {[
            ['🎫', 'Total Tickets', stats.total,      '#3b82f6', '#1e3a5f'],
            ['📂', 'Open',          stats.open,       '#f59e0b', '#451a03'],
            ['⚙️', 'In Progress',   stats.inProgress, '#8b5cf6', '#2e1065'],
            ['✅', 'Resolved',      stats.resolved,   '#10b981', '#052e16'],
          ].map(([icon, label, val, color, bg], i) => (
            <div key={label} style={{ background:'#111827', border:`1px solid ${color}30`, borderRadius:14, padding:'18px 20px', animation:`fadeUp 0.4s ${i*0.06}s ease both` }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{icon}</div>
              <div style={{ fontSize:26, fontWeight:700, color, fontFamily:"'Syne',sans-serif" }}>{val}</div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{label}</div>
            </div>
          ))}
          <button onClick={() => router.push('/tickets/new')}
            style={{ background:'linear-gradient(135deg,#2563eb,#3b82f6)', border:'none', borderRadius:14, color:'#fff', cursor:'pointer', fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, animation:'fadeUp 0.4s 0.24s ease both', boxShadow:'0 4px 20px rgba(59,130,246,0.3)', transition:'transform 0.2s', padding:0 }}
            onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
            <span style={{ fontSize:24 }}>+</span>
            <span>Raise Ticket</span>
          </button>
        </div>

        {/* Tickets Table */}
        <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, overflow:'hidden', animation:'fadeUp 0.4s 0.3s ease both' }}>
          <div style={{ padding:'18px 24px', borderBottom:'1px solid #1f2d45', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700 }}>
              My Tickets
              <span style={{ fontSize:13, color:'#475569', fontFamily:"'DM Sans',sans-serif", fontWeight:400, marginLeft:8 }}>{tickets.length} tickets</span>
            </h2>
            <button onClick={() => loadTickets()} style={{ background:'transparent', border:'none', color:'#475569', cursor:'pointer', fontSize:12 }}>🔄 Refresh</button>
          </div>

          {tickets.length === 0 ? (
            <div style={{ padding:56, textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:14 }}>🎫</div>
              <p style={{ color:'#475569', fontSize:15, marginBottom:6 }}>No tickets yet</p>
              <p style={{ color:'#334155', fontSize:13, marginBottom:20 }}>Click "Raise Ticket" to create your first support request</p>
              <button onClick={() => router.push('/tickets/new')} style={{ padding:'12px 28px', background:'linear-gradient(135deg,#2563eb,#3b82f6)', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:14, fontWeight:600 }}>
                + Raise Ticket
              </button>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#0a0e1a' }}>
                    {['Ticket #','Issue','Category','Priority','Status','Team','SLA','Date'].map(h => (
                      <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => {
                    const sla  = getSLAStatus(t.sla_resolve_due, t.status)
                    const stat = STATUS_CONFIG[t.status]     || STATUS_CONFIG.open
                    const prio = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium
                    const tc   = t.assigned_team==='L2'?{c:'#a78bfa',bg:'#2e1065'}:t.assigned_team==='DEVELOPER'?{c:'#06b6d4',bg:'#083344'}:{c:'#60a5fa',bg:'#1e3a5f'}
                    const isResolved = ['resolved','closed'].includes(t.status)
                    return (
                      <tr key={t.id} className="trow"
                        onClick={() => router.push(`/tickets/${t.id}`)}
                        style={{ borderTop:'1px solid #1f2d45', transition:'background 0.15s', opacity: isResolved ? 0.75 : 1 }}>
                        <td style={{ padding:'12px 16px' }}>
                          <span style={{ fontSize:12, fontWeight:700, color: isResolved ? '#475569' : '#3b82f6', fontFamily:'monospace' }}>{t.ticket_number}</span>
                        </td>
                        <td style={{ padding:'12px 16px', maxWidth:220 }}>
                          <span style={{ fontSize:13, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textDecoration: isResolved ? 'line-through' : 'none', color: isResolved ? '#475569' : '#e2e8f0' }}>{t.title}</span>
                        </td>
                        <td style={{ padding:'12px 16px' }}>
                          <span style={{ fontSize:12, color:'#94a3b8' }}>{t.categories?.icon} {t.categories?.name || '—'}</span>
                        </td>
                        <td style={{ padding:'12px 16px' }}>
                          <span style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:5, background:prio.bg, color:prio.color }}>{prio.label}</span>
                        </td>
                        <td style={{ padding:'12px 16px' }}>
                          <span style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:5, background:stat.bg, color:stat.color }}>{stat.label}</span>
                        </td>
                        <td style={{ padding:'12px 16px' }}>
                          <span style={{ fontSize:11, padding:'3px 7px', borderRadius:5, background:tc.bg, color:tc.c, fontWeight:600 }}>{t.assigned_team}</span>
                        </td>
                        <td style={{ padding:'12px 16px' }}>
                          {isResolved
                            ? <span style={{ fontSize:11, color:'#10b981' }}>✅ Done</span>
                            : <span style={{ fontSize:11, fontWeight:600, padding:'3px 7px', borderRadius:5, background:sla.bg, color:sla.color }}>{sla.icon} {sla.label}</span>
                          }
                        </td>
                        <td style={{ padding:'12px 16px' }}>
                          <span style={{ fontSize:12, color:'#475569' }}>{new Date(t.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Loader() {
  return <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#10b981', animation:'spin 0.7s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}
