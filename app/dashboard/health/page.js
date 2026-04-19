'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

function getSupabase() { return createClient() }

const REFRESH_INTERVAL = 30

// Default monitors for a Mutual Fund app
const DEFAULT_MONITORS = [
  { name:'BSE API',          url:'https://api.bseindia.com/health',         category:'market_data',  critical:true  },
  { name:'NSE API',          url:'https://api.nseindia.com/health',          category:'market_data',  critical:true  },
  { name:'Payment Gateway',  url:'https://api.razorpay.com/health',          category:'payments',     critical:true  },
  { name:'KYC / CAMS API',   url:'https://api.cams.com/health',              category:'kyc',          critical:true  },
  { name:'SMS Gateway',      url:'https://api.msg91.com/health',             category:'notifications',critical:false },
  { name:'Email Service',    url:'https://api.sendgrid.com/health',          category:'notifications',critical:false },
  { name:'Auth Service',     url:'https://auth.myapp.com/health',            category:'auth',         critical:true  },
  { name:'Portfolio API',    url:'https://portfolio.myapp.com/api/health',   category:'core',         critical:true  },
  { name:'NAV Service',      url:'https://nav.myapp.com/health',             category:'market_data',  critical:true  },
  { name:'RTA Sync',         url:'https://rta.myapp.com/health',             category:'sync',         critical:false },
]

const CATEGORY_CONFIG = {
  market_data:   { icon:'📈', label:'Market Data',    color:'#3b82f6' },
  payments:      { icon:'💳', label:'Payments',        color:'#10b981' },
  kyc:           { icon:'🔍', label:'KYC / Compliance',color:'#8b5cf6' },
  notifications: { icon:'🔔', label:'Notifications',   color:'#f59e0b' },
  auth:          { icon:'🔐', label:'Auth',             color:'#ef4444' },
  core:          { icon:'⚙️', label:'Core Services',   color:'#06b6d4' },
  sync:          { icon:'🔄', label:'Data Sync',        color:'#64748b' },
}

const STATUS_CONFIG = {
  up:       { icon:'✅', label:'Operational',  color:'#34d399', bg:'#052e16', border:'#10b98130' },
  down:     { icon:'🔴', label:'Down',         color:'#ef4444', bg:'#450a0a', border:'#ef444430' },
  degraded: { icon:'🟡', label:'Degraded',     color:'#fbbf24', bg:'#451a03', border:'#f59e0b30' },
  unknown:  { icon:'⚪', label:'Checking...',  color:'#64748b', bg:'#1f2d45', border:'#33415530' },
}

export default function HealthMonitor() {
  const router   = useRouter()
  const supabase = getSupabase()
  const timerRef = useRef(null)
  const countRef = useRef(null)

  const [profile,    setProfile]    = useState(null)
  const [monitors,   setMonitors]   = useState([])
  const [incidents,  setIncidents]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [checking,   setChecking]   = useState(false)
  const [countdown,  setCountdown]  = useState(REFRESH_INTERVAL)
  const [lastCheck,  setLastCheck]  = useState(null)
  const [showAdd,    setShowAdd]    = useState(false)
  const [msg,        setMsg]        = useState('')
  const [activeTab,  setActiveTab]  = useState('monitors') // monitors | incidents | logs
  const [newMon,     setNewMon]     = useState({ name:'', url:'', category:'core', critical:false })

  useEffect(() => {
    init()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countRef.current) clearInterval(countRef.current)
    }
  }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    if (!['SUPER_ADMIN','ADMIN','IT_MANAGER'].includes(p?.role)) { router.replace('/dashboard'); return }
    setProfile(p)
    await loadMonitors()
    await loadIncidents()
    setLoading(false)
    startAutoRefresh()
  }

  async function loadMonitors() {
    const { data } = await supabase
      .from('health_monitors')
      .select('*')
      .order('category')
    if (data && data.length > 0) {
      setMonitors(data)
    } else {
      // Show defaults with unknown status
      setMonitors(DEFAULT_MONITORS.map((m, i) => ({ ...m, id: `default-${i}`, status:'unknown', response_time:null, last_checked:null, uptime_percent:100 })))
    }
  }

  async function loadIncidents() {
    const { data } = await supabase
      .from('health_incidents')
      .select('*')
      .order('created_at', { ascending:false })
      .limit(20)
    if (data) setIncidents(data)
  }

  function startAutoRefresh() {
    countRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          checkAllMonitors()
          return REFRESH_INTERVAL
        }
        return prev - 1
      })
    }, 1000)
  }

  // Simulate health check (in production, this calls your API route)
  async function checkAllMonitors() {
    setChecking(true)
    const updated = await Promise.all(
      monitors.map(async (m) => {
        try {
          const start = Date.now()
          const res = await fetch(`/api/health-check?url=${encodeURIComponent(m.url)}`, {
            signal: AbortSignal.timeout(5000)
          })
          const responseTime = Date.now() - start
          const data = await res.json()
          return {
            ...m,
            status: data.status || (res.ok ? 'up' : 'down'),
            response_time: responseTime,
            last_checked: new Date().toISOString(),
          }
        } catch(e) {
          return { ...m, status:'unknown', last_checked: new Date().toISOString() }
        }
      })
    )
    setMonitors(updated)
    setLastCheck(new Date())
    setChecking(false)

    // Save to DB if real monitors
    const realMonitors = updated.filter(m => !m.id?.startsWith('default-'))
    for (const m of realMonitors) {
      await supabase.from('health_monitors').update({
        status: m.status,
        response_time: m.response_time,
        last_checked: m.last_checked,
      }).eq('id', m.id)
    }
  }

  async function addMonitor() {
    if (!newMon.name || !newMon.url) { setMsg('❌ Name and URL required'); return }
    const { data, error } = await supabase.from('health_monitors').insert({
      ...newMon,
      status: 'unknown',
      uptime_percent: 100,
      created_at: new Date().toISOString(),
    }).select().single()
    if (error) { setMsg('❌ ' + error.message); return }
    setMonitors(prev => [...prev.filter(m => !m.id?.startsWith('default-')), data])
    setNewMon({ name:'', url:'', category:'core', critical:false })
    setShowAdd(false)
    setMsg('✅ Monitor added!')
    setTimeout(() => setMsg(''), 3000)
  }

  async function deleteMonitor(id) {
    if (id?.startsWith('default-')) {
      setMonitors(prev => prev.filter(m => m.id !== id))
      return
    }
    await supabase.from('health_monitors').delete().eq('id', id)
    setMonitors(prev => prev.filter(m => m.id !== id))
  }

  async function seedDefaults() {
    for (const m of DEFAULT_MONITORS) {
      await supabase.from('health_monitors').upsert({
        ...m, status:'unknown', uptime_percent:100,
        created_at: new Date().toISOString(),
      }, { onConflict:'name' })
    }
    await loadMonitors()
    setMsg('✅ Default monitors loaded!')
    setTimeout(() => setMsg(''), 3000)
  }

  // Stats
  const upCount       = monitors.filter(m => m.status === 'up').length
  const downCount     = monitors.filter(m => m.status === 'down').length
  const degradedCount = monitors.filter(m => m.status === 'degraded').length
  const unknownCount  = monitors.filter(m => m.status === 'unknown').length
  const criticalDown  = monitors.filter(m => m.status === 'down' && m.critical)
  const avgResponse   = monitors.filter(m => m.response_time).length > 0
    ? Math.round(monitors.filter(m => m.response_time).reduce((s,m) => s + m.response_time, 0) / monitors.filter(m => m.response_time).length)
    : null
  const overallHealth = monitors.length > 0
    ? Math.round((upCount / monitors.length) * 100)
    : 100

  const byCategory = Object.keys(CATEGORY_CONFIG).map(cat => ({
    cat,
    monitors: monitors.filter(m => m.category === cat),
  })).filter(c => c.monitors.length > 0)

  if (loading) return <Loader />

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes glow    { 0%,100%{box-shadow:0 0 15px #ef444420} 50%{box-shadow:0 0 30px #ef444440} }
        .mcard:hover { border-color:#3b82f640!important; transform:translateY(-1px); }
        .inp:focus   { border-color:#3b82f6!important; outline:none; }
        .tab:hover   { color:#e2e8f0!important; }
      `}</style>

      <GlobalNav title="Health Monitor" />

      <div style={{ maxWidth:1400, margin:'0 auto', padding:'24px' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
          <div>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:4 }}>
              🔍 Application Health Monitor
            </h1>
            <p style={{ color:'#64748b', fontSize:13 }}>
              Real-time monitoring for all services, APIs and integrations
            </p>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {/* Live indicator + countdown */}
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', background:'#111827', border:'1px solid #1f2d45', borderRadius:10 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#10b981', animation:'pulse 1.5s infinite' }}/>
              <span style={{ fontSize:12, color:'#34d399' }}>LIVE</span>
              <span style={{ fontSize:11, color:'#334155' }}>· {countdown}s</span>
            </div>
            {lastCheck && (
              <span style={{ fontSize:11, color:'#334155' }}>
                Last: {lastCheck.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
              </span>
            )}
            <button onClick={checkAllMonitors} disabled={checking}
              style={{ padding:'8px 16px', background:'#1e3a5f', border:'1px solid #3b82f640', borderRadius:10, color:'#60a5fa', cursor:checking?'not-allowed':'pointer', fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
              {checking ? <><div style={{ width:12,height:12,borderRadius:'50%',border:'2px solid #3b82f640',borderTopColor:'#60a5fa',animation:'spin 0.7s linear infinite' }}/>Checking...</> : '🔄 Check Now'}
            </button>
            <button onClick={() => setShowAdd(true)}
              style={{ padding:'8px 16px', background:'linear-gradient(135deg,#2563eb,#3b82f6)', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
              + Add Monitor
            </button>
          </div>
        </div>

        {msg && (
          <div style={{ padding:'10px 16px', borderRadius:9, marginBottom:16, background:msg.startsWith('✅')?'#052e16':'#450a0a', color:msg.startsWith('✅')?'#34d399':'#fca5a5', fontSize:13 }}>
            {msg}
          </div>
        )}

        {/* Critical alert banner */}
        {criticalDown.length > 0 && (
          <div style={{ background:'linear-gradient(135deg,#450a0a,#7f1d1d)', border:'1px solid #ef444440', borderRadius:14, padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', animation:'glow 2s infinite' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:24, animation:'pulse 1s infinite' }}>🚨</span>
              <div>
                <div style={{ fontWeight:700, color:'#fca5a5', fontSize:15 }}>
                  {criticalDown.length} Critical Service{criticalDown.length>1?'s':''} Down!
                </div>
                <div style={{ fontSize:12, color:'#f87171', marginTop:2 }}>
                  {criticalDown.map(m => m.name).join(', ')}
                </div>
              </div>
            </div>
            <button onClick={() => router.push('/tickets/new')}
              style={{ padding:'9px 18px', background:'#ef4444', border:'none', borderRadius:9, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700 }}>
              🎫 Raise Incident Ticket
            </button>
          </div>
        )}

        {/* Overall health bar */}
        <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'16px 22px', marginBottom:20, display:'flex', alignItems:'center', gap:20 }}>
          <div style={{ textAlign:'center', flexShrink:0 }}>
            <div style={{ fontSize:36, fontWeight:800, fontFamily:"'Syne',sans-serif", color: overallHealth===100?'#34d399':overallHealth>=80?'#fbbf24':'#ef4444', lineHeight:1 }}>
              {overallHealth}%
            </div>
            <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>Overall Health</div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#475569', marginBottom:6 }}>
              <span>System Health</span>
              <span>{upCount}/{monitors.length} services operational</span>
            </div>
            <div style={{ height:12, background:'#1f2d45', borderRadius:6, overflow:'hidden' }}>
              <div style={{ height:'100%', background: overallHealth===100?'linear-gradient(90deg,#10b981,#34d399)':overallHealth>=80?'linear-gradient(90deg,#f59e0b,#fbbf24)':'linear-gradient(90deg,#ef4444,#f87171)', borderRadius:6, width:`${overallHealth}%`, transition:'width 1s ease' }}/>
            </div>
          </div>
          <div style={{ display:'flex', gap:16, flexShrink:0 }}>
            {[
              [upCount,       '✅ Up',       '#34d399'],
              [downCount,     '🔴 Down',     '#ef4444'],
              [degradedCount, '🟡 Degraded', '#fbbf24'],
              [unknownCount,  '⚪ Unknown',  '#475569'],
            ].map(([count, label, color]) => (
              <div key={label} style={{ textAlign:'center' }}>
                <div style={{ fontSize:20, fontWeight:700, color, fontFamily:"'Syne',sans-serif" }}>{count}</div>
                <div style={{ fontSize:10, color:'#475569' }}>{label}</div>
              </div>
            ))}
            {avgResponse && (
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:20, fontWeight:700, color:'#60a5fa', fontFamily:"'Syne',sans-serif" }}>{avgResponse}ms</div>
                <div style={{ fontSize:10, color:'#475569' }}>Avg Response</div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid #1f2d45', paddingBottom:0 }}>
          {[
            { key:'monitors',  label:'🔍 Monitors',  count:monitors.length },
            { key:'incidents', label:'🚨 Incidents',  count:incidents.length },
          ].map(t => (
            <button key={t.key} className="tab" onClick={() => setActiveTab(t.key)}
              style={{ padding:'10px 18px', background:'transparent', border:'none', borderBottom:activeTab===t.key?'2px solid #3b82f6':'2px solid transparent', color:activeTab===t.key?'#60a5fa':'#475569', cursor:'pointer', fontSize:13, fontWeight:activeTab===t.key?600:400, fontFamily:"'DM Sans',sans-serif", transition:'color 0.2s', marginBottom:-1 }}>
              {t.label} <span style={{ fontSize:11, padding:'1px 6px', borderRadius:10, background:'#1f2d45', marginLeft:4 }}>{t.count}</span>
            </button>
          ))}
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8, paddingBottom:8 }}>
            {monitors.some(m => m.id?.startsWith('default-')) && (
              <button onClick={seedDefaults}
                style={{ padding:'6px 14px', background:'#1e3a5f', border:'1px solid #3b82f640', borderRadius:8, color:'#60a5fa', cursor:'pointer', fontSize:12 }}>
                ⚡ Save to Database
              </button>
            )}
          </div>
        </div>

        {/* ── MONITORS TAB ── */}
        {activeTab === 'monitors' && (
          <div>
            {byCategory.map((group, gi) => {
              const cfg = CATEGORY_CONFIG[group.cat] || { icon:'📦', label:group.cat, color:'#64748b' }
              return (
                <div key={group.cat} style={{ marginBottom:24, animation:`fadeUp 0.4s ${gi*0.05}s ease both` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                    <span style={{ fontSize:16 }}>{cfg.icon}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:cfg.color }}>{cfg.label}</span>
                    <span style={{ fontSize:11, color:'#334155' }}>({group.monitors.length} monitors)</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:12 }}>
                    {group.monitors.map(m => {
                      const sc = STATUS_CONFIG[m.status] || STATUS_CONFIG.unknown
                      return (
                        <div key={m.id} className="mcard"
                          style={{ background:'#111827', border:`1px solid ${sc.border}`, borderRadius:14, padding:'16px 18px', transition:'all 0.2s', position:'relative' }}>
                          {m.critical && (
                            <div style={{ position:'absolute', top:10, right:10, fontSize:10, padding:'2px 6px', borderRadius:6, background:'#450a0a', color:'#fca5a5', border:'1px solid #ef444430' }}>
                              CRITICAL
                            </div>
                          )}
                          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                            <div style={{ width:38, height:38, borderRadius:10, background:sc.bg, border:`1px solid ${sc.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                              {checking ? <div style={{ width:16,height:16,borderRadius:'50%',border:`2px solid ${sc.border}`,borderTopColor:sc.color,animation:'spin 0.7s linear infinite' }}/> : sc.icon}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:14, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</div>
                              <div style={{ fontSize:11, color:'#334155', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.url}</div>
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                            <span style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:6, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}` }}>
                              {sc.icon} {sc.label}
                            </span>
                            {m.response_time && (
                              <span style={{ fontSize:11, color: m.response_time<300?'#34d399':m.response_time<1000?'#fbbf24':'#ef4444' }}>
                                ⚡ {m.response_time}ms
                              </span>
                            )}
                            {m.uptime_percent !== undefined && m.uptime_percent !== null && (
                              <span style={{ fontSize:11, color:'#475569' }}>
                                📊 {m.uptime_percent}% uptime
                              </span>
                            )}
                            {m.last_checked && (
                              <span style={{ fontSize:10, color:'#334155', marginLeft:'auto' }}>
                                {new Date(m.last_checked).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                              </span>
                            )}
                          </div>
                          {/* Response time bar */}
                          {m.response_time && (
                            <div style={{ marginTop:10 }}>
                              <div style={{ height:4, background:'#1f2d45', borderRadius:2, overflow:'hidden' }}>
                                <div style={{ height:'100%', background: m.response_time<300?'#10b981':m.response_time<1000?'#f59e0b':'#ef4444', borderRadius:2, width:`${Math.min((m.response_time/2000)*100,100)}%`, transition:'width 0.8s ease' }}/>
                              </div>
                            </div>
                          )}
                          {/* Delete */}
                          <button onClick={() => deleteMonitor(m.id)}
                            style={{ position:'absolute', bottom:10, right:10, background:'transparent', border:'none', color:'#334155', cursor:'pointer', fontSize:12, padding:'2px 6px' }}>
                            🗑️
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── INCIDENTS TAB ── */}
        {activeTab === 'incidents' && (
          <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, overflow:'hidden' }}>
            {incidents.length === 0 ? (
              <div style={{ padding:48, textAlign:'center' }}>
                <div style={{ fontSize:44, marginBottom:12 }}>✅</div>
                <p style={{ color:'#475569' }}>No incidents recorded yet</p>
                <p style={{ color:'#334155', fontSize:12 }}>Incidents are auto-created when monitors go down</p>
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'#0a0e1a' }}>
                  {['Service','Status','Started','Duration','Impact','Actions'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:600, color:'#475569', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {incidents.map(inc => (
                    <tr key={inc.id} style={{ borderTop:'1px solid #1f2d45' }}>
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ fontSize:13, fontWeight:600 }}>{inc.service_name}</div>
                        <div style={{ fontSize:11, color:'#475569' }}>{inc.description}</div>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:6,
                          background: inc.resolved_at?'#052e16':'#450a0a',
                          color: inc.resolved_at?'#34d399':'#ef4444' }}>
                          {inc.resolved_at ? '✅ Resolved' : '🔴 Active'}
                        </span>
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:'#64748b' }}>
                        {new Date(inc.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:'#64748b' }}>
                        {inc.resolved_at
                          ? `${Math.round((new Date(inc.resolved_at) - new Date(inc.created_at)) / 60000)}m`
                          : 'Ongoing'}
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:11, padding:'2px 7px', borderRadius:5,
                          background: inc.severity==='critical'?'#450a0a':inc.severity==='high'?'#431407':'#451a03',
                          color: inc.severity==='critical'?'#ef4444':inc.severity==='high'?'#f97316':'#fbbf24' }}>
                          {inc.severity}
                        </span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        {inc.ticket_id && (
                          <button onClick={() => router.push(`/tickets/${inc.ticket_id}`)}
                            style={{ padding:'4px 10px', background:'#1e3a5f', border:'none', color:'#60a5fa', borderRadius:6, cursor:'pointer', fontSize:11 }}>
                            View Ticket
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Add Monitor Modal */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, animation:'fadeIn 0.2s' }}>
          <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'28px 32px', width:420 }}>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:17, marginBottom:20 }}>➕ Add Monitor</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { label:'Service Name', key:'name', placeholder:'e.g. Payment Gateway' },
                { label:'Health Check URL', key:'url', placeholder:'https://api.example.com/health' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:11, color:'#475569', fontWeight:600, display:'block', marginBottom:6 }}>{f.label}</label>
                  <input className="inp" value={newMon[f.key]} onChange={e => setNewMon(p => ({...p,[f.key]:e.target.value}))}
                    placeholder={f.placeholder}
                    style={{ width:'100%', padding:'9px 12px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, boxSizing:'border-box' }}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:11, color:'#475569', fontWeight:600, display:'block', marginBottom:6 }}>Category</label>
                <select value={newMon.category} onChange={e => setNewMon(p => ({...p,category:e.target.value}))}
                  style={{ width:'100%', padding:'9px 12px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:'none' }}>
                  {Object.entries(CATEGORY_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>
              <div onClick={() => setNewMon(p => ({...p,critical:!p.critical}))}
                style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'8px 0' }}>
                <div style={{ width:40, height:22, borderRadius:11, background:newMon.critical?'#ef4444':'#1f2d45', transition:'all 0.2s', position:'relative', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:3, left:newMon.critical?20:3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'all 0.2s' }}/>
                </div>
                <span style={{ fontSize:13, color:newMon.critical?'#fca5a5':'#64748b' }}>Mark as Critical Service</span>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button onClick={addMonitor}
                  style={{ flex:1, padding:'11px', background:'linear-gradient(135deg,#2563eb,#3b82f6)', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontWeight:600, fontSize:14 }}>
                  Add Monitor
                </button>
                <button onClick={() => setShowAdd(false)}
                  style={{ flex:1, padding:'11px', background:'transparent', border:'1px solid #1f2d45', borderRadius:10, color:'#64748b', cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Loader() {
  return <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:40,height:40,borderRadius:'50%',border:'3px solid #1f2d45',borderTopColor:'#06b6d4',animation:'spin 0.7s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}

