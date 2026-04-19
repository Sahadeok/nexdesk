import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { scanComplianceData, analyzeEcommerceVelocity } from '../../../lib/industryEngine'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'scan_compliance') {
      const r = await scanComplianceData(body.text, body.industry || 'bfsi')
      return NextResponse.json({ success: true, scan: r })
    }
    
    if (action === 'simulate_ecommerce_burst') {
      const r = await analyzeEcommerceVelocity(body.event_name, { tickets_per_minute: body.tpm || 100 })
      return NextResponse.json({ success: true, event: r })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[industry-supremacy] POST:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const supabase = sb()

    if (type === 'bfsi_scans') {
      const { data } = await supabase.from('industry_compliance_scans').select('*').eq('industry_pack', 'bfsi').order('scanned_at', { ascending: false }).limit(10)
      return NextResponse.json({ success: true, scans: data || [] })
    }
    
    if (type === 'healthcare_scans') {
      const { data } = await supabase.from('industry_compliance_scans').select('*').eq('industry_pack', 'healthcare').order('scanned_at', { ascending: false }).limit(10)
      return NextResponse.json({ success: true, scans: data || [] })
    }

    if (type === 'ecommerce_events') {
      const { data } = await supabase.from('ecommerce_velocity_events').select('*').order('recorded_at', { ascending: false }).limit(5)
      return NextResponse.json({ success: true, events: data || [] })
    }
    
    if (type === 'stats') {
      const [bfsi, health, ecom] = await Promise.all([
        supabase.from('industry_compliance_scans').select('violation_found').eq('industry_pack', 'bfsi'),
        supabase.from('industry_compliance_scans').select('violation_found').eq('industry_pack', 'healthcare'),
        supabase.from('ecommerce_velocity_events').select('lost_revenue_risk_inr, auto_refunds_processed'),
      ])
      
      const bData = bfsi.data || []
      const hData = health.data || []
      const eData = ecom.data || []
      
      return NextResponse.json({
        success: true,
        stats: {
          bfsi_violations_caught: bData.filter(b => b.violation_found).length,
          bfsi_total_scans: bData.length,
          health_violations_caught: hData.filter(h => h.violation_found).length,
          health_total_scans: hData.length,
          total_revenue_protected: eData.reduce((s, e) => s + parseFloat(e.lost_revenue_risk_inr || 0), 0),
          auto_refunds_processed: eData.reduce((s, e) => s + (e.auto_refunds_processed || 0), 0)
        }
      })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

