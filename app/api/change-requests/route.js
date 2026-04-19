import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateCRNumber, aiWriteCR, analyzeRisk } from '../../../lib/crEngine'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// ── POST: Create new Change Request with AI assistance ──────────────
export async function POST(req) {
  try {
    const body = await req.json()
    const { brief_description, category, affected_services, planned_start, planned_end, use_ai } = body
    const supabase = getSupabase()

    let crData = {
      cr_number: await generateCRNumber(supabase),
      title: body.title || brief_description,
      description: body.description || brief_description,
      category: category || 'infrastructure',
      change_type: body.change_type || 'standard',
      affected_services: affected_services || [],
      affected_teams: body.affected_teams || [],
      affected_environments: body.affected_environments || 'production',
      planned_start: planned_start || null,
      planned_end: planned_end || null,
      rollback_plan: body.rollback_plan || '',
      testing_plan: body.testing_plan || '',
      communication_plan: body.communication_plan || '',
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // ── AI-POWERED CR GENERATION ────────────────────────────────
    if (use_ai !== false) {
      try {
        const aiResult = await aiWriteCR(brief_description || body.title, category, affected_services)

        crData = {
          ...crData,
          title: aiResult.title || crData.title,
          description: aiResult.description || crData.description,
          ai_summary: aiResult.ai_summary,
          change_type: aiResult.change_type || crData.change_type,
          risk_level: aiResult.risk_level || 'medium',
          urgency: aiResult.urgency || 'medium',
          affected_services: aiResult.affected_services || crData.affected_services,
          affected_teams: aiResult.affected_teams || crData.affected_teams,
          implementation_steps: aiResult.implementation_steps || [],
          rollback_plan: aiResult.rollback_plan || crData.rollback_plan,
          testing_plan: aiResult.testing_plan || crData.testing_plan,
          communication_plan: aiResult.communication_plan || crData.communication_plan,
          ai_recommended_window: aiResult.ai_recommended_window,
          ai_risk_reasoning: aiResult.ai_risk_reasoning,
        }
      } catch (aiErr) {
        console.error('[change-requests] AI generation failed, saving without AI:', aiErr.message)
      }
    }

    // ── SAVE TO DB ──────────────────────────────────────────────
    const { data: cr, error } = await supabase
      .from('change_requests')
      .insert(crData)
      .select()
      .single()

    if (error) {
      console.error('[change-requests] DB error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // ── AI RISK ANALYSIS (async, non-blocking) ──────────────────
    if (use_ai !== false && cr) {
      analyzeRisk(cr).then(async (riskResult) => {
        await supabase.from('change_requests').update({
          ai_risk_score: riskResult.overall_risk_score,
          ai_risk_reasoning: riskResult.risk_summary,
          ai_impact_analysis: JSON.stringify(riskResult.risk_factors),
          ai_blast_radius: riskResult.blast_radius,
          ai_confidence: riskResult.confidence,
          risk_level: riskResult.risk_level,
          updated_at: new Date().toISOString(),
        }).eq('id', cr.id)
      }).catch(err => console.error('[change-requests] Risk analysis failed:', err.message))
    }

    return NextResponse.json({ success: true, cr })

  } catch (e) {
    console.error('[change-requests] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── GET: List change requests ──────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const risk = searchParams.get('risk')
    const category = searchParams.get('category')
    const supabase = getSupabase()

    let query = supabase
      .from('change_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (status) query = query.eq('status', status)
    if (risk) query = query.eq('risk_level', risk)
    if (category) query = query.eq('category', category)

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, change_requests: data || [] })

  } catch (e) {
    console.error('[change-requests] GET error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── PATCH: Update CR status/fields ─────────────────────────────────
export async function PATCH(req) {
  try {
    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'CR id required' }, { status: 400 })

    const supabase = getSupabase()
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('change_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, cr: data })

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

