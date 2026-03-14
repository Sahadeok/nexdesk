'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

function getSupabase() { return createClient() }

// ✅ Exact UUIDs from categories table
const CATEGORIES = [
  { value:'4f516224-3d9c-47c5-a488-198e691757c7', label:'🔑 Access & Passwords',    team:'L1' },
  { value:'ede00588-bad5-4852-8254-b332e1c97a96', label:'⚠️ Application Error',     team:'L2' },
  { value:'a645a3db-6ffc-46cf-85b2-e82cc55f4694', label:'🗄️ Data & Database',       team:'L2' },
  { value:'3fa20d27-afb4-482d-be84-9db02661b2ac', label:'📧 Email & Communication', team:'L1' },
  { value:'2928bb1c-48b0-42db-8fe8-19f9225370e6', label:'💻 Hardware & Devices',    team:'L1' },
  { value:'d63c10a3-5964-48b2-9f3d-90a8191d19b4', label:'🌐 Network & VPN',         team:'L1' },
  { value:'5169dd29-1514-4e16-9e87-f68357115e69', label:'❓ Other',                  team:'L1' },
  { value:'812bb78f-879d-44fe-b4ec-67e245bfdd5d', label:'🐌 Performance Issue',     team:'L1' },
  { value:'80645c4a-9c43-483e-b9eb-311f95f35e8b', label:'🔒 Security Issue',        team:'L2' },
  { value:'e804c52e-0516-458b-837a-e83a81048de5', label:'📦 Software Installation', team:'L1' },
]
const PRIORITIES = [
  { value:'low',      label:'🟢 Low',      desc:'Not urgent, can wait' },
  { value:'medium',   label:'🟡 Medium',   desc:'Affects work but workaround exists' },
  { value:'high',     label:'🟠 High',     desc:'Significantly impacting users' },
  { value:'critical', label:'🔴 Critical', desc:'System down, no workaround' },
]

export default function SmartTicket() {
  const router   = useRouter()
  const supabase = getSupabase()

  const [profile,     setProfile]     = useState(null)
  const [screenshot,  setScreenshot]  = useState(null)   // File object
  const [screenshotPreview, setScreenshotPreview] = useState('')
  const [uploading,   setUploading]   = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [submitting,setSubmitting]= useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [msg,       setMsg]       = useState('')

  // Form state
  const [form, setForm] = useState({
    title:       '',
    description: '',
    category:    '5169dd29-1514-4e16-9e87-f68357115e69',
    priority:    'medium',
    steps:       '',       // steps to reproduce
    expected:    '',       // expected behaviour
    actual:      '',       // actual behaviour
    errorLog:    '',       // pasted error/log
    attachedUrl: '',       // screenshot URL
  })

  // AI enrichment state
  const [aiSuggestions, setAiSuggestions] = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    setProfile(p)

    // Check if coming from AI Resolution Engine (query params)
    const params = new URLSearchParams(window.location.search)
    const prefill = params.get('prefill')
    if (prefill) {
      try {
        const data = JSON.parse(decodeURIComponent(prefill))
        setForm(prev => ({ ...prev, ...data }))
      } catch(e) {}
    }
    setLoading(false)
  }

  function setField(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  // AI auto-enrichment: analyze error log and auto-fill fields
  async function analyzeLog() {
    if (!form.errorLog.trim()) return
    setAiLoading(true)
    setAiSuggestions(null)
    try {
      const res = await fetch('/api/smart-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errorLog: form.errorLog, currentForm: form }),
      })
      const data = await res.json()
      if (data.suggestions) {
        setAiSuggestions(data.suggestions)
      }
    } catch(e) {}
    setAiLoading(false)
  }

  function applyAiSuggestions() {
    if (!aiSuggestions) return
    setForm(prev => ({
      ...prev,
      title:       aiSuggestions.title    || prev.title,
      description: aiSuggestions.description || prev.description,
      category:    aiSuggestions.category || prev.category,
      priority:    aiSuggestions.priority || prev.priority,
    }))
    setAiSuggestions(null)
    setMsg('✅ AI suggestions applied!')
    setTimeout(() => setMsg(''), 3000)
  }

  async function handleScreenshot(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setMsg('❌ Only image files allowed'); return }
    if (file.size > 5 * 1024 * 1024)    { setMsg('❌ Image must be under 5MB'); return }
    setScreenshot(file)
    setScreenshotPreview(URL.createObjectURL(file))
  }

  async function uploadScreenshot(ticketId) {
    if (!screenshot) return null
    setUploading(true)
    try {
      const ext      = screenshot.name.split('.').pop()
      const path     = `tickets/${ticketId}/screenshot-${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('ticket-attachments')
        .upload(path, screenshot, { contentType: screenshot.type, upsert: true })
      if (error) { console.error('Upload error:', error); return null }
      const { data } = supabase.storage.from('ticket-attachments').getPublicUrl(path)
      return data?.publicUrl || null
    } catch(e) { console.error(e); return null }
    finally { setUploading(false) }
  }

  async function submitTicket() {
    if (!form.title.trim() || !form.description.trim()) {
      setMsg('❌ Title and description are required')
      return
    }
    setSubmitting(true)

    // Build rich description
    const richDesc = [
      form.description,
      form.steps    ? `\n\n**Steps to Reproduce:**\n${form.steps}` : '',
      form.expected ? `\n\n**Expected Behavior:**\n${form.expected}` : '',
      form.actual   ? `\n\n**Actual Behavior:**\n${form.actual}` : '',
      form.errorLog ? `\n\n**Error Log / Trace:**\n\`\`\`\n${form.errorLog}\n\`\`\`` : '',
    ].join('')

    // Auto-assign team based on category UUID
    const teamMap = {
      '4f516224-3d9c-47c5-a488-198e691757c7': 'L1', // Access & Passwords
      'ede00588-bad5-4852-8254-b332e1c97a96': 'L2', // Application Error
      'a645a3db-6ffc-46cf-85b2-e82cc55f4694': 'L2', // Data & Database
      '3fa20d27-afb4-482d-be84-9db02661b2ac': 'L1', // Email & Communication
      '2928bb1c-48b0-42db-8fe8-19f9225370e6': 'L1', // Hardware & Devices
      'd63c10a3-5964-48b2-9f3d-90a8191d19b4': 'L1', // Network & VPN
      '5169dd29-1514-4e16-9e87-f68357115e69': 'L1', // Other
      '812bb78f-879d-44fe-b4ec-67e245bfdd5d': 'L1', // Performance Issue
      '80645c4a-9c43-483e-b9eb-311f95f35e8b': 'L2', // Security Issue
      'e804c52e-0516-458b-837a-e83a81048de5': 'L1', // Software Installation
    }

    try {
      // Generate ticket_number matching existing pattern TKT-YYYY-XXXX
      const { count } = await supabase.from('tickets').select('*', { count:'exact', head:true })
      const year   = new Date().getFullYear()
      const num    = String((count || 0) + 1).padStart(4, '0')
      const ticket_number = `TKT-${year}-${num}`

      // Upload screenshot — failure never blocks ticket creation
      let screenshotUrl = null
      if (screenshot) {
        try {
          const ext  = screenshot.name.split('.').pop()
          const path = `tickets/pending/screenshot-${Date.now()}.${ext}`
          const { error: upErr } = await supabase.storage
            .from('ticket-attachments')
            .upload(path, screenshot, { contentType: screenshot.type, upsert: true })
          if (!upErr) {
            const { data: urlData } = supabase.storage.from('ticket-attachments').getPublicUrl(path)
            screenshotUrl = urlData?.publicUrl || null
          } else {
            console.warn('Screenshot upload failed (non-blocking):', upErr.message)
          }
        } catch(upEx) {
          console.warn('Screenshot upload error (non-blocking):', upEx.message)
        }
      }

      const { data: ticket, error } = await supabase.from('tickets').insert({
        ticket_number,
        title:         form.title.trim(),
        description:   richDesc,
        category_id:   form.category,
        priority:      form.priority,
        status:        'open',
        assigned_team: teamMap[form.category] || 'L1',
        created_by:    profile?.id,
        raised_by:     profile?.id,
        source:        'smart_ticket',
        attached_url:  screenshotUrl,
        created_at:    new Date().toISOString(),
      }).select().single()

      if (error) { setMsg('❌ ' + error.message); setSubmitting(false); return }

      setSubmitted(true)
      setForm(t => ({ ...t, _ticketId: ticket.id, _ticketNum: ticket.ticket_number }))

      // 🤖 Auto-trigger AI Diagnosis in background
      try {
        fetch('/api/ticket-diagnosis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket_id: ticket.id })
        })
      } catch(_) {}

    } catch(e) {
      setMsg('❌ Something went wrong')
      setSubmitting(false)
    }
  }

  if (loading) return <Loader />

  if (submitted) return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <GlobalNav title="Raise Ticket" />
      <div style={{ maxWidth:600, margin:'80px auto', padding:'0 24px', textAlign:'center' }}>
        <div style={{ fontSize:64, marginBottom:20 }}>🎫</div>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, marginBottom:8 }}>Ticket Raised!</h2>
        <p style={{ color:'#64748b', marginBottom:8 }}>Our support team has been notified and will respond shortly.</p>
        {form._ticketNum && <p style={{ color:'#60a5fa', fontWeight:700, fontSize:16, marginBottom:32 }}>Ticket #{form._ticketNum}</p>}
        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <button onClick={() => router.push(`/tickets/${form._ticketId}`)}
            style={{ padding:'12px 24px', background:'#1e3a5f', border:'none', borderRadius:10, color:'#60a5fa', cursor:'pointer', fontSize:14, fontWeight:600 }}>
            View Ticket
          </button>
          <button onClick={() => router.push('/tickets')}
            style={{ padding:'12px 24px', background:'transparent', border:'1px solid #1f2d45', borderRadius:10, color:'#64748b', cursor:'pointer', fontSize:14 }}>
            All Tickets
          </button>
          <button onClick={() => { setSubmitted(false); setForm({ title:'', description:'', category:'other', priority:'medium', steps:'', expected:'', actual:'', errorLog:'', attachedUrl:'' }); setScreenshot(null); setScreenshotPreview('') }}
            style={{ padding:'12px 24px', background:'transparent', border:'1px solid #1f2d45', borderRadius:10, color:'#64748b', cursor:'pointer', fontSize:14 }}>
            New Ticket
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .inp:focus { border-color:#3b82f6!important; outline:none; }
        .pri-card:hover { border-color:#3b82f640!important; }
      `}</style>

      <GlobalNav title="Raise Ticket" />

      <div style={{ maxWidth:840, margin:'0 auto', padding:'32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom:28, animation:'fadeUp 0.4s ease both' }}>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:4 }}>🎫 Smart Ticket Creation</h1>
          <p style={{ color:'#64748b', fontSize:13 }}>AI-assisted ticket with rich context — paste a log for instant auto-fill</p>
        </div>

        {msg && (
          <div style={{ padding:'10px 16px', borderRadius:9, marginBottom:16, background:msg.startsWith('✅')?'#052e16':'#450a0a', color:msg.startsWith('✅')?'#34d399':'#fca5a5', fontSize:13 }}>
            {msg}
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20 }}>

          {/* Main form */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Title */}
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:20, animation:'fadeUp 0.4s 0.05s ease both' }}>
              <label style={{ fontSize:12, color:'#475569', fontWeight:600, display:'block', marginBottom:8 }}>ISSUE TITLE *</label>
              <input className="inp" value={form.title} onChange={e => setField('title', e.target.value)}
                placeholder="Brief description of the issue..."
                style={{ width:'100%', padding:'11px 14px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:14, boxSizing:'border-box' }}/>
            </div>

            {/* Description */}
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:20, animation:'fadeUp 0.4s 0.1s ease both' }}>
              <label style={{ fontSize:12, color:'#475569', fontWeight:600, display:'block', marginBottom:8 }}>DESCRIPTION *</label>
              <textarea className="inp" value={form.description} onChange={e => setField('description', e.target.value)}
                placeholder="Describe the issue in detail..."
                style={{ width:'100%', minHeight:100, padding:'11px 14px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:14, resize:'vertical', lineHeight:1.6, boxSizing:'border-box' }}/>
            </div>

            {/* Steps / Expected / Actual */}
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:20, animation:'fadeUp 0.4s 0.15s ease both' }}>
              <label style={{ fontSize:12, color:'#475569', fontWeight:600, display:'block', marginBottom:14 }}>REPRODUCTION DETAILS <span style={{ color:'#334155', fontWeight:400 }}>(optional)</span></label>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[
                  { key:'steps',    label:'Steps to Reproduce', placeholder:'1. Go to...\n2. Click on...\n3. See error' },
                  { key:'expected', label:'Expected Behavior',  placeholder:'What should have happened...' },
                  { key:'actual',   label:'Actual Behavior',    placeholder:'What actually happened...' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize:11, color:'#334155', display:'block', marginBottom:5 }}>{f.label}</label>
                    <textarea className="inp" value={form[f.key]} onChange={e => setField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      style={{ width:'100%', minHeight:64, padding:'9px 12px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:8, color:'#e2e8f0', fontFamily:'monospace', fontSize:12, resize:'vertical', lineHeight:1.5, boxSizing:'border-box' }}/>
                  </div>
                ))}
              </div>
            </div>

            {/* Error log with AI analysis */}
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:20, animation:'fadeUp 0.4s 0.2s ease both' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <label style={{ fontSize:12, color:'#475569', fontWeight:600 }}>ERROR LOG / STACK TRACE <span style={{ color:'#334155', fontWeight:400 }}>(optional)</span></label>
                <button onClick={analyzeLog} disabled={!form.errorLog.trim() || aiLoading}
                  style={{ padding:'5px 12px', background: form.errorLog.trim()?'#1e1b4b':'#1f2d45', border:`1px solid ${form.errorLog.trim()?'#6366f140':'#1f2d45'}`, borderRadius:7, color: form.errorLog.trim()?'#a5b4fc':'#334155', cursor: form.errorLog.trim()?'pointer':'not-allowed', fontSize:12, display:'flex', alignItems:'center', gap:6 }}>
                  {aiLoading ? <><div style={{ width:10,height:10,borderRadius:'50%',border:'2px solid #6366f140',borderTopColor:'#a5b4fc',animation:'spin 0.7s linear infinite' }}/>Analyzing...</> : '🧠 AI Analyze'}
                </button>
              </div>
              <textarea className="inp" value={form.errorLog} onChange={e => setField('errorLog', e.target.value)}
                placeholder="Paste any error messages, stack traces, or log output here..."
                style={{ width:'100%', minHeight:120, padding:'11px 14px', background:'#0a0e1a', border:'1px solid #1f2d45', borderRadius:9, color:'#a5b4fc', fontFamily:'monospace', fontSize:12, resize:'vertical', lineHeight:1.5, boxSizing:'border-box' }}/>

              {/* AI suggestions */}
              {aiSuggestions && (
                <div style={{ marginTop:12, padding:'14px 16px', background:'linear-gradient(135deg,#1a1a2e,#1e1b4b)', border:'1px solid #6366f140', borderRadius:11 }}>
                  <div style={{ fontSize:12, color:'#a5b4fc', fontWeight:600, marginBottom:10 }}>🧠 AI Detected:</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
                    {aiSuggestions.title    && <div style={{ fontSize:13, color:'#e2e8f0' }}>Title: <span style={{ color:'#a5b4fc' }}>{aiSuggestions.title}</span></div>}
                    {aiSuggestions.category && <div style={{ fontSize:13, color:'#e2e8f0' }}>Category: <span style={{ color:'#a5b4fc' }}>{aiSuggestions.category}</span></div>}
                    {aiSuggestions.priority && <div style={{ fontSize:13, color:'#e2e8f0' }}>Priority: <span style={{ color:'#a5b4fc' }}>{aiSuggestions.priority}</span></div>}
                  </div>
                  <button onClick={applyAiSuggestions}
                    style={{ padding:'7px 16px', background:'#6366f1', border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                    ✅ Apply AI Suggestions
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Category */}
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:20, animation:'fadeUp 0.4s 0.1s ease both' }}>
              <label style={{ fontSize:12, color:'#475569', fontWeight:600, display:'block', marginBottom:10 }}>CATEGORY</label>
              <select value={form.category} onChange={e => setField('category', e.target.value)}
                style={{ width:'100%', padding:'10px 12px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:'none' }}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {/* Priority */}
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:20, animation:'fadeUp 0.4s 0.15s ease both' }}>
              <label style={{ fontSize:12, color:'#475569', fontWeight:600, display:'block', marginBottom:10 }}>PRIORITY</label>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {PRIORITIES.map(p => (
                  <div key={p.value} className="pri-card" onClick={() => setField('priority', p.value)}
                    style={{ padding:'10px 12px', borderRadius:9, border:`1px solid ${form.priority===p.value?'#3b82f640':'#1f2d45'}`, background: form.priority===p.value?'#1e3a5f':'#0f172a', cursor:'pointer', transition:'all 0.2s' }}>
                    <div style={{ fontSize:13, fontWeight: form.priority===p.value?600:400, color: form.priority===p.value?'#e2e8f0':'#64748b' }}>{p.label}</div>
                    <div style={{ fontSize:11, color:'#334155', marginTop:2 }}>{p.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Auto-assign info */}
            <div style={{ background:'#0f172a', border:'1px solid #1f2d45', borderRadius:12, padding:14, animation:'fadeUp 0.4s 0.2s ease both' }}>
              <div style={{ fontSize:11, color:'#334155', fontWeight:600, marginBottom:6 }}>AUTO-ASSIGN</div>
              <div style={{ fontSize:12, color:'#475569', lineHeight:1.6 }}>
                Team is auto-assigned based on category.<br/>
                <span style={{ color:'#60a5fa' }}>Infrastructure / Payments / DB → L2</span><br/>
                <span style={{ color:'#34d399' }}>Network / Hardware / Auth → L1</span>
              </div>
            </div>

            {/* Screenshot Upload */}
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:20, animation:'fadeUp 0.4s 0.2s ease both' }}>
              <label style={{ fontSize:12, color:'#475569', fontWeight:600, display:'block', marginBottom:10 }}>📸 ERROR SCREENSHOT <span style={{ color:'#334155', fontWeight:400 }}>(optional)</span></label>
              {screenshotPreview ? (
                <div style={{ position:'relative' }}>
                  <img src={screenshotPreview} alt="screenshot" style={{ width:'100%', borderRadius:8, border:'1px solid #1f2d45', maxHeight:160, objectFit:'cover' }}/>
                  <button onClick={() => { setScreenshot(null); setScreenshotPreview('') }}
                    style={{ position:'absolute', top:6, right:6, background:'#ef4444', border:'none', borderRadius:'50%', width:24, height:24, color:'#fff', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>×</button>
                  <div style={{ fontSize:11, color:'#34d399', marginTop:6 }}>✅ Screenshot attached — AI will analyze it</div>
                </div>
              ) : (
                <label style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'20px 12px', border:'2px dashed #1f2d45', borderRadius:10, cursor:'pointer', transition:'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.borderColor='#3b82f6'}
                  onMouseOut={e  => e.currentTarget.style.borderColor='#1f2d45'}>
                  <span style={{ fontSize:28 }}>📸</span>
                  <span style={{ fontSize:12, color:'#64748b', textAlign:'center' }}>Click to upload error screenshot<br/><span style={{ color:'#334155', fontSize:11 }}>PNG, JPG up to 5MB</span></span>
                  <input type="file" accept="image/*" onChange={handleScreenshot} style={{ display:'none' }}/>
                </label>
              )}
            </div>

            {/* Submit */}
            <button onClick={submitTicket} disabled={submitting || !form.title.trim()}
              style={{ width:'100%', padding:'14px', background: form.title.trim()?'linear-gradient(135deg,#2563eb,#3b82f6)':'#1f2d45', border:'none', borderRadius:12, color: form.title.trim()?'#fff':'#475569', cursor: form.title.trim()?'pointer':'not-allowed', fontWeight:700, fontSize:15, transition:'all 0.2s' }}>
              {submitting ? '⏳ Raising Ticket...' : '🎫 Raise Ticket'}
            </button>

            <button onClick={() => router.push('/ai-resolution')}
              style={{ width:'100%', padding:'11px', background:'transparent', border:'1px solid #1f2d45', borderRadius:10, color:'#64748b', cursor:'pointer', fontSize:13 }}>
              🤖 Try AI Resolution First
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Loader() {
  return <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:40,height:40,borderRadius:'50%',border:'3px solid #1f2d45',borderTopColor:'#06b6d4',animation:'spin 0.7s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}
