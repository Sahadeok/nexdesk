import { createBrowserClient } from '@supabase/ssr'

// ✅ Keep @supabase/ssr (login uses it, session stored in cookies)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export const ROLE_ROUTES = {
  ADMIN:      '/dashboard/admin',
  IT_MANAGER: '/dashboard/admin',
  L2_AGENT:   '/dashboard/l2',
  L1_AGENT:   '/dashboard/l1',
  DEVELOPER:  '/dashboard/developer',
  END_USER:   '/dashboard/user',
}

export async function getCurrentUserProfile(supabase) {
  try {
    // ✅ refreshSession first — ensures we never read a stale/previous user's session
    // This is critical when switching between users on the same browser
    try { await supabase.auth.refreshSession() } catch(_) {}

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user?.id) return { user: null, profile: null }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      const newProfile = {
        id:        user.id,
        email:     user.email,
        full_name: user.email?.split('@')[0] || 'User',
        role:      'END_USER',
      }
      await supabase.from('profiles').insert(newProfile)
      return { user, profile: newProfile }
    }

    return { user, profile }

  } catch(e) {
    console.error('[supabase] getCurrentUserProfile error:', e)
    return { user: null, profile: null }
  }
}
