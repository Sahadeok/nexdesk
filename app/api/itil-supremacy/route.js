import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { detectItilProblem, calculateBlastRadius, syncMobileFleetDevice, syncOnPremDeployment } from '../../../lib/itilEngine'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'detect_problem') {
      const { data: tickets } = await sb().from('tickets').select('id, title, priority').limit(5)
      const res = await detectItilProblem(tickets || [{ title: 'Switch down', priority: 'high' }])
      return NextResponse.json({ success: true, problem: res })
    }

    if (action === 'simulate_blast') {
      const res = await calculateBlastRadius(body.asset_tag || 'AST-10023')
      return NextResponse.json({ success: true, blast: res })
    }

    if (action === 'sync_mobile') {
      const res = await syncMobileFleetDevice(body.agent_id, body.os || 'iOS', body.version || 'v1.4.2')
      return NextResponse.json({ success: true, device: res })
    }

    if (action === 'sync_airgap') {
      const res = await syncOnPremDeployment(body.client_name || 'SBI Intra-DC', { status: 'GREEN', db_nodes: 3, latency: '4ms' })
      return NextResponse.json({ success: true, deployment: res })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[itil-supremacy] POST:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const supabase = sb()

    if (type === 'problems') {
      const { data } = await supabase.from('itil_problems').select('*').order('created_at', { ascending: false }).limit(10)
      return NextResponse.json({ success: true, problems: data || [] })
    }

    if (type === 'mobile_fleet') {
      const { data } = await supabase.from('mobile_fleet_devices').select('*, agent:profiles(full_name)').order('last_sync_at', { ascending: false }).limit(10)
      return NextResponse.json({ success: true, fleet: data || [] })
    }

    if (type === 'airgapped') {
      const { data } = await supabase.from('onprem_deployments').select('*').order('last_health_packet_date', { ascending: false }).limit(10)
      return NextResponse.json({ success: true, deployments: data || [] })
    }

    if (type === 'stats') {
      const [prob, fleet, prems] = await Promise.all([
        supabase.from('itil_problems').select('id, estimated_business_impact_inr'),
        supabase.from('mobile_fleet_devices').select('id'),
        supabase.from('onprem_deployments').select('id, node_count')
      ])

      const pb = prob.data || []
      const fl = fleet.data || []
      const pr = prems.data || []

      return NextResponse.json({
        success: true,
        stats: {
          total_master_problems: pb.length,
          total_problem_cost: pb.reduce((acc, p) => acc + parseFloat(p.estimated_business_impact_inr||0), 0),
          mobile_agents_enrolled: fl.length,
          airgap_clusters_managing: pr.length,
          total_onprem_nodes: pr.reduce((acc, p) => acc + (p.node_count||0), 0)
        }
      })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

