'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TenantSetupWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  
  // Form State
  const [company, setCompany] = useState('')
  const [domain, setDomain] = useState('')
  const [industry, setIndustry] = useState('')
  
  const [frontend, setFrontend] = useState('')
  const [backend, setBackend] = useState('')
  const [database, setDatabase] = useState('')
  
  const [deployMode, setDeployMode] = useState('')
  
  const [isCompiling, setIsCompiling] = useState(false)
  
  // Handlers
  const nextStep = () => setStep(s => s + 1)
  const prevStep = () => setStep(s => s - 1)
  
  const startCompile = () => {
    setIsCompiling(true)
    setTimeout(() => {
      setIsCompiling(false)
      nextStep()
    }, 4000)
  }

  // Visual Assets
  const INDUSTRIES = [
    { id:'bfsi', icon:'🏦', label:'Banking & Finance', desc:'RBI/SEBI auto-compliance, high-security' },
    { id:'health', icon:'🏥', label:'Healthcare', desc:'HIPAA guardwalls, HL7 monitoring' },
    { id:'ecommerce', icon:'🛒', label:'E-Commerce', desc:'Checkout uptime, revenue impact alerts' },
    { id:'tech', icon:'💻', label:'IT & Tech', desc:'Full devops & sprint integrations' },
  ]
  
  const FRONTENDS = ['React', 'Angular', 'Vue.js', 'Next.js', 'Vanilla JS', 'Mobile App']
  const BACKENDS = ['Node.js', 'Spring Boot (Java)', 'Oracle/Tomcat', '.NET', 'Python / Django', 'Go']
  const DATABASES = ['PostgreSQL', 'Oracle', 'MongoDB', 'MySQL', 'SQL Server', 'Redis']

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', color:'#fff', fontFamily:"'Inter', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        .glass-panel { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; backdrop-filter: blur(20px); }
        .wizard-input { width: 100%; background: #111827; border: 1px solid #374151; padding: 14px 16px; border-radius: 10px; color: #fff; font-size: 15px; transition: all 0.2s; }
        .wizard-input:focus { border-color: #0ea5e9; outline: none; box-shadow: 0 0 0 4px rgba(14,165,233,0.1); }
        .sel-card { padding: 16px; border: 1px solid #374151; border-radius: 12px; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.02); }
        .sel-card:hover { border-color: #64748b; background: rgba(255,255,255,0.05); }
        .sel-card.active { border-color: #0ea5e9; background: rgba(14,165,233,0.1); box-shadow: inset 0 0 0 1px #0ea5e9; }
        .btn-primary { background: linear-gradient(135deg, #0ea5e9, #2563eb); border: none; padding: 14px 28px; border-radius: 10px; color: #fff; font-weight: 600; font-size: 15px; cursor: pointer; transition: transform 0.1s, box-shadow 0.2s; box-shadow: 0 4px 14px rgba(14,165,233,0.3); }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary { background: #1e293b; border: 1px solid #334155; padding: 14px 28px; border-radius: 10px; color: #cbd5e1; font-weight: 500; font-size: 15px; cursor: pointer; transition: all 0.2s; }
        .btn-secondary:hover { background: #334155; color: #fff; }
        
        .pill { padding: 8px 16px; border-radius: 20px; border: 1px solid #374151; font-size: 14px; cursor: pointer; transition: all 0.2s; background: #111827; color: #94a3b8; }
        .pill:hover { border-color: #64748b; color: #e2e8f0; }
        .pill.active { background: #0ea5e9; border-color: #0ea5e9; color: #fff; }

        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes float { 
          0% { transform: translateY(0px) } 
          50% { transform: translateY(-10px) } 
          100% { transform: translateY(0px) } 
        }
      `}</style>
      
      {/* ── TOP NAV ── */}
      <div style={{ padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#0ea5e9', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>N</div>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px' }}>NexDesk Global</span>
        </div>
        <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => router.push('/dashboard/admin')}>Cancel Setup</button>
      </div>

      <div style={{ maxWidth: 700, margin: '40px auto', position: 'relative' }}>
        
        {/* Progress Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 12, left: 20, right: 20, height: 2, background: '#1e293b', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: 12, left: 20, width: `${((step-1)/4)*100}%`, height: 2, background: '#0ea5e9', zIndex: 0, transition: 'width 0.4s ease' }} />
          {[1,2,3,4,5].map(s => (
            <div key={s} style={{ width: 26, height: 26, borderRadius: '50%', background: step >= s ? '#0ea5e9' : '#1e293b', border: `3px solid ${step >= s ? '#0ea5e9' : '#0f172a'}`, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff', transition: 'all 0.3s' }}>
              {step > s ? '✓' : s}
            </div>
          ))}
        </div>

        {/* ── STEP 1: BUSINESS PROFILE ── */}
        {step === 1 && (
          <div className="glass-panel" style={{ padding: 40, animation: 'float 6s ease-in-out infinite' }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, letterSpacing: '-1px' }}>Initialize New Tenant</h1>
            <p style={{ color: '#94a3b8', fontSize: 15, marginBottom: 32 }}>Configure NexDesk to automatically adapt to the client's business context.</p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>Company Name</label>
              <input className="wizard-input" value={company} onChange={e=>setCompany(e.target.value)} placeholder="e.g. Acme Health Corp" />
            </div>
            
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>Domain Workspace URL</label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input className="wizard-input" style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none' }} value={domain} onChange={e=>setDomain(e.target.value)} placeholder="acme" />
                <div style={{ background: '#1e293b', border: '1px solid #374151', borderLeft: 'none', padding: '14px 16px', borderTopRightRadius: 10, borderBottomRightRadius: 10, color: '#94a3b8' }}>
                  .nexdesk.com
                </div>
              </div>
            </div>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>Industry Context</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 40 }}>
              {INDUSTRIES.map(ind => (
                <div key={ind.id} className={`sel-card ${industry === ind.id ? 'active' : ''}`} onClick={() => setIndustry(ind.id)}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{ind.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{ind.label}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.4 }}>{ind.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" disabled={!company || !domain || !industry} onClick={nextStep}>Configure Tech Stack →</button>
            </div>
          </div>
        )}

        {/* ── STEP 2: TECH STACK ── */}
        {step === 2 && (
          <div className="glass-panel" style={{ padding: 40 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, letterSpacing: '-1px' }}>Tech Stack Discovery</h1>
            <p style={{ color: '#94a3b8', fontSize: 15, marginBottom: 32 }}>Tell the AI Engine what frameworks it will be monitoring for auto-fixes.</p>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>Frontend Architecture</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {FRONTENDS.map(f => (
                  <div key={f} className={`pill ${frontend === f ? 'active' : ''}`} onClick={() => setFrontend(f)}>{f}</div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>Backend Middleware</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {BACKENDS.map(b => (
                  <div key={b} className={`pill ${backend === b ? 'active' : ''}`} onClick={() => setBackend(b)}>{b}</div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 40 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>Primary Data Store</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {DATABASES.map(d => (
                  <div key={d} className={`pill ${database === d ? 'active' : ''}`} onClick={() => setDatabase(d)}>{d}</div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn-secondary" onClick={prevStep}>← Back</button>
              <button className="btn-primary" disabled={!frontend || !backend || !database} onClick={nextStep}>Select Deployment →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: DEPLOYMENT MODE ── */}
        {step === 3 && (
          <div className="glass-panel" style={{ padding: 40 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, letterSpacing: '-1px' }}>Deployment Model</h1>
            <p style={{ color: '#94a3b8', fontSize: 15, marginBottom: 32 }}>Choose where the AI engine and data will physically reside.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
              
              <div className={`sel-card ${deployMode === 'cloud' ? 'active' : ''}`} onClick={() => setDeployMode('cloud')} style={{ display:'flex', gap:20, padding: 24 }}>
                <div style={{ fontSize: 40 }}>☁️</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Multi-Tenant SaaS (Managed)</div>
                  <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.5 }}>Data is stored on NexDesk secure cloud with strict Row-Level Security isolation. Zero maintenance required. Best for scale.</div>
                </div>
              </div>

              <div className={`sel-card ${deployMode === 'onprem' ? 'active' : ''}`} onClick={() => setDeployMode('onprem')} style={{ display:'flex', gap:20, padding: 24 }}>
                <div style={{ fontSize: 40 }}>🏰</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Air-Gapped On-Premise</div>
                  <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.5 }}>Deploy local Docker containers inside client firewalls. No external internet calls. Uses local open-weights LLaMA models.</div>
                  {industry === 'bfsi' && <div style={{ background:'rgba(22,163,74,0.1)', color:'#4ade80', fontSize:12, padding:'4px 8px', borderRadius:4, display:'inline-block', marginTop:8 }}>Recommended for BFSI Regulated Clients</div>}
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn-secondary" onClick={prevStep}>← Back</button>
              <button className="btn-primary" disabled={!deployMode} onClick={startCompile}>Compile Magic Script ✨</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: COMPILATION (WAITING) ── */}
        {step === 4 && (
          <div className="glass-panel" style={{ padding: 60, textAlign: 'center', minHeight: 400, display: 'flex', flexDirection:'column', justifyContent:'center', alignItems:'center' }}>
            <div style={{ position: 'relative', width: 100, height: 100, marginBottom: 30 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '4px solid #1e293b', borderTopColor: '#0ea5e9', animation: 'spin 1s linear infinite' }} />
              <div style={{ position: 'absolute', inset: 10, background: '#0ea5e9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🤖</div>
              <div style={{ position: 'absolute', inset: -20, borderRadius: '50%', border: '2px solid rgba(14,165,233,0.2)', animation: 'pulse-ring 2s ease-out infinite' }} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Generating Digital Twin Configuration...</h2>
            <p style={{ color: '#94a3b8' }}>Injecting {industry.toUpperCase()} compliance rule-sets and mapping {frontend} to {backend} AI prompts.</p>
          </div>
        )}

        {/* ── STEP 5: SUCCESS & INSTALL ── */}
        {step === 5 && (
          <div className="glass-panel" style={{ padding: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, background: 'rgba(34,197,94,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontSize: 24 }}>✓</div>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>Tenant Profile Compiled</h1>
                <p style={{ color: '#94a3b8', fontSize: 14 }}>{company} is ready for zero-touch deployment.</p>
              </div>
            </div>

            <div style={{ background: '#0f172a', padding: 20, borderRadius: 12, border: '1px solid #1e293b', marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>1. The Magic Script</div>
              <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>Paste this inside the <code style={{ color:'#e2e8f0' }}>&lt;head&gt;</code> tag of the {frontend} application.</p>
              
              <div style={{ position: 'relative', background: '#000', padding: 16, borderRadius: 8, overflowX: 'auto', border: '1px solid #334155' }}>
                <pre style={{ margin: 0, fontSize: 13, color: '#a5b4fc' }}>
                  <span style={{ color: '#5eead4' }}>&lt;script</span> src="https://cdn.nexdesk.com/agent-v3.min.js"<span style={{ color: '#5eead4' }}>&gt;&lt;/script&gt;</span>{'\n'}
                  <span style={{ color: '#5eead4' }}>&lt;script&gt;</span>{'\n'}
                  {'  '}NexDesk.init({'{'}{'\n'}
                  {'    '}tenant_id: <span style={{ color: '#fca5a5' }}>"t_{domain}_89x21"</span>,{'\n'}
                  {'    '}industry_pack: <span style={{ color: '#fca5a5' }}>"{industry}"</span>,{'\n'}
                  {'    '}auto_heal: <span style={{ color: '#fde047' }}>true</span>,{'\n'}
                  {'    '}stack: {'{'} fe: <span style={{ color: '#fca5a5' }}>"{frontend}"</span>, be: <span style={{ color: '#fca5a5' }}>"{backend}"</span> {'}'}{'\n'}
                  {'  }'});{'\n'}
                  <span style={{ color: '#5eead4' }}>&lt;/script&gt;</span>
                </pre>
              </div>
            </div>

            {deployMode === 'onprem' && (
              <div style={{ background: '#0f172a', padding: 20, borderRadius: 12, border: '1px solid #1e293b', marginBottom: 32 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>2. Air-Gapped Local Deployment</div>
                <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>Instead of Cloud API, install the local AI appliance using Docker.</p>
                <div style={{ position: 'relative', background: '#000', padding: 12, borderRadius: 8, border: '1px solid #334155' }}>
                  <code style={{ fontSize: 13, color: '#a5b4fc', fontFamily:'monospace' }}>
                    docker run -d -p 8080:80 nexdesk/onprem-agent:latest \<br/>
                    {'  '}--env TENANT="{domain}" --env PACK="{industry}"
                  </code>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 16 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => router.push('/dashboard/admin')}>Back to Admin</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => router.push(`https://${domain || 'acme'}.nexdesk.com`)}>Visit Workspace →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

