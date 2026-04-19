import { NextResponse } from 'next/server'
import { runForensicInvestigation } from '../../../../../lib/forensicSubagent'
import { analyzeForensicEvidence } from '../../../../../lib/perceptionEngine'

export async function POST(req) {
  try {
    const { ticketId, customPrompt } = await req.json()

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 })
    }

    // 1. Run the Browser Investigation
    console.log(`[api/forensic/trigger] Manually triggered for ticket: ${ticketId}`)
    const forensic = await runForensicInvestigation(ticketId)

    if (!forensic.success) {
      return NextResponse.json({ error: 'Forensic subagent failed: ' + forensic.error }, { status: 500 })
    }

    // 2. Perform AI Intelligence Analysis (with optional custom dev prompt)
    const analysis = await analyzeForensicEvidence(ticketId, forensic.evidence)

    return NextResponse.json({
      status: 'success',
      findings: analysis.analysis,
      surgery: analysis.surgery,
      evidence_summary: {
        screenshots_captured: forensic.evidence.screenshots.length,
        errors_found: forensic.evidence.errors.length,
        logs_found: forensic.evidence.logs.length
      }
    })

  } catch (error) {
    console.error('[api/forensic/trigger] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
