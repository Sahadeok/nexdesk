import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )
}

// Fetch logs from CloudWatch using AWS credentials
async function fetchCloudWatchLogs({ region, logGroup, accessKeyId, secretAccessKey, startTime, endTime, filterPattern }) {
  try {
    // AWS Signature V4 signing
    const service  = 'logs'
    const host     = `logs.${region}.amazonaws.com`
    const endpoint = `https://${host}`
    const now      = new Date()
    const amzDate  = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').substring(0, 15) + 'Z'
    const dateStamp = amzDate.substring(0, 8)

    const body = JSON.stringify({
      logGroupName:  logGroup,
      startTime:     startTime,
      endTime:       endTime,
      filterPattern: filterPattern || 'ERROR',
      limit:         100,
    })

    // Create signing key
    async function hmacSHA256(key, data) {
      const encoder = new TextEncoder()
      const keyData = typeof key === 'string' ? encoder.encode(key) : key
      const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data)))
    }

    async function getSignatureKey(key, dateStamp, regionName, serviceName) {
      const kDate    = await hmacSHA256('AWS4' + key, dateStamp)
      const kRegion  = await hmacSHA256(kDate, regionName)
      const kService = await hmacSHA256(kRegion, serviceName)
      return await hmacSHA256(kService, 'aws4_request')
    }

    async function sha256(data) {
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
      return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('')
    }

    const payloadHash   = await sha256(body)
    const canonicalHeaders = `content-type:application/x-amz-json-1.1\nhost:${host}\nx-amz-date:${amzDate}\n`
    const signedHeaders    = 'content-type;host;x-amz-date'
    const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`

    const credentialScope  = `${dateStamp}/${region}/${service}/aws4_request`
    const stringToSign     = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256(canonicalRequest)}`
    const signingKey       = await getSignatureKey(secretAccessKey, dateStamp, region, service)

    const signature = Array.from(new Uint8Array(await (async () => {
      const cryptoKey = await crypto.subtle.importKey('raw', signingKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(stringToSign))
    })())).map(b => b.toString(16).padStart(2,'0')).join('')

    const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    const response = await fetch(`${endpoint}/?Action=FilterLogEvents`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/x-amz-json-1.1',
        'X-Amz-Target':  'Logs_20140328.FilterLogEvents',
        'X-Amz-Date':    amzDate,
        'Authorization': authHeader,
        'Host':          host,
      },
      body,
    })

    const data = await response.json()
    return data.events?.map(e => e.message).join('\n') || 'No logs found'
  } catch(e) {
    return `CloudWatch fetch error: ${e.message}`
  }
}

export async function POST(req) {
  try {
    const { ticket_id, integration_id, time_window_minutes } = await req.json()
    const supabase = getSupabase()

    // Get integration config
    const { data: integration } = await supabase
      .from('log_integrations')
      .select('*')
      .eq('id', integration_id)
      .single()

    if (!integration) return NextResponse.json({ error: 'Integration not found' }, { status: 404 })

    // Get ticket for context
    const { data: ticket } = await supabase
      .from('tickets')
      .select('title, description, created_at')
      .eq('id', ticket_id)
      .single()

    const ticketTime    = new Date(ticket?.created_at || Date.now())
    const windowMins    = time_window_minutes || 30
    const startTime     = new Date(ticketTime - windowMins * 60 * 1000).getTime()
    const endTime       = new Date(ticketTime + 5  * 60 * 1000).getTime()

    let rawLogs = ''

    if (integration.type === 'cloudwatch') {
      const cfg = integration.config
      rawLogs = await fetchCloudWatchLogs({
        region:          cfg.region,
        logGroup:        cfg.log_group,
        accessKeyId:     cfg.access_key_id,
        secretAccessKey: cfg.secret_access_key,
        startTime,
        endTime,
        filterPattern:   cfg.filter_pattern || 'ERROR',
      })
    } else if (integration.type === 'custom') {
      // Custom REST log endpoint
      const cfg = integration.config
      const res = await fetch(cfg.endpoint, {
        headers: { 'Authorization': `Bearer ${cfg.api_key}`, 'Content-Type': 'application/json' },
        method:  'POST',
        body:    JSON.stringify({ start: startTime, end: endTime, filter: 'ERROR' }),
      })
      rawLogs = await res.text()
    }

    // AI summarize logs
    let aiSummary = ''
    if (rawLogs && rawLogs.length > 0) {
      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 400,
          messages: [{
            role: 'user',
            content: `Analyze these server logs for a mutual fund application and summarize the key errors relevant to this support ticket:

Ticket: "${ticket?.title}"
Ticket Description: "${ticket?.description?.substring(0,200)}"

Logs:
${rawLogs.substring(0, 3000)}

Provide a concise 3-5 bullet point summary for the support agent. Focus on:
1. Root cause if visible
2. Affected service/function
3. Error frequency
4. Suggested fix
Keep it under 200 words.`
          }],
        }),
      })
      const aiData = await aiRes.json()
      aiSummary = aiData.content?.[0]?.text || ''
    }

    // Store in DB
    const { data: saved } = await supabase.from('external_logs').insert({
      ticket_id,
      integration:  integration.name,
      log_group:    integration.config?.log_group,
      raw_logs:     rawLogs.substring(0, 50000), // cap at 50KB
      ai_summary:   aiSummary,
      fetched_at:   new Date().toISOString(),
    }).select().single()

    // Update integration last_synced
    await supabase.from('log_integrations').update({ last_synced: new Date().toISOString() }).eq('id', integration_id)

    return NextResponse.json({ success: true, log_id: saved?.id, ai_summary: aiSummary, log_lines: rawLogs.split('\n').length })
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
