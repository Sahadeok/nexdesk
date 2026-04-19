import { NextResponse } from 'next/server'
import { aiGenerateTechnicalDesign } from '../../../lib/crEngine'

export async function POST(req) {
  try {
    const { prompt, context } = await req.json()
    if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

    const design = await aiGenerateTechnicalDesign(prompt, context || 'developer_prompt')

    return NextResponse.json({
      success: true,
      design
    })

  } catch (e) {
    console.error('[cr-technical-design] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

