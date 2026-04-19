/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  CHANGE INTELLIGENCE ENGINE — crEngine.js                      ║
 * ║  AI-Powered Change Request Analysis, Risk Scoring,             ║
 * ║  Conflict Detection, & Deployment Intelligence                 ║
 * ║  NexDesk Phase 15 — World's First AI Change Intelligence       ║
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
async function callAI(prompt, jsonMode = true) {
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
      temperature: 0.3,
      max_tokens: 4000,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || '{}'
  return jsonMode ? JSON.parse(content) : content
}

// ─── CR NUMBER GENERATOR ──────────────────────────────────────────
export async function generateCRNumber(supabase) {
  const { count } = await supabase
    .from('change_requests')
    .select('*', { count: 'exact', head: true })
  return `CR-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`
}

// ═══════════════════════════════════════════════════════════════════
//  AI CR WRITER — Auto-generates full change document
// ═══════════════════════════════════════════════════════════════════
export async function aiWriteCR(briefDescription, category, affectedServices = []) {
  const prompt = `You are NexDesk Change Intelligence AI — the world's most advanced ITSM Change Management brain.
A user wants to create a Change Request. Generate a comprehensive CR document from this brief description.

Brief Description: "${briefDescription}"
Category: ${category}
Affected Services: ${affectedServices.join(', ') || 'Not specified'}

Generate a detailed JSON response:
{
  "title": "Clear professional title for the CR",
  "description": "Detailed description (3-5 sentences) of what this change involves",
  "ai_summary": "Executive summary in 2 sentences",
  "change_type": "standard|emergency|normal|expedited",
  "risk_level": "low|medium|high|critical",
  "urgency": "low|medium|high|critical",
  "affected_services": ["list", "of", "affected", "services"],
  "affected_teams": ["list", "of", "affected", "teams"],
  "implementation_steps": [
    {"step": 1, "description": "Step description", "duration_min": 15, "rollback_step": "How to undo this step"}
  ],
  "rollback_plan": "Complete rollback procedure in case of failure",
  "testing_plan": "Pre and post deployment testing steps",
  "communication_plan": "Who to notify before/during/after the change",
  "ai_recommended_window": "Best time window for this deployment (e.g., 'Saturday 2:00 AM - 4:00 AM IST')",
  "estimated_duration_minutes": 60,
  "ai_risk_reasoning": "Detailed reasoning for the risk level assigned"
}

Be specific, actionable, and ITSM-professional. Think like a senior IT change manager.`

  return await callAI(prompt)
}

// ═══════════════════════════════════════════════════════════════════
//  AI RISK PREDICTOR — Multi-dimensional risk scoring
// ═══════════════════════════════════════════════════════════════════
export async function analyzeRisk(cr) {
  const supabase = getSupabase()

  // Fetch historical CRs for context
  const { data: historicalCRs } = await supabase
    .from('change_requests')
    .select('title, category, risk_level, deployment_success, ai_risk_score')
    .in('status', ['deployed', 'closed', 'rolled_back'])
    .order('created_at', { ascending: false })
    .limit(20)

  const historySummary = (historicalCRs || [])
    .map(h => `${h.title} | Risk:${h.risk_level} | Score:${h.ai_risk_score} | Success:${h.deployment_success}`)
    .join('\n')

  const prompt = `You are the world's most advanced IT Change Risk Analysis AI.
Analyze this Change Request and provide a comprehensive risk assessment.

=== CHANGE REQUEST ===
Title: ${cr.title}
Description: ${cr.description}
Category: ${cr.category}
Type: ${cr.change_type}
Affected Services: ${JSON.stringify(cr.affected_services)}
Affected Teams: ${JSON.stringify(cr.affected_teams)}
Environment: ${cr.affected_environments}
Planned Start: ${cr.planned_start}
Planned End: ${cr.planned_end}
Rollback Plan: ${cr.rollback_plan || 'Not provided'}
Testing Plan: ${cr.testing_plan || 'Not provided'}

=== HISTORICAL CONTEXT ===
Recent change requests:
${historySummary || 'No historical data available'}

=== RISK FACTORS TO EVALUATE ===
1. Technical complexity (0-100)
2. Blast radius — how many systems/users affected (0-100)
3. Rollback difficulty (0-100)
4. Time sensitivity — is this during peak hours? (0-100)
5. Testing coverage — is the testing plan adequate? (0-100)
6. Historical pattern — have similar changes failed before? (0-100)
7. Dependency chain — does this change depend on other changes? (0-100)
8. Team readiness — is the right team assigned? (0-100)

Return JSON:
{
  "overall_risk_score": 0-100,
  "risk_level": "low|medium|high|critical",
  "confidence": 0-100,
  "risk_factors": {
    "technical_complexity": {"score": 0-100, "reasoning": "..."},
    "blast_radius": {"score": 0-100, "reasoning": "...", "services_count": 0, "users_estimate": 0},
    "rollback_difficulty": {"score": 0-100, "reasoning": "..."},
    "time_sensitivity": {"score": 0-100, "reasoning": "..."},
    "testing_coverage": {"score": 0-100, "reasoning": "..."},
    "historical_pattern": {"score": 0-100, "reasoning": "..."},
    "dependency_chain": {"score": 0-100, "reasoning": "..."},
    "team_readiness": {"score": 0-100, "reasoning": "..."}
  },
  "blast_radius": {
    "services": ["list of affected services"],
    "teams": ["list of affected teams"],
    "users_affected": 0,
    "revenue_at_risk": "estimate in words"
  },
  "risk_summary": "2-3 sentence summary of key risks",
  "mitigation_recommendations": ["recommendation 1", "recommendation 2"],
  "recommended_deployment_window": "optimal time window with reasoning",
  "go_no_go_recommendation": "GO|CONDITIONAL_GO|NO_GO",
  "conditions_for_go": ["condition 1 if conditional"]
}`

  return await callAI(prompt)
}

// ═══════════════════════════════════════════════════════════════════
//  CONFLICT DETECTOR — Cross-CR clash detection
// ═══════════════════════════════════════════════════════════════════
export async function detectConflicts(crId) {
  const supabase = getSupabase()

  // Fetch the target CR
  const { data: targetCR } = await supabase
    .from('change_requests')
    .select('*')
    .eq('id', crId)
    .single()

  if (!targetCR) throw new Error('CR not found')

  // Fetch all active/scheduled CRs (excluding this one)
  const { data: activeCRs } = await supabase
    .from('change_requests')
    .select('*')
    .in('status', ['approved', 'scheduled', 'in_progress', 'pending_review'])
    .neq('id', crId)

  if (!activeCRs || activeCRs.length === 0) {
    return { conflicts: [], total: 0 }
  }

  const crSummaries = activeCRs.map(cr => ({
    id: cr.id,
    cr_number: cr.cr_number,
    title: cr.title,
    services: cr.affected_services,
    teams: cr.affected_teams,
    start: cr.planned_start,
    end: cr.planned_end,
    category: cr.category,
    status: cr.status,
  }))

  const prompt = `You are an advanced ITSM Conflict Detection AI.
Analyze this Change Request against all currently active/scheduled CRs and detect any conflicts.

=== TARGET CR ===
CR Number: ${targetCR.cr_number}
Title: ${targetCR.title}
Description: ${targetCR.description}
Category: ${targetCR.category}
Affected Services: ${JSON.stringify(targetCR.affected_services)}
Affected Teams: ${JSON.stringify(targetCR.affected_teams)}
Planned Start: ${targetCR.planned_start}
Planned End: ${targetCR.planned_end}

=== ALL ACTIVE CRs ===
${JSON.stringify(crSummaries, null, 2)}

Detect ALL types of conflicts:
1. SERVICE_OVERLAP — Both CRs affect the same service
2. TIME_OVERLAP — CRs are scheduled for overlapping windows
3. DEPENDENCY_CHAIN — One CR depends on another completing first
4. RESOURCE_CONFLICT — Same team working on both, risk of fatigue
5. BLAST_RADIUS_OVERLAP — Combined blast radius is dangerous

Return JSON:
{
  "conflicts": [
    {
      "conflicting_cr_id": "uuid",
      "conflicting_cr_number": "CR-2026-XXX",
      "conflict_type": "service_overlap|time_overlap|dependency_chain|resource_conflict|blast_radius_overlap",
      "severity": "low|medium|high|critical",
      "description": "Clear description of the conflict",
      "recommendation": "How to resolve this conflict"
    }
  ],
  "overall_conflict_level": "none|low|medium|high|critical",
  "summary": "Brief summary of all conflicts found"
}`

  const result = await callAI(prompt)

  // Save detected conflicts to DB
  for (const conflict of (result.conflicts || [])) {
    await supabase.from('cr_conflicts').insert({
      cr_id_a: crId,
      cr_id_b: conflict.conflicting_cr_id,
      conflict_type: conflict.conflict_type,
      severity: conflict.severity,
      description: conflict.description,
      ai_analysis: result.summary,
      ai_recommendation: conflict.recommendation,
    })
  }

  return result
}

// ═══════════════════════════════════════════════════════════════════
//  DEPLOYMENT INTELLIGENCE — Live monitoring & auto-rollback
// ═══════════════════════════════════════════════════════════════════
export async function startDeployment(crId) {
  const supabase = getSupabase()

  // Update CR status
  await supabase.from('change_requests').update({
    status: 'in_progress',
    actual_start: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', crId)

  // Create deployment record
  const { data: deployment } = await supabase.from('cr_deployments').insert({
    cr_id: crId,
    status: 'deploying',
    phase: 'deploy',
    progress: 10,
    deploy_started_at: new Date().toISOString(),
    deploy_logs: [{ timestamp: new Date().toISOString(), message: 'Deployment initiated', level: 'info' }],
  }).select().single()

  return deployment
}

export async function updateDeploymentMetrics(deploymentId, metrics) {
  const supabase = getSupabase()

  const { data: deployment } = await supabase
    .from('cr_deployments')
    .select('*, change_requests(title, ai_risk_score)')
    .eq('id', deploymentId)
    .single()

  if (!deployment) throw new Error('Deployment not found')

  // Auto-rollback check: if error rate spikes > 5% above baseline
  const errorSpike = (metrics.error_rate || 0) - (deployment.error_rate_before || 0)
  const shouldRollback = errorSpike > 5 || (metrics.health_score || 100) < 40

  const newLogs = [...(deployment.deploy_logs || []), {
    timestamp: new Date().toISOString(),
    message: shouldRollback
      ? `🚨 AUTO-ROLLBACK TRIGGERED: Error spike ${errorSpike.toFixed(1)}%, Health ${metrics.health_score}%`
      : `📊 Metrics update: Error ${metrics.error_rate}%, Latency ${metrics.latency_ms}ms, Health ${metrics.health_score}%`,
    level: shouldRollback ? 'critical' : 'info',
  }]

  const updateData = {
    error_rate_during: metrics.error_rate ?? deployment.error_rate_during,
    latency_during_ms: metrics.latency_ms ?? deployment.latency_during_ms,
    health_score: metrics.health_score ?? deployment.health_score,
    progress: metrics.progress ?? deployment.progress,
    phase: metrics.phase ?? deployment.phase,
    deploy_logs: newLogs,
    updated_at: new Date().toISOString(),
  }

  if (shouldRollback) {
    updateData.status = 'rolling_back'
    updateData.auto_rollback_triggered = true
    updateData.rollback_reason = `Error rate spiked by ${errorSpike.toFixed(1)}% (threshold: 5%). Health score dropped to ${metrics.health_score}%.`
  } else if (metrics.phase === 'post_deploy' && (metrics.health_score || 100) >= 80) {
    updateData.status = 'completed'
    updateData.deploy_completed_at = new Date().toISOString()
    updateData.error_rate_after = metrics.error_rate || 0
    updateData.latency_after_ms = metrics.latency_ms || 0
  }

  await supabase.from('cr_deployments').update(updateData).eq('id', deploymentId)

  // If auto-rollback, update the CR status too
  if (shouldRollback) {
    await supabase.from('change_requests').update({
      status: 'rolled_back',
      deployment_success: false,
      post_deployment_notes: `Auto-rollback triggered. ${updateData.rollback_reason}`,
      updated_at: new Date().toISOString(),
    }).eq('id', deployment.cr_id)
  }

  return { shouldRollback, ...updateData }
}

// ═══════════════════════════════════════════════════════════════════
//  POST-DEPLOYMENT AI ANALYSIS
// ═══════════════════════════════════════════════════════════════════
export async function generatePostAnalysis(crId) {
  const supabase = getSupabase()

  const { data: cr } = await supabase.from('change_requests').select('*').eq('id', crId).single()
  const { data: deployment } = await supabase.from('cr_deployments').select('*').eq('cr_id', crId).order('created_at', { ascending: false }).limit(1).single()

  if (!cr) throw new Error('CR not found')

  const prompt = `You are NexDesk Post-Deployment Analyst AI — the world's most advanced change analysis engine.
Generate a comprehensive post-deployment analysis for this Change Request.

=== CHANGE REQUEST ===
Title: ${cr.title}
Description: ${cr.description}
Category: ${cr.category}
Risk Level: ${cr.risk_level}
AI Risk Score: ${cr.ai_risk_score}
Status: ${cr.status}
Planned: ${cr.planned_start} → ${cr.planned_end}
Actual: ${cr.actual_start} → ${cr.actual_end || 'ongoing'}

=== DEPLOYMENT DATA ===
Status: ${deployment?.status || 'unknown'}
Error Rate Before: ${deployment?.error_rate_before || 0}%
Error Rate During: ${deployment?.error_rate_during || 0}%
Error Rate After: ${deployment?.error_rate_after || 0}%
Latency Before: ${deployment?.latency_before_ms || 0}ms
Latency After: ${deployment?.latency_after_ms || 0}ms
Health Score: ${deployment?.health_score || 0}
Auto-Rollback: ${deployment?.auto_rollback_triggered || false}
Rollback Reason: ${deployment?.rollback_reason || 'N/A'}

=== DEPLOY LOGS ===
${JSON.stringify(deployment?.deploy_logs || [], null, 2)}

Generate JSON:
{
  "overall_verdict": "success|partial_success|failure|needs_review",
  "success_score": 0-100,
  "ai_summary": "Executive summary of the deployment outcome (3-4 sentences)",
  "ai_what_went_well": "What worked well (2-3 points)",
  "ai_what_went_wrong": "What went wrong or could improve (2-3 points, use 'N/A' if deployment was flawless)",
  "ai_root_cause": "Root cause if there was a failure, otherwise 'N/A'",
  "ai_lessons_learned": "Key lessons for future deployments",
  "ai_action_items": [
    {"action": "what to do", "owner": "team/role", "deadline": "timeframe", "priority": "high|medium|low"}
  ],
  "ai_recommendations": ["recommendation 1", "recommendation 2"],
  "performance_delta": {
    "error_rate_change": "+/-X%",
    "latency_change": "+/-Xms",
    "health_change": "+/-X points"
  },
  "users_affected_estimate": 0,
  "downtime_minutes_estimate": 0,
  "revenue_impact": "estimate or 'minimal'"
}`

  const analysis = await callAI(prompt)

  // Save to DB
  const { data: saved } = await supabase.from('cr_post_analysis').insert({
    cr_id: crId,
    overall_verdict: analysis.overall_verdict,
    success_score: analysis.success_score,
    ai_summary: analysis.ai_summary,
    ai_what_went_well: analysis.ai_what_went_well,
    ai_what_went_wrong: analysis.ai_what_went_wrong,
    ai_root_cause: analysis.ai_root_cause,
    ai_lessons_learned: analysis.ai_lessons_learned,
    ai_action_items: analysis.ai_action_items,
    ai_recommendations: analysis.ai_recommendations,
    performance_delta: analysis.performance_delta,
    users_affected: analysis.users_affected_estimate || 0,
    downtime_minutes: analysis.downtime_minutes_estimate || 0,
    revenue_impact_estimate: analysis.revenue_impact,
  }).select().single()

  // Update CR with lessons learned
  await supabase.from('change_requests').update({
    lessons_learned: analysis.ai_lessons_learned,
    deployment_success: analysis.overall_verdict === 'success',
    updated_at: new Date().toISOString(),
  }).eq('id', crId)

  return { analysis, saved }
}

// ═══════════════════════════════════════════════════════════════════
//  SMART CHANGE CALENDAR — AI-optimized scheduling
// ═══════════════════════════════════════════════════════════════════
export async function getSmartSchedule() {
  const supabase = getSupabase()

  const { data: scheduledCRs } = await supabase
    .from('change_requests')
    .select('id, cr_number, title, planned_start, planned_end, risk_level, status, category, affected_services')
    .in('status', ['approved', 'scheduled', 'in_progress'])
    .order('planned_start', { ascending: true })

  return scheduledCRs || []
}

// ═══════════════════════════════════════════════════════════════════
//  TECHNICAL ARCHITECT — Code & Design Generation
// ═══════════════════════════════════════════════════════════════════
export async function aiGenerateTechnicalDesign(prompt, context = 'developer_prompt') {
  const systemPrompt = context === 'brd' 
    ? "You are a Principal Software Architect. Convert this Business Requirement Document (BRD) into a detailed technical implementation plan with code snippets, DB schema changes, and API definitions."
    : "You are a Senior Lead Developer. Convert this prompt into a production-ready technical implementation plan including the exact code needed."

  const aiPrompt = `${systemPrompt}

INPUT: "${prompt}"

Return a structured JSON:
{
  "summary": "Brief technical summary",
  "architecture_decision": "High level architecture choice",
  "db_changes": ["list of SQL migrations or schema changes"],
  "api_changes": ["list of new/modified API endpoints"],
  "code_snippets": [
    {"file": "filename.js", "language": "javascript", "code": "...", "explanation": "..."}
  ],
  "security_considerations": ["list of security impacts"],
  "test_cases": ["how to verify this code"]
}`

  return await callAI(aiPrompt)
}
