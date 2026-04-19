'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

export default function SLAEngine() {
  const router   = useRouter()
  const supabase = createClient()

  const [loading,    setLoading]    = useState(true)
  const [running,    setRunning]    = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [tickets,    setTickets]    = useState([])
  const [history,    setHistory]    = useState([])

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    if (!['SUPER_ADMIN','ADMIN','IT_MANAGER'].includes(p?.role)) { router.replace('/dashboard'); return }
    await loadData()
    setLoading(false)
  }

  async function loadData() {
    const now = new Date()
    const { data } = await supabase
      .from('tickets')
      .select('id, ticket_number, title, status, priority, assigned_team, escalated_to_l2, sla_resolve_due, created_at')
      .not('status','in','("resolved","closed")')
      .not('sla_resolve_due','is',null)
      .order('sla_resolve_due', { ascending:true })
    if (data) setTickets(data)

    // Load recent auto-escalation history
    const { data: hist } = await supabase
      .from('ticket_history')
      .select('*, tickets(ticket_number, title)')
      .eq('action','auto_escalated')
      .order('created_at', { ascending:false })
      .limit(10)
    if (hist) setHistory(hist)
  }

  async function runEngine() {
    setRunning(true)
    try {
      const res  = await fetch('/api/sla-engine')
      const data = await res.json()
      setLastResult(data)
      await loadData()
    } catch(e) {
      setLastResult({ success:false, error: e.message })
    }
    setRunning(false)
  }

  const now = new Date()
  const breached = tickets.filter(t => new Date(t.sla_resolve_due) < now)
  const warning1h = tickets.filter(t => {
    const ms = new Date(t.sla_resolve_due) - now
    return ms > 0 && ms <= 1*60*60*1000
  })
  const warning4h = tickets.filter(t => {
    const ms = new Date(t.sla_resolve_due) - now
    return ms > 1*60*60*1000 && ms <= 4*60*60*1000
  })
  const healthy = tickets.filter(t => new Date(t.sla_resolve_due) - now > 4*60*60*1000)

  function timeLabel(sla) {
    const ms = new Date(sla) - now
    if (ms < 0) {
      const h = Math.abs(Math.round(ms/(1000*60*60)))
      return `Breached ${h}h ago`
    }
    const h = Math.floor(ms/(1000*60*60))
    const m = Math.floor((ms%(1000*60*60))/(1000*60))
    return h > 0 ? `${h}h ${m}m left` : `${m}m left`
  }

  if (loading) return <Loader />

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} .trow:hover{background:#0f172a!important;}`}</style>

      <GlobalNav title="SLA Auto Engine" />

      <div style={{ maxWidth:1300, margin:'0 auto', padding:'28px 24px' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:4 }}>⚙️ SLA Auto-Escalation Engine</h1>
            <p style={{ color:'#64748b', fontSize:13 }}>Monitors all tickets, auto-escalates on SLA breach, sends warnings 1 hour before deadline</p>
          </div>
          <button onClick={runEngine} disabled={running}
            style={{ padding:'12px 24px', background:running?'#1e293b':'linear-gradient(135deg,#d97706,#f59e0b)', border:'none', borderRadius:12, color:running?'#64748b':'#000', cursor:running?'not-allowed':'pointer', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:10 }}>
            {running
              ? <><div style={{ width:18, height:18, borderRadius:'50%', border:'2px solid #334155', borderTopColor:'#60a5fa', animation:'spin 0.7s linear infinite' }}/><span style={{ animation:'pulse 1.5s infinite' }}>Running Engine...</span></>
              : <>⚡ Run Engine Now</>}
          </button>
        </div>

        {/* Last Run Result */}
        {lastResult && (
          <div style={{ background:lastResult.success?'#052e16':'#450a0a', border:`1px solid ${lastResult.success?'#10b98130':'#ef444430'}`, borderRadius:12, padding:'16px 20px', marginBottom:20, animation:'fadeUp 0.3s ease' }}>
            <div style={{ fontSize:13, fontWeight:600, color:lastResult.success?'#34d399':'#fca5a5', marginBottom:6 }}>
              {lastResult.success ? '✅ Engine ran successfully' : '❌ Engine error'}
            </div>
            {lastResult.success && (
              <div style={{ display:'flex', gap:20, fontSize:12, color:'#64748b' }}>
                <span>📋 Checked: <strong style={{ color:'#e2e8f0' }}>{lastResult.results?.checked}</strong></span>
                <span>⚠️ Warned: <strong style={{ color:'#fbbf24' }}>{lastResult.results?.warned}</strong></span>
                <span>🔺 Escalated: <strong style={{ color:'#f97316' }}>{lastResult.results?.escalated}</strong></span>
                <span>🔔 Notified: <strong style={{ color:'#60a5fa' }}>{lastResult.results?.notified}</strong></span>
                <span style={{ marginLeft:'auto' }}>{new Date(lastResult.timestamp).toLocaleString('en-IN')}</span>
              </div>
            )}
            {!lastResult.success && <div style={{ fontSize:12, color:'#fca5a5' }}>{lastResult.error}</div>}
          </div>
        )}

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
          {[
            { icon:'🔴', label:'SLA Breached',    val:breached.length,  color:'#ef4444', bg:'#450a0a', sub:'Auto-escalating' },
            { icon:'🟠', label:'1hr Warning',      val:warning1h.length, color:'#f97316', bg:'#431407', sub:'Critical zone' },
            { icon:'🟡', label:'4hr Warning',      val:warning4h.length, color:'#fbbf24', bg:'#451a03', sub:'Watch zone' },
            { icon:'🟢', label:'Healthy',          val:healthy.length,   color:'#10b981', bg:'#052e16', sub:'SLA safe' },
          ].map((s,i) => (
            <div key={s.label} style={{ background:'#111827', border:`1px solid ${s.color}30`, borderRadius:14, padding:'16px 20px', animation:`fadeUp 0.4s ${i*0.06}s ease both` }}>
              <div style={{ fontSize:24, marginBottom:4 }}>{s.icon}</div>
              <div style={{ fontSize:26, fontWeight:700, color:s.color, fontFamily:"'Syne',sans-serif" }}>{s.val}</div>
              <div style={{ fontSize:11, color:'#64748b', marginTop:1 }}>{s.label}</div>
              <div style={{ fontSize:10, color:'#334155', marginTop:2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Setup Info */}
        <div style={{ background:'#111827', border:'1px solid #f59e0b30', borderRadius:14, padding:'18px 22px', marginBottom:24 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#fbbf24', marginBottom:12 }}>⚙️ Auto-Run Setup (Vercel Cron)</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, fontSize:12, color:'#64748b', lineHeight:1.8 }}>
            <div>
              <div style={{ color:'#94a3b8', fontWeight:600, marginBottom:6 }}>1. Add to <code style={{ color:'#06b6d4' }}>.env.local</code>:</div>
              <div style={{ background:'#0a0e1a', borderRadius:8, padding:'10px 14px', fontFamily:'monospace', fontSize:11, color:'#34d399' }}>
                SUPABASE_SERVICE_ROLE_KEY=your_key<br/>
                CRON_SECRET=any_random_string
              </div>
            </div>
            <div>
              <div style={{ color:'#94a3b8', fontWeight:600, marginBottom:6 }}>2. Add to <code style={{ color:'#06b6d4' }}>vercel.json</code> (root folder):</div>
              <div style={{ background:'#0a0e1a', borderRadius:8, padding:'10px 14px', fontFamily:'monospace', fontSize:11, color:'#60a5fa' }}>
                {'{'}<br/>
                &nbsp;&nbsp;"crons": [{'{'}<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;"path": "/api/sla-engine",<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;"schedule": "*/15 * * * *"<br/>
                &nbsp;&nbsp;{'}'}]<br/>
                {'}'}
              </div>
            </div>
          </div>
          <div style={{ marginTop:12, fontSize:11, color:'#475569' }}>
            ✅ Engine runs every 15 minutes automatically on Vercel • Locally: click "Run Engine Now" to test
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

          {/* Tickets at Risk */}
          <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #1f2d45' }}>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700 }}>🚨 Tickets at Risk <span style={{ fontSize:12, color:'#475569', fontWeight:400 }}>({[...breached,...warning1h,...warning4h].length})</span></h3>
            </div>
            <div style={{ maxHeight:380, overflowY:'auto' }}>
              {[...breached, ...warning1h, ...warning4h].length === 0 ? (
                <div style={{ padding:32, textAlign:'center' }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>✅</div>
                  <p style={{ color:'#475569', fontSize:13 }}>All tickets are within SLA!</p>
                </div>
              ) : (
                [...breached, ...warning1h, ...warning4h].map(t => {
                  const ms  = new Date(t.sla_resolve_due) - now
                  const bad = ms < 0
                  const warn1 = ms > 0 && ms <= 1*60*60*1000
                  const color = bad?'#ef4444':warn1?'#f97316':'#fbbf24'
                  const bg    = bad?'#450a0a':warn1?'#431407':'#451a03'
                  const tc    = t.assigned_team==='DEVELOPER'?{bg:'#083344',c:'#06b6d4'}:t.assigned_team==='L2'?{bg:'#2e1065',c:'#a78bfa'}:{bg:'#1e3a5f',c:'#60a5fa'}
                  return (
                    <div key={t.id} className="trow" onClick={() => router.push(`/tickets/${t.id}`)}
                      style={{ padding:'12px 20px', borderBottom:'1px solid #0f172a', cursor:'pointer', transition:'background 0.15s' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:'#60a5fa', fontFamily:'monospace' }}>{t.ticket_number}</span>
                        <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:5, background:bg, color }}>{timeLabel(t.sla_resolve_due)}</span>
                      </div>
                      <div style={{ fontSize:13, color:'#e2e8f0', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                      <div style={{ display:'flex', gap:6 }}>
                        <span style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:tc.bg, color:tc.c }}>{t.assigned_team}</span>
                        <span style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:'#1f2d45', color:'#94a3b8', textTransform:'capitalize' }}>{t.priority}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Auto-Escalation History */}
          <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #1f2d45' }}>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700 }}>🤖 Auto-Escalation History</h3>
            </div>
            <div style={{ maxHeight:380, overflowY:'auto' }}>
              {history.length === 0 ? (
                <div style={{ padding:32, textAlign:'center' }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>🤖</div>
                  <p style={{ color:'#475569', fontSize:13 }}>No auto-escalations yet</p>
                </div>
              ) : (
                history.map(h => (
                  <div key={h.id} style={{ padding:'12px 20px', borderBottom:'1px solid #0f172a' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'#f97316', fontFamily:'monospace' }}>{h.tickets?.ticket_number||'—'}</span>
                      <span style={{ fontSize:10, color:'#475569' }}>{new Date(h.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                    </div>
                    <div style={{ fontSize:12, color:'#94a3b8', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{h.tickets?.title}</div>
                    <div style={{ fontSize:11, color:'#f97316' }}>🔺 {h.description}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Loader() {
  return <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#f59e0b', animation:'spin 0.7s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}

