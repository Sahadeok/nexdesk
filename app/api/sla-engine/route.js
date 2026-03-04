import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET(request) {
  const results = { checked:0, warned:0, escalated:0, notified:0, errors:[] }

  try {
    const now = new Date()

    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('id, ticket_number, title, status, priority, assigned_team, escalated_to_l2, sla_resolve_due, created_by, created_at')
      .not('status', 'in', '("resolved","closed")')
      .not('sla_resolve_due', 'is', null)

    if (error) throw error
    results.checked = tickets?.length || 0

    for (const ticket of (tickets || [])) {
      try {
        const slaDeadline   = new Date(ticket.sla_resolve_due)
        const msUntilBreach = slaDeadline - now
        const hoursUntil    = msUntilBreach / (1000 * 60 * 60)
        const isBreached    = msUntilBreach < 0
        const isWarning     = hoursUntil > 0 && hoursUntil <= 1

        const team = ticket.assigned_team
        const agentRole = team === 'L1' ? 'L1_AGENT' : team === 'L2' ? 'L2_AGENT' : 'DEVELOPER'

        const { data: agents } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('role', agentRole)
          .eq('is_active', true)

        const { data: admins } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('role', ['ADMIN', 'IT_MANAGER'])
          .eq('is_active', true)

        const allRecipients = [...(agents || []), ...(admins || [])]

        if (isBreached) {
          // Auto escalate L1 → L2 if not already escalated
          if (team === 'L1' && !ticket.escalated_to_l2) {
            await supabase.from('tickets').update({
              assigned_team:     'L2',
              escalated_to_l2:   true,
              ai_routing_reason: `Auto-escalated by SLA engine: SLA breached at ${slaDeadline.toISOString()}`,
              updated_at:        now.toISOString(),
            }).eq('id', ticket.id)

            await supabase.from('ticket_history').insert({
              ticket_id:   ticket.id,
              action:      'auto_escalated',
              description: `SLA Engine: Ticket auto-escalated from L1 to L2 due to SLA breach`,
              created_at:  now.toISOString(),
            })

            results.escalated++
          }

          // Notify about breach
          for (const recipient of allRecipients) {
            const alreadyNotified = await checkRecentNotification(ticket.id, recipient.id, 'sla_breach', 60)
            if (!alreadyNotified) {
              await supabase.from('notifications').insert({
                user_id:   recipient.id,
                ticket_id: ticket.id,
                type:      'sla_breach',
                title:     `SLA Breached: ${ticket.ticket_number}`,
                message:   `"${ticket.title}" has breached its SLA. Team: ${team}. Priority: ${ticket.priority}.`,
              })
              results.notified++
            }
          }
        } else if (isWarning) {
          // Send 1hr warning
          for (const recipient of allRecipients) {
            const alreadyWarned = await checkRecentNotification(ticket.id, recipient.id, 'sla_warning', 55)
            if (!alreadyWarned) {
              await supabase.from('notifications').insert({
                user_id:   recipient.id,
                ticket_id: ticket.id,
                type:      'sla_warning',
                title:     `SLA Warning: ${ticket.ticket_number}`,
                message:   `"${ticket.title}" will breach SLA in ${Math.round(hoursUntil * 60)} minutes!`,
              })
              results.warned++
              results.notified++
            }
          }
        }

      } catch(ticketError) {
        results.errors.push({ ticket: ticket.ticket_number, error: ticketError.message })
      }
    }

  } catch(e) {
    return Response.json({ success:false, error: e.message }, { status:500 })
  }

  return Response.json({
    success:   true,
    timestamp: new Date().toISOString(),
    results,
    message:   `SLA Engine ran. Checked: ${results.checked}, Warned: ${results.warned}, Escalated: ${results.escalated}, Notified: ${results.notified}`
  })
}

export async function POST(request) {
  return GET(request)
}

async function checkRecentNotification(ticketId, userId, type, cooldownMinutes) {
  const since = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('ticket_id', ticketId)
    .eq('user_id',   userId)
    .eq('type',      type)
    .gte('created_at', since)
    .limit(1)
  return data && data.length > 0
}
