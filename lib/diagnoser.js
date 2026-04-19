import { createClient } from '@supabase/supabase-js'
import { detectFrameworks } from './frameworkDetector'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function diagnoseTicket(ticketId) {
  const supabase = getSupabase()
  
  // 1. Fetch Ticket
  const { data: ticket } = await supabase
    .from('tickets')
    .select('*, categories(name, code)')
    .eq('id', ticketId)
    .single()

  if (!ticket) throw new Error('Ticket not found')

  // 2. Check for Session Recording
  const { count: sessionCount } = await supabase.from('session_recordings')
    .select('id', { count: 'exact', head: true }).eq('ticket_id', ticketId)
    .catch(() => ({ count: 0 }))

  // 3. Framework Detection
  const frameworkResult = detectFrameworks(ticket.title, ticket.description || '', [])

  // 4. AI Analysis Prompt
  const prompt = `System: You are an Autonomous IT Support Agent.
Analyze this ticket and decide if it is auto-resolvable.
Ticket: ${ticket.title}
Description: ${ticket.description}
Frameworks: ${frameworkResult.names.join(', ')}
Has Session Evidence: ${sessionCount > 0 ? 'YES' : 'NO'}

Return JSON. If you need browser evidence choose FORENSIC_INVESTIGATION.
{
  "auto_resolvable": true,
  "confidence": 95,
  "rca": "string",
  "recommended_tool": "PASSWORD_RESET" | "CLEAR_CACHE" | "RESTART_SERVICE" | "RESOLVE_KNOWN_ISSUE" | "FORENSIC_INVESTIGATION"
}`

  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) throw new Error('GROQ_API_KEY missing')

  const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" }
    }),
  })

  const aiData = await aiResponse.json()
  const diagnosis = JSON.parse(aiData.choices[0].message.content)

  // 5. Update Database
  await supabase.from('ticket_diagnosis').upsert({
    ticket_id: ticketId,
    root_cause: diagnosis.rca,
    rca: diagnosis.rca,
    confidence: diagnosis.confidence,
    auto_resolved: diagnosis.auto_resolvable && diagnosis.confidence >= 80,
    reanalyzed_at: new Date().toISOString()
  })

  return diagnosis
}
