/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  OPERATIONS INTELLIGENCE ENGINE — opsEngine.js                 ║
 * ║  P18: SLA Negotiator | P19: Client Health | P20: AI Interview  ║
 * ║  P21: Shift Handover | P22: Vendor SLA Tracker                 ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

async function callAI(prompt, jsonMode = true) {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) throw new Error('GROQ_API_KEY missing')
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.25,
      max_tokens: 4000,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || '{}'
  return jsonMode ? JSON.parse(content) : content
}

// ═══════════════════════════════════════════════════════════════════
//  P18: SLA NEGOTIATOR
// ═══════════════════════════════════════════════════════════════════
export async function generateSLAProposal(clientName, industry = 'BFSI') {
  const supabase = getSupabase()

  // Auto-detect current performance from ticket data
  const { data: tickets } = await supabase.from('tickets')
    .select('id, priority, created_at, resolved_at, sla_response_met, sla_resolve_met, status')

  const resolved = (tickets || []).filter(t => t.resolved_at)
  const resTimes = resolved.map(t => Math.round((new Date(t.resolved_at) - new Date(t.created_at)) / 60000))
  const avgResolveMin = resTimes.length ? Math.round(resTimes.reduce((a, b) => a + b, 0) / resTimes.length) : 0
  const slaCompliance = resolved.length ? Math.round(resolved.filter(t => t.sla_resolve_met).length / resolved.length * 100) : 0
  const monthlyVolume = Math.round((tickets || []).length / Math.max(1, Math.ceil((Date.now() - new Date(Math.min(...(tickets || []).map(t => new Date(t.created_at))))) / (30 * 24 * 60 * 60 * 1000))))

  const prompt = `You are an SLA Negotiator AI for a ${industry} IT support company. Based on actual performance data, generate SLA recommendations.

ACTUAL PERFORMANCE:
- Avg Resolution Time: ${avgResolveMin} minutes
- SLA Compliance: ${slaCompliance}%
- Monthly Ticket Volume: ${monthlyVolume}
- Total Tickets Analyzed: ${(tickets || []).length}

CLIENT: ${clientName}
INDUSTRY: ${industry}

Generate SLA proposal with 3 tiers. Return JSON:
{
  "recommended_response_hours": {"critical":0.5,"high":1,"medium":4,"low":24},
  "recommended_resolve_hours": {"critical":2,"high":4,"medium":24,"low":72},
  "confidence_pct": 85,
  "risk_assessment": "analysis of risks",
  "cost_estimate": "infrastructure costs per tier",
  "gap_analysis": "gaps between current performance and targets",
  "negotiation_tips": "3 key negotiation strategies",
  "tier_basic": {"name":"Basic","response":{"critical":1,"high":2,"medium":8,"low":48},"resolve":{"critical":4,"high":8,"medium":48,"low":120},"uptime":"99.5%","price_multiplier":1.0},
  "tier_standard": {"name":"Standard","response":{"critical":0.5,"high":1,"medium":4,"low":24},"resolve":{"critical":2,"high":4,"medium":24,"low":72},"uptime":"99.9%","price_multiplier":1.5},
  "tier_premium": {"name":"Premium","response":{"critical":0.25,"high":0.5,"medium":2,"low":12},"resolve":{"critical":1,"high":2,"medium":12,"low":48},"uptime":"99.95%","price_multiplier":2.5}
}`

  const ai = await callAI(prompt)

  const { count } = await supabase.from('sla_proposals').select('*', { count: 'exact', head: true })
  const num = `SLA-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`

  const { data } = await supabase.from('sla_proposals').insert({
    proposal_number: num,
    client_name: clientName,
    industry,
    current_avg_response_min: avgResolveMin * 0.3,
    current_avg_resolve_min: avgResolveMin,
    current_sla_compliance_pct: slaCompliance,
    current_ticket_volume_monthly: monthlyVolume,
    ai_recommended_response_hours: ai.recommended_response_hours,
    ai_recommended_resolve_hours: ai.recommended_resolve_hours,
    ai_confidence_pct: ai.confidence_pct || 80,
    ai_risk_assessment: ai.risk_assessment,
    ai_cost_estimate: ai.cost_estimate,
    ai_gap_analysis: ai.gap_analysis,
    ai_negotiation_tips: ai.negotiation_tips,
    tier_basic: ai.tier_basic || {},
    tier_standard: ai.tier_standard || {},
    tier_premium: ai.tier_premium || {},
    status: 'draft',
  }).select().single()

  return data
}

// ═══════════════════════════════════════════════════════════════════
//  P19: CLIENT HEALTH SCORE
// ═══════════════════════════════════════════════════════════════════
export async function calculateClientHealth() {
  const supabase = getSupabase()

  const { data: tickets } = await supabase.from('tickets')
    .select('id, title, priority, status, created_at, resolved_at, sla_resolve_met, assigned_team, escalated_to_l2, category_id, csat_rating')

  const all = tickets || []
  const open = all.filter(t => t.status === 'open' || t.status === 'in_progress')
  const resolved = all.filter(t => t.resolved_at)

  // Calculate dimension scores
  const totalVolume = all.length
  const volumeScore = Math.max(0, 100 - Math.min(100, totalVolume * 2))
  
  const resTimes = resolved.map(t => (new Date(t.resolved_at) - new Date(t.created_at)) / 60000)
  const avgRes = resTimes.length ? resTimes.reduce((a, b) => a + b, 0) / resTimes.length : 0
  const speedScore = Math.max(0, 100 - Math.min(100, avgRes / 10))

  const slaCompliance = resolved.length ? resolved.filter(t => t.sla_resolve_met).length / resolved.length * 100 : 100
  const slaScore = Math.round(slaCompliance)

  const escalations = all.filter(t => t.escalated_to_l2).length
  const escalationScore = Math.max(0, 100 - escalations * 10)

  const ratings = all.filter(t => t.csat_rating).map(t => t.csat_rating)
  const satScore = ratings.length ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length * 20) : 70

  const slaBreaches = resolved.filter(t => t.sla_resolve_met === false).length
  const recurringScore = Math.max(0, 100 - slaBreaches * 5)

  const overall = Math.round((volumeScore + speedScore + slaScore + recurringScore + satScore + escalationScore) / 6)
  const trend = overall > 70 ? 'improving' : overall > 50 ? 'stable' : overall > 30 ? 'declining' : 'critical'
  const churnRisk = overall > 75 ? 'low' : overall > 55 ? 'medium' : overall > 35 ? 'high' : 'critical'

  // AI analysis
  const prompt = `Analyze this client health data and provide insights. Return JSON:
{
  "risk_factors": ["factor1","factor2","factor3"],
  "recommendations": [
    {"action":"specific action","impact":"expected impact","priority":"high|medium|low"}
  ]
}

DATA: Total tickets:${totalVolume}, Open:${open.length}, Avg resolution:${Math.round(avgRes)}min, SLA compliance:${Math.round(slaCompliance)}%, Escalations:${escalations}, SLA breaches:${slaBreaches}, Overall score:${overall}/100, Churn risk:${churnRisk}`

  const ai = await callAI(prompt)

  // Upsert health score
  const existing = await supabase.from('client_health_scores').select('id, overall_score').eq('client_name', 'default').single()

  const healthData = {
    client_name: 'default',
    overall_score: overall,
    ticket_volume_score: Math.round(volumeScore),
    resolution_speed_score: Math.round(speedScore),
    sla_compliance_score: slaScore,
    recurring_issues_score: recurringScore,
    satisfaction_score: satScore,
    escalation_score: escalationScore,
    trend,
    previous_score: existing?.data?.overall_score || 0,
    score_change: overall - (existing?.data?.overall_score || 0),
    churn_risk: churnRisk,
    ai_risk_factors: ai.risk_factors || [],
    ai_recommendations: ai.recommendations || [],
    total_tickets: totalVolume,
    open_tickets: open.length,
    avg_resolution_min: Math.round(avgRes),
    sla_breaches: slaBreaches,
    recurring_count: 0,
    last_calculated_at: new Date().toISOString(),
  }

  if (existing?.data?.id) {
    const { data } = await supabase.from('client_health_scores').update(healthData).eq('id', existing.data.id).select().single()
    return data
  } else {
    const { data } = await supabase.from('client_health_scores').insert(healthData).select().single()
    return data
  }
}

// ═══════════════════════════════════════════════════════════════════
//  P21: SHIFT HANDOVER AI
// ═══════════════════════════════════════════════════════════════════
export async function generateShiftHandover(shiftFrom, shiftTo) {
  const supabase = getSupabase()

  // Gather current state
  const { data: openTickets } = await supabase.from('tickets')
    .select('id, ticket_number, title, priority, status, assigned_team, created_at, sla_resolve_due')
    .in('status', ['open', 'in_progress'])
    .order('priority', { ascending: true })

  const open = openTickets || []
  const critical = open.filter(t => t.priority === 'critical')
  const slaAtRisk = open.filter(t => t.sla_resolve_due && new Date(t.sla_resolve_due) < new Date(Date.now() + 2 * 60 * 60 * 1000))

  // Tickets resolved in last 8 hours
  const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
  const { data: recentResolved } = await supabase.from('tickets')
    .select('id, ticket_number, title, priority')
    .in('status', ['resolved', 'closed'])
    .gte('resolved_at', eightHoursAgo)

  // New tickets in last 8 hours
  const { data: recentNew } = await supabase.from('tickets')
    .select('id, ticket_number, title, priority')
    .gte('created_at', eightHoursAgo)

  const ticketSummary = open.slice(0, 20).map(t =>
    `${t.ticket_number}: ${t.title} | ${t.priority} | ${t.status} | Team: ${t.assigned_team}`
  ).join('\n')

  const prompt = `You are a Shift Handover AI. Generate a handover report for the incoming ${shiftTo} shift team.

CURRENT STATE:
Open Tickets (${open.length}):
${ticketSummary || 'None'}

Critical: ${critical.length}
SLA at Risk (2h): ${slaAtRisk.length}
Resolved this shift: ${(recentResolved || []).length}
New this shift: ${(recentNew || []).length}

Generate handover report. Return JSON:
{
  "summary": "2-3 sentence shift summary",
  "critical_items": [{"ticket":"TKT-xxx","issue":"brief","action_needed":"what to do"}],
  "service_health": {"overall":"healthy|degraded|critical","details":"brief status"},
  "watch_items": [{"item":"what to monitor","reason":"why","priority":"high|medium|low"}],
  "pending_escalations": [{"ticket":"TKT-xxx","reason":"why pending"}]
}`

  const ai = await callAI(prompt)

  const { count } = await supabase.from('shift_handovers').select('*', { count: 'exact', head: true })
  const num = `HO-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`

  const { data } = await supabase.from('shift_handovers').insert({
    handover_number: num,
    shift_from: shiftFrom,
    shift_to: shiftTo,
    ai_summary: ai.summary,
    open_tickets_snapshot: open.slice(0, 30).map(t => ({ number: t.ticket_number, title: t.title, priority: t.priority, status: t.status })),
    critical_items: ai.critical_items || [],
    service_health: ai.service_health || {},
    pending_escalations: ai.pending_escalations || [],
    watch_items: ai.watch_items || [],
    total_open: open.length,
    total_critical: critical.length,
    sla_at_risk: slaAtRisk.length,
    resolved_this_shift: (recentResolved || []).length,
    new_this_shift: (recentNew || []).length,
    status: 'generated',
  }).select().single()

  return data
}

// ═══════════════════════════════════════════════════════════════════
//  P22: VENDOR SLA TRACKER
// ═══════════════════════════════════════════════════════════════════
export async function checkVendorHealth(vendorId) {
  const supabase = getSupabase()

  const { data: vendor } = await supabase.from('vendor_sla_configs')
    .select('*').eq('id', vendorId).single()

  if (!vendor || !vendor.health_check_url) return { status: 'unknown', vendor }

  let status = 'healthy'
  let latency = 0

  try {
    const start = Date.now()
    const res = await fetch(vendor.health_check_url, { signal: AbortSignal.timeout(10000) })
    latency = Date.now() - start

    if (!res.ok) status = 'degraded'
    if (latency > 5000) status = 'degraded'
    if (res.status >= 500) status = 'down'
  } catch (e) {
    status = 'down'
    latency = 10000
  }

  const wasDown = vendor.current_status === 'down'
  const nowDown = status === 'down'

  // Update vendor status
  const updates = {
    current_status: status,
    last_check_at: new Date().toISOString(),
  }

  // If newly down, record incident
  if (nowDown && !wasDown) {
    updates.last_down_at = new Date().toISOString()
    updates.total_incidents = (vendor.total_incidents || 0) + 1

    await supabase.from('vendor_incidents').insert({
      vendor_id: vendorId,
      incident_type: 'outage',
      started_at: new Date().toISOString(),
      auto_detected: true,
    })
  }

  // If recovered, close incident
  if (!nowDown && wasDown && vendor.last_down_at) {
    const duration = Math.round((Date.now() - new Date(vendor.last_down_at)) / 60000)
    updates.total_downtime_min = (vendor.total_downtime_min || 0) + duration

    const { data: openIncident } = await supabase.from('vendor_incidents')
      .select('id')
      .eq('vendor_id', vendorId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    if (openIncident) {
      await supabase.from('vendor_incidents').update({
        ended_at: new Date().toISOString(),
        duration_min: duration,
        latency_ms: latency,
      }).eq('id', openIncident.id)
    }
  }

  // Recalculate uptime
  const totalMinutesInMonth = 30 * 24 * 60
  const downtime = (updates.total_downtime_min || vendor.total_downtime_min || 0)
  updates.actual_uptime_pct = parseFloat((100 - (downtime / totalMinutesInMonth * 100)).toFixed(3))

  // Calculate credit if SLA breached
  if (updates.actual_uptime_pct < vendor.guaranteed_uptime_pct) {
    const breachPct = vendor.guaranteed_uptime_pct - updates.actual_uptime_pct
    updates.monthly_credit_inr = Math.round(breachPct * 1000)
  }

  await supabase.from('vendor_sla_configs').update(updates).eq('id', vendorId)

  return { status, latency, vendor: { ...vendor, ...updates } }
}

export async function generateVendorClaimDraft(vendorId) {
  const supabase = getSupabase()

  const { data: vendor } = await supabase.from('vendor_sla_configs').select('*').eq('id', vendorId).single()
  const { data: incidents } = await supabase.from('vendor_incidents')
    .select('*').eq('vendor_id', vendorId).order('started_at', { ascending: false }).limit(10)

  const prompt = `Draft an SLA credit claim email. Return JSON:
{
  "subject": "email subject",
  "body": "formal email body with specific data",
  "claim_amount_inr": 5000,
  "impact_summary": "1-2 sentence impact"
}

VENDOR: ${vendor?.vendor_name}
GUARANTEED UPTIME: ${vendor?.guaranteed_uptime_pct}%
ACTUAL UPTIME: ${vendor?.actual_uptime_pct}%
TOTAL DOWNTIME: ${vendor?.total_downtime_min} minutes
TOTAL INCIDENTS: ${vendor?.total_incidents}
RECENT INCIDENTS: ${JSON.stringify((incidents || []).slice(0, 5).map(i => ({ type: i.incident_type, duration: i.duration_min, date: i.started_at })))}`

  const ai = await callAI(prompt)
  return ai
}

// ═══════════════════════════════════════════════════════════════════
//  P20: AI INTERVIEW (handled in API route for real-time chat)
// ═══════════════════════════════════════════════════════════════════
export async function getNextInterviewQuestion(step, answers, ticketContext) {
  const steps = [
    { q: 'What issue are you facing? Describe in your own words.', field: 'issue_description' },
    { q: 'Which application or system is affected?', field: 'affected_system' },
    { q: 'When did this issue start? (e.g., "today morning", "2 hours ago")', field: 'start_time' },
    { q: 'How many users or transactions are affected?', field: 'user_impact' },
    { q: 'Have you tried any fix or workaround?', field: 'workaround_tried' },
    { q: 'Can you paste any error message or screenshot URL?', field: 'error_details' },
    { q: 'How urgently do you need this resolved?', field: 'urgency' },
  ]

  if (step > steps.length) return null

  // After step 3, try to find similar tickets
  if (step === 4 && answers.issue_description) {
    const prompt = `Based on this issue: "${answers.issue_description}", detect category and priority. Return JSON:
{
  "detected_category": "Network|Application|Database|Security|Access|Hardware|Performance|Other",
  "detected_priority": "critical|high|medium|low",
  "detected_framework": "framework if detectable or null"
}`
    const ai = await callAI(prompt)
    return { ...steps[step - 1], detection: ai }
  }

  return steps[step - 1] || null
}
