'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

const ROLE_COLORS = {
  ADMIN:      '#ef4444', IT_MANAGER: '#f97316',
  L2_AGENT:   '#8b5cf6', L1_AGENT:   '#3b82f6',
  DEVELOPER:  '#06b6d4', END_USER:   '#10b981',
}

export default function TopBar({ profile, title }) {
  const router  = useRouter()
  const supabase = createClient()

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const roleColor = ROLE_COLORS[profile?.role] || '#64748b'

  return (
    <div style={{
      background: '#111827', borderBottom: '1px solid #1f2d45',
      padding: '0 28px', height: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Left — Logo + page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => router.push('/dashboard')}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg,#3b82f6,#06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>⚡</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: '#e2e8f0' }}>
            Nex<span style={{ color: '#06b6d4' }}>Desk</span>
          </span>
        </div>
        {title && <>
          <span style={{ color: '#1f2d45', fontSize: 18 }}>›</span>
          <span style={{ color: '#94a3b8', fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>{title}</span>
        </>}
      </div>

      {/* Right — Role badge + user + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
          background: roleColor + '20', color: roleColor, border: `1px solid ${roleColor}40`
        }}>
          {profile?.role?.replace('_', ' ') || 'USER'}
        </span>
        <span style={{ fontSize: 13, color: '#64748b' }}>{profile?.email || ''}</span>
        <button onClick={logout} style={{
          background: 'transparent', border: '1px solid #1f2d45',
          color: '#64748b', padding: '6px 14px', borderRadius: 8,
          cursor: 'pointer', fontSize: 12, fontFamily: "'DM Sans',sans-serif",
          transition: 'all 0.2s',
        }}>Sign Out</button>
      </div>
    </div>
  )
}
