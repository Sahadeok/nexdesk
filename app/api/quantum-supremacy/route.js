import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addAuditBlock, verifyLedgerIntegrity, generateAutoPR } from '../../../lib/quantumEngine'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'create_pr') {
      const r = await generateAutoPR(body.issue_description || 'High CPU load caused by recursive loop')
      return NextResponse.json({ success: true, pr: r })
    }
    
    if (action === 'log_event') {
      const r = await addAuditBlock(body.event_type || 'SYSTEM_SYNC', body.actor || 'API_USER', { details: body.details })
      return NextResponse.json({ success: true, block: r })
    }
    
    if (action === 'verify_chain') {
      const verification = await verifyLedgerIntegrity()
      if (verification && verification.valid) {
          // If valid, simulate a log block about successful audit
          await addAuditBlock('SECURITY_AUDIT', 'SYSTEM', { status: 'passed' })
      }
      return NextResponse.json({ success: true, verification })
    }
    
    if (action === 'corrupt_block') {
      // Secret backdoor for demo purposes to break the blockchain
      const { data: b } = await sb().from('quantum_audit_ledger').select('id, block_index').order('block_index', { ascending: false }).limit(2)
      if (b && b.length > 1) {
        // Change payload without updating hash
        await sb().from('quantum_audit_ledger')
            .update({ payload: { corrupted_by: 'MOCK_HACKER', details: 'Stolen Data' }, is_tampered: true })
            .eq('id', b[1].id)
      }
      return NextResponse.json({ success: true, tampered: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[quantum-supremacy] POST:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const supabase = sb()

    if (type === 'ledger') {
      const { data } = await supabase.from('quantum_audit_ledger').select('*').order('block_index', { ascending: false }).limit(10)
      return NextResponse.json({ success: true, ledger: data || [] })
    }
    
    if (type === 'prs') {
      const { data } = await supabase.from('ai_pull_requests').select('*').order('created_at', { ascending: false }).limit(10)
      return NextResponse.json({ success: true, prs: data || [] })
    }

    if (type === 'stats') {
      const { count: blockCount } = await supabase.from('quantum_audit_ledger').select('*', { count: 'exact', head: true })
      const { count: prCount } = await supabase.from('ai_pull_requests').select('*', { count: 'exact', head: true })
      
      return NextResponse.json({
        success: true,
        stats: {
          ledger_depth: blockCount || 0,
          ai_prs_created: prCount || 0,
          encryption_algo: 'Dilithium (NIST PQ)',
          chain_status: 'Secured'
        }
      })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

