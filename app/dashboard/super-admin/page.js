'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

export default function SuperAdminDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [tenants, setTenants] = useState([])
  const [metrics, setMetrics] = useState({
    mrr: 0,
    totalTenants: 0,
    activeAgents: 0,
    trialing: 0
  })

  // Mock plan prices for MRR calculation
  const PLAN_PRICES = {
    trial: 0,
    free: 0,
    pro: 49,
    enterprise: 299 // mock base
  }

  useEffect(() => { init() }, [])

  async function init() {
    // 1. Check if user is Super Admin
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    if (p?.is_super_admin !== true) { router.replace('/dashboard'); return }
    setProfile(p)

    // 2. Fetch all tenants across the SaaS platform
    await loadSaaSTenants()
    setLoading(false)
  }

  async function loadSaaSTenants() {
    const { data: tData, error: tErr } = await supabase
      .from('tenants')
      .select('*, profiles(id)')
      .order('created_at', { ascending: false })

    if (tErr) {
      console.error('Failed to load tenants globally. Check RLS policies.', tErr)
      return
    }

    const allTenants = tData || []
    setTenants(allTenants)

    // Calculate Global SaaS Metrics
    let mrr = 0
    let trialing = 0
    let totalAgents = 0

    allTenants.forEach(t => {
      mrr += PLAN_PRICES[t.billing_plan] || 0
      if (t.billing_plan === 'trial') trialing++
      totalAgents += t.profiles?.length || 0
    })

    setMetrics({
      mrr,
      totalTenants: allTenants.length,
      activeAgents: totalAgents,
      trialing
    })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #1f2d45', borderTopColor: '#06b6d4', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ color: '#64748b' }}>Authorizing Global Access...</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', color: '#e2e8f0', fontFamily: 'DM Sans, sans-serif' }}>
      <GlobalNav title="SaaS Global Control Center" />

      <div style={{ maxWidth: 1200, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-block', padding: '4px 8px', background: '#4c1d9540', color: '#a78bfa', fontSize: 11, fontWeight: 800, borderRadius: 6, marginBottom: 8, border: '1px solid #7c3aed40' }}>SUPER ADMIN</div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 32, margin: 0 }}>Global SaaS Overview</h1>
            <p style={{ color: '#64748b', marginTop: 8 }}>Monitor revenue, companies, and system health across the entire platform.</p>
          </div>
          <button onClick={loadSaaSTenants} style={{ padding: '10px 16px', background: '#111827', border: '1px solid #1f2d45', borderRadius: 8, color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            🔄 Refresh Hub
          </button>
        </div>

        {/* Global SaaS Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
          {[
            { label: 'Monthly Recurring Revenue', value: `$${metrics.mrr.toLocaleString()}`, icon: '💰', color: '#10b981' },
            { label: 'Active Organizations', value: metrics.totalTenants, icon: '🏢', color: '#3b82f6' },
            { label: 'Total Agents (Seats)', value: metrics.activeAgents, icon: '🧑‍💻', color: '#a78bfa' },
            { label: 'Trialing Companies', value: metrics.trialing, icon: '🔥', color: '#f59e0b' }
          ].map((stat, i) => (
             <div key={i} style={{ background: '#111827', border: '1px solid #1f2d45', borderRadius: 16, padding: '24px', position: 'relative', overflow: 'hidden' }}>
               <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 80, opacity: 0.05 }}>{stat.icon}</div>
               <div style={{ fontSize: 24, marginBottom: 12 }}>{stat.icon}</div>
               <div style={{ fontSize: 36, fontWeight: 800, color: stat.color, letterSpacing: '-1px' }}>{stat.value}</div>
               <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, marginTop: 4 }}>{stat.label}</div>
             </div>
          ))}
        </div>

        {/* Organizations List */}
        <div style={{ background: '#111827', border: '1px solid #1f2d45', borderRadius: 16, overflow: 'hidden' }}>
           <div style={{ padding: '20px 24px', borderBottom: '1px solid #1f2d45', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Registered Companies (Tenants)</h2>
             <input type="text" placeholder="Search companies..." style={{ padding: '8px 16px', background: '#0f172a', border: '1px solid #2e1065', borderRadius: 8, color: '#e2e8f0', outline: 'none', fontSize: 13, width: 200 }} />
           </div>

           <div style={{ overflowX: 'auto' }}>
             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                 <tr style={{ background: '#080c17' }}>
                   {['Company Name', 'Subdomain', 'Plan', 'Usage', 'Users', 'Registered', 'Actions'].map(h => (
                     <th key={h} style={{ padding: '14px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                   ))}
                 </tr>
               </thead>
               <tbody>
                 {tenants.map(t => (
                   <tr key={t.id} style={{ borderBottom: '1px solid #1f2d45', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#0f172a'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                     <td style={{ padding: '16px 24px' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                         <div style={{ width: 32, height: 32, borderRadius: 8, background: t.brand_primary_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 800 }}>
                           {t.logo_url ? <img src={t.logo_url} style={{width:'100%', height:'100%', borderRadius:8}} /> : (t.name?.[0]?.toUpperCase() || '🏢')}
                         </div>
                         <div>
                           <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                           <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{t.id.split('-')[0]}...</div>
                         </div>
                       </div>
                     </td>
                     <td style={{ padding: '16px 24px' }}>
                       <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#94a3b8' }}>{t.subdomain}.nexdesk</span>
                     </td>
                     <td style={{ padding: '16px 24px' }}>
                       <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: t.billing_plan === 'pro' ? '#1e3a8a' : t.billing_plan === 'enterprise' ? '#4c1d95' : '#1f2937', color: t.billing_plan === 'pro' ? '#60a5fa' : t.billing_plan === 'enterprise' ? '#a78bfa' : '#9ca3af', textTransform: 'uppercase' }}>
                         {t.billing_plan}
                       </span>
                     </td>
                     <td style={{ padding: '16px 24px' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                         <div style={{ width: 60, height: 6, background: '#1f2d45', borderRadius: 3, overflow: 'hidden' }}>
                           <div style={{ width: `${Math.min(100, (t.tickets_used_this_month / 500) * 100)}%`, height: '100%', background: '#06b6d4' }} />
                         </div>
                         <span style={{ fontSize: 12, color: '#94a3b8' }}>{t.tickets_used_this_month}</span>
                       </div>
                     </td>
                     <td style={{ padding: '16px 24px', fontSize: 13 }}>
                       {t.profiles?.length || 0} Seats
                     </td>
                     <td style={{ padding: '16px 24px', fontSize: 12, color: '#64748b' }}>
                       {new Date(t.created_at).toLocaleDateString()}
                     </td>
                     <td style={{ padding: '16px 24px' }}>
                       <button style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #3b82f640', borderRadius: 6, color: '#60a5fa', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                         Manage View
                       </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    </div>
  )
}

