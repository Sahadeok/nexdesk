import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function getSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { get: () => null } }
  )
}

export async function POST(req) {
  try {
    const body     = await req.json()
    const supabase = getSupabase()

    const {
      name, app_identifier, description,
      environment, url, tech_stack,
      contact_email, company, industry,
      team_size, integration, is_active,
    } = body

    if (!name || !app_identifier) {
      return NextResponse.json({ error: 'App name and identifier required' }, { status: 400 })
    }

    // Check if app_identifier already exists
    const { data: existing } = await supabase
      .from('app_registry')
      .select('id')
      .eq('app_identifier', app_identifier)
      .maybeSingle()

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('app_registry')
        .update({
          name, description, environment,
          url, tech_stack, contact_email,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('app_identifier', app_identifier)
        .select().single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, app: data, action: 'updated' })
    }

    // Insert new
    const { data, error } = await supabase
      .from('app_registry')
      .insert({
        name,
        app_identifier,
        description,
        environment:   environment || 'Production',
        url,
        tech_stack:    tech_stack || [],
        contact_email,
        is_active:     true,
        created_at:    new Date().toISOString(),
      })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, app: data, action: 'created' })

  } catch(e) {
    console.error('[register-app] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

