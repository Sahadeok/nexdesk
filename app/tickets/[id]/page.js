'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import { STATUS_CONFIG, PRIORITY_CONFIG, getSLAStatus } from '../../../lib/ticketRouter'

const CAN_RESOLVE    = ['ADMIN','IT_MANAGER','L1_AGENT','L2_AGENT']
const CAN_ESCALATE   = ['ADMIN','IT_MANAGER','L1_AGENT','L2_AGENT']
const CAN_ASSIGN_DEV = ['ADMIN','IT_MANAGER','L2_AGENT']

export default function TicketDetail() {
  const router   = useRouter()
  const params   = useParams()           // ✅ useParams() instead of props
  const ticketId = params?.id            // ✅ get id safely
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

  useEffect(() => {
    if (ticketId) init()
  }, [ticketId])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    setProfile(p)
    await Promise.all([loadTicket(), loadComments(), loadHistory()])
    setLoading(false)
  }

  async function loadTicket() {
    const { data } = await supabase
      .from('tickets')
      .select('*, categories(name,icon,code)')
      .eq('id', ticketId)
      .single()
    if (data) setTicket(data)
  }

  async function loadComments() {
    const { data } = await supabase
      .from('ticket_comments')
      .select('*, profiles(full_name,email,role)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
    if (data) setComments(data)
  }

  async function loadHistory() {
    const { data } = await supabase
      .from('ticket_history')
      .select('*, profiles(full_name,email)')
      .eq('ticket_id', ticketId)
      .order('changed_at', { ascending: false })
    if (data) setHistory(data)
  }

  async function postComment(e) {
    e.preventDefault()
    if (!comment.trim()) return
    setPosting(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('ticket_comments').insert({
      ticket_id:    ticketId,
      user_id:      user.id,
      comment_text: comment.trim(),
      is_internal:  isInternal,
    })
    await supabase.from('ticket_history').insert({
      ticket_id:     ticketId,
      changed_by:    user.id,
      field_changed: 'comment',
      note:          isInternal ? 'Internal note added' : 'Comment added',
    })
    setComment('')
    await loadComments()
    await loadHistory()
    setPosting(false)
  }

  async function doAction() {
    if (!actionNote.trim() && action !== 'resolve') { setMsg('Please enter a reason.'); return }
    setSaving(true); setMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    try {
      if (action === 'escalate') {
        await supabase.from('tickets').update({ assigned_team:'L2', escalated_to_l2:true, escalation_reason:actionNote, status:'escalated', updated_at:new Date().toISOString() }).eq('id', ticketId)
        await supabase.from('ticket_history').insert({ ticket_id:ticketId, changed_by:user.id, field_changed:'assigned_team', old_value:'L1', new_value:'L2', note:'Escalated to L2: '+actionNote })
        setMsg('✅ Ticket escalated to L2!')
      } else if (action === 'resolve') {
        const note = actionNote.trim() || 'Issue resolved'
        await supabase.from('tickets').update({ status:'resolved', resolution_notes:note, resolved_at:new Date().toISOString(), updated_at:new Date().toISOString() }).eq('id', ticketId)
        await supabase.from('ticket_history').insert({ ticket_id:ticketId, changed_by:user.id, field_changed:'status', old_value:ticket.status, new_value:'resolved', note:'Resolved: '+note })
        setMsg('✅ Ticket resolved!')
      } else if (action === 'assign_dev') {
        await supabase.from('tickets').update({ assigned_team:'DEVELOPER', assigned_dev_reason:actionNote, status:'in_progress', updated_at:new Date().toISOString() }).eq('id', ticketId)
        await supabase.from('ticket_history').insert({ ticket_id:ticketId, changed_by:user.id, field_changed:'assigned_team', old_value:ticket.assigned_team, new_value:'DEVELOPER', note:'Assigned to developer: '+actionNote })
        setMsg('✅ Assigned to Developer team!')
      }
      await loadTicket(); await loadHistory()
      setAction(''); setActionNote('')
    } catch(err) { setMsg('❌ Error: '+err.message) }
    setSaving(false)
  }

  if (loading) return <Loader />
  if (!ticket)  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ fontSize:48 }}>🔍</div>
      <p style={{ color:'#ef4444', fontSize:16 }}>Ticket not found</p>
      <button onClick={() => router.back()} style={{ padding:'10px 24px', background:'#1e3a5f', border:'none', color:'#60a5fa', borderRadius:10, cursor:'pointer', fontSize:14 }}>← Go Back</button>
    </div>
  )

  const sla  = getSLAStatus(ticket.sla_resolve_due, ticket.status)
  const stat = STATUS_CONFIG[ticket.status]     || STATUS_CONFIG.open
  const prio = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium
  const isAgent = CAN_RESOLVE.includes(profile?.role)
  const tc = ticket.assigned_team==='L2'?{c:'#a78bfa',bg:'#2e1065'}:ticket.assigned_team==='DEVELOPER'?{c:'#06b6d4',bg:'#083344'}:{c:'#60a5fa',bg:'#1e3a5f'}

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}} .inp:focus{border-color:#3b82f6!important;box-shadow:0 0 0 3px rgba(59,130,246,0.1)!important;}`}</style>

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

        {/* Ticket Header */}
        <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'24px 28px', marginBottom:20, animation:'fadeUp 0.4s ease' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, flexWrap:'wrap' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'#3b82f6', fontFamily:'monospace' }}>{ticket.ticket_number}</span>
            <span style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:5, background:stat.bg, color:stat.color }}>{stat.label}</span>
            <span style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:5, background:prio.bg, color:prio.color }}>{prio.label}</span>
            <span style={{ fontSize:11, padding:'3px 8px', borderRadius:5, background:tc.bg, color:tc.c, fontWeight:600 }}>{ticket.assigned_team}</span>
            <span style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:5, background:sla.bg, color:sla.color }}>{sla.icon} SLA: {sla.label}</span>
          </div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:6, lineHeight:1.3 }}>{ticket.title}</h1>
          <p style={{ color:'#64748b', fontSize:13 }}>
            Raised on {new Date(ticket.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'start' }}>

          {/* Left */}
          <div>
            {/* Description */}
            {ticket.description && (
              <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, padding:'20px 24px', marginBottom:16, animation:'fadeUp 0.4s 0.1s ease both' }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>📝 Description</div>
                <p style={{ color:'#cbd5e1', fontSize:14, lineHeight:1.8, whiteSpace:'pre-wrap' }}>{ticket.description}</p>
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

            {/* Agent Actions */}
            {isAgent && !['resolved','closed'].includes(ticket.status) && (
              <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, padding:'20px 24px', marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:14 }}>⚡ Agent Actions</div>
                {msg && (
                  <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:msg.startsWith('✅')?'#052e16':'#450a0a', color:msg.startsWith('✅')?'#6ee7b7':'#fca5a5', fontSize:13, border:`1px solid ${msg.startsWith('✅')?'#10b98130':'#ef444430'}` }}>
                    {msg}
                  </div>
                )}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
                  {ticket.assigned_team === 'L1' && CAN_ESCALATE.includes(profile?.role) && (
                    <button onClick={() => setAction(action==='escalate'?'':'escalate')} style={{ padding:'9px 16px', borderRadius:9, fontSize:13, cursor:'pointer', border:'1px solid #f9731640', background:action==='escalate'?'#431407':'transparent', color:'#fb923c', fontFamily:"'DM Sans',sans-serif" }}>🔺 Escalate to L2</button>
                  )}
                  {CAN_ASSIGN_DEV.includes(profile?.role) && (
                    <button onClick={() => setAction(action==='assign_dev'?'':'assign_dev')} style={{ padding:'9px 16px', borderRadius:9, fontSize:13, cursor:'pointer', border:'1px solid #06b6d440', background:action==='assign_dev'?'#083344':'transparent', color:'#22d3ee', fontFamily:"'DM Sans',sans-serif" }}>👨‍💻 Assign Developer</button>
                  )}
                  <button onClick={() => setAction(action==='resolve'?'':'resolve')} style={{ padding:'9px 16px', borderRadius:9, fontSize:13, cursor:'pointer', border:'1px solid #10b98140', background:action==='resolve'?'#052e16':'transparent', color:'#34d399', fontFamily:"'DM Sans',sans-serif" }}>✅ Mark Resolved</button>
                </div>
                {action && (
                  <div style={{ background:'#0a0e1a', borderRadius:10, padding:16, border:'1px solid #1f2d45' }}>
                    <div style={{ fontSize:12, color:'#64748b', marginBottom:8 }}>
                      {action==='escalate'?'Reason for escalation:':action==='assign_dev'?'Developer team / reason:':'Resolution notes (optional):'}
                    </div>
                    <textarea className="inp" value={actionNote} onChange={e => setActionNote(e.target.value)}
                      placeholder={action==='escalate'?'e.g. API error, needs code fix':action==='assign_dev'?'e.g. Backend team — DB issue':'e.g. Reset user account, issue resolved'}
                      style={{ width:'100%', padding:'10px 12px', background:'#111827', border:'1px solid #1f2d45', borderRadius:8, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:'none', resize:'vertical', minHeight:70, marginBottom:10 }}/>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={doAction} disabled={saving} style={{ padding:'9px 20px', background:'linear-gradient(135deg,#2563eb,#3b82f6)', border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', gap:6 }}>
                        {saving ? <><div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', animation:'spin 0.7s linear infinite' }}/>Saving...</> : 'Confirm'}
                      </button>
                      <button onClick={() => { setAction(''); setActionNote(''); setMsg('') }} style={{ padding:'9px 16px', background:'transparent', border:'1px solid #1f2d45', borderRadius:8, color:'#64748b', cursor:'pointer', fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Resolution banner */}
            {ticket.status === 'resolved' && ticket.resolution_notes && (
              <div style={{ background:'#052e16', border:'1px solid #10b98140', borderRadius:12, padding:'14px 18px', marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#10b981', marginBottom:4 }}>✅ RESOLVED</div>
                <div style={{ fontSize:13, color:'#6ee7b7' }}>{ticket.resolution_notes}</div>
              </div>
            )}

            {/* Comments */}
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, overflow:'hidden' }}>
              <div style={{ padding:'16px 24px', borderBottom:'1px solid #1f2d45' }}>
                <span style={{ fontSize:15, fontWeight:600 }}>💬 Comments ({comments.length})</span>
              </div>
              <div style={{ padding:'16px 24px' }}>
                {comments.length === 0 && <p style={{ color:'#334155', fontSize:13, padding:'8px 0' }}>No comments yet.</p>}
                {comments.map(c => (
                  <div key={c.id} style={{ marginBottom:16, paddingBottom:16, borderBottom:'1px solid #0f172a' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#3b82f6,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff' }}>
                        {(c.profiles?.full_name||c.profiles?.email||'U')[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize:13, fontWeight:500 }}>{c.profiles?.full_name||c.profiles?.email?.split('@')[0]||'User'}</span>
                      {c.is_internal && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:4, background:'#451a03', color:'#fb923c' }}>🔒 Internal</span>}
                      <span style={{ fontSize:11, color:'#334155', marginLeft:'auto' }}>{new Date(c.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                    </div>
                    <div style={{ fontSize:13, color:'#cbd5e1', paddingLeft:36, lineHeight:1.7, whiteSpace:'pre-wrap' }}>{c.comment_text}</div>
                  </div>
                ))}
                <form onSubmit={postComment} style={{ marginTop:8 }}>
                  <textarea className="inp" value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment..."
                    style={{ width:'100%', padding:'10px 12px', background:'#0a0e1a', border:'1px solid #1f2d45', borderRadius:10, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:'none', resize:'vertical', minHeight:80, marginBottom:10 }}/>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                    {isAgent && (
                      <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'#64748b' }}>
                        <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} style={{ cursor:'pointer' }}/>
                        🔒 Internal note
                      </label>
                    )}
                    <button type="submit" disabled={!comment.trim()||posting} style={{ padding:'9px 20px', background:'linear-gradient(135deg,#2563eb,#3b82f6)', border:'none', borderRadius:9, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif", opacity:!comment.trim()||posting?0.5:1, marginLeft:'auto' }}>
                      {posting?'Posting...':'Post Comment'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Right - Details + History */}
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

            {/* History */}
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, padding:'20px', maxHeight:380, overflow:'auto' }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:14 }}>📋 Activity</div>
              {history.length === 0 ? <p style={{ fontSize:12, color:'#334155' }}>No history yet</p> : (
                history.map((h,i) => (
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
              )}
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
