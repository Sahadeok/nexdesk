import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { issue, matched } = await req.json()

    const prompt = `You are an IT support AI for a mutual fund application. A user has reported this issue: "${issue}"
${matched ? `This has been matched to a known issue: "${matched}".` : 'No known pattern was matched.'}

In 2-3 sentences, provide a brief additional insight or tip that goes beyond the standard resolution steps. 
Focus on mutual fund specific context (BSE/NSE APIs, KYC, SIP payments, NAV, RTA sync).
Be concise, practical, and specific. Do not repeat the standard steps.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const suggestion = data.content?.[0]?.text || ''

    return NextResponse.json({ suggestion })
  } catch(e) {
    return NextResponse.json({ suggestion: '' })
  }
}

