'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

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
  const [profile, setProfile] = useState(null)
  const [unread,  setUnread]  = useState(0)
  const [sb,      setSb]      = useState(null)

  useEffect(() => {
    const client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    setSb(client)
    loadProfile(client)

    const { data: { subscription } } = client.auth.onAuthStateChange((_e, session) => {
      if (session?.user) loadProfile(client)
    })
    return () => subscription?.unsubscribe()
  }, [])

  async function loadProfile(client) {
    try {
      let userId = null

      // Method 1: getSession
      const { data: { session } } = await client.auth.getSession()
      if (session?.user?.id) {
        userId = session.user.id
      } else {
        // Method 2: getUser
        const { data: { user } } = await client.auth.getUser()
        userId = user?.id
      }

      if (!userId) return

      const { data: p } = await client
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', userId)
        .single()

      if (p) {
        setProfile(p)
        const { count } = await client
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('read', false)
        if (count) setUnread(count)
      }
    } catch(e) {}
  }

  async function signOut() {
    // ✅ signOut({ scope:'global' }) invalidates session on Supabase server
    // This clears the HttpOnly cookie that JS cannot touch
    try { if (sb) await sb.auth.signOut({ scope: 'global' }) } catch(e) {}
    // Clear any non-HttpOnly storage
    try { localStorage.clear() } catch(e) {}
    try { sessionStorage.clear() } catch(e) {}
    // Full browser reload — clears Next.js route cache completely
    window.location.replace('/login')
  }

  const rc      = ROLE_CONFIG[profile?.role] || ROLE_CONFIG.END_USER
  const isAdmin = ['ADMIN', 'IT_MANAGER'].includes(profile?.role)
  const isAgent = ['ADMIN', 'IT_MANAGER', 'L1_AGENT', 'L2_AGENT', 'DEVELOPER'].includes(profile?.role)
  const isActive = (path) => pathname?.startsWith(path)

  return (
    <>
      <style>{`
        @keyframes ping { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
        .gnav-link:hover { background:#1a2236!important; color:#e2e8f0!important; }
        .gnav-btn:hover  { opacity:0.85!important; }
      `}</style>
      <div style={{ background:'#111827', borderBottom:'1px solid #1f2d45', padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:200, fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <button onClick={() => router.push(rc.dash)}
            style={{ display:'flex', alignItems:'center', gap:8, background:'transparent', border:'none', cursor:'pointer', padding:'0 4px 0 0' }}>
            <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#3b82f6,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⚡</div>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:'#e2e8f0' }}>Nex<span style={{ color:'#06b6d4' }}>Desk</span></span>
          </button>
          {title && (<><span style={{ color:'#334155', marginLeft:4 }}>›</span><span style={{ color:'#64748b', fontSize:13, marginLeft:4 }}>{title}</span></>)}
          <div style={{ display:'flex', gap:2, marginLeft:10 }}>
            <button className="gnav-link" onClick={() => router.push(rc.dash)}
              style={{ padding:'6px 11px', borderRadius:8, fontSize:12, cursor:'pointer', border:'none', background:isActive(rc.dash)?'#1e3a5f':'transparent', color:isActive(rc.dash)?'#60a5fa':'#64748b', transition:'all 0.15s' }}>
              🏠 Dashboard
            </button>
            {isAgent && (
              <button className="gnav-link" onClick={() => router.push('/log-analyzer')}
                style={{ padding:'6px 11px', borderRadius:8, fontSize:12, cursor:'pointer', border:'1px solid transparent', background:'#1a1a2e', color:'#6366f1', transition:'all 0.15s', fontWeight:600 }}>
                🤖 Log Analyzer
              </button>
            )}
            {isAdmin && (
              <button className="gnav-link" onClick={() => router.push('/dashboard/analyst')}
                style={{ padding:'6px 11px', borderRadius:8, fontSize:12, cursor:'pointer', border:'1px solid transparent', background:'#1a1208', color:'#d97706', transition:'all 0.15s', fontWeight:600 }}>
                🧠 AI Analyst
              </button>
            )}
            {isAgent && (
              <button className="gnav-link" onClick={() => router.push('/dashboard/ai-intelligence')}
                style={{ padding:'6px 11px', borderRadius:8, fontSize:12, cursor:'pointer', border:'1px solid transparent', background: isActive('/dashboard/ai-intelligence')?'#1e1b4b':'#120a2e', color:'#a5b4fc', transition:'all 0.15s', fontWeight:600 }}>
                🧠 AI Intel
              </button>
            )}
            {isAdmin && (
              <button className="gnav-link" onClick={() => router.push('/dashboard/predictions')}
                style={{ padding:'6px 11px', borderRadius:8, fontSize:12, cursor:'pointer', border:'1px solid transparent', background: isActive('/dashboard/predictions')?'#1e1b4b':'#120820', color:'#c084fc', transition:'all 0.15s', fontWeight:600 }}>
                🔮 Predict
              </button>
            )}
            {isAdmin && (
              <button className="gnav-link" onClick={() => router.push('/dashboard/compliance')}
                style={{ padding:'6px 11px', borderRadius:8, fontSize:12, cursor:'pointer', border:'1px solid transparent', background: isActive('/dashboard/compliance')?'#1e3a5f':'#0a1628', color:'#34d399', transition:'all 0.15s', fontWeight:600 }}>
                📋 Compliance
              </button>
            )}
            {isAdmin && (
              <button className="gnav-link" onClick={() => router.push('/dashboard/reports')}
                style={{ padding:'6px 11px', borderRadius:8, fontSize:12, cursor:'pointer', border:'none', background:'transparent', color:'#64748b', transition:'all 0.15s' }}>
                📊 Reports
              </button>
            )}
            <button className="gnav-link" onClick={() => router.push('/kb')}
              style={{ padding:'6px 11px', borderRadius:8, fontSize:12, cursor:'pointer', border:'none', background:'transparent', color:'#64748b', transition:'all 0.15s' }}>
              📚 Knowledge Base
            </button>
            <button className="gnav-link"
              onClick={() => router.push(profile?.role === 'END_USER' ? '/ai-resolution' : '/tickets/new')}
              style={{ padding:'6px 11px', borderRadius:8, fontSize:12, cursor:'pointer', border:'none', background:'transparent', color:'#64748b', transition:'all 0.15s' }}>
              {profile?.role === 'END_USER' ? '🤖 Get Help' : '+ New Ticket'}
            </button>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, background:rc.bg, color:rc.color, border:`1px solid ${rc.border}`, whiteSpace:'nowrap' }}>
            {rc.label}
          </span>
          {profile?.email && (
            <span style={{ fontSize:12, color:'#475569', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {profile.full_name || profile.email}
            </span>
          )}
          <button onClick={() => router.push('/notifications')}
            style={{ position:'relative', background:'transparent', border:'1px solid #1f2d45', color:'#64748b', width:36, height:36, borderRadius:9, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>
            🔔
            {unread > 0 && (
              <span style={{ position:'absolute', top:3, right:3, background:'#ef4444', color:'#fff', fontSize:9, fontWeight:700, borderRadius:'50%', width:14, height:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          <button className="gnav-btn" onClick={signOut}
            style={{ background:'transparent', border:'1px solid #1f2d45', color:'#64748b', padding:'6px 12px', borderRadius:8, cursor:'pointer', fontSize:12, transition:'all 0.2s' }}>
            Sign Out
          </button>
        </div>
      </div>
    </>
  )
}
