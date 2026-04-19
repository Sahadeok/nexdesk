import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function POST(req) {
  try {
    const body     = await req.json()
    const { app_id, app_name, trigger, error_count } = body
    const supabase = getSupabase()

    // ── 1. GATHER LAST 30 MINS OF DATA ──────────────────
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    const { data: recentEvents } = await supabase
      .from('app_events')
      .select('event_type, message, severity, status_code, duration_ms, endpoint, page, logged_at')
      .eq('app_id', app_id)
      .gte('logged_at', since)
      .order('logged_at', { ascending: false })
      .limit(100)

    if (!recentEvents?.length) {
      return NextResponse.json({ success: true, predictions: [], reason: 'No recent events' })
    }

    // ── 2. PATTERN ANALYSIS ─────────────────────────────
    const errorsByType   = {}
    const errorsByEndpoint = {}
    const slowAPIs       = recentEvents.filter(e => e.duration_ms > 3000)
    const crashes        = recentEvents.filter(e => e.event_type === 'crash')
    const criticals      = recentEvents.filter(e => e.severity === 'critical')

    recentEvents.forEach(e => {
      errorsByType[e.event_type]     = (errorsByType[e.event_type] || 0) + 1
      if (e.endpoint) errorsByEndpoint[e.endpoint] = (errorsByEndpoint[e.endpoint] || 0) + 1
    })

    // Top failing endpoint
    const topEndpoint = Object.entries(errorsByEndpoint)
      .sort((a,b) => b[1] - a[1])[0]

    // Error rate trend — compare last 10 vs previous 10
    const last10  = recentEvents.slice(0, 10)
    const prev10  = recentEvents.slice(10, 20)
    const last10Errors = last10.filter(e => ['high','critical'].includes(e.severity)).length
    const prev10Errors = prev10.filter(e => ['high','critical'].includes(e.severity)).length
    const isEscalating = last10Errors > prev10Errors

    // ── 3. CALL AI FOR PREDICTION ───────────────────────
    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) {
      return NextResponse.json({ success: false, error: 'GROQ_API_KEY not set' })
    }

    const prompt = `You are an expert IT operations AI. Analyze these real-time application events and predict issues BEFORE they become critical.

APP: ${app_name || app_id}
TRIGGER: ${trigger} (${error_count} errors in 5 mins)

EVENT SUMMARY (last 30 mins):
- Total events: ${recentEvents.length}
- Critical: ${criticals.length}
- Crashes: ${crashes.length}
- Slow APIs (>3s): ${slowAPIs.length}
- Error trend: ${isEscalating ? 'ESCALATING ⬆️' : 'STABLE'}
- Top failing endpoint: ${topEndpoint ? `${topEndpoint[0]} (${topEndpoint[1]} errors)` : 'none'}
- Error types: ${JSON.stringify(errorsByType)}

SAMPLE ERROR MESSAGES:
${recentEvents.slice(0,5).map(e => `[${e.severity}] ${e.event_type}: ${e.message?.substring(0,100)}`).join('\n')}

Respond ONLY with valid JSON array (no markdown):
[
  {
    "prediction_type": "crash|slowdown|outage|error_spike|memory_leak|cascade_failure",
    "title": "Short prediction title",
    "description": "What will happen if not fixed in next 15-30 mins",
    "confidence": 85,
    "risk_level": "low|medium|high|critical",
    "pattern_found": "What pattern triggered this prediction",
    "affected_users": 150,
    "recommended_action": "Exact step to prevent this now",
    "time_to_impact": "15 mins|30 mins|1 hour|2 hours"
  }
]
Return 1-3 predictions maximum. Only predict real risks.`

    const aiRes  = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${groqKey}` },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        max_tokens:  800,
        temperature: 0.2,
        messages:    [{ role:'user', content: prompt }],
      })
    })

    const aiData    = await aiRes.json()
    const rawText   = aiData.choices?.[0]?.message?.content || '[]'
    const clean     = rawText.replace(/^```(?:json)?\s*/i,'').replace(/\s*```\s*$/i,'').trim()
    let predictions = []
    try { predictions = JSON.parse(clean) } catch(e) { predictions = [] }

    // ── 4. SAVE PREDICTIONS + AUTO-CREATE TICKETS ───────
    const saved = []
    for (const p of predictions) {
      if (p.confidence < 60) continue // skip low confidence

      // Save prediction
      const { data: pred } = await supabase.from('predictions').insert({
        app_id,
        app_name,
        prediction_type:    p.prediction_type,
        title:              p.title,
        description:        p.description,
        confidence:         p.confidence,
        risk_level:         p.risk_level,
        pattern_found:      p.pattern_found,
        affected_users:     p.affected_users || 0,
        recommended_action: p.recommended_action,
        status:             'active',
        predicted_at:       new Date().toISOString(),
      }).select().single()

      // Auto-create ticket for critical/high predictions
      if (['critical','high'].includes(p.risk_level) && pred) {
        const { count } = await supabase.from('tickets').select('*', { count:'exact', head:true })
        const ticketNumber = `TKT-${new Date().getFullYear()}-${String((count||0)+1).padStart(4,'0')}`

        const { data: ticket } = await supabase.from('tickets').insert({
          ticket_number: ticketNumber,
          title:         `🔮 [PREDICTED] ${p.title}`,
          description:   `AI Prediction (${p.confidence}% confidence)\n\n${p.description}\n\nPattern: ${p.pattern_found}\n\nRecommended Action: ${p.recommended_action}\n\nEstimated Impact: ${p.affected_users} users\nTime to Impact: ${p.time_to_impact}`,
          priority:      p.risk_level === 'critical' ? 'critical' : 'high',
          status:        'open',
          category:      'infrastructure',
          assigned_team: 'L2',
          source:        'prediction_engine',
          ai_routing_reason: `Support 3.0 Prediction: ${p.pattern_found}`,
          ticket_number: ticketNumber,
          created_at:    new Date().toISOString(),
        }).select().single()

        // Link ticket to prediction
        if (ticket) {
          await supabase.from('predictions').update({ ticket_id: ticket.id }).eq('id', pred.id)
        }

        // Auto-trigger AI diagnosis
        if (ticket) {
          fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ticket-diagnosis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket_id: ticket.id }),
          }).catch(() => {})
        }
      }

      saved.push(pred)
    }

    return NextResponse.json({
      success:     true,
      predictions: saved.length,
      details:     saved,
      pattern: {
        total_events:    recentEvents.length,
        critical_count:  criticals.length,
        is_escalating:   isEscalating,
        top_endpoint:    topEndpoint?.[0],
      }
    })

  } catch(e) {
    console.error('[predict-issues] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── GET: active predictions ──────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const app_id   = searchParams.get('app_id')
    const supabase = getSupabase()

    let query = supabase
      .from('predictions')
      .select('*')
      .eq('status', 'active')
      .order('predicted_at', { ascending: false })
      .limit(20)

    if (app_id) query = query.eq('app_id', app_id)

    const { data } = await query
    return NextResponse.json({ success: true, predictions: data || [] })
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

