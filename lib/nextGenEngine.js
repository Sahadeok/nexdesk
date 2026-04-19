/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  NEXT-GEN INTELLIGENCE ENGINE — nextGenEngine.js                ║
 * ║  P36: Client Portal | P37: Digital Twin                         ║
 * ║  P38: Incident War Room | P39: Competitor Intelligence          ║
 * ║  P40: NexDesk Command OS                                        ║
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
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
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

// ═══════════════════════════════════════════════════════════════════
//  P36: CLIENT PORTAL — provision + cache stats
// ═══════════════════════════════════════════════════════════════════
export async function provisionClientPortal(clientName, clientEmail) {
  const supabase = getSupabase()
  const clientId = clientName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
  const portalToken = Buffer.from(`${clientId}:${Math.random().toString(36)}`).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)

  const { data } = await supabase.from('client_portal_configs').insert({
    client_id: clientId,
    client_name: clientName,
    client_email: clientEmail,
    portal_token: portalToken,
    active: true,
  }).select().single()

  return data
}

export async function refreshPortalCache(portalId) {
  const supabase = getSupabase()

  const { data: tickets } = await supabase.from('tickets')
    .select('id, status, priority, sla_resolve_met, created_at, resolved_at')
    .in('status', ['open', 'in_progress'])

  const total = tickets?.length || 0
  const slaOk = tickets?.filter(t => t.sla_resolve_met !== false).length || 0
  const compliance = total > 0 ? Math.round(slaOk / total * 100) : 100

  await supabase.from('client_portal_configs').update({
    cached_open_tickets: total,
    cached_sla_compliance_pct: compliance,
    cache_updated_at: new Date().toISOString(),
  }).eq('id', portalId)

  return { open_tickets: total, sla_compliance: compliance }
}

// ═══════════════════════════════════════════════════════════════════
//  P37: AGENT DIGITAL TWIN — train the twin, run simulations
// ═══════════════════════════════════════════════════════════════════
export async function trainDigitalTwin(agentId) {
  const supabase = getSupabase()

  const { data: agent } = await supabase.from('profiles')
    .select('id, email, full_name, role').eq('id', agentId).single()

  const { data: resolvedTickets } = await supabase.from('tickets')
    .select('id, title, description, priority, resolution_notes, created_at, resolved_at')
    .eq('assigned_to', agentId).eq('status', 'resolved').order('created_at', { ascending: false }).limit(50)

  const { data: comments } = await supabase.from('ticket_comments')
    .select('comment_text, ticket_id, is_internal, created_at').eq('author_id', agentId)
    .order('created_at', { ascending: false }).limit(100)

  if (!resolvedTickets?.length && !comments?.length) {
    return { error: 'Not enough data to train twin — agent needs at least 1 resolved ticket' }
  }

  const sampleResolutions = (resolvedTickets || []).slice(0, 10).map(t =>
    `TICKET: ${t.title}\nRESOLUTION: ${t.resolution_notes || 'No notes'}`
  ).join('\n\n---\n\n')

  const sampleComments = (comments || []).filter(c => !c.is_internal).slice(0, 20)
    .map(c => c.comment_text).join('\n')

  const resTimes = (resolvedTickets || []).filter(t => t.resolved_at).map(t =>
    Math.round((new Date(t.resolved_at) - new Date(t.created_at)) / 60000)
  )
  const avgRes = resTimes.length ? Math.round(resTimes.reduce((a, b) => a + b, 0) / resTimes.length) : 0

  const prompt = `You are an AI Behavioral Profiler. Analyze this support agent's actual ticket resolutions and comments to create their Digital Twin profile.

AGENT: ${agent?.full_name || agent?.email} (${agent?.role})
TICKETS ANALYZED: ${resolvedTickets?.length || 0}
AVG RESOLUTION TIME: ${avgRes} minutes

SAMPLE RESOLUTIONS:
${sampleResolutions.substring(0, 2000)}

SAMPLE CUSTOMER COMMENTS:
${sampleComments.substring(0, 1000)}

Build a precise behavioral profile. Return JSON:
{
  "writing_style": "technical | empathetic | formal | casual | bullet-first",
  "avg_response_length": "concise | medium | detailed",
  "signature_phrases": ["specific phrases this agent uses often"],
  "never_uses": ["phrases they clearly avoid"],
  "diagnosis_pattern": "how they approach unknown problems",
  "escalation_threshold": "quick-escalate | tries-l1-first | exhaustive-before-escalate",
  "typical_resolution_steps": ["step 1 they always take", "step 2"],
  "twin_accuracy_pct": 78
}`

  const ai = await callAI(prompt)
  const trainingCount = (resolvedTickets?.length || 0) + (comments?.length || 0)

  const { data: existing } = await supabase.from('agent_digital_twins')
    .select('id').eq('agent_id', agentId).single()

  const twinData = {
    agent_id: agentId,
    writing_style: ai.writing_style || 'professional',
    avg_response_length: ai.avg_response_length || 'medium',
    signature_phrases: ai.signature_phrases || [],
    never_uses: ai.never_uses || [],
    diagnosis_pattern: ai.diagnosis_pattern || '',
    escalation_threshold: ai.escalation_threshold || 'tries-l1-first',
    typical_resolution_steps: ai.typical_resolution_steps || [],
    avg_resolution_min: avgRes,
    training_ticket_count: trainingCount,
    twin_accuracy_pct: ai.twin_accuracy_pct || 70,
    last_trained_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { data } = await supabase.from('agent_digital_twins').update(twinData).eq('id', existing.id).select().single()
    return data
  }
  const { data } = await supabase.from('agent_digital_twins').insert(twinData).select().single()
  return data
}

export async function runTwinSimulation(twinId, ticketId) {
  const supabase = getSupabase()

  const { data: twin } = await supabase.from('agent_digital_twins').select('*').eq('id', twinId).single()
  const { data: ticket } = await supabase.from('tickets')
    .select('id, title, description, priority, resolution_notes').eq('id', ticketId).single()
  const { data: comments } = await supabase.from('ticket_comments')
    .select('comment_text, is_internal').eq('ticket_id', ticketId).eq('is_internal', false).limit(10)

  const prompt = `You are simulating Agent Digital Twin with this exact behavioral profile:

TWIN PROFILE:
- Writing Style: ${twin?.writing_style}
- Avg Response Length: ${twin?.avg_response_length}
- Signature Phrases: ${JSON.stringify(twin?.signature_phrases)}
- Escalation Threshold: ${twin?.escalation_threshold}
- Typical Steps: ${JSON.stringify(twin?.typical_resolution_steps)}

Now respond to this ticket EXACTLY as this agent would:

TICKET: ${ticket?.title}
DESCRIPTION: ${(ticket?.description || '').substring(0, 500)}
PRIORITY: ${ticket?.priority}

ACTUAL RESOLUTION (what really happened):
${ticket?.resolution_notes || 'No resolution yet'}

Return JSON:
{
  "twin_initial_response": "What the twin would say as first response, matching the agent's exact style",
  "twin_diagnosis_questions": ["question 1 the twin would ask", "question 2"],
  "twin_resolution_approach": "How the twin would approach solving this",
  "twin_escalation_decision": "would_escalate | would_resolve_l1",
  "response_style_match_pct": 85,
  "diagnosis_match_pct": 80,
  "resolution_match_pct": 75,
  "overall_accuracy_pct": 80,
  "ai_differences": "Key differences between twin and actual agent approach",
  "ai_learning_notes": "What the twin learned from this simulation to improve accuracy"
}`

  const ai = await callAI(prompt)

  const { data } = await supabase.from('twin_simulations').insert({
    twin_id: twinId,
    ticket_id: ticketId,
    twin_initial_response: ai.twin_initial_response || '',
    twin_diagnosis_questions: ai.twin_diagnosis_questions || [],
    twin_resolution_approach: ai.twin_resolution_approach || '',
    twin_escalation_decision: ai.twin_escalation_decision || 'would_resolve_l1',
    actual_response: (comments || [])[0]?.comment_text || '',
    actual_resolution: ticket?.resolution_notes || '',
    response_style_match_pct: ai.response_style_match_pct || 0,
    diagnosis_match_pct: ai.diagnosis_match_pct || 0,
    resolution_match_pct: ai.resolution_match_pct || 0,
    overall_accuracy_pct: ai.overall_accuracy_pct || 0,
    ai_differences: ai.ai_differences || '',
    ai_learning_notes: ai.ai_learning_notes || '',
  }).select().single()

  // Update twin accuracy
  await supabase.from('agent_digital_twins').update({
    twin_accuracy_pct: ai.overall_accuracy_pct || twin?.twin_accuracy_pct || 0,
    last_simulation: { ticket_id: ticketId, overall_accuracy_pct: ai.overall_accuracy_pct },
    updated_at: new Date().toISOString(),
  }).eq('id', twinId)

  return data
}

// ═══════════════════════════════════════════════════════════════════
//  P38: INCIDENT WAR ROOM
// ═══════════════════════════════════════════════════════════════════
export async function declareIncident(title, severity, ticketId, incidentCommander) {
  const supabase = getSupabase()

  const { count } = await supabase.from('incident_war_rooms')
    .select('*', { count: 'exact', head: true })
  const roomNumber = `IWR-${String((count || 0) + 1).padStart(3, '0')}`

  const prompt = `You are an Incident Command AI. A new ${severity} incident has just been declared.

INCIDENT: ${title}
SEVERITY: ${severity}

Generate immediate response package. Return JSON:
{
  "impact_assessment": "What systems/users are likely affected and severity",
  "suggested_actions": [
    {"step": 1, "action": "Immediate action to take", "owner": "incident_commander|tech_lead|comms_lead", "within_min": 5}
  ],
  "communication_drafts": {
    "customer_email": "Draft email to affected customers",
    "internal_slack": "Draft Slack message for internal team",
    "status_page": "Draft status page update"
  },
  "predicted_resolution_min": 60,
  "similar_incidents": ["description of similar past incident pattern 1"]
}`

  const ai = await callAI(prompt)

  const { data } = await supabase.from('incident_war_rooms').insert({
    room_number: roomNumber,
    ticket_id: ticketId || null,
    incident_title: title,
    severity,
    status: 'active',
    incident_commander: incidentCommander || 'Unassigned',
    stakeholders: [],
    timeline_updates: [{ time: new Date().toISOString(), author: 'System', message: `Incident declared: ${title}`, type: 'declaration' }],
    ai_impact_assessment: ai.impact_assessment || '',
    ai_suggested_actions: ai.suggested_actions || [],
    ai_communication_drafts: ai.communication_drafts || {},
    ai_predicted_resolution_min: ai.predicted_resolution_min || 60,
    ai_similar_incidents: ai.similar_incidents || [],
  }).select().single()

  return data
}

export async function addWarRoomUpdate(roomId, author, message, type = 'update') {
  const supabase = getSupabase()
  const { data: room } = await supabase.from('incident_war_rooms').select('timeline_updates').eq('id', roomId).single()
  const updates = [...(room?.timeline_updates || []), { time: new Date().toISOString(), author, message, type }]
  const { data } = await supabase.from('incident_war_rooms').update({
    timeline_updates: updates, updated_at: new Date().toISOString(),
  }).eq('id', roomId).select().single()
  return data
}

export async function resolveIncident(roomId, rootCause) {
  const supabase = getSupabase()
  const { data: room } = await supabase.from('incident_war_rooms').select('declared_at, timeline_updates').eq('id', roomId).single()
  const durationMin = Math.round((Date.now() - new Date(room?.declared_at || Date.now())) / 60000)

  const prompt = `Incident has been resolved. Generate post-incident preventive actions.

ROOT CAUSE: ${rootCause}
DURATION: ${durationMin} minutes

Return JSON:
{
  "preventive_actions": [
    {"action": "specific preventive measure", "owner": "team", "timeline": "1 week", "priority": "high"}
  ]
}`

  const ai = await callAI(prompt)
  const updates = [...(room?.timeline_updates || []), { time: new Date().toISOString(), author: 'System', message: 'Incident resolved', type: 'resolution' }]

  const { data } = await supabase.from('incident_war_rooms').update({
    status: 'resolved',
    resolved_at: new Date().toISOString(),
    duration_min: durationMin,
    root_cause: rootCause,
    preventive_actions: ai.preventive_actions || [],
    timeline_updates: updates,
    updated_at: new Date().toISOString(),
  }).eq('id', roomId).select().single()
  return data
}

// ═══════════════════════════════════════════════════════════════════
//  P39: COMPETITOR INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════
export async function generateCompetitorReport() {
  const supabase = getSupabase()

  const { data: tickets } = await supabase.from('tickets')
    .select('id, priority, status, created_at, resolved_at, sla_resolve_met')
    .order('created_at', { ascending: false }).limit(200)

  const resolved = (tickets || []).filter(t => t.resolved_at)
  const resTimes = resolved.map(t => Math.round((new Date(t.resolved_at) - new Date(t.created_at)) / 60000))
  const avgRes = resTimes.length ? Math.round(resTimes.reduce((a, b) => a + b, 0) / resTimes.length) : 0
  const slaOk = (tickets || []).filter(t => t.sla_resolve_met === true).length
  const slaCompliance = tickets?.length ? Math.round(slaOk / tickets.length * 100) : 100
  const { count } = await supabase.from('competitor_intelligence_reports')
    .select('*', { count: 'exact', head: true })
  const reportNumber = `CIR-${String((count || 0) + 1).padStart(3, '0')}`

  const prompt = `You are a Competitive Intelligence AI for an IT helpdesk SaaS company. Analyze their performance vs industry benchmarks.

YOUR METRICS:
- Avg Resolution Time: ${avgRes} minutes
- SLA Compliance: ${slaCompliance}%
- Total Tickets Analyzed: ${tickets?.length || 0}

INDUSTRY BENCHMARKS (IT Helpdesk, India B2B):
- Industry Avg Resolution: 240 minutes
- Industry SLA Compliance: 78%
- Industry CSAT: 3.8/5

Generate a comprehensive competitive intelligence report. Return JSON:
{
  "industry_avg_resolution_min": 240,
  "industry_sla_compliance_pct": 78,
  "industry_csat": 3.8,
  "your_csat": 4.1,
  "strengths": ["specific area where performance beats market", "another strength"],
  "weaknesses": ["specific area where competitors do better"],
  "opportunities": ["market gap or trend you can capitalize on"],
  "threats": ["competitive risk or market shift"],
  "swot_analysis": {
    "S": ["strength 1", "strength 2"],
    "W": ["weakness 1"],
    "O": ["opportunity 1"],
    "T": ["threat 1"]
  },
  "quick_wins": [
    {"action": "specific action", "impact": "expected business impact", "effort": "low|medium|high", "timeline": "1 week"}
  ],
  "strategic_moves": [
    {"move": "strategic initiative", "rationale": "why this positions you ahead"}
  ],
  "competitive_score": 72,
  "rank_percentile": 28
}`

  const ai = await callAI(prompt)
  const period = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const { data } = await supabase.from('competitor_intelligence_reports').insert({
    report_number: reportNumber,
    your_avg_resolution_min: avgRes,
    industry_avg_resolution_min: ai.industry_avg_resolution_min || 240,
    your_sla_compliance_pct: slaCompliance,
    industry_sla_compliance_pct: ai.industry_sla_compliance_pct || 78,
    your_csat: ai.your_csat || 4.0,
    industry_csat: ai.industry_csat || 3.8,
    ai_strengths: ai.strengths || [],
    ai_weaknesses: ai.weaknesses || [],
    ai_opportunities: ai.opportunities || [],
    ai_threats: ai.threats || [],
    swot_analysis: ai.swot_analysis || {},
    ai_quick_wins: ai.quick_wins || [],
    ai_strategic_moves: ai.strategic_moves || [],
    competitive_score: ai.competitive_score || 50,
    rank_percentile: ai.rank_percentile || 50,
    report_period: period,
  }).select().single()

  return data
}

// ═══════════════════════════════════════════════════════════════════
//  P40: NEXDESK COMMAND OS
// ═══════════════════════════════════════════════════════════════════
export async function executeCommand(userId, naturalInput) {
  const supabase = getSupabase()
  const startTime = Date.now()

  // Step 1: parse intent
  const parsePrompt = `You are the NexDesk Command OS — you understand natural language commands about an IT helpdesk system.

USER COMMAND: "${naturalInput}"

Parse the intent and extract parameters. Return JSON:
{
  "intent": "query_tickets | query_agents | trigger_ai | get_stats | configure | export | unknown",
  "parameters": {
    "filter": "critical tickets from last week",
    "action": "detect_recurring"
  },
  "confidence": 90,
  "clarification_needed": false
}`

  const parsed = await callAI(parsePrompt)

  // Step 2: execute based on intent
  let resultData = {}
  let resultSummary = ''

  if (parsed.intent === 'query_tickets') {
    const { data } = await supabase.from('tickets')
      .select('id, ticket_number, title, priority, status, created_at').order('created_at', { ascending: false }).limit(10)
    resultData = { tickets: data || [] }
    resultSummary = `Found ${data?.length || 0} tickets`
  } else if (parsed.intent === 'get_stats') {
    const [open, critical, resolved] = await Promise.all([
      supabase.from('tickets').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
      supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('priority', 'critical').neq('status', 'resolved'),
      supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
    ])
    resultData = { open_tickets: open.count, critical: critical.count, resolved: resolved.count }
    resultSummary = `Open: ${open.count}, Critical: ${critical.count}, Resolved: ${resolved.count}`
  } else {
    resultSummary = `Command understood but requires manual action: ${parsed.intent}`
  }

  // Step 3: generate narrative response
  const narrativePrompt = `You are NexDesk OS. A user ran this command: "${naturalInput}"
Result: ${resultSummary}
Data: ${JSON.stringify(resultData).substring(0, 500)}

Write a concise, helpful natural language response (2-3 sentences max). No JSON, just conversational English.`

  const narrative = await callAI(narrativePrompt, false)

  const { data } = await supabase.from('command_os_history').insert({
    user_id: userId,
    natural_language_input: naturalInput,
    parsed_intent: parsed.intent,
    parsed_parameters: parsed.parameters || {},
    executed_action: resultSummary,
    result_summary: resultSummary,
    result_data: resultData,
    ai_narrative_response: narrative || resultSummary,
    success: true,
    execution_ms: Date.now() - startTime,
  }).select().single()

  return { ...data, narrative: narrative || resultSummary, result_data: resultData }
}
