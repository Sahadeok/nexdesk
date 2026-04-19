import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// RLS is disabled on Phase 11 tables, anon key works
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// ── ERROR THRESHOLDS ─────────────────────────────────────
const THRESHOLDS = {
  error_rate:    5,   // 5+ errors in 5 mins = alert
  slow_api:      3000, // 3s+ response = slow
  crash_count:   3,   // 3 crashes = critical
  memory_mb:     512, // 512MB+ = warning
}

// ── POST: receive events from nexdesk-agent ──────────────
export async function POST(req) {
  try {
    const body      = await req.json()
    const { events, app_id, app_name } = body

    if (!events?.length) {
      return NextResponse.json({ success: true, processed: 0 })
    }

    const supabase  = getSupabase()
    const processed = []
    const alerts    = []

    for (const event of events) {
      // Classify severity
      let severity = 'low'
      if (event.status_code >= 500 || event.event_type === 'crash')   severity = 'critical'
      else if (event.status_code >= 400 || event.duration_ms > 3000)  severity = 'high'
      else if (event.event_type === 'warning')                         severity = 'medium'

      // Save event
      const { data: saved } = await supabase.from('app_events').insert({
        app_id:      app_id || event.app_id,
        app_name:    app_name || event.app_name,
        event_type:  event.event_type,
        message:     event.message?.substring(0, 500),
        stack_trace: event.stack_trace?.substring(0, 1000),
        page:        event.page,
        endpoint:    event.endpoint,
        status_code: event.status_code,
        duration_ms: event.duration_ms,
        user_id:     event.user_id,
        session_id:  event.session_id,
        severity,
        framework:   event.framework,
        raw_data:    event,
        logged_at:   event.logged_at || new Date().toISOString(),
      }).select().single()

      processed.push(saved)

      // Check if this needs immediate alert
      if (severity === 'critical') {
        alerts.push({ event: saved, reason: 'Critical severity event' })
      }

      // Track Error Surge for anything medium/high/critical
      if (['critical', 'high', 'medium'].includes(severity) && saved) {
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/error-surge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ app_id: app_id || event.app_id, app_name: app_name || event.app_name, event: saved }),
        }).catch((err) => console.error('[app-watcher] surge call error:', err))
      }
    }

    // ── Check error rate threshold ──────────────────────
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { count: recentErrors } = await supabase
      .from('app_events')
      .select('*', { count: 'exact', head: true })
      .eq('app_id', app_id)
      .in('severity', ['high', 'critical'])
      .gte('logged_at', fiveMinsAgo)

    if (recentErrors >= THRESHOLDS.error_rate) {
      // Trigger prediction check
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/predict-issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id, app_name, trigger: 'error_rate_threshold', error_count: recentErrors }),
      }).catch(() => {})

      // Trigger self-heal check
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/self-heal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id, app_name, events: processed, trigger: 'error_rate' }),
      }).catch(() => {})
    }

    return NextResponse.json({
      success:   true,
      processed: processed.length,
      alerts:    alerts.length,
      error_rate: recentErrors,
      threshold_triggered: recentErrors >= THRESHOLDS.error_rate,
    })

  } catch(e) {
    console.error('[app-watcher] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── GET: latest events for an app ───────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const app_id  = searchParams.get('app_id')
    const limit   = parseInt(searchParams.get('limit') || '50')
    const supabase = getSupabase()

    let query = supabase
      .from('app_events')
      .select('*')
      .order('logged_at', { ascending: false })
      .limit(limit)

    if (app_id) query = query.eq('app_id', app_id)

    const { data } = await query
    return NextResponse.json({ success: true, events: data || [] })
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

