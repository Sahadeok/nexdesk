/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ENTERPRISE CORE ENGINE — enterpriseEngine.js                   ║
 * ║  P62: Email-to-Ticket | P63: SSO/SAML | P64: Automations        ║
 * ║  P65: Asset (CMDB) Management                                   ║
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
//  P62: EMAIL TO TICKET PARSING
// ═══════════════════════════════════════════════════════════════════
export async function parseIncomingEmail(sender_email, raw_subject, raw_body) {
  const supabase = getSupabase()

  const prompt = `You are a Tier 3 IT Inbox AI parsing a messy unstructured email into a structured support ticket.
Identify urgency, category intent, tone, and extract any hardware/software assets mentioned.

SENDER: ${sender_email}
SUBJECT: ${raw_subject}
BODY: ${raw_body}

Output valid JSON:
{
  "parsed_intent": "hardware_failure",
  "parsed_urgency": "high",
  "ai_sentiment": "frustrated",
  "ai_accuracy_score": 98,
  "extracted_assets": ["MacBook Pro 16", "Dell Monitor"],
  "ticket_title": "Cleaned up title for the agent",
  "ticket_body": "Summary of the actual issue stripping out signatures/fluff."
}`

  const ai = await callAI(prompt)
  
  const { data: cat } = await supabase.from('categories').select('id').ilike('name', `%${ai.parsed_intent || ''}%`).limit(1).single()
  
  // 1. Create the Ticket
  const { data: ticket } = await supabase.from('tickets').insert({
    title: ai.ticket_title || raw_subject,
    description: ai.ticket_body || raw_body,
    priority: ai.parsed_urgency || 'medium',
    category_id: cat?.id || null, // fallback to null if no matching category
    status: 'open',
    source: 'email'
  }).select().single()

  // 2. Log the Email Parser Event
  const { data: log } = await supabase.from('email_ingestion_logs').insert({
    message_id: `msg_${Math.random().toString(36).substring(2, 12)}`,
    sender_email,
    raw_subject,
    raw_body,
    parsed_intent: ai.parsed_intent || 'unknown',
    parsed_urgency: ai.parsed_urgency || 'medium',
    ai_sentiment: ai.ai_sentiment || 'neutral',
    ai_accuracy_score: ai.ai_accuracy_score || 90,
    extracted_assets: ai.extracted_assets || [],
    converted_ticket_id: ticket?.id,
  }).select().single()

  // 3. Trigger Email Rule Engine (P64)
  await triggerAutomation('email.received', { sender: sender_email, email_log_id: log.id, intent: ai.parsed_intent })

  return { ticket, log }
}

// ═══════════════════════════════════════════════════════════════════
//  P63: SSO / SAML INTEGRATION (MOCK)
// ═══════════════════════════════════════════════════════════════════
export async function testSsoConnection(providerName, protocol) {
  const supabase = getSupabase()
  
  // Mock Okta/Entra connection test
  let status = Math.random() > 0.1 ? 'active' : 'error'
  let is_active = status === 'active'

  const { data: existing } = await supabase.from('sso_connections').select('id').eq('provider_name', providerName).single()

  if (existing) {
    const { data } = await supabase.from('sso_connections').update({
      is_active,
      last_test_sync_at: new Date().toISOString(),
      last_error: is_active ? null : 'Certificate mismatched or metadata URL unreachable (Simulated)'
    }).eq('id', existing.id).select().single()
    return data
  } else {
    const { data } = await supabase.from('sso_connections').insert({
      provider_name: providerName,
      protocol: protocol || 'SAML 2.0',
      issuer_url: `https://${providerName.toLowerCase()}.com/saml2`,
      is_active,
      login_count: 0,
      last_test_sync_at: new Date().toISOString(),
      last_error: is_active ? null : 'Initialization failure'
    }).select().single()
    return data
  }
}

// ═══════════════════════════════════════════════════════════════════
//  P64: AUTOMATION BUILDER (EVENT LOOP)
// ═══════════════════════════════════════════════════════════════════
export async function triggerAutomation(triggerType, payload) {
  const supabase = getSupabase()
  
  // Find all active recipes for this trigger
  const { data: recipes } = await supabase.from('automation_recipes').select('*').eq('trigger_event', triggerType).eq('is_active', true)
  
  if (!recipes || !recipes.length) return []

  const executed = []
  
  for (const recipe of recipes) {
    // Highly simplified Condition Engine (Just simulating logic processing)
    const conditionsMet = (recipe.conditions || []).every(c => {
       // Mock logic: c.field === "priority", c.value === payload.priority
       return payload[c.field] === c.value
    })

    // If no conditions or all conditions met, run it
    if (!recipe.conditions?.length || conditionsMet) {
      await supabase.from('automation_recipes').update({
        times_triggered: (recipe.times_triggered || 0) + 1,
        last_triggered_at: new Date().toISOString()
      }).eq('id', recipe.id)
      
      executed.push(recipe.name)
    }
  }

  return executed
}

export async function createAutomationRecipe(name, triggerEvent, conditions, actions) {
  const supabase = getSupabase()
  const { data } = await supabase.from('automation_recipes').insert({
    name,
    trigger_event: triggerEvent,
    conditions,
    actions
  }).select().single()
  return data
}

// ═══════════════════════════════════════════════════════════════════
//  P65: ASSET MANAGEMENT (CMDB)
// ═══════════════════════════════════════════════════════════════════
export async function linkAssetToTicket(assetTag, ticketId) {
  const supabase = getSupabase()
  
  const { data: asset } = await supabase.from('asset_inventory').select('id, linked_ticket_count').eq('asset_tag', assetTag).single()
  
  if (!asset) return { error: `Asset ${assetTag} not found.` }
  
  // Increment linking (simplified array structure vs join table for speed)
  const newCount = (asset.linked_ticket_count || 0) + 1
  let health = 100
  if (newCount > 5) health = 75
  if (newCount > 15) health = 40
  
  const { data } = await supabase.from('asset_inventory').update({
    linked_ticket_count: newCount,
    health_score: health,
    status: health <= 40 ? 'in_repair' : 'active'
  }).eq('id', asset.id).select().single()

  return data
}

export async function createMockAsset(name, type, cost) {
  const supabase = getSupabase()
  const { data } = await supabase.from('asset_inventory').insert({
    asset_tag: `AST-${Math.floor(Math.random()*90000) + 10000}`,
    name,
    asset_type: type,
    annual_cost_inr: cost,
    ip_address: type === 'network' || type === 'hardware' ? `192.168.${Math.floor(Math.random()*255)}.1` : null
  }).select().single()
  return data
}
