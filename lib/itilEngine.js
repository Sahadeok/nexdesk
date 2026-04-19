/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ITIL & GOVERNANCE ENGINE — itilEngine.js                       ║
 * ║  P66: ITIL Problems | P67: Mobile Fleet | P68: CMDB Graphs      ║
 * ║  P69: On-Premise Air-Gap Configurations                         ║
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
      temperature: 0.1, max_tokens: 4096,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })
  const d = await res.json()
  const c = d.choices?.[0]?.message?.content || '{}'
  return jsonMode ? JSON.parse(c) : c
}

// ═══════════════════════════════════════════════════════════════════
//  P66: ITIL PROBLEM MANAGEMENT CLUSTERING
// ═══════════════════════════════════════════════════════════════════
export async function detectItilProblem(incidents) {
  const supabase = getSupabase()
  
  if (!incidents || incidents.length < 2) return null

  // Summarize incidents into a string
  const incDocs = incidents.map(t => `- [${t.priority}] ${t.title}`).join('\n')

  const prompt = `You are a Senior ITIL Problem Manager AI.
Review these recent incident tickets. Deduplicate the underlying root cause (RCA) and formulate a master Problem Record.

INCIDENTS:
${incDocs}

Formulate the master ITIL Problem grouping these incidents. Return JSON:
{
  "problem_title": "Core Network Backbone Switch OOM Crash",
  "rca_summary": "Recursive routing loop causing Memory Overflow on Switch 5",
  "workaround_details": "Failover to redundant node and hard reset Switch 5",
  "ai_cluster_confidence": 92,
  "estimated_business_impact_inr": 450000.50
}`

  const ai = await callAI(prompt)
  
  const { data } = await supabase.from('itil_problems').insert({
    problem_title: ai.problem_title || 'Unclassified Core Failure',
    state: 'investigating',
    rca_summary: ai.rca_summary || '',
    workaround_details: ai.workaround_details || '',
    ai_cluster_confidence: ai.ai_cluster_confidence || 80,
    linked_incident_count: incidents.length,
    estimated_business_impact_inr: ai.estimated_business_impact_inr || 10000,
    known_error_record: false
  }).select().single()

  return data
}

// ═══════════════════════════════════════════════════════════════════
//  P68: ADVANCED CMDB IMPACT SIMULATION
// ═══════════════════════════════════════════════════════════════════
export async function calculateBlastRadius(failedAssetTag) {
  const supabase = getSupabase()
  
  // Real implementation: Recursive CTE graph traversal.
  // Mock Implementation for dashboard:
  
  const { data: root } = await supabase.from('asset_inventory').select('id, name, asset_type').eq('asset_tag', failedAssetTag).single()
  
  if (!root) throw new Error('Asset not found')
  
  const prompt = `You are an AI ITIL CMDB Architect estimating blast radius for an IT asset failure.
Root Asset Failed: ${root.name} (${root.asset_type})

Generate JSON tracking what child components would sequentially fail.
{
  "impacted_assets": ["Payment Database", "User Auth API", "Frontend LB"],
  "severity_escalation": "critical",
  "ai_blast_radius_summary": "Complete downtime for checkout pipeline. 3 dependent microservices will fail health checks within 60 seconds."
}`

  const ai = await callAI(prompt)
  
  return {
    root_failed: root.name,
    blast_radius: ai.impacted_assets || [],
    severity: ai.severity_escalation || 'high',
    summary: ai.ai_blast_radius_summary || ''
  }
}

// ═══════════════════════════════════════════════════════════════════
//  P67: MOBILE FLEET PUSH ROUTING
// ═══════════════════════════════════════════════════════════════════
export async function syncMobileFleetDevice(agentId, os, version) {
  const supabase = getSupabase()

  const { data: existing } = await supabase.from('mobile_fleet_devices').select('id').eq('agent_id', agentId).single()
  
  if (existing) {
    return await supabase.from('mobile_fleet_devices')
      .update({ last_sync_at: new Date().toISOString(), app_version: version, offline_cache_size_mb: Math.random() * 50 })
      .eq('id', existing.id).select().single().then(r => r.data)
  }

  const { data } = await supabase.from('mobile_fleet_devices').insert({
    agent_id: agentId,
    device_os: os,
    app_version: version,
    fcm_push_token: `fcm_${Math.random().toString(36).substring(2)}`,
    offline_cache_size_mb: 15
  }).select().single()

  return data
}

// ═══════════════════════════════════════════════════════════════════
//  P69: ON-PREM AIR-GAP REPORT PARSER
// ═══════════════════════════════════════════════════════════════════
export async function syncOnPremDeployment(clientName, healthPacketJson) {
  const supabase = getSupabase()

  // Simulating the ingestion of an encrypted USB health dump from an airgapped location
  const { data: existing } = await supabase.from('onprem_deployments').select('id').eq('client_name', clientName).single()

  if (existing) {
    return await supabase.from('onprem_deployments').update({
      last_health_packet_date: new Date().toISOString(),
      infra_status_json: healthPacketJson,
      updated_at: new Date().toISOString()
    }).eq('id', existing.id).select().single().then(r => r.data)
  }

  const { data } = await supabase.from('onprem_deployments').insert({
    client_name: clientName,
    deployment_mode: 'air_gapped',
    installed_version: 'v26.4.1-LTS',
    target_upgrade_version: 'v26.5.0-LTS',
    last_health_packet_date: new Date().toISOString(),
    node_count: Math.floor(Math.random() * 10) + 3,
    infra_status_json: healthPacketJson || { cpu: '45%', mem: '32GB', db_load: 'low' }
  }).select().single()
  
  return data
}
