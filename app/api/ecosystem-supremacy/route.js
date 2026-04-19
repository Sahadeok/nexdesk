import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  rankExperts, detectAgentBurnout, detectKnowledgeGap, syncIntegration, generateSmartNotification
} from '../../../lib/ecosystemEngine'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'find_expert') {
      const r = await rankExperts(body.ticket_description || 'Need help with unexpected database table locks')
      return NextResponse.json({ success: true, expert: r })
    }
    if (action === 'scan_burnout') {
      const r = await detectAgentBurnout(body.agent_id)
      return NextResponse.json({ success: true, scan: r })
    }
    if (action === 'detect_gap') {
      const r = await detectKnowledgeGap()
      return NextResponse.json({ success: true, gap: r })
    }
    if (action === 'sync_integration') {
      const r = await syncIntegration(body.provider || 'jira')
      return NextResponse.json({ success: true, integration: r })
    }
    if (action === 'smart_notify') {
      const r = await generateSmartNotification(body.user_id, body.event_context || 'System alerts threshold exceeded')
      return NextResponse.json({ success: true, notification: r })
    }
    
    // Status updates
    if (action === 'update_burnout') {
      const { data } = await sb().from('agent_burnout_scans').update({ intervention_applied: true }).eq('id', body.id).select().single()
      return NextResponse.json({ success: true, scan: data })
    }
    if (action === 'update_gap') {
      const { data } = await sb().from('knowledge_gap_reports').update({ status: body.status }).eq('id', body.id).select().single()
      return NextResponse.json({ success: true, gap: data })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[ecosystem-supremacy] POST:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const supabase = sb()

    if (type === 'experts') {
      const { data } = await supabase.from('expert_profiles').select('*').order('expert_score', { ascending: false })
      return NextResponse.json({ success: true, experts: data || [] })
    }
    if (type === 'burnout') {
      const { data } = await supabase.from('agent_burnout_scans').select('*').order('created_at', { ascending: false }).limit(10)
      return NextResponse.json({ success: true, scans: data || [] })
    }
    if (type === 'knowledge_gaps') {
      const { data } = await supabase.from('knowledge_gap_reports').select('*').order('cost_of_gap_inr', { ascending: false })
      return NextResponse.json({ success: true, gaps: data || [] })
    }
    if (type === 'integrations') {
      const { data } = await supabase.from('uniconnect_integrations').select('*').order('provider', { ascending: true })
      return NextResponse.json({ success: true, integrations: data || [] })
    }
    if (type === 'notifications') {
      const { data } = await supabase.from('smart_notifications').select('*, target:profiles(full_name)').order('created_at', { ascending: false }).limit(20)
      return NextResponse.json({ success: true, notifications: data || [] })
    }
    if (type === 'agents_list') {
      const { data } = await supabase.from('profiles').select('id, full_name, email, role').in('role', ['L1_AGENT', 'L2_AGENT', 'IT_MANAGER']).order('full_name')
      return NextResponse.json({ success: true, agents: data || [] })
    }
    
    if (type === 'stats') {
      const [exp, brn, kg, int, notif] = await Promise.all([
        supabase.from('expert_profiles').select('id'),
        supabase.from('agent_burnout_scans').select('burnout_level').eq('intervention_applied', false),
        supabase.from('knowledge_gap_reports').select('cost_of_gap_inr').eq('status', 'identified'),
        supabase.from('uniconnect_integrations').select('connection_status'),
        supabase.from('smart_notifications').select('delivery_channel, urgency_score'),
      ])
      const bn = brn.data || []
      const kdata = kg.data || []
      return NextResponse.json({
        success: true,
        stats: {
          total_experts: (exp.data || []).length,
          critical_burnout: bn.filter(b => b.burnout_level === 'critical').length,
          high_burnout: bn.filter(b => b.burnout_level === 'high').length,
          total_gap_cost: kdata.reduce((s, k) => s + parseFloat(k.cost_of_gap_inr||0), 0),
          active_gaps: kdata.length,
          connected_apps: (int.data||[]).filter(i => i.connection_status === 'connected').length,
          notifications_sent: (notif.data||[]).length,
          high_urgency_alerts: (notif.data||[]).filter(n => n.urgency_score > 80).length
        }
      })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

