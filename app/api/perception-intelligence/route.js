import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  analyzeTicketMood, performCodeSurgery, neuralTranslate,
  calculateRevenueBlast, generateWarRoomSnapshot,
  buildTicketGenome, analyzeSessionRecording
} from '../../../lib/perceptionEngine'

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

    if (action === 'analyze_mood') {
      const result = await analyzeTicketMood(body.ticket_id)
      return NextResponse.json({ success: true, mood: result })
    }
    if (action === 'code_surgery') {
      const result = await performCodeSurgery(body.ticket_id, body.error_log, body.stack_trace, body.language, body.framework)
      return NextResponse.json({ success: true, surgery: result })
    }
    if (action === 'translate') {
      const result = await neuralTranslate(body.source_type || 'manual', body.source_id, body.text, body.languages || ['hi', 'ta', 'fr', 'ar'])
      return NextResponse.json({ success: true, translation: result })
    }
    if (action === 'revenue_blast') {
      const result = await calculateRevenueBlast(body.ticket_id, body.context || {})
      return NextResponse.json({ success: true, blast: result })
    }
    if (action === 'war_room') {
      const result = await generateWarRoomSnapshot()
      return NextResponse.json({ success: true, snapshot: result })
    }
    if (action === 'build_genome') {
      const result = await buildTicketGenome(body.ticket_id)
      return NextResponse.json({ success: true, genome: result })
    }
    if (action === 'analyze_session') {
      const result = await analyzeSessionRecording(body.session_token)
      return NextResponse.json({ success: true, session: result })
    }
    if (action === 'record_session') {
      const supabase = getSupabase()
      const token = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      const { data } = await supabase.from('session_recordings').insert({
        session_token: token,
        ticket_id: body.ticket_id || null,
        app_id: body.app_id || 'default',
        user_identifier: body.user_id || 'anonymous',
        started_at: new Date().toISOString(),
        events: body.events || [],
        duration_sec: body.duration_sec || 0,
      }).select().single()
      return NextResponse.json({ success: true, session: data })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[perception-intelligence] POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const supabase = getSupabase()

    if (type === 'moods') {
      const { data } = await supabase.from('ticket_mood_profiles')
        .select('*, tickets(ticket_number, title, priority)')
        .order('escalation_risk_pct', { ascending: false }).limit(30)
        .catch(() => ({ data: [] }))
      // fallback join if tickets FK not available
      const safeData = await supabase.from('ticket_mood_profiles')
        .select('*').order('escalation_risk_pct', { ascending: false }).limit(30)
      return NextResponse.json({ success: true, moods: safeData.data || [] })
    }
    if (type === 'surgeries') {
      const { data } = await supabase.from('code_surgery_sessions')
        .select('*').order('created_at', { ascending: false }).limit(20)
      return NextResponse.json({ success: true, surgeries: data || [] })
    }
    if (type === 'translations') {
      const { data } = await supabase.from('neural_translations')
        .select('*').order('created_at', { ascending: false }).limit(20)
      return NextResponse.json({ success: true, translations: data || [] })
    }
    if (type === 'revenue_blasts') {
      const { data } = await supabase.from('revenue_blast_profiles')
        .select('*').order('total_revenue_lost_inr', { ascending: false }).limit(20)
      return NextResponse.json({ success: true, blasts: data || [] })
    }
    if (type === 'war_room') {
      const { data } = await supabase.from('war_room_snapshots')
        .select('*').order('snapshot_at', { ascending: false }).limit(5)
      return NextResponse.json({ success: true, snapshots: data || [] })
    }
    if (type === 'genomes') {
      const { data } = await supabase.from('ticket_genomes')
        .select('*').order('created_at', { ascending: false }).limit(30)
      return NextResponse.json({ success: true, genomes: data || [] })
    }
    if (type === 'sessions') {
      const { data } = await supabase.from('session_recordings')
        .select('*').order('created_at', { ascending: false }).limit(20)
      return NextResponse.json({ success: true, sessions: data || [] })
    }
    if (type === 'tickets_list') {
      const { data } = await supabase.from('tickets')
        .select('id, ticket_number, title, priority, status')
        .order('created_at', { ascending: false }).limit(50)
      return NextResponse.json({ success: true, tickets: data || [] })
    }
    if (type === 'stats') {
      const [moodR, surgR, transR, blastR, warR, genR, sessR] = await Promise.all([
        supabase.from('ticket_mood_profiles').select('overall_sentiment, escalation_risk_pct, toxicity_risk'),
        supabase.from('code_surgery_sessions').select('confidence_pct'),
        supabase.from('neural_translations').select('*', { count: 'exact', head: true }),
        supabase.from('revenue_blast_profiles').select('total_revenue_lost_inr'),
        supabase.from('war_room_snapshots').select('overall_health_pct, critical_incidents').order('snapshot_at', { ascending: false }).limit(1),
        supabase.from('ticket_genomes').select('*', { count: 'exact', head: true }),
        supabase.from('session_recordings').select('rage_click_count'),
      ])
      const moods = moodR.data || []
      const surgeries = surgR.data || []
      const blasts = blastR.data || []
      const sessions = sessR.data || []
      const latestWR = (warR.data || [])[0]
      return NextResponse.json({
        success: true,
        stats: {
          distressed_tickets: moods.filter(m => ['critical_distress', 'frustrated'].includes(m.overall_sentiment)).length,
          avg_escalation_risk: moods.length ? Math.round(moods.reduce((s, m) => s + (m.escalation_risk_pct || 0), 0) / moods.length) : 0,
          code_surgeries: surgeries.length,
          avg_surgery_confidence: surgeries.length ? Math.round(surgeries.reduce((s, c) => s + (c.confidence_pct || 0), 0) / surgeries.length) : 0,
          translations: transR.count || 0,
          total_revenue_at_risk: blasts.reduce((s, b) => s + parseFloat(b.total_revenue_lost_inr || 0), 0),
          system_health: latestWR?.overall_health_pct || 100,
          critical_incidents: latestWR?.critical_incidents || 0,
          genomes_built: genR.count || 0,
          rage_clicks_detected: sessions.reduce((s, s2) => s + (s2.rage_click_count || 0), 0),
        }
      })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

