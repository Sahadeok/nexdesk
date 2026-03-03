'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import { STATUS_CONFIG, PRIORITY_CONFIG, getSLAStatus } from '../../../lib/ticketRouter'

export default function L2Dashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState(null)
  const [tickets, setTickets] = useState([])
  const [tab, setTab] = useState('l2')
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
       .select('*, categories(name,icon), profiles(full_name,email,role)')
	  .neq('status', 'resolved')
      .neq('status', 'closed')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })
    if (data) setTickets(data)
  }

  const l2Tickets  = tickets.filter(t => t.assigned_team === 'L2')
  const escTickets = tickets.filter(t => t.escalated_to_l2 === true)
  const devTickets = tickets.filter(t => t.assigned_team === 'DEVELOPER')
  const allTickets = tickets

  const tabData = { l2: l2Tickets, escalated: escTickets, developer: devTickets, all: allTickets }
  const shown = tabData[tab] || []

  const stats = {
    l2:        l2Tickets.length,
    escalated: escTickets.length,
    developer: devTickets.length,
    critical:  tickets.filter(t=>t.priority==='critical').length,
  }

  if (loading) return <Loader />

  return (
    <div style={{minHeight:'100vh',background:'#0a0e1a',fontFamily:"'DM Sans',sans-serif",color:'#e2e8f0'}}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}} .trow:hover{background:#0f172a!important;cursor:pointer;}`}</style>

      {/* Navbar */}
      <div style={{background:'#111827',borderBottom:'1px solid #1f2d45',padding:'0 28px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#3b82f6,#06b6d4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>⚡</div>
          <span style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800}}>Nex<span style={{color:'#06b6d4'}}>Desk</span></span>
          <span style={{color:'#334155',margin:'0 6px'}}>›</span>
          <span style={{color:'#64748b',fontSize:14}}>L2 Technical Queue</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{padding:'4px 10px',borderRadius:6,fontSize:11,fontWeight:600,background:'#2e1065',color:'#a78bfa',border:'1px solid #8b5cf640'}}>
            {profile?.role === 'ADMIN' ? 'ADMIN' : 'L2 AGENT'}
          </span>
          <span style={{fontSize:13,color:'#64748b'}}>{profile?.email}</span>
          <button onClick={()=>router.push('/tickets/new')} style={{background:'#2e1065',border:'1px solid #8b5cf640',color:'#a78bfa',padding:'6px 14px',borderRadius:8,cursor:'pointer',fontSize:12}}>+ New Ticket</button>
          <button onClick={async()=>{await supabase.auth.signOut();router.replace('/login')}} style={{background:'transparent',border:'1px solid #1f2d45',color:'#64748b',padding:'6px 14px',borderRadius:8,cursor:'pointer',fontSize:12}}>Sign Out</button>
        </div>
      </div>

      <div style={{maxWidth:1300,margin:'0 auto',padding:'28px 24px'}}>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
          {[['⚠️','L2 Queue',stats.l2,'#8b5cf6','#2e1065'],['🔺','Escalated from L1',stats.escalated,'#f97316','#431407'],['👨‍💻','Dev Assigned',stats.developer,'#06b6d4','#083344'],['🔴','Critical',stats.critical,'#ef4444','#450a0a']].map(([icon,label,val,color,bg],i)=>(
            <div key={label} style={{background:'#111827',border:`1px solid ${color}30`,borderRadius:14,padding:'16px 20px',animation:`fadeUp 0.4s ${i*0.06}s ease both`}}>
              <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
              <div style={{fontSize:24,fontWeight:700,color,fontFamily:"'Syne',sans-serif"}}>{val}</div>
              <div style={{fontSize:11,color:'#64748b',marginTop:1}}>{label}</div>
            </div>
          ))}
        </div>

        {/* Alert banner for critical tickets */}
        {stats.critical > 0 && (
          <div style={{background:'#450a0a',border:'1px solid #ef444440',borderRadius:10,padding:'12px 16px',marginBottom:18,display:'flex',alignItems:'center',gap:10,animation:'fadeUp 0.4s ease'}}>
            <span style={{fontSize:18}}>🚨</span>
            <span style={{color:'#fca5a5',fontSize:13,fontWeight:500}}><strong>{stats.critical} CRITICAL ticket{stats.critical>1?'s':''}</strong> require immediate attention!</span>
            <button onClick={()=>setTab('all')} style={{marginLeft:'auto',background:'#ef4444',border:'none',color:'#fff',padding:'5px 12px',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:600}}>View Now →</button>
          </div>
        )}

        {/* Tabs */}
        <div style={{display:'flex',gap:2,marginBottom:20,background:'#111827',borderRadius:12,padding:4,border:'1px solid #1f2d45',width:'fit-content'}}>
          {[['l2','⚠️ L2 Queue',stats.l2],['escalated','🔺 Escalated',stats.escalated],['developer','👨‍💻 Developer',stats.developer],['all','📋 All Active',allTickets.length]].map(([val,label,count])=>(
            <button key={val} onClick={()=>setTab(val)} style={{padding:'8px 16px',borderRadius:9,fontSize:13,cursor:'pointer',transition:'all 0.2s',border:'none',fontFamily:"'DM Sans',sans-serif",fontWeight:tab===val?600:400,background:tab===val?'#1a2236':'transparent',color:tab===val?'#e2e8f0':'#64748b'}}>
              {label} <span style={{fontSize:11,padding:'1px 6px',borderRadius:10,background:tab===val?'#3b82f620':'#1f2d45',color:tab===val?'#60a5fa':'#475569',marginLeft:4}}>{count}</span>
            </button>
          ))}
        </div>

        {/* Tickets table */}
        <div style={{background:'#111827',border:'1px solid #1f2d45',borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'16px 24px',borderBottom:'1px solid #1f2d45'}}>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700}}>
              {tab==='l2'?'L2 Technical Tickets':tab==='escalated'?'Escalated from L1':tab==='developer'?'Developer Assigned':'All Active Tickets'}
              <span style={{fontSize:13,color:'#475569',fontFamily:"'DM Sans',sans-serif",fontWeight:400,marginLeft:8}}>({shown.length})</span>
            </h2>
          </div>
          {shown.length === 0 ? (
            <div style={{padding:48,textAlign:'center'}}><div style={{fontSize:40,marginBottom:10}}>✅</div><p style={{color:'#475569'}}>No tickets in this queue</p></div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:'#0a0e1a'}}>
                  {['Ticket #','Title','Raised By','Category','Priority','Status','Team','SLA','AI Reason','Actions'].map(h=>(
                    <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:600,color:'#475569',textTransform:'uppercase',letterSpacing:'0.5px',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {shown.map(t => {
                    const sla  = getSLAStatus(t.sla_resolve_due, t.status)
                    const stat = STATUS_CONFIG[t.status] || STATUS_CONFIG.open
                    const prio = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium
                    const teamColor = t.assigned_team==='DEVELOPER' ? {bg:'#083344',color:'#06b6d4'} : t.assigned_team==='L2' ? {bg:'#2e1065',color:'#a78bfa'} : {bg:'#1e3a5f',color:'#60a5fa'}
                    return (
                      <tr key={t.id} className="trow" onClick={()=>router.push(`/tickets/${t.id}`)} style={{borderTop:'1px solid #1f2d45',transition:'background 0.15s'}}>
                        <td style={{padding:'11px 14px'}}><span style={{fontSize:11,fontWeight:700,color:'#8b5cf6',fontFamily:'monospace'}}>{t.ticket_number}</span></td>
                        <td style={{padding:'11px 14px',maxWidth:200}}><span style={{fontSize:13,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</span></td>
                        <td style={{padding:'11px 14px'}}><span style={{fontSize:12,color:'#94a3b8'}}>{t.profiles?.full_name||t.profiles?.email?.split('@')[0]||'User'}</span></td>
                        <td style={{padding:'11px 14px'}}><span style={{fontSize:11,color:'#94a3b8'}}>{t.categories?.icon} {t.categories?.name||'—'}</span></td>
                        <td style={{padding:'11px 14px'}}><span style={{fontSize:11,fontWeight:600,padding:'3px 7px',borderRadius:5,background:prio.bg,color:prio.color}}>{prio.label}</span></td>
                        <td style={{padding:'11px 14px'}}><span style={{fontSize:11,fontWeight:600,padding:'3px 7px',borderRadius:5,background:stat.bg,color:stat.color}}>{stat.label}</span></td>
                        <td style={{padding:'11px 14px'}}><span style={{fontSize:11,padding:'3px 7px',borderRadius:5,background:teamColor.bg,color:teamColor.color,fontWeight:600}}>{t.assigned_team}</span></td>
                        <td style={{padding:'11px 14px'}}><span style={{fontSize:11,fontWeight:600,padding:'3px 7px',borderRadius:5,background:sla.bg,color:sla.color}}>{sla.icon} {sla.label}</span></td>
                        <td style={{padding:'11px 14px'}}><span style={{fontSize:10,color:'#475569',maxWidth:130,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.ai_routing_reason||'—'}</span></td>
                        <td style={{padding:'11px 14px'}} onClick={e=>e.stopPropagation()}>
                          <button onClick={()=>router.push(`/tickets/${t.id}`)} style={{background:'#2e1065',border:'none',color:'#a78bfa',padding:'5px 10px',borderRadius:6,cursor:'pointer',fontSize:11}}>View</button>
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
  return <div style={{minHeight:'100vh',background:'#0a0e1a',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:40,height:40,borderRadius:'50%',border:'3px solid #1f2d45',borderTopColor:'#8b5cf6',animation:'spin 0.7s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}
