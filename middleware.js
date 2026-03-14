import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const pathname = req.nextUrl.pathname

  // Public routes — skip everything
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Get session token from cookie
  const cookieHeader = req.headers.get('cookie') || ''
  
  // Look for supabase auth token in cookies
  const hasSession = cookieHeader.includes('sb-') && 
                     (cookieHeader.includes('-auth-token') || cookieHeader.includes('access_token'))

  // Not logged in → redirect to login
  if (!hasSession) {
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.ico).*)',
  ],
}
