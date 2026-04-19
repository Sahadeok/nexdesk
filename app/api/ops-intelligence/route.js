import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  generateSLAProposal, calculateClientHealth,
  generateShiftHandover, checkVendorHealth, generateVendorClaimDraft,
  getNextInterviewQuestion
} from '../../../lib/opsEngine'

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

    // P18: SLA Negotiator
    if (action === 'generate_sla') {
      const result = await generateSLAProposal(body.client_name || 'Default Client', body.industry || 'BFSI')
      return NextResponse.json({ success: true, proposal: result })
    }

    // P19: Client Health
    if (action === 'calculate_health') {
      const result = await calculateClientHealth()
      return NextResponse.json({ success: true, health: result })
    }

    // P20: AI Interview
    if (action === 'interview_next') {
      const result = await getNextInterviewQuestion(body.step || 1, body.answers || {}, body.context || {})
      return NextResponse.json({ success: true, question: result })
    }

    // P21: Shift Handover
    if (action === 'generate_handover') {
      const result = await generateShiftHandover(body.shift_from || 'morning', body.shift_to || 'evening')
      return NextResponse.json({ success: true, handover: result })
    }

    // P22: Vendor Health Check
    if (action === 'check_vendor') {
      const result = await checkVendorHealth(body.vendor_id)
      return NextResponse.json({ success: true, ...result })
    }

    // P22: Vendor Claim Draft
    if (action === 'vendor_claim') {
      const result = await generateVendorClaimDraft(body.vendor_id)
      return NextResponse.json({ success: true, claim: result })
    }

    // P22: Add Vendor
    if (action === 'add_vendor') {
      const supabase = getSupabase()
      const { data } = await supabase.from('vendor_sla_configs').insert({
        vendor_name: body.vendor_name,
        vendor_type: body.vendor_type || 'cloud',
        guaranteed_uptime_pct: body.guaranteed_uptime || 99.9,
        max_response_time_min: body.max_response_min || 60,
        health_check_url: body.health_check_url,
        is_active: true,
      }).select().single()
      return NextResponse.json({ success: true, vendor: data })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[ops-intelligence] POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const supabase = getSupabase()

    if (type === 'sla_proposals') {
      const { data } = await supabase.from('sla_proposals').select('*').order('created_at', { ascending: false })
      return NextResponse.json({ success: true, proposals: data || [] })
    }

    if (type === 'health_scores') {
      const { data } = await supabase.from('client_health_scores').select('*').order('overall_score', { ascending: false })
      return NextResponse.json({ success: true, scores: data || [] })
    }

    if (type === 'handovers') {
      const { data } = await supabase.from('shift_handovers').select('*').order('created_at', { ascending: false }).limit(20)
      return NextResponse.json({ success: true, handovers: data || [] })
    }

    if (type === 'vendors') {
      const { data } = await supabase.from('vendor_sla_configs').select('*').order('vendor_name')
      return NextResponse.json({ success: true, vendors: data || [] })
    }

    if (type === 'vendor_incidents') {
      const vendorId = searchParams.get('vendor_id')
      let query = supabase.from('vendor_incidents').select('*, vendor_sla_configs(vendor_name)').order('started_at', { ascending: false }).limit(50)
      if (vendorId) query = query.eq('vendor_id', vendorId)
      const { data } = await query
      return NextResponse.json({ success: true, incidents: data || [] })
    }

    if (type === 'stats') {
      const [slaR, healthR, hoR, vendorR, incR] = await Promise.all([
        supabase.from('sla_proposals').select('*', { count: 'exact', head: true }),
        supabase.from('client_health_scores').select('overall_score, churn_risk'),
        supabase.from('shift_handovers').select('*', { count: 'exact', head: true }),
        supabase.from('vendor_sla_configs').select('current_status, actual_uptime_pct, total_downtime_min'),
        supabase.from('vendor_incidents').select('*', { count: 'exact', head: true }),
      ])
      const healthScores = healthR.data || []
      const vendors = vendorR.data || []
      const avgHealth = healthScores.length ? Math.round(healthScores.reduce((s, h) => s + (h.overall_score || 0), 0) / healthScores.length) : 0
      const downVendors = vendors.filter(v => v.current_status === 'down').length
      const avgUptime = vendors.length ? parseFloat((vendors.reduce((s, v) => s + parseFloat(v.actual_uptime_pct || 100), 0) / vendors.length).toFixed(2)) : 100

      return NextResponse.json({
        success: true,
        stats: {
          sla_proposals: slaR.count || 0,
          health_score: avgHealth,
          churn_risk: healthScores[0]?.churn_risk || 'unknown',
          handovers: hoR.count || 0,
          vendors: vendors.length,
          vendors_down: downVendors,
          avg_uptime: avgUptime,
          total_vendor_incidents: incR.count || 0,
        }
      })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

