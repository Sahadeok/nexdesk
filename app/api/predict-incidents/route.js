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

const SERVICES = ['BSE_API', 'NSE_API', 'PAYMENT_GATEWAY', 'KYC_CAMS', 'SMS_GATEWAY']

const RISK_LEVELS = {
  healthy:  { min: 0,  max: 30,  color: 'green',  label: '🟢 Healthy'  },
  watch:    { min: 31, max: 60,  color: 'yellow', label: '🟡 Watch'    },
  warning:  { min: 61, max: 85,  color: 'orange', label: '🟠 Warning'  },
  critical: { min: 86, max: 100, color: 'red',    label: '🔴 Critical' },
}

function getRiskLevel(score) {
  if (score <= 30) return 'healthy'
  if (score <= 60) return 'watch'
  if (score <= 85) return 'warning'
  return 'critical'
}

export async function POST(req) {
  try {
    const supabase = getSupabase()
    const now      = new Date()
    const window5m = new Date(now - 5  * 60 * 1000).toISOString()
    const window30m= new Date(now - 30 * 60 * 1000).toISOString()
    const window1h = new Date(now - 60 * 60 * 1000).toISOString()

    // ── STEP 1: Collect raw metrics from health_logs ───────────────
    const metricsPerService = {}

    for (const service of SERVICES) {
      const serviceName = service.replace(/_/g, ' ').toLowerCase()

      // Get last 30 min health logs for this service
      const { data: logs30m } = await supabase
        .from('health_logs')
        .select('status_code, response_time, error_msg, logged_at, service, url, type')
        .or(`service.ilike.%${serviceName}%,url.ilike.%${serviceName.replace(/ /g, '')}%`)
        .gte('logged_at', window30m)
        .order('logged_at', { ascending: false })
        .limit(100)

      // Get last 5 min for recent trend
      const logs5m = (logs30m || []).filter(l => new Date(l.logged_at) >= new Date(window5m))

      const allLogs  = logs30m || []
      const total    = allLogs.length
      const errors   = allLogs.filter(l => l.status_code >= 400 || l.error_msg).length
      const timeouts = allLogs.filter(l => l.error_msg?.toLowerCase().includes('timeout')).length
      const times    = allLogs.map(l => l.response_time || 0).filter(t => t > 0)
      const avgTime  = times.length ? Math.round(times.reduce((a,b) => a+b, 0) / times.length) : 0
      const sorted   = [...times].sort((a,b) => a-b)
      const p95Time  = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] || 0 : 0
      const errorRate= total > 0 ? Math.round((errors / total) * 100 * 100) / 100 : 0

      // Determine current status
      let status = 'UP'
      if (errors > 0 && errorRate > 50) status = 'DOWN'
      else if (avgTime > 3000 || errorRate > 20) status = 'DEGRADED'
      else if (avgTime > 1500 || errorRate > 5)  status = 'SLOW'

      // 5-min window trend
      const recent5mErrors  = logs5m.filter(l => l.status_code >= 400 || l.error_msg).length
      const recent5mAvgTime = logs5m.length
        ? Math.round(logs5m.map(l => l.response_time || 0).reduce((a,b) => a+b, 0) / logs5m.length)
        : 0

      metricsPerService[service] = {
        service, total, errors, timeouts, avgTime, p95Time, errorRate, status,
        recent5mErrors, recent5mAvgTime, logs30m: allLogs, logs5m,
      }

      // Save raw metric snapshot
      if (total > 0 || logs5m.length > 0) {
        await supabase.from('prediction_metrics').insert({
          service, avg_response_ms: avgTime, error_count: errors,
          total_calls: total, error_rate: errorRate, status,
          p95_response_ms: p95Time, timeout_count: timeouts,
        })
      }
    }

    // ── STEP 2: Get historical trends (last 1hr vs last 5min) ──────
    const historicalTrends = {}
    for (const service of SERVICES) {
      const { data: history } = await supabase
        .from('prediction_metrics')
        .select('avg_response_ms, error_rate, status, captured_at')
        .eq('service', service)
        .gte('captured_at', window1h)
        .order('captured_at', { ascending: true })
        .limit(20)

      historicalTrends[service] = history || []
    }

    // ── STEP 3: Get recent tickets for context ─────────────────────
    const { data: recentTickets } = await supabase
      .from('tickets')
      .select('title, priority, status, created_at, category')
      .gte('created_at', window1h)
      .in('status', ['open', 'in_progress'])
      .limit(10)

    // ── STEP 4: Build AI prompt ────────────────────────────────────
    const metricsText = SERVICES.map(svc => {
      const m = metricsPerService[svc]
      const h = historicalTrends[svc]
      const trend = h.length >= 2
        ? (h[h.length-1].avg_response_ms > h[0].avg_response_ms * 1.3 ? 'DEGRADING' :
           h[h.length-1].avg_response_ms < h[0].avg_response_ms * 0.8 ? 'IMPROVING' : 'STABLE')
        : 'INSUFFICIENT_DATA'

      return `
SERVICE: ${svc}
  Status          : ${m.status}
  Total calls(30m): ${m.total}
  Error rate      : ${m.errorRate}%
  Avg response    : ${m.avgTime}ms
  P95 response    : ${m.p95Time}ms
  Timeouts        : ${m.timeouts}
  Last 5min errors: ${m.recent5mErrors}
  Last 5min avg ms: ${m.recent5mAvgTime}ms
  1hr trend       : ${trend}
  History points  : ${h.length} snapshots`
    }).join('\n')

    const ticketsText = recentTickets?.length
      ? `\nRECENT OPEN TICKETS (last 1hr):\n${recentTickets.map(t =>
          `  - [${t.priority?.toUpperCase()}] ${t.title} (${t.status})`
        ).join('\n')}`
      : '\nNo recent open tickets.'

    const prompt = `You are an expert SRE (Site Reliability Engineer) AI for an Indian Mutual Fund application.
Analyze the following real-time service metrics and predict which services are likely to fail in the next 15-30 minutes.

CURRENT TIME: ${now.toISOString()}
ANALYSIS WINDOW: Last 30 minutes of data

${metricsText}
${ticketsText}

Based on this data, provide a RISK ASSESSMENT for each service.

Rules:
- Risk score 0-30 = Healthy (no action needed)
- Risk score 31-60 = Watch (monitor closely)
- Risk score 61-85 = Warning (alert team, prepare for issue)
- Risk score 86-100 = Critical (imminent failure, raise P0 ticket)

Consider: error rate trends, response time degradation, timeout patterns, recent tickets as signals.
If data is limited (few calls), give a lower risk score reflecting uncertainty.

Respond ONLY with valid JSON (no markdown):
{
  "services": {
    "BSE_API":          { "risk_score": 15, "trend": "stable",    "reason": "...", "action": "...", "failure_probability": 10 },
    "NSE_API":          { "risk_score": 45, "trend": "degrading", "reason": "...", "action": "...", "failure_probability": 35 },
    "PAYMENT_GATEWAY":  { "risk_score": 72, "trend": "degrading", "reason": "...", "action": "...", "failure_probability": 65 },
    "KYC_CAMS":         { "risk_score": 20, "trend": "stable",    "reason": "...", "action": "...", "failure_probability": 15 },
    "SMS_GATEWAY":      { "risk_score": 10, "trend": "improving", "reason": "...", "action": "...", "failure_probability": 5  }
  },
  "overall_risk": 42,
  "summary": "One sentence overall system health summary for ops team",
  "immediate_actions": ["Action 1 if any", "Action 2 if any"]
}`

    // ── STEP 5: Call Claude AI ─────────────────────────────────────
    const aiRes  = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const aiData = await aiRes.json()
    const rawText= aiData.content?.[0]?.text || '{}'
    let prediction
    try {
      prediction = JSON.parse(rawText.replace(/```json|```/g, '').trim())
    } catch {
      // Fallback scores based on raw metrics
      prediction = {
        services: Object.fromEntries(SERVICES.map(s => {
          const m = metricsPerService[s]
          const score = Math.min(100, Math.round(
            (m.errorRate * 2) + (m.avgTime > 2000 ? 30 : m.avgTime > 1000 ? 15 : 0) + (m.timeouts * 5)
          ))
          return [s, { risk_score: score, trend: 'stable', reason: 'Based on error rate and response time', action: 'Monitor', failure_probability: score }]
        })),
        overall_risk: 30,
        summary: 'System analysis complete. Monitor services with elevated error rates.',
        immediate_actions: [],
      }
    }

    // ── STEP 6: Save predictions & auto-raise P0 tickets ──────────
    const savedPredictions = []
    let autoTicketsRaised  = 0
    const servicesAtRisk   = []

    for (const service of SERVICES) {
      const sp = prediction.services?.[service] || { risk_score: 0, trend: 'stable', reason: 'No data', action: 'Monitor', failure_probability: 0 }
      const riskLevel = getRiskLevel(sp.risk_score)

      // Auto-raise P0 ticket if critical
      let autoTicketId = null
      if (riskLevel === 'critical' && sp.risk_score >= 86) {
        // Check if P0 already raised for this service in last 30 mins
        const { data: existing } = await supabase
          .from('service_predictions')
          .select('auto_ticket_id')
          .eq('service', service)
          .eq('risk_level', 'critical')
          .gte('predicted_at', window30m)
          .not('auto_ticket_id', 'is', null)
          .limit(1)

        if (!existing || existing.length === 0) {
          // Generate ticket number
          const { count } = await supabase.from('tickets').select('*', { count: 'exact', head: true })
          const ticketNumber = `TKT-${now.getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`

          const { data: p0ticket } = await supabase.from('tickets').insert({
            title:         `🔴 [PREDICTED] ${service.replace(/_/g,' ')} — Imminent Failure Detected`,
            description:   `AI Prediction Engine detected critical risk (${sp.risk_score}/100) for ${service}.\n\nReason: ${sp.reason}\n\nRecommended Action: ${sp.action}\n\nFailure Probability: ${sp.failure_probability}%\n\nThis ticket was auto-raised by NexDesk Predictive Engine before any user reported an issue.`,
            priority:      'critical',
            status:        'open',
            category:      'infrastructure',
            ticket_number: ticketNumber,
            assigned_team: 'L2',
            source:        'predictive_engine',
            ai_routing_reason: `Predictive AI: Risk score ${sp.risk_score}/100. ${sp.reason}`,
            created_at:    now.toISOString(),
          }).select().single()

          autoTicketId    = p0ticket?.id || null
          autoTicketsRaised++
        }

        servicesAtRisk.push(service)
      } else if (riskLevel === 'warning') {
        servicesAtRisk.push(service)
      }

      // Save prediction
      const { data: saved } = await supabase.from('service_predictions').insert({
        service,
        risk_score:           sp.risk_score,
        risk_level:           riskLevel,
        predicted_failure:    sp.risk_score >= 61,
        failure_probability:  sp.failure_probability || 0,
        prediction_reason:    sp.reason,
        trend_direction:      sp.trend,
        recommended_action:   sp.action,
        auto_ticket_id:       autoTicketId,
      }).select().single()

      savedPredictions.push(saved)
    }

    // ── STEP 7: Save run summary ───────────────────────────────────
    await supabase.from('prediction_runs').insert({
      overall_risk:       prediction.overall_risk || 0,
      services_at_risk:   servicesAtRisk.length,
      prediction_summary: prediction.summary,
      auto_tickets_raised: autoTicketsRaised,
    })

    return NextResponse.json({
      success: true,
      overall_risk:       prediction.overall_risk,
      summary:            prediction.summary,
      services_at_risk:   servicesAtRisk,
      auto_tickets_raised: autoTicketsRaised,
      predictions:        savedPredictions,
      immediate_actions:  prediction.immediate_actions || [],
    })

  } catch(e) {
    console.error('[predict-incidents] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET — return latest predictions for dashboard
export async function GET() {
  try {
    const supabase = getSupabase()

    // Get latest prediction per service
    const latest = []
    for (const service of SERVICES) {
      const { data } = await supabase
        .from('service_predictions')
        .select('*')
        .eq('service', service)
        .order('predicted_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) latest.push(data)
    }

    // Get trend history (last 12 snapshots per service = ~1 hour)
    const trends = {}
    for (const service of SERVICES) {
      const { data } = await supabase
        .from('prediction_metrics')
        .select('avg_response_ms, error_rate, status, captured_at')
        .eq('service', service)
        .order('captured_at', { ascending: false })
        .limit(12)
      trends[service] = (data || []).reverse()
    }

    // Latest run summary
    const { data: lastRun } = await supabase
      .from('prediction_runs')
      .select('*')
      .order('ran_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Accuracy stats
    const { data: accuracy } = await supabase
      .from('prediction_accuracy')
      .select('correct')
      .not('correct', 'is', null)
      .limit(100)
    const correct   = (accuracy || []).filter(a => a.correct).length
    const total     = (accuracy || []).length
    const accPct    = total > 0 ? Math.round((correct / total) * 100) : null

    return NextResponse.json({
      success: true,
      predictions: latest,
      trends,
      lastRun,
      accuracy: { correct, total, percentage: accPct },
    })
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

