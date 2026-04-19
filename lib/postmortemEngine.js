/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  AI POSTMORTEM ENGINE — postmortemEngine.js                     ║
 * ║  Incident Forensics, Root Cause Chain Analysis,                 ║
 * ║  Timeline Reconstruction & Multi-Format Report Generation       ║
 * ║  NexDesk Phase 16 — World's First AI Incident Forensics Engine  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// ─── GROQ AI CALL ─────────────────────────────────────────────────
async function callAI(prompt, jsonMode = true, maxTokens = 4000) {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) throw new Error('GROQ_API_KEY missing')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.25,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || '{}'
  return jsonMode ? JSON.parse(content) : content
}

// ─── PM NUMBER GENERATOR ──────────────────────────────────────────
export async function generatePMNumber(supabase) {
  const { count } = await supabase
    .from('postmortems')
    .select('*', { count: 'exact', head: true })
  return `PM-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`
}

// ═══════════════════════════════════════════════════════════════════
//  1. TIMELINE RECONSTRUCTION
//     Queries multiple tables and builds time-ordered event chain
// ═══════════════════════════════════════════════════════════════════
export async function reconstructTimeline(ticketId) {
  const supabase = getSupabase()
  const events = []

  // 1a. Fetch the primary ticket
  const { data: ticket } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .single()

  if (!ticket) throw new Error('Ticket not found')

  // Add ticket creation event
  events.push({
    event_time: ticket.created_at,
    event_type: 'detection',
    source: 'ticket',
    source_id: ticket.id,
    title: `Incident detected: ${ticket.title}`,
    description: ticket.description || ticket.title,
    severity: ticket.priority === 'critical' ? 'critical' : ticket.priority === 'high' ? 'high' : 'medium',
    actor: 'System / User Report',
    affected_system: ticket.category || 'Unknown',
    is_key_moment: true,
  })

  // Add ticket status changes from audit trail
  const { data: auditLogs } = await supabase
    .from('audit_trail')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  for (const log of (auditLogs || [])) {
    events.push({
      event_time: log.created_at,
      event_type: log.action === 'escalated' ? 'escalation' : 'action',
      source: 'audit_trail',
      source_id: log.id,
      title: `${log.action}: ${log.field_changed || 'status update'}`,
      description: log.new_value ? `Changed to: ${log.new_value}` : log.action,
      severity: log.action === 'escalated' ? 'high' : 'info',
      actor: log.user_email || 'System',
      affected_system: ticket.category || 'Unknown',
      is_key_moment: ['escalated', 'resolved', 'assigned'].includes(log.action),
    })
  }

  // 1b. Fetch session events around the incident time (±2 hours)
  const incidentStart = new Date(ticket.created_at)
  const windowStart = new Date(incidentStart.getTime() - 2 * 60 * 60 * 1000).toISOString()
  const windowEnd = new Date(incidentStart.getTime() + 4 * 60 * 60 * 1000).toISOString()

  const { data: sessionEvents } = await supabase
    .from('session_events')
    .select('*')
    .gte('created_at', windowStart)
    .lte('created_at', windowEnd)
    .in('event_type', ['js_error', 'api_error', 'slow_api', 'page_crash'])
    .order('created_at', { ascending: true })
    .limit(50)

  for (const se of (sessionEvents || [])) {
    events.push({
      event_time: se.created_at,
      event_type: 'error',
      source: 'session_event',
      source_id: se.id,
      title: `${se.event_type}: ${se.message || se.url || 'Error detected'}`,
      description: se.details || se.message || '',
      severity: se.event_type === 'page_crash' ? 'critical' : se.event_type === 'api_error' ? 'high' : 'medium',
      actor: `User Session ${se.session_id || ''}`.trim(),
      affected_system: se.url || se.page || 'Client App',
      is_key_moment: se.event_type === 'page_crash',
      metadata: { url: se.url, status_code: se.status_code },
    })
  }

  // 1c. Fetch health logs around incident time
  const { data: healthLogs } = await supabase
    .from('health_logs')
    .select('*')
    .gte('created_at', windowStart)
    .lte('created_at', windowEnd)
    .order('created_at', { ascending: true })
    .limit(30)

  for (const hl of (healthLogs || [])) {
    const isDown = hl.status === 'down' || hl.response_time > 5000
    if (isDown || hl.status === 'degraded') {
      events.push({
        event_time: hl.created_at,
        event_type: isDown ? 'alert' : 'alert',
        source: 'health_log',
        source_id: hl.id,
        title: `${hl.service_name || 'Service'}: ${hl.status} (${hl.response_time || 0}ms)`,
        description: `Health check: ${hl.status}. Response time: ${hl.response_time}ms`,
        severity: isDown ? 'critical' : 'high',
        actor: 'Health Monitor',
        affected_system: hl.service_name || 'Unknown Service',
        is_key_moment: isDown,
        metadata: { response_time: hl.response_time, status: hl.status },
      })
    }
  }

  // 1d. Check for related CR deployments
  const { data: deployments } = await supabase
    .from('cr_deployments')
    .select('*, change_requests(title, cr_number, category)')
    .gte('created_at', windowStart)
    .lte('created_at', windowEnd)
    .limit(10)

  for (const dep of (deployments || [])) {
    events.push({
      event_time: dep.deploy_started_at || dep.created_at,
      event_type: dep.auto_rollback_triggered ? 'rollback' : 'deployment',
      source: 'cr_deployment',
      source_id: dep.id,
      title: `Deployment: ${dep.change_requests?.title || dep.change_requests?.cr_number || 'CR'}`,
      description: `Status: ${dep.status}, Health: ${dep.health_score}%`,
      severity: dep.auto_rollback_triggered ? 'critical' : dep.health_score < 60 ? 'high' : 'info',
      actor: 'Deployment Pipeline',
      affected_system: dep.change_requests?.category || 'Infrastructure',
      is_key_moment: dep.auto_rollback_triggered,
      metadata: { health_score: dep.health_score, error_rate: dep.error_rate_during },
    })
  }

  // Add resolution event if ticket is resolved
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    events.push({
      event_time: ticket.updated_at,
      event_type: 'resolution',
      source: 'ticket',
      source_id: ticket.id,
      title: `Incident resolved: ${ticket.title}`,
      description: ticket.resolution_notes || 'Incident marked as resolved',
      severity: 'info',
      actor: ticket.assigned_to || 'System',
      affected_system: ticket.category || 'Unknown',
      is_key_moment: true,
    })
  }

  // Sort by time
  events.sort((a, b) => new Date(a.event_time) - new Date(b.event_time))

  return { ticket, events, total: events.length }
}

// ═══════════════════════════════════════════════════════════════════
//  2. ROOT CAUSE CHAIN ANALYSIS
//     Multi-pass AI analysis: Symptom → Proximate → Contributing →
//     Systemic → Organizational
// ═══════════════════════════════════════════════════════════════════
export async function analyzeRootCauseChain(timeline, ticket, blameFree = true) {
  const eventsSummary = timeline.map(e =>
    `[${new Date(e.event_time).toLocaleTimeString('en-IN')}] ${e.event_type.toUpperCase()}: ${e.title} | Severity: ${e.severity} | System: ${e.affected_system}`
  ).join('\n')

  const blameMode = blameFree
    ? 'BLAME-FREE MODE: Focus on systemic failures, processes that broke down, and missing safeguards. Do NOT attribute failure to individuals. Frame everything as "the system failed to..." not "person X failed to...".'
    : 'DETAILED MODE: Include specific actions and decisions that contributed, while maintaining professional tone.'

  const prompt = `You are the world's most advanced Incident Root Cause Analysis AI, trained on aviation accident investigation methodology (Swiss Cheese Model + Ishikawa + 5 Whys).

Analyze this incident and produce a ROOT CAUSE CHAIN — not just one root cause, but the full causal chain from symptom to organizational root cause.

=== INCIDENT ===
Title: ${ticket.title}
Category: ${ticket.category}
Priority: ${ticket.priority}
Description: ${ticket.description}

=== RECONSTRUCTED TIMELINE (${timeline.length} events) ===
${eventsSummary}

=== ANALYSIS MODE ===
${blameMode}

Return a JSON with a chain of causes, each with a parent relationship:
{
  "root_cause_chain": [
    {
      "level": 0,
      "level_label": "Symptom",
      "title": "What users experienced",
      "description": "Detailed description of the symptom",
      "evidence": "What timeline data supports this",
      "confidence_pct": 95,
      "category": "technical|process|human|organizational|external",
      "is_preventable": true,
      "ai_explanation": "Why this happened and its significance"
    },
    {
      "level": 1,
      "level_label": "Proximate Cause",
      "title": "The immediate technical failure",
      "description": "...",
      "evidence": "...",
      "confidence_pct": 90,
      "category": "technical",
      "is_preventable": true,
      "ai_explanation": "..."
    },
    {
      "level": 2,
      "level_label": "Contributing Factor",
      "title": "What allowed the proximate cause to happen",
      "description": "...",
      "evidence": "...",
      "confidence_pct": 80,
      "category": "process",
      "is_preventable": true,
      "ai_explanation": "..."
    },
    {
      "level": 3,
      "level_label": "Systemic Root Cause",
      "title": "The underlying systemic issue",
      "description": "...",
      "evidence": "...",
      "confidence_pct": 75,
      "category": "organizational",
      "is_preventable": true,
      "ai_explanation": "..."
    },
    {
      "level": 4,
      "level_label": "Organizational Factor",
      "title": "Organizational or cultural factor",
      "description": "...",
      "evidence": "...",
      "confidence_pct": 60,
      "category": "organizational",
      "is_preventable": true,
      "ai_explanation": "..."
    }
  ],
  "contributing_factors": ["factor 1", "factor 2"],
  "systemic_issues": ["issue 1", "issue 2"],
  "prevention_recommendations": [
    {"action": "what to do", "type": "corrective|preventive|detective", "priority": "critical|high|medium|low", "expected_impact": "description", "owner": "team/role", "deadline": "timeframe"}
  ]
}`

  return await callAI(prompt)
}

// ═══════════════════════════════════════════════════════════════════
//  3. FULL POSTMORTEM GENERATION
//     Generates comprehensive multi-format postmortem
// ═══════════════════════════════════════════════════════════════════
export async function generatePostmortem(ticketId, blameFree = true) {
  const supabase = getSupabase()

  // 3a. Reconstruct timeline
  const { ticket, events } = await reconstructTimeline(ticketId)

  // 3b. Analyze root cause chain
  const rootCauseResult = await analyzeRootCauseChain(events, ticket, blameFree)

  // 3c. Calculate incident metrics
  const incidentStart = new Date(events[0]?.event_time || ticket.created_at)
  const incidentEnd = ticket.updated_at ? new Date(ticket.updated_at) : new Date()
  const mttrMin = Math.round((incidentEnd - incidentStart) / 60000)

  const detectionEvent = events.find(e => e.event_type === 'detection')
  const firstAlertEvent = events.find(e => e.event_type === 'alert' || e.event_type === 'error')
  const ttdMin = firstAlertEvent && detectionEvent
    ? Math.max(0, Math.round((new Date(detectionEvent.event_time) - new Date(firstAlertEvent.event_time)) / 60000))
    : 0

  const firstActionEvent = events.find(e => e.event_type === 'action' || e.event_type === 'escalation')
  const ttrMin = firstActionEvent
    ? Math.round((new Date(firstActionEvent.event_time) - incidentStart) / 60000)
    : 0

  // 3d. Build the events summary for AI
  const timelineSummary = events.map(e =>
    `[${new Date(e.event_time).toLocaleString('en-IN')}] ${e.event_type}: ${e.title} (${e.severity})`
  ).join('\n')

  const rootCauseSummary = (rootCauseResult.root_cause_chain || [])
    .map(rc => `Level ${rc.level} (${rc.level_label}): ${rc.title} — ${rc.description}`)
    .join('\n')

  // 3e. Generate multi-format postmortem content
  const prompt = `You are the world's most advanced Incident Postmortem Writer AI.
Generate a comprehensive postmortem in multiple formats.

=== INCIDENT DATA ===
Title: ${ticket.title}
Category: ${ticket.category}
Priority: ${ticket.priority}
Description: ${ticket.description}
MTTR: ${mttrMin} minutes
Time to Detect: ${ttdMin} minutes
Time to Respond: ${ttrMin} minutes
Events Count: ${events.length}

=== TIMELINE EVENTS ===
${timelineSummary}

=== ROOT CAUSE CHAIN ===
${rootCauseSummary}

=== CONTRIBUTING FACTORS ===
${(rootCauseResult.contributing_factors || []).join(', ')}

=== SYSTEMIC ISSUES ===
${(rootCauseResult.systemic_issues || []).join(', ')}

Generate ALL 6 report formats in JSON:
{
  "title": "Professional postmortem title",
  "ai_summary": "Executive summary in 3-4 sentences",
  "ai_executive_brief": "A concise 1-page executive brief: incident summary, business impact in ₹, key root cause, what's being done to prevent recurrence. Write in paragraphs suitable for a CXO audience.",
  "ai_technical_deepdive": "Full technical deep-dive: detailed timeline analysis, system-level failure modes, infrastructure analysis, code-level root causes, monitoring gaps. Write for a senior engineering audience with specific technical details.",
  "ai_narrative_story": "Write an engaging, human-readable narrative of the incident like an investigative report. Start with the exact moment things went wrong, describe the progression, the heroes who responded, and end with lessons. Use specific times, names of systems, and impactful language. Example style: 'At 14:32 IST on a busy Thursday, the Payment Gateway silently began rejecting transactions...'",
  "ai_regulatory_report": "RBI/SEBI compliant incident report with: Incident Classification (Cat A/B/C), Timeline of events, Customer impact assessment, Financial impact, Root cause analysis, Corrective actions with deadlines, Preventive measures",
  "ai_lessons_learned": "Key takeaways organized as: What We Learned, What Surprised Us, What We'll Change, Metrics to Watch",
  "ai_prevention_plan": "Detailed prevention plan: Immediate fixes (within 48h), Short-term improvements (within 2 weeks), Long-term systemic changes (within 1 quarter)",
  "ai_impact_analysis": "Detailed impact analysis: users affected estimate, transactions disrupted estimate, revenue at risk in ₹, reputation impact, SLA impact",
  "ai_what_went_well": "What went well during the incident response (3-4 points)",
  "ai_what_went_wrong": "What went wrong or could improve (3-4 points)",
  "users_affected_estimate": 0,
  "transactions_affected_estimate": 0,
  "revenue_impact_estimate": 0,
  "services_affected": ["list of affected services"],
  "action_items": [
    {"title": "action", "description": "details", "action_type": "corrective|preventive|detective|improvement", "priority": "critical|high|medium|low", "owner": "team/role", "deadline": "timeframe", "expected_impact": "what this will prevent"}
  ]
}`

  const pmContent = await callAI(prompt)

  // 3f. Generate PM number and save
  const pmNumber = await generatePMNumber(supabase)

  const pmData = {
    pm_number: pmNumber,
    title: pmContent.title || `Postmortem: ${ticket.title}`,
    incident_ticket_id: ticketId,
    incident_severity: ticket.priority || 'medium',
    incident_type: 'outage',
    ai_executive_brief: pmContent.ai_executive_brief,
    ai_technical_deepdive: pmContent.ai_technical_deepdive,
    ai_narrative_story: pmContent.ai_narrative_story,
    ai_regulatory_report: pmContent.ai_regulatory_report,
    ai_lessons_learned: pmContent.ai_lessons_learned,
    ai_prevention_plan: pmContent.ai_prevention_plan,
    incident_start: incidentStart.toISOString(),
    incident_end: incidentEnd.toISOString(),
    time_to_detect_min: ttdMin,
    time_to_respond_min: ttrMin,
    time_to_resolve_min: mttrMin,
    users_affected: pmContent.users_affected_estimate || 0,
    transactions_affected: pmContent.transactions_affected_estimate || 0,
    revenue_impact_inr: pmContent.revenue_impact_estimate || 0,
    services_affected: pmContent.services_affected || [],
    ai_summary: pmContent.ai_summary,
    ai_impact_analysis: pmContent.ai_impact_analysis,
    ai_what_went_well: pmContent.ai_what_went_well,
    ai_what_went_wrong: pmContent.ai_what_went_wrong,
    ai_contributing_factors: rootCauseResult.contributing_factors || [],
    ai_systemic_issues: rootCauseResult.systemic_issues || [],
    blame_free_mode: blameFree,
    status: 'draft',
  }

  const { data: pm, error: pmError } = await supabase
    .from('postmortems')
    .insert(pmData)
    .select()
    .single()

  if (pmError) throw new Error(`Failed to save postmortem: ${pmError.message}`)

  // 3g. Save timeline events
  for (const evt of events) {
    await supabase.from('postmortem_timeline_events').insert({
      postmortem_id: pm.id,
      event_time: evt.event_time,
      event_type: evt.event_type,
      source: evt.source,
      source_id: evt.source_id,
      title: evt.title,
      description: evt.description,
      severity: evt.severity,
      actor: evt.actor,
      affected_system: evt.affected_system,
      is_key_moment: evt.is_key_moment,
      metadata: evt.metadata || {},
    })
  }

  // 3h. Save root cause chain
  let parentIdMap = {}
  for (const rc of (rootCauseResult.root_cause_chain || [])) {
    const parentId = rc.level > 0 ? parentIdMap[rc.level - 1] : null
    const { data: savedRC } = await supabase.from('postmortem_root_causes').insert({
      postmortem_id: pm.id,
      parent_cause_id: parentId,
      level: rc.level,
      level_label: rc.level_label,
      title: rc.title,
      description: rc.description,
      evidence: rc.evidence,
      confidence_pct: rc.confidence_pct,
      category: rc.category,
      is_preventable: rc.is_preventable,
      ai_explanation: rc.ai_explanation,
    }).select().single()

    if (savedRC) parentIdMap[rc.level] = savedRC.id
  }

  // 3i. Save action items
  for (const action of (pmContent.action_items || [])) {
    await supabase.from('postmortem_action_items').insert({
      postmortem_id: pm.id,
      title: action.title,
      description: action.description,
      action_type: action.action_type || 'corrective',
      priority: action.priority || 'medium',
      owner: action.owner,
      deadline: action.deadline,
      expected_impact: action.expected_impact,
      status: 'open',
    })
  }

  // 3j. Calculate PQI and compare with historical
  const pqi = calculatePQI(pmContent, rootCauseResult, events)
  const historical = await compareWithHistoricalIncidents(supabase, ticket, rootCauseResult)

  await supabase.from('postmortems').update({
    ...pqi,
    similar_incident_count: historical.similar_count,
    ai_recurring_pattern: historical.recurring_pattern,
    past_action_items_status: historical.action_items_status,
    status: 'draft',
    updated_at: new Date().toISOString(),
  }).eq('id', pm.id)

  return { pm: { ...pm, ...pqi }, events, rootCauseResult, pmContent }
}

// ═══════════════════════════════════════════════════════════════════
//  4. POSTMORTEM QUALITY INDEX (PQI)
//     Scores completeness, actionability, specificity (0-100)
// ═══════════════════════════════════════════════════════════════════
export function calculatePQI(pmContent, rootCauses, timeline) {
  let timelineCompleteness = 0
  let rootCauseDepth = 0
  let actionSpecificity = 0
  let lessonsQuality = 0
  let preventionMeasures = 0

  // Timeline scoring (0-100)
  const eventCount = timeline.length
  if (eventCount >= 20) timelineCompleteness = 100
  else if (eventCount >= 10) timelineCompleteness = 80
  else if (eventCount >= 5) timelineCompleteness = 60
  else if (eventCount >= 2) timelineCompleteness = 40
  else timelineCompleteness = 20

  // Bonus for key moments
  const keyMoments = timeline.filter(e => e.is_key_moment).length
  timelineCompleteness = Math.min(100, timelineCompleteness + keyMoments * 5)

  // Root cause depth scoring (0-100)
  const rcChain = rootCauses.root_cause_chain || []
  if (rcChain.length >= 5) rootCauseDepth = 100
  else if (rcChain.length >= 4) rootCauseDepth = 85
  else if (rcChain.length >= 3) rootCauseDepth = 70
  else if (rcChain.length >= 2) rootCauseDepth = 50
  else rootCauseDepth = 25

  // Bonus for high confidence
  const avgConfidence = rcChain.reduce((s, rc) => s + (rc.confidence_pct || 0), 0) / (rcChain.length || 1)
  rootCauseDepth = Math.min(100, rootCauseDepth + Math.round(avgConfidence / 10))

  // Action items scoring (0-100)
  const actions = pmContent.action_items || []
  if (actions.length >= 6) actionSpecificity = 80
  else if (actions.length >= 4) actionSpecificity = 60
  else if (actions.length >= 2) actionSpecificity = 40
  else actionSpecificity = 20

  // Bonus for owners and deadlines
  const withOwners = actions.filter(a => a.owner && a.owner !== 'TBD').length
  const withDeadlines = actions.filter(a => a.deadline && a.deadline !== 'TBD').length
  actionSpecificity = Math.min(100, actionSpecificity + withOwners * 3 + withDeadlines * 3)

  // Lessons learned scoring (0-100)
  const lessons = pmContent.ai_lessons_learned || ''
  if (lessons.length > 500) lessonsQuality = 90
  else if (lessons.length > 300) lessonsQuality = 70
  else if (lessons.length > 100) lessonsQuality = 50
  else lessonsQuality = 20

  // Prevention measures scoring (0-100)
  const prevention = pmContent.ai_prevention_plan || ''
  if (prevention.length > 500) preventionMeasures = 90
  else if (prevention.length > 300) preventionMeasures = 70
  else if (prevention.length > 100) preventionMeasures = 50
  else preventionMeasures = 20

  // Bonus for systemic issues identified
  const systemicCount = (rootCauses.systemic_issues || []).length
  preventionMeasures = Math.min(100, preventionMeasures + systemicCount * 10)

  // Overall PQI (weighted average)
  const pqiScore = Math.round(
    timelineCompleteness * 0.20 +
    rootCauseDepth * 0.25 +
    actionSpecificity * 0.25 +
    lessonsQuality * 0.15 +
    preventionMeasures * 0.15
  )

  return {
    pqi_score: pqiScore,
    pqi_timeline_completeness: timelineCompleteness,
    pqi_root_cause_depth: rootCauseDepth,
    pqi_action_specificity: actionSpecificity,
    pqi_lessons_quality: lessonsQuality,
    pqi_prevention_measures: preventionMeasures,
  }
}

// ═══════════════════════════════════════════════════════════════════
//  5. HISTORICAL INCIDENT COMPARISON
//     Finds similar past incidents and checks lessons learned
// ═══════════════════════════════════════════════════════════════════
export async function compareWithHistoricalIncidents(supabase, ticket, rootCauses) {
  // Find past postmortems with similar attributes
  const { data: pastPMs } = await supabase
    .from('postmortems')
    .select('id, pm_number, title, ai_summary, incident_severity, services_affected, created_at')
    .neq('incident_ticket_id', ticket.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!pastPMs || pastPMs.length === 0) {
    return { similar_count: 0, recurring_pattern: null, action_items_status: null }
  }

  // Check action item completion from past PMs
  const pastPMIds = pastPMs.map(p => p.id)
  const { data: pastActions } = await supabase
    .from('postmortem_action_items')
    .select('status')
    .in('postmortem_id', pastPMIds)

  const totalActions = (pastActions || []).length
  const completedActions = (pastActions || []).filter(a => a.status === 'completed').length

  // Ask AI to find similarities
  const pastSummaries = pastPMs.map(p => `${p.pm_number}: ${p.title} (${p.incident_severity})`).join('\n')
  const currentRC = (rootCauses.root_cause_chain || []).map(rc => rc.title).join(' → ')

  const prompt = `Compare this incident with historical incidents and find similarities.

CURRENT INCIDENT:
Title: ${ticket.title}
Category: ${ticket.category}
Root Cause Chain: ${currentRC}

HISTORICAL INCIDENTS:
${pastSummaries}

Return JSON:
{
  "similar_count": 0,
  "similar_incidents": ["PM-XXXX-XXXX list"],
  "recurring_pattern": "Description of recurring pattern if found, or null",
  "is_repeat_incident": false,
  "lessons_from_past": "What past incidents teach us about this one"
}`

  try {
    const comparison = await callAI(prompt)
    return {
      similar_count: comparison.similar_count || 0,
      recurring_pattern: comparison.recurring_pattern || null,
      action_items_status: totalActions > 0
        ? `${completedActions} of ${totalActions} action items from similar incidents completed`
        : null,
    }
  } catch (e) {
    return { similar_count: 0, recurring_pattern: null, action_items_status: null }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  6. EXECUTIVE BRIEF REGENERATION
//     Standalone re-generation for sharing with management
// ═══════════════════════════════════════════════════════════════════
export async function regenerateExecutiveBrief(postmortemId) {
  const supabase = getSupabase()

  const { data: pm } = await supabase
    .from('postmortems')
    .select('*')
    .eq('id', postmortemId)
    .single()

  if (!pm) throw new Error('Postmortem not found')

  const prompt = `Regenerate a polished executive brief for this incident postmortem ready for CXO distribution.

Title: ${pm.title}
Severity: ${pm.incident_severity}
MTTR: ${pm.time_to_resolve_min} minutes
Users Affected: ${pm.users_affected}
Revenue Impact: ₹${pm.revenue_impact_inr}
Summary: ${pm.ai_summary}
Root Cause: ${pm.ai_contributing_factors?.join(', ')}
What Went Wrong: ${pm.ai_what_went_wrong}

Return JSON:
{
  "executive_brief": "Full executive brief in paragraphs, ready to send to CXO. Include: Incident overview, Business impact in ₹, Root cause summary, Corrective actions taken, Prevention measures, Confidence in fix effectiveness."
}`

  const result = await callAI(prompt)

  await supabase.from('postmortems').update({
    ai_executive_brief: result.executive_brief,
    updated_at: new Date().toISOString(),
  }).eq('id', postmortemId)

  return result
}
