import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// ── GET: Fetch timeline events for a postmortem ─────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const postmortemId = searchParams.get('postmortem_id')
    if (!postmortemId) return NextResponse.json({ error: 'postmortem_id required' }, { status: 400 })

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('postmortem_timeline_events')
      .select('*')
      .eq('postmortem_id', postmortemId)
      .order('event_time', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, events: data || [] })

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── POST: Manually add timeline event ──────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json()
    const { postmortem_id, event_time, event_type, title, description, severity, actor, affected_system } = body

    if (!postmortem_id || !title) {
      return NextResponse.json({ error: 'postmortem_id and title required' }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('postmortem_timeline_events')
      .insert({
        postmortem_id,
        event_time: event_time || new Date().toISOString(),
        event_type: event_type || 'action',
        source: 'manual',
        title,
        description: description || '',
        severity: severity || 'info',
        actor: actor || 'Manual Entry',
        affected_system: affected_system || '',
        is_key_moment: false,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, event: data })

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

