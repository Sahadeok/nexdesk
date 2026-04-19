import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )
}

// GET — calculate & return live compliance score
export async function GET() {
  try {
    const supabase = getSupabase()
    const now      = new Date()
    const today    = now.toISOString().split('T')[0]
    const month30  = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
    const month90  = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString()

    // ── Fetch all tickets in last 30 days ──────────────────────
    const { data: tickets30 } = await supabase
      .from('tickets')
      .select('id, status, priority, created_at, resolved_at, sla_breached, resolution_notes, ai_routing_reason, assigned_team, ticket_number, rto_minutes')
      .gte('created_at', month30)

    const all      = tickets30 || []
    const total    = all.length
    const resolved = all.filter(t => ['resolved','closed'].includes(t.status))
    const critical = all.filter(t => t.priority === 'critical')
    const critResolved = critical.filter(t => ['resolved','closed'].includes(t.status))

    // ── 1. SLA Compliance ──────────────────────────────────────
    const slaBreached   = all.filter(t => t.sla_breached).length
    const slaCompliance = total > 0 ? ((total - slaBreached) / total * 100) : 100

    // ── 2. Documentation % ────────────────────────────────────
    // Tickets with resolution notes when resolved
    const resolvedWithNotes = resolved.filter(t => t.resolution_notes && t.resolution_notes.trim()).length
    const docPct = resolved.length > 0 ? (resolvedWithNotes / resolved.length * 100) : 100

    // ── 3. RTO Adherence ──────────────────────────────────────
    // RTO targets by priority (minutes)
    const RTO = { critical: 60, high: 240, medium: 480, low: 1440 }
    const resolvedWithRto = resolved.filter(t => t.rto_minutes && t.rto_minutes > 0)
    const rtoOk = resolvedWithRto.filter(t => {
      const target = RTO[t.priority] || 480
      return t.rto_minutes <= target
    }).length
    const rtoPct = resolvedWithRto.length > 0 ? (rtoOk / resolvedWithRto.length * 100) : 95

    // ── 4. Audit Trail % ─────────────────────────────────────
    // Tickets that have at least 1 audit trail entry
    const { data: auditCounts } = await supabase
      .from('audit_trail')
      .select('ticket_id')
      .gte('action_at', month30)
    const auditedIds  = new Set((auditCounts || []).map(a => a.ticket_id))
    const auditPct    = total > 0 ? (auditedIds.size / total * 100) : 100

    // ── 5. RCA Completion % ───────────────────────────────────
    // Critical + high tickets with AI diagnosis
    const critHigh   = all.filter(t => ['critical','high'].includes(t.priority))
    const { data: diagnosedIds } = await supabase
      .from('ticket_diagnosis')
      .select('ticket_id')
      .in('ticket_id', critHigh.map(t => t.id))
    const rcaDone = new Set((diagnosedIds || []).map(d => d.ticket_id))
    const rcaPct  = critHigh.length > 0 ? (rcaDone.size / critHigh.length * 100) : 100

    // ── 6. Critical Resolution % ──────────────────────────────
    const critResolvedPct = critical.length > 0 ? (critResolved.length / critical.length * 100) : 100

    // ── Calculate Overall Score ───────────────────────────────
    const weights = {
      sla:      0.25,  // 25%
      doc:      0.15,  // 15%
      rto:      0.20,  // 20%
      audit:    0.15,  // 15%
      rca:      0.15,  // 15%
      critical: 0.10,  // 10%
    }
    const overall = Math.round(
      slaCompliance  * weights.sla    +
      docPct         * weights.doc    +
      rtoPct         * weights.rto    +
      auditPct       * weights.audit  +
      rcaPct         * weights.rca    +
      critResolvedPct* weights.critical
    )

    const scoreData = {
      overall_score:         overall,
      sla_compliance_pct:    Math.round(slaCompliance * 100) / 100,
      documentation_pct:     Math.round(docPct        * 100) / 100,
      rto_adherence_pct:     Math.round(rtoPct        * 100) / 100,
      audit_trail_pct:       Math.round(auditPct      * 100) / 100,
      rca_completion_pct:    Math.round(rcaPct        * 100) / 100,
      critical_resolved_pct: Math.round(critResolvedPct * 100) / 100,
      open_critical:         critical.filter(t => !['resolved','closed'].includes(t.status)).length,
      sla_breaches_today:    slaBreached,
      tickets_without_rca:   critHigh.length - rcaDone.size,
    }

    // Save daily snapshot
    await supabase.from('compliance_scores').upsert({
      ...scoreData,
      score_date: today,
    }, { onConflict: 'score_date' })

    // Get 30-day score history
    const { data: history } = await supabase
      .from('compliance_scores')
      .select('score_date, overall_score, sla_compliance_pct, sla_breaches_today')
      .order('score_date', { ascending: false })
      .limit(30)

    // Recent audit trail
    const { data: recentAudit } = await supabase
      .from('audit_trail')
      .select('*, tickets(ticket_number, title)')
      .order('action_at', { ascending: false })
      .limit(10)

    // Open SLA breaches
    const { data: slaBreachTickets } = await supabase
      .from('tickets')
      .select('id, ticket_number, title, priority, status, created_at, assigned_team')
      .eq('sla_breached', true)
      .not('status', 'in', '("resolved","closed")')
      .order('created_at', { ascending: true })
      .limit(10)

    return NextResponse.json({
      success: true,
      score: scoreData,
      history: (history || []).reverse(),
      recent_audit: recentAudit || [],
      sla_breach_tickets: slaBreachTickets || [],
      period: { from: month30.split('T')[0], to: today, days: 30 },
    })
  } catch(e) {
    console.error('[compliance-score] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

