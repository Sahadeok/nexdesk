import { NextResponse } from 'next/server'
import { detectFrameworks } from '../../../lib/frameworkDetector'
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

export async function POST(req) {
  try {
    const { ticket_id } = await req.json()
    if (!ticket_id) return NextResponse.json({ error: 'ticket_id required' }, { status: 400 })

    // ── DEBUG: log which keys are available ──
    const hasGroq      = !!process.env.GROQ_API_KEY
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY
    console.log('[diagnosis] GROQ_API_KEY present:', hasGroq)
    console.log('[diagnosis] ANTHROPIC_API_KEY present:', hasAnthropic)
    if (!hasGroq && !hasAnthropic) {
      return NextResponse.json({ error: 'No AI key found. Add GROQ_API_KEY to .env.local and restart server.' }, { status: 500 })
    }

    const supabase = getSupabase()

    // ── 1. FETCH TICKET DETAILS ──────────────────────────────────
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*, categories(name, code)')
      .eq('id', ticket_id)
      .single()

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    // ── 1B. LOOK UP APP REGISTRY (framework stack for this app source) ──
    let appStack = []
    let appInfo  = null
    if (ticket.source && ticket.source !== 'portal' && ticket.source !== 'cloudwatch') {
      const { data: app } = await supabase
        .from('app_registry')
        .select('name, tech_stack, environment, description')
        .eq('app_identifier', ticket.source)
        .maybeSingle()
      if (app) {
        appInfo  = app
        appStack = app.tech_stack || []
      }
    }

    // ── 1C. DETECT FRAMEWORKS FROM ERROR TEXT ─────────────────────
    const frameworkResult = detectFrameworks(
      ticket.title,
      ticket.description || '',
      appStack
    )

    const ticketTime = new Date(ticket.created_at)
    const from = new Date(ticketTime - 30 * 60 * 1000).toISOString()
    const to   = new Date(ticketTime + 10 * 60 * 1000).toISOString()

    // ── 2. FETCH SCREENSHOT ANALYSIS (if any) ────────────────────
    const { data: screenshotData } = await supabase
      .from('screenshot_analysis')
      .select('detected_error, detected_page, detected_action, ai_summary')
      .eq('ticket_id', ticket_id)
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // ── 3. FETCH SESSION ERRORS (around ticket time) ──────────────
    const { data: sessionErrors } = await supabase
      .from('session_events')
      .select('event_type, endpoint, status_code, duration_ms, error_msg, page, logged_at')
      .in('event_type', ['js_error', 'api_failure', 'api_error', 'network_fail'])
      .gte('logged_at', from)
      .lte('logged_at', to)
      .limit(25)

    // ── 4. FETCH HEALTH LOGS (same time window) ───────────────────
    const { data: healthLogs } = await supabase
      .from('health_logs')
      .select('type, service, url, status_code, response_time, error_msg, logged_at')
      .gte('logged_at', from)
      .lte('logged_at', to)
      .limit(15)

    // ── 5. CHECK PAST OCCURRENCES (same user) ─────────────────────
    const { data: sameUserTickets } = await supabase
      .from('tickets')
      .select('id, ticket_number, title, status, resolution_notes, created_at')
      .eq('created_by', ticket.created_by)
      .neq('id', ticket_id)
      .ilike('title', `%${ticket.title.split(' ').slice(0, 2).join('%')}%`)
      .order('created_at', { ascending: false })
      .limit(5)

    // ── 6. CHECK SIMILAR TICKETS (all users) ─────────────────────
    const titleWords = ticket.title.split(' ').filter(w => w.length > 3).slice(0, 3)
    let similarQuery = supabase
      .from('tickets')
      .select('id, ticket_number, title, status, resolution_notes, priority, created_at')
      .neq('id', ticket_id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (titleWords.length > 0) {
      similarQuery = similarQuery.ilike('title', `%${titleWords[0]}%`)
    }
    const { data: allSimilarTickets } = await similarQuery

    // Filter to resolved ones for best fix data
    const resolvedSimilar = (allSimilarTickets || [])
      .filter(t => t.status === 'resolved' && t.resolution_notes)
      .slice(0, 5)

    // ── 7. FETCH RESOLUTION MEMORY ────────────────────────────────
    const { data: memory } = await supabase
      .from('resolution_memory')
      .select('error_pattern, root_cause, fix_applied, resolution_time, success')
      .eq('success', true)
      .order('created_at', { ascending: false })
      .limit(15)

    // ── 8. COUNT PAST OCCURRENCES ────────────────────────────────
    const pastOccurrences = (allSimilarTickets || []).length
    const sameUserBefore  = (sameUserTickets || []).length > 0

    // ── 9. BUILD COMPREHENSIVE AI PROMPT ─────────────────────────
    const prompt = `You are a Senior IT Support AI Analyst with deep expertise in ALL major software frameworks and technologies. 
Perform a DEEP ROOT CAUSE ANALYSIS of the following support ticket and provide a comprehensive diagnosis report.
Use the detected framework context below to give PRECISE, FRAMEWORK-SPECIFIC solutions — not generic answers.

${frameworkResult.hasDetection ? `
═══════════════════════════════════════
DETECTED TECH STACK
═══════════════════════════════════════
Frameworks Detected : ${frameworkResult.names.join(', ')}
Categories          : ${frameworkResult.categories.join(', ')}
${appInfo ? `App Name : ${appInfo.name}
Environment : ${appInfo.environment}
App Description : ${appInfo.description || 'N/A'}` : ''}

FRAMEWORK-SPECIFIC KNOWLEDGE:
${frameworkResult.contexts}
═══════════════════════════════════════
` : '(No specific framework detected — providing general diagnosis)'}

═══════════════════════════════════════
TICKET INFORMATION
═══════════════════════════════════════
Ticket Number : ${ticket.ticket_number || 'N/A'}
Title         : ${ticket.title}
Description   : ${ticket.description || 'No description provided'}
Category      : ${ticket.categories?.name || ticket.category || 'Unknown'}
Priority      : ${ticket.priority}
Raised At     : ${ticket.created_at}
Source        : ${ticket.source || 'portal'}

${screenshotData ? `
═══════════════════════════════════════
SCREENSHOT ANALYSIS (AI Vision)
═══════════════════════════════════════
Page Detected  : ${screenshotData.detected_page || 'Unknown'}
Error Detected : ${screenshotData.detected_error || 'None'}
User Action    : ${screenshotData.detected_action || 'Unknown'}
AI Summary     : ${screenshotData.ai_summary || 'N/A'}
` : '(No screenshot provided)'}

${sessionErrors?.length > 0 ? `
═══════════════════════════════════════
SESSION / BROWSER / API ERRORS (±30 min window)
═══════════════════════════════════════
${sessionErrors.map(e => 
  `[${e.event_type?.toUpperCase()}] ${e.endpoint || e.page || 'unknown'} → HTTP ${e.status_code || 'N/A'} | ${e.duration_ms ? e.duration_ms + 'ms' : ''} | Error: ${e.error_msg || 'none'}`
).join('\n')}
` : '(No session errors captured in time window)'}

${healthLogs?.length > 0 ? `
═══════════════════════════════════════
INFRASTRUCTURE HEALTH LOGS (same window)
═══════════════════════════════════════
${healthLogs.map(l => 
  `[${l.type?.toUpperCase()}] ${l.service} → ${l.status_code || 'N/A'} | ${l.response_time ? l.response_time + 'ms' : ''} | ${l.error_msg || 'OK'}`
).join('\n')}
` : '(No infrastructure anomalies detected in time window)'}

${sameUserBefore ? `
═══════════════════════════════════════
SAME USER - PREVIOUS OCCURRENCES
═══════════════════════════════════════
${(sameUserTickets || []).map(t => 
  `[${t.ticket_number}] "${t.title}" | Status: ${t.status} | Fix: ${t.resolution_notes?.substring(0, 120) || 'No notes'}`
).join('\n')}
` : '(First occurrence for this user)'}

${resolvedSimilar.length > 0 ? `
═══════════════════════════════════════
SIMILAR RESOLVED TICKETS (ALL USERS)
═══════════════════════════════════════
${resolvedSimilar.map(t => 
  `[${t.ticket_number}] "${t.title}" | Priority: ${t.priority} | Fix: ${t.resolution_notes?.substring(0, 150) || 'No notes'}`
).join('\n')}
` : '(No similar resolved tickets found)'}

${memory?.length > 0 ? `
═══════════════════════════════════════
RESOLUTION MEMORY / KNOWN PATTERNS
═══════════════════════════════════════
${memory.map(m => 
  `Pattern: "${m.error_pattern}" → Cause: ${m.root_cause} → Fix: ${m.fix_applied} | Resolved in: ${m.resolution_time || 'N/A'} mins`
).join('\n')}
` : '(No matching patterns in resolution memory)'}

═══════════════════════════════════════
YOUR TASK
═══════════════════════════════════════
Based on ALL the above data, provide a COMPLETE diagnosis. Be specific to Indian mutual fund app context.
If data is limited, still give your BEST diagnosis based on what is available.

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "rca": "Detailed Root Cause Analysis — what exactly failed, why it failed, which system/layer was responsible. 3-5 sentences.",
  "root_cause": "1-sentence technical root cause summary",
  "resolution_steps": "STEP-BY-STEP fix:\n1. [First action]\n2. [Second action]\n3. [Third action]\n4. [Verify step]\n5. [Confirm with user]",
  "prevention_actions": "PREVENTION:\n1. [System-level prevention]\n2. [Monitoring to add]\n3. [Process improvement]",
  "screenshot_findings": "What the screenshot revealed (or 'No screenshot provided')",
  "summary_for_agent": "One plain-English line telling the L2 agent exactly what happened and what to do",
  "confidence": 85,
  "affected_layer": "frontend OR api OR backend OR database OR thirdparty OR unknown",
  "priority_recommendation": "keep OR escalate OR downgrade",
  "escalate_to": "L1 OR L2 OR DEVELOPER OR null",
  "is_recurring": true,
  "recurrence_note": "This issue appeared X times before. Pattern: ...",
  "auto_resolvable": false,
  "estimated_resolution_mins": 30,
  "similar_ticket_refs": ["TKT-2026-0001", "TKT-2026-0002"]
}`

    // ── 10. CALL AI ──────────────────────────────────────────────
    // Uses Groq (free) if available, falls back to Anthropic
    const groqKey      = process.env.GROQ_API_KEY
    const anthropicKey = process.env.ANTHROPIC_API_KEY

    if (!groqKey && !anthropicKey) {
      return NextResponse.json({ error: 'No AI API key configured. Add GROQ_API_KEY or ANTHROPIC_API_KEY to .env.local' }, { status: 500 })
    }

    let rawText = '{}'

    if (groqKey) {
      // ── GROQ (Free tier) ────────────────────────────────────────
      const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model:      'llama-3.3-70b-versatile',
          max_tokens: 1500,
          messages:   [{ role: 'user', content: prompt }],
          temperature: 0.3,
        }),
      })
      const aiData = await aiResponse.json()
      console.log('[groq] status:', aiResponse.status)
      console.log('[groq] response:', JSON.stringify(aiData).substring(0, 300))
      if (!aiResponse.ok) {
        return NextResponse.json({ error: `Groq API error: ${aiData.error?.message || aiResponse.status}` }, { status: 500 })
      }
      rawText = aiData.choices?.[0]?.message?.content || '{}'
      console.log('[groq] rawText preview:', rawText.substring(0, 200))

    } else {
      // ── ANTHROPIC (Paid) ────────────────────────────────────────
      const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages:   [{ role: 'user', content: prompt }],
        }),
      })
      const aiData = await aiResponse.json()
      rawText = aiData.content?.[0]?.text || '{}'
    }
    let diagnosis
    try {
      // Strip markdown code blocks (Groq wraps in ``` blocks)
      const clean = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim()
      diagnosis = JSON.parse(clean)
    } catch {
      // fallback if JSON parse fails
      diagnosis = {
        rca: 'AI analysis could not be parsed. Manual review required.',
        root_cause: ticket.title,
        resolution_steps: '1. Review ticket manually\n2. Contact user for more details',
        prevention_actions: '1. Add more logging\n2. Monitor this endpoint',
        screenshot_findings: screenshotData?.ai_summary || 'No screenshot',
        summary_for_agent: 'Manual review needed',
        confidence: 20,
        affected_layer: 'unknown',
        priority_recommendation: 'keep',
        escalate_to: null,
        is_recurring: false,
        auto_resolvable: false,
        estimated_resolution_mins: 60,
        similar_ticket_refs: [],
      }
    }

    // ── 11. STORE IN DB ───────────────────────────────────────────
    // Use insert, fallback to update if exists
    const { data: saved, error: saveErr } = await supabase
      .from('ticket_diagnosis')
      .upsert({
        ticket_id,
        // Core fields
        root_cause:             diagnosis.root_cause,
        rca:                    diagnosis.rca,
        resolution_steps:       diagnosis.resolution_steps,
        prevention_actions:     diagnosis.prevention_actions,
        screenshot_findings:    diagnosis.screenshot_findings,
        suggested_fix:          diagnosis.resolution_steps, // backward compat
        summary_for_agent:      diagnosis.summary_for_agent,
        // Scores
        confidence:             diagnosis.confidence || 0,
        affected_layer:         diagnosis.affected_layer,
        priority_recommendation: diagnosis.priority_recommendation,
        escalate_to:            diagnosis.escalate_to,
        // Context
        similar_tickets: [
          ...(resolvedSimilar || []).map(t => ({
            id: t.id, number: t.ticket_number, title: t.title,
            fix: t.resolution_notes?.substring(0, 150),
          })),
        ],
        session_errors_found:   sessionErrors || [],
        health_issues_found:    healthLogs?.filter(l => l.error_msg) || [],
        past_occurrences:       pastOccurrences,
        same_user_before:       sameUserBefore,
        auto_resolved:          false,
        reanalyzed_at:          new Date().toISOString(),
        detected_frameworks:    frameworkResult.names || [],
      }, { onConflict: 'ticket_id', ignoreDuplicates: false })
      .select()
      .single()

    if (saveErr) {
      console.error('[ticket-diagnosis] upsert error:', saveErr)
      // Continue even if save fails — return the diagnosis
    }

    // ── 12. UPDATE TICKET WITH AI ROUTING ────────────────────────
    const updateData = {
      ai_routing_reason: `AI (${diagnosis.confidence}% confidence): ${diagnosis.summary_for_agent}`,
    }
    if (diagnosis.escalate_to && ['L1','L2','DEVELOPER'].includes(diagnosis.escalate_to)) {
      updateData.assigned_team = diagnosis.escalate_to
    }
    await supabase.from('tickets').update(updateData).eq('id', ticket_id)

    // ── 13. SAVE TO RESOLUTION MEMORY IF HIGH CONFIDENCE ─────────
    // (only if similar resolved tickets found — we know what worked)
    if (diagnosis.confidence >= 80 && resolvedSimilar.length > 0) {
      await supabase.from('resolution_memory').upsert({
        error_pattern:  ticket.title.substring(0, 200),
        root_cause:     diagnosis.root_cause,
        fix_applied:    diagnosis.resolution_steps?.substring(0, 500),
        resolution_time: diagnosis.estimated_resolution_mins || null,
        success:        true,
        ticket_id,
        created_at:     new Date().toISOString(),
      }, { onConflict: 'error_pattern' })
    }

    return NextResponse.json({
      success: true,
      diagnosis: saved,
      raw: diagnosis,
      context: {
        session_errors: sessionErrors?.length || 0,
        health_issues:  healthLogs?.length || 0,
        past_occurrences: pastOccurrences,
        similar_resolved: resolvedSimilar.length,
        screenshot_analyzed: !!screenshotData,
        frameworks_detected: frameworkResult.names,
        app_info: appInfo,
      }
    })

  } catch(e) {
    console.error('[ticket-diagnosis] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
