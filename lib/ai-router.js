// ── NexDesk AI Ticket Router ──────────────────────────────────
// Reads ticket title + description → decides L1 / L2 / Developer
// No external API needed — keyword-based rules (fast & free)

const L1_KEYWORDS = [
  'password','reset password','forgot password','locked account','unlock',
  'vpn','cannot connect vpn','vpn not working','vpn error',
  'wifi','internet','no network','network slow','slow internet',
  'printer','print','printing','scanner',
  'outlook','email','mail sync','calendar sync','teams',
  'laptop slow','computer slow','pc slow','system slow','freezing',
  'screen','monitor','display','projector',
  'keyboard','mouse','headset','headphone','webcam',
  'windows update','install software','software install',
  'access request','new access','user creation','onboarding',
  'badge','id card','desk','chair',
]

const L2_KEYWORDS = [
  // Application errors
  'api','api error','api failure','api not working','api down','api response',
  '500','error 500','http 500','internal server error','server error',
  '404','401','403','timeout','connection refused',
  'application crash','app crash','app not loading','app down','app error',
  'submit button','button not working','cannot click','not clickable',
  'form not submitting','form error','data not saving','not saving',
  'login error','cannot login','login failed','authentication failed',
  'page not loading','blank page','white screen','black screen',
  'database','db error','query failed','data mismatch','wrong data',
  'export failed','report failed','pdf not generating','excel error',
  'notification not sending','email not triggered','alert not working',
  'integration','webhook','sync failed','data sync',
  'performance issue','very slow','high cpu','memory',
  'sap error','sap crash','sap not opening','oracle error','erp',
  'cors','ssl','certificate','token expired','session expired',
  'bug','defect','issue in application','software bug',
]

const DEVELOPER_KEYWORDS = [
  'code fix','code bug','fix the code','source code',
  'stack trace','null pointer','exception','unhandled error',
  'javascript error','js error','console error','runtime error',
  'deployment','deploy failed','build failed','release',
  'git','repository','merge','commit',
  'json error','json parse','config file','configuration error',
  'database schema','migration','sql error','stored procedure',
  'api endpoint','endpoint missing','route not found',
  'regression','broke after update','broke after deploy',
]

export function analyzeTicket(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase()

  // Score each category
  let l1Score = 0, l2Score = 0, devScore = 0

  L1_KEYWORDS.forEach(kw => { if (text.includes(kw)) l1Score++ })
  L2_KEYWORDS.forEach(kw => { if (text.includes(kw)) l2Score++ })
  DEVELOPER_KEYWORDS.forEach(kw => { if (text.includes(kw)) devScore++ })

  // Priority rules
  let priority = 'medium'
  const criticalWords = ['production down','all users','everyone affected','urgent','critical','p1','not working for all']
  const highWords = ['blocked','cannot work','urgent','asap','important','stuck']
  const lowWords = ['when possible','no rush','minor','cosmetic','suggestion']

  if (criticalWords.some(w => text.includes(w))) priority = 'critical'
  else if (highWords.some(w => text.includes(w))) priority = 'high'
  else if (lowWords.some(w => text.includes(w))) priority = 'low'

  // Routing decision
  let team = 'L1'
  let isCodeBug = false
  let needsDeveloper = false
  let confidence = 70
  let reason = ''
  let suggestion = ''

  if (devScore > 0 && devScore >= l2Score) {
    team = 'DEVELOPER'
    isCodeBug = true
    needsDeveloper = true
    confidence = Math.min(95, 70 + devScore * 8)
    reason = 'Detected code-level keywords — stack trace, deployment, or code error mentioned'
    suggestion = 'This appears to be a code-level issue. Developer team should review the error logs and check recent deployments.'
  } else if (l2Score > l1Score && l2Score > 0) {
    team = 'L2'
    isCodeBug = l2Score >= 2
    needsDeveloper = l2Score >= 3
    confidence = Math.min(95, 70 + l2Score * 7)
    reason = 'Detected application-level error — API, crash, or technical bug keywords found'
    suggestion = getL2Suggestion(text)
  } else if (l1Score > 0) {
    team = 'L1'
    confidence = Math.min(95, 70 + l1Score * 8)
    reason = 'Common IT issue — password, network, hardware, or access problem'
    suggestion = getL1Suggestion(text)
  } else {
    team = 'L1'
    confidence = 60
    reason = 'No specific pattern detected — assigned to L1 for initial assessment'
    suggestion = 'Please provide more details about the issue for faster resolution.'
  }

  // Auto-category detection
  let categoryCode = detectCategory(text)

  return {
    team,
    priority,
    isCodeBug,
    needsDeveloper,
    confidence,
    reason,
    suggestion,
    categoryCode,
  }
}

function detectCategory(text) {
  if (/password|login|access|permission|locked|account/.test(text)) return 'ACCESS'
  if (/vpn|wifi|internet|network|connectivity/.test(text)) return 'NETWORK'
  if (/printer|laptop|hardware|screen|keyboard|mouse/.test(text)) return 'HARDWARE'
  if (/outlook|email|mail|calendar|teams/.test(text)) return 'EMAIL'
  if (/sap|oracle|erp/.test(text)) return 'SAP'
  if (/api|500|crash|bug|error|button|form|application/.test(text)) return 'APP_BUG'
  if (/windows|install|software|update|driver/.test(text)) return 'SOFTWARE'
  return 'OTHER'
}

function getL1Suggestion(text) {
  if (/password|locked/.test(text))   return 'Try resetting password via the forgot password link. If account is locked, L1 agent will unlock it within 30 minutes.'
  if (/vpn/.test(text))               return 'Check VPN client version, try reconnecting. If issue persists, L1 agent will guide VPN reconfiguration.'
  if (/printer/.test(text))           return 'Try restarting the printer and reconnecting. L1 will check print spooler service remotely.'
  if (/outlook|email/.test(text))     return 'Try restarting Outlook. L1 agent will check Exchange server connectivity and mailbox settings.'
  if (/slow|performance/.test(text))  return 'L1 agent will remotely check CPU/RAM usage and clear temporary files.'
  return 'L1 agent will assess and resolve or escalate as needed.'
}

function getL2Suggestion(text) {
  if (/api|500/.test(text))           return 'L2 will check API server health, review error logs, and verify recent deployments for breaking changes.'
  if (/submit|button|click/.test(text)) return 'L2 will check browser console for JavaScript errors, verify form validation logic, and review recent code changes.'
  if (/login|authentication/.test(text)) return 'L2 will check authentication service, token validity, and session management configuration.'
  if (/data|saving|database/.test(text)) return 'L2 will review database connection, check for write permission issues, and verify data integrity.'
  return 'L2 will perform deep technical analysis, review logs, and coordinate with developer team if code fix is needed.'
}

// SLA rules based on priority
export function getSLATimes(priority) {
  const now = new Date()
  const addHours = (h) => new Date(now.getTime() + h * 60 * 60 * 1000)
  switch (priority) {
    case 'critical': return { response: addHours(0.5), resolve: addHours(2)  }
    case 'high':     return { response: addHours(1),   resolve: addHours(4)  }
    case 'medium':   return { response: addHours(4),   resolve: addHours(24) }
    case 'low':      return { response: addHours(24),  resolve: addHours(72) }
    default:         return { response: addHours(4),   resolve: addHours(24) }
  }
}

// Status flow
export const STATUS_FLOW = {
  open:         { label: 'Open',         color: '#3b82f6', next: ['assigned','closed'] },
  assigned:     { label: 'Assigned',     color: '#f59e0b', next: ['in_progress','open'] },
  in_progress:  { label: 'In Progress',  color: '#8b5cf6', next: ['pending_user','resolved','escalated'] },
  pending_user: { label: 'Pending User', color: '#06b6d4', next: ['in_progress','closed'] },
  escalated:    { label: 'Escalated',    color: '#ef4444', next: ['in_progress','resolved'] },
  resolved:     { label: 'Resolved',     color: '#10b981', next: ['closed','open'] },
  closed:       { label: 'Closed',       color: '#64748b', next: [] },
}

export const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.15)'   },
  high:     { label: 'High',     color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
  medium:   { label: 'Medium',   color: '#3b82f6', bg: 'rgba(59,130,246,0.15)'  },
  low:      { label: 'Low',      color: '#10b981', bg: 'rgba(16,185,129,0.15)'  },
}

export const TEAM_CONFIG = {
  L1:        { label: 'L1 Support',    color: '#3b82f6', icon: '👤' },
  L2:        { label: 'L2 Support',    color: '#8b5cf6', icon: '🛠️' },
  DEVELOPER: { label: 'Developer',     color: '#f59e0b', icon: '👨‍💻' },
  MANAGER:   { label: 'IT Manager',    color: '#ef4444', icon: '👔' },
}
