/**
 * NexDesk Agent v2.0 — Anonymized Session Intelligence
 * RBI / SEBI Compliant — Zero PII captured
 * 
 * WHAT IT CAPTURES (safe):
 *   ✅ API endpoint routes (no request/response body)
 *   ✅ HTTP status codes & response times
 *   ✅ JS error messages & stack traces (no user data)
 *   ✅ Page/route visited
 *   ✅ Browser & OS (no IP address)
 *   ✅ Network type (4G/WiFi - no location)
 * 
 * WHAT IT NEVER CAPTURES:
 *   ❌ Screen / video / screenshots
 *   ❌ PAN, Aadhaar, Bank account numbers
 *   ❌ Passwords, OTPs, PINs
 *   ❌ Request/response body (no financial data)
 *   ❌ User identity (anonymous session ID only)
 *   ❌ IP address or geolocation
 * 
 * USAGE in your MF App:
 *   <script src="/nexdesk-agent.js"
 *     data-endpoint="https://your-nexdesk.vercel.app/api/session-events"
 *     data-app="mf-app-v2"
 *   ></script>
 */

(function() {
  'use strict'

  const config = {
    endpoint:    document.currentScript?.getAttribute('data-endpoint') || '/api/session-events',
    appVersion:  document.currentScript?.getAttribute('data-app') || 'unknown',
    batchSize:   10,
    batchDelay:  3000,   // ms - send every 3 seconds
    maxQueue:    100,
    enabled:     true,
  }

  // Anonymous session ID — not linked to user identity
  const SESSION_KEY = 'ndsk_sid'
  let sessionId = sessionStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = 'sess-' + Math.random().toString(36).substr(2,9) + '-' + Date.now()
    sessionStorage.setItem(SESSION_KEY, sessionId)
  }

  const queue = []
  let batchTimer = null
  const sessionStart = Date.now()

  // ── PII SCRUBBER ──────────────────────────────────────────────────────────
  // Remove any accidental PII from strings before sending
  function scrub(str) {
    if (!str) return str
    return String(str)
      // PAN numbers
      .replace(/[A-Z]{5}[0-9]{4}[A-Z]/g, '[PAN]')
      // Aadhaar
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[AADHAAR]')
      // Mobile numbers
      .replace(/\b[6-9]\d{9}\b/g, '[MOBILE]')
      // Email addresses
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
      // Credit/debit card numbers
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]')
      // IFSC codes
      .replace(/\b[A-Z]{4}0[A-Z0-9]{6}\b/g, '[IFSC]')
      // UPI IDs
      .replace(/[a-zA-Z0-9._-]+@[a-zA-Z]+/g, '[UPI]')
      // Query string values (keep keys, scrub values)
      .replace(/([?&][^=&]+)=[^&]*/g, '$1=[REDACTED]')
  }

  // Scrub URL — keep path, remove query params values
  function scrubUrl(url) {
    if (!url) return url
    try {
      const u = new URL(url, window.location.origin)
      return u.pathname  // Only keep the path, not query params
    } catch(e) {
      return scrub(url.split('?')[0])  // Fallback: remove everything after ?
    }
  }

  // ── EVENT BUILDER ─────────────────────────────────────────────────────────
  function buildEvent(type, data) {
    return {
      session_id:   sessionId,
      event_type:   type,
      page:         scrubUrl(window.location.pathname),
      browser:      getBrowser(),
      os:           getOS(),
      network_type: getNetworkType(),
      app_version:  config.appVersion,
      logged_at:    new Date().toISOString(),
      ...data,
    }
  }

  function getBrowser() {
    const ua = navigator.userAgent
    if (ua.includes('Chrome'))  return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari'))  return 'Safari'
    if (ua.includes('Edge'))    return 'Edge'
    return 'Unknown'
  }

  function getOS() {
    const ua = navigator.userAgent
    if (ua.includes('Windows')) return 'Windows'
    if (ua.includes('Mac'))     return 'macOS'
    if (ua.includes('Android')) return 'Android'
    if (ua.includes('iOS') || ua.includes('iPhone')) return 'iOS'
    return 'Unknown'
  }

  function getNetworkType() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    return conn?.effectiveType || conn?.type || 'unknown'
  }

  // ── QUEUE & BATCH SEND ────────────────────────────────────────────────────
  function enqueue(event) {
    if (!config.enabled) return
    if (queue.length >= config.maxQueue) queue.shift()  // Drop oldest
    queue.push(event)
    scheduleBatch()
  }

  function scheduleBatch() {
    if (batchTimer) return
    batchTimer = setTimeout(flushQueue, config.batchDelay)
  }

  async function flushQueue() {
    batchTimer = null
    if (queue.length === 0) return

    const batch = queue.splice(0, config.batchSize)
    try {
      await fetch(config.endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ events: batch }),
        keepalive: true,
      })
    } catch(e) {
      // Silently fail — never break the host app
    }
  }

  // Flush on page unload
  window.addEventListener('beforeunload', () => {
    if (queue.length > 0) {
      navigator.sendBeacon(config.endpoint, JSON.stringify({ events: queue }))
    }
  })

  // ── 1. PAGE VIEW TRACKING ─────────────────────────────────────────────────
  function trackPageView(path) {
    enqueue(buildEvent('page_view', { page: scrubUrl(path) }))
  }

  // Track initial page
  trackPageView(window.location.pathname)

  // SPA route changes (Next.js / React Router)
  const _pushState = history.pushState.bind(history)
  history.pushState = function(...args) {
    _pushState(...args)
    trackPageView(window.location.pathname)
  }
  window.addEventListener('popstate', () => trackPageView(window.location.pathname))

  // ── 2. API CALL INTERCEPTOR ───────────────────────────────────────────────
  const _fetch = window.fetch.bind(window)
  window.fetch = async function(input, init) {
    const url   = typeof input === 'string' ? input : input.url
    const route = scrubUrl(url)
    const start = Date.now()

    // Skip NexDesk's own endpoints to avoid infinite loop
    if (url.includes('/api/session-events') || url.includes('/api/health-check')) {
      return _fetch(input, init)
    }

    try {
      const response = await _fetch(input, init)
      const duration = Date.now() - start

      // Only log API calls to /api/ routes or external services
      if (url.includes('/api/') || url.includes('api.bse') || url.includes('api.nse') ||
          url.includes('razorpay') || url.includes('cams') || url.includes('kfintech')) {

        const eventType = response.ok ? 'api_call' : 'api_failure'
        enqueue(buildEvent(eventType, {
          endpoint:    route,
          method:      (init?.method || 'GET').toUpperCase(),
          status_code: response.status,
          duration_ms: duration,
          error_msg:   response.ok ? null : `HTTP ${response.status}`,
        }))

        // Slow response warning (> 5 seconds)
        if (duration > 5000) {
          enqueue(buildEvent('slow_response', {
            endpoint:    route,
            duration_ms: duration,
            status_code: response.status,
          }))
        }
      }

      return response
    } catch(err) {
      const duration = Date.now() - start
      enqueue(buildEvent('network_fail', {
        endpoint:    route,
        method:      (init?.method || 'GET').toUpperCase(),
        duration_ms: duration,
        error_msg:   scrub(err.message),
      }))
      throw err
    }
  }

  // Also intercept XHR (for legacy code)
  const _open = XMLHttpRequest.prototype.open
  const _send = XMLHttpRequest.prototype.send
  XMLHttpRequest.prototype.open = function(method, url) {
    this._ndsk_method = method
    this._ndsk_url    = url
    this._ndsk_start  = Date.now()
    return _open.apply(this, arguments)
  }
  XMLHttpRequest.prototype.send = function() {
    this.addEventListener('loadend', () => {
      const url = this._ndsk_url || ''
      if (url.includes('/api/session-events')) return
      const duration = Date.now() - this._ndsk_start
      const ok = this.status >= 200 && this.status < 400
      enqueue(buildEvent(ok ? 'api_call' : 'api_failure', {
        endpoint:    scrubUrl(url),
        method:      this._ndsk_method || 'GET',
        status_code: this.status,
        duration_ms: duration,
        error_msg:   ok ? null : `HTTP ${this.status}`,
      }))
    })
    return _send.apply(this, arguments)
  }

  // ── 3. JS ERROR CAPTURE ───────────────────────────────────────────────────
  window.addEventListener('error', (event) => {
    enqueue(buildEvent('js_error', {
      error_msg: scrub(event.message),
      page:      scrubUrl(window.location.pathname),
    }))
  })

  window.addEventListener('unhandledrejection', (event) => {
    enqueue(buildEvent('promise_rejection', {
      error_msg: scrub(String(event.reason?.message || event.reason || 'Unhandled rejection')),
    }))
  })

  // ── 4. USER-TRIGGERED DIAGNOSTIC ─────────────────────────────────────────
  // Call window.nexdeskReport() from "Report Issue" button in your app
  // This sends a diagnostic bundle immediately
  window.nexdeskReport = function(context) {
    enqueue(buildEvent('user_report', {
      error_msg: scrub(context?.message || 'User triggered report'),
      page:      scrubUrl(window.location.pathname),
    }))
    flushQueue()  // Send immediately
    return sessionId  // Return session ID so it can be attached to support ticket
  }

  // ── 5. SESSION SUMMARY ON UNLOAD ─────────────────────────────────────────
  window.addEventListener('beforeunload', () => {
    enqueue(buildEvent('session_end', {
      duration_ms: Date.now() - sessionStart,
    }))
  })

  console.log('[NexDesk Agent v2] Initialized. Session:', sessionId)
})()
