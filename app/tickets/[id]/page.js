'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import { STATUS_CONFIG, PRIORITY_CONFIG, getSLAStatus } from '../../../lib/ticketRouter'
import ForensicPilot from '../../../components/agents/ForensicPilot'

const CAN_ACTION = ['ADMIN','IT_MANAGER','L1_AGENT','L2_AGENT','DEVELOPER']

export default function TicketDetail() {
  const router   = useRouter()
  const params   = useParams()
  const ticketId = params?.id
  const supabase = createClient()

  const [ticket,     setTicket]     = useState(null)
  const [comments,   setComments]   = useState([])
  const [history,    setHistory]    = useState([])
  const [profile,    setProfile]    = useState(null)
  const [comment,    setComment]    = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [posting,    setPosting]    = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [action,     setAction]     = useState('')
  const [actionNote, setActionNote] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [msg,        setMsg]        = useState('')

  useEffect(() => { if (ticketId) init() }, [ticketId])

  async function init() {
    try {
      const { user, profile: p } = await getCurrentUserProfile(supabase)
      if (!user) { router.replace('/login'); return }
      setProfile(p)
      await Promise.all([loadTicket(), loadComments(), loadHistory()])
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  async function loadTicket() {
    const { data } = await supabase.from('tickets').select('*, categories(name,icon,code)').eq('id', ticketId).single()
    if (data) setTicket(data)
  }

  async function loadComments() {
    // Fetch comments WITHOUT profiles join (RLS on profiles blocks the join)
    const { data, error } = await supabase
      .from('ticket_comments')
      .select('id, ticket_id, user_id, comment_text, is_internal, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (error) { console.error('loadComments error:', error); return }
    const rows = data || []

    // Fetch profile names separately for each unique user_id
    const userIds = [...new Set(rows.map(c => c.user_id).filter(Boolean))]
    let profileMap = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('id', userIds)
      ;(profiles || []).forEach(p => { profileMap[p.id] = p })
    }

    // Attach profile to each comment
    const enriched = rows.map(c => ({ ...c, profiles: profileMap[c.user_id] || null }))
    setComments(enriched)
  }

  async function loadHistory() {
    const { data } = await supabase.from('ticket_history').select('*').eq('ticket_id', ticketId).order('changed_at', { ascending: false })
    setHistory(data || [])
  }

  async function postComment(e) {
    e.preventDefault()
    if (!comment.trim()) return
    setPosting(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('ticket_comments').insert({ ticket_id:ticketId, user_id:user.id, comment_text:comment.trim(), is_internal:isInternal })
    await supabase.from('ticket_history').insert({ ticket_id:ticketId, changed_by:user.id, field_changed:'comment', note: isInternal?'🔒 Internal note added':'💬 Comment added' })
    setComment(''); setIsInternal(false)
    await loadComments(); await loadHistory()
    setPosting(false)
  }

  async function updateStatus(newStatus, note) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('tickets').update({ status:newStatus, updated_at:new Date().toISOString() }).eq('id', ticketId)
    await supabase.from('ticket_history').insert({ ticket_id:ticketId, changed_by:user.id, field_changed:'status', old_value:ticket.status, new_value:newStatus, note })
    await loadTicket(); await loadHistory()
    setMsg(`✅ Status updated to: ${newStatus.replace('_',' ').toUpperCase()}`)
    setSaving(false)
  }

  async function doAction() {
    if (!actionNote.trim() && !['resolve'].includes(action)) { setMsg('⚠️ Please enter a reason.'); return }
    setSaving(true); setMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    try {
      if (action === 'escalate') {
        await supabase.from('tickets').update({ assigned_team:'L2', escalated_to_l2:true, escalation_reason:actionNote, status:'escalated', updated_at:new Date().toISOString() }).eq('id', ticketId)
        await supabase.from('ticket_history').insert({ ticket_id:ticketId, changed_by:user.id, field_changed:'assigned_team', old_value:'L1', new_value:'L2', note:'🔺 Escalated to L2: '+actionNote })
        setMsg('✅ Ticket escalated to L2!')
      } else if (action === 'resolve') {
        const note = actionNote.trim() || 'Issue resolved'
        await supabase.from('tickets').update({ status:'resolved', resolution_notes:note, resolved_at:new Date().toISOString(), updated_at:new Date().toISOString() }).eq('id', ticketId)
        await supabase.from('ticket_history').insert({ ticket_id:ticketId, changed_by:user.id, field_changed:'status', old_value:ticket.status, new_value:'resolved', note:'✅ Resolved: '+note })
        setMsg('✅ Ticket resolved!')
      } else if (action === 'assign_dev') {
        await supabase.from('tickets').update({ assigned_team:'DEVELOPER', assigned_dev_reason:actionNote, status:'in_progress', updated_at:new Date().toISOString() }).eq('id', ticketId)
        await supabase.from('ticket_history').insert({ ticket_id:ticketId, changed_by:user.id, field_changed:'assigned_team', old_value:ticket.assigned_team, new_value:'DEVELOPER', note:'👨‍💻 Assigned to developer: '+actionNote })
        setMsg('✅ Assigned to Developer!')
      } else if (action === 'reassign_l2') {
        // Dev sends back to L2
        await supabase.from('tickets').update({ assigned_team:'L2', status:'open', updated_at:new Date().toISOString() }).eq('id', ticketId)
        await supabase.from('ticket_history').insert({ ticket_id:ticketId, changed_by:user.id, field_changed:'assigned_team', old_value:'DEVELOPER', new_value:'L2', note:'↩️ Reassigned to L2: '+actionNote })
        setMsg('✅ Ticket sent back to L2!')
      } else if (action === 'reassign_l1') {
        // Dev/L2 sends back to L1
        await supabase.from('tickets').update({ assigned_team:'L1', status:'open', updated_at:new Date().toISOString() }).eq('id', ticketId)
        await supabase.from('ticket_history').insert({ ticket_id:ticketId, changed_by:user.id, field_changed:'assigned_team', old_value:ticket.assigned_team, new_value:'L1', note:'↩️ Reassigned to L1: '+actionNote })
        setMsg('✅ Ticket sent back to L1!')
      }
      await loadTicket(); await loadHistory()
      setAction(''); setActionNote('')
    } catch(err) { setMsg('❌ Error: '+err.message) }
    setSaving(false)
  }

  if (loading) return <Loader />
  if (!ticket) return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ fontSize:48 }}>🔍</div>
      <p style={{ color:'#ef4444', fontSize:16 }}>Ticket not found</p>
      <button onClick={() => router.back()} style={{ padding:'10px 24px', background:'#1e3a5f', border:'none', color:'#60a5fa', borderRadius:10, cursor:'pointer', fontSize:14 }}>← Go Back</button>
    </div>
  )

  const sla  = getSLAStatus(ticket.sla_resolve_due, ticket.status, ticket.created_at, ticket.priority)
  const stat = STATUS_CONFIG[ticket.status]     || STATUS_CONFIG.open
  const prio = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium
  const role = profile?.role
  const isOpen   = !['resolved','closed'].includes(ticket.status)
  const isAgent  = CAN_ACTION.includes(role)
  const isDev    = role === 'DEVELOPER'
  const isL1     = role === 'L1_AGENT'
  const isL2     = role === 'L2_AGENT'
  const isAdmin  = ['SUPER_ADMIN','ADMIN','IT_MANAGER'].includes(role)
  const tc = ticket.assigned_team==='L2'?{c:'#a78bfa',bg:'#2e1065'}:ticket.assigned_team==='DEVELOPER'?{c:'#06b6d4',bg:'#083344'}:{c:'#60a5fa',bg:'#1e3a5f'}

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .inp:focus { border-color:#3b82f6!important; box-shadow:0 0 0 3px rgba(59,130,246,0.1)!important; }
        .sbtn { transition:all 0.2s; }
        .sbtn:hover { opacity:0.85!important; transform:translateY(-1px); }
      `}</style>

      {/* Navbar */}
      <div style={{ background:'#111827', borderBottom:'1px solid #1f2d45', padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => router.back()} style={{ background:'transparent', border:'none', color:'#64748b', cursor:'pointer', fontSize:20, padding:'0 4px' }}>←</button>
          <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#3b82f6,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>⚡</div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800 }}>Nex<span style={{ color:'#06b6d4' }}>Desk</span></span>
          <span style={{ color:'#334155', margin:'0 4px' }}>›</span>
          <span style={{ color:'#64748b', fontSize:13 }}>{ticket.ticket_number}</span>
        </div>
        <span style={{ fontSize:12, color:'#64748b' }}>{profile?.email}</span>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 24px' }}>

        {/* Header */}
        <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'24px 28px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, flexWrap:'wrap' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'#3b82f6', fontFamily:'monospace' }}>{ticket.ticket_number}</span>
            <span style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:5, background:stat.bg, color:stat.color }}>{stat.label}</span>
            <span style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:5, background:prio.bg, color:prio.color }}>{prio.label}</span>
            <span style={{ fontSize:11, padding:'3px 8px', borderRadius:5, background:tc.bg, color:tc.c, fontWeight:600 }}>{ticket.assigned_team}</span>
            <span style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:5, background:sla.bg, color:sla.color }}>{sla.icon} SLA: {sla.label}</span>
          </div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:6 }}>{ticket.title}</h1>
          <p style={{ color:'#64748b', fontSize:13 }}>Raised on {new Date(ticket.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'start' }}>
          <div>
            {/* ── PHASE 31: FORENSIC SUBAGENT (L3 DEV ONLY) ── */}
            {(isDev || isAdmin) && isOpen && (
              <div style={{ marginBottom: 20 }}>
                <ForensicPilot 
                  ticketId={ticketId} 
                  onInvestigationComplete={() => { loadTicket(); loadHistory(); }}
                />
              </div>
            )}

            {/* Description */}
            {ticket.description && (
              <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, padding:'20px 24px', marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>📝 Description</div>
                <p style={{ color:'#cbd5e1', fontSize:14, lineHeight:1.8, whiteSpace:'pre-wrap', wordBreak:'break-word', overflowWrap:'anywhere' }}>{ticket.description}</p>
              </div>
            )}

            {/* AI Routing */}
            {ticket.ai_routing_reason && (
              <div style={{ background:'#0f172a', border:'1px solid #1e293b', borderRadius:12, padding:'14px 18px', marginBottom:16, display:'flex', gap:10 }}>
                <span style={{ fontSize:18 }}>🤖</span>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'#475569', marginBottom:3 }}>AI ROUTING REASON</div>
                  <div style={{ fontSize:12, color:'#64748b' }}>{ticket.ai_routing_reason}</div>
                </div>
              </div>
            )}

            {/* ── AGENT ACTIONS ── */}
            {isAgent && isOpen && (
              <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, padding:'20px 24px', marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:14 }}>⚡ Actions</div>

                {msg && (
                  <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:msg.startsWith('✅')?'#052e16':'#450a0a', color:msg.startsWith('✅')?'#6ee7b7':'#fca5a5', fontSize:13, border:`1px solid ${msg.startsWith('✅')?'#10b98130':'#ef444430'}` }}>
                    {msg}
                  </div>
                )}

                {/* Quick Status Buttons — ALL roles */}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11, color:'#475569', marginBottom:8, fontWeight:600 }}>QUICK STATUS UPDATE</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <button className="sbtn" onClick={() => updateStatus('in_progress','⚙️ Status changed to In Progress')} disabled={ticket.status==='in_progress'||saving}
                      style={{ padding:'9px 16px', borderRadius:9, fontSize:13, cursor:'pointer', border:'1px solid #8b5cf640', background:ticket.status==='in_progress'?'#2e1065':'transparent', color:'#a78bfa' }}>
                      ⚙️ In Progress {ticket.status==='in_progress'&&'✓'}
                    </button>
                    <button className="sbtn" onClick={() => updateStatus('pending_user','👤 Waiting for user response')} disabled={ticket.status==='pending_user'||saving}
                      style={{ padding:'9px 16px', borderRadius:9, fontSize:13, cursor:'pointer', border:'1px solid #06b6d440', background:ticket.status==='pending_user'?'#083344':'transparent', color:'#22d3ee' }}>
                      👤 Pending User {ticket.status==='pending_user'&&'✓'}
                    </button>
                    <button className="sbtn" onClick={() => updateStatus('pending_user','🏭 Waiting for OEM/Vendor')} disabled={saving}
                      style={{ padding:'9px 16px', borderRadius:9, fontSize:13, cursor:'pointer', border:'1px solid #f59e0b40', background:'transparent', color:'#fbbf24' }}>
                      🏭 Pending OEM
                    </button>
                  </div>
                </div>

                {/* Escalation / Assignment / Reassign buttons */}
                <div style={{ borderTop:'1px solid #1f2d45', paddingTop:14 }}>
                  <div style={{ fontSize:11, color:'#475569', marginBottom:8, fontWeight:600 }}>ROUTING & RESOLUTION</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>

                    {/* L1 — escalate to L2 */}
                    {(isL1 || isAdmin) && ticket.assigned_team === 'L1' && (
                      <button className="sbtn" onClick={() => setAction(action==='escalate'?'':'escalate')}
                        style={{ padding:'9px 16px', borderRadius:9, fontSize:13, cursor:'pointer', border:'1px solid #f9731640', background:action==='escalate'?'#431407':'transparent', color:'#fb923c' }}>
                        🔺 Escalate to L2
                      </button>
                    )}

                    {/* L2 / Admin — assign to developer */}
                    {(isL2 || isAdmin) && (
                      <button className="sbtn" onClick={() => setAction(action==='assign_dev'?'':'assign_dev')}
                        style={{ padding:'9px 16px', borderRadius:9, fontSize:13, cursor:'pointer', border:'1px solid #06b6d440', background:action==='assign_dev'?'#083344':'transparent', color:'#22d3ee' }}>
                        👨‍💻 Assign Developer
                      </button>
                    )}

                    {/* DEV — send back to L2 */}
                    {(isDev || isAdmin) && ticket.assigned_team === 'DEVELOPER' && (
                      <button className="sbtn" onClick={() => setAction(action==='reassign_l2'?'':'reassign_l2')}
                        style={{ padding:'9px 16px', borderRadius:9, fontSize:13, cursor:'pointer', border:'1px solid #a78bfa40', background:action==='reassign_l2'?'#2e1065':'transparent', color:'#a78bfa' }}>
                        ↩️ Send Back to L2
                      </button>
                    )}

                    {/* DEV / L2 — send back to L1 */}
                    {(isDev || isL2 || isAdmin) && (
                      <button className="sbtn" onClick={() => setAction(action==='reassign_l1'?'':'reassign_l1')}
                        style={{ padding:'9px 16px', borderRadius:9, fontSize:13, cursor:'pointer', border:'1px solid #60a5fa40', background:action==='reassign_l1'?'#1e3a5f':'transparent', color:'#60a5fa' }}>
                        ↩️ Send Back to L1
                      </button>
                    )}

                    {/* ALL agents — resolve */}
                    <button className="sbtn" onClick={() => setAction(action==='resolve'?'':'resolve')}
                      style={{ padding:'9px 16px', borderRadius:9, fontSize:13, cursor:'pointer', border:'1px solid #10b98140', background:action==='resolve'?'#052e16':'transparent', color:'#34d399' }}>
                      ✅ Mark Resolved
                    </button>

                  </div>
                </div>

                {/* Action input panel */}
                {action && (
                  <div style={{ background:'#0a0e1a', borderRadius:10, padding:16, border:'1px solid #1f2d45', marginTop:14 }}>
                    <div style={{ fontSize:12, color:'#64748b', marginBottom:8 }}>
                      { action==='escalate'    ? 'Reason for escalation to L2:'
                      : action==='assign_dev'  ? 'Reason for assigning to Developer:'
                      : action==='reassign_l2' ? 'Reason for sending back to L2:'
                      : action==='reassign_l1' ? 'Reason for sending back to L1:'
                      : 'Resolution notes (optional):' }
                    </div>
                    <textarea className="inp" value={actionNote} onChange={e => setActionNote(e.target.value)}
                      placeholder={
                        action==='escalate'    ? 'e.g. API error confirmed, code fix needed' :
                        action==='assign_dev'  ? 'e.g. Backend DB issue, needs dev fix' :
                        action==='reassign_l2' ? 'e.g. Not a code issue, config problem' :
                        action==='reassign_l1' ? 'e.g. Basic issue, L1 can handle' :
                        'e.g. Reset done, user confirmed working'
                      }
                      style={{ width:'100%', padding:'10px 12px', background:'#111827', border:'1px solid #1f2d45', borderRadius:8, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:'none', resize:'vertical', minHeight:70, marginBottom:10 }}/>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={doAction} disabled={saving}
                        style={{ padding:'9px 20px', background:'linear-gradient(135deg,#2563eb,#3b82f6)', border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                        {saving?<><div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', animation:'spin 0.7s linear infinite' }}/>Saving...</>:'Confirm'}
                      </button>
                      <button onClick={() => { setAction(''); setActionNote(''); setMsg('') }}
                        style={{ padding:'9px 16px', background:'transparent', border:'1px solid #1f2d45', borderRadius:8, color:'#64748b', cursor:'pointer', fontSize:13 }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Resolved banner */}
            {ticket.status === 'resolved' && ticket.resolution_notes && (
              <div style={{ background:'#052e16', border:'1px solid #10b98140', borderRadius:12, padding:'14px 18px', marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#10b981', marginBottom:4 }}>✅ RESOLVED</div>
                <div style={{ fontSize:13, color:'#6ee7b7' }}>{ticket.resolution_notes}</div>
              </div>
            )}

            {/* Comments */}
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, overflow:'hidden' }}>
              <div style={{ padding:'16px 24px', borderBottom:'1px solid #1f2d45', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:15, fontWeight:600 }}>💬 Comments ({comments.length})</span>
                <button onClick={loadComments} style={{ background:'transparent', border:'none', color:'#475569', cursor:'pointer', fontSize:12 }}>🔄 Refresh</button>
              </div>
              <div style={{ padding:'16px 24px' }}>
                {comments.length === 0 && <p style={{ color:'#334155', fontSize:13, padding:'8px 0' }}>No comments yet.</p>}
                {comments.map(c => (
                  <div key={c.id} style={{ marginBottom:16, paddingBottom:16, borderBottom:'1px solid #0f172a' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <div style={{ width:30, height:30, borderRadius:'50%', background:c.is_internal?'linear-gradient(135deg,#f97316,#ef4444)':'linear-gradient(135deg,#3b82f6,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 }}>
                        {(c.profiles?.full_name||c.profiles?.email||'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <span style={{ fontSize:13, fontWeight:600 }}>{c.profiles?.full_name||c.profiles?.email?.split('@')[0]||'User'}</span>
                        {c.is_internal && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:4, background:'#451a03', color:'#fb923c', marginLeft:8 }}>🔒 Internal</span>}
                      </div>
                      <span style={{ fontSize:11, color:'#334155', marginLeft:'auto' }}>{new Date(c.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                    </div>
                    <div style={{ fontSize:14, color:'#cbd5e1', paddingLeft:38, lineHeight:1.8, whiteSpace:'pre-wrap', wordBreak:'break-word', overflowWrap:'anywhere' }}>{c.comment_text}</div>
                  </div>
                ))}
                <form onSubmit={postComment} style={{ marginTop:16, borderTop:'1px solid #1f2d45', paddingTop:16 }}>
                  <textarea className="inp" value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment or update..."
                    style={{ width:'100%', padding:'12px 14px', background:'#0a0e1a', border:'1px solid #1f2d45', borderRadius:10, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:'none', resize:'vertical', minHeight:90, marginBottom:12, boxSizing:'border-box' }}/>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                    {isAgent && (
                      <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:isInternal?'#fb923c':'#64748b' }}>
                        <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} style={{ cursor:'pointer', accentColor:'#f97316' }}/>
                        🔒 Internal note
                      </label>
                    )}
                    <button type="submit" disabled={!comment.trim()||posting}
                      style={{ padding:'10px 24px', background:'linear-gradient(135deg,#2563eb,#3b82f6)', border:'none', borderRadius:9, color:'#fff', cursor:'pointer', fontSize:14, fontWeight:600, opacity:!comment.trim()||posting?0.5:1, marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
                      {posting?'Posting...':'Post Comment →'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div>
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, padding:'20px', marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:14 }}>Ticket Details</div>
              {[
                ['Category',     `${ticket.categories?.icon||''} ${ticket.categories?.name||'—'}`],
                ['Priority',     prio.label],
                ['Status',       stat.label],
                ['Team',         ticket.assigned_team],
                ['SLA',          `${sla.icon} ${sla.label}`],
                ['Created',      new Date(ticket.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})],
                ['SLA Deadline', ticket.sla_resolve_due ? new Date(ticket.sla_resolve_due).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #0f172a' }}>
                  <span style={{ fontSize:12, color:'#475569' }}>{k}</span>
                  <span style={{ fontSize:12, color:'#e2e8f0', fontWeight:500, textAlign:'right', maxWidth:160 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Activity */}
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, padding:'20px', maxHeight:400, overflow:'auto' }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:14 }}>📋 Activity ({history.length})</div>
              {history.length === 0
                ? <p style={{ fontSize:12, color:'#334155' }}>No activity yet</p>
                : history.map((h,i) => (
                  <div key={h.id} style={{ display:'flex', gap:10, marginBottom:12, paddingBottom:12, borderBottom:i<history.length-1?'1px solid #0f172a':'none' }}>
                    <div style={{ width:22, height:22, borderRadius:'50%', background:'#1e293b', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, flexShrink:0, marginTop:2 }}>
                      {h.field_changed==='status'?'🔄':h.field_changed==='assigned_team'?'👤':'💬'}
                    </div>
                    <div>
                      <div style={{ fontSize:12, color:'#94a3b8', lineHeight:1.5 }}>{h.note||`${h.field_changed}: ${h.old_value||'—'} → ${h.new_value||'—'}`}</div>
                      <div style={{ fontSize:10, color:'#334155', marginTop:2 }}>{new Date(h.changed_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Loader() {
  return <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#3b82f6', animation:'spin 0.7s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}
