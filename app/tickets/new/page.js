'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import { smartRoute, calcSLADeadlines, genTicketNumber, PRIORITY_CONFIG } from '../../../lib/ticketRouter'

export default function NewTicket() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState(null)
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({ title:'', description:'', category_id:'', priority:'' })
  const [routing, setRouting] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    setProfile(p)
    const { data } = await supabase.from('categories').select('*').order('name')
    if (data) setCategories(data)
  }

  // Live routing preview as user types
  useEffect(() => {
    if (form.title.length > 8 || form.description.length > 10) {
      const cat = categories.find(c => c.id === form.category_id)
      const result = smartRoute(form.title, form.description, cat?.code || '')
      setRouting(result)
    } else {
      setRouting(null)
    }
  }, [form.title, form.description, form.category_id, categories])

  function update(field, val) { setForm(f => ({...f, [field]: val})); setError('') }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.title.trim())       { setError('Please enter an issue title.'); return }
    if (!form.category_id)        { setError('Please select a category.'); return }
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const cat      = categories.find(c => c.id === form.category_id)
      const route    = routing || smartRoute(form.title, form.description, cat?.code || '')
      const priority = form.priority || route.priority
      const sla      = calcSLADeadlines(priority)

      // Generate ticket number
      const { count } = await supabase.from('tickets').select('*', { count:'exact', head:true })
      const ticketNum = genTicketNumber((count || 0) + 1)

      // Insert ticket
      const { data: ticket, error: insertErr } = await supabase.from('tickets').insert({
        ticket_number:    ticketNum,
        title:            form.title.trim(),
        description:      form.description.trim() || null,
        status:           'open',
        priority,
        category_id:      form.category_id,
        assigned_team:    route.team,
        created_by:       user.id,
        ai_routing_reason: route.reason,
        ...sla,
      }).select().single()

      if (insertErr) throw insertErr

      // Log history
      await supabase.from('ticket_history').insert({
        ticket_id:     ticket.id,
        changed_by:    user.id,
        field_changed: 'status',
        old_value:     null,
        new_value:     'open',
        note:          `Ticket created. AI routed to ${route.team}. Reason: ${route.reason}`,
      })

      setSuccess(ticket.ticket_number)
    } catch (err) {
      setError(err.message || 'Failed to create ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inp = { width:'100%', padding:'12px 14px', background:'#111827', border:'1px solid #1f2d45', borderRadius:10, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:'none', transition:'border-color 0.2s, box-shadow 0.2s' }
  const label = { display:'block', fontSize:13, fontWeight:500, color:'#94a3b8', marginBottom:8 }

  if (success) return (
    <div style={{minHeight:'100vh',background:'#0a0e1a',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{background:'#111827',border:'1px solid #1f2d45',borderRadius:20,padding:48,textAlign:'center',maxWidth:480,animation:'fadeUp 0.4s ease'}}>
        <div style={{fontSize:56,marginBottom:16}}>🎉</div>
        <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,marginBottom:8,color:'#e2e8f0'}}>Ticket Created!</h2>
        <p style={{color:'#64748b',marginBottom:6}}>Your ticket number is:</p>
        <div style={{fontSize:28,fontWeight:800,color:'#3b82f6',fontFamily:'monospace',marginBottom:8}}>{success}</div>
        <div style={{background:'#052e16',border:'1px solid #10b98140',borderRadius:10,padding:'12px 16px',marginBottom:24,color:'#6ee7b7',fontSize:13}}>
          ✅ Ticket assigned to <strong>{routing?.team || 'L1'}</strong> team • SLA timer started
        </div>
        <div style={{display:'flex',gap:12,justifyContent:'center'}}>
          <button onClick={()=>router.push('/dashboard')} style={{padding:'11px 24px',background:'transparent',border:'1px solid #1f2d45',color:'#94a3b8',borderRadius:10,cursor:'pointer',fontSize:14,fontFamily:"'DM Sans',sans-serif"}}>Go to Dashboard</button>
          <button onClick={()=>{ setSuccess(''); setForm({title:'',description:'',category_id:'',priority:''}) }} style={{padding:'11px 24px',background:'linear-gradient(135deg,#2563eb,#3b82f6)',border:'none',color:'#fff',borderRadius:10,cursor:'pointer',fontSize:14,fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>Raise Another</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#0a0e1a',fontFamily:"'DM Sans',sans-serif",color:'#e2e8f0'}}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}} .inp:focus{border-color:#3b82f6!important;box-shadow:0 0 0 3px rgba(59,130,246,0.1)!important;}`}</style>

      {/* Navbar */}
      <div style={{background:'#111827',borderBottom:'1px solid #1f2d45',padding:'0 28px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>router.back()} style={{background:'transparent',border:'none',color:'#64748b',cursor:'pointer',fontSize:20,padding:'0 4px'}}>←</button>
          <div style={{width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#3b82f6,#06b6d4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>⚡</div>
          <span style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800}}>Nex<span style={{color:'#06b6d4'}}>Desk</span></span>
          <span style={{color:'#334155',margin:'0 6px'}}>›</span>
          <span style={{color:'#64748b',fontSize:14}}>Raise New Ticket</span>
        </div>
        <span style={{fontSize:13,color:'#64748b'}}>{profile?.email}</span>
      </div>

      <div style={{maxWidth:760,margin:'0 auto',padding:'36px 24px'}}>
        <div style={{marginBottom:28,animation:'fadeUp 0.4s ease'}}>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,marginBottom:6}}>Raise IT Support Ticket</h1>
          <p style={{color:'#64748b',fontSize:14}}>Describe your issue clearly. Our AI will route it to the right team automatically.</p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:20,alignItems:'start'}}>
          {/* Form */}
          <div style={{background:'#111827',border:'1px solid #1f2d45',borderRadius:16,padding:28,animation:'fadeUp 0.4s 0.1s ease both'}}>
            {error && (
              <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,padding:'11px 14px',marginBottom:20,color:'#fca5a5',fontSize:13,display:'flex',gap:8}}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Title */}
              <div style={{marginBottom:20}}>
                <label style={label}>Issue Title <span style={{color:'#ef4444'}}>*</span></label>
                <input className="inp" style={inp} placeholder="e.g. Cannot connect to VPN from home" value={form.title} onChange={e=>update('title',e.target.value)} maxLength={500}/>
                <div style={{fontSize:11,color:'#334155',marginTop:4,textAlign:'right'}}>{form.title.length}/500</div>
              </div>

              {/* Category */}
              <div style={{marginBottom:20}}>
                <label style={label}>Category <span style={{color:'#ef4444'}}>*</span></label>
                <select className="inp" style={{...inp,cursor:'pointer'}} value={form.category_id} onChange={e=>update('category_id',e.target.value)}>
                  <option value="">Select a category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name} {c.default_team==='L2'?'(Technical)':''}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div style={{marginBottom:20}}>
                <label style={label}>Detailed Description</label>
                <textarea className="inp" style={{...inp,minHeight:120,resize:'vertical'}} placeholder="Describe the issue in detail — when did it start? What were you doing? Any error messages?" value={form.description} onChange={e=>update('description',e.target.value)}/>
              </div>

              {/* Priority override */}
              <div style={{marginBottom:24}}>
                <label style={label}>Priority (optional — AI will set automatically)</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {[['','Auto (AI decides)','#475569','#1e293b'],['low','🟢 Low','#10b981','#052e16'],['medium','🟡 Medium','#f59e0b','#451a03'],['high','🟠 High','#f97316','#431407'],['critical','🔴 Critical','#ef4444','#450a0a']].map(([val,lbl,color,bg])=>(
                    <button key={val} type="button" onClick={()=>update('priority',val)}
                      style={{padding:'7px 14px',borderRadius:8,fontSize:12,cursor:'pointer',border:`1px solid ${form.priority===val?color:'#1f2d45'}`,background:form.priority===val?bg:'transparent',color:form.priority===val?color:'#64748b',transition:'all 0.2s',fontFamily:"'DM Sans',sans-serif"}}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={submitting} style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,#2563eb,#3b82f6)',border:'none',borderRadius:10,color:'#fff',fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,cursor:submitting?'not-allowed':'pointer',boxShadow:'0 4px 20px rgba(59,130,246,0.25)',opacity:submitting?0.7:1,display:'flex',alignItems:'center',justifyContent:'center',gap:10,transition:'all 0.2s'}}>
                {submitting ? <><div style={{width:18,height:18,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin 0.7s linear infinite'}}/> Creating Ticket...</> : '→ Submit Ticket'}
              </button>
            </form>
          </div>

          {/* Live Routing Preview */}
          <div style={{animation:'fadeUp 0.4s 0.2s ease both'}}>
            {routing ? (
              <div style={{background:'#111827',border:`1px solid ${routing.team==='L2'?'#8b5cf640':'#3b82f640'}`,borderRadius:14,padding:20,marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:600,color:'#475569',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:12}}>🤖 AI Routing Preview</div>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14,padding:'12px 14px',background:routing.team==='L2'?'#2e1065':'#1e3a5f',borderRadius:10}}>
                  <span style={{fontSize:24}}>{routing.team==='L2'?'⚠️':'🎫'}</span>
                  <div>
                    <div style={{fontSize:16,fontWeight:700,color:routing.team==='L2'?'#a78bfa':'#60a5fa',fontFamily:"'Syne',sans-serif"}}>→ {routing.team} Team</div>
                    <div style={{fontSize:11,color:'#64748b'}}>{routing.team==='L2'?'Technical / Code Issue':'Standard Support'}</div>
                  </div>
                </div>
                <div style={{fontSize:12,color:'#64748b',marginBottom:10,lineHeight:1.6}}>📍 {routing.reason}</div>
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'#0a0e1a',borderRadius:8}}>
                  <span style={{fontSize:11,color:'#475569'}}>Priority:</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'2px 7px',borderRadius:5,background:PRIORITY_CONFIG[form.priority||routing.priority]?.bg,color:PRIORITY_CONFIG[form.priority||routing.priority]?.color}}>{PRIORITY_CONFIG[form.priority||routing.priority]?.label}</span>
                </div>
                <div style={{fontSize:11,color:'#334155',marginTop:10}}>Confidence: {routing.confidence}%</div>
              </div>
            ) : (
              <div style={{background:'#111827',border:'1px solid #1f2d45',borderRadius:14,padding:20,marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:600,color:'#475569',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:10}}>🤖 AI Routing Preview</div>
                <p style={{fontSize:13,color:'#334155',lineHeight:1.7}}>Start typing your issue title and description — AI will show which team will handle it and why.</p>
              </div>
            )}

            {/* Routing guide */}
            <div style={{background:'#111827',border:'1px solid #1f2d45',borderRadius:14,padding:18}}>
              <div style={{fontSize:12,fontWeight:600,color:'#475569',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:12}}>Routing Guide</div>
              {[['🎫 L1 Team','Password, VPN, Printer, Email, Access, Slow PC','#3b82f6','#1e3a5f'],['⚠️ L2 Team','API errors, App crashes, Code bugs, Database issues','#8b5cf6','#2e1065']].map(([title,examples,color,bg])=>(
                <div key={title} style={{marginBottom:10,padding:'10px 12px',background:bg,borderRadius:9,border:`1px solid ${color}30`}}>
                  <div style={{fontSize:12,fontWeight:600,color,marginBottom:3}}>{title}</div>
                  <div style={{fontSize:11,color:'#64748b'}}>{examples}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
