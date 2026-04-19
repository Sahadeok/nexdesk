'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../lib/supabase'
import { useTenant } from '../../lib/tenant-context'

const ROLE_CONFIG = {
  SUPER_ADMIN:{ label:'Super Admin', color:'#ffffff', bg:'#3b82f6', dash:'/dashboard/founder'   },
  ADMIN:      { label:'Admin',       color:'#b45309', bg:'#fef3c7', dash:'/dashboard/admin'     },
  IT_MANAGER: { label:'IT Mgr',      color:'#b45309', bg:'#fef3c7', dash:'/dashboard/admin'     },
  L1_AGENT:   { label:'L1 Agent',    color:'#1d4ed8', bg:'#dbeafe', dash:'/dashboard/l1'        },
  L2_AGENT:   { label:'L2 Agent',    color:'#6d28d9', bg:'#ede9fe', dash:'/dashboard/l2'        },
  DEVELOPER:  { label:'Developer',   color:'#065f46', bg:'#d1fae5', dash:'/dashboard/developer' },
  END_USER:   { label:'User',        color:'#374151', bg:'#f3f4f6', dash:'/dashboard/user'      },
}

// Fixed Tools for Global Search (Base)
const BASE_TOOLS = [
  { group: 'Actions', title: 'Create New Ticket', path: '/tickets/new', icon: '✨' },
  { group: 'Pages',   title: 'My Dashboard',      path: 'ROLE_DASH',    icon: '🏠' },
  { group: 'Pages',   title: 'Knowledge Base',    path: '/kb',          icon: '📚' },
]

const ADMIN_EXTRA_TOOLS = [
  { group: 'Admin/Config', title: 'Admin Launchpad',      path: '/dashboard/admin', icon: '⚙️' },
  { group: 'Admin/Config', title: 'Workspace Settings',   path: '/dashboard/admin/settings', icon: '⚙️' },
  { group: 'Admin/Tickets',title: 'Master Ticket Queue',  path: '/dashboard/admin/tickets', icon: '🎫' },
  { group: 'Admin/Tickets',title: 'Ticket Templates',     path: '/dashboard/templates', icon: '📋' },
  { group: 'Admin/Tickets',title: 'SLA Engine',           path: '/dashboard/sla-engine', icon: '⚙️' },
  { group: 'Admin/Tickets',title: 'Bulk Actions',         path: '/dashboard/bulk-actions', icon: '⚡' },
  { group: 'Admin/AI',     title: 'AI Resolution',        path: '/ai-resolution', icon: '🤖' },
  { group: 'Admin/AI',     title: 'AI Intelligence',      path: '/dashboard/ai-intelligence', icon: '🧩' },
  { group: 'Admin/AI',     title: 'AI SRE War Room',      path: '/dashboard/ai-sre', icon: '🛡️' },
  { group: 'Admin/AI',     title: 'Change Intelligence',  path: '/dashboard/change-intelligence', icon: '🧠' },
  { group: 'Admin/AI',     title: 'AI Postmortems',       path: '/dashboard/postmortems', icon: '📖' },
  { group: 'Admin/AI',     title: 'AI Analyst',           path: '/dashboard/analyst', icon: '👤' },
  { group: 'Admin/AI',     title: 'AI Log Analyzer',      path: '/log-analyzer', icon: '🤖' },
  { group: 'Admin/AI',     title: 'Predictions',          path: '/dashboard/predictions', icon: '🔮' },
  { group: 'Admin/AI',     title: 'Agent Console',        path: '/dashboard/agent-console', icon: '🦾' },
  { group: 'Admin/Users',  title: 'User Management',      path: '/dashboard/users', icon: '👥' },
  { group: 'Admin/Tenant', title: 'Tenant Onboarding',    path: '/dashboard/tenant-setup', icon: '🏢' },
  { group: 'Admin/Tenant', title: 'Billing & Plan',       path: '/dashboard/admin/billing', icon: '💎' },
  { group: 'Admin/Tenant', title: 'Brand Customizer',     path: '/dashboard/admin/branding', icon: '🎨' },
  { group: 'Admin/Data',   title: 'Reports & Analytics',  path: '/dashboard/reports', icon: '📊' },
  { group: 'Admin/Data',   title: 'Executive View',       path: '/dashboard/executive', icon: '📺' },
  { group: 'Admin/Data',   title: 'Compliance Engine',    path: '/dashboard/compliance', icon: '📋' },
  { group: 'Admin/IT',     title: 'Health Monitor',       path: '/dashboard/health', icon: '🔍' },
  { group: 'Admin/IT',     title: 'App Registry',         path: '/dashboard/app-registry', icon: '📱' },
  { group: 'Admin/IT',     title: 'Support 3.0',          path: '/dashboard/support3', icon: '🚀' },
  { group: 'Admin/IT',     title: 'E2E Monitor',          path: '/dashboard/e2e', icon: '🔭' },
]

export default function GlobalNav({ title }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { tenant } = useTenant()
  const [profile,  setProfile]  = useState(null)
  const [unread,   setUnread]   = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef()

  // Omni Search State
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [ticketResults, setTicketResults] = useState([])
  const [availableTools, setAvailableTools] = useState(BASE_TOOLS)
  const [isSearching, setIsSearching] = useState(false)
  const searchInputRef = useRef(null)

  const brandColor = tenant?.brand_primary_color || '#2563eb'
  const tenantName = tenant?.name || 'NexDesk'
  const logoInitial = tenantName[0].toUpperCase()

  useEffect(() => {
    init()
    function handleGlobalClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    
    // Ctrl+K / Cmd+K listener
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
      }
    }

    document.addEventListener('mousedown', handleGlobalClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    } else {
      setSearchQuery('')
      setTicketResults([])
    }
  }, [searchOpen])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) return
    setProfile(p)
    const { count } = await supabase.from('notifications').select('*', { count:'exact', head:true }).eq('user_id', user.id).eq('read', false)
    if (count) setUnread(count)
    
    // Load Admin Tools into search dynamically
    if (['SUPER_ADMIN','ADMIN', 'IT_MANAGER'].includes(p.role)) {
      setAvailableTools([...BASE_TOOLS, ...ADMIN_EXTRA_TOOLS])
    }
  }

  async function handleSearchInput(e) {
    const q = e.target.value
    setSearchQuery(q)
    if (!q.trim()) { setTicketResults([]); return }

    setIsSearching(true)
    const { data } = await supabase
      .from('tickets')
      .select('id, ticket_number, title, status')
      .or(`ticket_number.ilike.%${q}%,title.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(6)
    
    if (data) setTicketResults(data)
    setIsSearching(false)
  }

  const rc      = ROLE_CONFIG[profile?.role] || ROLE_CONFIG.END_USER
  const isAdmin = ['SUPER_ADMIN','ADMIN','IT_MANAGER'].includes(profile?.role)
  const isAgent = ['SUPER_ADMIN','ADMIN','IT_MANAGER','L1_AGENT','L2_AGENT','DEVELOPER'].includes(profile?.role)
  const isActive = (path) => pathname?.startsWith(path)

  const filteredTools = availableTools.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <>
      <style>{`
        @keyframes nd-down { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes modal-pop { from{opacity:0;transform:scale(0.95) translateY(-20px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes overlay-fade { from{opacity:0} to{opacity:1} }
        
        .nd-link { padding:6px 12px; border-radius:6px; font-size:13px; font-weight:500; cursor:pointer; border:none; background:transparent; color:#6b7280; font-family:'DM Sans',sans-serif; transition:all 0.15s; text-decoration:none; white-space:nowrap; }
        .nd-link:hover { color:#111827; background:#f3f4f6; }
        .nd-link.active { color:${brandColor}; background:${brandColor}10; font-weight:600; }
        .nd-link.primary { background:${brandColor} !important; color:#fff !important; font-weight:600 !important; padding:6px 16px !important; }
        .nd-link.primary:hover { filter: brightness(0.9); }
        .nd-iconbtn { width:36px; height:36px; border-radius:8px; background:transparent; border:1px solid #e5e7eb; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.15s; position:relative; color:#6b7280; }
        .nd-iconbtn:hover { background:#f9fafb; border-color:#d1d5db; color:#374151; }
        .nd-mi { display:flex; align-items:center; gap:10px; padding:8px 12px; font-size:13px; color:#374151; cursor:pointer; border-radius:7px; transition:all 0.15s; }
        .nd-mi:hover { background:#f9fafb; }
        .nd-mi.danger { color:#dc2626; }
        .nd-mi.danger:hover { background:#fef2f2; }
        .search-trigger { flex:1; max-width:280px; margin:0 20px; height:34px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:8px; display:flex; alignItems:center; padding:0 12px; color:#9ca3af; font-size:13px; cursor:pointer; transition:all 0.2s; justify-content:space-between; }
        .search-trigger:hover { background:#fff; border-color:#d1d5db; box-shadow:0 1px 3px rgba(0,0,0,0.05); }
        .search-k { font-size:10px; border:1px solid #d1d5db; padding:2px 6px; borderRadius:4px; font-family:monospace; color:#6b7280; background:#fff; }
        .omni-res { display:flex; flex-direction:column; gap:4px; margin-bottom:16px; }
        .omni-item { display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:8px; cursor:pointer; transition:background 0.1s; border:1px solid transparent; }
        .omni-item:hover { background:#f8fafc; border-color:#e2e8f0; }
        .omni-item-title { font-size:14px; fontWeight:600; color:#111827; }
        .omni-item-sub { font-size:12px; color:#6b7280; margin-top:2px; }
      `}</style>

      {/* ── PROJECT GLOBAL SEARCH MODAL (CMD+K) ── */}
      {searchOpen && (
        <div style={{ position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(17,24,39,0.4)', backdropFilter:'blur(4px)', zIndex:9999, display:'flex', justifyContent:'center', paddingTop:'10vh', animation:'overlay-fade 0.2s ease' }} onClick={() => setSearchOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width:'600px', maxWidth:'90%', background:'#fff', borderRadius:'16px', boxShadow:'0 20px 40px rgba(0,0,0,0.2)', border:'1px solid #e5e7eb', overflow:'hidden', display:'flex', flexDirection:'column', animation:'modal-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            
            {/* Search Input */}
            <div style={{ display:'flex', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid #f3f4f6' }}>
              <span style={{ fontSize:20, color:'#9ca3af', marginRight:14 }}>🔍</span>
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search tickets, features, or jump to..." 
                value={searchQuery}
                onChange={handleSearchInput}
                style={{ flex:1, border:'none', outline:'none', fontSize:17, color:'#111827', fontFamily:"'DM Sans', sans-serif" }}
              />
              <button onClick={() => setSearchOpen(false)} style={{ background:'#f3f4f6', border:'none', padding:'4px 8px', borderRadius:'6px', fontSize:11, color:'#6b7280', cursor:'pointer', fontWeight:600 }}>ESC</button>
            </div>

            {/* Viewport content */}
            <div style={{ padding:'20px', maxHeight:'60vh', overflowY:'auto' }}>
              
              {/* If no query, show standard quick links */}
              {(!searchQuery) && (
                <>
                  <div style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>Quick Actions</div>
                  <div className="omni-res">
                    {availableTools.slice(0,4).map(t => (
                      <div key={t.title} className="omni-item" onClick={() => { setSearchOpen(false); router.push(t.path === 'ROLE_DASH' ? rc.dash : t.path) }}>
                        <div style={{ fontSize:20 }}>{t.icon}</div>
                        <div>
                          <div className="omni-item-title">{t.title}</div>
                          <div className="omni-item-sub">Jump to {t.group}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Search Results */}
              {searchQuery && (
                <>
                  {ticketResults.length > 0 && (
                    <>
                      <div style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>Tickets Found</div>
                      <div className="omni-res">
                        {ticketResults.map(t => (
                          <div key={t.id} className="omni-item" onClick={() => { setSearchOpen(false); router.push(`/tickets/${t.id}`) }}>
                            <div style={{ background: t.status==='resolved'?'#dcfce7':'#e0e7ff', width:36, height:36, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🎫</div>
                            <div>
                              <div className="omni-item-title">{t.ticket_number} <span style={{ fontWeight:400, color:'#4b5563' }}>- {t.title}</span></div>
                              <div className="omni-item-sub">Status: {t.status}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {filteredTools.length > 0 && (
                    <>
                      <div style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8, marginTop: ticketResults.length ? 16 : 0 }}>Features & Pages</div>
                      <div className="omni-res">
                        {filteredTools.map(t => (
                          <div key={t.title} className="omni-item" onClick={() => { setSearchOpen(false); router.push(t.path === 'ROLE_DASH' ? rc.dash : t.path) }}>
                            <div style={{ fontSize:20 }}>{t.icon}</div>
                            <div>
                              <div className="omni-item-title">{t.title}</div>
                              <div className="omni-item-sub">{t.group} Page</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {!isSearching && ticketResults.length === 0 && filteredTools.length === 0 && (
                    <div style={{ padding:'40px 0', textAlign:'center', color:'#6b7280' }}>
                      <div style={{ fontSize:32, marginBottom:10 }}>🤔</div>
                      No results found for "{searchQuery}"
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Modal Footer */}
            <div style={{ background:'#f9fafb', padding:'10px 20px', borderTop:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:12, color:'#9ca3af', display:'flex', alignItems:'center', gap:10 }}>
                <span><kbd style={{ background:'#fff', border:'1px solid #e5e7eb', padding:'2px 5px', borderRadius:4, margin:'0 4px', fontSize:10 }}>↑↓</kbd> to navigate</span>
                <span><kbd style={{ background:'#fff', border:'1px solid #e5e7eb', padding:'2px 5px', borderRadius:4, margin:'0 4px', fontSize:10 }}>↵</kbd> to select</span>
              </div>
              <div style={{ fontSize:12, fontWeight:600, color:'#2563eb' }}>NexDesk Global Search</div>
            </div>
          </div>
        </div>
      )}

      {/* ── STANDARD NAVIGATION BAR ── */}
      <nav style={{ height:56, background:'#ffffff', borderBottom:'1px solid #e5e7eb', padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:200, fontFamily:"'DM Sans',sans-serif", boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>

        {/* LEFT */}
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          {/* Logo */}
          <button onClick={() => router.push(rc.dash)} style={{ display:'flex', alignItems:'center', gap:8, background:'transparent', border:'none', cursor:'pointer', padding:'0 8px 0 0', marginRight:4 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:brandColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:'#fff' }}>{logoInitial}</div>
            <span style={{ fontSize:16, fontWeight:800, color:'#111827', letterSpacing:'-0.3px' }}>{tenantName.split(' ')[0]}<span style={{ color:brandColor }}>{tenantName.split(' ')[1] || ''}</span></span>
          </button>

          <div style={{ width:1, height:20, background:'#e5e7eb', margin:'0 8px' }}/>

          {/* Nav Links */}
          <button className={`nd-link${isActive(rc.dash) ? ' active' : ''}`} onClick={() => router.push(rc.dash)}>Dashboard</button>
          <button className={`nd-link${isActive('/tickets') && !isActive('/tickets/new') ? ' active' : ''}`} onClick={() => router.push('/tickets')}>Tickets</button>
          {isAgent && <button className={`nd-link${isActive('/log-analyzer') ? ' active' : ''}`} onClick={() => router.push('/log-analyzer')}>Log Analyzer</button>}
          {isAdmin && <button className={`nd-link${isActive('/dashboard/reports') ? ' active' : ''}`} onClick={() => router.push('/dashboard/reports')}>Reports</button>}
          {isAdmin && <button className={`nd-link${isActive('/dashboard/admin') ? ' active' : ''}`} onClick={() => router.push('/dashboard/admin')}>Admin Tools</button>}
          {profile?.role === 'SUPER_ADMIN' && <button className={`nd-link${isActive('/super-admin') ? ' active' : ''}`} onClick={() => router.push('/super-admin')} style={{ color:'#3b82f6', fontWeight:700 }}>Elite Founder Hub</button>}
        </div>

        {/* CENTER SEARCH */}
        <button className="search-trigger" onClick={() => setSearchOpen(true)}>
          <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ fontSize:14 }}>🔍</span> Search globally...</span>
          <span className="search-k">Ctrl K</span>
        </button>

        {/* RIGHT */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button className="nd-link primary" onClick={() => router.push('/tickets/new')}>+ Create</button>
          
          <div style={{ width:1, height:20, background:'#e5e7eb', margin:'0 4px' }}/>

          {/* Role Badge */}
          <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, background:rc.bg, color:rc.color, border:`1px solid ${rc.color}30` }}>
            {rc.label}
          </span>

          {/* Notifications */}
          <button className="nd-iconbtn" onClick={() => router.push('/notifications')} style={{ fontSize:16 }}>
            🔔
            {unread > 0 && (
              <span style={{ position:'absolute', top:-4, right:-4, background:'#ef4444', color:'#fff', fontSize:9, fontWeight:800, borderRadius:'50%', width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* Profile */}
          <div style={{ position:'relative' }} ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 10px', background: menuOpen ? '#f9fafb' : 'transparent', border:'1px solid #e5e7eb', borderRadius:8, cursor:'pointer', transition:'all 0.15s' }}>
              <div style={{ width:26, height:26, borderRadius:'50%', background:'#2563eb', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff' }}>
                {(profile?.full_name || profile?.email || 'U')[0].toUpperCase()}
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            {menuOpen && (
              <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, width:220, background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:8, animation:'nd-down 0.15s ease', boxShadow:'0 10px 40px rgba(0,0,0,0.1)', zIndex:300 }}>
                <div style={{ padding:'10px 12px 12px', borderBottom:'1px solid #f3f4f6', marginBottom:4 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#111827' }}>{profile?.full_name || 'User'}</div>
                  <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{profile?.email}</div>
                </div>
                <div className="nd-mi" onClick={() => { setMenuOpen(false); router.push(rc.dash) }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                  My Dashboard
                </div>
                <div className="nd-mi" onClick={() => { setMenuOpen(false); router.push('/tickets/new') }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  New Ticket
                </div>
                {isAdmin && (
                  <div className="nd-mi" onClick={() => { setMenuOpen(false); router.push('/dashboard/admin/settings') }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                    Workspace Settings
                  </div>
                )}
                <div style={{ height:1, background:'#f3f4f6', margin:'6px 0' }}/>
                <div className="nd-mi danger" onClick={async () => { setMenuOpen(false); await supabase.auth.signOut(); router.replace('/login') }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sign Out
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}

