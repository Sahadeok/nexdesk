import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/[\r\n]/g, '')
    
    const supabase = createClient(url, key)
    
    const { email, password, role } = await req.json()
    
    // ⚔️ CREATE AUTH USER
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })
    
    const userId = authData.user.id
    
    // 🛡️ CREATE PROFILE WITH ROLE
    const { error: profileErr } = await supabase.from('profiles').insert({
      id: userId,
      email,
      role: role || 'ADMIN',
      full_name: 'Platform Admin'
    })
    
    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })
    
    return NextResponse.json({ success: true, user: authData.user })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
