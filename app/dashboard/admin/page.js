'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import { STATUS_CONFIG, PRIORITY_CONFIG, getSLAStatus } from '../../../lib/ticketRouter'
import GlobalNav from '../../components/GlobalNav'

export default function AdminDashboard() {
  const router   = useRouter()
  const supabase = createClient()
  const [tickets, setTickets] = useState([])
  const [tab,     setTab]     = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => { init() }, [])

  async function init() {
    try {
      const { user, profile: p } = await getCurrentUserProfile(supabase)
      if (!user) { router.replace('/login'); return }
      if (!['ADMIN','IT_MANAGER'].includes(p?.role)) { router.replace('/dashboard'); return }
      await loadTickets()
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  async function loadTickets() {
    const { data } = await supabase
      .from('tickets')
      .select('id, ticket_number, title, status, priority, assigned_team, escalated_to_l2, ai_routing_reason, sla_resolve_due, created_at, resolved_at, categories(name, icon)')
      .order('created_at', { ascending: false })
    if (data) setTickets(data)
  }

  const active   = tickets.filter(t => !['resolved','closed'].includes(t.status))
  const resolved = tickets.filter(t =>  ['resolved','closed'].includes(t.status))
  const l1T      = active.filter(t => t.assigned_team === 'L1')
  const l2T      = active.filter(t => t.assigned_team === 'L2')
  const devT     = active.filter(t => t.assigned_team === 'DEVELOPER')
  const escT     = active.filter(t => t.escalated_to_l2 === true)
  const breached = active.filter(t => getSLAStatus(t.sla_resolve_due, t.status, t.created_at, t.priority).label === 'BREACHED')
  const critical = active.filter(t => t.priority === 'critical')

  const shown = tab==='l1'?l1T:tab==='l2'?l2T:tab==='developer'?devT:tab==='escalated'?escT:tab==='breached'?breached:tab==='resolved'?resolved:tab==='critical'?critical:active

  if (loading) return <Loader />

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}} .trow:hover{background:#0f172a!important;cursor:pointer;} .scard:hover{transform:translateY(-2px);cursor:pointer;} .stab:hover{background:#1a2236!important;}`}</style>

      <GlobalNav title="Admin Console" />

      <div style={{ maxWidth:1400, margin:'0 auto', padding:'28px 24px' }}>

        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:4 }}>Admin Console 👑</h1>
          <p style={{ color:'#64748b', fontSize:13 }}>Full consolidated view — all teams, all tickets, all SLAs</p>
        </div>

        {/* ── Quick Access Tools ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:28 }}>
          {[
            { icon:'🧠', title:'AI Data Analyst',    desc:'Ask anything about tickets in plain English. Get instant insights, charts & download reports.', color:'#fbbf24', border:'#f59e0b40', bg:'linear-gradient(135deg,#1a1208,#2d1a02)', path:'/dashboard/analyst' },
            { icon:'📊', title:'Reports & Analytics', desc:'SLA performance, team stats, ticket trends, category breakdown and resolution rates.', color:'#60a5fa', border:'#3b82f640', bg:'linear-gradient(135deg,#0f1a2e,#1e3a5f)', path:'/dashboard/reports' },
            { icon:'🤖', title:'AI Log Analyzer',     desc:'Upload any server log — nohup.out, catalina.out, CloudWatch. AI finds root cause instantly.', color:'#a5b4fc', border:'#6366f140', bg:'linear-gradient(135deg,#0d1117,#1e1b4b)', path:'/log-analyzer' },
            { icon:'👥', title:'User Management',     desc:'Create users, assign roles, activate or deactivate accounts across all teams.', color:'#34d399', border:'#10b98140', bg:'linear-gradient(135deg,#022c22,#052e16)', path:'/dashboard/users' },
            { icon:'📋', title:'Ticket Templates',    desc:'Manage pre-built templates for common IT issues to speed up ticket creation.', color:'#fb923c', border:'#f9731640', bg:'linear-gradient(135deg,#1c0a00,#431407)', path:'/dashboard/templates' },
            { icon:'⚙️', title:'SLA Auto Engine',     desc:'Monitor SLA deadlines, auto-escalate breached tickets and view engine run history.', color:'#fbbf24', border:'#f59e0b40', bg:'linear-gradient(135deg,#161005,#1a1208)', path:'/dashboard/sla-engine' },
            { icon:'📚', title:'Knowledge Base',      desc:'Create and manage help articles. Users can self-solve before raising tickets.', color:'#06b6d4', border:'#06b6d440', bg:'linear-gradient(135deg,#031a22,#083344)', path:'/dashboard/kb-admin' },
            { icon:'⚡', title:'Bulk Actions',       desc:'Select multiple tickets and update status, team, priority or export to CSV.', color:'#a78bfa', border:'#8b5cf640', bg:'linear-gradient(135deg,#1a0a2e,#2e1065)', path:'/dashboard/bulk-actions' },
            { icon:'📺', title:'Executive View',     desc:'Live big-screen dashboard with real-time stats, SLA health and weekly trends.', color:'#34d399', border:'#10b98140', bg:'linear-gradient(135deg,#022c22,#052e16)', path:'/dashboard/executive' },
            { icon:'🔍', title:'Health Monitor',    desc:'Real-time API uptime, response times and auto-incident creation for critical services.', color:'#06b6d4', border:'#06b6d440', bg:'linear-gradient(135deg,#031a22,#083344)', path:'/dashboard/health' },
            { icon:'🤖', title:'AI Resolution',     desc:'Instant AI-powered resolution engine — detect, diagnose and fix issues before raising a ticket.', color:'#a5b4fc', border:'#6366f140', bg:'linear-gradient(135deg,#0d0d1f,#1e1b4b)', path:'/ai-resolution' },
            { icon:'🎫', title:'Smart Ticket',      desc:'AI-assisted ticket creation with auto-fill from error logs, stack traces and pattern detection.', color:'#fb923c', border:'#f9731640', bg:'linear-gradient(135deg,#1c0a00,#431407)', path:'/tickets/new' },
            { icon:'🔭', title:'E2E Monitor',       desc:'Unified end-to-end view across frontend, APIs, backend, database and third-party services.', color:'#34d399', border:'#10b98140', bg:'linear-gradient(135deg,#022c22,#052e16)', path:'/dashboard/e2e' },
            { icon:'🧠', title:'AI Intelligence',   desc:'Auto-diagnosis, session intelligence, screenshot analysis, CloudWatch logs & resolution memory.', color:'#f472b6', border:'#ec489940', bg:'linear-gradient(135deg,#1a0a2e,#2e0a3a)', path:'/dashboard/ai-intelligence' },
            { icon:'🔮', title:'Predictive Prevention', desc:'AI predicts service failures 15-30 mins before they happen. Auto P0 tickets. Live risk scores per service.', color:'#c084fc', border:'#c084fc40', bg:'linear-gradient(135deg,#1e0a2e,#2e1065)', path:'/dashboard/predictions' },
            { icon:'📋', title:'Compliance Engine',     desc:'Auto-generate RBI & SEBI audit reports in one click. Live compliance score. SLA breach tracker. Audit trail.', color:'#34d399', border:'#10b98140', bg:'linear-gradient(135deg,#022c22,#064e3b)', path:'/dashboard/compliance' },
          ].map((card,i) => (
            <div key={card.title}
              onClick={() => router.push(card.path)}
              onMouseEnter={e => e.currentTarget.style.transform='translateY(-3px)'}
              onMouseLeave={e  => e.currentTarget.style.transform='translateY(0)'}
              style={{ background:card.bg, border:`1px solid ${card.border}`, borderRadius:16, padding:'20px 24px', cursor:'pointer', transition:'all 0.2s', animation:`fadeUp 0.4s ${i*0.06}s ease both` }}>
              <div style={{ fontSize:32, marginBottom:10 }}>{card.icon}</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color:card.color, marginBottom:6 }}>{card.title}</div>
              <div style={{ fontSize:12, color:'#475569', lineHeight:1.6 }}>{card.desc}</div>
              <div style={{ marginTop:12, fontSize:11, color:card.color, fontWeight:600 }}>Open →</div>
            </div>
          ))}
        </div>

        {/* Team Breakdown */}
        <div style={{ marginBottom:10, fontSize:11, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px' }}>📊 Team Breakdown</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            {icon:'🎫',label:'L1 Active',  val:l1T.length,  color:'#3b82f6',bg:'#1e3a5f',filter:'l1'},
            {icon:'⚠️',label:'L2 Active',  val:l2T.length,  color:'#8b5cf6',bg:'#2e1065',filter:'l2'},
            {icon:'👨‍💻',label:'Developer', val:devT.length, color:'#06b6d4',bg:'#083344',filter:'developer'},
            {icon:'🔺',label:'Escalated',  val:escT.length, color:'#f97316',bg:'#431407',filter:'escalated'},
          ].map((s,i) => (
            <div key={s.label} className="scard" onClick={() => setTab(s.filter)}
              style={{ background:tab===s.filter?s.bg:'#111827', border:`1px solid ${s.color}${tab===s.filter?'80':'30'}`, borderRadius:14, padding:'16px 20px', animation:`fadeUp 0.4s ${i*0.06}s ease both`, transition:'all 0.2s' }}>
              <div style={{ fontSize:22, marginBottom:4 }}>{s.icon}</div>
              <div style={{ fontSize:26, fontWeight:700, color:s.color, fontFamily:"'Syne',sans-serif" }}>{s.val}</div>
              <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* SLA + Priority */}
        <div style={{ marginBottom:10, fontSize:11, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px' }}>🚨 SLA & Priority Alerts</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            {icon:'🔴',label:'SLA Breached',val:breached.length,color:'#ef4444',bg:'#450a0a',filter:'breached'},
            {icon:'🚨',label:'Critical P1', val:critical.length,color:'#f97316',bg:'#431407',filter:'critical'},
            {icon:'✅',label:'Resolved',     val:resolved.length,color:'#10b981',bg:'#052e16',filter:'resolved'},
            {icon:'📋',label:'Total Active', val:active.length,  color:'#fbbf24',bg:'#451a03',filter:'all'},
          ].map((s,i) => (
            <div key={s.label} className="scard" onClick={() => setTab(s.filter)}
              style={{ background:tab===s.filter?s.bg:'#111827', border:`1px solid ${s.color}${tab===s.filter?'80':'30'}`, borderRadius:14, padding:'16px 20px', animation:`fadeUp 0.4s ${(i+4)*0.06}s ease both`, transition:'all 0.2s' }}>
              <div style={{ fontSize:22, marginBottom:4 }}>{s.icon}</div>
              <div style={{ fontSize:26, fontWeight:700, color:s.color, fontFamily:"'Syne',sans-serif" }}>{s.val}</div>
              <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {breached.length > 0 && (
          <div style={{ background:'#450a0a', border:'1px solid #ef444440', borderRadius:10, padding:'12px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:20 }}>🚨</span>
            <span style={{ color:'#fca5a5', fontSize:14, fontWeight:600 }}>{breached.length} SLA BREACH{breached.length>1?'ES':''} — </span>
            <span style={{ color:'#f87171', fontSize:13 }}>Immediate action required!</span>
            <button onClick={() => setTab('breached')} style={{ marginLeft:'auto', background:'#ef4444', border:'none', color:'#fff', padding:'6px 14px', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:600 }}>View Breached →</button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', gap:2, marginBottom:16, background:'#111827', borderRadius:12, padding:4, border:'1px solid #1f2d45', width:'fit-content', flexWrap:'wrap' }}>
          {[['all','📋 All Active',active.length],['l1','🎫 L1',l1T.length],['l2','⚠️ L2',l2T.length],['developer','👨‍💻 Developer',devT.length],['escalated','🔺 Escalated',escT.length],['breached','🔴 Breached',breached.length],['critical','🚨 Critical',critical.length],['resolved','✅ Resolved',resolved.length]].map(([val,label,count]) => (
            <button key={val} className="stab" onClick={() => setTab(val)} style={{ padding:'7px 14px', borderRadius:9, fontSize:12, cursor:'pointer', border:'none', fontFamily:"'DM Sans',sans-serif", fontWeight:tab===val?600:400, background:tab===val?'#1a2236':'transparent', color:tab===val?'#e2e8f0':'#64748b', transition:'all 0.15s', display:'flex', alignItems:'center', gap:5 }}>
              {label} <span style={{ fontSize:10, padding:'1px 5px', borderRadius:8, background:tab===val?'#3b82f620':'#1f2d45', color:tab===val?'#60a5fa':'#475569' }}>{count}</span>
            </button>
          ))}
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <span/>
          <button onClick={loadTickets} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, border:'1px solid #1f2d45', background:'transparent', color:'#475569', cursor:'pointer' }}>🔄 Refresh</button>
        </div>

        {/* Table */}
        <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, overflow:'hidden' }}>
          <div style={{ padding:'16px 24px', borderBottom:'1px solid #1f2d45' }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700 }}>
              {tab==='l1'?'L1 Queue':tab==='l2'?'L2 Queue':tab==='developer'?'Developer Assigned':tab==='escalated'?'Escalated':tab==='breached'?'🔴 SLA Breached':tab==='critical'?'🚨 Critical':tab==='resolved'?'✅ Resolved':'All Active Tickets'}
              <span style={{ fontSize:13, color:'#475569', fontWeight:400, marginLeft:8 }}>({shown.length})</span>
            </h2>
          </div>
          {shown.length === 0 ? (
            <div style={{ padding:48, textAlign:'center' }}>
              <div style={{ fontSize:44, marginBottom:10 }}>✅</div>
              <p style={{ color:'#475569' }}>No tickets in this view</p>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'#0a0e1a' }}>
                  {['Ticket #','Title','Category','Priority','Status','Team','SLA','Created','Actions'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {shown.map(t => {
                    const sla  = getSLAStatus(t.sla_resolve_due, t.status, t.created_at, t.priority)
                    const stat = STATUS_CONFIG[t.status]     || STATUS_CONFIG.open
                    const prio = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium
                    const tc   = t.assigned_team==='DEVELOPER'?{bg:'#083344',c:'#06b6d4'}:t.assigned_team==='L2'?{bg:'#2e1065',c:'#a78bfa'}:{bg:'#1e3a5f',c:'#60a5fa'}
                    const isDone = ['resolved','closed'].includes(t.status)
                    return (
                      <tr key={t.id} className="trow" onClick={() => router.push(`/tickets/${t.id}`)} style={{ borderTop:'1px solid #1f2d45', transition:'background 0.15s', opacity:isDone?0.7:1 }}>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontSize:11, fontWeight:700, color:isDone?'#475569':'#fbbf24', fontFamily:'monospace' }}>{t.ticket_number}</span></td>
                        <td style={{ padding:'11px 14px', maxWidth:200 }}><span style={{ fontSize:13, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</span></td>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontSize:11, color:'#94a3b8' }}>{t.categories?.icon} {t.categories?.name||'—'}</span></td>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontSize:11, fontWeight:600, padding:'3px 7px', borderRadius:5, background:prio.bg, color:prio.color }}>{prio.label}</span></td>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontSize:11, fontWeight:600, padding:'3px 7px', borderRadius:5, background:stat.bg, color:stat.color }}>{stat.label}</span></td>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontSize:11, fontWeight:600, padding:'3px 7px', borderRadius:5, background:tc.bg, color:tc.c }}>{t.assigned_team}</span></td>
                        <td style={{ padding:'11px 14px' }}>{isDone?<span style={{ fontSize:11, color:'#10b981' }}>✅ Done</span>:<span style={{ fontSize:11, fontWeight:600, padding:'3px 7px', borderRadius:5, background:sla.bg, color:sla.color }}>{sla.icon} {sla.label}</span>}</td>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontSize:11, color:'#475569' }}>{new Date(t.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span></td>
                        <td style={{ padding:'11px 14px' }} onClick={e=>e.stopPropagation()}>
                          <button onClick={() => router.push(`/tickets/${t.id}`)} style={{ background:'#451a03', border:'none', color:'#fbbf24', padding:'5px 10px', borderRadius:6, cursor:'pointer', fontSize:11 }}>View</button>
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
  return <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#f59e0b', animation:'spin 0.7s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}
