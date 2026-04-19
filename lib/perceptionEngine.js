/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  PERCEPTION & INTELLIGENCE ENGINE — perceptionEngine.js         ║
 * ║  P23: Mood DNA | P24: Code Surgeon | P25: Neural Translator     ║
 * ║  P26: Revenue Blast | P27: Session Time Machine                 ║
 * ║  P28: War Room | P29: Ticket Genome | P30: Adaptive Command     ║
 * ║  P31: Forensic Intelligence Analysis                            ║
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
//  P23: TICKET MOOD DNA
// ═══════════════════════════════════════════════════════════════════
export async function analyzeTicketMood(ticketId) {
  const supabase = getSupabase()
  const { data: ticket } = await supabase.from('tickets')
    .select('id, title, description, priority, status')
    .eq('id', ticketId).single()
  const { data: comments } = await supabase.from('ticket_comments')
    .select('comment_text, is_internal, created_at')
    .eq('ticket_id', ticketId).order('created_at', { ascending: true })

  const allText = [
    ticket?.description || '',
    ...(comments || []).filter(c => !c.is_internal).map(c => c.comment_text),
  ].join('\n\n---\n\n')

  const prompt = `You are an Emotional Intelligence AI. Analyze this IT support ticket conversation and build a complete Mood DNA profile.

TICKET: ${ticket?.title}
CONVERSATION:
${allText.substring(0, 3000)}

Return JSON with every field populated:
{
  "anger_score": 0,
  "frustration_score": 75,
  "anxiety_score": 40,
  "satisfaction_score": 0,
  "confusion_score": 60,
  "urgency_score": 80,
  "desperation_score": 30,
  "overall_sentiment": "frustrated",
  "toxicity_risk": false,
  "escalation_risk_pct": 70,
  "mood_timeline": [
    {"time": "message 1", "emotion": "confused", "score": 60, "trigger_word": "nothing works"}
  ],
  "mood_shift": "declining",
  "key_trigger_phrases": ["nothing works", "waited 3 days", "losing money"],
  "communication_style": "distressed",
  "ai_suggested_tone": "empathetic and urgent — acknowledge their pain before troubleshooting",
  "ai_priority_boost": 10,
  "ai_empathy_script": "I completely understand how frustrating this must be — let me personally make sure this gets resolved in the next hour."
}`

  const ai = await callAI(prompt)

  const { data: existing } = await supabase.from('ticket_mood_profiles')
    .select('id').eq('ticket_id', ticketId).single()

  const moodData = {
    ticket_id: ticketId,
    anger_score: ai.anger_score || 0,
    frustration_score: ai.frustration_score || 0,
    anxiety_score: ai.anxiety_score || 0,
    satisfaction_score: ai.satisfaction_score || 0,
    confusion_score: ai.confusion_score || 0,
    urgency_score: ai.urgency_score || 0,
    desperation_score: ai.desperation_score || 0,
    overall_sentiment: ai.overall_sentiment || 'neutral',
    toxicity_risk: ai.toxicity_risk || false,
    escalation_risk_pct: ai.escalation_risk_pct || 0,
    mood_timeline: ai.mood_timeline || [],
    mood_shift: ai.mood_shift || 'stable',
    key_trigger_phrases: ai.key_trigger_phrases || [],
    communication_style: ai.communication_style || 'professional',
    ai_suggested_tone: ai.ai_suggested_tone || '',
    ai_priority_boost: ai.ai_priority_boost || 0,
    ai_empathy_script: ai.ai_empathy_script || '',
    analyzed_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { data } = await supabase.from('ticket_mood_profiles').update(moodData).eq('id', existing.id).select().single()
    return data
  }
  const { data } = await supabase.from('ticket_mood_profiles').insert(moodData).select().single()
  return data
}

// ═══════════════════════════════════════════════════════════════════
//  P24: AI CODE SURGEON
// ═══════════════════════════════════════════════════════════════════
export async function performCodeSurgery(ticketId, errorLog, stackTrace, language = 'javascript', framework = '') {
  const supabase = getSupabase()

  const prompt = `You are the world's best AI Code Surgeon. Analyze this error and produce an exact surgical fix.

LANGUAGE: ${language}
FRAMEWORK: ${framework || 'unknown'}
ERROR LOG:
${errorLog?.substring(0, 2000) || 'No log provided'}

STACK TRACE:
${stackTrace?.substring(0, 2000) || 'No stack trace'}

Provide a complete surgical analysis. Return JSON:
{
  "error_type": "TypeError: Cannot read property 'id' of undefined",
  "error_chain": [
    {"level": 0, "file": "user.service.js", "line": 47, "function": "getUser", "cause": "user object is null when DB returns empty"}
  ],
  "root_file": "user.service.js",
  "root_line": 47,
  "patches": [
    {
      "file": "user.service.js",
      "original_code": "const userId = user.id;",
      "patched_code": "const userId = user?.id ?? null;\\nif (!userId) return null;",
      "confidence_pct": 95,
      "explanation": "Added optional chaining and null guard to prevent crash when user is undefined"
    }
  ],
  "fix_approach": "one-line-fix",
  "estimated_fix_time": "5 minutes",
  "regression_risk": "low",
  "suggested_test_cases": [
    "Test with null user object",
    "Test with undefined user",
    "Test with valid user object"
  ]
}`

  const ai = await callAI(prompt)

  const { data } = await supabase.from('code_surgery_sessions').insert({
    ticket_id: ticketId || null,
    error_log: errorLog,
    stack_trace: stackTrace,
    language, framework,
    error_type: ai.error_type || 'Unknown',
    error_chain: ai.error_chain || [],
    root_file: ai.root_file || '',
    root_line: ai.root_line || 0,
    patches: ai.patches || [],
    fix_approach: ai.fix_approach || 'unknown',
    estimated_fix_time: ai.estimated_fix_time || 'unknown',
    regression_risk: ai.regression_risk || 'medium',
    suggested_test_cases: ai.suggested_test_cases || [],
    confidence_pct: ai.patches?.length ? Math.round(ai.patches.reduce((s, p) => s + p.confidence_pct, 0) / ai.patches.length) : 0,
  }).select().single()

  return data
}

// ═══════════════════════════════════════════════════════════════════
//  P25: NEURAL TRANSLATOR
// ═══════════════════════════════════════════════════════════════════
export async function neuralTranslate(sourceType, sourceId, text, targetLanguages = ['hi', 'ta', 'ar', 'fr', 'de']) {
  const supabase = getSupabase()

  const langNames = { hi: 'Hindi', ta: 'Tamil', ar: 'Arabic', fr: 'French', de: 'German', es: 'Spanish', ja: 'Japanese', zh: 'Chinese' }
  const targetList = targetLanguages.map(l => `${l}: ${langNames[l] || l}`).join(', ')

  const prompt = `You are a Neural IT Translator. Translate this IT support text while:
1. Preserving technical terms (DNS, API, HTTP, SLA, UI etc.) in English
2. Adapting to formal register appropriate for each culture
3. Maintaining technical accuracy

TEXT TO TRANSLATE:
${text.substring(0, 2000)}

TRANSLATE TO: ${targetList}

Return JSON:
{
  "translations": {
    "hi": "translated text in Hindi",
    "ta": "translated text in Tamil",
    "fr": "translated text in French",
    "ar": "translated text in Arabic",
    "de": "translated text in German"
  },
  "preserved_terms": ["DNS", "API", "SLA"],
  "cultural_adaptations": [
    {"language": "ar", "adaptation": "Added formal greeting appropriate for Middle East business culture"}
  ],
  "translation_confidence": {"hi": 96, "ta": 88, "fr": 98, "ar": 85, "de": 97}
}`

  const ai = await callAI(prompt)

  const { data } = await supabase.from('neural_translations').insert({
    source_type: sourceType,
    source_id: sourceId || null,
    source_text: text,
    source_language: 'en',
    translations: ai.translations || {},
    preserved_terms: ai.preserved_terms || [],
    cultural_adaptations: ai.cultural_adaptations || [],
    translation_confidence: ai.translation_confidence || {},
  }).select().single()

  return data
}

// ═══════════════════════════════════════════════════════════════════
//  P26: REVENUE BLAST RADIUS
// ═══════════════════════════════════════════════════════════════════
export async function calculateRevenueBlast(ticketId, context = {}) {
  const supabase = getSupabase()
  const { data: ticket } = await supabase.from('tickets')
    .select('id, title, description, priority, created_at, category_id').eq('id', ticketId).single()

  const downtimeMinutes = context.downtime_min || Math.round((Date.now() - new Date(ticket?.created_at || Date.now())) / 60000)

  const prompt = `You are a Revenue Impact AI. Calculate the business revenue blast radius for this IT incident.

INCIDENT: ${ticket?.title}
DESCRIPTION: ${(ticket?.description || '').substring(0, 500)}
PRIORITY: ${ticket?.priority || 'high'}
DOWNTIME SO FAR: ${downtimeMinutes} minutes
CONTEXT: ${JSON.stringify(context)}

Calculate realistic revenue impact for an Indian B2B software company. Return JSON:
{
  "affected_user_count": 500,
  "transactions_blocked_per_min": 12.5,
  "avg_transaction_value_inr": 2500,
  "revenue_loss_per_minute_inr": 31250,
  "total_revenue_lost_inr": 3456789,
  "cascade_impacts": [
    {"system": "Payment Gateway", "impact": "Transactions failing", "revenue_pct": 40},
    {"system": "Mobile App", "impact": "Users cannot checkout", "revenue_pct": 35}
  ],
  "secondary_loss_inr": 500000,
  "sla_penalty_inr": 250000,
  "penalty_accrual_rate": 50000,
  "recovery_priority_score": 92,
  "break_even_minutes": 45,
  "ai_assumptions": "Based on typical e-commerce transaction rates during business hours",
  "calculation_method": "transactional"
}`

  const ai = await callAI(prompt)

  const { data: existing } = await supabase.from('revenue_blast_profiles')
    .select('id').eq('ticket_id', ticketId).single()

  const blastData = {
    ticket_id: ticketId,
    affected_service: ticket?.title,
    affected_user_count: ai.affected_user_count || 0,
    transactions_blocked_per_min: ai.transactions_blocked_per_min || 0,
    avg_transaction_value_inr: ai.avg_transaction_value_inr || 0,
    revenue_loss_per_minute_inr: ai.revenue_loss_per_minute_inr || 0,
    total_revenue_lost_inr: ai.total_revenue_lost_inr || 0,
    cascade_impacts: ai.cascade_impacts || [],
    secondary_loss_inr: ai.secondary_loss_inr || 0,
    sla_penalty_inr: ai.sla_penalty_inr || 0,
    penalty_accrual_rate: ai.penalty_accrual_rate || 0,
    recovery_priority_score: ai.recovery_priority_score || 0,
    break_even_minutes: ai.break_even_minutes || 0,
    ai_assumptions: ai.ai_assumptions || '',
    calculation_method: ai.calculation_method || 'transactional',
    calculated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { data } = await supabase.from('revenue_blast_profiles').update(blastData).eq('id', existing.id).select().single()
    return data
  }
  const { data } = await supabase.from('revenue_blast_profiles').insert(blastData).select().single()
  return data
}

// ═══════════════════════════════════════════════════════════════════
//  P28: EXECUTIVE WAR ROOM
// ═══════════════════════════════════════════════════════════════════
export async function generateWarRoomSnapshot() {
  const supabase = getSupabase()

  const [ticketsR, revenueR, vendorsR] = await Promise.all([
    supabase.from('tickets').select('id, priority, status, created_at, resolved_at, sla_resolve_met, sla_resolve_due, assigned_team'),
    supabase.from('revenue_blast_profiles').select('total_revenue_lost_inr, revenue_loss_per_minute_inr'),
    supabase.from('vendor_sla_configs').select('vendor_name, current_status, actual_uptime_pct').catch(() => ({ data: [] })),
  ])

  const allTickets = ticketsR.data || []
  const criticalOpen = allTickets.filter(t => t.priority === 'critical' && t.status !== 'resolved' && t.status !== 'closed')
  const slaBreaches = allTickets.filter(t => t.sla_resolve_due && new Date(t.sla_resolve_due) < new Date() && t.status !== 'resolved')
  const resolvedToday = allTickets.filter(t => {
    if (!t.resolved_at) return false
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return new Date(t.resolved_at) >= today
  })
  const resTimes = resolvedToday.filter(t => t.resolved_at).map(t =>
    Math.round((new Date(t.resolved_at) - new Date(t.created_at)) / 60000)
  )
  const avgMTTR = resTimes.length ? Math.round(resTimes.reduce((a, b) => a + b, 0) / resTimes.length) : 0
  const totalRevAtRisk = (revenueR.data || []).reduce((s, r) => s + parseFloat(r.total_revenue_lost_inr || 0), 0)

  const vendorHealth = {}
  for (const v of (vendorsR.data || [])) vendorHealth[v.vendor_name] = v.actual_uptime_pct || 100

  const sysHealth = Object.keys(vendorHealth).length ? vendorHealth : { 'Core Platform': 99.9, 'API Gateway': 98.5, 'Database': 99.8 }
  const overallHealth = Math.round(Object.values(sysHealth).reduce((a, b) => a + b, 0) / Object.values(sysHealth).length)

  const by_team = {}
  for (const t of allTickets.filter(tk => tk.status !== 'resolved')) {
    const team = t.assigned_team || 'L1'
    if (!by_team[team]) by_team[team] = 0
    by_team[team]++
  }

  const prompt = `You are a CXO-level AI briefing system. Generate an executive war room summary.

METRICS:
Critical Open Incidents: ${criticalOpen.length}
SLA Breaches: ${slaBreaches.length}
Revenue at Risk: ₹${Math.round(totalRevAtRisk).toLocaleString()}
System Health: ${overallHealth}%
Avg MTTR Today: ${avgMTTR} min
Tickets Resolved Today: ${resolvedToday.length}
Team Load: ${JSON.stringify(by_team)}

Return JSON (board-level language, no jargon):
{
  "boardroom_brief": "Two to three executive-level sentences summarizing the operational status",
  "red_flags": [
    {"flag": "specific business risk", "impact": "business consequence", "urgency": "immediate|today|this_week"}
  ],
  "wins": [
    {"win": "positive achievement", "impact": "business value"}
  ],
  "predicted_escalations_next_4h": 3,
  "predicted_revenue_risk_next_4h": 500000
}`

  const ai = await callAI(prompt)

  const { data } = await supabase.from('war_room_snapshots').insert({
    total_revenue_at_risk_inr: totalRevAtRisk,
    tickets_in_sla_breach: slaBreaches.length,
    critical_incidents: criticalOpen.length,
    mttr_today_min: avgMTTR,
    systems_health: sysHealth,
    overall_health_pct: overallHealth,
    team_performance: by_team,
    ai_boardroom_brief: ai.boardroom_brief || '',
    ai_red_flags: ai.red_flags || [],
    ai_wins: ai.wins || [],
    predicted_escalations_next_4h: ai.predicted_escalations_next_4h || 0,
    predicted_revenue_risk_next_4h: ai.predicted_revenue_risk_next_4h || 0,
  }).select().single()

  return data
}

// ═══════════════════════════════════════════════════════════════════
//  P29: AI TICKET GENOME
// ═══════════════════════════════════════════════════════════════════
export async function buildTicketGenome(ticketId) {
  const supabase = getSupabase()
  const { data: ticket } = await supabase.from('tickets')
    .select('id, ticket_number, title, description, priority, category_id, created_at')
    .eq('id', ticketId).single()

  const { data: kbArticles } = await supabase.from('knowledge_articles')
    .select('id, title').limit(20).catch(() => ({ data: [] }))

  const { data: recent } = await supabase.from('tickets')
    .select('id, ticket_number, title, priority, resolved_at')
    .neq('id', ticketId).eq('status', 'resolved').order('created_at', { ascending: false }).limit(30)

  const prompt = `You are an AI Ticket Genome Builder. Analyze this support ticket and build its complete DNA profile — predict everything about it before a human sees it.

TICKET: ${ticket?.ticket_number}
TITLE: ${ticket?.title}
DESCRIPTION: ${(ticket?.description || '').substring(0, 1000)}

SIMILAR RESOLVED TICKETS (for pattern matching):
${(recent || []).map(t => `- ${t.ticket_number}: ${t.title}`).join('\n').substring(0, 1000)}

Build the complete genome. Return JSON:
{
  "detected_category": "Application",
  "detected_subcategory": "Authentication",
  "detected_priority": "high",
  "detected_team": "L2",
  "detected_framework": "React",
  "detected_language": "JavaScript",
  "classification_confidence_pct": 92,
  "predicted_resolution_min": 45,
  "predicted_escalation_probability_pct": 30,
  "predicted_complexity": "medium",
  "suggested_fix": "Clear browser cache and re-authenticate. If persists, check JWT token expiry settings.",
  "business_impact_score": 65,
  "customer_type": "enterprise",
  "ai_tags": ["authentication", "jwt", "session-timeout", "react"],
  "ai_root_cause_hypothesis": "JWT token expiry mismatch between client and server timezone settings",
  "auto_routed": true,
  "auto_routed_to": "L2",
  "routing_reason": "Authentication issues require L2 access to auth server logs"
}`

  const ai = await callAI(prompt)

  const existingG = await supabase.from('ticket_genomes').select('id').eq('ticket_id', ticketId).single()
  const genomeData = {
    ticket_id: ticketId,
    detected_category: ai.detected_category || 'Other',
    detected_subcategory: ai.detected_subcategory || '',
    detected_priority: ai.detected_priority || ticket?.priority || 'medium',
    detected_team: ai.detected_team || 'L1',
    detected_framework: ai.detected_framework || '',
    detected_language: ai.detected_language || '',
    classification_confidence_pct: ai.classification_confidence_pct || 70,
    predicted_resolution_min: ai.predicted_resolution_min || 60,
    predicted_escalation_probability_pct: ai.predicted_escalation_probability_pct || 20,
    predicted_complexity: ai.predicted_complexity || 'medium',
    matching_kb_article_ids: [],
    similar_ticket_ids: (recent || []).slice(0, 5).map(t => t.id),
    suggested_fix: ai.suggested_fix || '',
    business_impact_score: ai.business_impact_score || 50,
    customer_type: ai.customer_type || 'regular',
    ai_tags: ai.ai_tags || [],
    ai_root_cause_hypothesis: ai.ai_root_cause_hypothesis || '',
    auto_routed: ai.auto_routed || false,
    auto_routed_to: ai.auto_routed_to || '',
    routing_reason: ai.routing_reason || '',
  }

  if (existingG?.data?.id) {
    const { data } = await supabase.from('ticket_genomes').update(genomeData).eq('id', existingG.data.id).select().single()
    return data
  }
  const { data } = await supabase.from('ticket_genomes').insert(genomeData).select().single()
  return data
}

// ═══════════════════════════════════════════════════════════════════
//  P27: SESSION TIME MACHINE (record events from client)
// ═══════════════════════════════════════════════════════════════════
export async function analyzeSessionRecording(sessionToken) {
  const supabase = getSupabase()
  const { data: session } = await supabase.from('session_recordings')
    .select('*').eq('session_token', sessionToken).single()

  if (!session) throw new Error('Session not found')

  const events = session.events || []
  const rageClicks = events.filter(e => e.type === 'rage_click').length
  const deadClicks = events.filter(e => e.type === 'dead_click').length
  const errors = events.filter(e => e.type === 'error').length

  const prompt = `You are a UX Forensics AI. Analyze this user session recording and identify pain points.

SESSION EVENTS (${events.length} total):
Rage Clicks: ${rageClicks}
Dead Clicks: ${deadClicks}
Errors: ${errors}
Duration: ${session.duration_sec} seconds

SAMPLE EVENTS:
${JSON.stringify(events.slice(0, 30))}

Return JSON:
{
  "detected_frustrations": [
    {"type": "rage_click", "element": "Submit Button", "count": 5, "time_sec": 45, "reason": "Button unresponsive due to form validation not showing"}
  ],
  "journey_summary": "User attempted to submit payment form 3 times, encountered silent failures, rage-clicked submit button 5 times before leaving",
  "ux_issues": [
    {"issue": "Silent form validation failure", "severity": "critical", "fix": "Add visible error message to required fields"}
  ],
  "error_chain": [
    {"event": "form_submit", "time_sec": 30, "caused": "api_call_fail"},
    {"event": "api_call_fail", "time_sec": 31, "caused": "user_confusion"}
  ]
}`

  const ai = await callAI(prompt)

  const { data } = await supabase.from('session_recordings').update({
    ai_detected_frustrations: ai.detected_frustrations || [],
    ai_journey_summary: ai.journey_summary || '',
    ai_ux_issues: ai.ux_issues || [],
    ai_error_chain: ai.error_chain || [],
    rage_click_count: rageClicks,
    dead_click_count: deadClicks,
    error_count: errors,
  }).eq('id', session.id).select().single()

  return data
}

// ═══════════════════════════════════════════════════════════════════
//  P31: FORENSIC INTELLIGENCE ANALYSIS
// ═══════════════════════════════════════════════════════════════════
export async function analyzeForensicEvidence(ticketId, evidence) {
  const supabase = getSupabase()
  
  const { errors, logs, network, domSnapshots } = evidence
  const domContent = (domSnapshots?.[0] || '').substring(0, 5000) // First 5k chars of DOM

  const prompt = `You are a Forensic IT Investigator AI. Analyze the browser state and logs from an autonomous testing session.

ERRORS:
${JSON.stringify(errors || [], null, 2)}

CONSOLE LOGS:
${JSON.stringify(logs || [], null, 2)}

NETWORK FAILURES:
${JSON.stringify(network || [], null, 2)}

DOM SNAPSHOT (Partial):
${domContent}

Identify the root cause of the failure. Return JSON:
{
  "exact_failure": "The 'Submit' button click event was captured but the API request failed with 400 Bad Request.",
  "root_cause": "The 'phoneNumber' field in the form was sent as a number instead of a string, violating schema.",
  "severity": "high",
  "affected_component": "Contact Form",
  "fix_suggestion": "Wrap the phone value in String() in the handleSubmit function of contact-form.js",
  "confidence_score": 95,
  "is_bug_confirmed": true,
  "developer_notes": "The API endpoint /api/submit-contact expects a string for phone numbers. Client-side validation didn't catch our numeric input."
}
`

  const ai = await callAI(prompt)

  const { data: ticket } = await supabase.from('tickets').select('title, description').eq('id', ticketId).single()

  // Integrate with Code Surgeon to prepare a fix
  const surgery = await performCodeSurgery(
    ticketId,
    `TICKET: ${ticket?.title}\nFAILURE: ${ai.exact_failure}\nLOGS: ${JSON.stringify(errors)}`,
    JSON.stringify(ai.developer_notes),
    'javascript',
    'Next.js'
  )

  await supabase.from('forensic_investigations')
    .update({
      ai_analysis: ai,
      surgery_id: surgery.id,
      status: 'analyzed'
    })
    .eq('ticket_id', ticketId)

  return { analysis: ai, surgery }
}
