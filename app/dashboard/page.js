'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../lib/supabase'

export default function DashboardRouter() {
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { route() }, [])

  async function route() {
    const { user, profile } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }

    const role = profile?.role
    if      (role === 'ADMIN')      router.replace('/dashboard/admin')
    else if (role === 'IT_MANAGER') router.replace('/dashboard/admin')
    else if (role === 'L1_AGENT')   router.replace('/dashboard/l1')
    else if (role === 'L2_AGENT')   router.replace('/dashboard/l2')
    else if (role === 'DEVELOPER')  router.replace('/dashboard/developer')
    else                            router.replace('/dashboard/user')
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#06b6d4', animation:'spin 0.7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
