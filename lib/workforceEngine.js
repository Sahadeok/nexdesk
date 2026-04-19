/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  WORKFORCE INTELLIGENCE ENGINE — workforceEngine.js             ║
 * ║  P31: Recurring Issues | P32: Workload Heatmap                  ║
 * ║  P33: Plain English | P34: AI Shadow | P35: Predictive Staff    ║
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
      temperature: 0.2, max_tokens: 4000,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || '{}'
  return jsonMode ? JSON.parse(content) : content
}

// ═══════════════════════════════════════════════════════════════════
//  P31: RECURRING ISSUE DETECTOR
// ═══════════════════════════════════════════════════════════════════
export async function detectRecurringIssues() {
  const supabase = getSupabase()

  const { data: tickets } = await supabase.from('tickets')
    .select('id, ticket_number, title, description, priority, status, resolution_notes, category_id, created_at, resolved_at')
    .order('created_at', { ascending: false }).limit(200)

  if (!tickets || tickets.length < 3) return { detected: 0 }

  const ticketSummaries = tickets.map(t =>
    `${t.ticket_number}: ${t.title} | ${(t.description || '').substring(0, 100)} | Fix: ${(t.resolution_notes || '').substring(0, 100)}`
  ).join('\n')

  const prompt = `You are a Recurring Issue Detector AI. Analyze these tickets and find recurring patterns — issues that keep happening repeatedly.

TICKETS:
${ticketSummaries}

For each recurring pattern found, generate a unique fingerprint (short hash-like ID).
Return JSON:
{
  "recurring_issues": [
    {
      "fingerprint": "REC-unique-short-id",
      "title": "Clear name for this recurring issue",
      "description": "What keeps happening",
      "affected_tickets": ["ticket_numbers"],
      "occurrence_count": 5,
      "root_cause": "Why this keeps recurring",
      "permanent_fix_suggestion": "What would permanently stop this",
      "estimated_effort": "1 day / 1 week / 1 sprint",
      "business_impact": "How this affects business",
      "priority_score": 85,
      "category": "Network|Application|Database|Security|Access|Hardware|Performance|Other"
    }
  ]
}`

  const ai = await callAI(prompt)
  let detected = 0

  for (const issue of (ai.recurring_issues || [])) {
    const { data: existing } = await supabase.from('recurring_issues')
      .select('id, occurrence_count, affected_ticket_ids')
      .eq('issue_fingerprint', issue.fingerprint).single()

    if (existing) {
      const mergedIds = [...new Set([...(existing.affected_ticket_ids || []), ...(issue.affected_tickets || [])])]
      await supabase.from('recurring_issues').update({
        occurrence_count: mergedIds.length,
        affected_ticket_ids: mergedIds,
        last_seen_at: new Date().toISOString(),
        ai_root_cause: issue.root_cause,
        ai_permanent_fix_suggestion: issue.permanent_fix_suggestion,
        ai_estimated_effort: issue.estimated_effort,
        ai_business_impact: issue.business_impact,
        ai_priority_score: issue.priority_score,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      await supabase.from('recurring_issues').insert({
        issue_fingerprint: issue.fingerprint,
        title: issue.title,
        description: issue.description,
        occurrence_count: issue.occurrence_count || 1,
        affected_ticket_ids: issue.affected_tickets || [],
        ai_root_cause: issue.root_cause,
        ai_permanent_fix_suggestion: issue.permanent_fix_suggestion,
        ai_estimated_effort: issue.estimated_effort,
        ai_business_impact: issue.business_impact,
        ai_priority_score: issue.priority_score || 50,
        category: issue.category,
        status: 'open',
      })
      detected++
    }
  }

  return { detected, total: (ai.recurring_issues || []).length }
}

// ═══════════════════════════════════════════════════════════════════
//  P32: WORKLOAD HEATMAP
// ═══════════════════════════════════════════════════════════════════
export async function generateWorkloadSnapshot() {
  const supabase = getSupabase()

  // Get all agents with open ticket counts
  const { data: agents } = await supabase.from('profiles')
    .select('id, email, full_name, role')
    .in('role', ['L1_AGENT', 'L2_AGENT', 'DEVELOPER', 'IT_MANAGER', 'ADMIN'])

  const agentLoads = []
  for (const agent of (agents || [])) {
    const { data: openTix } = await supabase.from('tickets')
      .select('id, priority, status, created_at')
      .eq('assigned_to', agent.id)
      .in('status', ['open', 'in_progress'])

    const { data: resolvedTix } = await supabase.from('tickets')
      .select('id, created_at, resolved_at')
      .eq('assigned_to', agent.id)
      .eq('status', 'resolved')

    const resTimes = (resolvedTix || []).filter(t => t.resolved_at).map(t =>
      Math.round((new Date(t.resolved_at) - new Date(t.created_at)) / 60000)
    )
    const avgRes = resTimes.length ? Math.round(resTimes.reduce((a, b) => a + b, 0) / resTimes.length) : 0

    const load = (openTix || []).length
    const criticalCount = (openTix || []).filter(t => t.priority === 'critical').length
    const burnoutRisk = load > 10 ? 'critical' : load > 7 ? 'high' : load > 4 ? 'medium' : 'low'

    agentLoads.push({
      agent_id: agent.id, email: agent.email, name: agent.full_name, role: agent.role,
      open_tickets: load, in_progress: (openTix || []).filter(t => t.status === 'in_progress').length,
      critical_tickets: criticalCount, avg_resolution_min: avgRes,
      total_resolved: (resolvedTix || []).length, burnout_risk: burnoutRisk,
    })
  }

  // Team-level aggregation
  const teamLoads = {}
  for (const a of agentLoads) {
    const team = a.role?.replace('_AGENT', '') || 'OTHER'
    if (!teamLoads[team]) teamLoads[team] = { total: 0, agents: 0, totalTickets: 0 }
    teamLoads[team].agents++
    teamLoads[team].totalTickets += a.open_tickets
    teamLoads[team].total = Math.round(teamLoads[team].totalTickets / teamLoads[team].agents * 10) / 10
  }

  // Build hourly heatmap from recent ticket data
  const { data: recentTix } = await supabase.from('tickets')
    .select('created_at')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const heatmap = []
  for (let h = 0; h < 24; h++) {
    for (let d = 0; d < 7; d++) {
      const count = (recentTix || []).filter(t => {
        const dt = new Date(t.created_at)
        return dt.getHours() === h && dt.getDay() === d
      }).length
      heatmap.push({ hour: h, day: days[d], day_index: d, tickets_created: count })
    }
  }

  // AI analysis
  const sortedAgents = [...agentLoads].sort((a, b) => b.open_tickets - a.open_tickets)
  const maxAgent = sortedAgents[0]
  const minAgent = sortedAgents[sortedAgents.length - 1]

  const prompt = `You are a Workload Optimizer AI. Analyze this team workload and suggest improvements.

AGENT LOADS:
${agentLoads.map(a => `${a.email}: ${a.open_tickets} open (${a.critical_tickets} critical), burnout: ${a.burnout_risk}`).join('\n')}

Return JSON:
{
  "rebalance_suggestions": [{"from_agent":"email","to_agent":"email","ticket_count":2,"reason":"why"}],
  "peak_prediction": "When is the busiest period",
  "burnout_alerts": [{"agent":"email","risk":"high","recommendation":"specific action"}]
}`

  const ai = await callAI(prompt)

  const { data: snapshot } = await supabase.from('workload_snapshots').insert({
    agent_loads: agentLoads,
    team_loads: teamLoads,
    hourly_heatmap: heatmap,
    ai_rebalance_suggestions: ai.rebalance_suggestions || [],
    ai_peak_prediction: ai.peak_prediction || '',
    ai_burnout_alerts: ai.burnout_alerts || [],
    total_open: agentLoads.reduce((s, a) => s + a.open_tickets, 0),
    total_agents: agentLoads.length,
    avg_load_per_agent: agentLoads.length ? Math.round(agentLoads.reduce((s, a) => s + a.open_tickets, 0) / agentLoads.length * 10) / 10 : 0,
    max_load_agent: maxAgent?.email || '',
    min_load_agent: minAgent?.email || '',
  }).select().single()

  return snapshot
}

// ═══════════════════════════════════════════════════════════════════
//  P33: PLAIN ENGLISH RESOLVER
// ═══════════════════════════════════════════════════════════════════
export async function translateResolution(ticketId, technicalResolution) {
  const supabase = getSupabase()

  const prompt = `You are a Plain English Resolver. Translate this technical IT resolution into 3 versions that different audiences can understand. Also identify jargon that was replaced.

TECHNICAL RESOLUTION:
${technicalResolution}

Return JSON:
{
  "user_friendly": "Simple explanation a non-tech person understands. Use everyday language.",
  "executive_summary": "1-2 sentence business impact summary for management.",
  "technical_steps": "Clean, numbered steps for technical staff.",
  "complexity_level": "simple|medium|complex",
  "jargon_removed": [{"original":"DNS","replaced":"internet address lookup system"},{"original":"API","replaced":"connection between systems"}]
}`

  const ai = await callAI(prompt)

  const { data } = await supabase.from('plain_english_resolutions').insert({
    ticket_id: ticketId,
    original_resolution: technicalResolution,
    user_friendly: ai.user_friendly,
    executive_summary: ai.executive_summary,
    technical_steps: ai.technical_steps,
    complexity_level: ai.complexity_level || 'medium',
    jargon_removed: ai.jargon_removed || [],
  }).select().single()

  return data
}

// ═══════════════════════════════════════════════════════════════════
//  P34: AI SHADOW COACHING
// ═══════════════════════════════════════════════════════════════════
export async function generateShadowCoaching(agentId, ticketId) {
  const supabase = getSupabase()

  const { data: ticket } = await supabase.from('tickets')
    .select('id, ticket_number, title, description, priority, status, assigned_team, resolution_notes, created_at')
    .eq('id', ticketId).single()

  const { data: comments } = await supabase.from('ticket_comments')
    .select('comment_text, is_internal, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  const { data: agent } = await supabase.from('profiles')
    .select('email, full_name, role')
    .eq('id', agentId).single()

  const prompt = `You are an AI Shadow Coach — you observe how a support agent handles a ticket and provide real-time coaching.

TICKET ${ticket?.ticket_number}:
Title: ${ticket?.title}
Description: ${ticket?.description}
Priority: ${ticket?.priority}
Status: ${ticket?.status}
Resolution: ${ticket?.resolution_notes || 'Not resolved yet'}

AGENT: ${agent?.email} (${agent?.role})

COMMENTS/ACTIONS:
${(comments || []).map(c => `[${c.is_internal ? 'INTERNAL' : 'PUBLIC'}] ${c.comment_text}`).join('\n')}

Analyze the agent's handling and provide coaching. Return JSON:
{
  "observations": [
    {"type":"missing_info|good_practice|improvement|timing","message":"specific observation","severity":"info|warning|critical"}
  ],
  "suggestions": [
    {"category":"diagnosis|escalation|communication|resolution","suggestion":"what to do","priority":"high|medium|low"}
  ],
  "quality_score": 75,
  "quality_breakdown": {"completeness":80,"accuracy":85,"speed":70,"communication":75,"empathy":80},
  "senior_approach": "What a senior engineer would do differently in this situation"
}`

  const ai = await callAI(prompt)

  const { data } = await supabase.from('shadow_coaching_sessions').insert({
    agent_id: agentId,
    ticket_id: ticketId,
    coaching_type: ticket?.status === 'resolved' ? 'post_action' : 'realtime',
    ai_observations: ai.observations || [],
    ai_suggestions: ai.suggestions || [],
    ai_quality_score: ai.quality_score || 0,
    ai_quality_breakdown: ai.quality_breakdown || {},
    senior_approach: ai.senior_approach || '',
    status: 'active',
  }).select().single()

  return data
}

// ═══════════════════════════════════════════════════════════════════
//  P35: PREDICTIVE STAFFING
// ═══════════════════════════════════════════════════════════════════
export async function predictStaffing(targetDate) {
  const supabase = getSupabase()

  // Get historical ticket data for pattern analysis
  const { data: historicalTickets } = await supabase.from('tickets')
    .select('created_at, priority')
    .order('created_at', { ascending: false }).limit(500)

  const total = (historicalTickets || []).length
  const dayName = new Date(targetDate).toLocaleDateString('en-US', { weekday: 'long' })

  // Analyze by day of week
  const byDay = {}
  for (const t of (historicalTickets || [])) {
    const d = new Date(t.created_at).toLocaleDateString('en-US', { weekday: 'long' })
    if (!byDay[d]) byDay[d] = 0
    byDay[d]++
  }

  // Analyze by hour
  const byHour = {}
  for (const t of (historicalTickets || [])) {
    const h = new Date(t.created_at).getHours()
    if (!byHour[h]) byHour[h] = 0
    byHour[h]++
  }

  const criticalPct = total ? Math.round((historicalTickets || []).filter(t => t.priority === 'critical').length / total * 100) : 0

  const prompt = `You are a Predictive Staffing AI. Based on historical ticket data, predict staffing needs for ${dayName}, ${targetDate}.

HISTORICAL DATA:
Total Tickets Analyzed: ${total}
Tickets by Day: ${JSON.stringify(byDay)}
Tickets by Hour: ${JSON.stringify(byHour)}
Critical Ticket %: ${criticalPct}%

Predict ticket volume and staffing needs. Return JSON:
{
  "predicted_volume": 25,
  "peak_hours": [9, 10, 14, 15],
  "critical_pct": 15,
  "recommended_l1": 3,
  "recommended_l2": 2,
  "recommended_dev": 1,
  "shift_morning": {"predicted_volume":12,"recommended_staff":3,"peak_hour":10},
  "shift_evening": {"predicted_volume":10,"recommended_staff":2,"peak_hour":15},
  "shift_night": {"predicted_volume":3,"recommended_staff":1,"peak_hour":22},
  "reasoning": "Why these numbers",
  "confidence_pct": 80,
  "special_events": ["any relevant events"],
  "is_market_day": false
}`

  const ai = await callAI(prompt)

  const { data } = await supabase.from('staffing_predictions').insert({
    prediction_date: targetDate,
    predicted_ticket_volume: ai.predicted_volume || 0,
    predicted_peak_hours: ai.peak_hours || [],
    predicted_critical_pct: ai.critical_pct || 0,
    recommended_l1_agents: ai.recommended_l1 || 0,
    recommended_l2_agents: ai.recommended_l2 || 0,
    recommended_dev_agents: ai.recommended_dev || 0,
    shift_morning: ai.shift_morning || {},
    shift_evening: ai.shift_evening || {},
    shift_night: ai.shift_night || {},
    is_market_day: ai.is_market_day || false,
    special_events: ai.special_events || [],
    ai_reasoning: ai.reasoning || '',
    ai_confidence_pct: ai.confidence_pct || 0,
  }).select().single()

  return data
}
