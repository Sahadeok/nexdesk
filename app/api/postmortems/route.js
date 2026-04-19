import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generatePostmortem, regenerateExecutiveBrief } from '../../../lib/postmortemEngine'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// ── POST: Generate AI Postmortem from a ticket ──────────────────────
export async function POST(req) {
  try {
    const body = await req.json()
    const { ticket_id, blame_free = true, action } = body

    if (action === 'regenerate_brief') {
      const result = await regenerateExecutiveBrief(body.postmortem_id)
      return NextResponse.json({ success: true, result })
    }

    if (!ticket_id) {
      return NextResponse.json({ error: 'ticket_id is required' }, { status: 400 })
    }

    const result = await generatePostmortem(ticket_id, blame_free)

    return NextResponse.json({
      success: true,
      postmortem: result.pm,
      events_count: result.events.length,
      root_causes: result.rootCauseResult.root_cause_chain?.length || 0,
    })

  } catch (e) {
    console.error('[postmortems] POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── GET: List postmortems with filters ──────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const severity = searchParams.get('severity')
    const id = searchParams.get('id')
    const supabase = getSupabase()

    // Single postmortem with full details
    if (id) {
      const { data: pm, error } = await supabase
        .from('postmortems')
        .select('*')
        .eq('id', id)
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Fetch related data
      const [timelineRes, rootCausesRes, actionsRes] = await Promise.all([
        supabase.from('postmortem_timeline_events').select('*').eq('postmortem_id', id).order('event_time', { ascending: true }),
        supabase.from('postmortem_root_causes').select('*').eq('postmortem_id', id).order('level', { ascending: true }),
        supabase.from('postmortem_action_items').select('*').eq('postmortem_id', id).order('priority', { ascending: true }),
      ])

      return NextResponse.json({
        success: true,
        postmortem: pm,
        timeline: timelineRes.data || [],
        root_causes: rootCausesRes.data || [],
        action_items: actionsRes.data || [],
      })
    }

    // List all postmortems
    let query = supabase
      .from('postmortems')
      .select('id, pm_number, title, incident_severity, incident_type, status, pqi_score, time_to_resolve_min, users_affected, revenue_impact_inr, similar_incident_count, ai_summary, blame_free_mode, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (status) query = query.eq('status', status)
    if (severity) query = query.eq('incident_severity', severity)

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Fetch action item counts per PM
    const pmIds = (data || []).map(p => p.id)
    let actionCounts = {}
    if (pmIds.length > 0) {
      const { data: actions } = await supabase
        .from('postmortem_action_items')
        .select('postmortem_id, status')
        .in('postmortem_id', pmIds)

      for (const a of (actions || [])) {
        if (!actionCounts[a.postmortem_id]) actionCounts[a.postmortem_id] = { total: 0, completed: 0 }
        actionCounts[a.postmortem_id].total++
        if (a.status === 'completed') actionCounts[a.postmortem_id].completed++
      }
    }

    const enriched = (data || []).map(pm => ({
      ...pm,
      action_items_total: actionCounts[pm.id]?.total || 0,
      action_items_completed: actionCounts[pm.id]?.completed || 0,
    }))

    return NextResponse.json({ success: true, postmortems: enriched })

  } catch (e) {
    console.error('[postmortems] GET error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── PATCH: Update postmortem status/notes ────────────────────────────
export async function PATCH(req) {
  try {
    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Postmortem id required' }, { status: 400 })

    const supabase = getSupabase()
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('postmortems')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, postmortem: data })

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

