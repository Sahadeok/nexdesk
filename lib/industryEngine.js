/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  INDUSTRY SUPREMACY ENGINE — industryEngine.js                  ║
 * ║  P56: BFSI Pack | P57: Healthcare Pack | P58: E-Com Pack        ║
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
//  P56 & P57: COMPLIANCE DATA MASKING (BFSI & HEALTHCARE)
// ═══════════════════════════════════════════════════════════════════
export async function scanComplianceData(textToScan, industryPack = 'bfsi') {
  const supabase = getSupabase()

  // For testing UI, if no text provided:
  if (!textToScan) {
    textToScan = industryPack === 'healthcare' 
      ? 'Patient John Doe (DOB: 05/12/1980) has SSN 123-45-6789 and needs his Xanax refilled for severe anxiety.'
      : 'Refund issue for my card ending in 1234. Full number is 4455-6677-8899-1234. OTP is 493011.';
  }

  const prompt = `You are an enterprise Compliance & DLP (Data Loss Prevention) Engine for the ${industryPack.toUpperCase()} sector.
  
TEXT TO SCAN: 
"${textToScan}"

INDUSTRY: ${industryPack} (bfsi = look for PCI-DSS/RBI like PAN, CC, OTP, Bank Acct) (healthcare = look for HIPAA/PHI like SSN, DOB, conditions, medication).

Analyze the text, detect any regulatory violations, and mask sensitive entities using placeholder tokens like [REDACTED_CC], [REDACTED_DOB].
Identify framework, severity, and output valid JSON.

Return JSON:
{
  "violation_found": true,
  "severity": "critical",
  "regulatory_framework": "PCI-DSS",
  "pii_entities_detected": [
    {"type": "credit_card", "framework": "PCI-DSS"},
    {"type": "otp", "framework": "RBI"}
  ],
  "masked_text": "Refund issue for my card ending in 1234. Full number is [MASKED_CC]. OTP is [MASKED_OTP].",
  "ai_compliance_verdict": "CRITICAL RISK: Found 16-digit PAN and OTP in cleartext. Auto-vaulted and masked for agent view."
}`

  const ai = await callAI(prompt)

  const { data } = await supabase.from('industry_compliance_scans').insert({
    ticket_id: null,
    industry_pack: industryPack,
    raw_text_scanned: textToScan,
    masked_text: ai.masked_text || textToScan.replace(/\d/g, '*'),
    violation_found: ai.violation_found !== undefined ? ai.violation_found : true,
    severity: ai.severity || 'high',
    regulatory_framework: ai.regulatory_framework || 'Unknown',
    pii_entities_detected: ai.pii_entities_detected || [],
    ai_compliance_verdict: ai.ai_compliance_verdict || 'Processed.',
    secure_vault_token: `vTok_${Math.random().toString(36).substring(2, 12)}`,
  }).select().single()

  return data
}

// ═══════════════════════════════════════════════════════════════════
//  P58: E-COMMERCE VELOCITY ENGINE
// ═══════════════════════════════════════════════════════════════════
export async function analyzeEcommerceVelocity(eventName, currentData) {
  const supabase = getSupabase()

  const prompt = `You are a high-velocity E-Commerce Operational Intelligence Engine analyzing a live flash sale or traffic burst.
EVENT: ${eventName}
CURRENT TICKET RATE: ${currentData?.tickets_per_minute || 120} tickets/min
PRIMARY ISSUES: Payment gateway timeouts and cart crashes.

Analyze the raw blast of e-commerce tickets and output a strategic automation response. Return JSON:
{
  "top_friction_point": "Payment_Gateway_Timeout",
  "abandoned_carts_recovered": 450,
  "lost_revenue_risk_inr": 2500000.00,
  "auto_refunds_processed": 85,
  "ai_ecommerce_strategy": "CRITICAL: Razorpay gateway is failing 25% of transactions. Auto-routing customers to alternative UPI gateway and extending cart holds by 30 mins to prevent 2.5M INR loss."
}`

  const ai = await callAI(prompt)

  const { data } = await supabase.from('ecommerce_velocity_events').insert({
    event_name: eventName || 'Flash_Sale_Surge',
    tickets_per_minute: currentData?.tickets_per_minute || 120,
    top_friction_point: ai.top_friction_point || 'Unknown Timeout',
    abandoned_carts_recovered: ai.abandoned_carts_recovered || 0,
    lost_revenue_risk_inr: ai.lost_revenue_risk_inr || 0,
    auto_refunds_processed: ai.auto_refunds_processed || 0,
    ai_ecommerce_strategy: ai.ai_ecommerce_strategy || '',
  }).select().single()

  return data
}
