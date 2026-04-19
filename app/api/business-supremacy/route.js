import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  calculateROI, buildSupportDNA, analyzeVoiceInteraction,
  buildBusinessContext, analyzeProcessImpact
} from '../../../lib/businessSupremacyEngine'

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

    if (action === 'calculate_roi') {
      const r = await calculateROI(body.period_type || 'monthly')
      return NextResponse.json({ success: true, roi: r })
    }
    if (action === 'build_dna') {
      const r = await buildSupportDNA(body.entity_type || 'team', body.entity_id || null)
      return NextResponse.json({ success: true, dna: r })
    }
    if (action === 'analyze_voice') {
      const sessionId = body.session_id || `voice_${Date.now()}`
      const r = await analyzeVoiceInteraction(sessionId, body.transcript, body.duration_sec || 0, body.language || 'en')
      return NextResponse.json({ success: true, voice: r })
    }
    if (action === 'build_context') {
      const r = await buildBusinessContext(body.ticket_id)
      return NextResponse.json({ success: true, context: r })
    }
    if (action === 'analyze_impact') {
      const r = await analyzeProcessImpact(body.ticket_id, body.origin_system, body.severity || 'high')
      return NextResponse.json({ success: true, impact: r })
    }
    if (action === 'log_roi_event') {
      const supabase = getSupabase()
      const { data } = await supabase.from('roi_events').insert({
        event_type: body.event_type,
        ticket_id: body.ticket_id || null,
        value_inr: body.value_inr || 0,
        description: body.description || '',
        agent_minutes_saved: body.agent_minutes_saved || 0,
      }).select().single()
      return NextResponse.json({ success: true, event: data })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[business-supremacy] POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const supabase = getSupabase()

    if (type === 'roi_snapshots') {
      const { data } = await supabase.from('roi_snapshots').select('*').order('created_at', { ascending: false }).limit(12)
      return NextResponse.json({ success: true, snapshots: data || [] })
    }
    if (type === 'roi_events') {
      const { data } = await supabase.from('roi_events').select('*').order('created_at', { ascending: false }).limit(50)
      return NextResponse.json({ success: true, events: data || [] })
    }
    if (type === 'dna_profiles') {
      const { data } = await supabase.from('support_dna_profiles').select('*').order('created_at', { ascending: false }).limit(20)
      return NextResponse.json({ success: true, profiles: data || [] })
    }
    if (type === 'voice_interactions') {
      const { data } = await supabase.from('voice_interactions').select('*').order('created_at', { ascending: false }).limit(20)
      return NextResponse.json({ success: true, interactions: data || [] })
    }
    if (type === 'business_contexts') {
      const { data } = await supabase.from('business_contexts').select('*').order('business_risk_score', { ascending: false }).limit(20)
      return NextResponse.json({ success: true, contexts: data || [] })
    }
    if (type === 'process_impacts') {
      const { data } = await supabase.from('process_impact_maps').select('*').order('created_at', { ascending: false }).limit(20)
      return NextResponse.json({ success: true, impacts: data || [] })
    }
    if (type === 'tickets_list') {
      const { data } = await supabase.from('tickets').select('id, ticket_number, title, priority, status').order('created_at', { ascending: false }).limit(50)
      return NextResponse.json({ success: true, tickets: data || [] })
    }
    if (type === 'agents') {
      const { data } = await supabase.from('profiles').select('id, email, full_name, role').in('role', ['L1_AGENT', 'L2_AGENT', 'IT_MANAGER', 'DEVELOPER', 'ADMIN'])
      return NextResponse.json({ success: true, agents: data || [] })
    }
    if (type === 'stats') {
      const [roiR, dnaR, voiceR, ctxR, impR] = await Promise.all([
        supabase.from('roi_snapshots').select('total_roi_inr, roi_multiple, total_hard_savings_inr').order('created_at', { ascending: false }).limit(1),
        supabase.from('support_dna_profiles').select('overall_dna_score, dna_grade').order('created_at', { ascending: false }).limit(5),
        supabase.from('voice_interactions').select('ai_urgency_score, ai_sentiment'),
        supabase.from('business_contexts').select('business_risk_score, business_risk_level, risk_escalation_required'),
        supabase.from('process_impact_maps').select('total_impact_inr, total_processes_impacted'),
      ])
      const latestROI = (roiR.data || [])[0]
      const dnas = dnaR.data || []
      const voices = voiceR.data || []
      const ctxs = ctxR.data || []
      const impacts = impR.data || []
      return NextResponse.json({
        success: true,
        stats: {
          roi_multiple: latestROI?.roi_multiple || 0,
          total_roi_inr: latestROI?.total_roi_inr || 0,
          total_hard_savings: latestROI?.total_hard_savings_inr || 0,
          avg_dna_score: dnas.length ? Math.round(dnas.reduce((s, d) => s + (d.overall_dna_score || 0), 0) / dnas.length) : 0,
          voice_interactions: voices.length,
          avg_voice_urgency: voices.length ? Math.round(voices.reduce((s, v) => s + (v.ai_urgency_score || 0), 0) / voices.length) : 0,
          high_risk_tickets: ctxs.filter(c => ['critical', 'high'].includes(c.business_risk_level)).length,
          escalations_required: ctxs.filter(c => c.risk_escalation_required).length,
          total_process_impact_inr: impacts.reduce((s, i) => s + parseFloat(i.total_impact_inr || 0), 0),
          processes_impacted: impacts.reduce((s, i) => s + (i.total_processes_impacted || 0), 0),
        }
      })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

