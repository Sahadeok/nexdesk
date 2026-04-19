import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function POST(req) {
  try {
    const { message, app_id, app_name, page, session_id, error_context, chat_history } = await req.json()
    const supabase = getSupabase()
    const groqKey  = process.env.GROQ_API_KEY

    if (!groqKey) return NextResponse.json({ error: 'GROQ_API_KEY not set' }, { status: 500 })

    // Check resolution memory for known fixes
    const { data: memory } = await supabase
      .from('resolution_memory')
      .select('error_pattern, fix_applied, root_cause')
      .limit(10)

    const memoryContext = memory?.length
      ? `Known fixes from past tickets:\n${memory.map(m => `- "${m.error_pattern}" → ${m.fix_applied?.substring(0,100)}`).join('\n')}`
      : ''

    const systemPrompt = `You are NexDesk AI Support — an intelligent in-app support assistant.
You help users solve technical issues instantly without them needing to raise a ticket.

App: ${app_name}
Page: ${page}

${error_context}
${memoryContext}

RULES:
- Give SHORT, actionable answers (2-4 sentences max)
- If you can solve it → solve it with exact steps
- If it needs human help → say so clearly
- Never ask for sensitive info (passwords, card numbers)
- Be conversational and friendly
- If issue is complex → suggest raising a ticket

Respond with JSON:
{
  "response": "Your helpful response here",
  "resolved": true/false,
  "needs_ticket": true/false,
  "quick_fix": "One line fix if available or null"
}`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(chat_history || []).slice(-4),
      { role: 'user', content: message },
    ]

    const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        max_tokens:  300,
        temperature: 0.3,
        messages,
      }),
    })

    const aiData  = await aiRes.json()
    const rawText = aiData.choices?.[0]?.message?.content || '{}'
    const clean   = rawText.replace(/^```(?:json)?\s*/i,'').replace(/\s*```\s*$/i,'').trim()

    let result = { response: 'I understand your issue. Let me help you.', resolved: false, needs_ticket: false }
    try { result = JSON.parse(clean) } catch(e) { result.response = rawText.substring(0, 200) }

    // Save widget session
    await supabase.from('widget_sessions').insert({
      app_id,
      app_name,
      session_id,
      page,
      issue_desc:  message,
      ai_response: result.response,
      resolved:    result.resolved,
      started_at:  new Date().toISOString(),
    })

    return NextResponse.json(result)

  } catch(e) {
    console.error('[widget-chat] error:', e)
    return NextResponse.json({
      response:     'I\'m having trouble connecting. Please try again or raise a ticket.',
      resolved:     false,
      needs_ticket: true,
    })
  }
}

