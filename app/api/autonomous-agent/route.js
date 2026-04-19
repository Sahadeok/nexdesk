import { NextResponse } from 'next/server'
import { runAutonomousAgent } from '../../../lib/agent-engine'

export async function POST(req) {
  try {
    const { ticket_id } = await req.json()
    if (!ticket_id) return NextResponse.json({ error: 'ticket_id required' }, { status: 400 })

    const result = await runAutonomousAgent(ticket_id)

    return NextResponse.json({
      success: true,
      result
    })

  } catch (e) {
    console.error('[autonomous-agent] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

