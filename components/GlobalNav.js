'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const ROLE_CONFIG = {
  ADMIN:      { label:'👑 ADMIN',     bg:'#451a03', color:'#fbbf24', border:'#f59e0b40', dash:'/dashboard/admin' },
  IT_MANAGER: { label:'🏢 IT MGR',    bg:'#451a03', color:'#fbbf24', border:'#f59e0b40', dash:'/dashboard/admin' },
  L1_AGENT:   { label:'🎫 L1 AGENT',  bg:'#1e3a5f', color:'#60a5fa', border:'#3b82f640', dash:'/dashboard/l1' },
  L2_AGENT:   { label:'⚠️ L2 AGENT',  bg:'#2e1065', color:'#a78bfa', border:'#8b5cf640', dash:'/dashboard/l2' },
  DEVELOPER:  { label:'👨‍💻 DEV',       bg:'#083344', color:'#06b6d4', border:'#06b6d440', dash:'/dashboard/developer' },
  END_USER:   { label:'👤 USER',       bg:'#052e16', color:'#34d399', border:'#10b98140', dash:'/dashboard/user' },
}

export default function GlobalNav({ title }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [profile,    setProfile]    = useState(null)
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [unread,     setUnread]     = useState(0)

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) return
    setProfile(p)
    loadUnread(user.id)
  }

  async function loadUnread(uid) {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count:'exact', head:true })
      .eq('user_id', uid)
      .eq('read', false)
    if (count) setUnread(count)
  }

  const rc = ROLE_CONFIG[profile?.role] || ROLE_CONFIG.END_USER

  const isActive = (path) => pathname?.startsWith(path)

  const navLinks = [
    { href: rc.dash,           label: '🏠 Dashboard',     roles: 'all' },
    { href: '/log-analyzer',   label: '🤖 AI Log Analyzer', roles: 'all' },
    { href: '/dashboard/reports', label: '📊 Reports',     roles: ['ADMIN','IT_MANAGER'] },
    { href: '/tickets/new',    label: '+ New Ticket',     roles: 'all' },
  ]

  return (
    <>
      <style>{`
        @keyframes fadeDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .gnav-link:hover { background:#1a2236!important; color:#e2e8f0!important; }
        .gnav-btn:hover  { opacity:0.85!important; }
      `}</style>

      <div style={{ background:'#111827', borderBottom:'1px solid #1f2d45', padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:200, fontFamily:"'DM Sans',sans-serif" }}>

        {/* Left — Logo + Title */}
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={() => router.push(rc.dash)} style={{ display:'flex', alignItems:'center', gap:8, background:'transparent', border:'none', cursor:'pointer', padding:0 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#3b82f6,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⚡</div>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:'#e2e8f0' }}>Nex<span style={{ color:'#06b6d4' }}>Desk</span></span>
          </button>

          {title && (
            <>
              <span style={{ color:'#334155' }}>›</span>
              <span style={{ color:'#64748b', fontSize:14 }}>{title}</span>
            </>
          )}

          {/* Nav Links — Desktop */}
          <div style={{ display:'flex', gap:2, marginLeft:16 }}>
            {navLinks.filter(l => l.roles === 'all' || l.roles.includes(profile?.role)).map(link => (
              <button key={link.href} className="gnav-link"
                onClick={() => router.push(link.href)}
                style={{ padding:'6px 12px', borderRadius:8, fontSize:13, cursor:'pointer', border:'none', background: isActive(link.href) ? '#1e3a5f' : 'transparent', color: isActive(link.href) ? '#60a5fa' : '#64748b', fontFamily:"'DM Sans',sans-serif", transition:'all 0.15s', fontWeight: isActive(link.href) ? 600 : 400,
                  // Highlight Log Analyzer specially
                  ...(link.href === '/log-analyzer' ? { background: isActive(link.href)?'#1e1b4b':'#1a1a2e', color: isActive(link.href)?'#818cf8':'#6366f1', border:'1px solid #6366f120' } : {})
                }}>
                {link.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right — Role + Email + Notification + SignOut */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>

          {/* Role Badge */}
          <span style={{ padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, background:rc.bg, color:rc.color, border:`1px solid ${rc.border}`, whiteSpace:'nowrap' }}>
            {rc.label}
          </span>

          <span style={{ fontSize:12, color:'#64748b', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {profile?.email}
          </span>

          {/* Notification Bell */}
          <button onClick={() => router.push('/notifications')}
            style={{ position:'relative', background:'transparent', border:'1px solid #1f2d45', color:'#64748b', width:36, height:36, borderRadius:9, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>
            🔔
            {unread > 0 && (
              <span style={{ position:'absolute', top:4, right:4, background:'#ef4444', color:'#fff', fontSize:9, fontWeight:700, borderRadius:'50%', width:14, height:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* Log Analyzer Quick Button */}
          <button className="gnav-btn"
            onClick={() => router.push('/log-analyzer')}
            style={{ padding:'6px 14px', background:'linear-gradient(135deg,#4f46e5,#6366f1)', border:'none', color:'#fff', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
            🤖 Log Analyzer
          </button>

          {/* Sign Out */}
          <button className="gnav-btn"
            onClick={async () => { await supabase.auth.signOut(); router.replace('/login') }}
            style={{ background:'transparent', border:'1px solid #1f2d45', color:'#64748b', padding:'6px 12px', borderRadius:8, cursor:'pointer', fontSize:12 }}>
            Sign Out
          </button>
        </div>
      </div>
    </>
  )
}
