'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import { STATUS_CONFIG, PRIORITY_CONFIG, getSLAStatus } from '../../../lib/ticketRouter'

export default function L1Dashboard() {
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
      .eq('assigned_team', 'L1')
      .neq('status', 'resolved')
	  .neq('status', 'closed')
      .order('created_at', { ascending: false })
    if (data) setTickets(data)
  }

  const filtered = filter === 'all' ? tickets : tickets.filter(t => {
    if (filter === 'breached') { const sla = getSLAStatus(t.sla_resolve_due, t.status); return sla.label === 'BREACHED' }
    if (filter === 'critical') return t.priority === 'critical'
    return t.status === filter
  })

  const stats = {
    total:     tickets.length,
    open:      tickets.filter(t => t.status === 'open').length,
    breached:  tickets.filter(t => { const s = getSLAStatus(t.sla_resolve_due, t.status); return s.label === 'BREACHED' }).length,
    critical:  tickets.filter(t => t.priority === 'critical').length,
  }

  if (loading) return <Loader />

  return (
    <div style={{minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0'}}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}} .trow:hover{background:#0f172a!important;cursor:pointer;} .fchip:hover{opacity:0.85!important;}`}</style>

      {/* Navbar */}
      <div style={{background:'#111827',borderBottom:'1px solid #1f2d45',padding:'0 28px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#3b82f6,#06b6d4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>⚡</div>
          <span style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800}}>Nex<span style={{color:'#06b6d4'}}>Desk</span></span>
          <span style={{color:'#334155',margin:'0 6px'}}>›</span>
          <span style={{color:'#64748b',fontSize:14}}>L1 Support Queue</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{padding:'4px 10px',borderRadius:6,fontSize:11,fontWeight:600,background:'#1e3a5f',color:'#60a5fa',border:'1px solid #3b82f640'}}>L1 AGENT</span>
          <span style={{fontSize:13,color:'#64748b'}}>{profile?.email}</span>
          <button onClick={()=>router.push('/tickets/new')} style={{background:'#1e3a5f',border:'1px solid #3b82f640',color:'#60a5fa',padding:'6px 14px',borderRadius:8,cursor:'pointer',fontSize:12}}>+ New Ticket</button>
          <button onClick={async()=>{await supabase.auth.signOut();router.replace('/login')}} style={{background:'transparent',border:'1px solid #1f2d45',color:'#64748b',padding:'6px 14px',borderRadius:8,cursor:'pointer',fontSize:12}}>Sign Out</button>
        </div>
      </div>

      <div style={{maxWidth:1200,margin:'0 auto',padding:'28px 24px'}}>
        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
          {[['🎫','L1 Queue',stats.total,'#3b82f6','#1e3a5f'],['📂','Open',stats.open,'#f59e0b','#451a03'],['🔴','SLA Breached',stats.breached,'#ef4444','#450a0a'],['⚠️','Critical',stats.critical,'#f97316','#431407']].map(([icon,label,val,color,bg],i)=>(
            <div key={label} style={{background:'#111827',border:`1px solid ${color}30`,borderRadius:14,padding:'16px 20px',animation:`fadeUp 0.4s ${i*0.06}s ease both`,cursor:label!=='L1 Queue'?'pointer':'default'}}
              onClick={()=>{ if(label==='SLA Breached') setFilter('breached'); else if(label==='Critical') setFilter('critical'); else if(label==='Open') setFilter('open'); }}>
              <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
              <div style={{fontSize:24,fontWeight:700,color,fontFamily:"'Syne',sans-serif"}}>{val}</div>
              <div style={{fontSize:11,color:'#64748b',marginTop:1}}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filter chips */}
        <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
          {[['all','All Tickets'],['open','Open'],['in_progress','In Progress'],['pending_user','Pending User'],['breached','SLA Breached'],['critical','Critical']].map(([val,label])=>(
            <button key={val} className="fchip" onClick={()=>setFilter(val)} style={{padding:'6px 14px',borderRadius:20,fontSize:12,fontWeight:500,cursor:'pointer',transition:'all 0.2s',border:'1px solid',background:filter===val?'#1e3a5f':'transparent',color:filter===val?'#60a5fa':'#64748b',borderColor:filter===val?'#3b82f640':'#1f2d45'}}>{label}</button>
          ))}
          <button onClick={loadTickets} style={{padding:'6px 14px',borderRadius:20,fontSize:12,border:'1px solid #1f2d45',background:'transparent',color:'#475569',cursor:'pointer',marginLeft:'auto'}}>🔄 Refresh</button>
        </div>

        {/* Queue table */}
        <div style={{background:'#111827',border:'1px solid #1f2d45',borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'16px 24px',borderBottom:'1px solid #1f2d45',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700}}>Ticket Queue <span style={{fontSize:13,color:'#475569',fontFamily:"'DM Sans',sans-serif",fontWeight:400}}>({filtered.length} tickets)</span></h2>
          </div>
          {filtered.length === 0 ? (
            <div style={{padding:48,textAlign:'center'}}><div style={{fontSize:40,marginBottom:10}}>🎉</div><p style={{color:'#475569'}}>No tickets in this view</p></div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:'#0a0e1a'}}>
                  {['Ticket #','Title','Raised By','Category','Priority','Status','SLA','AI Routing','Actions'].map(h=>(
                    <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:600,color:'#475569',textTransform:'uppercase',letterSpacing:'0.5px',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filtered.map(t => {
                    const sla  = getSLAStatus(t.sla_resolve_due, t.status)
                    const stat = STATUS_CONFIG[t.status] || STATUS_CONFIG.open
                    const prio = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium
                    return (
                      <tr key={t.id} className="trow" onClick={()=>router.push(`/tickets/${t.id}`)} style={{borderTop:'1px solid #1f2d45',transition:'background 0.15s'}}>
                        <td style={{padding:'11px 14px'}}><span style={{fontSize:11,fontWeight:700,color:'#3b82f6',fontFamily:'monospace'}}>{t.ticket_number}</span></td>
                        <td style={{padding:'11px 14px',maxWidth:200}}><span style={{fontSize:13,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</span></td>
                        <td style={{padding:'11px 14px'}}><span style={{fontSize:12,color:'#94a3b8'}}>{t.profiles?.full_name||t.profiles?.email?.split('@')[0]||'User'}</span></td>
                        <td style={{padding:'11px 14px'}}><span style={{fontSize:11,color:'#94a3b8'}}>{t.categories?.icon} {t.categories?.name||'—'}</span></td>
                        <td style={{padding:'11px 14px'}}><span style={{fontSize:11,fontWeight:600,padding:'3px 7px',borderRadius:5,background:prio.bg,color:prio.color}}>{prio.label}</span></td>
                        <td style={{padding:'11px 14px'}}><span style={{fontSize:11,fontWeight:600,padding:'3px 7px',borderRadius:5,background:stat.bg,color:stat.color}}>{stat.label}</span></td>
                        <td style={{padding:'11px 14px'}}><span style={{fontSize:11,fontWeight:600,padding:'3px 7px',borderRadius:5,background:sla.bg,color:sla.color}}>{sla.icon} {sla.label}</span></td>
                        <td style={{padding:'11px 14px'}}><span style={{fontSize:10,color:'#475569',maxWidth:140,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.ai_routing_reason||'Standard route'}</span></td>
                        <td style={{padding:'11px 14px'}} onClick={e=>e.stopPropagation()}>
                          <button onClick={()=>router.push(`/tickets/${t.id}`)} style={{background:'#1e3a5f',border:'none',color:'#60a5fa',padding:'5px 10px',borderRadius:6,cursor:'pointer',fontSize:11,marginRight:4}}>View</button>
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
  return <div style={{minHeight:'100vh',background:'#0a0e1a',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:40,height:40,borderRadius:'50%',border:'3px solid #1f2d45',borderTopColor:'#3b82f6',animation:'spin 0.7s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}
