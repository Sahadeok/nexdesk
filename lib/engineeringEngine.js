/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ENGINEERING INTELLIGENCE ENGINE — engineeringEngine.js         ║
 * ║  P46: Auto-Improvement | P47: Code Quality Scanner              ║
 * ║  P48: User Journey Analytics | P49: Tech Debt Tracker           ║
 * ║  P50: Error Cost Calculator                                      ║
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
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY missing')
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2, max_tokens: 4096,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })
  const d = await res.json()
  const c = d.choices?.[0]?.message?.content || '{}'
  return jsonMode ? JSON.parse(c) : c
}

function counter(n) { return `${String(n).padStart(3, '0')}` }

// ═══════════════════════════════════════════════════════════════════
//  P46: AUTO-IMPROVEMENT ENGINE
// ═══════════════════════════════════════════════════════════════════
export async function generateAutoImprovements() {
  const supabase = getSupabase()

  const [ticketsR, agentsR, slaR, dnaR] = await Promise.all([
    supabase.from('tickets').select('id, priority, status, created_at, resolved_at, sla_resolve_met, category_id, assigned_team').order('created_at', { ascending: false }).limit(200),
    supabase.from('profiles').select('id, role').in('role', ['L1_AGENT', 'L2_AGENT']),
    supabase.from('tickets').select('sla_resolve_met').limit(200),
    supabase.from('support_dna_profiles').select('speed_dna, quality_dna, empathy_dna, overall_dna_score').order('created_at', { ascending: false }).limit(1),
  ])

  const tickets = ticketsR.data || []
  const resolved = tickets.filter(t => t.resolved_at)
  const resTimes = resolved.map(t => Math.round((new Date(t.resolved_at) - new Date(t.created_at)) / 60000))
  const avgRes = resTimes.length ? Math.round(resTimes.reduce((a,b) => a+b,0)/resTimes.length) : 0
  const slaFail = (slaR.data||[]).filter(t => t.sla_resolve_met === false).length
  const critCount = tickets.filter(t => t.priority === 'critical').length
  const dna = dnaR.data?.[0] || {}

  const prompt = `You are an AI Continuous Improvement Engine analyzing an IT helpdesk operation.

OPERATIONAL METRICS:
- Avg Resolution Time: ${avgRes} min (Industry: 240 min)
- Total Tickets Analyzed: ${tickets.length}
- SLA Failures: ${slaFail}
- Critical Tickets: ${critCount}
- Team Size: ${(agentsR.data||[]).length} agents
- DNA Scores: Speed=${dna.speed_dna||50}, Quality=${dna.quality_dna||50}, Empathy=${dna.empathy_dna||50}

Generate 6 high-impact improvement suggestions across different categories. Return JSON:
{
  "suggestions": [
    {
      "category": "process",
      "subcategory": "triage",
      "title": "AI-Powered Auto-Triage for Critical Tickets",
      "problem_statement": "Critical tickets take 45min to triage manually, causing delayed response",
      "suggested_action": "Implement AI keyword scoring to auto-flag and route critical tickets within 30 seconds",
      "implementation_steps": [
        {"step": 1, "detail": "Configure keyword rules in ticket ingestion", "owner": "IT Ops"},
        {"step": 2, "detail": "Set up auto-assignment rules for L2 team", "owner": "Team Lead"}
      ],
      "expected_outcome": "Reduce critical ticket triage from 45min to <2min",
      "impact_score": 90,
      "effort_score": 25,
      "priority_score": 85,
      "roi_estimate_inr": 150000,
      "payback_days": 7,
      "ai_confidence_pct": 88,
      "evidence_data": {"critical_tickets": ${critCount}, "avg_triage_delay_min": 45}
    }
  ]
}`

  const ai = await callAI(prompt)
  const suggestions = ai.suggestions || []
  const { count } = await supabase.from('auto_improvements').select('*', { count: 'exact', head: true })
  let base = count || 0

  const results = []
  for (const s of suggestions) {
    base++
    const { data } = await supabase.from('auto_improvements').insert({
      suggestion_number: `AIS-${counter(base)}`,
      category: s.category || 'process',
      subcategory: s.subcategory || '',
      title: s.title || '',
      problem_statement: s.problem_statement || '',
      suggested_action: s.suggested_action || '',
      implementation_steps: s.implementation_steps || [],
      expected_outcome: s.expected_outcome || '',
      impact_score: s.impact_score || 50,
      effort_score: s.effort_score || 50,
      priority_score: s.priority_score || 50,
      roi_estimate_inr: s.roi_estimate_inr || 0,
      payback_days: s.payback_days || 30,
      ai_confidence_pct: s.ai_confidence_pct || 70,
      evidence_data: s.evidence_data || {},
      status: 'pending',
    }).select().single()
    if (data) results.push(data)
  }
  return results
}

// ═══════════════════════════════════════════════════════════════════
//  P47: CODE QUALITY SCANNER
// ═══════════════════════════════════════════════════════════════════
export async function runCodeQualityScan() {
  const supabase = getSupabase()

  const { data: tickets } = await supabase.from('tickets')
    .select('id, title, description, priority, category_id').order('created_at', { ascending: false }).limit(100)

  const { data: csSessions } = await supabase.from('code_surgery_sessions')
    .select('error_log, stack_trace_analysis, identified_issues').order('created_at', { ascending: false }).limit(20)

  const errorPatterns = (tickets || [])
    .filter(t => t.description?.toLowerCase().includes('error') || t.description?.toLowerCase().includes('exception') || t.description?.toLowerCase().includes('failed'))
    .slice(0, 15)
    .map(t => `TICKET: ${t.title}\n${(t.description||'').substring(0, 200)}`)
    .join('\n\n---\n\n')

  const surgeryData = (csSessions || []).slice(0, 5)
    .map(s => s.error_log || s.stack_trace_analysis || '').filter(Boolean).join('\n')

  const { count } = await supabase.from('code_quality_scans').select('*', { count: 'exact', head: true })
  const scanNum = `CQS-${counter((count||0)+1)}`
  const startedAt = new Date().toISOString()

  const prompt = `You are an Expert Code Quality AI. Analyze these error patterns from IT support tickets to identify code quality issues.

ERROR PATTERNS FROM TICKETS (${errorPatterns.split('---').length} patterns):
${errorPatterns.substring(0, 2500)}

PREVIOUS CODE SURGERY DATA:
${surgeryData.substring(0, 1000)}

Identify code quality issues, predict risks, and score overall health. Return JSON:
{
  "issues": [
    {
      "id": "issue_1",
      "type": "unhandled_exception",
      "severity": "critical",
      "file_pattern": "PaymentService (inferred from ticket patterns)",
      "description": "Unhandled NullPointerException occurring during payment processing",
      "evidence": "Appears in 12 support tickets over past 30 days",
      "ai_fix_suggestion": "Add null validation before payment object access; wrap in try-catch with proper error logging",
      "estimated_fix_hours": 3,
      "recurrence_count": 12,
      "first_seen": "30 days ago",
      "last_seen": "Today"
    }
  ],
  "code_health_score": 65,
  "code_health_grade": "C",
  "technical_risk_level": "high",
  "ai_risk_prediction": "Based on current patterns, a cascading failure in the payment subsystem is likely within 2-3 weeks if unaddressed",
  "ai_priority_fixes": [
    {"rank": 1, "issue_id": "issue_1", "reason": "Highest recurrence, payment-critical", "roi_multiplier": 8},
    {"rank": 2, "issue_id": "issue_2", "reason": "Second priority", "roi_multiplier": 5}
  ],
  "estimated_total_fix_hours": 24,
  "estimated_rework_cost_inr": 72000
}`

  const ai = await callAI(prompt)
  const issues = ai.issues || []
  const crit = issues.filter(i => i.severity === 'critical').length
  const high = issues.filter(i => i.severity === 'high').length
  const med = issues.filter(i => i.severity === 'medium').length
  const low = issues.filter(i => i.severity === 'low').length

  const { data } = await supabase.from('code_quality_scans').insert({
    scan_number: scanNum,
    scan_type: 'full',
    source_type: 'error_logs',
    source_data: { ticket_count: tickets?.length || 0, surgery_sessions: csSessions?.length || 0 },
    tickets_analyzed: tickets?.length || 0,
    total_issues: issues.length,
    critical_issues: crit,
    high_issues: high,
    medium_issues: med,
    low_issues: low,
    issues,
    code_health_score: ai.code_health_score || 70,
    code_health_grade: ai.code_health_grade || 'B',
    technical_risk_level: ai.technical_risk_level || 'medium',
    ai_risk_prediction: ai.ai_risk_prediction || '',
    ai_priority_fixes: ai.ai_priority_fixes || [],
    estimated_total_fix_hours: ai.estimated_total_fix_hours || 0,
    estimated_rework_cost_inr: ai.estimated_rework_cost_inr || 0,
    scan_started_at: startedAt,
    scan_completed_at: new Date().toISOString(),
  }).select().single()

  return data
}

// ═══════════════════════════════════════════════════════════════════
//  P48: USER JOURNEY ANALYTICS
// ═══════════════════════════════════════════════════════════════════
export async function analyzeTicketJourney(ticketId) {
  const supabase = getSupabase()

  const { data: ticket } = await supabase.from('tickets')
    .select('id, ticket_number, title, priority, status, created_at, resolved_at, assigned_to, assigned_team, sla_resolve_met').eq('id', ticketId).single()

  const { data: comments } = await supabase.from('ticket_comments')
    .select('created_at, is_internal, author_id').eq('ticket_id', ticketId).order('created_at', { ascending: true })

  const { data: audit } = await supabase.from('ticket_audit_log')
    .select('action, created_at, changed_by').eq('ticket_id', ticketId).order('created_at', { ascending: true })

  const totalMin = ticket?.resolved_at
    ? Math.round((new Date(ticket.resolved_at) - new Date(ticket.created_at)) / 60000) : 0

  const timeline = [...(comments||[]).map(c => ({ type: 'comment', at: c.created_at, internal: c.is_internal })),
    ...(audit||[]).map(a => ({ type: 'audit', action: a.action, at: a.created_at }))]
    .sort((a,b) => new Date(a.at) - new Date(b.at))

  const prompt = `You are a Customer Journey Analyst. Map the complete lifecycle journey of this support ticket.

TICKET: ${ticket?.ticket_number} — ${ticket?.title}
PRIORITY: ${ticket?.priority}
CREATED: ${ticket?.created_at}
RESOLVED: ${ticket?.resolved_at || 'OPEN'}
TOTAL TIME: ${totalMin} minutes
TEAM: ${ticket?.assigned_team}
SLA MET: ${ticket?.sla_resolve_met}
TIMELINE EVENTS: ${timeline.length} events (${(comments||[]).length} comments, ${(audit||[]).length} audit entries)

Build a realistic journey map and analyze efficiency. Return JSON:
{
  "journey_phases": [
    {
      "phase": "submission",
      "started_at": "${ticket?.created_at}",
      "duration_min": 5,
      "actor": "customer",
      "outcome": "passed",
      "delay_reason": null
    },
    {
      "phase": "triage",
      "duration_min": ${Math.round(totalMin * 0.1) || 10},
      "actor": "system",
      "outcome": "passed",
      "delay_reason": null
    },
    {
      "phase": "assignment",
      "duration_min": ${Math.round(totalMin * 0.05) || 5},
      "actor": "L1",
      "outcome": "passed",
      "delay_reason": null
    },
    {
      "phase": "diagnosis",
      "duration_min": ${Math.round(totalMin * 0.3) || 30},
      "actor": "L1",
      "outcome": "escalated",
      "delay_reason": "unclear_priority"
    },
    {
      "phase": "resolution",
      "duration_min": ${Math.round(totalMin * 0.5) || 50},
      "actor": "L2",
      "outcome": "passed",
      "delay_reason": null
    }
  ],
  "total_journey_min": ${totalMin},
  "active_work_min": ${Math.round(totalMin * 0.4) || 40},
  "idle_time_min": ${Math.round(totalMin * 0.6) || 60},
  "idle_pct": ${totalMin > 0 ? Math.round(60 / totalMin * 100) : 60},
  "handoff_count": 2,
  "escalation_count": 1,
  "critical_bottleneck": "Extended diagnosis phase due to missing system logs",
  "bottleneck_phase": "diagnosis",
  "bottleneck_duration_min": ${Math.round(totalMin * 0.3) || 30},
  "first_contact_resolution": ${ticket?.sla_resolve_met || false},
  "rework_count": 0,
  "sla_breach_risk_pct": ${ticket?.sla_resolve_met === false ? 85 : 20},
  "ai_journey_grade": "${totalMin < 120 ? 'A' : totalMin < 240 ? 'B' : totalMin < 480 ? 'C' : 'D'}",
  "ai_efficiency_score": ${totalMin > 0 ? Math.min(95, Math.round(240 / totalMin * 80)) : 70},
  "ai_friction_points": [
    {"phase": "diagnosis", "friction": "No runbook available for this error type", "impact": "high"}
  ],
  "ai_recommendations": [
    {"action": "Create runbook for common authentication errors", "expected_time_saved_min": 45}
  ],
  "predicted_csat": ${ticket?.sla_resolve_met === false ? 2 : 4},
  "customer_effort_score": ${ticket?.sla_resolve_met === false ? 7 : 3}
}`

  const ai = await callAI(prompt)

  const { data: existing } = await supabase.from('ticket_journey_maps').select('id').eq('ticket_id', ticketId).single()
  const journey = {
    ticket_id: ticketId,
    ticket_number: ticket?.ticket_number || '',
    journey_phases: ai.journey_phases || [],
    total_journey_min: ai.total_journey_min || totalMin,
    active_work_min: ai.active_work_min || 0,
    idle_time_min: ai.idle_time_min || 0,
    idle_pct: ai.idle_pct || 0,
    handoff_count: ai.handoff_count || 0,
    escalation_count: ai.escalation_count || 0,
    critical_bottleneck: ai.critical_bottleneck || '',
    bottleneck_phase: ai.bottleneck_phase || '',
    bottleneck_duration_min: ai.bottleneck_duration_min || 0,
    first_contact_resolution: ai.first_contact_resolution || false,
    rework_count: ai.rework_count || 0,
    sla_breach_risk_pct: ai.sla_breach_risk_pct || 0,
    ai_journey_grade: ai.ai_journey_grade || 'B',
    ai_efficiency_score: ai.ai_efficiency_score || 70,
    ai_friction_points: ai.ai_friction_points || [],
    ai_recommendations: ai.ai_recommendations || [],
    predicted_csat: ai.predicted_csat || 3,
    customer_effort_score: ai.customer_effort_score || 5,
    analyzed_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { data } = await supabase.from('ticket_journey_maps').update(journey).eq('id', existing.id).select().single()
    return data
  }
  const { data } = await supabase.from('ticket_journey_maps').insert(journey).select().single()
  return data
}

// ═══════════════════════════════════════════════════════════════════
//  P49: TECH DEBT TRACKER
// ═══════════════════════════════════════════════════════════════════
export async function detectTechDebt() {
  const supabase = getSupabase()

  const { data: tickets } = await supabase.from('tickets')
    .select('id, title, description, category_id, priority').order('created_at', { ascending: false }).limit(200)

  // Group by title similarity (rough dedup)
  const titleCounts = {}
  ;(tickets||[]).forEach(t => {
    const key = (t.title||'').toLowerCase().replace(/\s+/g,'_').substring(0,40)
    titleCounts[key] = (titleCounts[key] || [])
    titleCounts[key].push(t)
  })
  const recurring = Object.entries(titleCounts).filter(([,v]) => v.length >= 2).slice(0, 10)

  const ticketSample = (tickets||[]).slice(0,20).map(t => `- ${t.title}: ${(t.description||'').substring(0,100)}`).join('\n')

  const prompt = `You are a Tech Debt Intelligence AI. Identify technical debt by analyzing recurring support patterns and ticket themes.

RECURRING TICKET PATTERNS (${recurring.length} found):
${recurring.map(([key, tickets]) => `Pattern "${key}": ${tickets.length} occurrences`).join('\n')}

TICKET SAMPLE:
${ticketSample.substring(0, 2000)}

Identify and quantify tech debt items. Return JSON:
{
  "debt_items": [
    {
      "debt_type": "architectural",
      "debt_severity": "high",
      "component": "Authentication Service",
      "title": "Session Management Architecture Unable to Handle Load Spikes",
      "description": "Authentication failures during peak hours suggest session handling doesn't scale horizontally",
      "root_cause": "Stateful session design incompatible with current multi-server setup",
      "recurring_ticket_count": 15,
      "monthly_support_cost_inr": 45000,
      "monthly_customer_impact_inr": 120000,
      "interest_rate_pct": 8.5,
      "total_debt_cost_inr": 500000,
      "projected_6m_cost_inr": 1200000,
      "estimated_fix_hours": 80,
      "estimated_fix_cost_inr": 240000,
      "fix_roi_multiple": 5.0,
      "fix_priority_score": 88,
      "ai_impact_projection": "Without fixing, monthly cost increases 8.5% as load grows. Expect complete auth failure at 3x current load.",
      "ai_fix_recommendation": "Migrate to JWT-based stateless auth with Redis session cache — 2-week sprint"
    }
  ]
}`

  const ai = await callAI(prompt)
  const debtItems = ai.debt_items || []
  const { count } = await supabase.from('tech_debt_items').select('*', { count: 'exact', head: true })
  let base = count || 0
  const results = []

  for (const item of debtItems) {
    base++
    const { data } = await supabase.from('tech_debt_items').insert({
      debt_number: `TD-${counter(base)}`,
      debt_type: item.debt_type || 'code',
      debt_severity: item.debt_severity || 'medium',
      component: item.component || '',
      title: item.title || '',
      description: item.description || '',
      root_cause: item.root_cause || '',
      recurring_ticket_count: item.recurring_ticket_count || 0,
      monthly_support_cost_inr: item.monthly_support_cost_inr || 0,
      monthly_customer_impact_inr: item.monthly_customer_impact_inr || 0,
      interest_rate_pct: item.interest_rate_pct || 5,
      total_debt_cost_inr: item.total_debt_cost_inr || 0,
      projected_6m_cost_inr: item.projected_6m_cost_inr || 0,
      estimated_fix_hours: item.estimated_fix_hours || 0,
      estimated_fix_cost_inr: item.estimated_fix_cost_inr || 0,
      fix_roi_multiple: item.fix_roi_multiple || 1,
      fix_priority_score: item.fix_priority_score || 50,
      status: 'identified',
      ai_impact_projection: item.ai_impact_projection || '',
      ai_fix_recommendation: item.ai_fix_recommendation || '',
      first_observed_at: new Date(Date.now() - 30*24*60*60*1000).toISOString(),
    }).select().single()
    if (data) results.push(data)
  }
  return results
}

// ═══════════════════════════════════════════════════════════════════
//  P50: ERROR COST CALCULATOR
// ═══════════════════════════════════════════════════════════════════
export async function calculateErrorCost(errorSignature, errorDescription) {
  const supabase = getSupabase()

  const { data: matchingTickets } = await supabase.from('tickets')
    .select('id, priority, created_at, resolved_at, sla_resolve_met')
    .ilike('description', `%${errorSignature.substring(0,30)}%`)
    .limit(50)

  const frequency = matchingTickets?.length || 1
  const avgResMin = (() => {
    const resolved = (matchingTickets||[]).filter(t => t.resolved_at)
    if (!resolved.length) return 60
    return Math.round(resolved.reduce((s,t) => s + Math.round((new Date(t.resolved_at)-new Date(t.created_at))/60000), 0) / resolved.length)
  })()

  const prompt = `You are a Business Cost Intelligence AI. Calculate the TRUE total business cost of this recurring error.

ERROR: ${errorSignature}
DESCRIPTION: ${errorDescription.substring(0, 400)}
FREQUENCY: ${frequency} occurrences in 30 days
AVG RESOLUTION TIME: ${avgResMin} minutes
MATCHING TICKETS: ${frequency}

Calculate every dimension of cost — direct, indirect, and hidden. Return JSON:
{
  "error_type": "payment_processing_failure",
  "affected_users_estimated": ${frequency * 3},
  "agent_time_cost_inr": ${frequency * avgResMin * 8},
  "l2_escalation_cost_inr": ${Math.round(frequency * 0.3 * 500)},
  "developer_fix_time_cost_inr": 15000,
  "customer_downtime_cost_inr": ${frequency * 5000},
  "sla_penalty_cost_inr": ${(matchingTickets||[]).filter(t=>t.sla_resolve_met===false).length * 25000},
  "churn_risk_cost_inr": ${frequency * 2000},
  "reputation_cost_inr": ${frequency * 1000},
  "ops_overhead_cost_inr": ${frequency * 500},
  "rework_opportunity_cost_inr": 20000,
  "monitoring_overhead_inr": 5000,
  "customer_service_overhead_inr": ${frequency * 750},
  "total_direct_cost_inr": ${frequency * avgResMin * 8 + 15000},
  "total_indirect_cost_inr": ${frequency * 8500},
  "total_hidden_cost_inr": 25000,
  "true_total_cost_inr": ${frequency * (avgResMin * 8 + 8500) + 40000},
  "cost_per_occurrence_inr": ${Math.round(frequency * (avgResMin * 8 + 8500) / frequency)},
  "fix_investment_inr": 50000,
  "fix_roi_multiple": ${Math.round(frequency * (avgResMin * 8 + 8500) / 50000 * 10) / 10},
  "fix_payback_days": ${Math.round(50000 / (frequency * (avgResMin * 8 + 8500) / 30))},
  "fix_priority": "${frequency > 10 ? 'immediate' : frequency > 5 ? 'high' : 'medium'}",
  "ai_cost_narrative": "This error costs the business an estimated ₹${(frequency * (avgResMin * 8 + 8500) + 40000).toLocaleString()} per month — ${Math.round(frequency * (avgResMin * 8 + 8500) / 50000 * 10) / 10}x the cost of fixing it permanently.",
  "ai_fix_urgency": "Every day of delay costs approximately ₹${Math.round((frequency * (avgResMin * 8 + 8500) + 40000) / 30).toLocaleString()}",
  "ai_prevention_strategy": "Implement circuit breaker pattern + proactive monitoring alert before customer impact"
}`

  const ai = await callAI(prompt)
  const { count } = await supabase.from('error_cost_analyses').select('*', { count: 'exact', head: true })

  const { data } = await supabase.from('error_cost_analyses').insert({
    analysis_number: `ECA-${counter((count||0)+1)}`,
    error_signature: errorSignature,
    error_type: ai.error_type || 'unknown',
    error_frequency: frequency,
    affected_tickets: frequency,
    affected_users_estimated: ai.affected_users_estimated || frequency,
    period_days: 30,
    agent_time_cost_inr: ai.agent_time_cost_inr || 0,
    l2_escalation_cost_inr: ai.l2_escalation_cost_inr || 0,
    developer_fix_time_cost_inr: ai.developer_fix_time_cost_inr || 0,
    customer_downtime_cost_inr: ai.customer_downtime_cost_inr || 0,
    sla_penalty_cost_inr: ai.sla_penalty_cost_inr || 0,
    churn_risk_cost_inr: ai.churn_risk_cost_inr || 0,
    reputation_cost_inr: ai.reputation_cost_inr || 0,
    ops_overhead_cost_inr: ai.ops_overhead_cost_inr || 0,
    rework_opportunity_cost_inr: ai.rework_opportunity_cost_inr || 0,
    monitoring_overhead_inr: ai.monitoring_overhead_inr || 0,
    customer_service_overhead_inr: ai.customer_service_overhead_inr || 0,
    total_direct_cost_inr: ai.total_direct_cost_inr || 0,
    total_indirect_cost_inr: ai.total_indirect_cost_inr || 0,
    total_hidden_cost_inr: ai.total_hidden_cost_inr || 0,
    true_total_cost_inr: ai.true_total_cost_inr || 0,
    cost_per_occurrence_inr: ai.cost_per_occurrence_inr || 0,
    fix_investment_inr: ai.fix_investment_inr || 0,
    fix_roi_multiple: ai.fix_roi_multiple || 1,
    fix_payback_days: ai.fix_payback_days || 30,
    fix_priority: ai.fix_priority || 'medium',
    ai_cost_narrative: ai.ai_cost_narrative || '',
    ai_fix_urgency: ai.ai_fix_urgency || '',
    ai_prevention_strategy: ai.ai_prevention_strategy || '',
  }).select().single()

  return data
}
