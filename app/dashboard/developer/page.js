'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import { STATUS_CONFIG, PRIORITY_CONFIG, getSLAStatus } from '../../../lib/ticketRouter'
import GlobalNav from '../../../components/GlobalNav'

export default function DeveloperDashboard() {
  const router   = useRouter()
  const supabase = createClient()
  const [tickets, setTickets] = useState([])
  const [filter,  setFilter]  = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => { init() }, [])

  async function init() {
    try {
      const { user } = await getCurrentUserProfile(supabase)
      if (!user) { router.replace('/login'); return }
      await loadTickets()
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  async function loadTickets() {
    try {
      const { data } = await supabase
        .from('tickets')
        .select('id, ticket_number, title, status, priority, assigned_team, ai_routing_reason, assigned_dev_reason, sla_resolve_due, created_at, categories(name, icon)')
        .order('created_at', { ascending: false })
      if (!data) return
      setTickets(data.filter(t => t.assigned_team === 'DEVELOPER' && t.status !== 'resolved' && t.status !== 'closed'))
    } catch(e) { console.error(e) }
  }

  const filtered = filter === 'all' ? tickets : tickets.filter(t => {
    if (filter === 'critical') return t.priority === 'critical'
    if (filter === 'high')     return t.priority === 'high'
    if (filter === 'breached') return getSLAStatus(t.sla_resolve_due, t.status).label === 'BREACHED'
    return t.status === filter
  })

  const stats = {
    total:    tickets.length,
    open:     tickets.filter(t => t.status === 'open').length,
    progress: tickets.filter(t => t.status === 'in_progress').length,
    breached: tickets.filter(t => getSLAStatus(t.sla_resolve_due, t.status).label === 'BREACHED').length,
    critical: tickets.filter(t => t.priority === 'critical').length,
    high:     tickets.filter(t => t.priority === 'high').length,
  }

  if (loading) return <Loader />

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}} .trow:hover{background:#0f172a!important;cursor:pointer;} .fchip:hover{opacity:0.85!important;}`}</style>

      <GlobalNav title="Developer Queue" />

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 24px' }}>
        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:24 }}>
          {[
            ['👨‍💻','Dev Tickets', stats.total,    '#06b6d4','#083344'],
            ['📂','Open',        stats.open,     '#f59e0b','#451a03'],
            ['⚙️','In Progress', stats.progress, '#8b5cf6','#2e1065'],
            ['🔴','SLA Breach',  stats.breached, '#ef4444','#450a0a'],
            ['🚨','Critical P1', stats.critical, '#f97316','#431407'],
            ['🟠','High P2',     stats.high,     '#fbbf24','#451a03'],
          ].map(([icon,label,val,color,bg],i) => (
            <div key={label} style={{ background:'#111827', border:`1px solid ${color}30`, borderRadius:14, padding:'14px 16px', animation:`fadeUp 0.4s ${i*0.05}s ease both` }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{icon}</div>
              <div style={{ fontSize:22, fontWeight:700, color, fontFamily:"'Syne',sans-serif" }}>{val}</div>
              <div style={{ fontSize:10, color:'#64748b', marginTop:1 }}>{label}</div>
            </div>
          ))}
        </div>

        {stats.breached > 0 && (
          <div style={{ background:'#450a0a', border:'1px solid #ef444440', borderRadius:10, padding:'11px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
            <span>🚨</span>
            <span style={{ color:'#fca5a5', fontSize:13 }}><strong>{stats.breached} SLA BREACH{stats.breached>1?'ES':''}</strong> — Code fix needed urgently!</span>
            <button onClick={() => setFilter('breached')} style={{ marginLeft:'auto', background:'#ef4444', border:'none', color:'#fff', padding:'5px 12px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600 }}>View →</button>
          </div>
        )}

        {/* Filters */}
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          {[['all','All Tickets'],['open','Open'],['in_progress','In Progress'],['pending_user','Pending User'],['critical','🚨 Critical P1'],['high','🟠 High P2'],['breached','🔴 SLA Breached']].map(([val,label]) => (
            <button key={val} className="fchip" onClick={() => setFilter(val)} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', transition:'all 0.2s', border:'1px solid', background:filter===val?'#083344':'transparent', color:filter===val?'#06b6d4':'#64748b', borderColor:filter===val?'#06b6d440':'#1f2d45' }}>{label}</button>
          ))}
          <button onClick={loadTickets} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, border:'1px solid #1f2d45', background:'transparent', color:'#475569', cursor:'pointer', marginLeft:'auto' }}>🔄 Refresh</button>
        </div>

        {/* Table */}
        <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, overflow:'hidden' }}>
          <div style={{ padding:'16px 24px', borderBottom:'1px solid #1f2d45' }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700 }}>Code Bug Tickets <span style={{ fontSize:13, color:'#475569', fontWeight:400 }}>({filtered.length} tickets)</span></h2>
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding:48, textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
              <p style={{ color:'#475569', marginBottom:8 }}>No tickets in this view</p>
              <button onClick={() => { setFilter('all'); loadTickets() }} style={{ padding:'8px 20px', background:'#083344', border:'1px solid #06b6d440', color:'#06b6d4', borderRadius:8, cursor:'pointer', fontSize:13 }}>Show All</button>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'#0a0e1a' }}>
                  {['Ticket #','Title','Category','Priority','Status','SLA','Dev Reason','Actions'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filtered.map(t => {
                    const sla  = getSLAStatus(t.sla_resolve_due, t.status)
                    const stat = STATUS_CONFIG[t.status]     || STATUS_CONFIG.open
                    const prio = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium
                    return (
                      <tr key={t.id} className="trow" onClick={() => router.push(`/tickets/${t.id}`)} style={{ borderTop:'1px solid #1f2d45', transition:'background 0.15s' }}>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontSize:11, fontWeight:700, color:'#06b6d4', fontFamily:'monospace' }}>{t.ticket_number}</span></td>
                        <td style={{ padding:'11px 14px', maxWidth:200 }}><span style={{ fontSize:13, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</span></td>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontSize:11, color:'#94a3b8' }}>{t.categories?.icon} {t.categories?.name||'—'}</span></td>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontSize:11, fontWeight:600, padding:'3px 7px', borderRadius:5, background:prio.bg, color:prio.color }}>{prio.label}</span></td>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontSize:11, fontWeight:600, padding:'3px 7px', borderRadius:5, background:stat.bg, color:stat.color }}>{stat.label}</span></td>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontSize:11, fontWeight:600, padding:'3px 7px', borderRadius:5, background:sla.bg, color:sla.color }}>{sla.icon} {sla.label}</span></td>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontSize:10, color:'#06b6d4', maxWidth:120, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.assigned_dev_reason||'—'}</span></td>
                        <td style={{ padding:'11px 14px' }} onClick={e=>e.stopPropagation()}>
                          <button onClick={() => router.push(`/tickets/${t.id}`)} style={{ background:'#083344', border:'none', color:'#06b6d4', padding:'5px 10px', borderRadius:6, cursor:'pointer', fontSize:11 }}>View</button>
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
