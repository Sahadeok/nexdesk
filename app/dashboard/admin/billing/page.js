'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../../lib/supabase'
import { useTenant } from '../../../../lib/tenant-context'
import GlobalNav from '../../../components/GlobalNav'

export default function BillingPage() {
  const router = useRouter()
  const supabase = createClient()
  const { tenant, setTenant } = useTenant()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const PLANS = {
    free: { name: 'Free', price: '$0', limit: 50, features: ['Core Ticketing', 'Email Support', '1 Agent'] },
    pro: { name: 'Pro', price: '$49/mo', limit: 500, features: ['AI Resolution', 'Service Monitoring', '5 Agents', 'Custom Branding'] },
    enterprise: { name: 'Enterprise', price: 'Custom', limit: 10000, features: ['Autonomous Agent', 'WhatsApp Dev Bot', 'Unlimited Agents', 'API Access'] }
  }

  const currentPlan = PLANS[tenant?.billing_plan || 'free'] || PLANS.free
  const used = tenant?.tickets_used_this_month || 0
  const progress = Math.min(100, (used / currentPlan.limit) * 100)

  async function handleUpgrade(planId) {
    setLoading(true)
    setMsg('')
    try {
      const { data, error } = await supabase
        .from('tenants')
        .update({ billing_plan: planId })
        .eq('id', tenant.id)
        .select()
        .single()
      
      if (error) throw error
      setTenant(data)
      setMsg('✅ Plan upgraded successfuly! Welcome to ' + PLANS[planId].name)
    } catch (e) {
      setMsg('❌ Upgrade failed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!tenant) return <div>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', color: '#e2e8f0', fontFamily: 'sans-serif' }}>
      <GlobalNav title="Billing & Subscription" />
      
      <div style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 32, marginBottom: 8 }}>💎 Billing & Plan</h1>
        <p style={{ color: '#64748b', marginBottom: 32 }}>Manage your workspace subscription and usage limits.</p>

        {msg && <div style={{ padding: '12px 20px', borderRadius: 12, background: msg.startsWith('✅') ? '#064e3b40' : '#450a0a40', border: `1px solid ${msg.startsWith('✅') ? '#05966960' : '#dc262660'}`, color: msg.startsWith('✅') ? '#34d399' : '#fca5a5', marginBottom: 24 }}>{msg}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, marginBottom: 40 }}>
          
          {/* Main Info */}
          <div style={{ background: '#111827', padding: 32, borderRadius: 24, border: '1px solid #1f2d45' }}>
            <h2 style={{ fontSize: 20, marginBottom: 20 }}>Current Plan: <span style={{ color: '#3b82f6', fontWeight: 800 }}>{currentPlan.name}</span></h2>
            
            <div style={{ marginBottom: 32 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>
                 <span>MONTHLY USAGE</span>
                 <span>{used} / {currentPlan.limit} Tickets</span>
               </div>
               <div style={{ height: 8, background: '#1f2d45', borderRadius: 4, overflow: 'hidden' }}>
                 <div style={{ height: '100%', width: `${progress}%`, background: progress > 85 ? '#ef4444' : '#3b82f6', transition: 'width 0.5s' }} />
               </div>
               {progress > 85 && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>⚠️ Warning: You are approaching your monthly ticket limit.</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
               <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>BILLING STATUS</div>
                  <div style={{ fontSize: 14 }}>{tenant?.subscription_status?.toUpperCase() || 'ACTIVE'}</div>
               </div>
               <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>BILLING CYCLE</div>
                  <div style={{ fontSize: 14 }}>Ends: {new Date(new Date().setDate(new Date().getDate() + 25)).toLocaleDateString()}</div>
               </div>
            </div>
          </div>

          {/* Action Card */}
          <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', padding: 24, borderRadius: 24, display: 'flex', flexDirection: 'column', color: '#fff' }}>
             <h3 style={{ fontSize: 18, marginBottom: 12 }}>Need more power?</h3>
             <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5, marginBottom: 20 }}>Enterprise plans unlock the Autonomous Agent and unlimited ticket capacity.</p>
             <button style={{ marginTop: 'auto', padding: '12px', background: '#fff', color: '#1e3a8a', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>Talk to Sales</button>
          </div>
        </div>

        {/* Plan Grid */}
        <h3 style={{ marginBottom: 20 }}>🚀 Upgrade Options</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {Object.entries(PLANS).map(([id, plan]) => (
            <div key={id} style={{ background: '#111827', padding: 24, borderRadius: 24, border: `2px solid ${id === tenant.billing_plan ? '#3b82f6' : '#1f2d45'}`, position: 'relative', transition: 'all 0.2s' }}>
              {id === tenant.billing_plan && <div style={{ position: 'absolute', top: 12, right: 12, background: '#3b82f6', color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 20 }}>ACTIVE</div>}
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{plan.name}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 20 }}>{plan.price}</div>
              
              <ul style={{ padding: 0, margin: '0 0 24px 0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                 {plan.features.map(f => <li key={f} style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8 }}>✅ {f}</li>)}
              </ul>
              
              <button 
                onClick={() => handleUpgrade(id)} 
                disabled={id === tenant.billing_plan || loading}
                style={{ width: '100%', padding: '10px', background: id === tenant.billing_plan ? 'transparent' : '#1e293b', border: id === tenant.billing_plan ? '1px solid #1f2d45' : 'none', borderRadius: 10, color: id === tenant.billing_plan ? '#64748b' : '#fff', fontWeight: 600, cursor: id === tenant.billing_plan ? 'default' : 'pointer' }}>
                {id === tenant.billing_plan ? 'Current Plan' : 'Select ' + plan.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

