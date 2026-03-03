import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export const ROLE_ROUTES = {
  ADMIN:      '/dashboard/l2',
  IT_MANAGER: '/dashboard/l2',
  L2_AGENT:   '/dashboard/l2',
  L1_AGENT:   '/dashboard/l1',
  DEVELOPER:  '/dashboard/l1',
  END_USER:   '/dashboard/user',
}

export async function getCurrentUserProfile(supabase) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { user: null, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    const newProfile = { id: user.id, email: user.email, full_name: user.email.split('@')[0], role: 'END_USER' }
    await supabase.from('profiles').insert(newProfile)
    return { user, profile: newProfile }
  }

  return { user, profile }
}
