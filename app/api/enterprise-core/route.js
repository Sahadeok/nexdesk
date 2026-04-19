import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseIncomingEmail, testSsoConnection, triggerAutomation, createAutomationRecipe, linkAssetToTicket, createMockAsset } from '../../../lib/enterpriseEngine'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'parse_email') {
      const { email, subject, body: emailBody } = body
      const res = await parseIncomingEmail(email || 'ceo@acme.com', subject || 'Server is burning', emailBody || 'The firewall is blocking all traffic and smoke is coming out.')
      return NextResponse.json({ success: true, parsed: res })
    }

    if (action === 'test_sso') {
      const res = await testSsoConnection(body.provider || 'Okta', body.protocol || 'SAML 2.0')
      return NextResponse.json({ success: true, sso: res })
    }

    if (action === 'create_automation') {
      const res = await createAutomationRecipe(body.name, body.trigger_event, body.conditions, body.actions)
      return NextResponse.json({ success: true, recipe: res })
    }

    if (action === 'link_asset') {
      const res = await linkAssetToTicket(body.asset_tag, body.ticket_id)
      return NextResponse.json({ success: !res.error, asset: res })
    }

    if (action === 'create_asset') {
      const res = await createMockAsset(body.name || 'Lenovo ThinkPad X1', body.type || 'hardware', body.cost || 200000)
      return NextResponse.json({ success: true, asset: res })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[enterprise-core] POST:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const supabase = sb()

    if (type === 'emails') {
      const { data } = await supabase.from('email_ingestion_logs').select('*').order('received_at', { ascending: false }).limit(10)
      return NextResponse.json({ success: true, emails: data || [] })
    }
    
    if (type === 'sso') {
      const { data } = await supabase.from('sso_connections').select('*').order('provider_name', { ascending: true })
      return NextResponse.json({ success: true, sso: data || [] })
    }

    if (type === 'automations') {
      const { data } = await supabase.from('automation_recipes').select('*').order('created_at', { ascending: false }).limit(10)
      return NextResponse.json({ success: true, automations: data || [] })
    }

    if (type === 'assets') {
      const { data } = await supabase.from('asset_inventory').select('*').order('created_at', { ascending: false }).limit(15)
      return NextResponse.json({ success: true, assets: data || [] })
    }

    if (type === 'stats') {
      const [emailStat, ssoStat, autoStat, objStat] = await Promise.all([
        supabase.from('email_ingestion_logs').select('id, ai_accuracy_score'),
        supabase.from('sso_connections').select('is_active'),
        supabase.from('automation_recipes').select('times_triggered'),
        supabase.from('asset_inventory').select('id, health_score, annual_cost_inr')
      ])
      
      const eml = emailStat.data || []
      const ast = objStat.data || []
      
      return NextResponse.json({
        success: true,
        stats: {
          total_emails_parsed: eml.length,
          avg_nlp_accuracy: eml.length ? Math.round(eml.reduce((a,b)=>a+b.ai_accuracy_score,0)/eml.length) : 0,
          active_sso_connections: (ssoStat.data || []).filter(s => s.is_active).length,
          total_automations_run: (autoStat.data || []).reduce((a,b)=>a+(b.times_triggered || 0), 0),
          total_assets: ast.length,
          assets_at_risk: ast.filter(a => a.health_score < 50).length,
          total_asset_value: ast.reduce((a,b)=>a+parseFloat(b.annual_cost_inr||0), 0)
        }
      })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

