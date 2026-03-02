import { createBrowserClient } from '@supabase/ssr'

// Client-side Supabase instance (used in components)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Role display names
export const ROLE_LABELS = {
  ADMIN:      'Administrator',
  IT_MANAGER: 'IT Manager',
  L2_AGENT:   'L2 Support Agent',
  L1_AGENT:   'L1 Support Agent',
  DEVELOPER:  'Developer',
  END_USER:   'End User',
}

// Where to redirect after login based on role
export const ROLE_REDIRECTS = {
  ADMIN:      '/dashboard/admin',
  IT_MANAGER: '/dashboard/manager',
  L2_AGENT:   '/dashboard/l2',
  L1_AGENT:   '/dashboard/l1',
  DEVELOPER:  '/dashboard/developer',
  END_USER:   '/dashboard/user',
}
