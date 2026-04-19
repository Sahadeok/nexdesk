import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role to bypass RLS — SUPER ADMIN only
function sb() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/[\r\n]/g, '')
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim().replace(/[\r\n]/g, '')
  return createClient(url, key)
}

// Safe query helper — never throws, returns empty array on error
async function safeQuery(supabase, table, select = '*', orderBy = null) {
  try {
    let query = supabase.from(table).select(select)
    if (orderBy) query = query.order(orderBy.col, { ascending: orderBy.asc ?? false })
    const { data, error } = await query
    if (error) {
      console.warn(`[super-admin] Query warning on ${table}:`, error.message)
      return []
    }
    return data || []
  } catch (e) {
    console.warn(`[super-admin] Query exception on ${table}:`, e.message)
    return []
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'all'
    const supabase = sb()

    if (type === 'all') {
      // Fetch ALL tenants (businesses) — gracefully handle errors
      const [tenants, profiles, tickets] = await Promise.all([
        safeQuery(supabase, 'tenants', '*', { col: 'created_at', asc: false }),
        safeQuery(supabase, 'profiles', 'id, tenant_id, role, created_at'),
        safeQuery(supabase, 'tickets', 'id, tenant_id, status, created_at')
      ])

      // Enrich tenants with stats
      const enriched = tenants.map(t => {
        const tenantUsers = profiles.filter(p => p.tenant_id === t.id)
        const tenantTickets = tickets.filter(tk => tk.tenant_id === t.id)
        const admins = tenantUsers.filter(u => u.role === 'ADMIN' || u.role === 'IT_MANAGER')
        const activeTickets = tenantTickets.filter(tk => tk.status === 'open' || tk.status === 'in_progress')
        const resolvedTickets = tenantTickets.filter(tk => tk.status === 'resolved' || tk.status === 'closed')

        return {
          ...t,
          total_users: tenantUsers.length,
          total_admins: admins.length,
          total_tickets: tenantTickets.length,
          active_tickets: activeTickets.length,
          resolved_tickets: resolvedTickets.length,
          resolution_rate: tenantTickets.length > 0 
            ? Math.round((resolvedTickets.length / tenantTickets.length) * 100) 
            : 0
        }
      })

      return NextResponse.json({ success: true, businesses: enriched })
    }

    if (type === 'summary') {
      // High-level stats for dashboard KPIs
      const [tenants, profiles, tickets] = await Promise.all([
        safeQuery(supabase, 'tenants', 'id, billing_plan, subscription_status, created_at'),
        safeQuery(supabase, 'profiles', 'id, tenant_id'),
        safeQuery(supabase, 'tickets', 'id, tenant_id, status')
      ])

      const activeTenants = tenants.filter(t => t.subscription_status === 'active')
      const trialTenants = tenants.filter(t => t.billing_plan === 'trial')
      const proTenants = tenants.filter(t => t.billing_plan === 'pro')
      const enterpriseTenants = tenants.filter(t => t.billing_plan === 'enterprise')

      // Calculate MRR estimate based on plans
      const PLAN_PRICES = { trial: 0, pro: 499, enterprise: 1499, growth: 999 }
      const mrr = activeTenants.reduce((sum, t) => sum + (PLAN_PRICES[t.billing_plan] || 0), 0)

      return NextResponse.json({
        success: true,
        summary: {
          total_businesses: tenants.length,
          active_businesses: activeTenants.length,
          trial_businesses: trialTenants.length,
          pro_businesses: proTenants.length,
          enterprise_businesses: enterpriseTenants.length,
          total_users: profiles.length,
          total_tickets: tickets.length,
          estimated_mrr: mrr,
          avg_users_per_tenant: tenants.length > 0 ? Math.round(profiles.length / tenants.length) : 0
        }
      })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (e) {
    console.error('[super-admin/businesses] GET:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { action, tenant_id } = body
    const supabase = sb()

    if (action === 'suspend') {
      const { error } = await supabase
        .from('tenants')
        .update({ subscription_status: 'suspended', plan_status: 'suspended' })
        .eq('id', tenant_id)
      if (error) throw error
      return NextResponse.json({ success: true, message: 'Business suspended' })
    }

    if (action === 'activate') {
      const { error } = await supabase
        .from('tenants')
        .update({ subscription_status: 'active', plan_status: 'active' })
        .eq('id', tenant_id)
      if (error) throw error
      return NextResponse.json({ success: true, message: 'Business activated' })
    }

    if (action === 'upgrade') {
      const { plan } = body
      const { error } = await supabase
        .from('tenants')
        .update({ billing_plan: plan })
        .eq('id', tenant_id)
      if (error) throw error
      return NextResponse.json({ success: true, message: `Business upgraded to ${plan}` })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[super-admin/businesses] POST:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
