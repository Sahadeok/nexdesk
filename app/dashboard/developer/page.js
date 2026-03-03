'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getProfile } from '../../../lib/supabase'
import Topbar from '../../../components/Topbar'

const PC = { critical:'#ef4444', high:'#f59e0b', medium:'#3b82f6', low:'#10b981' }

function ago(d) {
  const diff = Date.now() - new Date(d)
  const m = Math.floor(diff/60000), h = Math.floor(m/60), dy = Math.floor(h/24)
  return dy>0 ? dy+'d ago' : h>0 ? h+'h ago' : m>0 ? m+'m ago' : 'just now'
}

function PriorityBadge({ p }) {
  const labels = { critical:'🔴 P1 — Critical', high:'🟡 P2 — High', medium:'🟢 P3 — Medium', low:'⚪ P4 — Low' }
  return (
    <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:PC[p]+'20', color:PC[p], fontWeight:700, border:`1px solid ${PC[p]}40` }}>
      {labels[p] || p}
    </span>
  )
}

export default function DeveloperDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('active')

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const p = await getProfile(sb, user.id)
      setProfile(p)
      if (p?.role_code === 'END_USER') { router.replace('/dashboard/user'); return }
      const { data } = await sb.from('tickets')
        .select('*')
        .or('assigned_team.eq.DEVELOPER,is_code_bug.eq.true')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
      setTickets(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const active   = tickets.filter(t => !['resolved','closed'].includes(t.status))
  const resolved = tickets.filter(t =>  ['resolved','closed'].includes(t.status))
  const filtered = filter === 'active' ? active : resolved

  async function updateStatus(id, status) {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    await sb.from('tickets').update({ status, updated_at: new Date().toISOString(), ...(status==='resolved'?{resolved_at:new Date().toISOString()}:{}) }).eq('id', id)
    await sb.from('ticket_history').insert({ ticket_id:id, changed_by:user.id, action:'Developer: Status Updated', new_value:status })
    setTickets(prev => prev.map(t => t.id===id ? {...t, status} : t))
  }

  return (
    <>
      <style>{`
        *{box-sizing:border-box}body{margin:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .tcard{background:#111827;border:1px solid #1f2d45;border-radius:14px;padding:20px;transition:all 0.2s;animation:fadeUp 0.3s ease both}
        .tcard:hover{border-color:rgba(245,158,11,0.4);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.3)}
        .ftab{padding:7px 16px;border-radius:8px;border:1px solid transparent;background:transparent;color:#64748b;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;transition:all 0.2s}
        .ftab.on{background:rgba(245,158,11,0.1);color:#f59e0b;border-color:rgba(245,158,11,0.3)}
        .abtn{padding:7px 14px;border-radius:8px;border:1px solid;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s}
        .abtn:hover{transform:translateY(-1px)}
        .code-block{background:#0f172a;border:1px solid #1f2d45;border-radius:8px;padding:12px 14px;font-family:'Consolas',monospace;font-size:12px;color:#94a3b8;overflow-x:auto;white-space:pre-wrap;word-break:break-word;line-height:1.6}
      `}</style>

      <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
        <Topbar profile={profile} title="Developer Queue" subtitle="Code bugs, API issues, technical fixes" />

        <div style={{ maxWidth:1000, margin:'0 auto', padding:'28px 20px' }}>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
            {[
              ['All Dev Tickets', tickets.length,        '🐛', '#f59e0b'],
              ['Active / Open',   active.length,         '⚡', '#ef4444'],
              ['P1 Critical',     tickets.filter(t=>t.priority==='critical').length, '🔴', '#ef4444'],
              ['Resolved',        resolved.length,       '✅', '#10b981'],
            ].map(([l,v,ic,c],i) => (
              <div key={l} style={{ background:'#111827', border:'1px solid #1f2d45', borderTop:`3px solid ${c}`, borderRadius:14, padding:'16px 18px', position:'relative', overflow:'hidden', animation:`fadeUp 0.4s ease ${i*0.08}s both` }}>
                <div style={{ fontSize:10, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px' }}>{l}</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, color:c, marginTop:6 }}>{loading?'—':v}</div>
                <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:26, opacity:0.08 }}>{ic}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700 }}>👨‍💻 Developer Ticket Queue</div>
            <div style={{ display:'flex', gap:6 }}>
              {[['active',`Active (${active.length})`],['resolved',`Resolved (${resolved.length})`]].map(([v,l])=>(
                <button key={v} className={`ftab ${filter===v?'on':''}`} onClick={()=>setFilter(v)}>{l}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:48 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#f59e0b', animation:'spin 0.7s linear infinite', margin:'0 auto 12px' }}/>
              <div style={{ color:'#64748b' }}>Loading developer queue...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:56, background:'#111827', borderRadius:14, border:'1px solid #1f2d45' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
              <div style={{ color:'#94a3b8' }}>{filter==='active' ? 'No active code bugs — clean codebase!' : 'No resolved bugs yet'}</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {filtered.map((t, i) => (
                <div key={t.id} className="tcard" style={{ animationDelay: i*0.06+'s', borderLeft:`4px solid ${PC[t.priority]||'#f59e0b'}` }}>

                  {/* Header */}
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
                        <PriorityBadge p={t.priority} />
                        <span style={{ fontFamily:"'Consolas',monospace", fontSize:12, color:'#64748b' }}>{t.ticket_number}</span>
                        <span style={{ fontSize:11, color:'#64748b' }}>{ago(t.created_at)}</span>
                        {t.is_code_bug && (
                          <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.3)', fontWeight:600 }}>
                            🐛 Code Bug Confirmed
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, margin:0, color:'#e2e8f0' }}>{t.title}</h3>
                    </div>
                    <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background: ['resolved','closed'].includes(t.status)?'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)', color:['resolved','closed'].includes(t.status)?'#10b981':'#f59e0b', fontWeight:600, whiteSpace:'nowrap', marginLeft:12 }}>
                      {t.status?.replace('_',' ')}
                    </span>
                  </div>

                  {/* Description */}
                  {t.description && (
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.5px' }}>📋 Issue Description</div>
                      <div style={{ fontSize:13, color:'#94a3b8', lineHeight:1.6, padding:'10px 14px', background:'rgba(255,255,255,0.02)', borderRadius:8, border:'1px solid #1f2d45' }}>
                        {t.description}
                      </div>
                    </div>
                  )}

                  {/* AI Analysis & Suggestion */}
                  {t.ai_suggestion && (
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.5px' }}>🤖 AI Analysis & Suggested Fix</div>
                      <div className="code-block">{t.ai_suggestion}</div>
                    </div>
                  )}

                  {/* Routing Reason */}
                  {t.routing_reason && (
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.5px' }}>🔍 Why Assigned to Developer</div>
                      <div style={{ fontSize:12, color:'#94a3b8', padding:'8px 12px', background:'rgba(245,158,11,0.05)', borderRadius:8, border:'1px solid rgba(245,158,11,0.2)' }}>
                        {t.routing_reason}
                      </div>
                    </div>
                  )}

                  {/* AI Confidence */}
                  <div style={{ display:'flex', gap:12, marginBottom:14, flexWrap:'wrap' }}>
                    {t.ai_confidence && (
                      <div style={{ padding:'6px 12px', background:'rgba(16,185,129,0.08)', borderRadius:8, border:'1px solid rgba(16,185,129,0.2)', fontSize:12 }}>
                        <span style={{ color:'#64748b' }}>AI Confidence: </span>
                        <span style={{ color:'#10b981', fontWeight:700 }}>{t.ai_confidence}%</span>
                      </div>
                    )}
                    <div style={{ padding:'6px 12px', background:'rgba(59,130,246,0.08)', borderRadius:8, border:'1px solid rgba(59,130,246,0.2)', fontSize:12 }}>
                      <span style={{ color:'#64748b' }}>Category: </span>
                      <span style={{ color:'#3b82f6', fontWeight:600 }}>{t.category_code || 'APP_BUG'}</span>
                    </div>
                    {t.sla_resolve_due && (
                      <div style={{ padding:'6px 12px', background:'rgba(239,68,68,0.08)', borderRadius:8, border:'1px solid rgba(239,68,68,0.2)', fontSize:12 }}>
                        <span style={{ color:'#64748b' }}>SLA Deadline: </span>
                        <span style={{ color: new Date(t.sla_resolve_due) < new Date() ? '#ef4444' : '#f59e0b', fontWeight:600 }}>
                          {new Date(t.sla_resolve_due) < new Date() ? '⚠️ BREACHED' : new Date(t.sla_resolve_due).toLocaleString('en-IN', { timeZone:'Asia/Kolkata', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {!['resolved','closed'].includes(t.status) && (
                    <div style={{ display:'flex', gap:8, paddingTop:14, borderTop:'1px solid #1f2d45', flexWrap:'wrap' }}>
                      {t.status === 'open' && (
                        <button className="abtn" onClick={() => updateStatus(t.id, 'in_progress')}
                          style={{ background:'rgba(245,158,11,0.1)', borderColor:'rgba(245,158,11,0.4)', color:'#f59e0b' }}>
                          ▶ Start Working on Fix
                        </button>
                      )}
                      {t.status === 'in_progress' && (
                        <button className="abtn" onClick={() => updateStatus(t.id, 'resolved')}
                          style={{ background:'rgba(16,185,129,0.1)', borderColor:'rgba(16,185,129,0.4)', color:'#10b981' }}>
                          ✅ Mark Fix Deployed
                        </button>
                      )}
                      <button className="abtn" onClick={() => router.push(`/tickets/${t.id}`)}
                        style={{ background:'rgba(59,130,246,0.1)', borderColor:'rgba(59,130,246,0.4)', color:'#3b82f6' }}>
                        👁 Full Ticket Details
                      </button>
                    </div>
                  )}
                  {['resolved','closed'].includes(t.status) && (
                    <div style={{ paddingTop:14, borderTop:'1px solid #1f2d45' }}>
                      <button className="abtn" onClick={() => router.push(`/tickets/${t.id}`)}
                        style={{ background:'rgba(59,130,246,0.1)', borderColor:'rgba(59,130,246,0.4)', color:'#3b82f6' }}>
                        👁 View Details
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
