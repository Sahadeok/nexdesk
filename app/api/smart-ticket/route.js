import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { errorLog, currentForm } = await req.json()

    const prompt = `You are an IT support ticket analyzer for a mutual fund application.

Analyze this error log / stack trace and extract structured ticket information:

\`\`\`
${errorLog.substring(0, 2000)}
\`\`\`

Return ONLY a valid JSON object (no markdown, no explanation) with these fields:
{
  "title": "Brief issue title (max 80 chars)",
  "description": "Clear description of what the error means in plain English (2-3 sentences)",
  "category": one of: "network" | "hardware" | "software" | "security" | "data_database" | "infrastructure" | "payments" | "kyc" | "market_data" | "authentication" | "other",
  "priority": one of: "low" | "medium" | "high" | "critical"
}

Context: This is a mutual fund app. Common services: BSE API, NSE API, Razorpay payment gateway, CAMS KYC, SMS OTP service.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    const suggestions = JSON.parse(clean)

    return NextResponse.json({ suggestions })
  } catch(e) {
    return NextResponse.json({ suggestions: null })
  }
}

