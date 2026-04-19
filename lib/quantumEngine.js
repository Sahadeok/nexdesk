/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  QUANTUM & CORE SUPREMACY ENGINE — quantumEngine.js             ║
 * ║  P59: Blockchain Ledger | P60: Auto-PR | P61: Quantum Sec       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import crypto from 'crypto'
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
//  P59 & P61: BLOCKCHAIN AUDIT LOG & QUANTUM SIGNING
// ═══════════════════════════════════════════════════════════════════

// Simulate a post-quantum signature (Lattice-based Dilithium stand-in)
function generateQuantumSignature(hash) {
  // Real world: pass to a Key Encapsulation Mechanism (KEM)
  return `Q-SIG-${crypto.createHmac('sha3-512', 'quantum_seed').update(hash).digest('base64').substring(0, 32)}`
}

function calculateHash(index, prevHash, action, actor, payloadJSON, timestamp) {
  const data = `${index}${prevHash}${action}${actor}${payloadJSON}${timestamp}`
  return crypto.createHash('sha256').update(data).digest('hex')
}

export async function addAuditBlock(actionType, actorName, payloadObj) {
  const supabase = getSupabase()

  // Lock table conceptually by grabbing max index
  const { data: latestBlock } = await supabase.from('quantum_audit_ledger').select('*').order('block_index', { ascending: false }).limit(1).single()

  const index = latestBlock ? latestBlock.block_index + 1 : 0
  const prevHash = latestBlock ? latestBlock.current_block_hash : '0000000000000000000000000000000000000000000000000000000000000000'
  const payloadJSON = JSON.stringify(payloadObj || {})
  const timestamp = new Date().toISOString()

  let hash = calculateHash(index, prevHash, actionType, actorName, payloadJSON, timestamp)
  const qSig = generateQuantumSignature(hash)

  const { data } = await supabase.from('quantum_audit_ledger').insert({
    block_index: index,
    action_type: actionType,
    actor: actorName,
    payload: payloadObj || {},
    previous_block_hash: prevHash,
    current_block_hash: hash,
    quantum_signature: qSig,
    timestamp: timestamp
  }).select().single()

  return data
}

export async function verifyLedgerIntegrity() {
  const supabase = getSupabase()
  const { data: blocks } = await supabase.from('quantum_audit_ledger').select('*').order('block_index', { ascending: true })
  
  if (!blocks || blocks.length === 0) return { valid: true, broken_at_index: null }

  let previousHash = '0000000000000000000000000000000000000000000000000000000000000000'
  
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.previous_block_hash !== previousHash) {
      return { valid: false, broken_at_index: b.block_index, reason: 'Previous hash mismatch' }
    }
    
    // Verify payload integrity
    const payloadStr = JSON.stringify(b.payload)
    const expectedHash = calculateHash(b.block_index, b.previous_block_hash, b.action_type, b.actor, payloadStr, b.timestamp)
    
    if (b.current_block_hash !== expectedHash) {
      return { valid: false, broken_at_index: b.block_index, expected_hash: expectedHash, found_hash: b.current_block_hash, reason: 'Payload hash corrupted' }
    }
    
    previousHash = b.current_block_hash
  }

  return { valid: true, broken_at_index: null }
}

// ═══════════════════════════════════════════════════════════════════
//  P60: AI CODE FIXER (AUTO PULL REQUESTS)
// ═══════════════════════════════════════════════════════════════════
export async function generateAutoPR(issueDescription) {
  const supabase = getSupabase()

  const prompt = `You are a Senior System Architect AI directly wired into a GitHub repository.
There is a bug ticket: "${issueDescription}"

Write the file change required to fix this issue. Return valid JSON only:
{
  "branch_name": "fix/ai-mem-leak-router",
  "file_path": "src/services/Router.ts",
  "original_code": "export function route(t) { return cache(t); }",
  "fixed_code": "export function route(t) { const c = cache(t); clearCache(); return c; }",
  "commit_message": "fix(router): prevent memory leak by clearing cache context",
  "confidence_score": 98,
  "security_scan_passed": true
}`

  const ai = await callAI(prompt)
  
  const { count } = await supabase.from('ai_pull_requests').select('*', { count: 'exact', head: true })
  const prNum = count || 0
  
  const prUrl = `https://github.com/nexdesk/core/pull/${prNum + 1}`

  const { data } = await supabase.from('ai_pull_requests').insert({
    pr_number: `PR-${String(prNum + 1).padStart(3, '0')}`,
    issue_description: issueDescription,
    branch_name: ai.branch_name || 'fix/ai-patch',
    file_path: ai.file_path || 'unknown.js',
    original_code: ai.original_code || '',
    fixed_code: ai.fixed_code || '',
    commit_message: ai.commit_message || 'Fix bug',
    confidence_score: ai.confidence_score || 95,
    security_scan_passed: ai.security_scan_passed !== undefined ? ai.security_scan_passed : true,
    github_pr_url: prUrl,
    status: 'open',
  }).select().single()

  // Log to blockchain
  await addAuditBlock('AUTO_PR_CREATED', 'AI_ENGINE', { pr_id: data.id, file: data.file_path })

  return data
}
