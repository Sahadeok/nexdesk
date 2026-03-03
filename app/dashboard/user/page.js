'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import { STATUS_CONFIG, PRIORITY_CONFIG, getSLAStatus } from '../../../lib/ticketRouter'

export default function UserDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total:0, open:0, inProgress:0, resolved:0 })

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    setProfile(p)
    const { data } = await supabase.from('tickets').select('*, categories(name,icon)').eq('created_by', user.id).order('created_at', { ascending: false })
    if (data) {
      setTickets(data)
      setStats({ total: data.length, open: data.filter(t=>['open','assigned'].includes(t.status)).length, inProgress: data.filter(t=>t.status==='in_progress').length, resolved: data.filter(t=>['resolved','closed'].includes(t.status)).length })
    }
    setLoading(false)
  }

  if (loading) return <Loader />

  const S = { page: { minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }, nav: { background:'#111827', borderBottom:'1px solid #1f2d45', padding:'0 28px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }, content: { maxWidth:1100, margin:'0 auto', padding:'32px 24px' } }

  return (
    <div style={S.page}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}} .trow:hover{background:#0f172a!important;cursor:pointer;} .rbtn:hover{background:#1d4ed8!important;transform:translateY(-1px);}`}</style>

      {/* Navbar */}
      <div style={S.nav}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#3b82f6,#06b6d4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>⚡</div>
          <span style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800}}>Nex<span style={{color:'#06b6d4'}}>Desk</span></span>
          <span style={{color:'#334155',margin:'0 6px'}}>›</span>
          <span style={{color:'#64748b',fontSize:14}}>My Support Portal</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{padding:'4px 10px',borderRadius:6,fontSize:11,fontWeight:600,background:'#052e16',color:'#10b981',border:'1px solid #10b98140'}}>END USER</span>
          <span style={{fontSize:13,color:'#64748b'}}>{profile?.email}</span>
          <button onClick={async()=>{await supabase.auth.signOut();router.replace('/login')}} style={{background:'transparent',border:'1px solid #1f2d45',color:'#64748b',padding:'6px 14px',borderRadius:8,cursor:'pointer',fontSize:12}}>Sign Out</button>
        </div>
      </div>

      <div style={S.content}>
        <div style={{marginBottom:28,animation:'fadeUp 0.4s ease'}}>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,marginBottom:4}}>Hello, {profile?.full_name || 'there'} 👋</h1>
          <p style={{color:'#64748b',fontSize:14}}>Raise a new IT support ticket or track your existing requests.</p>
        </div>

        {/* Stats row */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 160px',gap:14,marginBottom:28}}>
          {[['🎫','Total Tickets',stats.total,'#3b82f6','#1e3a5f'],['📂','Open',stats.open,'#f59e0b','#451a03'],['⚙️','In Progress',stats.inProgress,'#8b5cf6','#2e1065'],['✅','Resolved',stats.resolved,'#10b981','#052e16']].map(([icon,label,val,color,bg],i)=>(
            <div key={label} style={{background:'#111827',border:`1px solid ${color}30`,borderRadius:14,padding:'18px 20px',animation:`fadeUp 0.4s ${i*0.07}s ease both`}}>
              <div style={{fontSize:22,marginBottom:6}}>{icon}</div>
              <div style={{fontSize:26,fontWeight:700,color,fontFamily:"'Syne',sans-serif"}}>{val}</div>
              <div style={{fontSize:12,color:'#64748b',marginTop:1}}>{label}</div>
            </div>
          ))}
          <button className="rbtn" onClick={()=>router.push('/tickets/new')} style={{background:'linear-gradient(135deg,#2563eb,#3b82f6)',border:'none',borderRadius:14,color:'#fff',fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 20px rgba(59,130,246,0.3)',transition:'all 0.2s',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4}}>
            <span style={{fontSize:28,lineHeight:1}}>+</span>
            <span>Raise Ticket</span>
          </button>
        </div>

        {/* Tickets table */}
        <div style={{background:'#111827',border:'1px solid #1f2d45',borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'18px 24px',borderBottom:'1px solid #1f2d45',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:700}}>My Tickets</h2>
            <span style={{color:'#475569',fontSize:13}}>{tickets.length} tickets</span>
          </div>
          {tickets.length === 0 ? (
            <div style={{padding:56,textAlign:'center'}}>
              <div style={{fontSize:44,marginBottom:12}}>🎟️</div>
              <p style={{color:'#475569',fontSize:15,marginBottom:4}}>No tickets yet</p>
              <p style={{color:'#334155',fontSize:12}}>Click "Raise Ticket" above to report your first issue</p>
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:'#0a0e1a'}}>
                  {['Ticket #','Issue','Category','Priority','Status','Team','SLA','Date'].map(h=>(
                    <th key={h} style={{padding:'11px 16px',textAlign:'left',fontSize:10,fontWeight:600,color:'#475569',textTransform:'uppercase',letterSpacing:'0.5px',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {tickets.map(t => {
                    const sla = getSLAStatus(t.sla_resolve_due, t.status)
                    const stat = STATUS_CONFIG[t.status] || STATUS_CONFIG.open
                    const prio = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium
                    return (
                      <tr key={t.id} className="trow" onClick={()=>router.push(`/tickets/${t.id}`)} style={{borderTop:'1px solid #1f2d45',transition:'background 0.15s'}}>
                        <td style={{padding:'12px 16px'}}><span style={{fontSize:12,fontWeight:600,color:'#3b82f6',fontFamily:"monospace"}}>{t.ticket_number}</span></td>
                        <td style={{padding:'12px 16px',maxWidth:200}}><span style={{fontSize:13,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</span></td>
                        <td style={{padding:'12px 16px'}}><span style={{fontSize:12,color:'#94a3b8'}}>{t.categories?.icon} {t.categories?.name||'—'}</span></td>
                        <td style={{padding:'12px 16px'}}><span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:5,background:prio.bg,color:prio.color}}>{prio.label}</span></td>
                        <td style={{padding:'12px 16px'}}><span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:5,background:stat.bg,color:stat.color}}>{stat.label}</span></td>
                        <td style={{padding:'12px 16px'}}><span style={{fontSize:11,padding:'3px 8px',borderRadius:5,background:t.assigned_team==='L2'?'#2e1065':'#1e3a5f',color:t.assigned_team==='L2'?'#a78bfa':'#60a5fa'}}>{t.assigned_team}</span></td>
                        <td style={{padding:'12px 16px'}}><span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:5,background:sla.bg,color:sla.color}}>{sla.icon} {sla.label}</span></td>
                        <td style={{padding:'12px 16px'}}><span style={{fontSize:11,color:'#475569'}}>{new Date(t.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span></td>
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
