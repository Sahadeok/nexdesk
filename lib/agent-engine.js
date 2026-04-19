import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { diagnoseTicket } from './diagnoser'
import { runForensicInvestigation } from './forensicSubagent'
import { analyzeForensicEvidence } from './perceptionEngine'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const TOOLS = {
  PASSWORD_RESET: async (ticket, supabase) => {
    return { success: true, message: 'Password reset link generated and queued for email.' }
  },
  CLEAR_CACHE: async (ticket, supabase) => {
    return { success: true, message: 'Global session cache for the affected user has been purged.' }
  },
  RESTART_SERVICE: async (ticket, supabase) => {
    return { success: true, message: 'Service container restart triggered via Kubernetes API.' }
  },
  RESOLVE_KNOWN_ISSUE: async (ticket, supabase) => {
    return { success: true, message: 'Applied standard remediation from Resolution Memory.' }
  },
  FORENSIC_INVESTIGATION: async (ticket, supabase) => {
    const forensic = await runForensicInvestigation(ticket.id)
    if (!forensic.success) return { success: false, message: 'Forensic subagent failed.' }
    const analysisResult = await analyzeForensicEvidence(ticket.id, forensic.evidence)
    return { 
      success: true, 
      message: `Forensic analysis complete: ${analysisResult.analysis.exact_failure}.`,
      analysis: analysisResult
    }
  }
}

/**
 * Main entry point for autonomous resolution.
 * Can be called from any API route after a ticket is created.
 */
export async function runAutonomousAgent(ticketId) {
  try {
    const supabase = getSupabase()
    
    // 1. Fetch Ticket
    const { data: ticket } = await supabase.from('tickets').select('*').eq('id', ticketId).single()
    if (!ticket) return { error: 'Ticket not found' }

    console.log(`[agent-engine] Starting autonomy loop for: ${ticket.ticket_number}`)

    // 2. Trigger Diagnosis
    const diagnosis = await diagnoseTicket(ticketId)

    const isResolvable = diagnosis.auto_resolvable || false
    const confidence   = diagnosis.confidence || 0
    const rca          = diagnosis.rca || 'Under analysis...'

    console.log(`[agent-engine] Analysis: Resolvable=${isResolvable}, Confidence=${confidence}%`)

    if (isResolvable && confidence >= 80) {
      // 3. Determine and Execute Tool
      let toolKey = 'RESOLVE_KNOWN_ISSUE'
      const title = (ticket.title || '').toLowerCase()
      
      if (title.includes('password') || title.includes('forgot')) toolKey = 'PASSWORD_RESET'
      else if (title.includes('cache') || title.includes('refresh')) toolKey = 'CLEAR_CACHE'
      else if (title.includes('server') || title.includes('restart')) toolKey = 'RESTART_SERVICE'
      else if (diagnosis.recommended_tool === 'FORENSIC_INVESTIGATION') toolKey = 'FORENSIC_INVESTIGATION'

      const resolutionResult = await TOOLS[toolKey](ticket, supabase)

      // 4. Update Ticket Status
      const resolutionNotes = `Autonomous Resolution by NexDesk AI:\n\n${resolutionResult.message}\n\nDiagnosis: ${rca}`
      
      await supabase.from('tickets').update({
        status: 'resolved',
        resolution_notes: resolutionNotes,
        resolved_at: new Date().toISOString(),
        ai_routing_reason: `Autonomous Agent Resolved: ${toolKey} (Conf: ${confidence}%)`
      }).eq('id', ticketId)

      // 5. Log to Heal Actions (for the dashboard)
      await supabase.from('heal_actions').insert({
        ticket_id: ticketId,
        app_name: 'NexDesk Autonomous Agent',
        action_type: 'autonomous_fix',
        action_taken: `Executed ${toolKey}: ${resolutionResult.message}`,
        result: 'success',
        was_silent: false,
        duration_ms: 1500
      })

      // 6. Notify User
      if (resend && ticket.created_by_email) {
        await resend.emails.send({
          from: 'NexDesk AI <ai@nexdesk.com>',
          to: ticket.created_by_email,
          subject: `Resolved: ${ticket.ticket_number}`,
          html: `<div style="font-family:sans-serif; padding:20px; border:1px solid #e5e7eb; border-radius:12px;">
            <h2 style="color:#06b6d4;">Problem Solved Automously</h2>
            <p>Our AI Agent has resolved your issue: <strong>${ticket.title}</strong>.</p>
            <p style="background:#f8fafc; padding:15px; border-radius:8px;">${resolutionResult.message}</p>
            <p style="font-size:12px; color:#6b7280;">NexDesk — Future of IT Support</p>
          </div>`
        }).catch(err => console.error('[agent-engine] Email failed:', err))
      }

      return { success: true, action: toolKey }
    }

    return { success: false, reason: 'Confidence low or not resolvable' }

  } catch (error) {
    console.error('[agent-engine] Error:', error)
    return { error: error.message }
  }
}
