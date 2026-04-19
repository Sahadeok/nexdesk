import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  generateAutoImprovements, runCodeQualityScan, analyzeTicketJourney,
  detectTechDebt, calculateErrorCost
} from '../../../lib/engineeringEngine'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { action } = body
    if (action === 'generate_improvements') {
      const r = await generateAutoImprovements()
      return NextResponse.json({ success: true, improvements: r })
    }
    if (action === 'run_code_scan') {
      const r = await runCodeQualityScan()
      return NextResponse.json({ success: true, scan: r })
    }
    if (action === 'analyze_journey') {
      const r = await analyzeTicketJourney(body.ticket_id)
      return NextResponse.json({ success: true, journey: r })
    }
    if (action === 'detect_debt') {
      const r = await detectTechDebt()
      return NextResponse.json({ success: true, debt: r })
    }
    if (action === 'calculate_error_cost') {
      const r = await calculateErrorCost(body.error_signature, body.error_description || body.error_signature)
      return NextResponse.json({ success: true, cost: r })
    }
    if (action === 'update_improvement') {
      const { data } = await sb().from('auto_improvements').update({ status: body.status, accepted_by: body.accepted_by }).eq('id', body.id).select().single()
      return NextResponse.json({ success: true, improvement: data })
    }
    if (action === 'update_debt') {
      const { data } = await sb().from('tech_debt_items').update({ status: body.status, assigned_to: body.assigned_to }).eq('id', body.id).select().single()
      return NextResponse.json({ success: true, debt: data })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[engineering-intelligence] POST:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const supabase = sb()

    if (type === 'improvements') {
      const { data } = await supabase.from('auto_improvements').select('*').order('priority_score', { ascending: false })
      return NextResponse.json({ success: true, improvements: data || [] })
    }
    if (type === 'scans') {
      const { data } = await supabase.from('code_quality_scans').select('*').order('created_at', { ascending: false }).limit(10)
      return NextResponse.json({ success: true, scans: data || [] })
    }
    if (type === 'journeys') {
      const { data } = await supabase.from('ticket_journey_maps').select('*').order('created_at', { ascending: false }).limit(20)
      return NextResponse.json({ success: true, journeys: data || [] })
    }
    if (type === 'debts') {
      const { data } = await supabase.from('tech_debt_items').select('*').order('fix_priority_score', { ascending: false })
      return NextResponse.json({ success: true, debts: data || [] })
    }
    if (type === 'error_costs') {
      const { data } = await supabase.from('error_cost_analyses').select('*').order('true_total_cost_inr', { ascending: false })
      return NextResponse.json({ success: true, costs: data || [] })
    }
    if (type === 'tickets_list') {
      const { data } = await supabase.from('tickets').select('id, ticket_number, title, priority, status').order('created_at', { ascending: false }).limit(50)
      return NextResponse.json({ success: true, tickets: data || [] })
    }
    if (type === 'stats') {
      const [impR, scanR, jR, debtR, ecaR] = await Promise.all([
        supabase.from('auto_improvements').select('priority_score, roi_estimate_inr, status'),
        supabase.from('code_quality_scans').select('code_health_score, total_issues, critical_issues').order('created_at', { ascending: false }).limit(1),
        supabase.from('ticket_journey_maps').select('ai_efficiency_score, idle_pct'),
        supabase.from('tech_debt_items').select('total_debt_cost_inr, debt_severity').eq('status', 'identified'),
        supabase.from('error_cost_analyses').select('true_total_cost_inr'),
      ])
      const imps = impR.data || []
      const latestScan = (scanR.data||[])[0]
      const journeys = jR.data || []
      const debts = debtR.data || []
      const ecas = ecaR.data || []
      return NextResponse.json({
        success: true,
        stats: {
          improvements_pending: imps.filter(i => i.status === 'pending').length,
          total_roi_opportunity: imps.reduce((s,i) => s + parseFloat(i.roi_estimate_inr||0), 0),
          code_health_score: latestScan?.code_health_score || 0,
          critical_issues: latestScan?.critical_issues || 0,
          avg_journey_efficiency: journeys.length ? Math.round(journeys.reduce((s,j) => s + (j.ai_efficiency_score||0), 0)/journeys.length) : 0,
          avg_idle_pct: journeys.length ? Math.round(journeys.reduce((s,j) => s + parseFloat(j.idle_pct||0), 0)/journeys.length) : 0,
          total_tech_debt_inr: debts.reduce((s,d) => s + parseFloat(d.total_debt_cost_inr||0), 0),
          critical_debt_count: debts.filter(d => d.debt_severity === 'critical').length,
          total_error_cost_inr: ecas.reduce((s,e) => s + parseFloat(e.true_total_cost_inr||0), 0),
          error_analyses: ecas.length,
        }
      })
    }
    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

