'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

function getSupabase() { return createClient() }

const STATUS_OPTIONS   = ['open','in_progress','pending_user','resolved','closed']
const TEAM_OPTIONS     = ['L1','L2','DEVELOPER']
const PRIORITY_OPTIONS = ['critical','high','medium','low']

const STATUS_COLOR  = { open:{bg:'#1e3a5f',c:'#60a5fa'}, in_progress:{bg:'#451a03',c:'#fbbf24'}, pending_user:{bg:'#2e1065',c:'#a78bfa'}, resolved:{bg:'#052e16',c:'#34d399'}, closed:{bg:'#1f2d45',c:'#475569'} }
const PRIORITY_COLOR= { critical:{bg:'#450a0a',c:'#ef4444'}, high:{bg:'#431407',c:'#f97316'}, medium:{bg:'#451a03',c:'#fbbf24'}, low:{bg:'#052e16',c:'#10b981'} }
const TEAM_COLOR    = { L1:{bg:'#1e3a5f',c:'#60a5fa'}, L2:{bg:'#2e1065',c:'#a78bfa'}, DEVELOPER:{bg:'#083344',c:'#06b6d4'} }

export default function BulkActions() {
  const router   = useRouter()
  const supabase = getSupabase()

  const [tickets,   setTickets]   = useState([])
  const [selected,  setSelected]  = useState(new Set())
  const [loading,   setLoading]   = useState(true)
  const [applying,  setApplying]  = useState(false)
  const [msg,       setMsg]       = useState('')
  const [search,    setSearch]    = useState('')
  const [filterStatus,   setFilterStatus]   = useState('all')
  const [filterTeam,     setFilterTeam]     = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')

  // Bulk action state
  const [bulkAction,   setBulkAction]   = useState('')
  const [bulkStatus,   setBulkStatus]   = useState('resolved')
  const [bulkTeam,     setBulkTeam]     = useState('L2')
  const [bulkPriority, setBulkPriority] = useState('high')
  const [showConfirm,  setShowConfirm]  = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    if (!['ADMIN','IT_MANAGER'].includes(p?.role)) { router.replace('/dashboard'); return }
    await loadTickets()
    setLoading(false)
  }

  async function loadTickets() {
    const { data } = await supabase
      .from('tickets')
      .select('id, ticket_number, title, status, priority, assigned_team, sla_resolve_due, created_at, created_by')
      .not('status', 'in', '("closed")')
      .order('created_at', { ascending: false })
    if (data) setTickets(data)
  }

  // Select / deselect
  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(t => t.id)))
    }
  }

  function selectByFilter(key, val) {
    const ids = filtered.filter(t => t[key] === val).map(t => t.id)
    setSelected(new Set(ids))
  }

  // Apply bulk action
  async function applyBulkAction() {
    if (!bulkAction || selected.size === 0) return
    setApplying(true); setShowConfirm(false)
    const ids = [...selected]

    try {
      let update = {}
      if (bulkAction === 'status')   update = { status: bulkStatus, updated_at: new Date().toISOString() }
      if (bulkAction === 'team')     update = { assigned_team: bulkTeam, updated_at: new Date().toISOString() }
      if (bulkAction === 'priority') update = { priority: bulkPriority, updated_at: new Date().toISOString() }
      if (bulkAction === 'close')    update = { status: 'closed', updated_at: new Date().toISOString() }
      if (bulkAction === 'resolve')  update = { status: 'resolved', updated_at: new Date().toISOString() }

      const { error } = await supabase.from('tickets').update(update).in('id', ids)
      if (error) throw error

      setMsg(`✅ ${ids.length} tickets updated successfully!`)
      setSelected(new Set())
      setBulkAction('')
      await loadTickets()
    } catch(e) {
      setMsg('❌ ' + e.message)
    }
    setApplying(false)
    setTimeout(() => setMsg(''), 4000)
  }

  // Export selected to CSV
  function exportCSV() {
    const rows = tickets.filter(t => selected.has(t.id))
    if (!rows.length) return
    const headers = ['Ticket #','Title','Status','Priority','Team','Created']
    const csv = [
      headers.join(','),
      ...rows.map(t => [
        t.ticket_number,
        `"${(t.title||'').replace(/"/g,'""')}"`,
        t.status,
        t.priority,
        t.assigned_team,
        new Date(t.created_at).toLocaleDateString('en-IN')
      ].join(','))
    ].join('\n')
    const blob = new Blob([csv], { type:'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `nexdesk-tickets-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setMsg(`✅ Exported ${rows.length} tickets to CSV!`)
    setTimeout(() => setMsg(''), 3000)
  }

  // Filter tickets
  const filtered = tickets.filter(t => {
    const s = search.toLowerCase()
    const matchSearch = !search || t.ticket_number?.toLowerCase().includes(s) || t.title?.toLowerCase().includes(s)
    const matchStatus   = filterStatus   === 'all' || t.status        === filterStatus
    const matchTeam     = filterTeam     === 'all' || t.assigned_team === filterTeam
    const matchPriority = filterPriority === 'all' || t.priority      === filterPriority
    return matchSearch && matchStatus && matchTeam && matchPriority
  })

  const allSelected = filtered.length > 0 && selected.size === filtered.length
  const someSelected = selected.size > 0

  // Stats on selected
  const selectedTickets = tickets.filter(t => selected.has(t.id))
  const selByTeam     = TEAM_OPTIONS.map(t => ({ t, count: selectedTickets.filter(x=>x.assigned_team===t).length }))
  const selByPriority = PRIORITY_OPTIONS.map(p => ({ p, count: selectedTickets.filter(x=>x.priority===p).length }))

  if (loading) return <Loader />

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .trow:hover   { background:#0f172a!important; }
        .inp:focus    { border-color:#3b82f6!important; outline:none; }
        .qbtn:hover   { opacity:0.8!important; }
        .chk:hover    { border-color:#3b82f6!important; }
      `}</style>

      <GlobalNav title="Bulk Actions" />

      <div style={{ maxWidth:1400, margin:'0 auto', padding:'28px 24px' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:4 }}>⚡ Bulk Actions</h1>
            <p style={{ color:'#64748b', fontSize:13 }}>Select multiple tickets and update status, team, priority or export at once</p>
          </div>
          <button onClick={loadTickets} style={{ padding:'9px 16px', background:'transparent', border:'1px solid #1f2d45', borderRadius:10, color:'#64748b', cursor:'pointer', fontSize:13 }}>🔄 Refresh</button>
        </div>

        {msg && (
          <div style={{ padding:'12px 18px', borderRadius:10, marginBottom:16, background:msg.startsWith('✅')?'#052e16':'#450a0a', color:msg.startsWith('✅')?'#34d399':'#fca5a5', fontSize:13, animation:'fadeUp 0.3s ease' }}>
            {msg}
          </div>
        )}

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            ['📋','Total Tickets',   tickets.length,   '#3b82f6','#1e3a5f'],
            ['✅','Filtered',         filtered.length,  '#06b6d4','#083344'],
            ['☑️','Selected',         selected.size,    '#fbbf24','#451a03'],
            ['📊','Ready to Action',  selected.size,    '#10b981','#052e16'],
          ].map(([icon,label,val,color,bg],i) => (
            <div key={label} style={{ background:'#111827', border:`1px solid ${color}30`, borderRadius:14, padding:'14px 18px', animation:`fadeUp 0.4s ${i*0.05}s ease both` }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{icon}</div>
              <div style={{ fontSize:22, fontWeight:700, color, fontFamily:"'Syne',sans-serif" }}>{val}</div>
              <div style={{ fontSize:11, color:'#64748b', marginTop:1 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'start' }}>

          {/* ── Ticket List ── */}
          <div>
            {/* Filters */}
            <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
              <input className="inp" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Search tickets..."
                style={{ flex:1, minWidth:180, padding:'8px 12px', background:'#111827', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:12 }}/>
              {[
                { label:'Status', val:filterStatus, set:setFilterStatus, opts:['all',...STATUS_OPTIONS] },
                { label:'Team',   val:filterTeam,   set:setFilterTeam,   opts:['all',...TEAM_OPTIONS] },
                { label:'Priority',val:filterPriority,set:setFilterPriority,opts:['all',...PRIORITY_OPTIONS] },
              ].map(f => (
                <select key={f.label} value={f.val} onChange={e => f.set(e.target.value)}
                  style={{ padding:'8px 10px', background:'#111827', border:'1px solid #1f2d45', borderRadius:9, color:'#64748b', fontFamily:"'DM Sans',sans-serif", fontSize:12, outline:'none', cursor:'pointer' }}>
                  {f.opts.map(o => <option key={o} value={o}>{o === 'all' ? `All ${f.label}` : o}</option>)}
                </select>
              ))}
            </div>

            {/* Quick select buttons */}
            <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, color:'#475569', padding:'6px 0', alignSelf:'center' }}>Quick select:</span>
              {['L1','L2','DEVELOPER'].map(t => (
                <button key={t} className="qbtn" onClick={() => selectByFilter('assigned_team', t)}
                  style={{ padding:'5px 10px', borderRadius:6, fontSize:11, cursor:'pointer', border:'1px solid', background:TEAM_COLOR[t].bg, color:TEAM_COLOR[t].c, borderColor:TEAM_COLOR[t].c+'40', transition:'opacity 0.2s' }}>
                  {t} ({tickets.filter(x=>x.assigned_team===t).length})
                </button>
              ))}
              {['critical','high'].map(p => (
                <button key={p} className="qbtn" onClick={() => selectByFilter('priority', p)}
                  style={{ padding:'5px 10px', borderRadius:6, fontSize:11, cursor:'pointer', border:'1px solid', background:PRIORITY_COLOR[p].bg, color:PRIORITY_COLOR[p].c, borderColor:PRIORITY_COLOR[p].c+'40', transition:'opacity 0.2s' }}>
                  {p} ({tickets.filter(x=>x.priority===p).length})
                </button>
              ))}
              {someSelected && (
                <button className="qbtn" onClick={() => setSelected(new Set())}
                  style={{ padding:'5px 10px', borderRadius:6, fontSize:11, cursor:'pointer', border:'1px solid #334155', background:'transparent', color:'#475569', transition:'opacity 0.2s', marginLeft:'auto' }}>
                  ✕ Clear ({selected.size})
                </button>
              )}
            </div>

            {/* Table */}
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #1f2d45', display:'flex', alignItems:'center', gap:12 }}>
                {/* Select all checkbox */}
                <div className="chk" onClick={selectAll}
                  style={{ width:18, height:18, borderRadius:5, border:`2px solid ${allSelected?'#3b82f6':'#334155'}`, background:allSelected?'#3b82f6':'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
                  {allSelected && <span style={{ color:'#fff', fontSize:11 }}>✓</span>}
                  {!allSelected && selected.size > 0 && <span style={{ color:'#3b82f6', fontSize:14, lineHeight:1 }}>−</span>}
                </div>
                <span style={{ fontSize:13, fontWeight:600, color:'#475569' }}>
                  {someSelected ? `${selected.size} selected` : `${filtered.length} tickets`}
                </span>
              </div>

              <div style={{ maxHeight:480, overflowY:'auto' }}>
                {filtered.length === 0 ? (
                  <div style={{ padding:32, textAlign:'center', color:'#475569' }}>No tickets found</div>
                ) : (
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <tbody>
                      {filtered.map(t => {
                        const isSel = selected.has(t.id)
                        const sc = STATUS_COLOR[t.status]   || STATUS_COLOR.open
                        const pc = PRIORITY_COLOR[t.priority] || PRIORITY_COLOR.medium
                        const tc = TEAM_COLOR[t.assigned_team] || TEAM_COLOR.L1
                        const now = new Date()
                        const slaMs = t.sla_resolve_due ? new Date(t.sla_resolve_due) - now : null
                        const slaBreached = slaMs !== null && slaMs < 0
                        return (
                          <tr key={t.id} className="trow"
                            style={{ borderTop:'1px solid #0f172a', background:isSel?'#0f1a2e':'transparent', transition:'background 0.15s', cursor:'pointer' }}
                            onClick={() => toggleSelect(t.id)}>
                            <td style={{ padding:'10px 16px', width:40 }}>
                              <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${isSel?'#3b82f6':'#334155'}`, background:isSel?'#3b82f6':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
                                {isSel && <span style={{ color:'#fff', fontSize:11 }}>✓</span>}
                              </div>
                            </td>
                            <td style={{ padding:'10px 8px', whiteSpace:'nowrap' }}>
                              <span style={{ fontSize:11, fontWeight:700, color:'#60a5fa', fontFamily:'monospace' }}>{t.ticket_number}</span>
                            </td>
                            <td style={{ padding:'10px 8px', maxWidth:260 }}>
                              <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                            </td>
                            <td style={{ padding:'10px 8px', whiteSpace:'nowrap' }}>
                              <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:5, background:sc.bg, color:sc.c }}>{t.status?.replace('_',' ')}</span>
                            </td>
                            <td style={{ padding:'10px 8px', whiteSpace:'nowrap' }}>
                              <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:5, background:pc.bg, color:pc.c }}>{t.priority}</span>
                            </td>
                            <td style={{ padding:'10px 8px', whiteSpace:'nowrap' }}>
                              <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:5, background:tc.bg, color:tc.c }}>{t.assigned_team}</span>
                            </td>
                            <td style={{ padding:'10px 8px', whiteSpace:'nowrap' }}>
                              {slaBreached ? (
                                <span style={{ fontSize:10, fontWeight:600, color:'#ef4444' }}>BREACHED</span>
                              ) : (
                                <span style={{ fontSize:10, color:'#475569' }}>{new Date(t.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span>
                              )}
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

          {/* ── Action Panel ── */}
          <div style={{ position:'sticky', top:80 }}>
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'20px', marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Syne',sans-serif", marginBottom:16 }}>
                ⚡ Bulk Action
                {someSelected && <span style={{ fontSize:11, fontWeight:400, color:'#3b82f6', marginLeft:8 }}>({selected.size} selected)</span>}
              </div>

              {!someSelected ? (
                <div style={{ padding:'20px 0', textAlign:'center' }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>☑️</div>
                  <p style={{ fontSize:12, color:'#475569' }}>Select tickets from the list to perform bulk actions</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {/* Action selector */}
                  <div>
                    <label style={{ fontSize:11, color:'#475569', fontWeight:600, display:'block', marginBottom:6 }}>Choose Action</label>
                    <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
                      style={{ width:'100%', padding:'9px 12px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:bulkAction?'#e2e8f0':'#475569', fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:'none', cursor:'pointer' }}>
                      <option value=''>Select action...</option>
                      <option value='status'>🔄 Change Status</option>
                      <option value='team'>👥 Reassign Team</option>
                      <option value='priority'>🎯 Change Priority</option>
                      <option value='resolve'>✅ Mark Resolved</option>
                      <option value='close'>🔒 Close Tickets</option>
                    </select>
                  </div>

                  {/* Sub-options */}
                  {bulkAction === 'status' && (
                    <div>
                      <label style={{ fontSize:11, color:'#475569', fontWeight:600, display:'block', marginBottom:6 }}>New Status</label>
                      <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
                        style={{ width:'100%', padding:'9px 12px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:'none' }}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                      </select>
                    </div>
                  )}

                  {bulkAction === 'team' && (
                    <div>
                      <label style={{ fontSize:11, color:'#475569', fontWeight:600, display:'block', marginBottom:6 }}>Assign To Team</label>
                      <div style={{ display:'flex', gap:6 }}>
                        {TEAM_OPTIONS.map(t => (
                          <button key={t} onClick={() => setBulkTeam(t)}
                            style={{ flex:1, padding:'8px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', border:`1px solid ${TEAM_COLOR[t].c}40`, background:bulkTeam===t?TEAM_COLOR[t].bg:'transparent', color:bulkTeam===t?TEAM_COLOR[t].c:'#475569', transition:'all 0.15s' }}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {bulkAction === 'priority' && (
                    <div>
                      <label style={{ fontSize:11, color:'#475569', fontWeight:600, display:'block', marginBottom:6 }}>New Priority</label>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {PRIORITY_OPTIONS.map(p => (
                          <button key={p} onClick={() => setBulkPriority(p)}
                            style={{ flex:1, padding:'8px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', border:`1px solid ${PRIORITY_COLOR[p].c}40`, background:bulkPriority===p?PRIORITY_COLOR[p].bg:'transparent', color:bulkPriority===p?PRIORITY_COLOR[p].c:'#475569', transition:'all 0.15s' }}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Apply button */}
                  {bulkAction && (
                    <button onClick={() => setShowConfirm(true)} disabled={applying}
                      style={{ padding:'12px', background:'linear-gradient(135deg,#2563eb,#3b82f6)', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:14, fontWeight:700, marginTop:4, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      {applying
                        ? <><div style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', animation:'spin 0.7s linear infinite' }}/>Applying...</>
                        : `⚡ Apply to ${selected.size} Tickets`}
                    </button>
                  )}

                  {/* Export button */}
                  <button onClick={exportCSV}
                    style={{ padding:'10px', background:'#052e16', border:'1px solid #10b98130', borderRadius:10, color:'#34d399', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                    📥 Export {selected.size} to CSV
                  </button>
                </div>
              )}
            </div>

            {/* Selection breakdown */}
            {someSelected && (
              <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, padding:'16px 18px', animation:'fadeUp 0.3s ease' }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#475569', textTransform:'uppercase', marginBottom:12 }}>Selection Breakdown</div>
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:11, color:'#334155', marginBottom:6 }}>By Team</div>
                  {selByTeam.filter(x=>x.count>0).map(({t,count}) => (
                    <div key={t} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:12, color:TEAM_COLOR[t].c }}>{t}</span>
                      <span style={{ fontSize:12, color:'#64748b' }}>{count}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize:11, color:'#334155', marginBottom:6 }}>By Priority</div>
                  {selByPriority.filter(x=>x.count>0).map(({p,count}) => (
                    <div key={p} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:12, color:PRIORITY_COLOR[p].c, textTransform:'capitalize' }}>{p}</span>
                      <span style={{ fontSize:12, color:'#64748b' }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, animation:'fadeIn 0.2s' }}>
          <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'28px 32px', width:400, textAlign:'center' }}>
            <div style={{ fontSize:44, marginBottom:12 }}>⚡</div>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, marginBottom:8 }}>Confirm Bulk Action</h3>
            <p style={{ color:'#64748b', fontSize:13, marginBottom:8 }}>
              You are about to update <strong style={{ color:'#e2e8f0' }}>{selected.size} tickets</strong>
            </p>
            <p style={{ color:'#fbbf24', fontSize:13, marginBottom:22 }}>
              Action: <strong>{bulkAction}</strong>
              {bulkAction==='status' && ` → ${bulkStatus}`}
              {bulkAction==='team'   && ` → ${bulkTeam}`}
              {bulkAction==='priority' && ` → ${bulkPriority}`}
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={applyBulkAction}
                style={{ flex:1, padding:'12px', background:'linear-gradient(135deg,#2563eb,#3b82f6)', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontWeight:700, fontSize:14 }}>
                ✅ Confirm
              </button>
              <button onClick={() => setShowConfirm(false)}
                style={{ flex:1, padding:'12px', background:'transparent', border:'1px solid #1f2d45', borderRadius:10, color:'#64748b', cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Loader() {
  return <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#3b82f6', animation:'spin 0.7s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}
