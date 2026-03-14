'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../lib/supabase'
import GlobalNav from '../components/GlobalNav'

function getSupabase() { return createClient() }

// Known issue patterns mapped to instant resolutions
const RESOLUTION_KB = [
  {
    pattern: ['nav not loading', 'nav fetch', 'bse api', 'nse api', 'market data', 'fund price'],
    category: 'market_data',
    title: 'NAV / Market Data Not Loading',
    icon: '📈',
    cause: 'BSE/NSE API is returning errors or timing out. This usually happens during market hours or after trading halts.',
    steps: [
      'Check BSE/NSE API status on Health Monitor dashboard',
      'Try refreshing after 2-3 minutes — APIs auto-recover',
      'Clear browser cache (Ctrl+Shift+Delete)',
      'Switch to fallback NAV source in app settings',
      'If persists > 15 mins, escalate to L2 team',
    ],
    autoFix: true,
    team: 'L2',
  },
  {
    pattern: ['payment failed', 'sip failed', 'transaction failed', 'payment gateway', 'razorpay'],
    category: 'payments',
    title: 'SIP / Payment Failure',
    icon: '💳',
    cause: 'Payment gateway timeout or bank rejection. Most failures are temporary and resolve on retry.',
    steps: [
      'Wait 5 minutes and retry the payment',
      'Verify bank account has sufficient balance',
      'Check if bank is under scheduled maintenance',
      'Try a different payment method (UPI / Net Banking)',
      'If amount was debited but SIP not registered, raise a ticket immediately',
    ],
    autoFix: false,
    team: 'L1',
  },
  {
    pattern: ['kyc', 'kyc stuck', 'kyc pending', 'cams', 'verification failed', 'document'],
    category: 'kyc',
    title: 'KYC Verification Stuck',
    icon: '🔍',
    cause: 'KYC/CAMS API delay or document quality issue. Processing can take 24-48 hours normally.',
    steps: [
      'Check KYC status on CAMS website directly',
      'Ensure uploaded documents are clear and not expired',
      'Re-upload documents if image quality is poor',
      'Wait 24 hours — KYC processing is not instant',
      'If status is "Rejected", check rejection reason and resubmit',
    ],
    autoFix: false,
    team: 'L2',
  },
  {
    pattern: ['otp not received', 'otp not coming', 'sms not received', 'login otp'],
    category: 'notifications',
    title: 'OTP Not Received',
    icon: '📱',
    cause: 'SMS gateway delay or mobile number mismatch. Usually resolves within 2-3 minutes.',
    steps: [
      'Wait 2-3 minutes and request OTP again',
      'Check if mobile number registered is correct',
      'Check spam/DND status of your number',
      'Try email OTP as an alternative',
      'Contact mobile carrier if SMS is blocked',
    ],
    autoFix: true,
    team: 'L1',
  },
  {
    pattern: ['portfolio not updating', 'folio not showing', 'rta sync', 'units not reflecting'],
    category: 'sync',
    title: 'Portfolio / Folio Not Updating',
    icon: '📊',
    cause: 'RTA sync delay. Portfolio updates are processed by RTAs (CAMS/KFintech) — can take up to 3 working days.',
    steps: [
      'Check if transaction is within T+3 processing window',
      'Verify transaction confirmation email/SMS was received',
      'Check CAMS/KFintech portal directly for folio status',
      'Force refresh portfolio in app settings',
      'If > 3 working days, raise a ticket with transaction ID',
    ],
    autoFix: false,
    team: 'L1',
  },
  {
    pattern: ['login failed', 'cannot login', 'password wrong', 'access denied', 'authentication'],
    category: 'auth',
    title: 'Login / Authentication Issue',
    icon: '🔐',
    cause: 'Invalid credentials, locked account, or session expiry.',
    steps: [
      'Check caps lock and verify credentials',
      'Use "Forgot Password" to reset if needed',
      'Clear browser cookies and try again',
      'Try incognito/private window',
      'Account may be locked after 5 failed attempts — wait 30 mins',
    ],
    autoFix: true,
    team: 'L1',
  },
  {
    pattern: ['site down', 'app not loading', 'server error', '500', '503', 'internal server'],
    category: 'core',
    title: 'Application Down / Server Error',
    icon: '🔴',
    cause: 'Server-side error or infrastructure issue. May be a temporary spike or deployment issue.',
    steps: [
      'Check NexDesk Health Monitor for active incidents',
      'Try again in 5 minutes',
      'Clear cache and hard refresh (Ctrl+Shift+R)',
      'Check official status page for announcements',
      'If critical, raise P1 ticket immediately',
    ],
    autoFix: false,
    team: 'L2',
  },
]

export default function AIResolutionEngine() {
  const router   = useRouter()
  const supabase = getSupabase()

  const [profile,    setProfile]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [issue,      setIssue]      = useState('')
  const [analyzing,  setAnalyzing]  = useState(false)
  const [result,     setResult]     = useState(null)  // { resolution, aiSuggestion, matched }
  const [step,       setStep]       = useState('input')  // input | analyzing | resolution | ticket
  const [resolved,   setResolved]   = useState(null)
  const [aiMsg,      setAiMsg]      = useState('')
  const [ticketData, setTicketData] = useState(null)
  const [submitted,  setSubmitted]  = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    setProfile(p)
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // Match issue to known resolution
  function matchResolution(text) {
    const lower = text.toLowerCase()
    for (const kb of RESOLUTION_KB) {
      if (kb.pattern.some(p => lower.includes(p))) return kb
    }
    return null
  }

  async function analyzeIssue() {
    if (!issue.trim()) return
    setStep('analyzing')
    setAnalyzing(true)

    // Simulate AI analysis delay
    await new Promise(r => setTimeout(r, 2000))

    const matched = matchResolution(issue)

    // Call AI for additional context
    let aiSuggestion = ''
    try {
      const res = await fetch('/api/ai-resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue, matched: matched?.title }),
      })
      const data = await res.json()
      aiSuggestion = data.suggestion || ''
    } catch(e) {}

    setResult({ matched, aiSuggestion })
    setAnalyzing(false)
    setStep('resolution')
  }

  async function handleResolved(yes) {
    setResolved(yes)
    if (yes) {
      setStep('done')
      // Log resolution
      await supabase.from('resolution_logs').insert({
        user_id:      profile?.id,
        issue_text:   issue,
        category:     result?.matched?.category || 'unknown',
        resolved:     true,
        created_at:   new Date().toISOString(),
      }).select()
    } else {
      // Pre-fill ticket data
      setTicketData({
        title:    issue.length > 80 ? issue.substring(0,80) + '...' : issue,
        category: result?.matched?.category || 'other',
        team:     result?.matched?.team || 'L1',
        priority: 'medium',
        description: `Issue reported via AI Resolution Engine:\n\n${issue}\n\nAI Analysis: ${result?.matched?.title || 'No pattern matched'}\n\nResolution steps were attempted but issue persists.`,
      })
      setStep('ticket')
    }
  }

  async function raiseTicket() {
    if (!ticketData) return
    setSubmitted(true)
    try {

  const CATEGORY_MAP = {
    'payments':      'a645a3db-6ffc-46cf-85b2-e82cc55f4694',
    'kyc':           '80645c4a-9c43-483e-b9eb-311f95f35e8b',
    'market_data':   'ede00588-bad5-4852-8254-b332e1c97a96',
    'auth':          '4f516224-3d9c-47c5-a488-198e691757c7',
    'sync':          'ede00588-bad5-4852-8254-b332e1c97a96',
    'core':          'ede00588-bad5-4852-8254-b332e1c97a96',
    'notifications': '3fa20d27-afb4-482d-be84-9db02661b2ac',
  }
  const category_id = CATEGORY_MAP[ticketData.category] || '5169dd29-1514-4e16-9e87-f68357115e69'

  // Generate ticket number
  const { count } = await supabase.from('tickets').select('*', { count:'exact', head:true })
  const year = new Date().getFullYear()
  const num  = String((count || 0) + 1).padStart(4, '0')
  const ticket_number = `TKT-${year}-${num}`

      const { data: ticket } = await supabase.from('tickets').insert({
        ticket_number,
        title:         ticketData.title,
        description:   ticketData.description,
        category_id,
        priority:      ticketData.priority,
        status:        'open',
        assigned_team: ticketData.team,
        created_by:    profile?.id,
        raised_by:     profile?.id,
        source:        'ai_resolution_engine',
        created_at:    new Date().toISOString(),
      }).select().single()

      if (ticket) {
        // Log as unresolved
        await supabase.from('resolution_logs').insert({
          user_id:    profile?.id,
          issue_text: issue,
          category:   ticketData.category,
          resolved:   false,
          ticket_id:  ticket.id,
          created_at: new Date().toISOString(),
        })
        setStep('ticket_raised')
        setTicketData(prev => ({ ...prev, id: ticket.id, number: ticket.ticket_number }))

        // 🤖 Auto-trigger AI Diagnosis in background
        try {
          fetch('/api/ticket-diagnosis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket_id: ticket.id })
          })
        } catch(_) {}
      }
    } catch(e) {
      setSubmitted(false)
    }
  }

  function reset() {
    setIssue(''); setResult(null); setStep('input')
    setResolved(null); setTicketData(null); setSubmitted(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  if (loading) return <Loader />

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.05)} }
        @keyframes scan    { 0%{transform:translateY(-100%)} 100%{transform:translateY(400%)} }
        .step-btn:hover { opacity:0.85!important; transform:translateY(-1px); }
        .quick-btn:hover { border-color:#3b82f6!important; color:#60a5fa!important; }
      `}</style>

      <GlobalNav title="AI Resolution Engine" />

      <div style={{ maxWidth:760, margin:'0 auto', padding:'40px 24px' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:40, animation:'fadeUp 0.5s ease both' }}>
          <div style={{ width:64, height:64, borderRadius:18, background:'linear-gradient(135deg,#1e3a5f,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 16px' }}>🤖</div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, marginBottom:8 }}>AI Resolution Engine</h1>
          <p style={{ color:'#64748b', fontSize:15 }}>Describe your issue — AI will diagnose and resolve it instantly</p>
        </div>

        {/* Progress steps */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0, marginBottom:40 }}>
          {[
            { key:'input',      label:'Describe' },
            { key:'analyzing',  label:'Analyzing' },
            { key:'resolution', label:'Resolution' },
            { key:'ticket',     label:'Ticket' },
          ].map((s, i) => {
            const steps = ['input','analyzing','resolution','ticket','ticket_raised','done']
            const current = steps.indexOf(step)
            const sIdx = steps.indexOf(s.key)
            const done = current > sIdx
            const active = current === sIdx
            return (
              <div key={s.key} style={{ display:'flex', alignItems:'center' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, background: done?'#10b981':active?'#3b82f6':'#1f2d45', color: done||active?'#fff':'#475569', border: active?'2px solid #60a5fa':'2px solid transparent', transition:'all 0.3s' }}>
                    {done ? '✓' : i+1}
                  </div>
                  <span style={{ fontSize:10, color:active?'#60a5fa':done?'#34d399':'#334155', fontWeight:active?600:400 }}>{s.label}</span>
                </div>
                {i < 3 && <div style={{ width:60, height:2, background: done?'#10b981':'#1f2d45', margin:'0 4px 20px', transition:'background 0.3s' }}/>}
              </div>
            )
          })}
        </div>

        {/* ── STEP: INPUT ── */}
        {step === 'input' && (
          <div style={{ animation:'fadeUp 0.4s ease both' }}>
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:20, padding:32 }}>
              <label style={{ fontSize:13, color:'#64748b', fontWeight:600, display:'block', marginBottom:12 }}>
                What issue are you facing?
              </label>
              <textarea
                ref={inputRef}
                value={issue}
                onChange={e => setIssue(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter' && e.ctrlKey) analyzeIssue() }}
                placeholder="e.g. My SIP payment failed, NAV is not loading, KYC verification is stuck, OTP not received..."
                style={{ width:'100%', minHeight:120, padding:'14px 16px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:12, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:14, resize:'vertical', outline:'none', lineHeight:1.6, boxSizing:'border-box' }}
                onFocus={e => e.target.style.borderColor='#3b82f6'}
                onBlur={e => e.target.style.borderColor='#1f2d45'}
              />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
                <span style={{ fontSize:12, color:'#334155' }}>Ctrl+Enter to analyze</span>
                <button onClick={analyzeIssue} disabled={!issue.trim()}
                  style={{ padding:'11px 28px', background: issue.trim()?'linear-gradient(135deg,#2563eb,#3b82f6)':'#1f2d45', border:'none', borderRadius:10, color: issue.trim()?'#fff':'#475569', cursor: issue.trim()?'pointer':'not-allowed', fontSize:14, fontWeight:600, transition:'all 0.2s' }}>
                  🔍 Analyze Issue
                </button>
              </div>
            </div>

            {/* Quick issues */}
            <div style={{ marginTop:24 }}>
              <p style={{ fontSize:12, color:'#334155', fontWeight:600, marginBottom:10, textTransform:'uppercase', letterSpacing:'1px' }}>Common Issues</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {[
                  'NAV not loading',
                  'SIP payment failed',
                  'KYC verification stuck',
                  'OTP not received',
                  'Portfolio not updating',
                  'Cannot login',
                  'App not loading',
                ].map(q => (
                  <button key={q} className="quick-btn" onClick={() => setIssue(q)}
                    style={{ padding:'7px 14px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:20, color:'#64748b', cursor:'pointer', fontSize:13, transition:'all 0.2s' }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: ANALYZING ── */}
        {step === 'analyzing' && (
          <div style={{ animation:'fadeUp 0.4s ease both', textAlign:'center' }}>
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:20, padding:48, position:'relative', overflow:'hidden' }}>
              {/* Scan line */}
              <div style={{ position:'absolute', left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,#3b82f6,transparent)', animation:'scan 1.5s ease-in-out infinite' }}/>
              <div style={{ width:64, height:64, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#3b82f6', animation:'spin 0.8s linear infinite', margin:'0 auto 24px' }}/>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, marginBottom:8 }}>Analyzing your issue...</h3>
              <p style={{ color:'#64748b', fontSize:14 }}>Matching against known patterns and generating resolution</p>
              <div style={{ marginTop:24, display:'flex', flexDirection:'column', gap:8 }}>
                {['Scanning issue description...', 'Matching error patterns...', 'Generating resolution steps...'].map((t,i) => (
                  <div key={t} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 16px', background:'#0f172a', borderRadius:9, animation:`fadeUp 0.4s ${i*0.3}s ease both`, opacity:0 }}>
                    <div style={{ width:16, height:16, borderRadius:'50%', border:'2px solid #1f2d45', borderTopColor:'#06b6d4', animation:'spin 0.8s linear infinite', flexShrink:0 }}/>
                    <span style={{ fontSize:13, color:'#475569' }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: RESOLUTION ── */}
        {step === 'resolution' && result && (
          <div style={{ animation:'fadeUp 0.4s ease both' }}>
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:20, overflow:'hidden' }}>
              {/* Match banner */}
              <div style={{ padding:'16px 24px', background: result.matched ? 'linear-gradient(135deg,#052e16,#083344)' : 'linear-gradient(135deg,#1a1208,#2d1a02)', borderBottom:'1px solid #1f2d45', display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:24 }}>{result.matched?.icon || '🤖'}</span>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color: result.matched?'#34d399':'#fbbf24' }}>
                    {result.matched ? `✅ Issue Identified: ${result.matched.title}` : '🔍 General Diagnosis'}
                  </div>
                  <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>
                    {result.matched ? 'Matched against known issue patterns' : 'AI-generated resolution based on your description'}
                  </div>
                </div>
              </div>

              <div style={{ padding:24 }}>
                {/* Issue recap */}
                <div style={{ padding:'10px 14px', background:'#0f172a', borderRadius:9, fontSize:13, color:'#64748b', marginBottom:20, borderLeft:'3px solid #334155' }}>
                  <strong style={{ color:'#475569' }}>Your issue:</strong> {issue}
                </div>

                {/* Root cause */}
                {result.matched?.cause && (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:12, color:'#475569', fontWeight:600, textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>🔎 Root Cause</div>
                    <p style={{ fontSize:14, color:'#94a3b8', lineHeight:1.7 }}>{result.matched.cause}</p>
                  </div>
                )}

                {/* Resolution steps */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:12, color:'#475569', fontWeight:600, textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 }}>🛠️ Resolution Steps</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {(result.matched?.steps || ['Try restarting the application', 'Clear browser cache', 'Check your internet connection', 'Try again in a few minutes']).map((s, i) => (
                      <div key={i} style={{ display:'flex', gap:12, padding:'10px 14px', background:'#0f172a', borderRadius:9, alignItems:'flex-start' }}>
                        <div style={{ width:22, height:22, borderRadius:'50%', background:'#1e3a5f', color:'#60a5fa', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                          {i+1}
                        </div>
                        <span style={{ fontSize:14, color:'#94a3b8', lineHeight:1.6 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI additional suggestion */}
                {result.aiSuggestion && (
                  <div style={{ padding:'14px 16px', background:'linear-gradient(135deg,#1a1a2e,#1e1b4b)', border:'1px solid #6366f140', borderRadius:12, marginBottom:20 }}>
                    <div style={{ fontSize:12, color:'#a5b4fc', fontWeight:600, marginBottom:6 }}>🧠 AI Insight</div>
                    <p style={{ fontSize:13, color:'#818cf8', lineHeight:1.7 }}>{result.aiSuggestion}</p>
                  </div>
                )}

                {/* Did this help? */}
                {resolved === null && (
                  <div style={{ borderTop:'1px solid #1f2d45', paddingTop:20, textAlign:'center' }}>
                    <p style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Did these steps resolve your issue?</p>
                    <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
                      <button className="step-btn" onClick={() => handleResolved(true)}
                        style={{ padding:'12px 32px', background:'linear-gradient(135deg,#052e16,#10b981)', border:'1px solid #10b98140', borderRadius:12, color:'#34d399', cursor:'pointer', fontSize:15, fontWeight:600, transition:'all 0.2s' }}>
                        ✅ Yes, Issue Resolved!
                      </button>
                      <button className="step-btn" onClick={() => handleResolved(false)}
                        style={{ padding:'12px 32px', background:'linear-gradient(135deg,#1a0a2e,#450a0a)', border:'1px solid #ef444430', borderRadius:12, color:'#fca5a5', cursor:'pointer', fontSize:15, fontWeight:600, transition:'all 0.2s' }}>
                        ❌ No, Still Having Issue
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: RAISE TICKET ── */}
        {step === 'ticket' && ticketData && (
          <div style={{ animation:'fadeUp 0.4s ease both' }}>
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:20, overflow:'hidden' }}>
              <div style={{ padding:'16px 24px', background:'linear-gradient(135deg,#1a0a2e,#2e1065)', borderBottom:'1px solid #1f2d45' }}>
                <div style={{ fontSize:15, fontWeight:700, color:'#a78bfa' }}>🎫 Raise Support Ticket</div>
                <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>Pre-filled with your issue and AI analysis</div>
              </div>
              <div style={{ padding:24, display:'flex', flexDirection:'column', gap:14 }}>
                {[
                  { label:'Issue Title', key:'title' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize:12, color:'#475569', fontWeight:600, display:'block', marginBottom:6 }}>{f.label}</label>
                    <input value={ticketData[f.key]} onChange={e => setTicketData(p => ({...p,[f.key]:e.target.value}))}
                      style={{ width:'100%', padding:'10px 14px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:'none', boxSizing:'border-box' }}/>
                  </div>
                ))}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ fontSize:12, color:'#475569', fontWeight:600, display:'block', marginBottom:6 }}>Priority</label>
                    <select value={ticketData.priority} onChange={e => setTicketData(p => ({...p,priority:e.target.value}))}
                      style={{ width:'100%', padding:'10px 14px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:'none' }}>
                      {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:12, color:'#475569', fontWeight:600, display:'block', marginBottom:6 }}>Assign To</label>
                    <select value={ticketData.team} onChange={e => setTicketData(p => ({...p,team:e.target.value}))}
                      style={{ width:'100%', padding:'10px 14px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:'none' }}>
                      {['L1','L2','DEVELOPER'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize:12, color:'#475569', fontWeight:600, display:'block', marginBottom:6 }}>Description</label>
                  <textarea value={ticketData.description} onChange={e => setTicketData(p => ({...p,description:e.target.value}))}
                    style={{ width:'100%', minHeight:100, padding:'10px 14px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:'none', resize:'vertical', lineHeight:1.6, boxSizing:'border-box' }}/>
                </div>
                <div style={{ display:'flex', gap:10, paddingTop:4 }}>
                  <button onClick={raiseTicket} disabled={submitted}
                    style={{ flex:2, padding:'13px', background: submitted?'#1f2d45':'linear-gradient(135deg,#2563eb,#3b82f6)', border:'none', borderRadius:11, color: submitted?'#475569':'#fff', cursor: submitted?'not-allowed':'pointer', fontWeight:600, fontSize:15 }}>
                    {submitted ? '⏳ Raising Ticket...' : '🎫 Raise Ticket'}
                  </button>
                  <button onClick={reset}
                    style={{ flex:1, padding:'13px', background:'transparent', border:'1px solid #1f2d45', borderRadius:11, color:'#64748b', cursor:'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: TICKET RAISED ── */}
        {step === 'ticket_raised' && (
          <div style={{ animation:'fadeUp 0.4s ease both', textAlign:'center' }}>
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:20, padding:48 }}>
              <div style={{ fontSize:56, marginBottom:16 }}>🎫</div>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, marginBottom:8 }}>Ticket Raised!</h3>
              <p style={{ color:'#64748b', marginBottom:8 }}>Our support team will get back to you shortly.</p>
              {ticketData?.number && <p style={{ color:'#60a5fa', fontWeight:600, fontSize:15 }}>Ticket: #{ticketData.number}</p>}
              <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:28 }}>
                <button onClick={() => router.push('/tickets')}
                  style={{ padding:'11px 24px', background:'#1e3a5f', border:'none', borderRadius:10, color:'#60a5fa', cursor:'pointer', fontSize:14 }}>
                  View My Tickets
                </button>
                <button onClick={reset}
                  style={{ padding:'11px 24px', background:'transparent', border:'1px solid #1f2d45', borderRadius:10, color:'#64748b', cursor:'pointer', fontSize:14 }}>
                  Report Another Issue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: DONE (resolved) ── */}
        {step === 'done' && (
          <div style={{ animation:'fadeUp 0.4s ease both', textAlign:'center' }}>
            <div style={{ background:'#111827', border:'1px solid #10b98130', borderRadius:20, padding:48 }}>
              <div style={{ fontSize:56, marginBottom:16, animation:'pulse 1s ease 2' }}>🎉</div>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, marginBottom:8, color:'#34d399' }}>Issue Resolved!</h3>
              <p style={{ color:'#64748b', marginBottom:24 }}>Great! Glad the AI resolution helped. Your feedback helps us improve.</p>
              <button onClick={reset}
                style={{ padding:'11px 28px', background:'linear-gradient(135deg,#052e16,#10b981)', border:'1px solid #10b98140', borderRadius:10, color:'#34d399', cursor:'pointer', fontSize:14, fontWeight:600 }}>
                Report Another Issue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Loader() {
  return <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:40,height:40,borderRadius:'50%',border:'3px solid #1f2d45',borderTopColor:'#06b6d4',animation:'spin 0.7s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}
