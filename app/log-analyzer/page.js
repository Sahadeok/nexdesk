'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const LOG_TYPES = [
  { value: 'nohup',      label: '📄 nohup.out',          placeholder: 'Paste nohup.out log here...' },
  { value: 'catalina',   label: '🐱 catalina.out',        placeholder: 'Paste Tomcat catalina.out log here...' },
  { value: 'cloudwatch', label: '☁️ AWS CloudWatch',      placeholder: 'Paste AWS CloudWatch log here...' },
  { value: 'syslog',     label: '🐧 syslog / kern.log',   placeholder: 'Paste syslog or kern.log here...' },
  { value: 'app',        label: '📱 Application Log',     placeholder: 'Paste any application log here...' },
  { value: 'stacktrace', label: '💥 Stack Trace / Error', placeholder: 'Paste Java/Python/Node stack trace here...' },
  { value: 'nginx',      label: '🌐 Nginx / Apache',      placeholder: 'Paste Nginx or Apache access/error log here...' },
  { value: 'db',         label: '🗄️ Database Log',        placeholder: 'Paste MySQL/PostgreSQL/Oracle log here...' },
]

// Accepted file extensions
const ACCEPTED = ['.log','.txt','.out','.json','.csv','.xml','.err','.trace']

export default function LogAnalyzer() {
  const router    = useRouter()
  const fileRef   = useRef(null)
  const dropRef   = useRef(null)

  const [logType,    setLogType]    = useState('app')
  const [logText,    setLogText]    = useState('')
  const [fileName,   setFileName]   = useState('')
  const [fileSize,   setFileSize]   = useState('')
  const [result,     setResult]     = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [copied,     setCopied]     = useState(false)
  const [dragging,   setDragging]   = useState(false)
  const [inputMode,  setInputMode]  = useState('paste') // 'paste' | 'upload'

  const selectedType = LOG_TYPES.find(t => t.value === logType)

  // ── File reading ──────────────────────────────────────
  function readFile(file) {
    if (!file) return
    const ext = '.'+file.name.split('.').pop().toLowerCase()
    if (!ACCEPTED.includes(ext) && !file.name.includes('.')) {
      // allow extensionless files like 'catalina.out' 'nohup.out'
    }
    const sizeMB = (file.size / (1024*1024)).toFixed(2)
    setFileName(file.name)
    setFileSize(sizeMB + ' MB')
    setError('')

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      setLogText(text)
      // Auto-detect log type from filename
      const name = file.name.toLowerCase()
      if (name.includes('catalina'))     setLogType('catalina')
      else if (name.includes('nohup'))   setLogType('nohup')
      else if (name.includes('nginx') || name.includes('apache')) setLogType('nginx')
      else if (name.includes('sys') || name.includes('kern'))     setLogType('syslog')
      else if (name.includes('cloud') || name.includes('aws'))    setLogType('cloudwatch')
    }
    reader.onerror = () => setError('Failed to read file. Please try again.')
    reader.readAsText(file)
  }

  function onFileInput(e) {
    const file = e.target.files[0]
    if (file) readFile(file)
  }

  function onDrop(e) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) readFile(file)
  }

  function onDragOver(e) { e.preventDefault(); setDragging(true) }
  function onDragLeave()  { setDragging(false) }

  function clearAll() {
    setLogText(''); setFileName(''); setFileSize(''); setResult(null); setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── AI Analysis ───────────────────────────────────────
  async function analyzeLog() {
    if (!logText.trim()) { setError('Please paste or upload a log file first.'); return }
    if (logText.trim().length < 20) { setError('Log content too short.'); return }
    setLoading(true); setError(''); setResult(null)

    try {
      const prompt = `You are an expert IT log analyzer with deep knowledge of Java, Node.js, Python, AWS, Linux, databases, and web servers.

Analyze the following ${selectedType?.label} log and provide a detailed analysis.
${fileName ? `File: ${fileName}` : ''}

LOG CONTENT:
\`\`\`
${logText.substring(0, 8000)}
\`\`\`

Provide your analysis in the following JSON format only (no extra text, no markdown):
{
  "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
  "rootCause": "Clear explanation of the root cause",
  "errorSummary": "Brief summary of what went wrong",
  "affectedComponents": ["component1", "component2"],
  "keyErrors": ["error line 1", "error line 2", "error line 3"],
  "resolutionSteps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
  "preventionTips": ["Tip 1", "Tip 2"],
  "escalationNeeded": true,
  "escalateTo": "L1|L2|DEVELOPER|NONE",
  "escalationReason": "reason if escalation needed",
  "additionalNotes": "any other important observations"
}`

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 2000,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error?.message || 'Groq API error')
      }

      const data    = await response.json()
      const content = data.choices[0]?.message?.content || ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Could not parse AI response')
      setResult(JSON.parse(jsonMatch[0]))
    } catch(e) {
      setError('Analysis failed: ' + e.message)
    }
    setLoading(false)
  }

  function copyResult() {
    if (!result) return
    const text = `=== AI LOG ANALYSIS REPORT ===
${fileName ? 'File: ' + fileName : ''}
Severity: ${result.severity}
Root Cause: ${result.rootCause}
Error Summary: ${result.errorSummary}
Affected: ${result.affectedComponents?.join(', ')}

KEY ERRORS:
${result.keyErrors?.map((e,i) => `${i+1}. ${e}`).join('\n')}

RESOLUTION STEPS:
${result.resolutionSteps?.map((s,i) => `${i+1}. ${s}`).join('\n')}

PREVENTION TIPS:
${result.preventionTips?.map((t,i) => `${i+1}. ${t}`).join('\n')}

Escalation: ${result.escalationNeeded ? `Yes → ${result.escalateTo}` : 'No'}
${result.escalationReason || ''}
Notes: ${result.additionalNotes}`
    navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const sevColor = {
    CRITICAL:{ bg:'#450a0a', c:'#ef4444', border:'#ef444440' },
    HIGH:    { bg:'#431407', c:'#f97316', border:'#f9731640' },
    MEDIUM:  { bg:'#451a03', c:'#fbbf24', border:'#fbbf2440' },
    LOW:     { bg:'#052e16', c:'#10b981', border:'#10b98140' },
    INFO:    { bg:'#1e3a5f', c:'#60a5fa', border:'#3b82f640' },
  }
  const sev = sevColor[result?.severity] || sevColor.INFO

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .ltype:hover { border-color:#3b82f640!important; background:#0f172a!important; }
        .inp:focus   { border-color:#3b82f6!important; outline:none; }
        .tab:hover   { background:#1a2236!important; }
      `}</style>

      {/* Navbar */}
      <div style={{ background:'#111827', borderBottom:'1px solid #1f2d45', padding:'0 28px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => router.back()} style={{ background:'transparent', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>←</button>
          <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#6366f1,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🤖</div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800 }}>Nex<span style={{ color:'#06b6d4' }}>Desk</span></span>
          <span style={{ color:'#334155', margin:'0 6px' }}>›</span>
          <span style={{ color:'#64748b', fontSize:14 }}>AI Log Analyzer</span>
        </div>
        <span style={{ fontSize:11, padding:'4px 10px', borderRadius:6, background:'#1e1b4b', color:'#818cf8', border:'1px solid #6366f140' }}>⚡ Powered by Llama 3</span>
      </div>

      <div style={{ maxWidth:1300, margin:'0 auto', padding:'28px 24px' }}>

        {/* Hero */}
        <div style={{ textAlign:'center', marginBottom:28, animation:'fadeUp 0.4s ease' }}>
          <div style={{ fontSize:44, marginBottom:10 }}>🔍</div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, marginBottom:6 }}>
            AI Log <span style={{ color:'#06b6d4' }}>Analyzer</span>
          </h1>
          <p style={{ color:'#64748b', fontSize:14, maxWidth:500, margin:'0 auto' }}>
            Upload or paste any server log — AI will find root cause and give step-by-step resolution.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, alignItems:'start' }}>

          {/* ── LEFT INPUT ── */}
          <div style={{ animation:'fadeUp 0.4s 0.1s ease both' }}>

            {/* Log Type */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>1. Select Log Type</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {LOG_TYPES.map(t => (
                  <button key={t.value} className="ltype" onClick={() => setLogType(t.value)}
                    style={{ padding:'9px 12px', borderRadius:10, fontSize:12, cursor:'pointer', border:`1px solid ${logType===t.value?'#3b82f640':'#1f2d45'}`, background:logType===t.value?'#1e3a5f':'#111827', color:logType===t.value?'#60a5fa':'#64748b', textAlign:'left', fontFamily:"'DM Sans',sans-serif", transition:'all 0.2s', fontWeight:logType===t.value?600:400 }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Mode Tabs */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>2. Input Method</div>
              <div style={{ display:'flex', background:'#111827', borderRadius:10, padding:4, border:'1px solid #1f2d45', width:'fit-content', gap:2 }}>
                {[['upload','📁 Upload File'],['paste','📋 Paste Text']].map(([val,label]) => (
                  <button key={val} className="tab" onClick={() => setInputMode(val)}
                    style={{ padding:'7px 18px', borderRadius:8, fontSize:13, cursor:'pointer', border:'none', background:inputMode===val?'#1e3a5f':'transparent', color:inputMode===val?'#60a5fa':'#64748b', fontFamily:"'DM Sans',sans-serif", fontWeight:inputMode===val?600:400, transition:'all 0.15s' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── UPLOAD MODE ── */}
            {inputMode === 'upload' && (
              <div style={{ marginBottom:16 }}>
                {/* Drop Zone */}
                <div ref={dropRef} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
                  onClick={() => fileRef.current?.click()}
                  style={{ border:`2px dashed ${dragging?'#3b82f6':'#1f2d45'}`, borderRadius:14, padding:'32px 24px', textAlign:'center', cursor:'pointer', transition:'all 0.2s', background:dragging?'#1e3a5f20':'#111827', marginBottom:12 }}>
                  <div style={{ fontSize:40, marginBottom:10 }}>📁</div>
                  <p style={{ color:'#64748b', fontSize:14, marginBottom:4 }}>
                    {dragging ? 'Drop the file here!' : 'Drag & drop your log file'}
                  </p>
                  <p style={{ color:'#334155', fontSize:12, marginBottom:12 }}>or click to browse</p>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center' }}>
                    {ACCEPTED.map(ext => (
                      <span key={ext} style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background:'#1e293b', color:'#475569', border:'1px solid #1f2d45' }}>{ext}</span>
                    ))}
                  </div>
                  <input ref={fileRef} type="file"
                    accept={ACCEPTED.join(',')+',text/plain,text/*'}
                    onChange={onFileInput}
                    style={{ display:'none' }}/>
                </div>

                {/* File info */}
                {fileName && (
                  <div style={{ background:'#052e16', border:'1px solid #10b98130', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:20 }}>📄</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#34d399' }}>{fileName}</div>
                      <div style={{ fontSize:11, color:'#475569' }}>{fileSize} • {logText.split('\n').length} lines • {logText.length} characters</div>
                    </div>
                    <button onClick={clearAll} style={{ background:'transparent', border:'none', color:'#475569', cursor:'pointer', fontSize:16 }}>✕</button>
                  </div>
                )}
              </div>
            )}

            {/* ── PASTE MODE ── */}
            {inputMode === 'paste' && (
              <div style={{ marginBottom:16 }}>
                <textarea className="inp" value={logText} onChange={e => setLogText(e.target.value)}
                  placeholder={selectedType?.placeholder}
                  style={{ width:'100%', minHeight:280, padding:'14px', background:'#111827', border:'1px solid #1f2d45', borderRadius:12, color:'#e2e8f0', fontFamily:'monospace', fontSize:12, resize:'vertical', lineHeight:1.6, boxSizing:'border-box' }}/>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                  <span style={{ fontSize:11, color:'#334155' }}>{logText.split('\n').length} lines • {logText.length} chars</span>
                  <button onClick={clearAll} style={{ fontSize:11, color:'#475569', background:'transparent', border:'none', cursor:'pointer' }}>🗑️ Clear</button>
                </div>
              </div>
            )}

            {error && (
              <div style={{ background:'#450a0a', border:'1px solid #ef444430', borderRadius:10, padding:'12px 16px', marginBottom:14, color:'#fca5a5', fontSize:13 }}>
                ❌ {error}
              </div>
            )}

            {/* Analyze Button */}
            <button onClick={analyzeLog} disabled={loading || !logText.trim()}
              style={{ width:'100%', padding:'14px', background:loading?'#1e293b':'linear-gradient(135deg,#4f46e5,#06b6d4)', border:'none', borderRadius:12, color:'#fff', cursor:loading||!logText.trim()?'not-allowed':'pointer', fontSize:15, fontWeight:700, fontFamily:"'Syne',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:10, opacity:!logText.trim()?0.5:1, transition:'all 0.2s' }}>
              {loading
                ? <><div style={{ width:18, height:18, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', animation:'spin 0.7s linear infinite' }}/><span style={{ animation:'pulse 1.5s infinite' }}>Analyzing with Llama 3 AI...</span></>
                : <>🤖 Analyze Log</>
              }
            </button>

            {/* Setup note */}
            <div style={{ background:'#0f172a', border:'1px solid #1e293b', borderRadius:10, padding:'12px 16px', marginTop:14 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#475569', marginBottom:6 }}>⚙️ SETUP</div>
              <div style={{ fontSize:12, color:'#64748b', lineHeight:1.7 }}>
                Add to <code style={{ color:'#06b6d4', background:'#0a0e1a', padding:'1px 5px', borderRadius:4 }}>.env.local</code>:<br/>
                <code style={{ color:'#34d399' }}>NEXT_PUBLIC_GROQ_API_KEY=your_key</code><br/>
                Free key at <span style={{ color:'#60a5fa' }}>console.groq.com</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT RESULTS ── */}
          <div style={{ animation:'fadeUp 0.4s 0.2s ease both' }}>
            {!result && !loading && (
              <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:48, textAlign:'center' }}>
                <div style={{ fontSize:56, marginBottom:16 }}>🔍</div>
                <p style={{ color:'#475569', fontSize:15, marginBottom:8 }}>Upload or paste a log then click Analyze</p>
                <p style={{ color:'#334155', fontSize:13 }}>Supports: nohup.out, catalina.out, CloudWatch, syslog, stack traces & more</p>
              </div>
            )}

            {loading && (
              <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:56, textAlign:'center' }}>
                <div style={{ width:56, height:56, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#6366f1', animation:'spin 0.8s linear infinite', margin:'0 auto 20px' }}/>
                <p style={{ color:'#64748b', fontSize:14, animation:'pulse 1.5s infinite' }}>🤖 Llama 3 is analyzing your log...</p>
                <p style={{ color:'#334155', fontSize:12, marginTop:8 }}>Detecting errors, root cause & generating resolution steps</p>
              </div>
            )}

            {result && (
              <div>
                {/* Severity */}
                <div style={{ background:sev.bg, border:`1px solid ${sev.border}`, borderRadius:14, padding:'16px 20px', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontSize:11, color:'#64748b', marginBottom:2 }}>SEVERITY</div>
                    <div style={{ fontSize:22, fontWeight:800, color:sev.c, fontFamily:"'Syne',sans-serif" }}>
                      {result.severity==='CRITICAL'?'🔴':result.severity==='HIGH'?'🟠':result.severity==='MEDIUM'?'🟡':result.severity==='LOW'?'🟢':'🔵'} {result.severity}
                    </div>
                    {fileName && <div style={{ fontSize:11, color:'#475569', marginTop:4 }}>📄 {fileName}</div>}
                  </div>
                  <button onClick={copyResult} style={{ padding:'8px 16px', background:'#1e293b', border:'1px solid #1f2d45', color:copied?'#34d399':'#94a3b8', borderRadius:8, cursor:'pointer', fontSize:12 }}>
                    {copied?'✅ Copied!':'📋 Copy Report'}
                  </button>
                </div>

                {/* Root Cause */}
                <div style={{ background:'#111827', border:'1px solid #ef444430', borderRadius:12, padding:'16px 20px', marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#ef4444', marginBottom:8, textTransform:'uppercase' }}>🎯 Root Cause</div>
                  <p style={{ fontSize:14, color:'#e2e8f0', lineHeight:1.7 }}>{result.rootCause}</p>
                </div>

                {/* Error Summary */}
                <div style={{ background:'#111827', border:'1px solid #f9731630', borderRadius:12, padding:'16px 20px', marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#f97316', marginBottom:8, textTransform:'uppercase' }}>⚠️ Error Summary</div>
                  <p style={{ fontSize:13, color:'#cbd5e1', lineHeight:1.7 }}>{result.errorSummary}</p>
                </div>

                {/* Key Errors */}
                {result.keyErrors?.length > 0 && (
                  <div style={{ background:'#0f172a', border:'1px solid #1e293b', borderRadius:12, padding:'16px 20px', marginBottom:12 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'#475569', marginBottom:10, textTransform:'uppercase' }}>🔑 Key Errors</div>
                    {result.keyErrors.map((e,i) => (
                      <div key={i} style={{ fontSize:12, color:'#94a3b8', fontFamily:'monospace', background:'#0a0e1a', padding:'6px 10px', borderRadius:6, marginBottom:6, borderLeft:'2px solid #ef4444' }}>{e}</div>
                    ))}
                  </div>
                )}

                {/* Affected Components */}
                {result.affectedComponents?.length > 0 && (
                  <div style={{ marginBottom:12, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontSize:11, color:'#475569', fontWeight:600 }}>🔧 AFFECTED:</span>
                    {result.affectedComponents.map((c,i) => (
                      <span key={i} style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'#1e3a5f', color:'#60a5fa', border:'1px solid #3b82f640' }}>{c}</span>
                    ))}
                  </div>
                )}

                {/* Resolution Steps */}
                <div style={{ background:'#052e16', border:'1px solid #10b98130', borderRadius:12, padding:'16px 20px', marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#10b981', marginBottom:10, textTransform:'uppercase' }}>💡 Resolution Steps</div>
                  {result.resolutionSteps?.map((s,i) => (
                    <div key={i} style={{ display:'flex', gap:10, marginBottom:8, alignItems:'flex-start' }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'#34d399', background:'#065f46', borderRadius:'50%', width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>{i+1}</span>
                      <span style={{ fontSize:13, color:'#6ee7b7', lineHeight:1.6 }}>{s}</span>
                    </div>
                  ))}
                </div>

                {/* Prevention */}
                {result.preventionTips?.length > 0 && (
                  <div style={{ background:'#1e3a5f', border:'1px solid #3b82f630', borderRadius:12, padding:'16px 20px', marginBottom:12 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'#60a5fa', marginBottom:10, textTransform:'uppercase' }}>🛡️ Prevention Tips</div>
                    {result.preventionTips.map((t,i) => (
                      <div key={i} style={{ fontSize:13, color:'#93c5fd', lineHeight:1.7, marginBottom:4 }}>• {t}</div>
                    ))}
                  </div>
                )}

                {/* Escalation */}
                {result.escalationNeeded && (
                  <div style={{ background:'#431407', border:'1px solid #f9731640', borderRadius:12, padding:'16px 20px', marginBottom:12 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'#f97316', marginBottom:6, textTransform:'uppercase' }}>🔺 Escalation Recommended</div>
                    <div style={{ fontSize:13, color:'#fed7aa' }}>
                      <strong>Escalate to: {result.escalateTo}</strong>
                      {result.escalationReason && <div style={{ marginTop:4, color:'#fdba74' }}>{result.escalationReason}</div>}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {result.additionalNotes && (
                  <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:12, padding:'14px 18px' }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'#475569', marginBottom:6 }}>📝 Additional Notes</div>
                    <p style={{ fontSize:13, color:'#64748b', lineHeight:1.6 }}>{result.additionalNotes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

