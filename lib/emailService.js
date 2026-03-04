// ============================================================
// NexDesk Email Notification Service
// Phase 3B — Email Notifications
// 
// STATUS: Code ready. Configure provider before going live.
// 
// SETUP (choose one provider):
// Option A - Resend (recommended): resend.com → get API key
//   Add to .env.local: RESEND_API_KEY=re_xxxxx
//   Add to .env.local: EMAIL_FROM=support@yourdomain.com
//
// Option B - SendGrid: sendgrid.com → get API key
//   Add to .env.local: SENDGRID_API_KEY=SG.xxxxx
//
// Option C - Gmail SMTP:
//   Add to .env.local: GMAIL_USER=your@gmail.com
//   Add to .env.local: GMAIL_PASS=your_app_password
// ============================================================

const EMAIL_FROM    = process.env.EMAIL_FROM    || 'support@nexdesk.com'
const RESEND_KEY    = process.env.RESEND_API_KEY
const IS_PROD       = process.env.NODE_ENV === 'production' && !!RESEND_KEY

// ── Core send function ────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  if (!IS_PROD) {
    // In development — just log to console, don't send
    console.log('\n📧 [EMAIL MOCK - NOT SENT IN DEV]')
    console.log('To:     ', to)
    console.log('Subject:', subject)
    console.log('─────────────────────────────────')
    return { success: true, mock: true }
  }

  try {
    // Using Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`,
      },
      body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Email send failed')
    return { success: true, id: data.id }
  } catch(err) {
    console.error('Email error:', err)
    return { success: false, error: err.message }
  }
}

// ── Email Templates ──────────────────────────────────────

function templateBase(content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: 'DM Sans', Arial, sans-serif; background:#0a0e1a; margin:0; padding:20px; }
    .container { max-width:600px; margin:0 auto; background:#111827; border-radius:16px; overflow:hidden; border:1px solid #1f2d45; }
    .header { background:linear-gradient(135deg,#1e3a5f,#083344); padding:24px 32px; display:flex; align-items:center; gap:12px; }
    .logo { font-size:24px; font-weight:800; color:#e2e8f0; }
    .logo span { color:#06b6d4; }
    .body { padding:28px 32px; color:#cbd5e1; }
    .badge { display:inline-block; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:600; margin:0 4px 4px 0; }
    .btn { display:inline-block; padding:12px 24px; background:linear-gradient(135deg,#2563eb,#3b82f6); color:#fff; text-decoration:none; border-radius:10px; font-weight:600; margin-top:16px; }
    .footer { padding:16px 32px; background:#0f172a; color:#475569; font-size:12px; text-align:center; border-top:1px solid #1f2d45; }
    h2 { color:#e2e8f0; margin:0 0 12px; font-size:20px; }
    p { color:#94a3b8; line-height:1.7; margin:8px 0; }
    .field { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #1f2d45; }
    .field-label { color:#475569; font-size:13px; }
    .field-value { color:#e2e8f0; font-size:13px; font-weight:500; }
    .alert-box { background:#450a0a; border:1px solid #ef444430; border-radius:10px; padding:14px 18px; margin:16px 0; }
    .success-box { background:#052e16; border:1px solid #10b98130; border-radius:10px; padding:14px 18px; margin:16px 0; }
    .info-box { background:#1e3a5f; border:1px solid #3b82f630; border-radius:10px; padding:14px 18px; margin:16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span style="font-size:24px">⚡</span>
      <span class="logo">Nex<span>Desk</span></span>
      <span style="color:#475569;font-size:13px;margin-left:auto">IT Support Portal</span>
    </div>
    <div class="body">${content}</div>
    <div class="footer">This is an automated message from NexDesk IT Support Portal. Do not reply to this email.</div>
  </div>
</body>
</html>`
}

// ── 1. Ticket Created ────────────────────────────────────
export async function emailTicketCreated({ to, userName, ticketNumber, title, priority, category, slaDeadline, ticketUrl }) {
  const html = templateBase(`
    <h2>🎫 New Ticket Created</h2>
    <p>Hello <strong>${userName}</strong>, your IT support ticket has been raised successfully.</p>
    <div class="info-box">
      <div class="field"><span class="field-label">Ticket #</span><span class="field-value" style="color:#60a5fa;font-family:monospace">${ticketNumber}</span></div>
      <div class="field"><span class="field-label">Issue</span><span class="field-value">${title}</span></div>
      <div class="field"><span class="field-label">Category</span><span class="field-value">${category}</span></div>
      <div class="field"><span class="field-label">Priority</span><span class="field-value">${priority}</span></div>
      <div class="field" style="border:none"><span class="field-label">SLA Deadline</span><span class="field-value">${slaDeadline}</span></div>
    </div>
    <p>Our team will start working on this shortly. You will receive updates as the status changes.</p>
    <a href="${ticketUrl}" class="btn">View Ticket →</a>
  `)
  return sendEmail({ to, subject: `[${ticketNumber}] Ticket Created — ${title}`, html })
}

// ── 2. Ticket Resolved ───────────────────────────────────
export async function emailTicketResolved({ to, userName, ticketNumber, title, resolutionNotes, ticketUrl }) {
  const html = templateBase(`
    <h2>✅ Ticket Resolved</h2>
    <p>Hello <strong>${userName}</strong>, your IT support ticket has been resolved.</p>
    <div class="success-box">
      <div class="field"><span class="field-label">Ticket #</span><span class="field-value" style="color:#34d399;font-family:monospace">${ticketNumber}</span></div>
      <div class="field" style="border:none"><span class="field-label">Issue</span><span class="field-value">${title}</span></div>
    </div>
    ${resolutionNotes ? `
    <div style="background:#0f172a;border-radius:10px;padding:14px 18px;margin:16px 0;">
      <div style="font-size:12px;color:#475569;font-weight:600;margin-bottom:6px">RESOLUTION NOTES</div>
      <p style="color:#94a3b8;margin:0">${resolutionNotes}</p>
    </div>` : ''}
    <p>If your issue is not fully resolved, please reopen the ticket or raise a new one.</p>
    <a href="${ticketUrl}" class="btn">View Ticket →</a>
  `)
  return sendEmail({ to, subject: `[${ticketNumber}] ✅ Resolved — ${title}`, html })
}

// ── 3. SLA Breach Alert ──────────────────────────────────
export async function emailSLABreach({ to, agentName, ticketNumber, title, priority, team, breachTime, ticketUrl }) {
  const html = templateBase(`
    <h2>🚨 SLA Breach Alert</h2>
    <p>Hello <strong>${agentName}</strong>, the following ticket has breached its SLA deadline and requires immediate attention.</p>
    <div class="alert-box">
      <div style="font-size:16px;font-weight:700;color:#ef4444;margin-bottom:12px">⏰ SLA BREACHED — IMMEDIATE ACTION REQUIRED</div>
      <div class="field"><span class="field-label">Ticket #</span><span class="field-value" style="color:#fca5a5;font-family:monospace">${ticketNumber}</span></div>
      <div class="field"><span class="field-label">Issue</span><span class="field-value">${title}</span></div>
      <div class="field"><span class="field-label">Priority</span><span class="field-value">${priority}</span></div>
      <div class="field"><span class="field-label">Assigned Team</span><span class="field-value">${team}</span></div>
      <div class="field" style="border:none"><span class="field-label">Breached At</span><span class="field-value">${breachTime}</span></div>
    </div>
    <p>Please take immediate action on this ticket to avoid further SLA violations.</p>
    <a href="${ticketUrl}" class="btn" style="background:linear-gradient(135deg,#dc2626,#ef4444)">View & Resolve Now →</a>
  `)
  return sendEmail({ to, subject: `🚨 SLA BREACH [${ticketNumber}] — ${title}`, html })
}

// ── 4. Ticket Escalated ──────────────────────────────────
export async function emailTicketEscalated({ to, agentName, ticketNumber, title, escalatedFrom, escalatedTo, reason, ticketUrl }) {
  const html = templateBase(`
    <h2>🔺 Ticket Escalated to You</h2>
    <p>Hello <strong>${agentName}</strong>, a ticket has been escalated from <strong>${escalatedFrom}</strong> to <strong>${escalatedTo}</strong> and assigned to your queue.</p>
    <div style="background:#2e1065;border:1px solid #8b5cf640;border-radius:10px;padding:14px 18px;margin:16px 0;">
      <div class="field"><span class="field-label">Ticket #</span><span class="field-value" style="color:#a78bfa;font-family:monospace">${ticketNumber}</span></div>
      <div class="field"><span class="field-label">Issue</span><span class="field-value">${title}</span></div>
      <div class="field"><span class="field-label">Escalated From</span><span class="field-value">${escalatedFrom}</span></div>
      <div class="field" style="border:none"><span class="field-label">Reason</span><span class="field-value">${reason}</span></div>
    </div>
    <p>Please review and take action on this ticket as soon as possible.</p>
    <a href="${ticketUrl}" class="btn" style="background:linear-gradient(135deg,#7c3aed,#8b5cf6)">View Ticket →</a>
  `)
  return sendEmail({ to, subject: `🔺 Escalated to You [${ticketNumber}] — ${title}`, html })
}

// ── 5. Status Update ─────────────────────────────────────
export async function emailStatusUpdate({ to, userName, ticketNumber, title, oldStatus, newStatus, ticketUrl }) {
  const html = templateBase(`
    <h2>🔄 Ticket Status Updated</h2>
    <p>Hello <strong>${userName}</strong>, the status of your ticket has been updated.</p>
    <div class="info-box">
      <div class="field"><span class="field-label">Ticket #</span><span class="field-value" style="color:#60a5fa;font-family:monospace">${ticketNumber}</span></div>
      <div class="field"><span class="field-label">Issue</span><span class="field-value">${title}</span></div>
      <div class="field"><span class="field-label">Previous Status</span><span class="field-value">${oldStatus}</span></div>
      <div class="field" style="border:none"><span class="field-label">New Status</span><span class="field-value" style="color:#34d399;font-weight:700">${newStatus}</span></div>
    </div>
    <a href="${ticketUrl}" class="btn">Track Your Ticket →</a>
  `)
  return sendEmail({ to, subject: `[${ticketNumber}] Status: ${newStatus} — ${title}`, html })
}

// ── 6. New Comment ───────────────────────────────────────
export async function emailNewComment({ to, userName, ticketNumber, title, commentBy, commentText, ticketUrl }) {
  const html = templateBase(`
    <h2>💬 New Comment on Your Ticket</h2>
    <p>Hello <strong>${userName}</strong>, an agent has added a comment to your ticket.</p>
    <div class="info-box">
      <div class="field"><span class="field-label">Ticket #</span><span class="field-value" style="color:#60a5fa;font-family:monospace">${ticketNumber}</span></div>
      <div class="field" style="border:none"><span class="field-label">Issue</span><span class="field-value">${title}</span></div>
    </div>
    <div style="background:#0f172a;border-radius:10px;padding:14px 18px;margin:16px 0;border-left:3px solid #3b82f6;">
      <div style="font-size:12px;color:#475569;margin-bottom:6px">Comment by <strong style="color:#60a5fa">${commentBy}</strong></div>
      <p style="color:#94a3b8;margin:0;line-height:1.7">${commentText}</p>
    </div>
    <a href="${ticketUrl}" class="btn">Reply & View Ticket →</a>
  `)
  return sendEmail({ to, subject: `💬 New Comment [${ticketNumber}] — ${title}`, html })
}
