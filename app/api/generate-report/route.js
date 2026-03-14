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

const RTO_TARGETS = { critical: 60, high: 240, medium: 480, low: 1440 }

// RBI Incident Categories
function getRBICategory(priority, rtoMins) {
  if (priority === 'critical' || rtoMins > 240) return 'Category A — Major Incident'
  if (priority === 'high'     || rtoMins > 60)  return 'Category B — Significant Incident'
  return 'Category C — Minor Incident'
}

export async function POST(req) {
  try {
    const { report_type, period_from, period_to, generated_by } = await req.json()
    if (!report_type || !period_from || !period_to)
      return NextResponse.json({ error: 'report_type, period_from, period_to required' }, { status: 400 })

    const supabase = getSupabase()
    const fromISO  = new Date(period_from).toISOString()
    const toISO    = new Date(new Date(period_to).setHours(23,59,59)).toISOString()

    // ── Fetch tickets in period ────────────────────────────────
    const { data: tickets } = await supabase
      .from('tickets')
      .select('*, categories(name, code)')
      .gte('created_at', fromISO)
      .lte('created_at', toISO)
      .order('created_at', { ascending: false })

    const all       = tickets || []
    const resolved  = all.filter(t => ['resolved','closed'].includes(t.status))
    const critical  = all.filter(t => t.priority === 'critical')
    const high      = all.filter(t => t.priority === 'high')
    const slaBreached = all.filter(t => t.sla_breached)
    const unresolved  = all.filter(t => !['resolved','closed'].includes(t.status))

    // Fetch AI diagnoses for critical tickets
    const critIds = critical.map(t => t.id)
    let diagnoses = []
    if (critIds.length > 0) {
      const { data: d } = await supabase
        .from('ticket_diagnosis')
        .select('ticket_id, root_cause, rca, resolution_steps, prevention_actions, confidence')
        .in('ticket_id', critIds)
      diagnoses = d || []
    }
    const diagMap = Object.fromEntries(diagnoses.map(d => [d.ticket_id, d]))

    // Fetch audit trail summary
    const { data: auditLogs } = await supabase
      .from('audit_trail')
      .select('action_type, action_at, ticket_id, ticket_number')
      .gte('action_at', fromISO)
      .lte('action_at', toISO)
      .limit(500)

    // Build base stats
    const totalIncidents  = all.length
    const resolved30      = resolved.length
    const criticalCount   = critical.length
    const slaBreachCount  = slaBreached.length
    const slaCompliancePct= totalIncidents > 0 ? Math.round(((totalIncidents - slaBreachCount) / totalIncidents) * 100) : 100
    const avgRto          = resolved.filter(t => t.rto_minutes > 0).length > 0
      ? Math.round(resolved.filter(t => t.rto_minutes > 0).reduce((a,t) => a + t.rto_minutes, 0) / resolved.filter(t => t.rto_minutes > 0).length)
      : 0

    // Category breakdown
    const byPriority = {
      critical: critical.length,
      high:     high.length,
      medium:   all.filter(t => t.priority === 'medium').length,
      low:      all.filter(t => t.priority === 'low').length,
    }

    // Incident type breakdown
    const byCategory = {}
    all.forEach(t => {
      const cat = t.categories?.name || t.category || 'Uncategorized'
      byCategory[cat] = (byCategory[cat] || 0) + 1
    })

    // ── BUILD REPORT CONTENT BY TYPE ──────────────────────────
    let content = {}
    let reportTitle = ''

    if (report_type === 'rbi_incident') {
      reportTitle = `RBI IT Incident Report — ${period_from} to ${period_to}`
      content = {
        organization:     'XYZ Mutual Fund AMC',
        reporting_period: { from: period_from, to: period_to },
        submitted_to:     'Reserve Bank of India — Department of Information Technology',
        framework:        'RBI Master Direction on Information Technology (2021)',
        executive_summary: '',  // filled by AI below
        section_1_overview: {
          title: '1. Incident Overview',
          total_incidents:    totalIncidents,
          critical_incidents: criticalCount,
          high_incidents:     high.length,
          resolved_in_period: resolved30,
          unresolved:         unresolved.length,
          sla_compliance_pct: slaCompliancePct,
          sla_breaches:       slaBreachCount,
          avg_resolution_time_mins: avgRto,
        },
        section_2_classification: {
          title: '2. Incident Classification (RBI Framework)',
          category_a: all.filter(t => t.priority === 'critical').map(t => ({
            ticket:      t.ticket_number,
            title:       t.title,
            detected_at: t.created_at,
            resolved_at: t.resolved_at,
            rto_mins:    t.rto_minutes,
            category:    getRBICategory(t.priority, t.rto_minutes),
            status:      t.status,
            rca:         diagMap[t.id]?.root_cause || 'Pending RCA',
            fix:         diagMap[t.id]?.resolution_steps || 'Manual resolution',
            prevention:  diagMap[t.id]?.prevention_actions || 'Under review',
          })),
          category_b: high.map(t => ({
            ticket:      t.ticket_number,
            title:       t.title,
            detected_at: t.created_at,
            resolved_at: t.resolved_at,
            rto_mins:    t.rto_minutes,
            status:      t.status,
          })),
          by_priority:  byPriority,
          by_category:  byCategory,
        },
        section_3_sla: {
          title:              '3. SLA & RTO/RPO Compliance',
          sla_target_pct:     99,
          sla_achieved_pct:   slaCompliancePct,
          rto_targets:        RTO_TARGETS,
          avg_actual_rto:     avgRto,
          breached_tickets:   slaBreached.map(t => ({
            ticket:   t.ticket_number,
            title:    t.title,
            priority: t.priority,
            status:   t.status,
          })),
        },
        section_4_corrective: {
          title: '4. Corrective & Preventive Actions',
          actions_taken: critical.filter(t => diagMap[t.id]).map(t => ({
            ticket:     t.ticket_number,
            root_cause: diagMap[t.id]?.rca || diagMap[t.id]?.root_cause,
            fix_applied:diagMap[t.id]?.resolution_steps,
            prevention: diagMap[t.id]?.prevention_actions,
          })),
        },
        section_5_audit: {
          title:       '5. Audit Trail Summary',
          total_actions: (auditLogs || []).length,
          by_action_type: (auditLogs || []).reduce((acc, a) => {
            acc[a.action_type] = (acc[a.action_type] || 0) + 1
            return acc
          }, {}),
        },
      }
    }

    else if (report_type === 'sebi_cybersecurity') {
      reportTitle = `SEBI Cybersecurity Incident Report — Q${Math.ceil((new Date(period_from).getMonth()+1)/3)} FY${new Date(period_to).getFullYear()}`
      content = {
        organization:     'XYZ Mutual Fund AMC',
        reporting_period: { from: period_from, to: period_to },
        submitted_to:     'Securities and Exchange Board of India',
        framework:        'SEBI Circular: Cybersecurity and Cyber Resilience Framework (CSCRF)',
        executive_summary: '',
        section_1: {
          title:              '1. Cybersecurity Incident Summary',
          total_incidents:    totalIncidents,
          critical:           criticalCount,
          data_related:       all.filter(t => (t.title + (t.description||'')).toLowerCase().match(/data|breach|leak|access|unauthor/)).length,
          system_availability:all.filter(t => (t.title + (t.description||'')).toLowerCase().match(/down|outage|unavail|fail/)).length,
          phishing_fraud:     all.filter(t => (t.title + (t.description||'')).toLowerCase().match(/phish|fraud|scam|fake/)).length,
        },
        section_2: {
          title: '2. Incident Details — Critical & High',
          incidents: [...critical, ...high].slice(0, 20).map(t => ({
            ticket:      t.ticket_number,
            title:       t.title,
            date:        t.created_at?.split('T')[0],
            priority:    t.priority,
            status:      t.status,
            resolution:  t.resolution_notes || diagMap[t.id]?.resolution_steps || 'See AI diagnosis',
            rca:         diagMap[t.id]?.root_cause || 'See ticket notes',
          })),
        },
        section_3: {
          title:              '3. Preventive Measures Implemented',
          ai_predictions:     'NexDesk Predictive Engine monitors 5 critical services 24/7',
          auto_escalation:    'Critical tickets auto-escalated to L2/Developer within 15 mins',
          health_monitoring:  'BSE API, NSE API, Payment Gateway, KYC-CAMS, SMS Gateway monitored',
          measures:           diagnoses.filter(d => d.prevention_actions).map(d => d.prevention_actions).slice(0,5),
        },
        section_4: {
          title:             '4. SLA & Compliance Metrics',
          sla_compliance:    slaCompliancePct + '%',
          avg_resolution:    avgRto + ' minutes',
          incidents_by_type: byCategory,
          breaches:          slaBreachCount,
        },
      }
    }

    else if (report_type === 'internal_audit') {
      reportTitle = `Internal IT Audit Report — ${period_from} to ${period_to}`
      content = {
        period: { from: period_from, to: period_to },
        executive_summary: '',
        metrics: {
          total_tickets:      totalIncidents,
          resolved:           resolved30,
          unresolved:         unresolved.length,
          critical:           criticalCount,
          sla_breaches:       slaBreachCount,
          sla_compliance_pct: slaCompliancePct,
          avg_rto_mins:       avgRto,
          by_priority:        byPriority,
          by_category:        byCategory,
        },
        sla_breach_log: slaBreached.map(t => ({
          ticket:   t.ticket_number,
          title:    t.title,
          priority: t.priority,
          created:  t.created_at,
          status:   t.status,
        })),
        unresolved_log: unresolved.map(t => ({
          ticket:      t.ticket_number,
          title:       t.title,
          priority:    t.priority,
          created:     t.created_at,
          assigned_to: t.assigned_team,
          age_hours:   Math.round((new Date() - new Date(t.created_at)) / (1000 * 60 * 60)),
        })),
        audit_actions: (auditLogs || []).slice(0, 100),
      }
    }

    else if (report_type === 'sla_summary') {
      reportTitle = `SLA Compliance Summary — ${period_from} to ${period_to}`
      content = {
        period:             { from: period_from, to: period_to },
        executive_summary:  '',
        overall_sla_pct:    slaCompliancePct,
        total_tickets:      totalIncidents,
        sla_breaches:       slaBreachCount,
        avg_resolution_mins:avgRto,
        by_priority: Object.entries(byPriority).map(([priority, count]) => {
          const pTickets    = all.filter(t => t.priority === priority)
          const pResolved   = pTickets.filter(t => ['resolved','closed'].includes(t.status))
          const pBreached   = pTickets.filter(t => t.sla_breached).length
          const pAvgRto     = pResolved.filter(t => t.rto_minutes > 0).length > 0
            ? Math.round(pResolved.filter(t => t.rto_minutes > 0).reduce((a,t) => a + t.rto_minutes, 0) / pResolved.filter(t => t.rto_minutes > 0).length)
            : 0
          return {
            priority,
            total:      count,
            resolved:   pResolved.length,
            breached:   pBreached,
            sla_target: RTO_TARGETS[priority] || 480,
            avg_rto:    pAvgRto,
            compliance: count > 0 ? Math.round(((count - pBreached) / count) * 100) : 100,
          }
        }),
        breach_details: slaBreached.map(t => ({
          ticket:   t.ticket_number,
          title:    t.title,
          priority: t.priority,
          created:  t.created_at,
          resolved: t.resolved_at,
          rto_mins: t.rto_minutes,
          target:   RTO_TARGETS[t.priority] || 480,
          over_by:  t.rto_minutes ? Math.max(0, t.rto_minutes - (RTO_TARGETS[t.priority] || 480)) : 0,
        })),
      }
    }

    // ── AI Executive Summary ───────────────────────────────────
    const prompt = `You are a senior compliance officer writing for an Indian Mutual Fund AMC regulated by RBI and SEBI.
Write a professional executive summary for this ${report_type.replace(/_/g,' ').toUpperCase()} report.

REPORT DATA:
- Period: ${period_from} to ${period_to}
- Total Incidents: ${totalIncidents}
- Critical: ${criticalCount} | High: ${high.length}
- Resolved: ${resolved30} | Unresolved: ${unresolved.length}
- SLA Compliance: ${slaCompliancePct}%
- SLA Breaches: ${slaBreachCount}
- Avg Resolution Time: ${avgRto} minutes

Write a 3-4 sentence professional executive summary suitable for submission to ${report_type === 'sebi_cybersecurity' ? 'SEBI' : report_type === 'rbi_incident' ? 'RBI' : 'internal management'}.
Tone: formal, factual, regulatory-compliant.
Respond with ONLY the summary text, no preamble.`

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const aiData = await aiRes.json()
    const aiSummary = aiData.content?.[0]?.text || 'Executive summary generation pending.'

    // Inject AI summary
    content.executive_summary = aiSummary

    // ── Save report to DB ─────────────────────────────────────
    const complianceScore = Math.min(100, Math.round(slaCompliancePct * 0.4 + (resolved30 / Math.max(totalIncidents, 1) * 100) * 0.3 + (criticalCount === 0 ? 100 : (critResolved => (critResolved / criticalCount) * 100)(critical.filter(t => ['resolved','closed'].includes(t.status)).length)) * 0.3))

    const insertPayload = {
      report_type,
      report_title:    reportTitle,
      period_from,
      period_to,
      status:          'draft',
      content,
      ai_summary:      aiSummary,
      total_incidents: totalIncidents,
      critical_count:  criticalCount,
      sla_breaches:    slaBreachCount,
      compliance_score:complianceScore,
    }
    // Only add generated_by if provided (avoids FK issues)
    if (generated_by) insertPayload.generated_by = generated_by

    const { data: saved, error: insertErr } = await supabase
      .from('compliance_reports')
      .insert(insertPayload)
      .select()
      .single()

    if (insertErr) {
      console.error('[generate-report] insert error:', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, report: saved, content })
  } catch(e) {
    console.error('[generate-report] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET — list all reports
export async function GET() {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('compliance_reports')
      .select('id, report_type, report_title, period_from, period_to, status, total_incidents, critical_count, sla_breaches, compliance_score, ai_summary, created_at, generated_by')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) {
      console.error('[generate-report GET] error:', error)
      return NextResponse.json({ success: false, error: error.message, reports: [] })
    }
    return NextResponse.json({ success: true, reports: data || [] })
  } catch(e) {
    console.error('[generate-report GET] catch:', e)
    return NextResponse.json({ success: true, reports: [], error: e.message }, { status: 200 })
  }
}
