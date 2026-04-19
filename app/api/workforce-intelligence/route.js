import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  detectRecurringIssues, generateWorkloadSnapshot,
  translateResolution, generateShadowCoaching, predictStaffing
} from '../../../lib/workforceEngine'

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

    if (action === 'detect_recurring') {
      const result = await detectRecurringIssues()
      return NextResponse.json({ success: true, ...result })
    }
    if (action === 'workload_snapshot') {
      const result = await generateWorkloadSnapshot()
      return NextResponse.json({ success: true, snapshot: result })
    }
    if (action === 'translate_resolution') {
      const result = await translateResolution(body.ticket_id, body.resolution)
      return NextResponse.json({ success: true, translation: result })
    }
    if (action === 'shadow_coach') {
      const result = await generateShadowCoaching(body.agent_id, body.ticket_id)
      return NextResponse.json({ success: true, coaching: result })
    }
    if (action === 'predict_staffing') {
      const result = await predictStaffing(body.date || new Date().toISOString().split('T')[0])
      return NextResponse.json({ success: true, prediction: result })
    }
    if (action === 'update_recurring') {
      const supabase = getSupabase()
      const { id, ...updates } = body
      updates.updated_at = new Date().toISOString()
      const { data } = await supabase.from('recurring_issues').update(updates).eq('id', id).select().single()
      return NextResponse.json({ success: true, issue: data })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[workforce-intelligence] POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const supabase = getSupabase()

    if (type === 'recurring') {
      const status = searchParams.get('status')
      let query = supabase.from('recurring_issues').select('*').order('ai_priority_score', { ascending: false })
      if (status) query = query.eq('status', status)
      const { data } = await query
      return NextResponse.json({ success: true, issues: data || [] })
    }
    if (type === 'workload') {
      const { data } = await supabase.from('workload_snapshots')
        .select('*').order('created_at', { ascending: false }).limit(10)
      return NextResponse.json({ success: true, snapshots: data || [] })
    }
    if (type === 'translations') {
      const { data } = await supabase.from('plain_english_resolutions')
        .select('*').order('created_at', { ascending: false }).limit(30)
      return NextResponse.json({ success: true, translations: data || [] })
    }
    if (type === 'coaching') {
      const agentId = searchParams.get('agent_id')
      let query = supabase.from('shadow_coaching_sessions')
        .select('*').order('created_at', { ascending: false }).limit(30)
      if (agentId) query = query.eq('agent_id', agentId)
      const { data } = await query
      return NextResponse.json({ success: true, sessions: data || [] })
    }
    if (type === 'staffing') {
      const { data } = await supabase.from('staffing_predictions')
        .select('*').order('prediction_date', { ascending: false }).limit(14)
      return NextResponse.json({ success: true, predictions: data || [] })
    }
    if (type === 'stats') {
      const [recR, wlR, trR, coR, stR] = await Promise.all([
        supabase.from('recurring_issues').select('status, ai_priority_score'),
        supabase.from('workload_snapshots').select('avg_load_per_agent, total_agents').order('created_at', { ascending: false }).limit(1),
        supabase.from('plain_english_resolutions').select('*', { count: 'exact', head: true }),
        supabase.from('shadow_coaching_sessions').select('ai_quality_score'),
        supabase.from('staffing_predictions').select('*', { count: 'exact', head: true }),
      ])
      const rec = recR.data || []
      const openRec = rec.filter(r => r.status === 'open').length
      const avgQuality = (coR.data || []).length ? Math.round((coR.data || []).reduce((s, c) => s + (c.ai_quality_score || 0), 0) / (coR.data || []).length) : 0
      const wl = (wlR.data || [])[0]

      return NextResponse.json({
        success: true,
        stats: {
          recurring_open: openRec,
          recurring_total: rec.length,
          avg_agent_load: wl?.avg_load_per_agent || 0,
          total_agents: wl?.total_agents || 0,
          translations: trR.count || 0,
          avg_coaching_score: avgQuality,
          coaching_sessions: (coR.data || []).length,
          staffing_predictions: stR.count || 0,
        }
      })
    }

    // Fetch tickets and agents for coaching form
    if (type === 'agents') {
      const { data } = await supabase.from('profiles')
        .select('id, email, full_name, role')
        .in('role', ['L1_AGENT', 'L2_AGENT', 'DEVELOPER', 'IT_MANAGER', 'ADMIN'])
      return NextResponse.json({ success: true, agents: data || [] })
    }
    if (type === 'tickets_for_coaching') {
      const { data } = await supabase.from('tickets')
        .select('id, ticket_number, title, priority, status, assigned_to')
        .order('created_at', { ascending: false }).limit(50)
      return NextResponse.json({ success: true, tickets: data || [] })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

