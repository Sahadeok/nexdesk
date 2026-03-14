import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { image_base64, media_type, ticket_id, timestamp } = await req.json()

    if (!image_base64) return NextResponse.json({ error: 'image_base64 required' }, { status: 400 })

    const prompt = `You are an expert IT support analyst for a mutual fund application. 
Analyze this screenshot and extract technical details to help the support agent.

The app includes: SIP investments, NAV tracking, KYC verification, payment processing, portfolio management.

Extract and return ONLY valid JSON (no markdown):
{
  "detected_error": "Exact error message visible in screenshot, or null",
  "detected_page": "Which page/screen is shown (e.g. SIP Dashboard, Payment Page, Login)",
  "detected_action": "What was the user trying to do",
  "error_type": "one of: payment_failure|kyc_error|auth_error|nav_error|ui_bug|network_error|server_error|no_error|unknown",
  "affected_component": "Specific component or API that seems broken",
  "severity": "low|medium|high|critical",
  "visible_error_code": "Any HTTP code or error code visible, or null",
  "agent_summary": "Plain English 2-line summary for the L1/L2 agent",
  "suggested_team": "L1|L2|DEVELOPER",
  "search_logs_for": "Key terms to search in server logs to find related errors"
}`

    // Call Claude Vision API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: media_type || 'image/png',
                data: image_base64,
              },
            },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })

    const data    = await response.json()
    const rawText = data.content?.[0]?.text || '{}'
    const clean   = rawText.replace(/```json|```/g, '').trim()
    const analysis = JSON.parse(clean)

    // If ticket_id provided, store in DB
    if (ticket_id) {
      const { createServerClient } = await import('@supabase/ssr')
      const { cookies } = await import('next/headers')
      const cookieStore = cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { cookies: { get: (n) => cookieStore.get(n)?.value } }
      )
      await supabase.from('screenshot_analysis').insert({
        ticket_id,
        detected_error:  analysis.detected_error,
        detected_page:   analysis.detected_page,
        detected_action: analysis.detected_action,
        ai_summary:      analysis.agent_summary,
        analyzed_at:     new Date().toISOString(),
      })

      // Also update ticket ai_routing_reason
      await supabase.from('tickets').update({
        ai_routing_reason: `Screenshot AI: ${analysis.agent_summary}`,
        assigned_team: analysis.suggested_team || undefined,
      }).eq('id', ticket_id)
    }

    return NextResponse.json({ success: true, analysis })
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
