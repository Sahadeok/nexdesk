import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { simulateSwarmA2AProtocol, scanDarkWebForDomain, assignSpatialCoordinates, runGhostUserAutomation } from '../../../lib/scifiEngine'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'trigger_swarm') {
      const res = await simulateSwarmA2AProtocol(body.issue || 'Client reported SSL error')
      return NextResponse.json({ success: true, swarm: res })
    }

    if (action === 'scan_dark_web') {
      const res = await scanDarkWebForDomain(body.domain || 'nexdesk.com')
      return NextResponse.json({ success: true, intel: res })
    }

    if (action === 'generate_ar_coords') {
      const res = await assignSpatialCoordinates(body.asset_tag)
      return NextResponse.json({ success: true, node: res })
    }

    if (action === 'run_ghost_qa') {
      const res = await runGhostUserAutomation(body.journey || 'Checkout Pipeline Validation')
      return NextResponse.json({ success: true, telemetry: res })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[scifi-supremacy] POST:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const supabase = sb()

    if (type === 'swarm') {
      const { data } = await supabase.from('swarm_matrix_logs').select('*').order('timestamp', { ascending: false }).limit(20)
      return NextResponse.json({ success: true, swarm: data || [] })
    }

    if (type === 'darkweb') {
      const { data } = await supabase.from('dark_web_intel').select('*').order('discovered_at', { ascending: false }).limit(10)
      return NextResponse.json({ success: true, intel: data || [] })
    }

    if (type === 'ar_nodes') {
      const { data } = await supabase.from('ar_spatial_nodes').select('*').order('created_at', { ascending: false }).limit(10)
      return NextResponse.json({ success: true, nodes: data || [] })
    }

    if (type === 'ghost') {
      const { data } = await supabase.from('ghost_user_telemetry').select('*').order('run_at', { ascending: false }).limit(10)
      return NextResponse.json({ success: true, telemetry: data || [] })
    }

    if (type === 'stats') {
      const [sw, intel, n, gh] = await Promise.all([
        supabase.from('swarm_matrix_logs').select('id', { count: 'exact', head: true }),
        supabase.from('dark_web_intel').select('threat_type').eq('threat_severity', 'critical'),
        supabase.from('ar_spatial_nodes').select('spatial_status'),
        supabase.from('ghost_user_telemetry').select('journey_status')
      ])

      const dw = intel.data || []
      const nodes = n.data || []
      const ghosts = gh.data || []

      return NextResponse.json({
        success: true,
        stats: {
          swarm_messages_passed: sw.count || 0,
          zero_day_threats_blocked: dw.length,
          ar_nodes_mapped: nodes.length,
          red_nodes: nodes.filter(x => x.spatial_status === 'red').length,
          ghost_sessions_ran: ghosts.length,
          ghost_bugs_found: ghosts.filter(x => x.journey_status === 'failed').length
        }
      })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

