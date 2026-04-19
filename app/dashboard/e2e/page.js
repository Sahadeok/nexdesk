'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

function getSupabase() { return createClient() }

const LAYERS = [
  { key:'frontend',  label:'Frontend',  icon:'🖥️',  color:'#3b82f6' },
  { key:'api',       label:'APIs',       icon:'🔌',  color:'#10b981' },
  { key:'backend',   label:'Backend',   icon:'⚙️',  color:'#8b5cf6' },
  { key:'database',  label:'Database',  icon:'🗄️',  color:'#f59e0b' },
  { key:'thirdparty',label:'3rd Party', icon:'🌐',  color:'#ef4444' },
]

export default function E2EMonitor() {
  const router   = useRouter()
  const supabase = getSupabase()
  const intervalRef = useRef(null)

  const [profile,    setProfile]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [logs,       setLogs]       = useState([])
  const [monitors,   setMonitors]   = useState([])
  const [incidents,  setIncidents]  = useState([])
  const [tickets,    setTickets]    = useState([])
  const [activeLayer,setActiveLayer]= useState('all')
  const [countdown,  setCountdown]  = useState(30)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [stats,      setStats]      = useState(null)

  useEffect(() => {
    init()
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    if (!['SUPER_ADMIN','ADMIN','IT_MANAGER'].includes(p?.role)) { router.replace('/dashboard'); return }
    setProfile(p)
    await loadAll()
    setLoading(false)
    startTimer()
  }

  function startTimer() {
    let c = 30
    intervalRef.current = setInterval(() => {
      c--
      setCountdown(c)
      if (c <= 0) { c = 30; loadAll() }
    }, 1000)
  }

  async function loadAll() {
    await Promise.all([loadLogs(), loadMonitors(), loadIncidents(), loadTickets()])
    setLastUpdate(new Date())
  }

  async function loadLogs() {
    const { data } = await supabase
      .from('health_logs')
      .select('*')
      .order('logged_at', { ascending: false })
      .limit(50)
    if (data) setLogs(data)
  }

  async function loadMonitors() {
    const { data } = await supabase
      .from('health_monitors')
      .select('*')
      .order('category')
    if (data) setMonitors(data)
  }

  async function loadIncidents() {
    const { data } = await supabase
      .from('health_incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    if (data) setIncidents(data)
  }

  async function loadTickets() {
    const { data } = await supabase
      .from('tickets')
      .select('id, title, status, priority, created_at, source, assigned_team')
      .in('source', ['health_monitor', 'ai_resolution_engine', 'smart_ticket'])
      .order('created_at', { ascending: false })
      .limit(10)
    if (data) setTickets(data)

    // Stats
    const { count: openCount }   = await supabase.from('tickets').select('*', { count:'exact', head:true }).eq('status','open')
    const { count: totalToday }  = await supabase.from('tickets').select('*', { count:'exact', head:true }).gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString())
    const { count: logErrors }   = await supabase.from('health_logs').select('*', { count:'exact', head:true }).in('type',['js_error','api_failure','api_error'])
    const { count: activeInc }   = await supabase.from('health_incidents').select('*', { count:'exact', head:true }).is('resolved_at', null)
    setStats({ openCount, totalToday, logErrors, activeInc })
  }

  // Classify log into layer
  function getLayer(log) {
    if (!log) return 'unknown'
    const url     = (log.url || '').toLowerCase()
    const type    = (log.type || '').toLowerCase()
    const service = (log.service || '').toLowerCase()
    if (type === 'js_error' || type === 'promise_rejection') return 'frontend'
    if (service.includes('bse') || service.includes('nse') || service.includes('cams') || service.includes('razorpay') || service.includes('sms')) return 'thirdparty'
    if (url.includes('/api/') || type === 'api_failure' || type === 'api_error') return 'api'
    if (service.includes('database') || service.includes('supabase')) return 'database'
    return 'backend'
  }

  function getSeverityColor(type) {
    if (['js_error','api_error','api_failure'].includes(type)) return { color:'#ef4444', bg:'#450a0a' }
    if (type === 'slow_response') return { color:'#fbbf24', bg:'#451a03' }
    return { color:'#64748b', bg:'#1f2d45' }
  }

  function timeAgo(d) {
    const diff = Date.now() - new Date(d).getTime()
    const m = Math.floor(diff/60000)
    const h = Math.floor(diff/3600000)
    if (m < 1) return 'Just now'
    if (m < 60) return `${m}m ago`
    return `${h}h ago`
  }

  const filteredLogs = activeLayer === 'all' ? logs : logs.filter(l => getLayer(l) === activeLayer)

  const upCount    = monitors.filter(m => m.status === 'up').length
  const downCount  = monitors.filter(m => m.status === 'down').length
  const health     = monitors.length > 0 ? Math.round((upCount/monitors.length)*100) : 100

  if (loading) return <Loader />

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .log-row:hover { background:#131929!important; }
        .layer-btn:hover { border-color:#3b82f640!important; color:#94a3b8!important; }
      `}</style>

      <GlobalNav title="E2E Monitor" />

      <div style={{ maxWidth:1400, margin:'0 auto', padding:'24px' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:4 }}>🔭 End-to-End Monitor</h1>
            <p style={{ color:'#64748b', fontSize:13 }}>Unified view — Frontend → API → Backend → Database → 3rd Party</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', background:'#111827', border:'1px solid #1f2d45', borderRadius:10 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#10b981', animation:'pulse 1.5s infinite' }}/>
              <span style={{ fontSize:12, color:'#34d399' }}>LIVE</span>
              <span style={{ fontSize:11, color:'#334155' }}>· {countdown}s</span>
            </div>
            {lastUpdate && <span style={{ fontSize:11, color:'#334155' }}>Updated {timeAgo(lastUpdate)}</span>}
            <button onClick={loadAll}
              style={{ padding:'8px 16px', background:'#1e3a5f', border:'1px solid #3b82f640', borderRadius:10, color:'#60a5fa', cursor:'pointer', fontSize:13 }}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
          {[
            { icon:'💚', label:'System Health', value:`${health}%`,      color: health===100?'#34d399':health>=80?'#fbbf24':'#ef4444' },
            { icon:'🔴', label:'Services Down', value:downCount,         color: downCount>0?'#ef4444':'#34d399' },
            { icon:'🚨', label:'Active Incidents',value:stats?.activeInc||0, color: (stats?.activeInc||0)>0?'#ef4444':'#34d399' },
            { icon:'📋', label:'Open Tickets',  value:stats?.openCount||0,  color:'#60a5fa' },
            { icon:'⚠️', label:'Log Errors Today',value:stats?.logErrors||0, color: (stats?.logErrors||0)>0?'#fbbf24':'#34d399' },
          ].map((k,i) => (
            <div key={k.label} style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, padding:'16px 18px', animation:`fadeUp 0.4s ${i*0.05}s ease both` }}>
              <div style={{ fontSize:20, marginBottom:6 }}>{k.icon}</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
              <div style={{ fontSize:11, color:'#475569', marginTop:4 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* System layer flow */}
        <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:20, marginBottom:20 }}>
          <div style={{ fontSize:12, color:'#475569', fontWeight:600, marginBottom:14, textTransform:'uppercase', letterSpacing:'1px' }}>System Layers</div>
          <div style={{ display:'flex', alignItems:'center', gap:0, overflowX:'auto' }}>
            {LAYERS.map((layer, i) => {
              const layerLogs     = logs.filter(l => getLayer(l) === layer.key)
              const layerErrors   = layerLogs.filter(l => ['js_error','api_error','api_failure'].includes(l.type))
              const hasError      = layerErrors.length > 0
              const layerMonitors = monitors.filter(m => m.category === layer.key || (layer.key === 'thirdparty' && ['market_data','payments','kyc','notifications'].includes(m.category)))
              const layerDown     = layerMonitors.filter(m => m.status === 'down').length
              return (
                <div key={layer.key} style={{ display:'flex', alignItems:'center', flex:1 }}>
                  <div style={{ flex:1, padding:'14px 16px', background: hasError||layerDown>0?'rgba(239,68,68,0.05)':'rgba(16,185,129,0.03)', border:`1px solid ${hasError||layerDown>0?'#ef444430':'#1f2d45'}`, borderRadius:12, textAlign:'center' }}>
                    <div style={{ fontSize:22, marginBottom:4 }}>{layer.icon}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:layer.color }}>{layer.label}</div>
                    <div style={{ marginTop:6, display:'flex', justifyContent:'center', gap:6, flexWrap:'wrap' }}>
                      {layerErrors.length > 0 && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:'#450a0a', color:'#ef4444' }}>{layerErrors.length} errors</span>}
                      {layerDown > 0 && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:'#450a0a', color:'#ef4444' }}>{layerDown} down</span>}
                      {!hasError && layerDown === 0 && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:'#052e16', color:'#34d399' }}>✓ OK</span>}
                    </div>
                  </div>
                  {i < LAYERS.length-1 && (
                    <div style={{ padding:'0 6px', color:'#1f2d45', fontSize:18, flexShrink:0 }}>→</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Main content: logs + incidents */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:16 }}>

          {/* Live logs */}
          <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid #1f2d45', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:14, fontWeight:600 }}>📋 Live Error Feed</span>
              <div style={{ display:'flex', gap:4 }}>
                <button onClick={() => setActiveLayer('all')} className="layer-btn"
                  style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${activeLayer==='all'?'#3b82f6':'#1f2d45'}`, background:'transparent', color:activeLayer==='all'?'#60a5fa':'#475569', cursor:'pointer', fontSize:11 }}>
                  All ({logs.length})
                </button>
                {LAYERS.map(l => (
                  <button key={l.key} onClick={() => setActiveLayer(l.key)} className="layer-btn"
                    style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${activeLayer===l.key?l.color:'#1f2d45'}`, background:'transparent', color:activeLayer===l.key?l.color:'#475569', cursor:'pointer', fontSize:11 }}>
                    {l.icon}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ maxHeight:420, overflowY:'auto' }}>
              {filteredLogs.length === 0 ? (
                <div style={{ padding:48, textAlign:'center' }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
                  <p style={{ color:'#475569', fontSize:14 }}>No errors captured</p>
                  <p style={{ color:'#334155', fontSize:12, marginTop:4 }}>Embed nexdesk-agent.js in your app to start capturing</p>
                </div>
              ) : (
                filteredLogs.map((log, i) => {
                  const sc = getSeverityColor(log.type)
                  const layer = LAYERS.find(l => l.key === getLayer(log))
                  return (
                    <div key={log.id} className="log-row"
                      style={{ padding:'12px 16px', borderBottom:'1px solid #0f172a', display:'flex', gap:10, alignItems:'flex-start' }}>
                      <div style={{ padding:'2px 7px', borderRadius:5, fontSize:10, fontWeight:600, background:sc.bg, color:sc.color, flexShrink:0, marginTop:2 }}>
                        {log.type?.replace('_',' ')}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {log.error_msg || log.type}
                        </div>
                        {log.url && <div style={{ fontSize:11, color:'#334155', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.url}</div>}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3, flexShrink:0 }}>
                        {layer && <span style={{ fontSize:10, color:layer.color }}>{layer.icon} {layer.label}</span>}
                        <span style={{ fontSize:10, color:'#334155' }}>{timeAgo(log.logged_at)}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right column: incidents + tickets */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Active incidents */}
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #1f2d45', fontSize:13, fontWeight:600 }}>
                🚨 Recent Incidents ({incidents.length})
              </div>
              <div style={{ maxHeight:200, overflowY:'auto' }}>
                {incidents.length === 0 ? (
                  <div style={{ padding:24, textAlign:'center', color:'#334155', fontSize:13 }}>No incidents</div>
                ) : incidents.map(inc => (
                  <div key={inc.id} style={{ padding:'10px 14px', borderBottom:'1px solid #0f172a', display:'flex', gap:10, alignItems:'center' }}>
                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 6px', borderRadius:5, background: inc.resolved_at?'#052e16':'#450a0a', color: inc.resolved_at?'#34d399':'#ef4444', flexShrink:0 }}>
                      {inc.resolved_at ? '✓' : '●'}
                    </span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{inc.service_name}</div>
                      <div style={{ fontSize:11, color:'#334155' }}>{timeAgo(inc.created_at)}</div>
                    </div>
                    <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:'#1f2d45', color: inc.severity==='critical'?'#ef4444':inc.severity==='high'?'#f97316':'#fbbf24' }}>
                      {inc.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI-generated tickets */}
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #1f2d45', fontSize:13, fontWeight:600 }}>
                🎫 AI-Created Tickets ({tickets.length})
              </div>
              <div style={{ maxHeight:200, overflowY:'auto' }}>
                {tickets.length === 0 ? (
                  <div style={{ padding:24, textAlign:'center', color:'#334155', fontSize:13 }}>No auto-created tickets yet</div>
                ) : tickets.map(t => (
                  <div key={t.id} style={{ padding:'10px 14px', borderBottom:'1px solid #0f172a', cursor:'pointer' }}
                    onClick={() => router.push(`/tickets/${t.id}`)}>
                    <div style={{ fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:4 }}>{t.title}</div>
                    <div style={{ display:'flex', gap:6 }}>
                      <span style={{ fontSize:10, padding:'1px 6px', borderRadius:4, background:'#1e3a5f', color:'#60a5fa' }}>{t.assigned_team}</span>
                      <span style={{ fontSize:10, padding:'1px 6px', borderRadius:4, background:'#1f2d45', color:'#475569' }}>{t.source?.replace('_',' ')}</span>
                      <span style={{ fontSize:10, color:'#334155', marginLeft:'auto' }}>{timeAgo(t.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, padding:16 }}>
              <div style={{ fontSize:12, color:'#475569', fontWeight:600, marginBottom:12 }}>QUICK ACCESS</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { icon:'🔍', label:'Health Monitor',    path:'/dashboard/health' },
                  { icon:'🤖', label:'AI Resolution',     path:'/ai-resolution' },
                  { icon:'🎫', label:'Smart Ticket',      path:'/tickets/new' },
                  { icon:'📊', label:'Executive View',    path:'/dashboard/executive' },
                ].map(l => (
                  <button key={l.path} onClick={() => router.push(l.path)}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#64748b', cursor:'pointer', fontSize:13, textAlign:'left', transition:'all 0.2s' }}
                    onMouseOver={e => { e.currentTarget.style.borderColor='#3b82f640'; e.currentTarget.style.color='#94a3b8' }}
                    onMouseOut={e => { e.currentTarget.style.borderColor='#1f2d45'; e.currentTarget.style.color='#64748b' }}>
                    <span>{l.icon}</span> {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Loader() {
  return <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:40,height:40,borderRadius:'50%',border:'3px solid #1f2d45',borderTopColor:'#06b6d4',animation:'spin 0.7s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}

