'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import { STATUS_CONFIG, PRIORITY_CONFIG, getSLAStatus } from '../../../lib/ticketRouter'

export default function DeveloperDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState(null)
  const [tickets, setTickets] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    setProfile(p)
    await loadTickets()
    setLoading(false)
  }

  async function loadTickets() {
    const { data } = await supabase
      .from('tickets')
      .select('*, categories(name,icon), profiles!tickets_created_by_fkey(full_name,email)')
      .eq('assigned_team', 'DEVELOPER')
      .not('status', 'in', '(resolved,closed)')
      .order('created_at', { ascending: false })
    if (data) setTickets(data)
  }

  const filtered = filter === 'all' ? tickets : tickets.filter(t => {
    if (filter === 'critical') return t.priority === 'critical'
    if (filter === 'high')     return t.priority === 'high'
    return t.status === filter
  })

  const stats = {
    total:    tickets.length,
    critical: tickets.filter(t => t.priority === 'critical').length,
    high:     tickets.filter(t => t.priority === 'high').length,
    breached: tickets.filter(t => { const s = getSLAStatus(t.sla_resolve_due, t.status); return s.label === 'BREACHED' }).length,
  }

  if (loading) return <Loader />

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .trow:hover { background:#0f172a!important; cursor:pointer; }
        .fchip:hover { opacity:0.8!important; }
      `}</style>

      <div style={{ background:'#111827', borderBottom:'1px solid #1f2d45', padding:'0 28px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#3b82f6,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⚡</div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800 }}>Nex<span style={{ color:'#06b6d4' }}>Desk</span></span>
          <span style={{ color:'#334155', margin:'0 6px' }}>›</span>
          <span style={{ color:'#64748b', fontSize:14 }}>Developer Queue</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, background:'#083344', color:'#06b6d4', border:'1px solid #06b6d440' }}>DEVELOPER</span>
          <span style={{ fontSize:13, color:'#64748b' }}>{profile?.email}</span>
          <button onClick={async () => { await supabase.auth.signOut(); router.replace('/login') }} style={{ background:'transparent', border:'1px solid #1f2d45', color:'#64748b', padding:'6px 14px', borderRadius:8, cursor:'pointer', fontSize:12 }}>Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 24px' }}>
        <div style={{ marginBottom:24, animation:'fadeUp 0.4s ease' }}>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, marginBottom:4 }}>Developer Queue 👨‍💻</h1>
          <p style={{ color:'#64748b', fontSize:14 }}>Code bugs, API fixes & database issues assigned to your team</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
          {[['👨‍💻','Dev Tickets',stats.total,'#06b6d4','#083344'],['🔴','Critical P1',stats.critical,'#ef4444','#450a0a'],['🟠','High P2',stats.high,'#f97316','#431407'],['⏰','SLA Breached',stats.breached,'#f59e0b','#451a03']].map(([icon,label,val,color,bg],i)=>(
            <div key={label} style={{ background:'#111827', border:`1px solid ${color}30`, borderRadius:14, padding:'16px 20px', animation:`fadeUp 0.4s ${i*0.06}s ease both` }}>
              <div style={{ fontSize:20, marginBottom:4 }}>{icon}</div>
              <div style={{ fontSize:24, fontWeight:700, color, fontFamily:"'Syne',sans-serif" }}>{val}</div>
              <div style={{ fontSize:11, color:'#64748b', marginTop:1 }}>{label}</div>
            </div>
          ))}
        </div>

        {stats.critical > 0 && (
          <div style={{ background:'#450a0a', border:'1px solid #ef444440', borderRadius:10, padding:'12px 16px', marginBottom:18, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:18 }}>🚨</span>
            <span style={{ color:'#fca5a5', fontSize:13, fontWeight:500 }}><strong>{stats.critical} CRITICAL P1</strong> code bug{stats.critical>1?'s':''} — requires immediate fix!</span>
            <button onClick={() => setFilter('critical')} style={{ marginLeft:'auto', background:'#ef4444', border:'none', color:'#fff', padding:'5px 12px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600 }}>View Now →</button>
          </div>
        )}

        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          {[['all','All Tickets'],['in_progress','In Progress'],['critical','🔴 Critical P1'],['high','🟠 High P2']].map(([val,label])=>(
            <button key={val} className="fchip" onClick={()=>setFilter(val)} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', transition:'all 0.2s', border:'1px solid', background:filter===val?'#083344':'transparent', color:filter===val?'#06b6d4':'#64748b', borderColor:filter===val?'#06b6d440':'#1f2d45' }}>{label}</button>
          ))}
          <button onClick={loadTickets} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, border:'1px solid #1f2d45', background:'transparent', color:'#475569', cursor:'pointer', marginLeft:'auto' }}>🔄 Refresh</button>
        </div>

        <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, overflow:'hidden' }}>
          <div style={{ padding:'16px 24px', borderBottom:'1px solid #1f2d45' }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700 }}>Code Bug Tickets <span style={{ fontSize:13, color:'#475569', fontFamily:"'DM Sans',sans-serif", fontWeight:400 }}>({filtered.length})</span></h2>
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding:56, textAlign:'center' }}>
              <div style={{ fontSize:44, marginBottom:12 }}>✅</div>
              <p style={{ color:'#475569', fontSize:15 }}>No tickets in this queue</p>
              <p style={{ color:'#334155', fontSize:12 }}>All clear! No code bugs assigned to developer team.</p>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'#0a0e1a' }}>
                  {['Ticket #','Title','Raised By','Category','Priority','Status','SLA','AI Reason','Dev Reason','Actions'].map(h=>(
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filtered.map(t => {
                    const sla  = getSLAStatus(t.sla_resolve_due, t.status)
                    const stat = STATUS_CONFIG[t.status]     || STATUS_CONFIG.open
                    const prio = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium
                    return (
                      <tr key={t.id} className="trow" onClick={()=>router.push(`/tickets/${t.id}`)} style={{ borderTop:'1px solid #1f2d45', transition:'background 0.15s' }}>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontSize:11, fontWeight:700, color:'#06b6d4', fontFamily:'monospace' }}>{t.ticket_number}</span></td>
                        <td style={{ padding:'11px 14px', maxWidth:180 }}><span style={{ fontSize:13, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</span></td>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontSize:12, color:'#94a3b8' }}>{t.profiles?.full_name||t.profiles?.email?.split('@')[0]||'User'}</span></td>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontSize:11, color:'#94a3b8' }}>{t.categories?.icon} {t.categories?.name||'—'}</span></td>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontSize:11, fontWeight:600, padding:'3px 7px', borderRadius:5, background:prio.bg, color:prio.color }}>{prio.label}</span></td>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontSize:11, fontWeight:600, padding:'3px 7px', borderRadius:5, background:stat.bg, color:stat.color }}>{stat.label}</span></td>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontSize:11, fontWeight:600, padding:'3px 7px', borderRadius:5, background:sla.bg, color:sla.color }}>{sla.icon} {sla.label}</span></td>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontSize:10, color:'#475569', maxWidth:120, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.ai_routing_reason||'—'}</span></td>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontSize:10, color:'#06b6d4', maxWidth:120, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.assigned_dev_reason||'—'}</span></td>
                        <td style={{ padding:'11px 14px' }} onClick={e=>e.stopPropagation()}>
                          <button onClick={()=>router.push(`/tickets/${t.id}`)} style={{ background:'#083344', border:'none', color:'#06b6d4', padding:'5px 10px', borderRadius:6, cursor:'pointer', fontSize:11 }}>View</button>
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
  return <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#06b6d4', animation:'spin 0.7s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}