import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { analyzeRisk } from '../../../lib/crEngine'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// ── POST: Analyze risk for a specific CR ────────────────────────────
export async function POST(req) {
  try {
    const { cr_id } = await req.json()
    if (!cr_id) return NextResponse.json({ error: 'cr_id required' }, { status: 400 })

    const supabase = getSupabase()

    // Fetch the CR
    const { data: cr, error } = await supabase
      .from('change_requests')
      .select('*')
      .eq('id', cr_id)
      .single()

    if (error || !cr) return NextResponse.json({ error: 'CR not found' }, { status: 404 })

    // Run AI Risk Analysis
    const riskResult = await analyzeRisk(cr)

    // Update CR with risk data
    await supabase.from('change_requests').update({
      ai_risk_score: riskResult.overall_risk_score,
      ai_risk_reasoning: riskResult.risk_summary,
      ai_impact_analysis: JSON.stringify(riskResult.risk_factors),
      ai_blast_radius: riskResult.blast_radius,
      ai_confidence: riskResult.confidence,
      risk_level: riskResult.risk_level,
      updated_at: new Date().toISOString(),
    }).eq('id', cr_id)

    return NextResponse.json({
      success: true,
      risk_analysis: riskResult,
    })

  } catch (e) {
    console.error('[cr-risk-analysis] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

