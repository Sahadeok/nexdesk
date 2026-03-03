'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, ROLE_ROUTES, getCurrentUserProfile } from '../../lib/supabase'

export default function DashboardRouter() {
  const router = useRouter()
  const supabase = createClient()
  useEffect(() => {
    async function route() {
      const { user, profile } = await getCurrentUserProfile(supabase)
      if (!user) { router.replace('/login'); return }
      router.replace(ROLE_ROUTES[profile?.role] || '/dashboard/user')
    }
    route()
  }, [])
  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ width:44, height:44, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#3b82f6', animation:'spin 0.7s linear infinite' }}/>
      <p style={{ color:'#475569', fontSize:14 }}>Loading your dashboard...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
