import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generatePostAnalysis } from '../../../lib/crEngine'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// ── POST: Generate AI post-deployment analysis ──────────────────────
export async function POST(req) {
  try {
    const { cr_id } = await req.json()
    if (!cr_id) return NextResponse.json({ error: 'cr_id required' }, { status: 400 })

    const result = await generatePostAnalysis(cr_id)

    return NextResponse.json({
      success: true,
      analysis: result.analysis,
      saved: result.saved,
    })

  } catch (e) {
    console.error('[cr-post-analysis] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── GET: Fetch existing analysis ────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const cr_id = searchParams.get('cr_id')
    const supabase = getSupabase()

    let query = supabase
      .from('cr_post_analysis')
      .select('*, change_requests(cr_number, title, category, risk_level, status)')
      .order('generated_at', { ascending: false })
      .limit(50)

    if (cr_id) query = query.eq('cr_id', cr_id)

    const { data } = await query
    return NextResponse.json({ success: true, analyses: data || [] })

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

