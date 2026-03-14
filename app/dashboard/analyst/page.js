'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

// Suggested prompts for admin
const SUGGESTED_PROMPTS = [
  { icon:'🔴', text:'How many SLA breached tickets yesterday from L1 team?' },
  { icon:'📊', text:'Give me a full summary of all tickets this week' },
  { icon:'⚠️', text:'Which category has the most unresolved tickets?' },
  { icon:'👨‍💻', text:'How many tickets are assigned to Developer and still open?' },
  { icon:'🔺', text:'Show all escalated tickets from L1 to L2 this month' },
  { icon:'⏱️', text:'What is the average resolution time per team?' },
  { icon:'🚨', text:'List all critical priority tickets that are still open' },
  { icon:'📅', text:'How many tickets were raised today vs yesterday?' },
  { icon:'✅', text:'Which agent resolved the most tickets this week?' },
  { icon:'📉', text:'Show SLA breach rate by team and priority' },
  { icon:'🔥', text:'What are the top 5 recurring issues this month?' },
  { icon:'👤', text:'How many tickets raised by each user this month?' },
]

export default function AIAnalyst() {
  const router   = useRouter()
  const supabase = createClient()
  const inputRef = useRef(null)
  const chatRef  = useRef(null)

  const [tickets,   setTickets]   = useState([])
  const [prompt,    setPrompt]    = useState('')
  const [history,   setHistory]   = useState([]) // chat history
  const [loading,   setLoading]   = useState(false)
  const [fetching,  setFetching]  = useState(true)
  const [lastData,  setLastData]  = useState(null) // last result for download

  useEffect(() => { init() }, [])
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight }, [history])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    if (!['ADMIN','IT_MANAGER'].includes(p?.role)) { router.replace('/dashboard'); return }
    await fetchAllData()
    setFetching(false)
  }

  async function fetchAllData() {
    const { data } = await supabase
      .from('tickets')
      .select(`
        id, ticket_number, title, status, priority, assigned_team,
        escalated_to_l2, ai_routing_reason, sla_resolve_due,
        created_at, resolved_at, updated_at,
        categories(name, code),
        ticket_comments(count),
        ticket_history(count)
      `)
      .order('created_at', { ascending: false })
    if (data) setTickets(data)
  }

  // Build a compact data summary to send to AI
  function buildDataContext() {
    const now = new Date()

    // Helper
    const dayAgo  = new Date(now - 1*24*60*60*1000)
    const weekAgo = new Date(now - 7*24*60*60*1000)
    const monthAgo= new Date(now - 30*24*60*60*1000)
    const isYesterday = t => {
      const d = new Date(t.created_at)
      const y = new Date(now); y.setDate(y.getDate()-1)
      return d.toDateString() === y.toDateString()
    }
    const isToday  = t => new Date(t.created_at).toDateString() === now.toDateString()
    const isWeek   = t => new Date(t.created_at) >= weekAgo
    const isMonth  = t => new Date(t.created_at) >= monthAgo
    const isBreached = t => t.sla_resolve_due && new Date(t.sla_resolve_due) < now && !['resolved','closed'].includes(t.status)
    const isResolved = t => ['resolved','closed'].includes(t.status)
    const isActive   = t => !isResolved(t)

    // Build compact ticket list (last 200)
    const ticketList = tickets.slice(0,200).map(t => ({
      num:      t.ticket_number,
      title:    t.title,
      status:   t.status,
      priority: t.priority,
      team:     t.assigned_team,
      cat:      t.categories?.name || 'Unknown',
      escalated:t.escalated_to_l2,
      breached: isBreached(t),
      resolved: isResolved(t),
      sla_due:  t.sla_resolve_due,
      created:  t.created_at?.split('T')[0],
      resolved_at: t.resolved_at?.split('T')[0] || null,
      res_hours: t.resolved_at ? Math.round((new Date(t.resolved_at)-new Date(t.created_at))/(1000*60*60)) : null,
    }))

    // Summary stats
    const summary = {
      total_tickets:   tickets.length,
      today:           tickets.filter(isToday).length,
      yesterday:       tickets.filter(isYesterday).length,
      this_week:       tickets.filter(isWeek).length,
      this_month:      tickets.filter(isMonth).length,
      total_active:    tickets.filter(isActive).length,
      total_resolved:  tickets.filter(isResolved).length,
      total_breached:  tickets.filter(isBreached).length,
      today_date:      now.toISOString().split('T')[0],
      yesterday_date:  new Date(dayAgo).toISOString().split('T')[0],

      // By team
      by_team: ['L1','L2','DEVELOPER'].map(team => ({
        team,
        total:    tickets.filter(t=>t.assigned_team===team).length,
        active:   tickets.filter(t=>t.assigned_team===team&&isActive(t)).length,
        resolved: tickets.filter(t=>t.assigned_team===team&&isResolved(t)).length,
        breached: tickets.filter(t=>t.assigned_team===team&&isBreached(t)).length,
        today:    tickets.filter(t=>t.assigned_team===team&&isToday(t)).length,
        yesterday:tickets.filter(t=>t.assigned_team===team&&isYesterday(t)).length,
        this_week:tickets.filter(t=>t.assigned_team===team&&isWeek(t)).length,
      })),

      // By priority
      by_priority: ['critical','high','medium','low'].map(p => ({
        priority: p,
        total:    tickets.filter(t=>t.priority===p).length,
        active:   tickets.filter(t=>t.priority===p&&isActive(t)).length,
        resolved: tickets.filter(t=>t.priority===p&&isResolved(t)).length,
        breached: tickets.filter(t=>t.priority===p&&isBreached(t)).length,
      })),

      // By category
      by_category: [...new Set(tickets.map(t=>t.categories?.name||'Unknown'))].map(cat => ({
        category: cat,
        total:    tickets.filter(t=>(t.categories?.name||'Unknown')===cat).length,
        active:   tickets.filter(t=>(t.categories?.name||'Unknown')===cat&&isActive(t)).length,
        resolved: tickets.filter(t=>(t.categories?.name||'Unknown')===cat&&isResolved(t)).length,
      })).sort((a,b)=>b.total-a.total),

      // Avg resolution by team
      avg_resolution_hours: ['L1','L2','DEVELOPER'].map(team => {
        const resolved = tickets.filter(t=>t.assigned_team===team&&t.resolved_at)
        const avg = resolved.length > 0
          ? Math.round(resolved.reduce((s,t)=>s+(new Date(t.resolved_at)-new Date(t.created_at))/(1000*60*60),0)/resolved.length)
          : null
        return { team, avg_hours: avg, resolved_count: resolved.length }
      }),

      // Escalations
      total_escalated:      tickets.filter(t=>t.escalated_to_l2).length,
      escalated_this_week:  tickets.filter(t=>t.escalated_to_l2&&isWeek(t)).length,
      escalated_this_month: tickets.filter(t=>t.escalated_to_l2&&isMonth(t)).length,
    }

    return { summary, tickets: ticketList }
  }

  async function ask() {
    if (!prompt.trim() || loading) return
    const userPrompt = prompt.trim()
    setPrompt('')
    setLoading(true)

    // Add user message to history
    setHistory(prev => [...prev, { role:'user', text:userPrompt }])

    try {
      const ctx = buildDataContext()

      const systemPrompt = `You are an expert IT Service Desk data analyst AI for NexDesk, an IT ticketing system.

You have access to REAL live data from the NexDesk database. Answer admin questions based on this data.

TODAY'S DATE: ${ctx.summary.today_date}
YESTERDAY'S DATE: ${ctx.summary.yesterday_date}

=== LIVE TICKET DATA SUMMARY ===
${JSON.stringify(ctx.summary, null, 2)}

=== INDIVIDUAL TICKETS (last 200) ===
${JSON.stringify(ctx.tickets, null, 2)}

INSTRUCTIONS:
- Answer based ONLY on the real data provided above
- Be specific with numbers, percentages, and ticket numbers
- Format your response as JSON with this structure:
{
  "headline": "Short answer headline (1 line)",
  "answer": "Detailed answer with specific numbers and insights",
  "key_metrics": [
    { "label": "metric name", "value": "value", "color": "green|red|yellow|blue|purple" }
  ],
  "data_table": {
    "headers": ["Col1", "Col2", "Col3"],
    "rows": [["val1", "val2", "val3"]]
  },
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "chart_data": [
    { "label": "L1", "value": 5 },
    { "label": "L2", "value": 3 }
  ]
}
- data_table and chart_data are optional — include only when relevant
- key_metrics should always have 3-6 items
- insights should always have 2-4 items
- recommendations should always have 1-3 items
- Use exact ticket numbers when listing specific tickets
- If asked about "yesterday", filter by date: ${ctx.summary.yesterday_date}
- If asked about "today", filter by date: ${ctx.summary.today_date}
- NEVER make up data — only use what's in the database`

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role:'system', content: systemPrompt },
            { role:'user',   content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens:  3000,
        })
      })

      if (!res.ok) { const e=await res.json(); throw new Error(e.error?.message||'Groq error') }
      const data    = await res.json()
      const content = data.choices[0]?.message?.content || ''
      const match   = content.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Could not parse AI response')
      const parsed  = JSON.parse(match[0])
      setLastData(parsed)
      setHistory(prev => [...prev, { role:'ai', data:parsed, prompt:userPrompt }])
    } catch(e) {
      setHistory(prev => [...prev, { role:'error', text: e.message }])
    }
    setLoading(false)
  }

  function downloadCSV(result, promptText) {
    const rows  = []
    const title = result.headline || promptText
    rows.push([title])
    rows.push([])
    rows.push(['KEY METRICS'])
    result.key_metrics?.forEach(m => rows.push([m.label, m.value]))
    rows.push([])
    if (result.data_table?.headers) {
      rows.push(result.data_table.headers)
      result.data_table.rows?.forEach(r => rows.push(r))
      rows.push([])
    }
    rows.push(['INSIGHTS'])
    result.insights?.forEach(i => rows.push([i]))
    rows.push([])
    rows.push(['RECOMMENDATIONS'])
    result.recommendations?.forEach(r => rows.push([r]))
    rows.push([])
    rows.push(['Generated by NexDesk AI Analyst', new Date().toLocaleString('en-IN')])

    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `nexdesk-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadJSON(result, promptText) {
    const report = { query: promptText, generated_at: new Date().toISOString(), ...result }
    const blob   = new Blob([JSON.stringify(report, null, 2)], { type:'application/json' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href       = url
    a.download   = `nexdesk-report-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const colorMap = { green:'#10b981', red:'#ef4444', yellow:'#fbbf24', blue:'#3b82f6', purple:'#8b5cf6', orange:'#f97316' }
  const bgMap    = { green:'#052e16', red:'#450a0a', yellow:'#451a03', blue:'#1e3a5f', purple:'#2e1065', orange:'#431407' }

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <style>{`
        @keyframes fadeUp   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes slideIn  { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
        .sug:hover  { border-color:#6366f140!important; background:#1a1a2e!important; color:#a5b4fc!important; }
        .dbtn:hover { opacity:0.8!important; transform:translateY(-1px); }
        textarea:focus { border-color:#6366f1!important; outline:none; }
      `}</style>

      <GlobalNav title="AI Data Analyst" />

      <div style={{ maxWidth:1300, margin:'0 auto', padding:'24px', display:'grid', gridTemplateColumns:'300px 1fr', gap:20, height:'calc(100vh - 60px)' }}>

        {/* ── LEFT PANEL — Suggestions ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:12, overflowY:'auto' }}>

          {/* Header */}
          <div style={{ background:'linear-gradient(135deg,#1e1b4b,#2e1065)', border:'1px solid #6366f130', borderRadius:14, padding:'16px 18px' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>🤖</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800, marginBottom:4 }}>AI Data Analyst</div>
            <div style={{ fontSize:12, color:'#94a3b8', lineHeight:1.6 }}>Ask anything about your tickets in plain English. AI analyzes real data and gives instant answers.</div>
            <div style={{ marginTop:10, fontSize:11, color:'#6366f1', background:'#1e1b4b', padding:'4px 10px', borderRadius:20, display:'inline-block', border:'1px solid #6366f130' }}>
              ⚡ {fetching ? 'Loading data...' : `${tickets.length} tickets loaded`}
            </div>
          </div>

          {/* Suggested Prompts */}
          <div style={{ fontSize:11, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', paddingLeft:4 }}>💡 Try These Questions</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {SUGGESTED_PROMPTS.map((s,i) => (
              <button key={i} className="sug"
                onClick={() => { setPrompt(s.text); inputRef.current?.focus() }}
                style={{ padding:'10px 12px', borderRadius:10, fontSize:12, cursor:'pointer', border:'1px solid #1f2d45', background:'#111827', color:'#64748b', textAlign:'left', fontFamily:"'DM Sans',sans-serif", transition:'all 0.2s', lineHeight:1.5 }}>
                {s.icon} {s.text}
              </button>
            ))}
          </div>

          {/* Clear chat */}
          {history.length > 0 && (
            <button onClick={() => setHistory([])} style={{ padding:'8px', borderRadius:10, fontSize:12, cursor:'pointer', border:'1px solid #1f2d45', background:'transparent', color:'#475569' }}>
              🗑️ Clear Chat
            </button>
          )}
        </div>

        {/* ── RIGHT PANEL — Chat ── */}
        <div style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:0 }}>

          {/* Chat History */}
          <div ref={chatRef} style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:16, paddingBottom:16, paddingRight:4 }}>

            {/* Welcome */}
            {history.length === 0 && !loading && (
              <div style={{ textAlign:'center', paddingTop:60, animation:'fadeUp 0.5s ease' }}>
                <div style={{ fontSize:64, marginBottom:16 }}>🤖</div>
                <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:8 }}>
                  What would you like to <span style={{ color:'#6366f1' }}>analyze</span>?
                </h2>
                <p style={{ color:'#475569', fontSize:14, maxWidth:400, margin:'0 auto' }}>
                  Ask anything about your tickets — breaches, team performance, trends, categories, and more.
                </p>
              </div>
            )}

            {/* Messages */}
            {history.map((msg, i) => (
              <div key={i} style={{ animation:'slideIn 0.3s ease' }}>

                {/* User message */}
                {msg.role === 'user' && (
                  <div style={{ display:'flex', justifyContent:'flex-end' }}>
                    <div style={{ maxWidth:'70%', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius:'14px 14px 4px 14px', padding:'12px 16px', fontSize:14, lineHeight:1.6 }}>
                      {msg.text}
                    </div>
                  </div>
                )}

                {/* Error */}
                {msg.role === 'error' && (
                  <div style={{ background:'#450a0a', border:'1px solid #ef444430', borderRadius:12, padding:'14px 18px', color:'#fca5a5', fontSize:13 }}>
                    ❌ Error: {msg.text}
                  </div>
                )}

                {/* AI Result */}
                {msg.role === 'ai' && msg.data && (
                  <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'20px 24px' }}>

                    {/* Headline */}
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:16 }}>
                      <div>
                        <div style={{ fontSize:11, color:'#6366f1', fontWeight:600, marginBottom:4 }}>🤖 AI ANALYST</div>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:700, color:'#e2e8f0' }}>{msg.data.headline}</div>
                      </div>
                      {/* Download buttons */}
                      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                        <button className="dbtn" onClick={() => downloadCSV(msg.data, msg.prompt)}
                          style={{ padding:'7px 12px', background:'#052e16', border:'1px solid #10b98130', color:'#34d399', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:600, transition:'all 0.2s' }}>
                          📥 CSV
                        </button>
                        <button className="dbtn" onClick={() => downloadJSON(msg.data, msg.prompt)}
                          style={{ padding:'7px 12px', background:'#1e3a5f', border:'1px solid #3b82f630', color:'#60a5fa', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:600, transition:'all 0.2s' }}>
                          📥 JSON
                        </button>
                      </div>
                    </div>

                    {/* Answer */}
                    <div style={{ background:'#0f172a', borderRadius:10, padding:'14px 16px', marginBottom:16, fontSize:13, color:'#cbd5e1', lineHeight:1.8 }}>
                      {msg.data.answer}
                    </div>

                    {/* Key Metrics */}
                    {msg.data.key_metrics?.length > 0 && (
                      <div style={{ marginBottom:16 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:'#475569', textTransform:'uppercase', marginBottom:10 }}>📊 Key Metrics</div>
                        <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(msg.data.key_metrics.length, 3)}, 1fr)`, gap:10 }}>
                          {msg.data.key_metrics.map((m,j) => {
                            const c  = colorMap[m.color] || '#3b82f6'
                            const bg = bgMap[m.color]    || '#1e3a5f'
                            return (
                              <div key={j} style={{ background:bg, border:`1px solid ${c}30`, borderRadius:10, padding:'12px 14px' }}>
                                <div style={{ fontSize:18, fontWeight:700, color:c, fontFamily:"'Syne',sans-serif" }}>{m.value}</div>
                                <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{m.label}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Chart (bar) */}
                    {msg.data.chart_data?.length > 0 && (
                      <div style={{ marginBottom:16 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:'#475569', textTransform:'uppercase', marginBottom:10 }}>📈 Chart</div>
                        <div style={{ background:'#0f172a', borderRadius:12, padding:'16px 20px' }}>
                          {(() => {
                            const max = Math.max(...msg.data.chart_data.map(d=>Number(d.value)||0), 1)
                            return msg.data.chart_data.map((d,j) => (
                              <div key={j} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                                <div style={{ width:90, fontSize:11, color:'#94a3b8', textAlign:'right', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.label}</div>
                                <div style={{ flex:1, background:'#1f2d45', borderRadius:20, height:24, overflow:'hidden' }}>
                                  <div style={{ height:'100%', borderRadius:20, background:'linear-gradient(90deg,#6366f1,#8b5cf6)', width:`${Math.round(((Number(d.value)||0)/max)*100)}%`, minWidth:(Number(d.value)||0)>0?'4px':'0', display:'flex', alignItems:'center', paddingLeft:8, transition:'width 1s ease' }}>
                                    <span style={{ fontSize:10, fontWeight:600, color:'#fff', whiteSpace:'nowrap' }}>{d.value}</span>
                                  </div>
                                </div>
                              </div>
                            ))
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Data Table */}
                    {msg.data.data_table?.headers && msg.data.data_table?.rows?.length > 0 && (
                      <div style={{ marginBottom:16, overflowX:'auto' }}>
                        <div style={{ fontSize:11, fontWeight:600, color:'#475569', textTransform:'uppercase', marginBottom:10 }}>📋 Data Table</div>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                          <thead>
                            <tr style={{ background:'#0a0e1a' }}>
                              {msg.data.data_table.headers.map((h,j) => (
                                <th key={j} style={{ padding:'8px 12px', textAlign:'left', color:'#475569', fontWeight:600, textTransform:'uppercase', fontSize:10, letterSpacing:'0.5px', whiteSpace:'nowrap', borderBottom:'1px solid #1f2d45' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {msg.data.data_table.rows.map((row,j) => (
                              <tr key={j} style={{ borderBottom:'1px solid #0f172a' }}>
                                {row.map((cell,k) => (
                                  <td key={k} style={{ padding:'8px 12px', color:'#cbd5e1', fontSize:12 }}>{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Insights + Recommendations */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      {msg.data.insights?.length > 0 && (
                        <div style={{ background:'#1e3a5f', border:'1px solid #3b82f630', borderRadius:10, padding:'14px 16px' }}>
                          <div style={{ fontSize:11, fontWeight:600, color:'#60a5fa', marginBottom:8, textTransform:'uppercase' }}>💡 Insights</div>
                          {msg.data.insights.map((ins,j) => (
                            <div key={j} style={{ fontSize:12, color:'#93c5fd', marginBottom:6, lineHeight:1.6, display:'flex', gap:6 }}>
                              <span style={{ color:'#3b82f6', flexShrink:0 }}>•</span>{ins}
                            </div>
                          ))}
                        </div>
                      )}
                      {msg.data.recommendations?.length > 0 && (
                        <div style={{ background:'#052e16', border:'1px solid #10b98130', borderRadius:10, padding:'14px 16px' }}>
                          <div style={{ fontSize:11, fontWeight:600, color:'#10b981', marginBottom:8, textTransform:'uppercase' }}>✅ Recommendations</div>
                          {msg.data.recommendations.map((rec,j) => (
                            <div key={j} style={{ fontSize:12, color:'#6ee7b7', marginBottom:6, lineHeight:1.6, display:'flex', gap:6 }}>
                              <span style={{ color:'#10b981', flexShrink:0 }}>→</span>{rec}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'24px', display:'flex', alignItems:'center', gap:14, animation:'fadeUp 0.3s ease' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#6366f1', animation:'spin 0.7s linear infinite', flexShrink:0 }}/>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:4, animation:'pulse 1.5s infinite' }}>🤖 AI is analyzing your data...</div>
                  <div style={{ fontSize:12, color:'#475569' }}>Querying {tickets.length} tickets from NexDesk database</div>
                </div>
              </div>
            )}
          </div>

          {/* ── Input Box ── */}
          <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'16px', marginTop:12 }}>
            <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
              <div style={{ flex:1 }}>
                <textarea ref={inputRef} value={prompt} onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); ask() } }}
                  placeholder="Ask anything... e.g. 'How many SLA breached tickets yesterday from L1?' or 'Show top 5 categories this month'"
                  rows={2}
                  style={{ width:'100%', padding:'12px 14px', background:'#0a0e1a', border:'1px solid #1f2d45', borderRadius:10, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:14, resize:'none', lineHeight:1.6, boxSizing:'border-box' }}/>
                <div style={{ fontSize:11, color:'#334155', marginTop:4 }}>Press Enter to send • Shift+Enter for new line</div>
              </div>
              <button onClick={ask} disabled={loading || !prompt.trim() || fetching}
                style={{ padding:'12px 20px', background:loading||!prompt.trim()||fetching?'#1e293b':'linear-gradient(135deg,#4f46e5,#7c3aed)', border:'none', borderRadius:10, color:'#fff', cursor:loading||!prompt.trim()||fetching?'not-allowed':'pointer', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:8, opacity:!prompt.trim()||fetching?0.5:1, transition:'all 0.2s', whiteSpace:'nowrap', height:48 }}>
                {loading ? <div style={{ width:18, height:18, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', animation:'spin 0.7s linear infinite' }}/> : '🤖 Ask AI'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
