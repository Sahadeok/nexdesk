/**
 * NexDesk Support 3.0 Widget
 * Drop this script into ANY web application
 * It provides instant AI support without leaving the app
 *
 * Usage:
 * <script
 *   src="http://localhost:3000/nexdesk-widget-v3.js"
 *   data-nexdesk-url="http://localhost:3000"
 *   data-app-id="your_app_id"
 *   data-app-name="Your App Name"
 *   async>
 * </script>
 */

;(function() {
  const NEXDESK_URL = document.currentScript?.getAttribute('data-nexdesk-url') || 'http://localhost:3000'
  const APP_ID      = document.currentScript?.getAttribute('data-app-id')      || 'unknown'
  const APP_NAME    = document.currentScript?.getAttribute('data-app-name')    || document.title
  const SESSION_ID  = 'sess_' + Math.random().toString(36).substr(2, 9)

  // ── STYLES ──────────────────────────────────────────
  const style = document.createElement('style')
  style.textContent = `
    #nd-widget-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #2563eb, #06b6d4);
      border: none;
      cursor: pointer;
      z-index: 999999;
      box-shadow: 0 4px 20px rgba(37,99,235,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      transition: all 0.3s;
      animation: nd-pulse 3s infinite;
    }
    #nd-widget-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 28px rgba(37,99,235,0.5);
    }
    #nd-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 18px;
      height: 18px;
      background: #ef4444;
      border-radius: 50%;
      font-size: 10px;
      color: white;
      display: none;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-family: sans-serif;
    }
    #nd-panel {
      position: fixed;
      bottom: 90px;
      right: 24px;
      width: 360px;
      max-height: 560px;
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      border-radius: 20px;
      z-index: 999998;
      display: none;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      overflow: hidden;
      animation: nd-slideup 0.3s ease;
    }
    #nd-panel.open { display: flex; }
    .nd-header {
      background: linear-gradient(135deg, #1e3a5f, #083344);
      padding: 16px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-light);
    }
    .nd-header-left { display: flex; align-items: center; gap: 10px; }
    .nd-logo { font-size: 20px; }
    .nd-title { font-size: 14px; font-weight: 700; color: var(--text-primary); }
    .nd-subtitle { font-size: 11px; color: var(--text-secondary); margin-top: 1px; }
    .nd-close {
      background: transparent;
      border: none;
      color: var(--text-disabled);
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
      padding: 0;
    }
    .nd-status {
      padding: 8px 16px;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .nd-status.watching { background: #022c22; color: #34d399; }
    .nd-status.error    { background: #1c0000; color: #f87171; }
    .nd-messages {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 200px;
    }
    .nd-msg {
      max-width: 85%;
      padding: 10px 13px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.5;
    }
    .nd-msg.ai {
      background: #1e3a5f;
      color: #93c5fd;
      border-radius: 4px 12px 12px 12px;
      align-self: flex-start;
    }
    .nd-msg.user {
      background: #2563eb;
      color: #fff;
      border-radius: 12px 4px 12px 12px;
      align-self: flex-end;
    }
    .nd-msg.system {
      background: #022c22;
      color: #34d399;
      font-size: 11px;
      border-radius: 8px;
      align-self: center;
      text-align: center;
    }
    .nd-msg.warning {
      background: #1c0a00;
      color: #fb923c;
      font-size: 12px;
      border-radius: 8px;
      align-self: stretch;
      max-width: 100%;
    }
    .nd-quick-btns {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 0 14px 10px;
    }
    .nd-quick-btn {
      padding: 5px 12px;
      background: var(--bg-primary);
      border: 1px solid var(--border-light);
      border-radius: 20px;
      color: var(--text-secondary);
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }
    .nd-quick-btn:hover { border-color: #3b82f6; color: #60a5fa; }
    .nd-input-row {
      padding: 12px;
      border-top: 1px solid var(--border-light);
      display: flex;
      gap: 8px;
    }
    .nd-input {
      flex: 1;
      padding: 9px 13px;
      background: var(--bg-primary);
      border: 1px solid var(--border-light);
      border-radius: 10px;
      color: var(--text-primary);
      font-size: 13px;
      outline: none;
      font-family: inherit;
    }
    .nd-input:focus { border-color: #3b82f6; }
    .nd-send {
      padding: 9px 16px;
      background: linear-gradient(135deg, #2563eb, #06b6d4);
      border: none;
      border-radius: 10px;
      color: white;
      cursor: pointer;
      font-size: 14px;
      transition: opacity 0.2s;
    }
    .nd-send:hover { opacity: 0.9; }
    .nd-ticket-btn {
      margin: 8px 14px;
      padding: 9px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border: none;
      border-radius: 10px;
      color: white;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      width: calc(100% - 28px);
      font-family: inherit;
    }
    .nd-ticket-btn:hover { opacity: 0.9; }
    .nd-typing {
      display: flex;
      gap: 4px;
      padding: 10px 13px;
      background: #1e3a5f;
      border-radius: 4px 12px 12px 12px;
      align-self: flex-start;
    }
    .nd-dot {
      width: 6px; height: 6px;
      background: #60a5fa;
      border-radius: 50%;
      animation: nd-bounce 1.2s infinite;
    }
    .nd-dot:nth-child(2) { animation-delay: 0.2s; }
    .nd-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes nd-pulse   { 0%,100%{box-shadow:0 4px 20px rgba(37,99,235,0.4)} 50%{box-shadow:0 4px 30px rgba(6,182,212,0.6)} }
    @keyframes nd-slideup { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
    @keyframes nd-bounce  { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
  `
  document.head.appendChild(style)

  // ── STATE ────────────────────────────────────────────
  let isOpen       = false
  let errorBuffer  = []
  let currentPage  = window.location.pathname
  let ticketRaised = false
  let chatHistory  = []

  // ── BUILD UI ─────────────────────────────────────────
  // Floating button
  const btn = document.createElement('button')
  btn.id = 'nd-widget-btn'
  btn.innerHTML = `⚡<div id="nd-badge"></div>`
  document.body.appendChild(btn)

  // Panel
  const panel = document.createElement('div')
  panel.id = 'nd-panel'
  panel.innerHTML = `
    <div class="nd-header">
      <div class="nd-header-left">
        <span class="nd-logo">⚡</span>
        <div>
          <div class="nd-title">NexDesk Support</div>
          <div class="nd-subtitle">${APP_NAME} · AI-powered help</div>
        </div>
      </div>
      <button class="nd-close" id="nd-close-btn">×</button>
    </div>
    <div class="nd-status watching" id="nd-status">
      <span>●</span> Watching for issues...
    </div>
    <div class="nd-messages" id="nd-messages"></div>
    <div class="nd-quick-btns" id="nd-quick-btns">
      <button class="nd-quick-btn" onclick="ndQuick('I got an error')">Got an error</button>
      <button class="nd-quick-btn" onclick="ndQuick('App is slow')">App is slow</button>
      <button class="nd-quick-btn" onclick="ndQuick('Something is not loading')">Not loading</button>
      <button class="nd-quick-btn" onclick="ndQuick('Payment failed')">Payment issue</button>
    </div>
    <div class="nd-input-row">
      <input class="nd-input" id="nd-input" placeholder="Describe your issue..." />
      <button class="nd-send" id="nd-send-btn">→</button>
    </div>
  `
  document.body.appendChild(panel)

  // ── EVENTS ───────────────────────────────────────────
  btn.addEventListener('click', togglePanel)
  document.getElementById('nd-close-btn').addEventListener('click', closePanel)
  document.getElementById('nd-send-btn').addEventListener('click', sendMessage)
  document.getElementById('nd-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') sendMessage()
  })

  function togglePanel() {
    isOpen ? closePanel() : openPanel()
  }

  function openPanel() {
    isOpen = true
    panel.classList.add('open')
    btn.innerHTML = `✕<div id="nd-badge"></div>`
    hideBadge()
    if (chatHistory.length === 0) showWelcome()
    document.getElementById('nd-input').focus()
  }

  function closePanel() {
    isOpen = false
    panel.classList.remove('open')
    btn.innerHTML = `⚡<div id="nd-badge"></div>`
  }

  function showWelcome() {
    const recentErrors = errorBuffer.slice(-3)
    if (recentErrors.length > 0) {
      addMessage(`I've detected ${recentErrors.length} issue(s) on this page. I'm already analyzing them. How can I help?`, 'ai')
      recentErrors.forEach(e => {
        addMessage(`⚠️ Detected: ${e.message?.substring(0,80) || e.event_type}`, 'warning')
      })
    } else {
      addMessage(`Hi! I'm your AI support assistant for ${APP_NAME}. I'm watching for issues in real-time. How can I help you?`, 'ai')
    }
  }

  function addMessage(text, type) {
    const msgs = document.getElementById('nd-messages')
    const div  = document.createElement('div')
    div.className = `nd-msg ${type}`
    div.textContent = text
    msgs.appendChild(div)
    msgs.scrollTop = msgs.scrollHeight
    chatHistory.push({ role: type === 'user' ? 'user' : 'assistant', content: text })
    return div
  }

  function showTyping() {
    const msgs = document.getElementById('nd-messages')
    const div  = document.createElement('div')
    div.className = 'nd-typing'
    div.id = 'nd-typing'
    div.innerHTML = '<div class="nd-dot"></div><div class="nd-dot"></div><div class="nd-dot"></div>'
    msgs.appendChild(div)
    msgs.scrollTop = msgs.scrollHeight
    return div
  }

  function removeTyping() {
    document.getElementById('nd-typing')?.remove()
  }

  function showBadge(count) {
    const badge = document.getElementById('nd-badge')
    if (badge) { badge.style.display = 'flex'; badge.textContent = count }
  }

  function hideBadge() {
    const badge = document.getElementById('nd-badge')
    if (badge) badge.style.display = 'none'
  }

  // ── SEND MESSAGE → AI ─────────────────────────────────
  async function sendMessage() {
    const input   = document.getElementById('nd-input')
    const message = input.value.trim()
    if (!message) return
    input.value = ''

    addMessage(message, 'user')
    const typing = showTyping()

    try {
      // Build context from errors on this page
      const errorContext = errorBuffer.length > 0
        ? `Recent errors on this page:\n${errorBuffer.slice(-3).map(e => `- ${e.message}`).join('\n')}`
        : 'No errors detected on current page'

      const res = await fetch(`${NEXDESK_URL}/api/widget-chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          app_id:     APP_ID,
          app_name:   APP_NAME,
          page:       currentPage,
          session_id: SESSION_ID,
          error_context: errorContext,
          chat_history: chatHistory.slice(-6),
        }),
      })

      const data = await res.json()
      removeTyping()

      if (data.response) {
        addMessage(data.response, 'ai')

        // Show raise ticket button if AI couldn't resolve
        if (data.needs_ticket && !ticketRaised) {
          showRaiseTicketBtn(message)
        }

        // Show resolved message
        if (data.resolved) {
          addMessage('✅ Great! Issue resolved. Let me know if you need anything else.', 'system')
        }
      }
    } catch(e) {
      removeTyping()
      addMessage('Unable to connect to support. Click below to raise a ticket.', 'ai')
      showRaiseTicketBtn(message)
    }
  }

  function showRaiseTicketBtn(issue) {
    const msgs = document.getElementById('nd-messages')
    const btn  = document.createElement('button')
    btn.className = 'nd-ticket-btn'
    btn.textContent = '🎫 Raise Support Ticket'
    btn.onclick = () => raiseTicket(issue)
    msgs.appendChild(btn)
    msgs.scrollTop = msgs.scrollHeight
  }

  async function raiseTicket(issue) {
    if (ticketRaised) return
    ticketRaised = true
    addMessage('🎫 Raising a ticket for you...', 'system')

    try {
      const res = await fetch(`${NEXDESK_URL}/api/session-events`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: [{
            session_id:  SESSION_ID,
            event_type:  'widget_ticket',
            error_msg:   issue,
            page:        currentPage,
            app_name:    APP_NAME,
            app_id:      APP_ID,
            logged_at:   new Date().toISOString(),
          }]
        }),
      })
      const data = await res.json()
      addMessage(`✅ Ticket raised! Our team will respond shortly. Reference: ${data.ticket_number || 'pending'}`, 'system')
    } catch(e) {
      addMessage('❌ Could not raise ticket. Please contact support directly.', 'ai')
    }
  }

  // Global quick action
  window.ndQuick = function(text) {
    document.getElementById('nd-input').value = text
    sendMessage()
  }

  // ── ERROR CAPTURE ─────────────────────────────────────
  window.addEventListener('error', e => {
    const event = {
      event_type: 'js_error',
      message:    e.message,
      stack_trace: e.error?.stack,
      page:       currentPage,
      app_id:     APP_ID,
      app_name:   APP_NAME,
      severity:   'high',
      session_id: SESSION_ID,
      logged_at:  new Date().toISOString(),
    }
    errorBuffer.push(event)
    if (errorBuffer.length > 10) errorBuffer.shift()

    // Send to watcher
    sendToWatcher([event])

    // Show badge
    if (!isOpen) showBadge(errorBuffer.length)

    // Update status
    const status = document.getElementById('nd-status')
    if (status) {
      status.className = 'nd-status error'
      status.innerHTML = `<span>⚠</span> ${errorBuffer.length} issue(s) detected`
    }
  })

  // Intercept fetch for API monitoring
  const origFetch = window.fetch
  window.fetch = async function(...args) {
    const start = Date.now()
    const url   = typeof args[0] === 'string' ? args[0] : args[0]?.url || ''

    // Skip NexDesk own calls
    if (url.includes(NEXDESK_URL)) return origFetch(...args)

    try {
      const res      = await origFetch(...args)
      const duration = Date.now() - start

      if (!res.ok || duration > 3000) {
        const event = {
          event_type:  res.ok ? 'slow_api' : 'api_failure',
          message:     `${res.status} ${url.split('?')[0].substring(0,80)}`,
          endpoint:    url.split('?')[0],
          status_code: res.status,
          duration_ms: duration,
          page:        currentPage,
          app_id:      APP_ID,
          app_name:    APP_NAME,
          severity:    res.status >= 500 ? 'critical' : 'high',
          session_id:  SESSION_ID,
          logged_at:   new Date().toISOString(),
        }
        errorBuffer.push(event)
        if (errorBuffer.length > 10) errorBuffer.shift()
        sendToWatcher([event])
        if (!isOpen) showBadge(errorBuffer.length)
      }
      return res
    } catch(e) {
      const event = {
        event_type:  'network_error',
        message:     `Network error: ${url.split('?')[0].substring(0,80)}`,
        endpoint:    url,
        duration_ms: Date.now() - start,
        page:        currentPage,
        app_id:      APP_ID,
        app_name:    APP_NAME,
        severity:    'high',
        session_id:  SESSION_ID,
        logged_at:   new Date().toISOString(),
      }
      errorBuffer.push(event)
      sendToWatcher([event])
      throw e
    }
  }

  // Track page changes
  const origPushState = history.pushState
  history.pushState = function(...args) {
    origPushState.apply(this, args)
    currentPage = window.location.pathname
    errorBuffer = [] // clear on page change
  }

  // ── SEND TO WATCHER ───────────────────────────────────
  function sendToWatcher(events) {
    fetch(`${NEXDESK_URL}/api/app-watcher`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events, app_id: APP_ID, app_name: APP_NAME }),
    }).catch(() => {})
  }

  console.log(`[NexDesk Widget v3] Loaded for ${APP_NAME} — Support 3.0 Active ⚡`)
})()

