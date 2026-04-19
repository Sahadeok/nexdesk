'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../../lib/supabase'
import { useTenant } from '../../../../lib/tenant-context'
import GlobalNav from '../../../components/GlobalNav'

const MURAL_PRESETS = [
  { label: 'Cyber Grid', value: '', preview: 'linear-gradient(135deg,#0a0e1a,#0f1e35)' },
  { label: 'Ocean Deep', value: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=1280&q=80', preview: 'url(https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=200&q=60) center/cover' },
  { label: 'City Night', value: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1280&q=80', preview: 'url(https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=200&q=60) center/cover' },
  { label: 'Forest Mist', value: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1280&q=80', preview: 'url(https://images.unsplash.com/photo-1448375240586-882707db888b?w=200&q=60) center/cover' },
  { label: 'Mountains', value: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&q=80', preview: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=60) center/cover' },
  { label: 'Abstract Tech', value: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1280&q=80', preview: 'url(https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&q=60) center/cover' },
]

const COLOR_PRESETS = [
  '#2563eb', '#7c3aed', '#dc2626', '#059669', '#d97706', '#0891b2', '#db2777', '#4f46e5'
]

export default function BrandingPage() {
  const router = useRouter()
  const supabase = createClient()
  const { tenant, setTenant } = useTenant()

  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({
    name: '',
    brand_primary_color: '#2563eb',
    mural_url: '',
    login_welcome: 'Welcome to NexDesk IT Support',
    logo_url: '',
    subdomain: '',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [preview, setPreview] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    if (!['ADMIN', 'IT_MANAGER'].includes(p?.role)) { router.replace('/dashboard'); return }
    setProfile(p)

    if (tenant) {
      setForm({
        name: tenant.name || '',
        brand_primary_color: tenant.brand_primary_color || '#2563eb',
        mural_url: tenant.mural_url || '',
        login_welcome: tenant.login_welcome || 'Welcome to NexDesk IT Support',
        logo_url: tenant.logo_url || '',
        subdomain: tenant.subdomain || '',
      })
    }
  }

  // Sync form from tenant context when it loads
  useEffect(() => {
    if (tenant && !form.name) {
      setForm({
        name: tenant.name || '',
        brand_primary_color: tenant.brand_primary_color || '#2563eb',
        mural_url: tenant.mural_url || '',
        login_welcome: tenant.login_welcome || 'Welcome to NexDesk IT Support',
        logo_url: tenant.logo_url || '',
        subdomain: tenant.subdomain || '',
      })
    }
  }, [tenant])

  async function handleSave() {
    if (!tenant?.id) { setMsg('❌ No active workspace found. Please onboard first.'); return }
    setSaving(true)
    setMsg('')

    const { data, error } = await supabase
      .from('tenants')
      .update({
        name: form.name,
        brand_primary_color: form.brand_primary_color,
        mural_url: form.mural_url || null,
        login_welcome: form.login_welcome,
        logo_url: form.logo_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenant.id)
      .select()
      .single()

    if (error) {
      setMsg('❌ Failed to save: ' + error.message)
    } else {
      setTenant(data)
      setMsg('✅ Brand settings saved! Your login page has been updated.')
    }
    setSaving(false)
  }

  const brandColor = form.brand_primary_color || '#2563eb'
  const murialBg = form.mural_url
    ? `url('${form.mural_url}') center/cover no-repeat`
    : 'linear-gradient(135deg,#0a0e1a,#0f1e35)'

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', color: '#e2e8f0', fontFamily: 'DM Sans, sans-serif' }}>
      <GlobalNav title="Brand Customizer" />

      <div style={{ maxWidth: 1100, margin: '40px auto', padding: '0 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 32, marginBottom: 8 }}>
            🎨 Brand Customizer
          </h1>
          <p style={{ color: '#64748b' }}>
            Customize your workspace branding. Changes reflect instantly on the login screen for your team.
          </p>
        </div>

        {msg && (
          <div style={{ padding: '12px 20px', borderRadius: 12, background: msg.startsWith('✅') ? '#064e3b40' : '#450a0a40', border: `1px solid ${msg.startsWith('✅') ? '#05966960' : '#dc262660'}`, color: msg.startsWith('✅') ? '#34d399' : '#fca5a5', marginBottom: 24 }}>
            {msg}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 28 }}>

          {/* ── LEFT: Settings Form ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Company Name */}
            <div style={{ background: '#111827', border: '1px solid #1f2d45', borderRadius: 20, padding: 24 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16 }}>🏢 Company Identity</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>COMPANY NAME</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    style={{ width: '100%', padding: '12px 16px', background: '#0f172a', border: '1px solid #1f2d45', borderRadius: 10, color: '#fff', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>LOGO URL (optional)</label>
                  <input type="url" value={form.logo_url} onChange={e => setForm({...form, logo_url: e.target.value})}
                    placeholder="https://yourcompany.com/logo.png"
                    style={{ width: '100%', padding: '12px 16px', background: '#0f172a', border: '1px solid #1f2d45', borderRadius: 10, color: '#fff', fontSize: 14 }} />
                </div>
              </div>
            </div>

            {/* Brand Color */}
            <div style={{ background: '#111827', border: '1px solid #1f2d45', borderRadius: 20, padding: 24 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16 }}>🎨 Brand Color</h3>

              {/* Color presets */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                {COLOR_PRESETS.map(c => (
                  <button key={c} onClick={() => setForm({...form, brand_primary_color: c})}
                    style={{ width: 36, height: 36, borderRadius: 10, background: c, border: `3px solid ${form.brand_primary_color === c ? '#fff' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.2s' }} />
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <input type="color" value={form.brand_primary_color} onChange={e => setForm({...form, brand_primary_color: e.target.value})}
                  style={{ width: 48, height: 48, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 8 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{form.brand_primary_color}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>Custom HEX color</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  {['Nav Bar', 'Login Button', 'Badges'].map(label => (
                    <div key={label} style={{ padding: '4px 10px', borderRadius: 20, background: brandColor + '20', color: brandColor, fontSize: 11, fontWeight: 600, border: `1px solid ${brandColor}40` }}>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mural */}
            <div style={{ background: '#111827', border: '1px solid #1f2d45', borderRadius: 20, padding: 24 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>🖼️ Login Mural</h3>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
                <em>Choose a preset or paste your own image URL</em>
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                {MURAL_PRESETS.map(mp => (
                  <button key={mp.label} onClick={() => setForm({...form, mural_url: mp.value})}
                    style={{ padding: 0, border: `2px solid ${form.mural_url === mp.value ? brandColor : '#1f2d45'}`, borderRadius: 12, cursor: 'pointer', overflow: 'hidden', transition: 'all 0.2s' }}>
                    <div style={{ height: 56, background: mp.preview }} />
                    <div style={{ padding: '6px 8px', background: '#0f172a', color: form.mural_url === mp.value ? brandColor : '#94a3b8', fontSize: 11, fontWeight: 600 }}>
                      {mp.label}
                    </div>
                  </button>
                ))}
              </div>

              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>CUSTOM IMAGE URL</label>
              <input type="url" value={form.mural_url} onChange={e => setForm({...form, mural_url: e.target.value})}
                placeholder="https://images.unsplash.com/photo-..."
                style={{ width: '100%', padding: '12px 16px', background: '#0f172a', border: '1px solid #1f2d45', borderRadius: 10, color: '#fff', fontSize: 14 }} />
            </div>

            {/* Welcome Text */}
            <div style={{ background: '#111827', border: '1px solid #1f2d45', borderRadius: 20, padding: 24 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>💬 Login Welcome Message</h3>
              <p style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>Use " — " (dash) to split into two lines. Example: <em>Acme IT — Help is here</em></p>
              <input type="text" value={form.login_welcome} onChange={e => setForm({...form, login_welcome: e.target.value})}
                placeholder="Acme IT — Help is Here"
                style={{ width: '100%', padding: '12px 16px', background: '#0f172a', border: '1px solid #1f2d45', borderRadius: 10, color: '#fff', fontSize: 14 }} />
            </div>

            <button onClick={handleSave} disabled={saving}
              style={{ padding: '16px', background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)`, border: 'none', borderRadius: 14, color: '#fff', fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: `0 4px 20px ${brandColor}40`, transition: 'all 0.2s' }}>
              {saving ? '💾 Saving...' : '💾 Save Brand Settings'}
            </button>
          </div>

          {/* ── RIGHT: Live Preview ── */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ background: '#111827', border: '1px solid #1f2d45', borderRadius: 20, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #1f2d45', fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>
                👁️ Live Login Preview
              </div>

              {/* Mini login preview */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 340 }}>
                {/* Mural side */}
                <div style={{ background: murialBg, position: 'relative', padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <div style={{ position: 'absolute', inset: 0, background: form.mural_url ? 'rgba(0,0,0,0.45)' : 'transparent' }} />
                  <div style={{ position: 'relative', zIndex: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff' }}>
                        {form.logo_url ? <img src={form.logo_url} style={{ width: '100%', height: '100%', borderRadius: 6 }} /> : (form.name?.[0]?.toUpperCase() || 'N')}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#fff' }}>{form.name || 'NexDesk'}</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 11, color: '#fff', lineHeight: 1.4 }}>
                      {form.login_welcome.split('—')[0]}
                      {form.login_welcome.includes('—') && <><br /><span style={{ color: brandColor }}>{form.login_welcome.split('—')[1]}</span></>}
                    </div>
                  </div>
                </div>

                {/* Login form side */}
                <div style={{ background: '#080c17', padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Welcome back</div>
                  <div style={{ height: 28, background: '#111827', border: '1px solid #1f2d45', borderRadius: 6 }} />
                  <div style={{ height: 28, background: '#111827', border: '1px solid #1f2d45', borderRadius: 6 }} />
                  <div style={{ height: 28, background: brandColor, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                    Sign In
                  </div>
                  <div style={{ fontSize: 9, color: '#334155', textAlign: 'center' }}>🔒 256-bit encrypted</div>
                </div>
              </div>

              {/* Nav preview */}
              <div style={{ padding: '10px 16px', background: '#fff', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, background: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff' }}>
                  {form.name?.[0]?.toUpperCase() || 'N'}
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#111827' }}>{form.name || 'NexDesk'}</span>
                <div style={{ marginLeft: 'auto', padding: '3px 10px', background: brandColor, borderRadius: 20, color: '#fff', fontSize: 9, fontWeight: 700 }}>+ New Ticket</div>
              </div>

              {/* Color preview strip */}
              <div style={{ padding: 16, borderTop: '1px solid #1f2d45' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>BRAND COLOR APPLIED TO</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['Buttons', 'Badges', 'Active Nav', 'Cards', 'Links'].map(label => (
                    <div key={label} style={{ padding: '4px 10px', background: brandColor + '20', color: brandColor, borderRadius: 20, fontSize: 10, fontWeight: 600, border: `1px solid ${brandColor}40` }}>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

