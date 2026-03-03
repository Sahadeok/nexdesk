'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getProfile } from '../../../lib/supabase'
import Topbar from '../../components/Topbar'

const PC = { critical:'#ef4444', high:'#f59e0b', medium:'#3b82f6', low:'#10b981' }
const TEAM_COLOR = { L1:'#3b82f6', L2:'#8b5cf6', DEVELOPER:'#f59e0b' }
const TEAM_LABEL = { L1:'👤 L1 Support', L2:'🛠️ L2 Technical', DEVELOPER:'👨‍💻 Developer' }
const ST_COLOR = { open:'#3b82f6', assigned:'#f59e0b', in_progress:'#8b5cf6', escalated:'#ef4444', resolved:'#10b981', closed:'#64748b' }

function ago(d) {
  const diff = Date.now() - new Date(d)
  const m = Math.floor(diff/60000), h = Math.floor(m/60), dy = Math.floor(h/24)
  return dy>0 ? dy+'d ago' : h>0 ? h+'h ago' : m>0 ? m+'m ago' : 'just now'
}

export default function ManagerDashboard() {
  const router  = useRouter()
  const [profile, setProfile]     = useState(null)
  const [tickets, setTickets]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [teamFilter, setTeamFilter] = useState('ALL')
  const [prioFilter, setPrioFilter] = useState('ALL')
  const [search, setSearch]       = useState('')

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const p = await getProfile(sb, user.id)
      setProfile(p)
      if (p?.role_code === 'END_USER') { router.replace('/dashboard/user'); return }
      if (p?.role_code === 'L1_AGENT') { router.replace('/dashboard/l1'); return }
      if (p?.role_code === 'L2_AGENT') { router.replace('/dashboard/l2'); return }
      if (p?.role_code === 'DEVELOPER') { router.replace('/dashboard/developer'); return }
      const { data } = await sb.from('tickets')
        .select('*').eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(200)
      setTickets(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const stats = {
    total:     tickets.length,
    open:      tickets.filter(t => !['resolved','closed'].includes(t.status)).length,
    critical:  tickets.filter(t => t.priority === 'critical' && !['resolved','closed'].includes(t.status)).length,
    resolved:  tickets.filter(t => ['resolved','closed'].includes(t.status)).length,
    l1:        tickets.filter(t => t.assigned_team === 'L1').length,
    l2:        tickets.filter(t => t.assigned_team === 'L2').length,
    dev:       tickets.filter(t => t.assigned_team === 'DEVELOPER').length,
    codeBugs:  tickets.filter(t => t.is_code_bug).length,
    breached:  tickets.filter(t => t.sla_resolve_due && new Date(t.sla_resolve_due) < new Date() && !['resolved','closed'].includes(t.status)).length,
  }

  const filtered = tickets.filter(t => {
    if (teamFilter !== 'ALL' && t.assigned_team !== teamFilter) return false
    if (prioFilter !== 'ALL' && t.priority !== prioFilter) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !(t.ticket_number||'').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <>
      <style>{`
        *{box-sizing:border-box}body{margin:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .trow:hover{background:rgba(59,130,246,0.04)!important;cursor:pointer}
        .ftab{padding:6px 14px;border-radius:8px;border:1px solid #1f2d45;background:transparent;color:#64748b;font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;transition:all 0.15s}
        .ftab.on{border-color:rgba(59,130,246,0.5);background:rgba(59,130,246,0.1);color:#3b82f6}
        .ptab.on{border-color:rgba(239,68,68,0.5);background:rgba(239,68,68,0.1);color:#ef4444}
      `}</style>

      <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
        <Topbar profile={profile} title="Manager Dashboard" subtitle="Full visibility across all tickets & teams" />

        <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 20px' }}>

          {/* Big stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
            {[
              ['Total Tickets', stats.total,    '🎫', '#3b82f6'],
              ['Active',        stats.open,     '⏳', '#f59e0b'],
              ['🚨 Critical',   stats.critical, '🔴', '#ef4444'],
              ['SLA Breached',  stats.breached, '⚠️', '#ef4444'],
              ['Resolved',      stats.resolved, '✅', '#10b981'],
            ].map(([l,v,ic,c],i) => (
              <div key={l} style={{ background:'#111827', border:'1px solid #1f2d45', borderTop:`3px solid ${c}`, borderRadius:14, padding:'14px 18px', position:'relative', overflow:'hidden', animation:`fadeUp 0.4s ease ${i*0.07}s both` }}>
                <div style={{ fontSize:10, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px' }}>{l}</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, color:c, marginTop:5 }}>{loading?'—':v}</div>
                <div style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:24, opacity:0.07 }}>{ic}</div>
              </div>
            ))}
          </div>

          {/* Team breakdown */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
            {[
              ['L1 Support', stats.l1, '👤', '#3b82f6'],
              ['L2 Technical', stats.l2, '🛠️', '#8b5cf6'],
              ['Developer', stats.dev, '👨‍💻', '#f59e0b'],
            ].map(([l,v,ic,c]) => (
              <div key={l} style={{ background:'#111827', border:`1px solid ${c}33`, borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:42, height:42, borderRadius:10, background:c+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{ic}</div>
                <div>
                  <div style={{ fontSize:11, color:'#64748b' }}>{l} Tickets</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:c }}>{loading?'—':v}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters + search */}
          <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #1f2d45', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, marginRight:4 }}>📋 All Tickets</div>

              {/* Search */}
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="🔍 Search title or ticket number..."
                style={{ flex:1, minWidth:200, padding:'7px 12px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:8, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:'none' }}
              />

              {/* Team filter */}
              <div style={{ display:'flex', gap:6 }}>
                {[['ALL','All Teams'],['L1','L1'],['L2','L2'],['DEVELOPER','Dev']].map(([v,l]) => (
                  <button key={v} className={`ftab ${teamFilter===v?'on':''}`} onClick={()=>setTeamFilter(v)}>{l}</button>
                ))}
              </div>

              {/* Priority filter */}
              <div style={{ display:'flex', gap:6 }}>
                {[['ALL','All Prio'],['critical','Critical'],['high','High']].map(([v,l]) => (
                  <button key={v} className={`ftab ${prioFilter===v?'on':''}`} onClick={()=>setPrioFilter(v)}>{l}</button>
                ))}
              </div>
            </div>

            {/* Table header */}
            <div style={{ display:'grid', gridTemplateColumns:'120px 1fr 90px 90px 110px 100px', gap:12, padding:'10px 20px', borderBottom:'1px solid #1f2d45', fontSize:11, color:'#475569', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>
              <span>Ticket #</span><span>Title</span><span>Priority</span><span>Team</span><span>Status</span><span>Created</span>
            </div>

            {loading ? (
              <div style={{ padding:40, textAlign:'center' }}>
                <div style={{ width:32, height:32, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#3b82f6', animation:'spin 0.7s linear infinite', margin:'0 auto 10px' }}/>
                <div style={{ color:'#64748b', fontSize:13 }}>Loading all tickets...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding:40, textAlign:'center', color:'#64748b', fontSize:13 }}>No tickets match your filter</div>
            ) : filtered.slice(0,100).map((t, i) => {
              const pc = PC[t.priority] || '#3b82f6'
              const tc = TEAM_COLOR[t.assigned_team] || '#3b82f6'
              const sc = ST_COLOR[t.status] || '#3b82f6'
              const isBreached = t.sla_resolve_due && new Date(t.sla_resolve_due) < new Date() && !['resolved','closed'].includes(t.status)
              return (
                <div key={t.id} className="trow" onClick={() => router.push(`/tickets/${t.id}`)}
                  style={{ display:'grid', gridTemplateColumns:'120px 1fr 90px 90px 110px 100px', gap:12, padding:'12px 20px', borderBottom:'1px solid #0f172a', alignItems:'center', transition:'background 0.15s', background: isBreached ? 'rgba(239,68,68,0.03)' : 'transparent' }}>
                  <span style={{ fontFamily:"'Consolas',monospace", fontSize:12, color:'#94a3b8' }}>
                    {t.ticket_number}
                    {isBreached && <span style={{ display:'block', fontSize:10, color:'#ef4444' }}>⚠️ SLA</span>}
                  </span>
                  <span style={{ fontSize:13, fontWeight:500, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:pc }}>{t.priority?.toUpperCase()}</span>
                  <span style={{ fontSize:11, color:tc, fontWeight:600 }}>{TEAM_LABEL[t.assigned_team]?.split(' ')[0] || t.assigned_team}</span>
                  <span style={{ fontSize:11, fontWeight:600, color:sc, padding:'2px 8px', borderRadius:20, background:sc+'20', whiteSpace:'nowrap', textAlign:'center' }}>
                    {t.status?.replace('_',' ')}
                  </span>
                  <span style={{ fontSize:11, color:'#64748b' }}>{ago(t.created_at)}</span>
                </div>
              )
            })}

            {filtered.length > 100 && (
              <div style={{ padding:'12px 20px', textAlign:'center', fontSize:12, color:'#64748b', borderTop:'1px solid #1f2d45' }}>
                Showing 100 of {filtered.length} tickets — use filters to narrow down
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
