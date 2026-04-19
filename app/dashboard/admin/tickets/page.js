'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../../lib/supabase'
import { STATUS_CONFIG, PRIORITY_CONFIG, getSLAStatus } from '../../../../lib/ticketRouter'
import GlobalNav from '../../../components/GlobalNav'

const PRIO_STYLE = {
  critical: { color:'#dc2626', bg:'#fef2f2', label:'Critical' },
  high:     { color:'#d97706', bg:'#fffbeb', label:'High'     },
  medium:   { color:'#ca8a04', bg:'#fefce8', label:'Medium'   },
  low:      { color:'#16a34a', bg:'#f0fdf4', label:'Low'      },
}

const STAT_STYLE = {
  open:         { color:'#2563eb', bg:'#eff6ff', label:'Open'         },
  in_progress:  { color:'#7c3aed', bg:'#f5f3ff', label:'In Progress'  },
  escalated:    { color:'#d97706', bg:'#fffbeb', label:'Escalated'    },
  pending_user: { color:'#0891b2', bg:'#ecfeff', label:'Pending User' },
  resolved:     { color:'#16a34a', bg:'#f0fdf4', label:'Resolved'     },
  closed:       { color:'#6b7280', bg:'#f9fafb', label:'Closed'       },
}

export default function AdminTickets() {
  const router   = useRouter()
  const supabase = createClient()
  const [tickets, setTickets] = useState([])
  const [tab,     setTab]     = useState('all')
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    if (!['SUPER_ADMIN','ADMIN','IT_MANAGER'].includes(p?.role)) { router.replace('/dashboard'); return }
    await loadTickets()
    setLoading(false)
  }

  async function loadTickets() {
    const { data } = await supabase
      .from('tickets')
      .select('id, ticket_number, title, status, priority, assigned_team, escalated_to_l2, sla_resolve_due, created_at, resolved_at, categories(name, icon)')
      .order('created_at', { ascending: false })
    if (data) setTickets(data)
  }

  const active   = tickets.filter(t => !['resolved','closed'].includes(t.status))
  const resolved = tickets.filter(t =>  ['resolved','closed'].includes(t.status))
  const l1T      = active.filter(t => t.assigned_team === 'L1')
  const l2T      = active.filter(t => t.assigned_team === 'L2')
  const devT     = active.filter(t => t.assigned_team === 'DEVELOPER')
  const escT     = active.filter(t => t.escalated_to_l2)
  const breached = active.filter(t => getSLAStatus(t.sla_resolve_due, t.status, t.created_at, t.priority).label.includes('BREACHED'))
  const critical = active.filter(t => t.priority === 'critical')

  const base  = tab==='l1'?l1T:tab==='l2'?l2T:tab==='developer'?devT:tab==='escalated'?escT:tab==='breached'?breached:tab==='critical'?critical:tab==='resolved'?resolved:active
  const shown = search.trim() ? base.filter(t => t.title?.toLowerCase().includes(search.toLowerCase()) || t.ticket_number?.toLowerCase().includes(search.toLowerCase())) : base

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:"'DM Sans',sans-serif", color:'#111827' }}>
      <GlobalNav title="Master Ticket Queue"/>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>Loading tickets...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:"'DM Sans',sans-serif", color:'#111827' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing:border-box; }
        .scard { background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:16px 20px; cursor:pointer; transition:all 0.2s; }
        .scard:hover { border-color:#d1d5db; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
        .scard.active { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,0.1); }
        .trow { border-bottom:1px solid #f3f4f6; cursor:pointer; transition:background 0.1s; }
        .trow:hover { background:#f8fafc; }
        .tab-btn { padding:7px 14px; border-radius:7px; font-size:13px; font-weight:500; cursor:pointer; border:none; background:transparent; color:#6b7280; font-family:'DM Sans',sans-serif; transition:all 0.15s; white-space:nowrap; }
        .tab-btn:hover { background:#f3f4f6; color:#374151; }
        .tab-btn.active { background:#eff6ff; color:#2563eb; font-weight:600; }
        .search-input { padding:8px 14px; background:#fff; border:1px solid #e5e7eb; border-radius:8px; color:#111827; font-size:13px; outline:none; font-family:'DM Sans',sans-serif; transition:border 0.15s; }
        .search-input:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,0.1); }
        .search-input::placeholder { color:#9ca3af; }
      `}} />

      <GlobalNav title="Master Ticket Queue"/>

      <div style={{ maxWidth:1500, margin:'0 auto', padding:'28px 24px' }}>
        
        {/* ── HEADER ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, margin:0, color:'#111827', letterSpacing:'-0.3px' }}>Master Ticket Queue</h1>
            <p style={{ color:'#6b7280', fontSize:13, margin:'4px 0 0' }}>Centralized view of all Active and Resolved tickets across your organization</p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => router.push('/dashboard/admin')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:8, color:'#475569', cursor:'pointer', fontSize:13, fontWeight:600 }}>
              ← Back to Admin Console
            </button>
            <button onClick={loadTickets}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, color:'#374151', cursor:'pointer', fontSize:13, fontWeight:500 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Refresh
            </button>
          </div>
        </div>

        {/* ── SLA BREACH ALERT ── */}
        {breached.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 18px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, marginBottom:20 }}>
            <span style={{ fontSize:18 }}>🚨</span>
            <span style={{ color:'#dc2626', fontSize:13, fontWeight:600 }}>{breached.length} SLA breach{breached.length>1?'es':''} require immediate attention</span>
            <button onClick={() => setTab('breached')}
              style={{ marginLeft:'auto', padding:'6px 14px', background:'#dc2626', border:'none', borderRadius:7, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit' }}>
              View SLA Breaches →
            </button>
          </div>
        )}

        {/* ── STATS CARDS ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:10, marginBottom:24 }}>
          {[
            { label:'All Active', val:active.length,   color:'#2563eb', filter:'all'       },
            { label:'L1',         val:l1T.length,      color:'#0891b2', filter:'l1'        },
            { label:'L2',         val:l2T.length,      color:'#7c3aed', filter:'l2'        },
            { label:'Dev',        val:devT.length,     color:'#059669', filter:'developer' },
            { label:'Escalated',  val:escT.length,     color:'#d97706', filter:'escalated' },
            { label:'Breached',   val:breached.length, color:'#dc2626', filter:'breached'  },
            { label:'Critical',   val:critical.length, color:'#dc2626', filter:'critical'  },
            { label:'Resolved',   val:resolved.length, color:'#16a34a', filter:'resolved'  },
          ].map((s,i) => (
            <div key={s.filter} className={`scard${tab===s.filter?' active':''}`}
              onClick={() => setTab(s.filter)}
              style={{ animation:`fadeUp 0.3s ${i*0.04}s ease both` }}>
              <div style={{ fontSize:24, fontWeight:800, color:s.color, letterSpacing:'-1px', fontVariantNumeric:'tabular-nums' }}>{s.val}</div>
              <div style={{ fontSize:11, color:'#6b7280', marginTop:3, fontWeight:500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── TICKET TABLE ── */}
        <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          {/* Table header */}
          <div style={{ padding:'14px 20px', borderBottom:'1px solid #f3f4f6', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <div style={{ display:'flex', gap:2, flex:1, flexWrap:'wrap' }}>
              {[
                ['all','All Active',active.length],
                ['l1','L1',l1T.length],
                ['l2','L2',l2T.length],
                ['developer','Dev',devT.length],
                ['escalated','Escalated',escT.length],
                ['breached','Breached',breached.length],
                ['critical','Critical',critical.length],
                ['resolved','Resolved',resolved.length],
              ].map(([val,label,count]) => (
                <button key={val} className={`tab-btn${tab===val?' active':''}`} onClick={() => setTab(val)}>
                  {label}
                  <span style={{ marginLeft:5, fontSize:11, padding:'1px 6px', borderRadius:10, background: tab===val ? 'rgba(37,99,235,0.1)' : '#f3f4f6', color: tab===val ? '#2563eb' : '#6b7280', fontWeight:600 }}>{count}</span>
                </button>
              ))}
            </div>
            <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search tickets..." style={{ width:200 }}/>
          </div>

          {/* Table Body */}
          {shown.length === 0 ? (
            <div style={{ padding:60, textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:12, opacity:0.3 }}>📭</div>
              <p style={{ color:'#9ca3af', fontSize:14 }}>No tickets in this view</p>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f9fafb' }}>
                  {['Ticket #','Title','Category','Priority','Status','Team','SLA','Date',''].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'1px solid #f3f4f6', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map(t => {
                  const sla     = getSLAStatus(t.sla_resolve_due, t.status, t.created_at, t.priority)
                  const prio    = PRIO_STYLE[t.priority]    || PRIO_STYLE.medium
                  const stat    = STAT_STYLE[t.status]      || STAT_STYLE.open
                  const isDone  = ['resolved','closed'].includes(t.status)
                  const teamClr = t.assigned_team==='DEVELOPER' ? '#059669' : t.assigned_team==='L2' ? '#7c3aed' : '#2563eb'
                  return (
                    <tr key={t.id} className="trow" onClick={() => router.push(`/tickets/${t.id}`)}>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:12, fontWeight:700, color: isDone ? '#9ca3af' : '#d97706', fontFamily:'monospace' }}>{t.ticket_number}</span>
                      </td>
                      <td style={{ padding:'12px 16px', maxWidth:240 }}>
                        <span style={{ fontSize:13, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color: isDone ? '#9ca3af' : '#111827' }}>{t.title}</span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:12, color:'#6b7280' }}>{t.categories?.icon} {t.categories?.name || '—'}</span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, background:prio.bg, color:prio.color }}>{prio.label}</span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:11, fontWeight:500, padding:'3px 10px', borderRadius:20, background:stat.bg, color:stat.color }}>{stat.label}</span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:12, fontWeight:600, color:teamClr }}>{t.assigned_team}</span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        {isDone
                          ? <span style={{ fontSize:12, color:'#16a34a', fontWeight:500 }}>✓ Done</span>
                          : <span style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:20, background:sla.bg, color:sla.color }}>{sla.icon} {sla.label}</span>
                        }
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:12, color:'#9ca3af' }}>{new Date(t.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}</span>
                      </td>
                      <td style={{ padding:'12px 16px' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => router.push(`/tickets/${t.id}`)}
                          style={{ padding:'5px 14px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:6, color:'#2563eb', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit' }}>
                          Open
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

