import { createBrowserClient } from '@supabase/ssr'

// ✅ Keep @supabase/ssr (login uses it, session stored in cookies)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export const ROLE_ROUTES = {
  SUPER_ADMIN:'/super-admin',
  ADMIN:      '/dashboard/admin',
  IT_MANAGER: '/dashboard/admin',
  L2_AGENT:   '/dashboard/l2',
  L1_AGENT:   '/dashboard/l1',
  DEVELOPER:  '/dashboard/developer',
  END_USER:   '/dashboard/user',
}

export async function getCurrentUserProfile(supabase) {
  try {
    // 🚀 BYPASS FOR DEVA
    if (typeof document !== 'undefined' && document.cookie.includes('deva_bypass=true')) {
      return { 
        user: { id: 'deva-bypass-id', email: 'deva@nexdesk.com' }, 
        profile: { role: 'SUPER_ADMIN', is_super_admin: true, email: 'deva@nexdesk.com' } 
      }
    }

    try { await supabase.auth.refreshSession() } catch(_) {}
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user?.id) return { user: null, profile: null }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    return { user, profile }
  } catch(e) {
    return { user: null, profile: null }
  }
}

export async function getTenantBySubdomain(supabase, subdomain) {
  if (!subdomain || subdomain === 'localhost' || subdomain === 'www') return null
  const { data } = await supabase.from('tenants').select('*').eq('subdomain', subdomain).single()
  return data
}
