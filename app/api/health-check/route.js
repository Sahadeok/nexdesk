import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This API route:
// 1. Pings the target URL and returns status + response time
// 2. Saves incident to DB if service is down
// 3. Auto-creates a ticket if critical service is down

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const url      = searchParams.get('url')
  const name     = searchParams.get('name')
  const critical = searchParams.get('critical') === 'true'

  if (!url) return NextResponse.json({ error: 'URL required' }, { status:400 })

  const start  = Date.now()
  let status   = 'unknown'
  let httpCode = null
  let errorMsg = null

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'NexDesk-HealthMonitor/1.0' },
    })
    const responseTime = Date.now() - start
    httpCode = res.status

    if (res.ok) {
      // Check response time for degraded status
      status = responseTime > 3000 ? 'degraded' : 'up'
    } else {
      status = res.status >= 500 ? 'down' : 'degraded'
    }

    // If service is down and critical — create incident + ticket
    if ((status === 'down' || status === 'degraded') && name) {
      await handleDowntime(name, url, status, httpCode, critical, errorMsg)
    }

    return NextResponse.json({
      url,
      status,
      response_time: responseTime,
      http_code: httpCode,
      checked_at: new Date().toISOString(),
    })

  } catch(e) {
    const responseTime = Date.now() - start
    status   = 'down'
    errorMsg = e.message

    if (name) {
      await handleDowntime(name, url, status, null, critical, errorMsg)
    }

    return NextResponse.json({
      url,
      status: 'down',
      response_time: responseTime,
      error: e.message,
      checked_at: new Date().toISOString(),
    })
  }
}

async function handleDowntime(name, url, status, httpCode, critical, errorMsg) {
  try {
    // Check if incident already exists for this service (last 30 min)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: existing } = await supabase
      .from('health_incidents')
      .select('id')
      .eq('service_name', name)
      .is('resolved_at', null)
      .gte('created_at', thirtyMinAgo)
      .single()

    if (existing) return // Already tracked

    const severity = critical ? 'critical' : (status === 'down' ? 'high' : 'medium')

    // Create incident record
    const { data: incident } = await supabase
      .from('health_incidents')
      .insert({
        service_name: name,
        service_url:  url,
        status,
        severity,
        http_code:    httpCode,
        description:  errorMsg || `${name} returned ${status} status (HTTP ${httpCode})`,
        created_at:   new Date().toISOString(),
      })
      .select()
      .single()

    // Auto-create ticket for critical services
    if (critical && status === 'down') {
      const { data: ticket } = await supabase
        .from('tickets')
        .insert({
          title:         `[AUTO] ${name} is DOWN`,
          description:   `Automated incident detected.\n\nService: ${name}\nURL: ${url}\nStatus: ${status}\nHTTP Code: ${httpCode || 'N/A'}\nError: ${errorMsg || 'Service unreachable'}\n\nThis ticket was auto-created by NexDesk Health Monitor.`,
          category:      'infrastructure',
          priority:      'critical',
          status:        'open',
          assigned_team: 'L2',
          source:        'health_monitor',
          created_at:    new Date().toISOString(),
        })
        .select()
        .single()

      // Link ticket to incident
      if (ticket && incident) {
        await supabase.from('health_incidents').update({ ticket_id: ticket.id }).eq('id', incident.id)
      }

      // Create notification for all admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['ADMIN','IT_MANAGER'])

      if (admins) {
        await supabase.from('notifications').insert(
          admins.map(a => ({
            user_id:    a.id,
            title:      `🚨 ${name} is DOWN`,
            message:    `Critical service ${name} has gone down. Ticket auto-created.`,
            type:       'incident',
            read:       false,
            created_at: new Date().toISOString(),
          }))
        )
      }
    }
  } catch(e) {
    console.error('handleDowntime error:', e)
  }
}

// POST — receive errors from embedded JS agent
export async function POST(req) {
  try {
    const body = await req.json()
    const { type, service, error, url, stack, userAgent, timestamp, appId } = body

    // Save to health_logs table
    await supabase.from('health_logs').insert({
      app_id:     appId || 'unknown',
      type:       type || 'error',
      service,
      error_msg:  error,
      url,
      stack_trace: stack,
      user_agent: userAgent,
      logged_at:  timestamp || new Date().toISOString(),
    })

    return NextResponse.json({ received: true })
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status:500 })
  }
}

