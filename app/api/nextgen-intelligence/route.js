import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  provisionClientPortal, refreshPortalCache,
  trainDigitalTwin, runTwinSimulation,
  declareIncident, addWarRoomUpdate, resolveIncident,
  generateCompetitorReport, executeCommand
} from '../../../lib/nextGenEngine'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'provision_portal') {
      const r = await provisionClientPortal(body.client_name, body.client_email)
      return NextResponse.json({ success: true, portal: r })
    }
    if (action === 'refresh_portal') {
      const r = await refreshPortalCache(body.portal_id)
      return NextResponse.json({ success: true, ...r })
    }
    if (action === 'train_twin') {
      const r = await trainDigitalTwin(body.agent_id)
      return NextResponse.json({ success: true, twin: r })
    }
    if (action === 'simulate_twin') {
      const r = await runTwinSimulation(body.twin_id, body.ticket_id)
      return NextResponse.json({ success: true, simulation: r })
    }
    if (action === 'declare_incident') {
      const r = await declareIncident(body.title, body.severity, body.ticket_id, body.commander)
      return NextResponse.json({ success: true, room: r })
    }
    if (action === 'add_update') {
      const r = await addWarRoomUpdate(body.room_id, body.author, body.message, body.type)
      return NextResponse.json({ success: true, room: r })
    }
    if (action === 'resolve_incident') {
      const r = await resolveIncident(body.room_id, body.root_cause)
      return NextResponse.json({ success: true, room: r })
    }
    if (action === 'generate_competitor_report') {
      const r = await generateCompetitorReport()
      return NextResponse.json({ success: true, report: r })
    }
    if (action === 'command') {
      const r = await executeCommand(body.user_id, body.input)
      return NextResponse.json({ success: true, result: r })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[nextgen-intelligence] POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const supabase = getSupabase()

    if (type === 'portals') {
      const { data } = await supabase.from('client_portal_configs').select('*').order('created_at', { ascending: false })
      return NextResponse.json({ success: true, portals: data || [] })
    }
    if (type === 'twins') {
      const { data } = await supabase.from('agent_digital_twins').select('*, profiles(email, full_name, role)').order('twin_accuracy_pct', { ascending: false })
      const safe = await supabase.from('agent_digital_twins').select('*').order('twin_accuracy_pct', { ascending: false })
      return NextResponse.json({ success: true, twins: safe.data || [] })
    }
    if (type === 'simulations') {
      const { data } = await supabase.from('twin_simulations').select('*').order('created_at', { ascending: false }).limit(20)
      return NextResponse.json({ success: true, simulations: data || [] })
    }
    if (type === 'war_rooms') {
      const { data } = await supabase.from('incident_war_rooms').select('*').order('created_at', { ascending: false }).limit(20)
      return NextResponse.json({ success: true, rooms: data || [] })
    }
    if (type === 'competitor_reports') {
      const { data } = await supabase.from('competitor_intelligence_reports').select('*').order('created_at', { ascending: false }).limit(10)
      return NextResponse.json({ success: true, reports: data || [] })
    }
    if (type === 'commands') {
      const { data } = await supabase.from('command_os_history').select('*').order('created_at', { ascending: false }).limit(30)
      return NextResponse.json({ success: true, commands: data || [] })
    }
    if (type === 'agents') {
      const { data } = await supabase.from('profiles').select('id, email, full_name, role').in('role', ['L1_AGENT', 'L2_AGENT', 'DEVELOPER', 'IT_MANAGER', 'ADMIN'])
      return NextResponse.json({ success: true, agents: data || [] })
    }
    if (type === 'tickets_list') {
      const { data } = await supabase.from('tickets').select('id, ticket_number, title, priority, status').order('created_at', { ascending: false }).limit(50)
      return NextResponse.json({ success: true, tickets: data || [] })
    }
    if (type === 'stats') {
      const [portalR, twinR, simR, warR, compR, cmdR] = await Promise.all([
        supabase.from('client_portal_configs').select('*', { count: 'exact', head: true }).eq('active', true),
        supabase.from('agent_digital_twins').select('twin_accuracy_pct'),
        supabase.from('twin_simulations').select('overall_accuracy_pct'),
        supabase.from('incident_war_rooms').select('status, duration_min'),
        supabase.from('competitor_intelligence_reports').select('competitive_score, rank_percentile').order('created_at', { ascending: false }).limit(1),
        supabase.from('command_os_history').select('*', { count: 'exact', head: true }),
      ])
      const twins = twinR.data || []
      const sims = simR.data || []
      const rooms = warR.data || []
      const latestComp = (compR.data || [])[0]
      return NextResponse.json({
        success: true,
        stats: {
          active_portals: portalR.count || 0,
          twins_trained: twins.length,
          avg_twin_accuracy: twins.length ? Math.round(twins.reduce((s, t) => s + (t.twin_accuracy_pct || 0), 0) / twins.length) : 0,
          simulations_run: sims.length,
          avg_sim_accuracy: sims.length ? Math.round(sims.reduce((s, t) => s + (t.overall_accuracy_pct || 0), 0) / sims.length) : 0,
          active_incidents: rooms.filter(r => r.status === 'active').length,
          resolved_incidents: rooms.filter(r => r.status === 'resolved').length,
          competitive_score: latestComp?.competitive_score || 0,
          rank_percentile: latestComp?.rank_percentile || 50,
          commands_run: cmdR.count || 0,
        }
      })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

