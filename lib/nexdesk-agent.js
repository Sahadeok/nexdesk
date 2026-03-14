/**
 * NexDesk Health Agent v1.0
 * Embed this in ANY application to automatically capture errors
 * and send them to NexDesk for monitoring and AI analysis.
 *
 * USAGE — Add to your app's _app.js or index.js:
 *   import { initNexDeskAgent } from './nexdesk-agent'
 *   initNexDeskAgent({ appId: 'mutual-fund-app', nexdeskUrl: 'https://your-nexdesk.vercel.app' })
 */

const DEFAULT_CONFIG = {
  appId:       'unknown-app',
  nexdeskUrl:  'http://localhost:3000',
  sampleRate:  1.0,      // 1.0 = capture 100% of errors
  maxPerMin:   10,       // max errors to send per minute
  captureApi:  true,     // capture API failures
  captureJs:   true,     // capture JS errors
  captureSlow: true,     // capture slow responses (>3000ms)
  slowThreshold: 3000,   // ms
}

let config     = { ...DEFAULT_CONFIG }
let errorCount = 0
let resetTimer = null
let initialized = false

export function initNexDeskAgent(userConfig = {}) {
  if (initialized) return
  initialized = true
  config = { ...DEFAULT_CONFIG, ...userConfig }

  if (config.captureJs)  setupJsErrorCapture()
  if (config.captureApi) setupApiInterceptor()

  // Reset error count every minute
  resetTimer = setInterval(() => { errorCount = 0 }, 60000)

  console.log(`[NexDesk Agent] Initialized for app: ${config.appId}`)
}

// ── Capture uncaught JS errors ──────────────────────────────
function setupJsErrorCapture() {
  window.addEventListener('error', (event) => {
    sendLog({
      type:    'js_error',
      error:   event.message,
      url:     event.filename,
      stack:   event.error?.stack,
      service: 'frontend',
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    sendLog({
      type:    'promise_rejection',
      error:   event.reason?.message || String(event.reason),
      stack:   event.reason?.stack,
      service: 'frontend',
      url:     window.location.href,
    })
  })
}

// ── Intercept API calls ──────────────────────────────────────
function setupApiInterceptor() {
  const originalFetch = window.fetch

  window.fetch = async function(...args) {
    const url   = typeof args[0] === 'string' ? args[0] : args[0]?.url
    const start = Date.now()

    try {
      const response = await originalFetch.apply(this, args)
      const duration = Date.now() - start

      // Capture API failures
      if (!response.ok) {
        sendLog({
          type:    'api_failure',
          error:   `HTTP ${response.status} - ${response.statusText}`,
          url,
          service: extractService(url),
          metadata: { status: response.status, duration },
        })
      }

      // Capture slow responses
      if (config.captureSlow && duration > config.slowThreshold) {
        sendLog({
          type:    'slow_response',
          error:   `Response took ${duration}ms (threshold: ${config.slowThreshold}ms)`,
          url,
          service: extractService(url),
          metadata: { duration, threshold: config.slowThreshold },
        })
      }

      return response
    } catch(e) {
      const duration = Date.now() - start
      sendLog({
        type:    'api_error',
        error:   e.message,
        url,
        service: extractService(url),
        stack:   e.stack,
        metadata: { duration },
      })
      throw e
    }
  }
}

// ── Send log to NexDesk ──────────────────────────────────────
async function sendLog(data) {
  // Rate limiting
  if (errorCount >= config.maxPerMin) return
  if (Math.random() > config.sampleRate) return

  // Skip NexDesk's own API calls
  if (data.url?.includes(config.nexdeskUrl)) return
  if (data.url?.includes('supabase')) return

  errorCount++

  try {
    await fetch(`${config.nexdeskUrl}/api/health-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId:     config.appId,
        type:      data.type,
        service:   data.service,
        error:     data.error,
        url:       data.url,
        stack:     data.stack,
        metadata:  data.metadata,
        userAgent: navigator.userAgent,
        pageUrl:   window.location.href,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch(e) {
    // Silently fail — never crash the main app
  }
}

// ── Helper: extract service name from URL ────────────────────
function extractService(url) {
  if (!url) return 'unknown'
  try {
    const hostname = new URL(url).hostname
    if (hostname.includes('bse'))        return 'BSE API'
    if (hostname.includes('nse'))        return 'NSE API'
    if (hostname.includes('razorpay'))   return 'Payment Gateway'
    if (hostname.includes('cams'))       return 'KYC / CAMS'
    if (hostname.includes('msg91'))      return 'SMS Gateway'
    if (hostname.includes('sendgrid'))   return 'Email Service'
    if (hostname.includes('supabase'))   return 'Database'
    return hostname.split('.')[0]
  } catch(e) {
    return 'unknown'
  }
}

// ── Manual error reporting ───────────────────────────────────
export function reportError(error, context = {}) {
  sendLog({
    type:    'manual_report',
    error:   error?.message || String(error),
    stack:   error?.stack,
    service: context.service || 'manual',
    url:     context.url || window.location.href,
    metadata: context,
  })
}

export function destroy() {
  initialized = false
  if (resetTimer) clearInterval(resetTimer)
}
