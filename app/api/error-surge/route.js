import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runAutonomousAgent } from '../../../lib/agent-engine'

// RLS is disabled on Phase 11 tables, anon key works
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { app_id, app_name, event } = body
    if (!event || !event.message) {
      return NextResponse.json({ success: false, reason: 'No valid event provided' })
    }

    const supabase = getSupabase()
    
    // Generate a simple signature for the error
    const rawSignature = `${event.event_type || 'error'}_${event.message.substring(0, 100)}`
    const error_signature = Buffer.from(rawSignature).toString('base64').substring(0, 50)

    // Check if surge tracker exists — use maybeSingle to avoid error on no match
    const { data: existing, error: lookupErr } = await supabase
      .from('error_surges')
      .select('*')
      .eq('app_id', app_id)
      .eq('error_signature', error_signature)
      .maybeSingle()

    if (lookupErr) {
      console.error('[error-surge] lookup error:', lookupErr.message)
    }

    if (existing) {
      const newCount = existing.event_count + 1
      let updateData = { event_count: newCount, last_seen_at: new Date().toISOString() }
      let newTicket = null

      // Check if threshold met (3+ events) and ticket not created
      if (newCount >= 3 && !existing.ticket_created) {
        // Count existing tickets
        const { count } = await supabase.from('tickets').select('*', { count: 'exact', head: true })
        const ticketNumber = `TKT-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`

        const { data: ticket, error: ticketErr } = await supabase.from('tickets').insert({
          ticket_number: ticketNumber,
          title: `🔥 [SURGE DETECTED] ${event.message.substring(0, 80)}`,
          description: `Error Surge Detected!\n\nApp: ${app_name}\nSignature: ${event.message}\nOccurrences: ${newCount} within a short period.\n\nAuto-escalated to L2 as a P0 Incident.`,
          priority: 'critical',
          status: 'open',
          category: 'infrastructure',
          assigned_team: 'L2',
          source: 'error_surge',
          ai_routing_reason: 'Auto-escalated: Surge threshold of 3+ identical errors exceeded.',
          created_at: new Date().toISOString(),
        }).select().single()

        if (ticketErr) {
          console.error('[error-surge] ticket insert error:', ticketErr.message, ticketErr.details, ticketErr.hint)
        }

        if (ticket) {
          updateData.ticket_created = true
          updateData.ticket_id = ticket.id
          newTicket = ticket
          
          // 🔥 ZERO-TOUCH: Trigger Autonomous Agent immediately
          runAutonomousAgent(ticket.id).catch(err => console.error('[error-surge] Agent trigger failed:', err))
        }
      }

      const { error: updateErr } = await supabase.from('error_surges').update(updateData).eq('id', existing.id)
      if (updateErr) console.error('[error-surge] update error:', updateErr.message)

      return NextResponse.json({ 
        success: true, 
        action: 'updated', 
        event_count: newCount,
        ticket_created: !!newTicket,
        ticket: newTicket,
        threshold_triggered: newCount >= 3 && !existing.ticket_created
      })

    } else {
      // First time seeing this error signature
      const { error: insertErr } = await supabase.from('error_surges').insert({
        app_id,
        app_name,
        error_signature,
        event_count: 1,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        ticket_created: false
      })

      if (insertErr) {
        console.error('[error-surge] insert error:', insertErr.message, insertErr.details)
        return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, action: 'inserted', event_count: 1 })
    }

  } catch (error) {
    console.error('[error-surge] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

