import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// ── GET: Fetch action items (optionally global across all PMs) ──────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const postmortemId = searchParams.get('postmortem_id')
    const status = searchParams.get('status')
    const global = searchParams.get('global')
    const supabase = getSupabase()

    let query = supabase
      .from('postmortem_action_items')
      .select('*, postmortems(pm_number, title)')
      .order('created_at', { ascending: false })

    if (postmortemId) query = query.eq('postmortem_id', postmortemId)
    if (status) query = query.eq('status', status)
    if (!global) query = query.limit(100)

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, action_items: data || [] })

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── PATCH: Update action item status/completion ─────────────────────
export async function PATCH(req) {
  try {
    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Action item id required' }, { status: 400 })

    const supabase = getSupabase()

    if (updates.status === 'completed') {
      updates.completed_at = new Date().toISOString()
    }
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('postmortem_action_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, action_item: data })

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

