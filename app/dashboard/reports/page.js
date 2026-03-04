'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import { getSLAStatus } from '../../../lib/ticketRouter'

export default function ReportsDashboard() {
  const router   = useRouter()
  const supabase = createClient()
  const [tickets,  setTickets]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [range,    setRange]    = useState('7')  // days

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    if (!['ADMIN','IT_MANAGER'].includes(p?.role)) { router.replace('/dashboard'); return }
    await loadAll()
    setLoading(false)
  }

  async function loadAll() {
    const { data } = await supabase
      .from('tickets')
      .select('id, ticket_number, status, priority, assigned_team, escalated_to_l2, sla_resolve_due, resolved_at, created_at, categories(name)')
      .order('created_at', { ascending: false })
    if (data) setTickets(data)
  }

  // Filter by date range
  const now     = new Date()
  const rangeMs = parseInt(range) * 24 * 60 * 60 * 1000
  const filtered = range === 'all' ? tickets : tickets.filter(t => new Date(t.created_at) >= new Date(now - rangeMs))

  // ── Stats ──────────────────────────────────────────────
  const total    = filtered.length
  const resolved = filtered.filter(t => ['resolved','closed'].includes(t.status))
  const active   = filtered.filter(t => !['resolved','closed'].includes(t.status))
  const breached = filtered.filter(t => getSLAStatus(t.sla_resolve_due, t.status).label === 'BREACHED')

  const slaBreachRate = total > 0 ? Math.round((breached.length / total) * 100) : 0
  const resolutionRate = total > 0 ? Math.round((resolved.length / total) * 100) : 0

  // Avg resolution time
  const resolvedWithTime = resolved.filter(t => t.resolved_at && t.created_at)
  const avgResolutionHours = resolvedWithTime.length > 0
    ? Math.round(resolvedWithTime.reduce((sum, t) => {
        const diff = new Date(t.resolved_at) - new Date(t.created_at)
        return sum + (diff / (1000 * 60 * 60))
      }, 0) / resolvedWithTime.length)
    : 0

  // Team breakdown
  const teamStats = ['L1','L2','DEVELOPER'].map(team => {
    const t = filtered.filter(x => x.assigned_team === team)
    const r = t.filter(x => ['resolved','closed'].includes(x.status))
    const b = t.filter(x => getSLAStatus(x.sla_resolve_due, x.status).label === 'BREACHED')
    return { team, total:t.length, resolved:r.length, breached:b.length, rate: t.length>0?Math.round((r.length/t.length)*100):0 }
  })

  // Priority breakdown
  const prioStats = ['critical','high','medium','low'].map(p => ({
    priority: p,
    count: filtered.filter(t => t.priority === p).length,
    resolved: filtered.filter(t => t.priority === p && ['resolved','closed'].includes(t.status)).length,
  }))

  // Category breakdown
  const catMap = {}
  filtered.forEach(t => {
    const name = t.categories?.name || 'Uncategorized'
    catMap[name] = (catMap[name] || 0) + 1
  })
  const catStats = Object.entries(catMap).sort((a,b) => b[1]-a[1]).slice(0,6)

  // Daily trend (last 7 days)
  const dailyTrend = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate() - (6-i))
    const label = d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'})
    const count = tickets.filter(t => {
      const td = new Date(t.created_at)
      return td.toDateString() === d.toDateString()
    }).length
    return { label, count }
  })
  const maxDaily = Math.max(...dailyTrend.map(d => d.count), 1)

  if (loading) return <Loader />

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}} @keyframes bar{from{height:0}to{height:var(--h)}}`}</style>

      {/* Navbar */}
      <div style={{ background:'#111827', borderBottom:'1px solid #1f2d45', padding:'0 28px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => router.back()} style={{ background:'transparent', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>←</button>
          <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#f59e0b,#ef4444)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>📊</div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800 }}>Nex<span style={{ color:'#06b6d4' }}>Desk</span></span>
          <span style={{ color:'#334155', margin:'0 6px' }}>›</span>
          <span style={{ color:'#64748b', fontSize:14 }}>Reports & Analytics</span>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[['7','7 Days'],['30','30 Days'],['90','90 Days'],['all','All Time']].map(([v,l]) => (
            <button key={v} onClick={() => setRange(v)} style={{ padding:'5px 12px', borderRadius:8, fontSize:12, cursor:'pointer', border:'1px solid', background:range===v?'#1e3a5f':'transparent', color:range===v?'#60a5fa':'#64748b', borderColor:range===v?'#3b82f640':'#1f2d45' }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:1300, margin:'0 auto', padding:'28px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:4 }}>Reports & Analytics 📊</h1>
          <p style={{ color:'#64748b', fontSize:13 }}>Performance overview — {range==='all'?'All time':range+' days'} • {total} total tickets</p>
        </div>

        {/* ── KPI Cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:24 }}>
          {[
            { icon:'📋', label:'Total Tickets',    val:total,            color:'#3b82f6', sub:'' },
            { icon:'✅', label:'Resolution Rate',  val:resolutionRate+'%', color:'#10b981', sub:`${resolved.length} resolved` },
            { icon:'🔴', label:'SLA Breach Rate',  val:slaBreachRate+'%', color: slaBreachRate>20?'#ef4444':'#f59e0b', sub:`${breached.length} breached` },
            { icon:'⏱️', label:'Avg Resolution',   val:avgResolutionHours+'h', color:'#8b5cf6', sub:'hours avg' },
            { icon:'🔥', label:'Active Tickets',   val:active.length,    color:'#f97316', sub:'open right now' },
          ].map((k,i) => (
            <div key={k.label} style={{ background:'#111827', border:`1px solid ${k.color}30`, borderRadius:14, padding:'16px 20px', animation:`fadeUp 0.4s ${i*0.06}s ease both` }}>
              <div style={{ fontSize:20, marginBottom:4 }}>{k.icon}</div>
              <div style={{ fontSize:24, fontWeight:700, color:k.color, fontFamily:"'Syne',sans-serif" }}>{k.val}</div>
              <div style={{ fontSize:11, color:'#64748b', marginTop:1 }}>{k.label}</div>
              {k.sub && <div style={{ fontSize:10, color:'#334155', marginTop:2 }}>{k.sub}</div>}
            </div>
          ))}
        </div>

        {/* ── Daily Trend Chart ── */}
        <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'20px 24px', marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:20 }}>📈 Daily Ticket Trend (Last 7 Days)</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:12, height:160 }}>
            {dailyTrend.map((d,i) => (
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6, height:'100%', justifyContent:'flex-end' }}>
                <span style={{ fontSize:11, color:'#60a5fa', fontWeight:600 }}>{d.count}</span>
                <div style={{ width:'100%', background:'linear-gradient(180deg,#3b82f6,#1e3a5f)', borderRadius:'6px 6px 0 0', height:`${Math.round((d.count/maxDaily)*120)+4}px`, minHeight:4, transition:'height 1s ease' }}/>
                <span style={{ fontSize:10, color:'#475569', whiteSpace:'nowrap' }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>

          {/* ── Team Performance ── */}
          <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'20px 24px' }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:16 }}>👥 Team Performance</div>
            {teamStats.map(t => {
              const tc = t.team==='L2'?{c:'#a78bfa',bg:'#2e1065'}:t.team==='DEVELOPER'?{c:'#06b6d4',bg:'#083344'}:{c:'#60a5fa',bg:'#1e3a5f'}
              return (
                <div key={t.team} style={{ marginBottom:16, paddingBottom:16, borderBottom:'1px solid #0f172a' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <span style={{ fontSize:12, padding:'2px 8px', borderRadius:5, background:tc.bg, color:tc.c, fontWeight:600 }}>{t.team}</span>
                    <div style={{ display:'flex', gap:12, fontSize:11, color:'#475569' }}>
                      <span>Total: <strong style={{ color:'#e2e8f0' }}>{t.total}</strong></span>
                      <span>Resolved: <strong style={{ color:'#10b981' }}>{t.resolved}</strong></span>
                      <span>Breached: <strong style={{ color:'#ef4444' }}>{t.breached}</strong></span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ background:'#0f172a', borderRadius:20, height:8, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:20, background:`linear-gradient(90deg,${tc.c},${tc.bg})`, width:`${t.rate}%`, transition:'width 1s ease', minWidth:t.rate>0?'4px':'0' }}/>
                  </div>
                  <div style={{ fontSize:10, color:'#475569', marginTop:4 }}>{t.rate}% resolution rate</div>
                </div>
              )
            })}
          </div>

          {/* ── Priority Breakdown ── */}
          <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'20px 24px' }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:16 }}>🎯 Priority Breakdown</div>
            {prioStats.map(p => {
              const pc = p.priority==='critical'?{c:'#ef4444',bg:'#450a0a'}:p.priority==='high'?{c:'#f97316',bg:'#431407'}:p.priority==='medium'?{c:'#fbbf24',bg:'#451a03'}:{c:'#10b981',bg:'#052e16'}
              const pct = total > 0 ? Math.round((p.count/total)*100) : 0
              return (
                <div key={p.priority} style={{ marginBottom:16, paddingBottom:16, borderBottom:'1px solid #0f172a' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <span style={{ fontSize:12, padding:'2px 8px', borderRadius:5, background:pc.bg, color:pc.c, fontWeight:600, textTransform:'capitalize' }}>{p.priority}</span>
                    <div style={{ display:'flex', gap:12, fontSize:11, color:'#475569' }}>
                      <span>Count: <strong style={{ color:'#e2e8f0' }}>{p.count}</strong></span>
                      <span>Resolved: <strong style={{ color:'#10b981' }}>{p.resolved}</strong></span>
                      <span style={{ color:'#64748b' }}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{ background:'#0f172a', borderRadius:20, height:8, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:20, background:pc.c, width:`${pct}%`, transition:'width 1s ease', minWidth:pct>0?'4px':'0', opacity:0.7 }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Category Breakdown ── */}
        <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'20px 24px', marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:16 }}>📂 Top Issue Categories</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {catStats.map(([cat, count], i) => {
              const pct = total > 0 ? Math.round((count/total)*100) : 0
              const colors = ['#3b82f6','#8b5cf6','#06b6d4','#f59e0b','#ef4444','#10b981']
              const c = colors[i % colors.length]
              return (
                <div key={cat} style={{ background:'#0f172a', border:`1px solid ${c}20`, borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <span style={{ fontSize:12, color:'#94a3b8' }}>{cat}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:c }}>{count}</span>
                  </div>
                  <div style={{ background:'#1f2d45', borderRadius:20, height:6, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:20, background:c, width:`${pct}%`, transition:'width 1s ease', minWidth:pct>0?'3px':'0' }}/>
                  </div>
                  <div style={{ fontSize:10, color:'#334155', marginTop:4 }}>{pct}% of total</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── SLA Summary ── */}
        <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'20px 24px' }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:16 }}>⏰ SLA Summary</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            {[
              { label:'Met SLA',      val: total - breached.length, color:'#10b981', icon:'✅' },
              { label:'SLA Breached', val: breached.length,         color:'#ef4444', icon:'🔴' },
              { label:'Breach Rate',  val: slaBreachRate+'%',       color: slaBreachRate>20?'#ef4444':'#f59e0b', icon:'📊' },
              { label:'Avg Fix Time', val: avgResolutionHours+'h',  color:'#8b5cf6', icon:'⏱️' },
            ].map(s => (
              <div key={s.label} style={{ background:'#0f172a', borderRadius:12, padding:'14px 16px', border:`1px solid ${s.color}20`, textAlign:'center' }}>
                <div style={{ fontSize:24, marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontSize:22, fontWeight:700, color:s.color, fontFamily:"'Syne',sans-serif" }}>{s.val}</div>
                <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

function Loader() {
  return <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#f59e0b', animation:'spin 0.7s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}
