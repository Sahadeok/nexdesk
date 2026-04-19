import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * PHASE 31: NEXDESK FORENSIC SUBAGENT
 * Automatically reproduces issues by replaying user sessions in a headless browser.
 */
export async function runForensicInvestigation(ticketId) {
  const supabase = getSupabase()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'NexDesk-Forensic-Agent/1.0'
  })
  const page = await context.newPage()
  
  const evidence = {
    screenshots: [],
    logs: [],
    errors: [],
    network: [],
    domSnapshots: []
  }

  try {
    // 1. Fetch Ticket & Metadata
    const { data: ticket } = await supabase.from('tickets').select('*').eq('id', ticketId).single()
    if (!ticket) throw new Error('Ticket not found')

    console.log(`[forensic-agent] Investigating: ${ticket.ticket_number}`)

    // 2. Setup Listeners
    page.on('console', msg => evidence.logs.push({ type: msg.type(), text: msg.text() }))
    page.on('pageerror', err => evidence.errors.push({ message: err.message, stack: err.stack }))
    page.on('requestfailed', req => evidence.network.push({ url: req.url(), error: req.failure().errorText }))

    // 3. Navigate to App (Assuming localhost for dev/testing)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    await page.goto(appUrl)

    // 4. Check for Session Recording to Replay
    const { data: session } = await supabase.from('session_recordings')
      .select('*')
      .eq('ticket_id', ticketId)
      .single()

    if (session && session.events) {
      console.log(`[forensic-agent] Replaying ${session.events.length} user events...`)
      
      for (const event of session.events) {
        try {
          if (event.type === 'click' && event.selector) {
            await page.click(event.selector, { timeout: 2000 })
          } else if (event.type === 'input' && event.selector) {
            await page.fill(event.selector, event.value, { timeout: 2000 })
          }
          // Take snapshot after each major action if it's a high-priority ticket
          if (evidence.screenshots.length < 5) {
            const buffer = await page.screenshot()
            evidence.screenshots.push(buffer.toString('base64'))
          }
        } catch (e) {
          evidence.logs.push({ type: 'warning', text: `Failed to replay event: ${event.type} on ${event.selector}` })
        }
      }
    } else {
      // No recording? Try to find the page from the ticket description
      console.log(`[forensic-agent] No recording found. Attempting discovery based on ticket description.`)
      // (Basic discovery logic could go here)
    }

    // 5. Final State Capture
    const finalScreenshot = await page.screenshot({ fullPage: true })
    evidence.screenshots.push(finalScreenshot.toString('base64'))
    evidence.domSnapshots.push(await page.content())

    // 6. Log Findings to Database
    await supabase.from('forensic_investigations').insert({
      ticket_id: ticketId,
      status: 'completed',
      evidence_summary: {
        error_count: evidence.errors.length,
        log_count: evidence.logs.length,
        screenshot_count: evidence.screenshots.length
      },
      raw_evidence: evidence,
      investigated_at: new Date().toISOString()
    })

    return { success: true, evidence }

  } catch (error) {
    console.error(`[forensic-agent] Investigation failed:`, error)
    return { success: false, error: error.message }
  } finally {
    await browser.close()
  }
}
