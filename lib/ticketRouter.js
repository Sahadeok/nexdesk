// lib/ticketRouter.js — shared config + SLA helper

export const STATUS_CONFIG = {
  open:         { label:'Open',          color:'#60a5fa', bg:'#1e3a5f' },
  in_progress:  { label:'In Progress',   color:'#a78bfa', bg:'#2e1065' },
  escalated:    { label:'Escalated',     color:'#fb923c', bg:'#431407' },
  pending_user: { label:'Pending User',  color:'#22d3ee', bg:'#083344' },
  resolved:     { label:'Resolved',      color:'#34d399', bg:'#022c22' },
  closed:       { label:'Closed',        color:'#64748b', bg:'#1f2937' },
}

export const PRIORITY_CONFIG = {
  critical: { label:'🔴 Critical', color:'#ef4444', bg:'#1c0000' },
  high:     { label:'🟠 High',     color:'#f97316', bg:'#1c0a00' },
  medium:   { label:'🟡 Medium',   color:'#f59e0b', bg:'#1c1000' },
  low:      { label:'🟢 Low',      color:'#10b981', bg:'#022c22' },
}

// SLA hours per priority (BFSI standard)
const SLA_HOURS = { critical: 4, high: 8, medium: 24, low: 72 }

/**
 * getSLAStatus
 * @param {string|null} sla_resolve_due  — ISO date string from DB (may be null)
 * @param {string}      status           — ticket status
 * @param {string|null} created_at       — ticket creation time (used if no due date)
 * @param {string|null} priority         — ticket priority (used if no due date)
 */
export function getSLAStatus(sla_resolve_due, status, created_at, priority) {
  // Resolved/closed → SLA met
  if (['resolved', 'closed'].includes(status)) {
    return { label: 'Met', icon: '✅', color: '#34d399', bg: '#022c22' }
  }

  // Compute due date — use DB value OR calculate from created_at + priority
  let dueDate = sla_resolve_due ? new Date(sla_resolve_due) : null

  if (!dueDate && created_at && priority) {
    const hours = SLA_HOURS[priority] || 24
    dueDate = new Date(new Date(created_at).getTime() + hours * 60 * 60 * 1000)
  }

  if (!dueDate) {
    return { label: 'Not Set', icon: '⚪', color: '#64748b', bg: '#1f2937' }
  }

  const now      = new Date()
  const msLeft   = dueDate - now
  const hrsLeft  = msLeft / (1000 * 60 * 60)

  if (msLeft < 0) {
    const hrsOver = Math.abs(hrsLeft)
    const label   = hrsOver > 24 ? `${Math.floor(hrsOver/24)}d over` : `${Math.ceil(hrsOver)}h over`
    return { label: `BREACHED ${label}`, icon: '🔴', color: '#ef4444', bg: '#1c0000' }
  }
  if (hrsLeft <= 1) {
    return { label: `${Math.round(hrsLeft * 60)}m left`, icon: '🟠', color: '#f97316', bg: '#1c0a00' }
  }
  if (hrsLeft <= 4) {
    return { label: `${hrsLeft.toFixed(1)}h left`, icon: '🟡', color: '#f59e0b', bg: '#1c1000' }
  }
  return { label: `${Math.round(hrsLeft)}h left`, icon: '🟢', color: '#10b981', bg: '#022c22' }
}
