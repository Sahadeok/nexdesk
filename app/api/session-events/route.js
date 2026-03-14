import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role for inserting events from external apps
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function POST(req) {
  try {
    const body = await req.json()
    const events = Array.isArray(body.events) ? body.events : [body]

    if (events.length === 0) return NextResponse.json({ ok: true })

    const supabase = getSupabase()

    // Insert all events
    const { error } = await supabase.from('session_events').insert(
      events.map(e => ({
        session_id:   e.session_id,
        event_type:   e.event_type,
        page:         e.page,
        endpoint:     e.endpoint,
        method:       e.method,
        status_code:  e.status_code,
        duration_ms:  e.duration_ms,
        error_msg:    e.error_msg,
        browser:      e.browser,
        os:           e.os,
        network_type: e.network_type,
        app_version:  e.app_version,
        logged_at:    e.logged_at || new Date().toISOString(),
      }))
    )

    if (error) {
      console.error('Session events insert error:', error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    // Update session summary asynchronously
    const sessionId = events[0]?.session_id
    if (sessionId) {
      updateSessionSummary(supabase, sessionId, events).catch(console.error)
    }

    return NextResponse.json({ ok: true, count: events.length })
  } catch(e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

async function updateSessionSummary(supabase, sessionId, newEvents) {
  const hasErrors  = newEvents.some(e => ['js_error','api_failure','api_error','network_fail','promise_rejection'].includes(e.event_type))
  const pages      = newEvents.filter(e => e.event_type === 'page_view').map(e => e.page)
  const apiCalls   = newEvents.filter(e => ['api_call','api_failure'].includes(e.event_type)).length
  const errorCount = newEvents.filter(e => ['js_error','api_failure','api_error','network_fail'].includes(e.event_type)).length

  // Upsert session summary
  const { data: existing } = await supabase
    .from('session_summaries')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (existing) {
    const newJourney = [...(existing.journey || []), ...pages].filter((v,i,a) => a.indexOf(v) === i) // unique
    await supabase
      .from('session_summaries')
      .update({
        page_count:  (existing.page_count || 0) + pages.length,
        api_count:   (existing.api_count  || 0) + apiCalls,
        error_count: (existing.error_count || 0) + errorCount,
        has_errors:  existing.has_errors || hasErrors,
        journey:     newJourney,
        ended_at:    new Date().toISOString(),
      })
      .eq('session_id', sessionId)
  } else {
    await supabase.from('session_summaries').insert({
      session_id:  sessionId,
      started_at:  newEvents[0]?.logged_at || new Date().toISOString(),
      page_count:  pages.length,
      api_count:   apiCalls,
      error_count: errorCount,
      has_errors:  hasErrors,
      journey:     pages,
    })
  }

  // Auto-create incident ticket if critical error pattern detected
  if (errorCount >= 3 || newEvents.some(e => e.status_code >= 500)) {
    const criticalErrors = newEvents.filter(e => ['api_failure','js_error'].includes(e.event_type))
    if (criticalErrors.length > 0) {
      const { count: openCount } = await supabase
        .from('tickets')
        .select('*', { count:'exact', head:true })
        .eq('source', 'session_monitor')
        .gte('created_at', new Date(Date.now() - 30*60*1000).toISOString())

      // Don't spam tickets - max 1 per 30 mins from session monitor
      if (!openCount || openCount === 0) {
        const { count: total } = await supabase.from('tickets').select('*', { count:'exact', head:true })
        const year   = new Date().getFullYear()
        const num    = String((total || 0) + 1).padStart(4, '0')

        await supabase.from('tickets').insert({
          ticket_number: `TKT-${year}-${num}`,
          title:         `Auto-detected: Multiple errors in session ${sessionId.substring(0, 12)}`,
          description:   `Session monitor detected ${errorCount} errors.\n\nErrors:\n${criticalErrors.map(e => `- [${e.event_type}] ${e.endpoint || e.page}: ${e.error_msg || ''}`).join('\n')}\n\nSession ID: ${sessionId}`,
          priority:      errorCount >= 5 ? 'high' : 'medium',
          status:        'open',
          assigned_team: 'L2',
          source:        'session_monitor',
          created_at:    new Date().toISOString(),
        })
      }
    }
  }
}
