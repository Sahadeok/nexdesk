'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'

function getSupabase() { return createClient() }

const REFRESH_INTERVAL = 30 // seconds

export default function ExecutiveDashboard() {
  const router   = useRouter()
  const supabase = getSupabase()
  const timerRef = useRef(null)

  const [stats,      setStats]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [countdown,  setCountdown]  = useState(REFRESH_INTERVAL)
  const [fullscreen, setFullscreen] = useState(false)
  const [pulse,      setPulse]      = useState(false)

  useEffect(() => {
    init()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    if (!['SUPER_ADMIN','ADMIN','IT_MANAGER'].includes(p?.role)) { router.replace('/dashboard'); return }
    await loadStats()
    setLoading(false)
    startAutoRefresh()
  }

  function startAutoRefresh() {
    setCountdown(REFRESH_INTERVAL)
    timerRef.current = setInterval(async () => {
      setCountdown(prev => {
        if (prev <= 1) {
          loadStats()
          setPulse(true)
          setTimeout(() => setPulse(false), 1000)
          return REFRESH_INTERVAL
        }
        return prev - 1
      })
    }, 1000)
  }

  async function loadStats() {
    const now      = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const weekAgo  = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { data: allTickets },
      { data: todayTickets },
      { data: openTickets },
      { data: resolvedTickets },
      { data: breachedTickets },
      { data: criticalTickets },
      { data: l1Tickets },
      { data: l2Tickets },
      { data: devTickets },
      { data: weekTickets },
    ] = await Promise.all([
      supabase.from('tickets').select('id,status,priority,assigned_team,created_at,sla_resolve_due,resolved_at'),
      supabase.from('tickets').select('id').gte('created_at', todayStr),
      supabase.from('tickets').select('id').in('status',['open','in_progress','pending_user']),
      supabase.from('tickets').select('id,resolved_at,created_at').eq('status','resolved'),
      supabase.from('tickets').select('id').not('status','in','("resolved","closed")').lt('sla_resolve_due', now.toISOString()),
      supabase.from('tickets').select('id').eq('priority','critical').not('status','in','("resolved","closed")'),
      supabase.from('tickets').select('id').eq('assigned_team','L1').not('status','in','("resolved","closed")'),
      supabase.from('tickets').select('id').eq('assigned_team','L2').not('status','in','("resolved","closed")'),
      supabase.from('tickets').select('id').eq('assigned_team','DEVELOPER').not('status','in','("resolved","closed")'),
      supabase.from('tickets').select('id,status').gte('created_at', weekAgo),
    ])

    // Calculate avg resolution time
    const resolved = resolvedTickets || []
    const avgHours = resolved.length > 0
      ? Math.round(resolved.filter(t => t.resolved_at && t.created_at).reduce((sum, t) => {
          return sum + (new Date(t.resolved_at) - new Date(t.created_at)) / (1000 * 60 * 60)
        }, 0) / resolved.length)
      : 0

    // SLA breach rate
    const activeTickets = (allTickets||[]).filter(t => !['resolved','closed'].includes(t.status))
    const breachRate = activeTickets.length > 0
      ? Math.round(((breachedTickets||[]).length / activeTickets.length) * 100)
      : 0

    // Weekly trend (last 7 days)
    const weeklyData = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000)
      const dateStr = d.toISOString().slice(0, 10)
      const dayLabel = d.toLocaleDateString('en-IN', { weekday:'short' })
      const count = (weekTickets||[]).filter(t => t.created_at?.slice(0,10) === dateStr).length
      weeklyData.push({ label: dayLabel, count, date: dateStr })
    }

    setStats({
      total:        (allTickets||[]).length,
      today:        (todayTickets||[]).length,
      open:         (openTickets||[]).length,
      resolved:     resolved.length,
      breached:     (breachedTickets||[]).length,
      critical:     (criticalTickets||[]).length,
      l1:           (l1Tickets||[]).length,
      l2:           (l2Tickets||[]).length,
      dev:          (devTickets||[]).length,
      avgHours,
      breachRate,
      weeklyData,
      resolvedToday:(allTickets||[]).filter(t => t.status==='resolved' && t.created_at?.slice(0,10)===todayStr).length,
    })
    setLastUpdate(new Date())
  }

  const maxWeekly = stats?.weeklyData ? Math.max(...stats.weeklyData.map(d => d.count), 1) : 1

  if (loading) return <Loader />

  return (
    <div style={{ minHeight:'100vh', background:'#050810', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0', padding: fullscreen?0:0 }}>
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes glow    { 0%,100%{box-shadow:0 0 20px #3b82f630} 50%{box-shadow:0 0 40px #3b82f660} }
        @keyframes countIn { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
        .stat-card:hover { transform:translateY(-3px)!important; }
      `}</style>

      {/* ── Top Bar ── */}
      <div style={{ background:'#0a0e1a', borderBottom:'1px solid #1f2d45', padding:'12px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#3b82f6,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>⚡</div>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800 }}>Nex<span style={{ color:'#06b6d4' }}>Desk</span> <span style={{ color:'#475569', fontWeight:400, fontSize:14 }}>Executive Dashboard</span></div>
            <div style={{ fontSize:11, color:'#334155' }}>Live Operations View</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          {/* Live indicator */}
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#10b981', animation:'pulse 1.5s infinite' }}/>
            <span style={{ fontSize:12, color:'#34d399' }}>LIVE</span>
          </div>
          {/* Countdown */}
          <div style={{ fontSize:12, color:'#475569', display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', border:'2px solid #1f2d45', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:pulse?'#3b82f6':'#475569', transition:'color 0.3s' }}>{countdown}</div>
            <span>sec</span>
          </div>
          {/* Last update */}
          {lastUpdate && (
            <div style={{ fontSize:11, color:'#334155' }}>
              Updated: {lastUpdate.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
            </div>
          )}
          <button onClick={() => { loadStats(); setCountdown(REFRESH_INTERVAL) }}
            style={{ padding:'7px 14px', background:'#1e3a5f', border:'1px solid #3b82f640', borderRadius:8, color:'#60a5fa', cursor:'pointer', fontSize:12 }}>
            🔄 Refresh
          </button>
          <button onClick={() => router.push('/dashboard/admin')}
            style={{ padding:'7px 14px', background:'transparent', border:'1px solid #1f2d45', borderRadius:8, color:'#475569', cursor:'pointer', fontSize:12 }}>
            ← Back
          </button>
        </div>
      </div>

      <div style={{ padding:'24px 28px' }}>

        {/* ── Alert Banner ── */}
        {stats?.critical > 0 && (
          <div style={{ background:'linear-gradient(135deg,#450a0a,#7f1d1d)', border:'1px solid #ef444440', borderRadius:14, padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', animation:'glow 2s infinite' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:24, animation:'pulse 1s infinite' }}>🚨</span>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:'#fca5a5' }}>{stats.critical} CRITICAL tickets require immediate attention!</div>
                <div style={{ fontSize:12, color:'#f87171', marginTop:2 }}>{stats.breached} SLA breaches active right now</div>
              </div>
            </div>
            <button onClick={() => router.push('/dashboard/bulk-actions')}
              style={{ padding:'9px 18px', background:'#ef4444', border:'none', borderRadius:9, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700 }}>
              Take Action →
            </button>
          </div>
        )}

        {/* ── Big KPI Cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:14, marginBottom:24 }}>
          {[
            { icon:'📋', label:'Total Tickets',   val:stats?.total,        color:'#3b82f6', bg:'#1e3a5f', sub:'all time' },
            { icon:'📅', label:'Today',            val:stats?.today,        color:'#06b6d4', bg:'#083344', sub:'raised today' },
            { icon:'🔓', label:'Open',             val:stats?.open,         color:'#f97316', bg:'#431407', sub:'active tickets' },
            { icon:'✅', label:'Resolved',         val:stats?.resolved,     color:'#10b981', bg:'#052e16', sub:'total resolved' },
            { icon:'🚨', label:'SLA Breached',     val:stats?.breached,     color:'#ef4444', bg:'#450a0a', sub:'needs action' },
            { icon:'⚠️', label:'Critical',         val:stats?.critical,     color:'#fbbf24', bg:'#451a03', sub:'urgent' },
          ].map((k,i) => (
            <div key={k.label} className="stat-card"
              style={{ background:`linear-gradient(135deg,#111827,${k.bg}80)`, border:`1px solid ${k.color}25`, borderRadius:16, padding:'20px 16px', textAlign:'center', transition:'transform 0.2s', animation:`fadeUp 0.4s ${i*0.05}s ease both` }}>
              <div style={{ fontSize:28, marginBottom:8 }}>{k.icon}</div>
              <div style={{ fontSize:32, fontWeight:800, color:k.color, fontFamily:"'Syne',sans-serif", lineHeight:1, animation:pulse?'countIn 0.3s ease':'none' }}>{k.val ?? '—'}</div>
              <div style={{ fontSize:11, fontWeight:600, color:'#e2e8f0', marginTop:6 }}>{k.label}</div>
              <div style={{ fontSize:10, color:'#334155', marginTop:2 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20, marginBottom:20 }}>

          {/* Team Queue */}
          <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'20px 22px', animation:'fadeUp 0.4s 0.3s ease both' }}>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Syne',sans-serif", marginBottom:16 }}>👥 Team Queue</div>
            {[
              { team:'L1 Support', val:stats?.l1, color:'#60a5fa', bg:'#1e3a5f', icon:'🎫' },
              { team:'L2 Technical', val:stats?.l2, color:'#a78bfa', bg:'#2e1065', icon:'⚠️' },
              { team:'Developer', val:stats?.dev, color:'#06b6d4', bg:'#083344', icon:'👨‍💻' },
            ].map(t => (
              <div key={t.team} style={{ marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'#94a3b8' }}>{t.icon} {t.team}</span>
                  <span style={{ fontSize:14, fontWeight:700, color:t.color }}>{t.val}</span>
                </div>
                <div style={{ height:8, background:'#1f2d45', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ height:'100%', background:t.color, borderRadius:4, width:`${Math.min(((t.val||0)/Math.max(stats?.open||1,1))*100,100)}%`, transition:'width 1s ease' }}/>
                </div>
              </div>
            ))}
          </div>

          {/* SLA Health */}
          <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'20px 22px', animation:'fadeUp 0.4s 0.35s ease both' }}>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Syne',sans-serif", marginBottom:16 }}>📊 SLA Health</div>
            {/* Donut-style display */}
            <div style={{ textAlign:'center', marginBottom:16 }}>
              <div style={{ fontSize:48, fontWeight:800, fontFamily:"'Syne',sans-serif", color:stats?.breachRate>30?'#ef4444':stats?.breachRate>15?'#fbbf24':'#10b981', lineHeight:1 }}>
                {100-(stats?.breachRate||0)}%
              </div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>SLA Compliance Rate</div>
            </div>
            <div style={{ height:12, background:'#1f2d45', borderRadius:6, overflow:'hidden', marginBottom:12 }}>
              <div style={{ height:'100%', background:`linear-gradient(90deg,#10b981,#34d399)`, borderRadius:6, width:`${100-(stats?.breachRate||0)}%`, transition:'width 1s ease' }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
              <span style={{ color:'#34d399' }}>✅ Compliant: {100-(stats?.breachRate||0)}%</span>
              <span style={{ color:'#ef4444' }}>🚨 Breached: {stats?.breachRate||0}%</span>
            </div>
            <div style={{ marginTop:14, padding:'10px 14px', background:'#0f172a', borderRadius:10, textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:700, color:'#60a5fa', fontFamily:"'Syne',sans-serif" }}>{stats?.avgHours}h</div>
              <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>Avg Resolution Time</div>
            </div>
          </div>

          {/* Today Summary */}
          <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'20px 22px', animation:'fadeUp 0.4s 0.4s ease both' }}>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Syne',sans-serif", marginBottom:16 }}>📅 Today's Summary</div>
            {[
              { label:'Raised Today',   val:stats?.today,        color:'#60a5fa', icon:'📋' },
              { label:'Resolved Today', val:stats?.resolvedToday, color:'#34d399', icon:'✅' },
              { label:'Still Open',     val:stats?.open,         color:'#f97316', icon:'🔓' },
              { label:'SLA Breaches',   val:stats?.breached,     color:'#ef4444', icon:'🚨' },
              { label:'Critical Open',  val:stats?.critical,     color:'#fbbf24', icon:'⚠️' },
            ].map(s => (
              <div key={s.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #0f172a' }}>
                <span style={{ fontSize:12, color:'#64748b' }}>{s.icon} {s.label}</span>
                <span style={{ fontSize:16, fontWeight:700, color:s.color, fontFamily:"'Syne',sans-serif" }}>{s.val ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Weekly Trend Chart ── */}
        <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'20px 24px', animation:'fadeUp 0.4s 0.45s ease both' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Syne',sans-serif" }}>📈 Weekly Ticket Trend</div>
            <div style={{ fontSize:11, color:'#475569' }}>Last 7 days</div>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:12, height:120 }}>
            {(stats?.weeklyData || []).map((d, i) => {
              const h = maxWeekly > 0 ? Math.round((d.count / maxWeekly) * 100) : 0
              const isToday = d.date === new Date().toISOString().slice(0,10)
              return (
                <div key={d.label} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6, animation:`fadeUp 0.4s ${0.5+i*0.04}s ease both` }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#64748b' }}>{d.count}</div>
                  <div style={{ width:'100%', background:isToday?'linear-gradient(180deg,#3b82f6,#06b6d4)':'#1f2d45', borderRadius:'6px 6px 0 0', height:`${Math.max(h,4)}%`, minHeight:4, transition:'height 1s ease', border:isToday?'1px solid #3b82f640':'none' }}/>
                  <div style={{ fontSize:11, color:isToday?'#60a5fa':'#475569', fontWeight:isToday?700:400 }}>{d.label}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign:'center', marginTop:16, fontSize:11, color:'#1f2d45' }}>
          NexDesk Executive Dashboard • Auto-refreshes every {REFRESH_INTERVAL} seconds • {new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </div>
      </div>
    </div>
  )
}

function Loader() {
  return <div style={{ minHeight:'100vh', background:'#050810', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#3b82f6', animation:'spin 0.7s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}

