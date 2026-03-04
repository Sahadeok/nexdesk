'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

// ── Notification Bell Component ─────────────────────────
// Usage: Add <NotificationBell /> to any navbar
export default function NotificationBell() {
  const router   = useRouter()
  const supabase = createClient()
  const [notifications, setNotifications] = useState([])
  const [open, setOpen]     = useState(false)
  const [userId, setUserId] = useState(null)
  const panelRef = useRef(null)

  useEffect(() => {
    getUser()
    // Close panel on outside click
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!userId) return
    loadNotifications()
    // ── Real-time subscription ──────────────────────────
    const channel = supabase
      .channel('notifications-' + userId)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        // New notification arrives — add to top
        setNotifications(prev => [payload.new, ...prev].slice(0, 20))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [userId])

  async function getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setUserId(user.id)
  }

  async function loadNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setNotifications(data)
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? {...n, read:true} : n))
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifications(prev => prev.map(n => ({...n, read:true})))
  }

  async function clearAll() {
    await supabase.from('notifications').delete().eq('user_id', userId)
    setNotifications([])
    setOpen(false)
  }

  function handleNotifClick(notif) {
    markRead(notif.id)
    if (notif.ticket_id) router.push(`/tickets/${notif.ticket_id}`)
    setOpen(false)
  }

  const unread = notifications.filter(n => !n.read).length

  const typeIcon = {
    ticket_created:  '🎫',
    ticket_resolved: '✅',
    ticket_escalated:'🔺',
    sla_breach:      '🚨',
    status_update:   '🔄',
    new_comment:     '💬',
    assigned:        '👤',
  }

  const typeColor = {
    ticket_created:  '#60a5fa',
    ticket_resolved: '#34d399',
    ticket_escalated:'#fb923c',
    sla_breach:      '#ef4444',
    status_update:   '#a78bfa',
    new_comment:     '#06b6d4',
    assigned:        '#fbbf24',
  }

  return (
    <div ref={panelRef} style={{ position:'relative' }}>
      <style>{`
        @keyframes fadeDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ping { 0%{transform:scale(1);opacity:1} 75%,100%{transform:scale(2);opacity:0} }
        .nitem:hover { background:#0f172a!important; }
      `}</style>

      {/* Bell Button */}
      <button onClick={() => { setOpen(!open); if (!open) loadNotifications() }}
        style={{ position:'relative', background:'transparent', border:'1px solid #1f2d45', color:'#64748b', width:38, height:38, borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, transition:'all 0.2s' }}>
        🔔
        {unread > 0 && (
          <>
            {/* Ping animation */}
            <span style={{ position:'absolute', top:6, right:6, width:8, height:8, borderRadius:'50%', background:'#ef4444', animation:'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }}/>
            {/* Badge */}
            <span style={{ position:'absolute', top:4, right:4, background:'#ef4444', color:'#fff', fontSize:9, fontWeight:700, borderRadius:'50%', width:14, height:14, display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>
              {unread > 9 ? '9+' : unread}
            </span>
          </>
        )}
      </button>

      {/* Notification Panel */}
      {open && (
        <div style={{ position:'absolute', top:46, right:0, width:360, background:'#111827', border:'1px solid #1f2d45', borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,0.5)', zIndex:1000, animation:'fadeDown 0.2s ease', overflow:'hidden' }}>

          {/* Header */}
          <div style={{ padding:'14px 18px', borderBottom:'1px solid #1f2d45', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontWeight:600, fontSize:14 }}>🔔 Notifications</span>
              {unread > 0 && <span style={{ fontSize:10, padding:'2px 6px', borderRadius:20, background:'#ef4444', color:'#fff', fontWeight:600 }}>{unread}</span>}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {unread > 0 && <button onClick={markAllRead} style={{ fontSize:11, color:'#60a5fa', background:'transparent', border:'none', cursor:'pointer' }}>Mark all read</button>}
              {notifications.length > 0 && <button onClick={clearAll} style={{ fontSize:11, color:'#475569', background:'transparent', border:'none', cursor:'pointer' }}>Clear all</button>}
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight:420, overflowY:'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding:32, textAlign:'center' }}>
                <div style={{ fontSize:36, marginBottom:10 }}>🔔</div>
                <p style={{ color:'#475569', fontSize:13 }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className="nitem"
                  onClick={() => handleNotifClick(n)}
                  style={{ padding:'12px 18px', borderBottom:'1px solid #0f172a', cursor:'pointer', transition:'background 0.15s', background: n.read ? 'transparent' : '#0f172a', display:'flex', gap:10, alignItems:'flex-start' }}>

                  {/* Icon */}
                  <div style={{ width:34, height:34, borderRadius:'50%', background:`${typeColor[n.type] || '#3b82f6'}20`, border:`1px solid ${typeColor[n.type] || '#3b82f6'}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>
                    {typeIcon[n.type] || '📋'}
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                      <span style={{ fontSize:13, fontWeight: n.read ? 400 : 600, color: n.read ? '#94a3b8' : '#e2e8f0', lineHeight:1.4 }}>{n.title}</span>
                      {!n.read && <div style={{ width:7, height:7, borderRadius:'50%', background:'#3b82f6', flexShrink:0, marginTop:3 }}/>}
                    </div>
                    {n.message && <p style={{ fontSize:12, color:'#64748b', margin:'3px 0 0', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{n.message}</p>}
                    <div style={{ fontSize:10, color:'#334155', marginTop:4 }}>
                      {new Date(n.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{ padding:'10px 18px', borderTop:'1px solid #1f2d45', textAlign:'center' }}>
              <button onClick={() => { router.push('/notifications'); setOpen(false) }} style={{ fontSize:12, color:'#60a5fa', background:'transparent', border:'none', cursor:'pointer' }}>
                View all notifications →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
