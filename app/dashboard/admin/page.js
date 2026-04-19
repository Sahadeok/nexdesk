'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'
import { 
  Database, 
  Cpu, 
  ShieldCheck, 
  Users, 
  BarChart3, 
  FileText, 
  Terminal, 
  Settings,
  ChevronRight,
  Zap,
  LayoutDashboard,
  ShieldAlert
} from 'lucide-react'

// ── ROLE-BASED FEATURE REGISTRY ──
// We filter this list based on the user's role to maintain a "Pure SaaS" experience.
const PILLARS = [
  {
    title: 'Support Operations',
    icon: <Database size={18} color="#3b82f6" />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER'],
    items: [
      { name: 'Master Ticket Queue', path: '/dashboard/admin/tickets', desc: 'Centralized SLA & Queue monitoring' },
      { name: 'SLA Engine', path: '/dashboard/sla-engine', desc: 'Breach rules & Escalation logic' },
      { name: 'Knowledge Brain', path: '/dashboard/kb-admin', desc: 'Self-service AI assist for users' },
      { name: 'Unified Search (Omni)', path: '/dashboard/admin', desc: 'Global ticket/user discovery' },
    ]
  },
  {
    title: 'AI Intelligence Hub',
    icon: <Cpu size={18} color="#8b5cf6" />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER'],
    items: [
      { name: 'Forensic Pilot', path: '/dashboard/agent-console', desc: 'L3 browser-based autonomous tests' },
      { name: 'Change Intelligence', path: '/dashboard/change-intelligence', desc: 'AI CR Writer & Risk Analysis' },
      { name: 'AI SRE War Room', path: '/dashboard/ai-sre', desc: 'Self-healing & L4 Agentic loops' },
      { name: 'AI Analyst', path: '/dashboard/analyst', desc: 'Natural language data discovery' },
    ]
  },
  {
    title: 'Workspace & Security',
    icon: <Users size={18} color="#10b981" />,
    roles: ['SUPER_ADMIN', 'ADMIN'],
    items: [
      { name: 'User Management', path: '/dashboard/users', desc: 'Roles, Permissions & Security' },
      { name: 'Platform Compliance', path: '/dashboard/compliance', desc: 'Regulatory audit & tracking' },
      { name: 'Brand Customizer', path: '/dashboard/admin/branding', desc: 'Logo, Murals & White-labeling' },
      { name: 'SaaS Billing', path: '/dashboard/admin/billing', desc: 'Usage-based quota & invoicing' },
    ]
  },
  {
    title: 'Platform Mastery',
    icon: <ShieldAlert size={18} color="#ec4899" />,
    roles: ['SUPER_ADMIN'],
    items: [
      { name: 'Tenant Onboarding', path: '/dashboard/tenant-setup', desc: 'Add new Enterprise customers' },
      { name: 'System Health', path: '/dashboard/health', desc: 'API uptime & LLM performance' },
      { name: 'Global Meta Settings', path: '/dashboard/admin/settings', desc: 'NexDesk core configurations' },
      { name: 'Agent Fleet Pulse', path: '/dashboard/founder', desc: 'Founder-level mission control' },
    ]
  }
]

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    async function init() {
      const { user, profile: p } = await getCurrentUserProfile(supabase)
      if (!user || !['SUPER_ADMIN','ADMIN','IT_MANAGER'].includes(p?.role)) {
        router.push('/')
        return
      }
      setProfile(p)
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return null

  // Filter pillars based on profile role
  const visiblePillars = PILLARS.filter(p => p.roles.includes(profile.role))

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:'"Inter", sans-serif' }}>
      <GlobalNav title="Admin Hub" />
      
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 24px' }}>
        
        {/* ── ROLE-SENSITIVE WELCOME ── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize:28, fontWeight:800, margin:0, color:'#0f172a' }}>
            {profile.role === 'SUPER_ADMIN' ? 'Elite Founder Command' : 'Workspace Management'}
          </h1>
          <p style={{ color:'#64748b', fontSize:14, margin:'4px 0 0' }}>
            Logged in as <strong style={{ color:'#3b82f6' }}>{profile.role}</strong> for {profile.role === 'SUPER_ADMIN' ? 'NexDesk Platform' : 'Cloud Workspace'}
          </p>
        </div>

        {/* ── PILLAR GRID ── */}
        <div style={{ display:'grid', gridTemplateColumns: `repeat(${visiblePillars.length}, 1fr)`, gap:24 }}>
          {visiblePillars.map((pillar, idx) => (
            <div key={idx} style={{ animation: `fadeIn 0.5s ${idx * 0.1}s ease both` }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, paddingLeft:4 }}>
                <span style={{ background:'rgba(0,0,0,0.03)', padding:8, borderRadius:8, display:'flex' }}>{pillar.icon}</span>
                <span style={{ fontSize:14, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px' }}>{pillar.title}</span>
              </div>

              <div style={{ display:'grid', gap:10 }}>
                {pillar.items.map((item, i) => (
                  <div key={i} 
                    onClick={() => router.push(item.path)}
                    style={{ 
                      background: '#fff', 
                      borderRadius: 14, 
                      padding: '16px 20px', 
                      border: '1px solid #e2e8f0', 
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'space-between',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6'
                      e.currentTarget.style.transform = 'translateX(4px)'
                      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.05)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0'
                      e.currentTarget.style.transform = 'translateX(0)'
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'#0f172a', marginBottom:2 }}>{item.name}</div>
                      <div style={{ fontSize:11, color:'#94a3b8' }}>{item.desc}</div>
                    </div>
                    <ChevronRight size={14} color="#cbd5e1" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
