'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'

const RISK_CONFIG = {
  critical: { color:'#ef4444', bg:'#1c0000', icon:'🔴' },
  high:     { color:'#f97316', bg:'#1c0a00', icon:'🟠' },
  medium:   { color:'#f59e0b', bg:'#1c1000', icon:'🟡' },
  low:      { color:'#10b981', bg:'#022c22', icon:'🟢' },
}

export default function Support3Dashboard() {
  const router   = useRouter()
  const supabase = createClient()

  const [loading,        setLoading]        = useState(true)
  const [tab,            setTab]            = useState('overview')
  const [predictions,    setPredictions]    = useState([])
  const [healActions,    setHealActions]    = useState([])
  const [appEvents,      setAppEvents]      = useState([])
  const [widgetSessions, setWidgetSessions] = useState([])
  const [errorSurges,    setErrorSurges]    = useState([])
  const [liveEvents,     setLiveEvents]     = useState([])
  const intervalRef = useRef()

  useEffect(() => {
    init()
    return () => clearInterval(intervalRef.current)
  }, [])

  async function init() {
    const { user } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    await loadAll()
    setLoading(false)
    // Auto-refresh every 15 seconds
    intervalRef.current = setInterval(loadAll, 15000)
  }

  async function loadAll() {
    await Promise.all([
      loadPredictions(),
      loadHealActions(),
      loadAppEvents(),
      loadWidgetSessions(),
      loadErrorSurges(),
    ])
  }

  async function loadPredictions() {
    const { data } = await supabase.from('predictions').select('*').order('predicted_at', { ascending: false }).limit(20)
    setPredictions(data || [])
  }

  async function loadHealActions() {
    const { data } = await supabase.from('heal_actions').select('*').order('healed_at', { ascending: false }).limit(30)
    setHealActions(data || [])
  }

  async function loadAppEvents() {
    const [{ data: appEvData }, { data: sessEvData }] = await Promise.all([
      supabase.from('app_events').select('*').order('logged_at', { ascending: false }).limit(30),
      supabase.from('session_events').select('id, event_type, endpoint, status_code, duration_ms, error_msg, page, logged_at, app_name').order('logged_at', { ascending: false }).limit(30),
    ])
    const normalized = (sessEvData || []).map(e => ({
      id:          e.id,
      app_name:    e.app_name || 'ZenWealth',
      event_type:  e.event_type,
      message:     e.error_msg || e.endpoint || e.event_type,
      endpoint:    e.endpoint,
      status_code: e.status_code,
      duration_ms: e.duration_ms,
      page:        e.page,
      severity:    e.status_code >= 500 ? 'critical' : e.status_code >= 400 ? 'high' : 'medium',
      logged_at:   e.logged_at,
    }))
    const combined = [...(appEvData || []), ...normalized]
      .sort((a,b) => new Date(b.logged_at) - new Date(a.logged_at))
      .slice(0, 60)
    setAppEvents(combined)
    setLiveEvents(combined.slice(0, 10))
  }

  async function loadWidgetSessions() {
    const { data } = await supabase.from('widget_sessions').select('*').order('started_at', { ascending: false }).limit(20)
    setWidgetSessions(data || [])
  }

  async function loadErrorSurges() {
    const { data } = await supabase.from('error_surges').select('*').order('last_seen_at', { ascending: false }).limit(30)
    setErrorSurges(data || [])
  }

  async function dismissPrediction(id) {
    await supabase.from('predictions').update({ status: 'dismissed' }).eq('id', id)
    await loadPredictions()
  }

  const silentHeals   = healActions.filter(h => h.was_silent).length
  const activeAlerts  = predictions.filter(p => p.status === 'active' && ['critical','high'].includes(p.risk_level)).length
  const resolvedWidget = widgetSessions.filter(w => w.resolved).length
  const activeSurges  = errorSurges.filter(s => s.event_count >= 3).length

  const S = {
    page:  { minHeight:'100vh', background:'var(--bg-secondary)', color:'var(--text-primary)', fontFamily:'Calibri, sans-serif' },
    card:  { background:'var(--bg-card)', border:'1px solid var(--border-light)', borderRadius:12 },
    badge: (color, bg) => ({ fontSize:11, padding:'2px 10px', borderRadius:20, fontWeight:600, background:bg, color, border:`1px solid ${color}40` }),
  }

  if (loading) return (
    <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🚀</div>
        <div style={{ color:'var(--text-secondary)' }}>Loading Support 3.0...</div>
      </div>
    </div>
  )

  return (
    <div style={S.page}>

      {/* NAV */}
      <nav style={{ background:'var(--bg-card)', borderBottom:'1px solid var(--border-light)', padding:'0 24px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#2563eb,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⚡</div>
          <span style={{ fontWeight:800, fontSize:18 }}>Nex<span style={{ color:'#06b6d4' }}>Desk</span></span>
          <span style={{ color:'#334155' }}>›</span>
          <span style={{ color:'var(--text-secondary)', fontSize:13 }}>🚀 Support 3.0</span>
          <span style={{ fontSize:11, padding:'2px 10px', borderRadius:20, background:'#022c22', color:'#34d399', border:'1px solid #10b98140', fontWeight:600 }}>● LIVE</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {activeAlerts > 0 && (
            <span style={{ fontSize:12, padding:'4px 12px', borderRadius:20, background:'#1c0000', color:'#ef4444', border:'1px solid #ef444440', fontWeight:700 }}>
              🚨 {activeAlerts} Active Alert{activeAlerts > 1 ? 's' : ''}
            </span>
          )}
          {activeSurges > 0 && (
            <span style={{ fontSize:12, padding:'4px 12px', borderRadius:20, background:'#1c0a00', color:'#f97316', border:'1px solid #f9731640', fontWeight:700 }}>
              🔥 {activeSurges} Surge{activeSurges > 1 ? 's' : ''}
            </span>
          )}
          <button onClick={() => router.push('/dashboard')}
            style={{ padding:'6px 14px', background:'transparent', border:'1px solid var(--border-light)', borderRadius:8, color:'var(--text-secondary)', cursor:'pointer', fontSize:12 }}>← Back</button>
        </div>
      </nav>

      <div style={{ maxWidth:1400, margin:'0 auto', padding:'24px 20px' }}>

        {/* HERO STATS */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:24 }}>
          {[
            { icon:'🔮', label:'Active Predictions', val: predictions.filter(p=>p.status==='active').length,  color:'#a78bfa', bg:'#2e1065' },
            { icon:'🛡️', label:'Silent Heals',       val: silentHeals,                                        color:'#34d399', bg:'#022c22' },
            { icon:'🔥', label:'Error Surges',       val: errorSurges.length,                                 color:'#f97316', bg:'#1c0a00' },
            { icon:'⚡', label:'Live App Events',    val: appEvents.length,                                   color:'#06b6d4', bg:'#083344' },
            { icon:'💬', label:'Widget Sessions',    val: widgetSessions.length,                              color:'#f59e0b', bg:'#1c1000' },
            { icon:'✅', label:'Widget Resolved',    val: resolvedWidget,                                     color:'#10b981', bg:'#022c22' },
          ].map((s,i) => (
            <div key={i} style={{ background: s.bg, border:`1px solid ${s.color}30`, borderRadius:14, padding:'16px 18px' }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
              <div style={{ fontSize:26, fontWeight:800, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:11, color:'var(--text-disabled)', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
          {[
            { key:'overview',    label:'📊 Overview' },
            { key:'predictions', label:`🔮 Predictions (${predictions.filter(p=>p.status==='active').length})` },
            { key:'selfheal',    label:`🛡️ Self-Heal (${healActions.length})` },
            { key:'surges',      label:`🔥 Error Surges (${errorSurges.length})` },
            { key:'liveevents',  label:`⚡ Live Events (${appEvents.length})` },
            { key:'widget',      label:`💬 Widget (${widgetSessions.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding:'8px 16px', borderRadius:10, border:`1px solid ${tab===t.key?'#3b82f640':'var(--border-light)'}`, background:tab===t.key?'#1e3a5f':'var(--bg-primary)', color:tab===t.key?'#60a5fa':'var(--text-secondary)', cursor:'pointer', fontSize:13, fontWeight:tab===t.key?700:400 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ OVERVIEW ══ */}
        {tab === 'overview' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

            {/* Active Predictions */}
            <div style={{ ...S.card, padding:20 }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:14, display:'flex', justifyContent:'space-between' }}>
                <span>🔮 Active Predictions</span>
                <span style={{ fontSize:11, color:'var(--text-disabled)' }}>Auto-refresh 15s</span>
              </div>
              {predictions.filter(p=>p.status==='active').slice(0,4).map(p => {
                const rc = RISK_CONFIG[p.risk_level] || RISK_CONFIG.medium
                return (
                  <div key={p.id} style={{ padding:'12px', background:rc.bg, border:`1px solid ${rc.color}30`, borderRadius:10, marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:rc.color }}>{rc.icon} {p.title}</span>
                      <span style={{ fontSize:11, color:'var(--text-disabled)' }}>{p.confidence}%</span>
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{p.description?.substring(0,80)}...</div>
                    <div style={{ fontSize:11, color:rc.color, marginTop:4 }}>→ {p.recommended_action?.substring(0,60)}</div>
                  </div>
                )
              })}
              {predictions.filter(p=>p.status==='active').length === 0 && (
                <div style={{ textAlign:'center', padding:'20px 0', color:'#334155', fontSize:13 }}>✅ No active predictions — all systems normal</div>
              )}
            </div>

            {/* Error Surges */}
            <div style={{ ...S.card, padding:20 }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:14, display:'flex', justifyContent:'space-between' }}>
                <span>🔥 Recent Error Surges</span>
                <span style={{ fontSize:11, color:'var(--text-disabled)' }}>{errorSurges.filter(s=>s.ticket_created).length} tickets auto-created</span>
              </div>
              {errorSurges.slice(0,5).map((s,i) => (
                <div key={i} style={{ padding:'10px 12px', background: s.event_count >= 3 ? '#1c0a00' : 'var(--bg-primary)', border:`1px solid ${s.event_count >= 3 ? '#f9731640' : 'transparent'}`, borderRadius:8, marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:700, color: s.event_count >= 3 ? '#f97316' : '#64748b' }}>
                      {s.event_count >= 3 ? '🔥' : '⚠️'} {s.event_count} hit{s.event_count > 1 ? 's' : ''} · {s.app_name || 'Unknown App'}
                    </span>
                    {s.ticket_created && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background:'#022c22', color:'#34d399', fontWeight:600 }}>✅ Ticket Created</span>}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-secondary)', fontFamily:'monospace' }}>
                    {atob(s.error_signature || '').substring(0,60) || 'Unknown error pattern'}
                  </div>
                  <div style={{ fontSize:10, color:'#334155', marginTop:3 }}>
                    Last seen: {new Date(s.last_seen_at).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
              {errorSurges.length === 0 && (
                <div style={{ textAlign:'center', padding:'20px 0', color:'#334155', fontSize:13 }}>No error surges detected yet</div>
              )}
            </div>

            {/* Recent Self-Heals */}
            <div style={{ ...S.card, padding:20 }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>🛡️ Recent Self-Heals</div>
              {healActions.slice(0,5).map((h,i) => (
                <div key={i} style={{ padding:'10px 12px', background:'var(--bg-primary)', borderRadius:8, marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontSize:12, color: h.result==='success' ? '#34d399' : '#f87171', fontWeight:600, marginBottom:2 }}>
                      {h.was_silent ? '🔇 Silent' : '📢 Notified'} · {h.action_type}
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{h.action_taken?.substring(0,70)}</div>
                  </div>
                  <span style={{ fontSize:10, color:'#334155', flexShrink:0, marginLeft:8 }}>
                    {new Date(h.healed_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                  </span>
                </div>
              ))}
              {healActions.length === 0 && (
                <div style={{ textAlign:'center', padding:'20px 0', color:'#334155', fontSize:13 }}>No heal actions yet</div>
              )}
            </div>

            {/* Live Event Stream */}
            <div style={{ ...S.card, padding:20 }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>⚡ Live Event Stream</div>
              {liveEvents.slice(0,6).map((e,i) => {
                const color = e.severity==='critical'?'#ef4444':e.severity==='high'?'#f97316':e.severity==='medium'?'#f59e0b':'#34d399'
                return (
                  <div key={i} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:'1px solid var(--bg-primary)', alignItems:'flex-start' }}>
                    <span style={{ fontSize:10, color, fontWeight:700, marginTop:2, flexShrink:0 }}>{e.severity?.toUpperCase()}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, color:'var(--text-disabled)' }}>{e.message?.substring(0,70)}</div>
                      <div style={{ fontSize:10, color:'#334155' }}>{e.app_name} · {e.event_type} · {new Date(e.logged_at).toLocaleTimeString('en-IN')}</div>
                    </div>
                  </div>
                )
              })}
              {liveEvents.length === 0 && (
                <div style={{ textAlign:'center', padding:'20px 0', color:'#334155', fontSize:13 }}>No events yet — embed widget in your app</div>
              )}
            </div>

          </div>
        )}

        {/* ══ PREDICTIONS ══ */}
        {tab === 'predictions' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {predictions.length === 0 ? (
              <div style={{ ...S.card, padding:60, textAlign:'center' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🔮</div>
                <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>No predictions yet</div>
                <div style={{ fontSize:13, color:'var(--text-secondary)' }}>Predictions appear when error patterns are detected in your app events</div>
              </div>
            ) : predictions.map(p => {
              const rc = RISK_CONFIG[p.risk_level] || RISK_CONFIG.medium
              return (
                <div key={p.id} style={{ ...S.card, padding:20, borderColor:`${rc.color}30` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                    <div>
                      <span style={{ ...S.badge(rc.color, rc.bg) }}>{rc.icon} {p.risk_level?.toUpperCase()}</span>
                      <span style={{ ...S.badge('#a78bfa','#2e1065'), marginLeft:6 }}>{p.prediction_type}</span>
                      {p.status === 'dismissed' && <span style={{ ...S.badge('var(--text-disabled)','#1f2937'), marginLeft:6 }}>dismissed</span>}
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{p.confidence}% confidence</span>
                      {p.status === 'active' && (
                        <button onClick={() => dismissPrediction(p.id)}
                          style={{ padding:'3px 10px', background:'transparent', border:'1px solid #334155', borderRadius:6, color:'var(--text-disabled)', cursor:'pointer', fontSize:11 }}>
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>{p.title}</div>
                  <div style={{ fontSize:13, color:'var(--text-disabled)', marginBottom:10, lineHeight:1.6 }}>{p.description}</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <div style={{ padding:'10px 12px', background:'var(--bg-primary)', borderRadius:8 }}>
                      <div style={{ fontSize:11, color:'var(--text-disabled)', marginBottom:3 }}>PATTERN FOUND</div>
                      <div style={{ fontSize:12, color:'var(--text-disabled)' }}>{p.pattern_found}</div>
                    </div>
                    <div style={{ padding:'10px 12px', background:'var(--bg-primary)', borderRadius:8 }}>
                      <div style={{ fontSize:11, color:'var(--text-disabled)', marginBottom:3 }}>RECOMMENDED ACTION</div>
                      <div style={{ fontSize:12, color:rc.color, fontWeight:600 }}>{p.recommended_action}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:11, color:'#334155', marginTop:8 }}>
                    Predicted: {new Date(p.predicted_at).toLocaleString('en-IN')}
                    {p.affected_users > 0 && ` · ~${p.affected_users} users affected`}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ══ SELF-HEAL ══ */}
        {tab === 'selfheal' && (
          <div style={{ ...S.card, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border-light)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14, fontWeight:700 }}>🛡️ Self-Heal Actions ({healActions.length})</span>
              <span style={{ fontSize:12, color:'#34d399' }}>🔇 {silentHeals} fixed silently — users never knew</span>
            </div>
            {healActions.length === 0 ? (
              <div style={{ padding:60, textAlign:'center', color:'#334155', fontSize:13 }}>
                <div style={{ fontSize:36, marginBottom:12 }}>🛡️</div>
                No heal actions recorded yet. Embed the widget in your app to start monitoring.
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'var(--bg-secondary)' }}>
                    {['App','Trigger','Action Taken','Result','Silent','Time'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, color:'var(--text-disabled)', fontWeight:600, borderBottom:'1px solid var(--border-light)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {healActions.map((h,i) => (
                    <tr key={i} style={{ borderBottom:'1px solid var(--bg-primary)' }}>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-disabled)' }}>{h.app_name || '—'}</td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-secondary)', maxWidth:200 }}>{h.trigger_event?.substring(0,50)}</td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-primary)' }}>{h.action_taken?.substring(0,60)}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ ...S.badge(h.result==='success'?'#34d399':h.result==='escalated'?'#f59e0b':'#f87171', h.result==='success'?'#022c22':h.result==='escalated'?'#1c1000':'#1c0000') }}>
                          {h.result}
                        </span>
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ fontSize:11, color: h.was_silent ? '#34d399' : '#f59e0b' }}>{h.was_silent ? '🔇 Yes' : '📢 No'}</span>
                      </td>
                      <td style={{ padding:'10px 14px', fontSize:11, color:'#334155' }}>
                        {new Date(h.healed_at).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ══ ERROR SURGES ══ */}
        {tab === 'surges' && (
          <div>
            <div style={{ ...S.card, padding:'14px 20px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700 }}>🔥 Error Surge Tracker</div>
                <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:4 }}>
                  When the same error hits 3+ times, a P0 Critical ticket is auto-created for L2 team
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:22, fontWeight:800, color:'#f97316' }}>{errorSurges.filter(s=>s.event_count>=3).length}</div>
                <div style={{ fontSize:11, color:'var(--text-disabled)' }}>surges triggered</div>
              </div>
            </div>

            {errorSurges.length === 0 ? (
              <div style={{ ...S.card, padding:60, textAlign:'center' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🔥</div>
                <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>No error surges yet</div>
                <div style={{ fontSize:13, color:'var(--text-secondary)' }}>
                  When 3+ users hit the same error, it will appear here and a ticket will be auto-raised
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {errorSurges.map((s,i) => {
                  const isSurge = s.event_count >= 3
                  const color = isSurge ? '#f97316' : '#64748b'
                  const bg    = isSurge ? '#1c0a00' : 'var(--bg-card)'
                  let decodedSig = '—'
                  try { decodedSig = atob(s.error_signature || '') } catch(e) { decodedSig = s.error_signature || '—' }
                  return (
                    <div key={i} style={{ ...S.card, background: bg, borderColor:`${color}30`, padding:20 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                          <span style={{ ...S.badge(color, bg === 'var(--bg-card)' ? 'var(--bg-secondary)' : bg) }}>
                            {isSurge ? '🔥 SURGE' : '⚠️ WATCHING'}
                          </span>
                          <span style={{ ...S.badge('#60a5fa','#1e3a5f') }}>{s.app_name || 'Unknown App'}</span>
                          {s.ticket_created && <span style={{ ...S.badge('#34d399','#022c22') }}>✅ Ticket Auto-Created</span>}
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:24, fontWeight:800, color }}>{s.event_count}</div>
                          <div style={{ fontSize:10, color:'var(--text-disabled)' }}>occurrences</div>
                        </div>
                      </div>
                      <div style={{ fontSize:12, color:'var(--text-disabled)', fontFamily:'monospace', background:'var(--bg-primary)', padding:'8px 12px', borderRadius:8, marginBottom:10, wordBreak:'break-all' }}>
                        {decodedSig.substring(0, 120)}
                      </div>
                      <div style={{ display:'flex', gap:16, fontSize:11, color:'#334155' }}>
                        <span>First seen: {new Date(s.first_seen_at).toLocaleString('en-IN')}</span>
                        <span>Last seen: {new Date(s.last_seen_at).toLocaleString('en-IN')}</span>
                      </div>
                      {isSurge && !s.ticket_created && (
                        <div style={{ marginTop:10, padding:'8px 12px', background:'#1c1000', border:'1px solid #f59e0b40', borderRadius:8, fontSize:12, color:'#f59e0b' }}>
                          ⚠️ Surge threshold reached but ticket not yet created. This may indicate a DB issue.
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ LIVE EVENTS ══ */}
        {tab === 'liveevents' && (
          <div style={{ ...S.card, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border-light)', display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:14, fontWeight:700 }}>⚡ Live App Events ({appEvents.length})</span>
              <span style={{ fontSize:11, color:'var(--text-disabled)' }}>From widget v3 + legacy agent</span>
            </div>
            {appEvents.length === 0 ? (
              <div style={{ padding:60, textAlign:'center', color:'#334155', fontSize:13 }}>
                <div style={{ fontSize:36, marginBottom:12 }}>⚡</div>
                No events yet. Embed the widget in your app.
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'var(--bg-secondary)' }}>
                    {['Severity','App','Type','Message','Page','Status','Time'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, color:'var(--text-disabled)', fontWeight:600, borderBottom:'1px solid var(--border-light)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appEvents.map((e,i) => {
                    const color = e.severity==='critical'?'#ef4444':e.severity==='high'?'#f97316':e.severity==='medium'?'#f59e0b':'#34d399'
                    const bg    = e.severity==='critical'?'#1c0000':e.severity==='high'?'#1c0a00':e.severity==='medium'?'#1c1000':'#022c22'
                    return (
                      <tr key={i} style={{ borderBottom:'1px solid var(--bg-primary)' }}>
                        <td style={{ padding:'9px 14px' }}><span style={{ ...S.badge(color,bg) }}>{e.severity}</span></td>
                        <td style={{ padding:'9px 14px', fontSize:12, color:'var(--text-disabled)' }}>{e.app_name}</td>
                        <td style={{ padding:'9px 14px', fontSize:11, color:'var(--text-secondary)' }}>{e.event_type}</td>
                        <td style={{ padding:'9px 14px', fontSize:12, color:'var(--text-primary)', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.message}</td>
                        <td style={{ padding:'9px 14px', fontSize:11, color:'var(--text-disabled)' }}>{e.page || '—'}</td>
                        <td style={{ padding:'9px 14px', fontSize:11, color:'var(--text-secondary)' }}>{e.status_code || '—'}</td>
                        <td style={{ padding:'9px 14px', fontSize:11, color:'#334155' }}>{new Date(e.logged_at).toLocaleTimeString('en-IN')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ══ WIDGET ══ */}
        {tab === 'widget' && (
          <div>
            <div style={{ ...S.card, padding:20, marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>📋 Embed Widget in Your App</div>
              <pre style={{ background:'var(--bg-primary)', border:'1px solid var(--border-light)', borderRadius:10, padding:16, fontSize:12, color:'#6ee7b7', overflowX:'auto', userSelect:'all' }}>
{`<script
  src="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/nexdesk-widget-v3.js"
  data-nexdesk-url="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}"
  data-app-id="your_app_id"
  data-app-name="Your App Name"
  async>
</script>`}
              </pre>
              <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:10, lineHeight:1.6 }}>
                Drop this snippet into any web app. The widget will automatically capture JS errors, API failures,
                and slow responses — then report them to this Support 3.0 dashboard in real-time.
              </div>
            </div>
            <div style={{ ...S.card, overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border-light)' }}>
                <span style={{ fontSize:14, fontWeight:700 }}>💬 Widget Sessions ({widgetSessions.length})</span>
              </div>
              {widgetSessions.length === 0 ? (
                <div style={{ padding:60, textAlign:'center', color:'#334155', fontSize:13 }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>💬</div>
                  No widget sessions yet. Users will appear here when they interact with the widget.
                </div>
              ) : widgetSessions.map((w,i) => (
                <div key={i} style={{ padding:'14px 20px', borderBottom:'1px solid var(--bg-primary)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:12, color:'var(--text-secondary)', fontWeight:600 }}>{w.app_name} · {w.page}</span>
                    <span style={{ ...S.badge(w.resolved?'#34d399':'#f59e0b', w.resolved?'#022c22':'#1c1000') }}>
                      {w.resolved ? '✅ Resolved' : '⏳ Open'}
                    </span>
                  </div>
                  <div style={{ fontSize:13, color:'var(--text-disabled)', marginBottom:4 }}>
                    <strong style={{ color:'#60a5fa' }}>User:</strong> {w.issue_desc}
                  </div>
                  <div style={{ fontSize:13, color:'var(--text-secondary)' }}>
                    <strong style={{ color:'#34d399' }}>AI:</strong> {w.ai_response}
                  </div>
                  <div style={{ fontSize:11, color:'#334155', marginTop:4 }}>
                    {new Date(w.started_at).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      <style>{`* { box-sizing:border-box; } ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:var(--bg-secondary)} ::-webkit-scrollbar-thumb{background:var(--border-light);border-radius:3px}`}</style>
    </div>
  )
}

