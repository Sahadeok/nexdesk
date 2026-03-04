'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../lib/supabase'

const ROLE_CONFIG = {
  ADMIN:      { label:'👑 ADMIN',    bg:'#451a03', color:'#fbbf24', border:'#f59e0b40', dash:'/dashboard/admin' },
  IT_MANAGER: { label:'🏢 IT MGR',   bg:'#451a03', color:'#fbbf24', border:'#f59e0b40', dash:'/dashboard/admin' },
  L1_AGENT:   { label:'🎫 L1 AGENT', bg:'#1e3a5f', color:'#60a5fa', border:'#3b82f640', dash:'/dashboard/l1' },
  L2_AGENT:   { label:'⚠️ L2 AGENT', bg:'#2e1065', color:'#a78bfa', border:'#8b5cf640', dash:'/dashboard/l2' },
  DEVELOPER:  { label:'👨‍💻 DEV',      bg:'#083344', color:'#06b6d4', border:'#06b6d440', dash:'/dashboard/developer' },
  END_USER:   { label:'👤 USER',      bg:'#052e16', color:'#34d399', border:'#10b98140', dash:'/dashboard/user' },
}

export default function GlobalNav({ title }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [profile, setProfile] = useState(null)
  const [unread,  setUnread]  = useState(0)
  const [menuOpen,setMenuOpen]= useState(false)

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

  const rc       = ROLE_CONFIG[profile?.role] || ROLE_CONFIG.END_USER
  const isAdmin  = ['ADMIN','IT_MANAGER'].includes(profile?.role)
  const isAgent  = ['ADMIN','IT_MANAGER','L1_AGENT','L2_AGENT','DEVELOPER'].includes(profile?.role)
  const isActive = (path) => pathname?.startsWith(path)

  return (
    <>
      <style>{`
        @keyframes fadeDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .gnav-link:hover { background:#1a2236!important; color:#e2e8f0!important; }
        .gnav-btn:hover  { opacity:0.85!important; }
        .gnav-bell:hover { background:#1a2236!important; }
      `}</style>

      <div style={{ background:'#111827', borderBottom:'1px solid #1f2d45', padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:200, fontFamily:"'DM Sans',sans-serif" }}>

        {/* ── Left ── */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {/* Logo */}
          <button onClick={() => router.push(rc.dash)} style={{ display:'flex', alignItems:'center', gap:8, background:'transparent', border:'none', cursor:'pointer', padding:0, flexShrink:0 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#3b82f6,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⚡</div>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:'#e2e8f0' }}>Nex<span style={{ color:'#06b6d4' }}>Desk</span></span>
          </button>

          {title && <><span style={{ color:'#334155' }}>›</span><span style={{ color:'#64748b', fontSize:13 }}>{title}</span></>}

          {/* Nav Links */}
          <div style={{ display:'flex', gap:2, marginLeft:12 }}>

            {/* Dashboard */}
            <button className="gnav-link" onClick={() => router.push(rc.dash)}
              style={{ padding:'6px 11px', borderRadius:8, fontSize:12, cursor:'pointer', border:'none', background:isActive(rc.dash)?'#1e3a5f':'transparent', color:isActive(rc.dash)?'#60a5fa':'#64748b', fontFamily:"'DM Sans',sans-serif", transition:'all 0.15s' }}>
              🏠 Dashboard
            </button>

            {/* Log Analyzer — all agents */}
            {isAgent && (
              <button className="gnav-link" onClick={() => router.push('/log-analyzer')}
                style={{ padding:'6px 11px', borderRadius:8, fontSize:12, cursor:'pointer', border: isActive('/log-analyzer')?'1px solid #6366f140':'1px solid transparent', background:isActive('/log-analyzer')?'#1e1b4b':'#1a1a2e', color:isActive('/log-analyzer')?'#a5b4fc':'#6366f1', fontFamily:"'DM Sans',sans-serif", transition:'all 0.15s', fontWeight:600 }}>
                🤖 Log Analyzer
              </button>
            )}

            {/* AI Analyst — admin only */}
            {isAdmin && (
              <button className="gnav-link" onClick={() => router.push('/dashboard/analyst')}
                style={{ padding:'6px 11px', borderRadius:8, fontSize:12, cursor:'pointer', border: isActive('/dashboard/analyst')?'1px solid #f59e0b40':'1px solid transparent', background:isActive('/dashboard/analyst')?'#451a03':'#1a1208', color:isActive('/dashboard/analyst')?'#fbbf24':'#d97706', fontFamily:"'DM Sans',sans-serif", transition:'all 0.15s', fontWeight:600 }}>
                🧠 AI Analyst
              </button>
            )}

            {/* Reports — admin only */}
            {isAdmin && (
              <button className="gnav-link" onClick={() => router.push('/dashboard/reports')}
                style={{ padding:'6px 11px', borderRadius:8, fontSize:12, cursor:'pointer', border:'none', background:isActive('/dashboard/reports')?'#1e3a5f':'transparent', color:isActive('/dashboard/reports')?'#60a5fa':'#64748b', fontFamily:"'DM Sans',sans-serif", transition:'all 0.15s' }}>
                📊 Reports
              </button>
            )}

            {/* Knowledge Base — everyone */}
            <button className="gnav-link" onClick={() => router.push('/kb')}
              style={{ padding:'6px 11px', borderRadius:8, fontSize:12, cursor:'pointer', border:'none', background:isActive('/kb')?'#083344':'transparent', color:isActive('/kb')?'#06b6d4':'#64748b', fontFamily:"'DM Sans',sans-serif", transition:'all 0.15s' }}>
              📚 Knowledge Base
            </button>

            {/* New Ticket */}
            <button className="gnav-link" onClick={() => router.push('/tickets/new')}
              style={{ padding:'6px 11px', borderRadius:8, fontSize:12, cursor:'pointer', border:'none', background:'transparent', color:'#64748b', fontFamily:"'DM Sans',sans-serif", transition:'all 0.15s' }}>
              + New Ticket
            </button>
          </div>
        </div>

        {/* ── Right ── */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>

          {/* Role Badge */}
          <span style={{ padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, background:rc.bg, color:rc.color, border:`1px solid ${rc.border}`, whiteSpace:'nowrap' }}>
            {rc.label}
          </span>

          {/* Email */}
          <span style={{ fontSize:12, color:'#475569', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'none' }} className="email-hide">
            {profile?.email}
          </span>

          {/* Notification Bell */}
          <button className="gnav-bell" onClick={() => router.push('/notifications')}
            style={{ position:'relative', background:'transparent', border:'1px solid #1f2d45', color:'#64748b', width:36, height:36, borderRadius:9, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, transition:'all 0.2s' }}>
            🔔
            {unread > 0 && (
              <>
                <span style={{ position:'absolute', top:4, right:4, width:8, height:8, borderRadius:'50%', background:'#ef4444', animation:'ping 1.5s infinite' }}/>
                <span style={{ position:'absolute', top:3, right:3, background:'#ef4444', color:'#fff', fontSize:9, fontWeight:700, borderRadius:'50%', width:14, height:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              </>
            )}
          </button>

          {/* Sign Out */}
          <button className="gnav-btn"
            onClick={async () => { await supabase.auth.signOut(); router.replace('/login') }}
            style={{ background:'transparent', border:'1px solid #1f2d45', color:'#64748b', padding:'6px 12px', borderRadius:8, cursor:'pointer', fontSize:12, transition:'all 0.2s' }}>
            Sign Out
          </button>
        </div>
      </div>
    </>
  )
}
