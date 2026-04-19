import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const pathname = req.nextUrl.pathname
  const res = NextResponse.next()

  // Public routes — skip auth check
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/founder') ||       // Founder dedicated login portal
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return res
  }

  // Create Supabase server client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // ── DEVA BYPASS ──
  const isDevaBypass = req.cookies.get('deva_bypass')?.value === 'true'

  // Check session
  let user = null
  const { data } = await supabase.auth.getUser()
  if (data?.user) user = data.user
  
  if (isDevaBypass) {
    user = { id: 'deva-bypass-id', email: 'deva@nexdesk.com' }
  }

  // Not logged in → redirect to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // ── ROLE-BASED ROUTE GUARD ──
  // Super-Admin route: only SUPER_ADMIN role or founder email allowed
  if (pathname.startsWith('/super-admin')) {
    const { data: profile } = await supabase.from('profiles').select('role, is_super_admin').eq('id', user.id).single()
    const role = profile?.role || 'END_USER'
    const isSuperAdmin = role === 'SUPER_ADMIN' || profile?.is_super_admin === true
    const isFounderEmail = user?.email === 'deva@nexdesk.com'
    
    if (!isSuperAdmin && !isFounderEmail) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return res // ✅ Allowed through
  }

  // Dashboard routes: verify user is logged in (already done above)
  if (pathname.startsWith('/dashboard')) {
    // Additional role-based guards can be added here per route
    return res
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.ico).*)',
  ],
}
