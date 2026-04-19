'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../lib/supabase'
import GlobalNav from '../components/GlobalNav'

export default function TenantSetup() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [msg, setMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: '',
    subdomain: '',
    brandColor: '#2563eb'
  })

  useEffect(() => {
    init()
  }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    setProfile(p)
    setLoading(false)
  }

  async function handleCreateTenant() {
    if (!form.name || !form.subdomain) {
      setMsg('❌ Company Name and Subdomain are required')
      return
    }
    setSubmitting(true)
    
    try {
      // 1. Create the tenant
      const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .insert({
          name: form.name,
          subdomain: form.subdomain.toLowerCase().replace(/\s+/g, '-'),
          brand_primary_color: form.brandColor,
          billing_plan: 'trial'
        })
        .select()
        .single()

      if (tenantErr) { setMsg('❌ ' + tenantErr.message); setSubmitting(false); return }

      // 2. Associate the current user with this tenant
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ tenant_id: tenant.id })
        .eq('id', profile.id)

      if (profileErr) { setMsg('❌ Profile update failed: ' + profileErr.message); setSubmitting(false); return }

      setMsg('✅ Tenant registered successally! Redirecting...')
      setTimeout(() => {
        router.push(profile.role === 'ADMIN' ? '/dashboard/admin' : '/dashboard/user')
      }, 2000)

    } catch (e) {
      setMsg('❌ Error: ' + e.message)
      setSubmitting(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', color: '#e2e8f0', fontFamily: 'sans-serif' }}>
      <GlobalNav title="Tenant Onboarding" />
      
      <div style={{ maxWidth: 500, margin: '80px auto', padding: '32px', background: '#111827', borderRadius: 24, border: '1px solid #1f2d45' }}>
        <h1 style={{ marginBottom: 8 }}>🚀 Onboard your Company</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 32 }}>Create your isolated workspace and custom branding on NexDesk.</p>

        {msg && <div style={{ padding: '12px', borderRadius: 8, background: msg.startsWith('✅') ? '#064e3b' : '#450a0a', color: msg.startsWith('✅') ? '#6ee7b7' : '#fca5a5', marginBottom: 20 }}>{msg}</div>}

        <div style={{ display: 'grid', gap: 24 }}>
          {/* Subdomain Input with dynamic pre-fill suggestion */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8, letterSpacing: '0.5px' }}>WORKSPACE URL / SUBDOMAIN</label>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid #1f2d45', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
               <input 
                 type="text" 
                 value={form.subdomain} 
                 onChange={e => {
                   const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                   setForm({...form, subdomain: val, name: val.charAt(0).toUpperCase() + val.slice(1)})
                 }} 
                 placeholder="acme-corp" 
                 style={{ flex: 1, padding: '16px 20px', background: '#0f172a', border: 'none', color: '#fff', fontSize: 16, outline: 'none' }} 
               />
               <div style={{ padding: '0 20px', background: '#1e293b', display: 'flex', alignItems: 'center', color: '#cbd5e1', fontWeight: 600, fontSize: 15, borderLeft: '1px solid #1f2d45' }}>
                 .nexdesk.com
               </div>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>This will be your team's dedicated login URL.</p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8, letterSpacing: '0.5px' }}>LEGAL COMPANY NAME</label>
            <input 
              type="text" 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})} 
              placeholder="e.g. Acme Corporation Inc." 
              style={{ width: '100%', padding: '16px 20px', background: '#0f172a', border: '1px solid #1f2d45', borderRadius: 12, color: '#fff', fontSize: 15, outline: 'none', transition: 'all 0.2s' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8, letterSpacing: '0.5px' }}>BRAND IDENTITY COLOR</label>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#0f172a', padding: 8, borderRadius: 12, border: '1px solid #1f2d45' }}>
               <input 
                 type="color" 
                 value={form.brandColor} 
                 onChange={e => setForm({...form, brandColor: e.target.value})} 
                 style={{ width: 44, height: 44, border: 'none', outline: 'none', borderRadius: 8, background: 'none', cursor: 'pointer' }} 
               />
               <span style={{ fontSize: 15, fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>{form.brandColor.toUpperCase()}</span>
               
               <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, paddingRight: 8 }}>
                 {['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e'].map(c => (
                   <button key={c} type="button" onClick={() => setForm({...form, brandColor: c})} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: `2px solid ${form.brandColor === c ? '#fff' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.2s' }} />
                 ))}
               </div>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>AI-generated portals will adapt to your primary color.</p>
          </div>

          <button onClick={handleCreateTenant} disabled={submitting} 
            style={{ 
              padding: '18px', 
              background: `linear-gradient(135deg, ${form.brandColor}, ${form.brandColor}cc)`, 
              border: 'none', 
              borderRadius: 12, 
              color: '#fff', 
              fontWeight: 800, 
              fontSize: 16,
              cursor: 'pointer', 
              marginTop: 16,
              boxShadow: `0 10px 25px -5px ${form.brandColor}66`,
              transition: 'all 0.3s',
              transform: submitting ? 'scale(0.98)' : 'scale(1)'
            }}>
            {submitting ? 'Initializing Workspace & AI Agents...' : 'Deploy Workspace'}
          </button>
        </div>
      </div>
      
      <div style={{ position: 'fixed', bottom: 30, width: '100%', textAlign: 'center', color: '#475569', fontSize: 12 }}>
        <p>Secured by NexDesk Enterprise Architecture • SOC2 Compliant</p>
      </div>
    </div>
  )
}

