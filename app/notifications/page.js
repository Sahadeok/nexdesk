'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../lib/supabase'
import GlobalNav from '../components/GlobalNav'

function getSupabase() { return createClient() }

export default function NotificationsPage() {
  const router   = useRouter()
  const supabase = getSupabase()

  const [profile,       setProfile]       = useState(null)
  const [notifications, setNotifications] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [filter,        setFilter]        = useState('all') // all | unread | read

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    setProfile(p)
    await loadNotifications(p.id)
    setLoading(false)
  }

  async function loadNotifications(userId) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setNotifications(data)
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    if (!profile) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function deleteNotif(id) {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  async function clearAll() {
    if (!profile) return
    await supabase.from('notifications').delete().eq('user_id', profile.id)
    setNotifications([])
  }

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter === 'read')   return n.read
    return true
  })
  const unreadCount = notifications.filter(n => !n.read).length

  const TYPE_CONFIG = {
    incident:    { icon:'🚨', color:'#ef4444', bg:'#450a0a' },
    ticket:      { icon:'🎫', color:'#60a5fa', bg:'#1e3a5f' },
    sla:         { icon:'⏰', color:'#fbbf24', bg:'#451a03' },
    assignment:  { icon:'👤', color:'#a78bfa', bg:'#2e1065' },
    resolution:  { icon:'✅', color:'#34d399', bg:'#052e16' },
    system:      { icon:'⚙️', color:'#64748b', bg:'#1f2d45' },
    info:        { icon:'ℹ️', color:'#06b6d4', bg:'#083344' },
  }

  function getTypeConfig(type) {
    return TYPE_CONFIG[type] || TYPE_CONFIG.info
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins  = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days  = Math.floor(diff / 86400000)
    if (mins < 1)   return 'Just now'
    if (mins < 60)  return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#06b6d4', animation:'spin 0.7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <GlobalNav title="Notifications" />

      <div style={{ maxWidth:800, margin:'0 auto', padding:'32px 24px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <div>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:4 }}>
              🔔 Notifications
            </h1>
            <p style={{ color:'#64748b', fontSize:13 }}>
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                style={{ padding:'8px 16px', background:'#1e3a5f', border:'1px solid #3b82f640', borderRadius:9, color:'#60a5fa', cursor:'pointer', fontSize:13 }}>
                ✓ Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={clearAll}
                style={{ padding:'8px 16px', background:'transparent', border:'1px solid #1f2d45', borderRadius:9, color:'#475569', cursor:'pointer', fontSize:13 }}>
                🗑️ Clear all
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid #1f2d45', paddingBottom:0 }}>
          {[
            { key:'all',    label:`All (${notifications.length})` },
            { key:'unread', label:`Unread (${unreadCount})` },
            { key:'read',   label:'Read' },
          ].map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              style={{ padding:'9px 16px', background:'transparent', border:'none', borderBottom:filter===t.key?'2px solid #3b82f6':'2px solid transparent', color:filter===t.key?'#60a5fa':'#475569', cursor:'pointer', fontSize:13, fontWeight:filter===t.key?600:400, fontFamily:"'DM Sans',sans-serif", marginBottom:-1 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'64px 0' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🔕</div>
            <p style={{ color:'#475569', fontSize:15 }}>No notifications here</p>
            <p style={{ color:'#334155', fontSize:13, marginTop:4 }}>
              {filter === 'unread' ? 'All notifications have been read' : 'Nothing to show'}
            </p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {filtered.map((n, i) => {
              const tc = getTypeConfig(n.type)
              return (
                <div key={n.id}
                  style={{ background: n.read ? '#0f1424' : '#111827', border:`1px solid ${n.read ? '#1a2040' : '#1f2d45'}`, borderRadius:14, padding:'16px 18px', display:'flex', gap:14, alignItems:'flex-start', animation:`fadeUp 0.3s ${i*0.03}s ease both`, position:'relative', transition:'all 0.2s' }}>

                  {/* Unread dot */}
                  {!n.read && (
                    <div style={{ position:'absolute', top:16, right:16, width:8, height:8, borderRadius:'50%', background:'#3b82f6' }}/>
                  )}

                  {/* Icon */}
                  <div style={{ width:40, height:40, borderRadius:11, background:tc.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                    {tc.icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight: n.read ? 400 : 600, marginBottom:4, paddingRight:20 }}>
                      {n.title}
                    </div>
                    {n.message && (
                      <div style={{ fontSize:13, color:'#64748b', lineHeight:1.5, marginBottom:8 }}>
                        {n.message}
                      </div>
                    )}
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:11, color:'#334155' }}>
                        {timeAgo(n.created_at)}
                      </span>
                      <span style={{ fontSize:11, padding:'2px 7px', borderRadius:5, background:tc.bg, color:tc.color }}>
                        {n.type || 'info'}
                      </span>
                      {n.ticket_id && (
                        <button onClick={() => router.push(`/tickets/${n.ticket_id}`)}
                          style={{ fontSize:11, padding:'2px 8px', background:'#1e3a5f', border:'none', borderRadius:5, color:'#60a5fa', cursor:'pointer' }}>
                          View Ticket →
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', gap:6, flexShrink:0, marginTop:2 }}>
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} title="Mark as read"
                        style={{ background:'transparent', border:'1px solid #1f2d45', color:'#475569', width:28, height:28, borderRadius:7, cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        ✓
                      </button>
                    )}
                    <button onClick={() => deleteNotif(n.id)} title="Delete"
                      style={{ background:'transparent', border:'1px solid #1f2d45', color:'#475569', width:28, height:28, borderRadius:7, cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
