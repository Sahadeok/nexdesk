'use client'
import { useEffect } from 'react'
import { createClient, getCurrentUserProfile } from '../lib/supabase'

export default function DashboardRouter() {
  const supabase = createClient()

  useEffect(() => { route() }, [])

  async function route() {
    // ✅ refreshSession hits Supabase server — guarantees fresh user, no stale cache
    try { await supabase.auth.refreshSession() } catch(_) {}

    const { user, profile } = await getCurrentUserProfile(supabase)
    if (!user) { window.location.replace('/login'); return }

    const role = profile?.role
    // ✅ window.location.replace = full browser navigation
    // bypasses Next.js route cache entirely — always loads correct dashboard
    if      (role === 'ADMIN')      window.location.replace('/dashboard/admin')
    else if (role === 'IT_MANAGER') window.location.replace('/dashboard/admin')
    else if (role === 'L1_AGENT')   window.location.replace('/dashboard/l1')
    else if (role === 'L2_AGENT')   window.location.replace('/dashboard/l2')
    else if (role === 'DEVELOPER')  window.location.replace('/dashboard/developer')
    else                            window.location.replace('/dashboard/user')
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#06b6d4', animation:'spin 0.7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
