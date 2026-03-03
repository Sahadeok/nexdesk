// ── NexDesk Smart Ticket Router ───────────────────────────
// Decides: L1 (simple) or L2 (code/technical bug)
// Phase 3 will replace this with Claude AI API

// Keywords that mean → L2 (technical / code bug)
const L2_KEYWORDS = [
  'api', 'http 500', '500 error', 'error 500', 'crash', 'crashed',
  'not loading', 'submit button', 'cannot submit', 'button not working',
  'javascript', 'js error', 'console error', 'exception', 'stack trace',
  'null', 'undefined', 'database error', 'sql', 'application down',
  'app down', 'broken', 'bug', 'cannot save', 'data not saving',
  'page not loading', 'white screen', 'blank screen', 'infinite loop',
  'timeout', 'connection refused', 'cors', 'unauthorized 401',
  '403 forbidden', 'internal server', 'server error', 'deployment',
  'build failed', 'module not found', 'import error', 'syntax error',
]

// Keywords that mean → L1 (simple / common issues)
const L1_KEYWORDS = [
  'password', 'reset password', 'forgot password', 'locked out',
  'printer', 'printing', 'print', 'scanner',
  'vpn', 'wifi', 'wi-fi', 'internet', 'network', 'no internet',
  'email', 'outlook', 'cannot send email', 'email not received',
  'slow', 'laptop slow', 'computer slow', 'pc slow', 'freezing',
  'access', 'permission', 'cannot access', 'login issue',
  'install', 'installation', 'software install',
  'account locked', 'account disabled', 'mfa', 'two factor',
  'keyboard', 'mouse', 'monitor', 'screen', 'headset', 'charger',
]

// Keywords that mean → CRITICAL priority
const CRITICAL_KEYWORDS = [
  'all users', 'everyone', 'whole team', 'entire office',
  'production down', 'completely down', 'nobody can', 'no one can',
  'all staff', 'company wide', 'all employees',
]

// Categories that auto-route to L2
const L2_CATEGORIES = ['APP_ERROR', 'DATABASE', 'SECURITY']

// ── Main routing function ──────────────────────────────────
export function smartRoute(title, description, categoryCode) {
  const text = ((title || '') + ' ' + (description || '')).toLowerCase()

  // 1. Category-based routing (strongest signal)
  if (L2_CATEGORIES.includes(categoryCode)) {
    return {
      team:     'L2',
      priority: 'high',
      reason:   `Category "${categoryCode}" routes directly to L2 — technical issue`,
      confidence: 95,
    }
  }

  // 2. Keyword-based routing
  const hasL2Keyword = L2_KEYWORDS.some(k => text.includes(k))
  const hasL1Keyword = L1_KEYWORDS.some(k => text.includes(k))
  const isCritical   = CRITICAL_KEYWORDS.some(k => text.includes(k))

  // 3. Determine priority
  let priority = 'medium'
  if (isCritical) priority = 'critical'
  else if (hasL2Keyword) priority = 'high'

  // 4. Final routing decision
  if (hasL2Keyword && !hasL1Keyword) {
    return {
      team: 'L2',
      priority,
      reason: 'Technical/code issue detected — routing directly to L2 team',
      confidence: 88,
    }
  }

  if (hasL2Keyword && hasL1Keyword) {
    // Both signals — L2 wins (better safe than sorry)
    return {
      team: 'L2',
      priority,
      reason: 'Mixed signals — routing to L2 to be safe',
      confidence: 72,
    }
  }

  // Default → L1
  return {
    team: 'L1',
    priority: isCritical ? 'high' : 'medium',
    reason: 'Standard issue — routing to L1 support team',
    confidence: 85,
  }
}

// ── SLA deadline calculator ────────────────────────────────
export function calcSLADeadlines(priority) {
  const now = new Date()
  const rules = {
    critical: { response: 0.5, resolve: 2 },
    high:     { response: 1,   resolve: 4 },
    medium:   { response: 4,   resolve: 24 },
    low:      { response: 24,  resolve: 72 },
  }
  const rule = rules[priority] || rules.medium
  return {
    sla_response_due: new Date(now.getTime() + rule.response * 3600000).toISOString(),
    sla_resolve_due:  new Date(now.getTime() + rule.resolve  * 3600000).toISOString(),
  }
}

// ── SLA status for display ─────────────────────────────────
export function getSLAStatus(slaResolveDue, status) {
  if (['resolved', 'closed'].includes(status)) return { label: 'Met', color: '#10b981', bg: '#052e16', icon: '✅' }
  if (!slaResolveDue) return { label: 'N/A', color: '#64748b', bg: '#1e293b', icon: '—' }

  const diffMs  = new Date(slaResolveDue) - new Date()
  const hours   = Math.floor(Math.abs(diffMs) / 3600000)
  const mins    = Math.floor((Math.abs(diffMs) % 3600000) / 60000)

  if (diffMs < 0)         return { label: 'BREACHED',        color: '#ef4444', bg: '#450a0a', icon: '🔴' }
  if (diffMs < 3600000)   return { label: `${mins}m left`,   color: '#f59e0b', bg: '#451a03', icon: '⚠️' }
  if (diffMs < 7200000)   return { label: `${hours}h ${mins}m`, color: '#f59e0b', bg: '#451a03', icon: '⚠️' }
  return                         { label: `${hours}h left`,   color: '#10b981', bg: '#052e16', icon: '✅' }
}

// ── Generate ticket number ─────────────────────────────────
export function genTicketNumber(count) {
  const year = new Date().getFullYear()
  return `TKT-${year}-${String(count).padStart(4, '0')}`
}

// ── Status display config ──────────────────────────────────
export const STATUS_CONFIG = {
  open:         { label: 'Open',          color: '#3b82f6', bg: '#1e3a5f' },
  assigned:     { label: 'Assigned',      color: '#8b5cf6', bg: '#2e1065' },
  in_progress:  { label: 'In Progress',   color: '#f59e0b', bg: '#451a03' },
  pending_user: { label: 'Pending User',  color: '#06b6d4', bg: '#083344' },
  escalated:    { label: 'Escalated→L2',  color: '#f97316', bg: '#431407' },
  resolved:     { label: 'Resolved',      color: '#10b981', bg: '#052e16' },
  closed:       { label: 'Closed',        color: '#64748b', bg: '#1e293b' },
}

// ── Priority display config ────────────────────────────────
export const PRIORITY_CONFIG = {
  critical: { label: '🔴 Critical', color: '#ef4444', bg: '#450a0a' },
  high:     { label: '🟠 High',     color: '#f97316', bg: '#431407' },
  medium:   { label: '🟡 Medium',   color: '#f59e0b', bg: '#451a03' },
  low:      { label: '🟢 Low',      color: '#10b981', bg: '#052e16' },
}
