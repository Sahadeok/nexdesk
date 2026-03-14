import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )
}

// POST — log an audit action
export async function POST(req) {
  try {
    const body    = await req.json()
    const supabase= getSupabase()
    const { data } = await supabase
      .from('audit_trail')
      .insert({
        ticket_id:      body.ticket_id,
        ticket_number:  body.ticket_number,
        action_type:    body.action_type,
        action_by:      body.action_by,
        action_by_name: body.action_by_name,
        action_by_role: body.action_by_role,
        old_value:      body.old_value,
        new_value:      body.new_value,
        field_changed:  body.field_changed,
        notes:          body.notes,
      })
      .select()
      .single()
    return NextResponse.json({ success: true, entry: data })
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET — fetch audit trail (with optional ticket_id filter)
export async function GET(req) {
  try {
    const supabase = getSupabase()
    const { searchParams } = new URL(req.url)
    const ticketId = searchParams.get('ticket_id')
    const limit    = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('audit_trail')
      .select('*, tickets(ticket_number, title)')
      .order('action_at', { ascending: false })
      .limit(limit)

    if (ticketId) query = query.eq('ticket_id', ticketId)

    const { data } = await query
    return NextResponse.json({ success: true, entries: data || [] })
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
