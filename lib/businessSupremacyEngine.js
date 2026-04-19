/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  BUSINESS SUPREMACY ENGINE — businessSupremacyEngine.js         ║
 * ║  P41: ROI Intelligence | P42: Support DNA                       ║
 * ║  P43: Voice AI | P44: Business Context | P45: Process Impact    ║
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
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || '{}'
  return jsonMode ? JSON.parse(content) : content
}

// ════════════════════════════════════════════════════════════════════
//  P41: ROI INTELLIGENCE ENGINE
// ════════════════════════════════════════════════════════════════════
export async function calculateROI(periodType = 'monthly') {
  const supabase = getSupabase()
  const now = new Date()
  let periodLabel = ''
  let startDate = new Date()

  if (periodType === 'monthly') {
    periodLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (periodType === 'weekly') {
    const weekNum = Math.ceil(now.getDate() / 7)
    periodLabel = `week-${weekNum}-${now.getFullYear()}`
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  } else {
    const q = Math.ceil((now.getMonth() + 1) / 3)
    periodLabel = `Q${q}-${now.getFullYear()}`
    startDate = new Date(now.getFullYear(), (q - 1) * 3, 1)
  }

  const [ticketsR, eventsR, warR] = await Promise.all([
    supabase.from('tickets').select('id, status, resolved_at, created_at, sla_resolve_met, priority, assigned_team')
      .gte('created_at', startDate.toISOString()),
    supabase.from('roi_events').select('event_type, value_inr, agent_minutes_saved')
      .gte('created_at', startDate.toISOString()),
    supabase.from('war_room_snapshots').select('critical_incidents').order('snapshot_at', { ascending: false }).limit(5),
  ])

  const tickets = ticketsR.data || []
  const events = eventsR.data || []
  const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed')
  const slaBreachesPrevented = tickets.filter(t => t.sla_resolve_met === true).length
  const criticalPrevented = (warR.data || []).reduce((s, w) => s + (w.critical_incidents || 0), 0)

  // Hard savings math
  const agentHoursSaved = events.filter(e => e.event_type === 'auto_resolve').reduce((s, e) => s + (e.agent_minutes_saved || 30), 0) / 60
  const agentCostPerHour = 500
  const agentCostSavings = agentHoursSaved * agentCostPerHour

  const autoResolved = events.filter(e => e.event_type === 'auto_resolve').length
  const autoResolveSavings = autoResolved * 750

  const slaSavings = slaBreachesPrevented * 25000
  const escalationEvents = events.filter(e => e.event_type === 'escalation_prevent')
  const escalationSavings = escalationEvents.length * 2000

  const churnPrevented = events.filter(e => e.event_type === 'churn_prevent').length
  const churnValueSaved = churnPrevented * 150000 // avg customer lifetime value
  const brandDamagePrevented = criticalPrevented * 50000

  const totalHard = agentCostSavings + autoResolveSavings + slaSavings + escalationSavings
  const totalSoft = churnValueSaved + brandDamagePrevented
  const totalROI = totalHard + totalSoft
  const nexdeskCost = 15000
  const roiMultiple = nexdeskCost > 0 ? Math.round((totalROI / nexdeskCost) * 10) / 10 : 0

  const prompt = `You are a Business Value Communicator. Write an executive-level ROI narrative.

PERIOD: ${periodLabel}
METRICS:
- Agent Hours Saved: ${agentHoursSaved.toFixed(1)} hours (₹${Math.round(agentCostSavings).toLocaleString()} saved)
- Auto-Resolved Tickets: ${autoResolved} (₹${autoResolveSavings.toLocaleString()} saved)
- SLA Breaches Prevented: ${slaBreachesPrevented} (₹${slaSavings.toLocaleString()} in penalties avoided)
- Escalations Prevented: ${escalationEvents.length} (₹${escalationSavings.toLocaleString()} saved)
- Churn Risk Neutralized: ${churnPrevented} customers
- Total ROI: ₹${Math.round(totalROI).toLocaleString()} vs ₹${nexdeskCost.toLocaleString()} platform cost = ${roiMultiple}x return

Return JSON:
{
  "roi_story": "2-3 sentence executive narrative explaining this ROI in business language",
  "top_wins": [
    {"win": "specific achievement", "value_inr": 25000, "context": "business meaning"}
  ],
  "opportunities": [
    {"opportunity": "what could increase ROI further", "potential_inr": 50000}
  ]
}`

  const ai = await callAI(prompt)

  const { data } = await supabase.from('roi_snapshots').insert({
    period: periodLabel, period_type: periodType,
    agent_hours_saved: agentHoursSaved,
    agent_cost_per_hour_inr: agentCostPerHour,
    agent_cost_savings_inr: agentCostSavings,
    tickets_auto_resolved: autoResolved,
    auto_resolve_savings_inr: autoResolveSavings,
    sla_breaches_prevented: slaBreachesPrevented,
    sla_savings_inr: slaSavings,
    escalations_prevented: escalationEvents.length,
    escalation_savings_inr: escalationSavings,
    churn_prevented_count: churnPrevented,
    churn_value_saved_inr: churnValueSaved,
    brand_damage_prevented_inr: brandDamagePrevented,
    total_hard_savings_inr: totalHard,
    total_soft_value_inr: totalSoft,
    total_roi_inr: totalROI,
    nexdesk_cost_inr: nexdeskCost,
    roi_multiple: roiMultiple,
    ai_roi_story: ai.roi_story || '',
    ai_top_wins: ai.top_wins || [],
    ai_opportunities: ai.opportunities || [],
  }).select().single()

  return data
}

// ════════════════════════════════════════════════════════════════════
//  P42: SUPPORT DNA PROFILER
// ════════════════════════════════════════════════════════════════════
export async function buildSupportDNA(entityType = 'team', entityId = null) {
  const supabase = getSupabase()
  const period = new Date().toISOString().substring(0, 7)

  let tickets = []
  let entity_name = 'Full Team'

  if (entityType === 'team') {
    const { data } = await supabase.from('tickets')
      .select('id, priority, status, created_at, resolved_at, sla_resolve_met, assigned_team, resolution_notes')
      .order('created_at', { ascending: false }).limit(200)
    tickets = data || []
  } else if (entityType === 'agent' && entityId) {
    const { data: agent } = await supabase.from('profiles')
      .select('email, full_name').eq('id', entityId).single()
    entity_name = agent?.full_name || agent?.email || entityId
    const { data } = await supabase.from('tickets')
      .select('id, priority, status, created_at, resolved_at, sla_resolve_met, resolution_notes')
      .eq('assigned_to', entityId).order('created_at', { ascending: false }).limit(100)
    tickets = data || []
  }

  const resolved = tickets.filter(t => t.resolved_at)
  const resTimes = resolved.map(t => Math.round((new Date(t.resolved_at) - new Date(t.created_at)) / 60000))
  const avgRes = resTimes.length ? Math.round(resTimes.reduce((a, b) => a + b, 0) / resTimes.length) : 0
  const slaOk = tickets.filter(t => t.sla_resolve_met === true).length
  const slaRatio = tickets.length ? Math.round(slaOk / tickets.length * 100) : 0
  const criticalTickets = tickets.filter(t => t.priority === 'critical')
  const resNotes = resolved.slice(0, 10).map(t => t.resolution_notes).filter(Boolean).join('\n')

  const prompt = `You are a Behavioral Analytics AI. Build a comprehensive Support DNA profile.

ENTITY: ${entity_name} (${entityType})
METRICS:
- Total Tickets: ${tickets.length}
- Resolved: ${resolved.length}
- Avg Resolution Time: ${avgRes} min
- SLA Compliance: ${slaRatio}%
- Critical Tickets Handled: ${criticalTickets.length}
- Industry Benchmark: 240min avg, 78% SLA compliance

SAMPLE RESOLUTION NOTES:
${resNotes.substring(0, 1000)}

Score each DNA dimension 0-100 and provide deep insights. Return JSON:
{
  "speed_dna": 75,
  "quality_dna": 80,
  "empathy_dna": 65,
  "technical_dna": 70,
  "proactivity_dna": 55,
  "collaboration_dna": 60,
  "learning_dna": 70,
  "consistency_dna": 72,
  "overall_dna_score": 68,
  "dna_grade": "A",
  "superpower": "Lightning-fast triage of critical issues with near-perfect SLA compliance",
  "kryptonite": "Struggles with multi-stakeholder escalation communication during P1 events",
  "blind_spots": ["Misses recurring issue patterns", "Under-documents root causes"],
  "peak_performance_time": "10am-2pm weekdays",
  "performance_drop_triggers": ["High volume periods", "Monday mornings", "Month-end"],
  "resolution_style": "Methodical",
  "ai_prescription": [
    {"issue": "Empathy gap in distressed tickets", "fix": "Use AI empathy scripts before technical response", "priority": "high"}
  ],
  "ai_coaching_plan": "Focus on proactive communication and pattern recognition over next 30 days",
  "team_culture_analysis": "Strong execution culture but needs investment in knowledge sharing rituals",
  "industry_percentile": 72
}`

  const ai = await callAI(prompt)

  const { data } = await supabase.from('support_dna_profiles').insert({
    profile_period: period,
    profile_type: entityType,
    entity_id: entityId || 'team',
    entity_name: entity_name,
    speed_dna: ai.speed_dna || 50,
    quality_dna: ai.quality_dna || 50,
    empathy_dna: ai.empathy_dna || 50,
    technical_dna: ai.technical_dna || 50,
    proactivity_dna: ai.proactivity_dna || 50,
    collaboration_dna: ai.collaboration_dna || 50,
    learning_dna: ai.learning_dna || 50,
    consistency_dna: ai.consistency_dna || 50,
    overall_dna_score: ai.overall_dna_score || 50,
    dna_grade: ai.dna_grade || 'B',
    superpower: ai.superpower || '',
    kryptonite: ai.kryptonite || '',
    blind_spots: ai.blind_spots || [],
    peak_performance_time: ai.peak_performance_time || '',
    performance_drop_triggers: ai.performance_drop_triggers || [],
    resolution_style: ai.resolution_style || '',
    ai_prescription: ai.ai_prescription || [],
    ai_coaching_plan: ai.ai_coaching_plan || '',
    team_culture_analysis: ai.team_culture_analysis || '',
    industry_percentile: ai.industry_percentile || 50,
  }).select().single()

  return data
}

// ════════════════════════════════════════════════════════════════════
//  P43: VOICE SUPPORT AI
// ════════════════════════════════════════════════════════════════════
export async function analyzeVoiceInteraction(sessionId, transcriptText, durationSec = 0, language = 'en') {
  const supabase = getSupabase()

  const prompt = `You are a Voice Intelligence AI. Analyze this customer support call transcript.

TRANSCRIPT (${durationSec}s call):
${transcriptText.substring(0, 3000)}

Perform deep voice analytics. Return JSON:
{
  "ai_sentiment": "frustrated | neutral | satisfied | distressed | angry | happy",
  "ai_emotion_detected": "calm | frustrated | panic | confused | crying | angry | relieved",
  "ai_urgency_score": 75,
  "ai_key_issues": [
    {"issue": "Payment processing failed since morning", "severity": "critical"}
  ],
  "ai_action_items": [
    {"action": "Check payment gateway status", "owner": "L2 team", "deadline": "within 1 hour"}
  ],
  "ai_summary": "Customer called about payment system failure affecting 50+ employees. Critical business impact. Needs immediate L2 escalation.",
  "speaking_pace": "fast | normal | slow | rushed",
  "stress_indicators": ["voice breaks at 1:30", "repetitive questioning", "long pauses"],
  "auto_ticket_priority": "critical | high | medium | low",
  "cleaned_transcript": "cleaned version removing filler words",
  "ai_reply_script": "Thank you for calling NexDesk support. I completely understand how critical this is for your business. I am escalating this directly to our senior payment systems team right now...",
  "ai_reply_tone": "urgent-empathetic"
}`

  const ai = await callAI(prompt)

  const sessionData = {
    session_id: sessionId,
    duration_sec: durationSec,
    language_detected: language,
    raw_transcript: transcriptText,
    cleaned_transcript: ai.cleaned_transcript || transcriptText,
    ai_sentiment: ai.ai_sentiment || 'neutral',
    ai_emotion_detected: ai.ai_emotion_detected || 'calm',
    ai_urgency_score: ai.ai_urgency_score || 50,
    ai_key_issues: ai.ai_key_issues || [],
    ai_action_items: ai.ai_action_items || [],
    ai_summary: ai.ai_summary || '',
    speaking_pace: ai.speaking_pace || 'normal',
    stress_indicators: ai.stress_indicators || [],
    auto_ticket_priority: ai.auto_ticket_priority || 'medium',
    auto_ticket_created: false,
    ai_reply_script: ai.ai_reply_script || '',
    ai_reply_tone: ai.ai_reply_tone || 'professional',
    processing_status: 'analyzed',
  }

  const { data: existing } = await supabase.from('voice_interactions')
    .select('id').eq('session_id', sessionId).single()

  if (existing?.id) {
    const { data } = await supabase.from('voice_interactions').update(sessionData).eq('id', existing.id).select().single()
    return data
  }
  const { data } = await supabase.from('voice_interactions').insert(sessionData).select().single()
  return data
}

// ════════════════════════════════════════════════════════════════════
//  P44: BUSINESS CONTEXT ENGINE
// ════════════════════════════════════════════════════════════════════
export async function buildBusinessContext(ticketId) {
  const supabase = getSupabase()
  const { data: ticket } = await supabase.from('tickets')
    .select('id, title, description, priority, created_at, category_id').eq('id', ticketId).single()

  const now = new Date()
  const dayOfMonth = now.getDate()
  const month = now.getMonth() + 1
  const isEndOfQuarter = [3, 6, 9, 12].includes(month) && dayOfMonth >= 25
  const isEndOfMonth = dayOfMonth >= 26
  const isPayrollDay = [25, 26, 27, 28].includes(dayOfMonth)

  const prompt = `You are a Business Intelligence Contextualizer. Analyze this IT support ticket in context of business reality.

TODAY: ${now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
END OF QUARTER: ${isEndOfQuarter}
END OF MONTH: ${isEndOfMonth}
PAYROLL PERIOD: ${isPayrollDay}

TICKET: ${ticket?.title}
DESCRIPTION: ${(ticket?.description || '').substring(0, 600)}
PRIORITY: ${ticket?.priority}

Determine the true business context and impact. Return JSON:
{
  "is_end_of_quarter": ${isEndOfQuarter},
  "is_product_launch_week": false,
  "is_audit_period": false,
  "is_peak_traffic_period": false,
  "is_payroll_run_day": ${isPayrollDay},
  "is_board_meeting_week": false,
  "business_calendar_event": "Month-end financial close",
  "customer_industry": "IT Services",
  "customer_company_size": "enterprise",
  "customer_fiscal_period": "Q1 close",
  "customer_recent_activity": "Recent product launch, high growth phase",
  "affected_department": "Finance",
  "affected_process": "Revenue Collection",
  "process_criticality": "mission-critical",
  "downstream_dependency_count": 5,
  "business_risk_score": 88,
  "business_risk_level": "critical",
  "risk_escalation_required": true,
  "ai_business_context_summary": "This ticket occurs during month-end financial close when transaction failures can block revenue recognition",
  "ai_business_priority_reason": "Month-end + payment system + enterprise client = extreme business urgency beyond technical severity",
  "ai_stakeholder_impact": "CFO, Revenue Ops team, 50+ enterprise customers blocked",
  "ai_recommended_response_strategy": "Skip L1 triage, direct L2 escalation with finance team CC, 15-minute update cadence"
}`

  const ai = await callAI(prompt)

  const { data: existing } = await supabase.from('business_contexts')
    .select('id').eq('ticket_id', ticketId).single()

  const ctxData = {
    ticket_id: ticketId,
    is_end_of_quarter: ai.is_end_of_quarter || isEndOfQuarter,
    is_product_launch_week: ai.is_product_launch_week || false,
    is_audit_period: ai.is_audit_period || false,
    is_peak_traffic_period: ai.is_peak_traffic_period || false,
    is_payroll_run_day: ai.is_payroll_run_day || isPayrollDay,
    is_board_meeting_week: ai.is_board_meeting_week || false,
    business_calendar_event: ai.business_calendar_event || '',
    customer_industry: ai.customer_industry || 'Technology',
    customer_company_size: ai.customer_company_size || 'enterprise',
    customer_fiscal_period: ai.customer_fiscal_period || '',
    customer_recent_activity: ai.customer_recent_activity || '',
    affected_department: ai.affected_department || '',
    affected_process: ai.affected_process || '',
    process_criticality: ai.process_criticality || 'medium',
    downstream_dependency_count: ai.downstream_dependency_count || 0,
    business_risk_score: ai.business_risk_score || 50,
    business_risk_level: ai.business_risk_level || 'medium',
    risk_escalation_required: ai.risk_escalation_required || false,
    ai_business_context_summary: ai.ai_business_context_summary || '',
    ai_business_priority_reason: ai.ai_business_priority_reason || '',
    ai_stakeholder_impact: ai.ai_stakeholder_impact || '',
    ai_recommended_response_strategy: ai.ai_recommended_response_strategy || '',
    analyzed_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { data } = await supabase.from('business_contexts').update(ctxData).eq('id', existing.id).select().single()
    return data
  }
  const { data } = await supabase.from('business_contexts').insert(ctxData).select().single()
  return data
}

// ════════════════════════════════════════════════════════════════════
//  P45: PROCESS IMPACT ANALYZER
// ════════════════════════════════════════════════════════════════════
export async function analyzeProcessImpact(ticketId, originSystem, originSeverity = 'high') {
  const supabase = getSupabase()
  const { data: ticket } = await supabase.from('tickets')
    .select('id, title, description, priority').eq('id', ticketId).single()

  const prompt = `You are a Business Process Impact Modeler. Map the cascade blast wave of this incident through the organization.

INCIDENT: ${ticket?.title}
FAILED SYSTEM: ${originSystem}
SEVERITY: ${originSeverity}
DESCRIPTION: ${(ticket?.description || '').substring(0, 500)}

Model the complete impact cascade as a directed graph. Return JSON:
{
  "impact_nodes": [
    {
      "id": "node_0",
      "process": "${originSystem}",
      "team": "IT Operations",
      "severity": "critical",
      "estimated_delay_min": 0,
      "revenue_impact_inr": 0,
      "depends_on": [],
      "status": "failed"
    },
    {
      "id": "node_1",
      "process": "Customer Onboarding",
      "team": "Customer Success",
      "severity": "critical",
      "estimated_delay_min": 60,
      "revenue_impact_inr": 500000,
      "depends_on": ["node_0"],
      "status": "blocked"
    },
    {
      "id": "node_2",
      "process": "Invoice Generation",
      "team": "Finance",
      "severity": "high",
      "estimated_delay_min": 120,
      "revenue_impact_inr": 800000,
      "depends_on": ["node_0"],
      "status": "degraded"
    },
    {
      "id": "node_3",
      "process": "Revenue Recognition",
      "team": "Finance",
      "severity": "critical",
      "estimated_delay_min": 240,
      "revenue_impact_inr": 2000000,
      "depends_on": ["node_2"],
      "status": "blocked"
    }
  ],
  "total_processes_impacted": 4,
  "total_teams_impacted": 3,
  "total_people_blocked": 45,
  "max_cascade_depth": 3,
  "estimated_total_delay_hours": 8,
  "direct_revenue_impact_inr": 1300000,
  "indirect_revenue_impact_inr": 2500000,
  "total_impact_inr": 3800000,
  "critical_path_fix": "Restore ${originSystem} connectivity — this single action unblocks all 4 downstream processes",
  "recovery_sequence": [
    {"step": 1, "action": "Restore DB connection pool", "unblocks": "node_0, node_1", "time_min": 30},
    {"step": 2, "action": "Validate invoice queue", "unblocks": "node_2", "time_min": 15},
    {"step": 3, "action": "Trigger revenue reconciliation job", "unblocks": "node_3", "time_min": 20}
  ],
  "estimated_recovery_min": 65,
  "ai_impact_narrative": "This incident has created a blast wave affecting 3 departments and blocking ₹38L in revenue recognition",
  "ai_priority_justification": "The Revenue Recognition node has zero tolerance for delay during month-end close"
}`

  const ai = await callAI(prompt)

  const nodes = ai.impact_nodes || []
  const directImpact = nodes.reduce((s, n) => s + (n.revenue_impact_inr || 0), 0)

  const { data } = await supabase.from('process_impact_maps').insert({
    ticket_id: ticketId,
    analysis_name: `${originSystem} Impact Analysis`,
    origin_system: originSystem,
    origin_team: (nodes[0]?.team) || 'IT',
    origin_severity: originSeverity,
    impact_nodes: nodes,
    total_processes_impacted: ai.total_processes_impacted || nodes.length,
    total_teams_impacted: ai.total_teams_impacted || 2,
    total_people_blocked: ai.total_people_blocked || 0,
    max_cascade_depth: ai.max_cascade_depth || 1,
    estimated_total_delay_hours: ai.estimated_total_delay_hours || 1,
    direct_revenue_impact_inr: ai.direct_revenue_impact_inr || directImpact,
    indirect_revenue_impact_inr: ai.indirect_revenue_impact_inr || 0,
    total_impact_inr: ai.total_impact_inr || directImpact,
    critical_path_fix: ai.critical_path_fix || '',
    recovery_sequence: ai.recovery_sequence || [],
    estimated_recovery_min: ai.estimated_recovery_min || 60,
    ai_impact_narrative: ai.ai_impact_narrative || '',
    ai_priority_justification: ai.ai_priority_justification || '',
  }).select().single()

  return data
}
