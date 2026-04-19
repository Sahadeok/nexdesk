import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { startDeployment, updateDeploymentMetrics } from '../../../lib/crEngine'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// ── POST: Start deployment for a CR ─────────────────────────────────
export async function POST(req) {
  try {
    const { cr_id } = await req.json()
    if (!cr_id) return NextResponse.json({ error: 'cr_id required' }, { status: 400 })

    const deployment = await startDeployment(cr_id)

    return NextResponse.json({
      success: true,
      deployment,
    })

  } catch (e) {
    console.error('[cr-deploy] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── PATCH: Update deployment metrics (live monitoring) ──────────────
export async function PATCH(req) {
  try {
    const body = await req.json()
    const { deployment_id, ...metrics } = body
    if (!deployment_id) return NextResponse.json({ error: 'deployment_id required' }, { status: 400 })

    const result = await updateDeploymentMetrics(deployment_id, metrics)

    return NextResponse.json({
      success: true,
      auto_rollback: result.shouldRollback,
      result,
    })

  } catch (e) {
    console.error('[cr-deploy] PATCH error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── GET: Get deployment history ─────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const cr_id = searchParams.get('cr_id')
    const supabase = getSupabase()

    let query = supabase
      .from('cr_deployments')
      .select('*, change_requests(cr_number, title, risk_level)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (cr_id) query = query.eq('cr_id', cr_id)

    const { data } = await query
    return NextResponse.json({ success: true, deployments: data || [] })

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

