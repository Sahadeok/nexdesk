'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

export default function EnterpriseCoreDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('email')
  const [stats, setStats] = useState({})
  
  const [emails, setEmails] = useState([])
  const [sso, setSso] = useState([])
  const [automations, setAutomations] = useState([])
  const [assets, setAssets] = useState([])
  
  const [genLoading, setGenLoading] = useState('')
  
  // Email Simulator Inputs
  const [eSender, setESender] = useState('vp_engineering@acme.corp')
  const [eSubject, setESubject] = useState('Jenkins runner node crashed repeatedly today')
  const [eBody, setEBody] = useState('Team, we are losing valuable time. The linux builder VM keeps hanging on the Node script step. It\'s blocking release v2.4. Someone reboot it or add memory right now.')

  // SSO Simulator
  const [ssoProv, setSsoProv] = useState('Okta')

  // Automation Simulator
  const [autoName, setAutoName] = useState('P1 Email to L2 Network Team')

  // Asset Simulator
  const [astName, setAstName] = useState('Jenkins Builder VM')

  useEffect(() => { init() }, [])

  async function init() {
    const { user } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    await loadAll()
    setLoading(false)
  }

  async function loadAll() {
    const res = await Promise.allSettled([
      fetch('/api/enterprise-core?type=stats').then(r => r.json()),
      fetch('/api/enterprise-core?type=emails').then(r => r.json()),
      fetch('/api/enterprise-core?type=sso').then(r => r.json()),
      fetch('/api/enterprise-core?type=automations').then(r => r.json()),
      fetch('/api/enterprise-core?type=assets').then(r => r.json()),
    ])
    const [stR, eR, sR, aR, asR] = res.map(r => r.status === 'fulfilled' ? r.value : {})
    
    setStats(stR?.stats || {})
    setEmails(eR?.emails || [])
    setSso(sR?.sso || [])
    setAutomations(aR?.automations || [])
    setAssets(asR?.assets || [])
  }

  async function action(a, body = {}) {
    setGenLoading(a)
    try {
      await fetch('/api/enterprise-core', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: a, ...body }) })
      await loadAll()
    } catch (e) {}
    setGenLoading('')
  }

  const S = {
    page: { minHeight: '100vh', background: '#0f172a', fontFamily: "'DM Sans',sans-serif", color: '#e2e8f0' },
    card: (bg = 'rgba(255,255,255,0.02)') => ({ background: bg, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }),
    badge: c => ({ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: c + '20', color: c, border: `1px solid ${c}40`, display: 'inline-block' }),
    input: { width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#e2e8f0' },
    btn: (c, bg = false) => ({ padding: '11px 22px', background: bg ? `linear-gradient(135deg,${c},${c}bb)` : `${c}20`, border: `1px solid ${bg ? 'transparent' : c + '40'}`, borderRadius: 10, color: bg ? '#fff' : c, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", transition: 'all 0.2s', boxShadow: bg ? `0 4px 20px ${c}40` : 'none' }),
    sel: { padding: '11px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#e2e8f0' }
  }

  if (loading) return (
    <div style={S.page}><GlobalNav title="Enterprise Core" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 64 }}>🏢</div><div style={{ color: '#64748b', fontSize: 13, letterSpacing: 2, marginTop: 16 }}>INITIALIZING PLATFORM CORE...</div></div>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;}
        .ec-tab{padding:10px 20px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid rgba(255,255,255,0.07);background:transparent;color:#64748b;font-family:'DM Sans',sans-serif;transition:all 0.25s;letter-spacing:0.5px;text-transform:uppercase;}
        .ec-tab:hover{color:#cbd5e1;border-color:rgba(255,255,255,0.15);}
        .ec-tab.active{background:linear-gradient(135deg,rgba(56,189,248,0.25),rgba(59,130,246,0.15));color:#bae6fd;border-color:rgba(56,189,248,0.5);}
        .ec-btn:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.1);}
        input:focus,textarea:focus,select:focus{border-color:rgba(56,189,248,0.6)!important;box-shadow:0 0 0 3px rgba(56,189,248,0.1)!important;outline:none;}
      `}</style>
      
      <GlobalNav title="Enterprise Core Hub" />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <span style={{ fontSize: 32 }}>🏢</span>
              <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, background: 'linear-gradient(135deg,#38bdf8,#818cf8,#e879f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>
                Enterprise Platform Core
              </h1>
            </div>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>P62-65 — Email Parsing · SAML SSO · No-Code Automations · CMDB Assets</p>
          </div>
          <button style={S.btn('#94a3b8')} className="ec-btn" onClick={loadAll}>↻ Sync Frameworks</button>
        </div>

        {/* Dashboard Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 28 }}>
          {[
             { icon: '✉️', l: 'Emails Parsed', v: stats.total_emails_parsed || 0, c: '#38bdf8' },
             { icon: '🧠', l: 'Avg NLP Accuracy', v: `${stats.avg_nlp_accuracy || 0}%`, c: '#10b981' },
             { icon: '🔑', l: 'Active SSOs', v: stats.active_sso_connections || 0, c: '#e879f9' },
             { icon: '⚙️', l: 'Automations Run', v: stats.total_automations_run || 0, c: '#818cf8' },
             { icon: '💻', l: 'Total CMDB Assets', v: stats.total_assets || 0, c: '#f59e0b' },
             { icon: '🔥', l: 'Assets at Risk', v: stats.assets_at_risk || 0, c: '#ef4444' }
          ].map((s, i) => (
            <div key={i} style={{ ...S.card('rgba(255,255,255,0.02)'), padding: '16px 12px', border: `1px solid rgba(255,255,255,0.05)`, animation: `fadeUp 0.3s ${i * 0.05}s ease both`, textAlign: 'center' }}>
              <div style={{ fontSize: 24 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.c, marginTop: 4 }}>{s.v}</div>
              <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button className={`ec-tab${tab === 'email' ? ' active' : ''}`} onClick={() => setTab('email')}>✉️ Email To Ticket (P62)</button>
          <button className={`ec-tab${tab === 'sso' ? ' active' : ''}`} onClick={() => setTab('sso')}>🔑 SSO Integrations (P63)</button>
          <button className={`ec-tab${tab === 'automation' ? ' active' : ''}`} onClick={() => setTab('automation')}>⚙️ Automation Builder (P64)</button>
          <button className={`ec-tab${tab === 'assets' ? ' active' : ''}`} onClick={() => setTab('assets')}>💻 CMDB Assets (P65)</button>
        </div>

        {/* ═══ EMAIL TO TICKET ═══ */}
        {tab === 'email' && (
          <div style={{ animation: 'fadeUp 0.3s ease both' }}>
            <div style={{ ...S.card(), padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>📩 NLP Email Parser</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 250px', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input style={S.input} placeholder="Sender Email" value={eSender} onChange={e => setESender(e.target.value)} />
                  <input style={S.input} placeholder="Email Subject" value={eSubject} onChange={e => setESubject(e.target.value)} />
                  <textarea style={{ ...S.input, minHeight: 80 }} placeholder="Unstructured verbose email body..." value={eBody} onChange={e => setEBody(e.target.value)} />
                </div>
                <button 
                  style={{ ...S.btn('#38bdf8', true), height: '100%' }} 
                  className="ec-btn" 
                  disabled={genLoading === 'parse_email'} 
                  onClick={() => action('parse_email', { email: eSender, subject: eSubject, body: eBody })}
                >
                  {genLoading === 'parse_email' ? '⏳ Parsing Natural Language...' : '🧠 Process & Build Ticket'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {emails.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No emails processed yet</div>}
              {emails.map(e => (
                <div key={e.id} style={{ ...S.card(), padding: 20, borderLeft: `4px solid #38bdf8` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24 }}>
                    {/* Raw Email */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>RAW INCOMING</div>
                      <div style={{ padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 8, border: '1px dashed #334155' }}>
                        <div style={{ fontSize: 13, color: '#cbd5e1' }}><strong>From:</strong> {e.sender_email}</div>
                        <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}><strong>Subj:</strong> {e.raw_subject}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>"{e.raw_body}"</div>
                      </div>
                    </div>
                    {/* JSON Payload Built */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                        <span>AI TICKET METADATA</span>
                        <span style={S.badge('#10b981')}>{e.ai_accuracy_score}% Accuracy</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                        <span style={S.badge('#8b5cf6')}>Intent: {e.parsed_intent}</span>
                        <span style={S.badge('#ef4444')}>Urgency: {e.parsed_urgency}</span>
                        <span style={S.badge('#f59e0b')}>Sentiment: {e.ai_sentiment}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#38bdf8', marginBottom: 4 }}>Extracted CMDB Assets:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {e.extracted_assets?.length ? e.extracted_assets.map((a, i) => <span key={i} style={S.badge('#14b8a6')}>🏷️ {a}</span>) : <span style={{ fontSize: 12, color: '#64748b' }}>None</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 12 }}>Generated Ticket ID: {e.converted_ticket_id}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ SSO INTEGRATIONS ═══ */}
        {tab === 'sso' && (
          <div style={{ animation: 'fadeUp 0.3s ease both' }}>
            <div style={{ ...S.card(), padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>🔑 Configure Enterprise Identity Provider</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <select style={{ ...S.sel, flex: 1 }} value={ssoProv} onChange={e => setSsoProv(e.target.value)}>
                  <option value="Okta">Okta (SAML 2.0)</option>
                  <option value="Entra ID">Entra ID / Azure AD (OIDC)</option>
                  <option value="Google Workspace">Google Workspace (SAML 2.0)</option>
                  <option value="JumpCloud">JumpCloud (OIDC)</option>
                </select>
                <button 
                  style={S.btn('#e879f9', true)} 
                  className="ec-btn" 
                  disabled={genLoading === 'test_sso'} 
                  onClick={() => action('test_sso', { provider: ssoProv, protocol: ssoProv.includes('Entra') || ssoProv.includes('Jump') ? 'OIDC' : 'SAML 2.0' })}
                >
                  {genLoading === 'test_sso' ? '⏳ Probing IDP...' : '⚡ Test & Save SSO Connection'}
                </button>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {sso.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#64748b' }}>No SSO connections bound.</div>}
              {sso.map(s => (
                <div key={s.id} style={{ ...S.card(s.is_active ? 'rgba(16,185,129,0.03)' : 'rgba(239,68,68,0.05)'), padding: 20, textAlign: 'center', borderTop: `4px solid ${s.is_active ? '#10b981' : '#ef4444'}` }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{s.provider_name.includes('Okta') ? '🔵' : s.provider_name.includes('Entra') ? '☁️' : '🔐'}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0' }}>{s.provider_name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>{s.protocol} ({s.issuer_url})</div>
                  
                  {s.is_active ? (
                    <div>
                      <span style={S.badge('#10b981')}>ACTIVE & SECURE</span>
                      <div style={{ fontSize: 9, color: '#64748b', marginTop: 16 }}>Last Synced: {new Date(s.last_test_sync_at).toLocaleTimeString()}</div>
                    </div>
                  ) : (
                    <div>
                      <span style={S.badge('#ef4444')}>CONNECTION FAILED</span>
                      <div style={{ fontSize: 10, color: '#fca5a5', marginTop: 8, padding: 8, background: 'rgba(239,68,68,0.1)', borderRadius: 6 }}>{s.last_error}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ AUTOMATION BUILDER ═══ */}
        {tab === 'automation' && (
          <div style={{ animation: 'fadeUp 0.3s ease both' }}>
            <div style={{ ...S.card(), padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>⚙️ Drag-and-Drop Workflow Logic (No-Code Builder Sim)</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input style={{ ...S.input, flex: 2 }} placeholder="Recipe Name" value={autoName} onChange={e => setAutoName(e.target.value)} />
                <button 
                  style={S.btn('#818cf8', true)} 
                  className="ec-btn" 
                  disabled={genLoading === 'create_automation'} 
                  onClick={() => action('create_automation', { 
                    name: autoName, 
                    trigger_event: 'ticket.created', 
                    conditions: [{"field":"priority","value":"critical"}], 
                    actions: [{"type":"notify","team":"L2"}]
                  }).then(() => setAutoName(''))}
                >
                  {genLoading === 'create_automation' ? '⏳ Compiling Rule...' : '➕ Create "P1 Routing" Rule'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 14 }}>
              {automations.map(a => (
                <div key={a.id} style={{ ...S.card('rgba(255,255,255,0.02)'), padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>{a.name}</div>
                      <span style={S.badge(a.is_active ? '#10b981' : '#64748b')}>{a.is_active ? 'ACTIVE' : 'DRAFT'}</span>
                    </div>
                    
                    {/* Visual workflow pipe */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px dashed #334155', padding: '10px 16px', borderRadius: 50, background: 'rgba(0,0,0,0.2)' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>WHEN</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>{a.trigger_event}</div>
                      </div>
                      <div style={{ color: '#475569' }}>→</div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>IF</div>
                        <div style={{ fontSize: 12, color: '#f59e0b' }}>{(a.conditions||[]).map(c => `${c.field} = ${c.value}`).join(' AND ')}</div>
                      </div>
                      <div style={{ color: '#475569' }}>→</div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>THEN</div>
                        <div style={{ fontSize: 12, color: '#e879f9' }}>{(a.actions||[]).map(act => act.type).join(', ')}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#818cf8' }}>{a.times_triggered}</div>
                    <div style={{ fontSize: 9, color: '#64748b' }}>TIMES TRIGGERED</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ ASSET MANAGEMENT (CMDB) ═══ */}
        {tab === 'assets' && (
          <div style={{ animation: 'fadeUp 0.3s ease both' }}>
            <div style={{ ...S.card(), padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>💻 Register Hardware/Cloud Network Asset</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input style={{ ...S.input, flex: 2 }} placeholder="Asset Name" value={astName} onChange={e => setAstName(e.target.value)} />
                <select style={{ ...S.sel, width: 200 }} id="astType">
                  <option value="hardware">Hardware / Laptop</option>
                  <option value="cloud">Cloud / VM / DB</option>
                  <option value="network">Network Switch</option>
                  <option value="software">Software License</option>
                </select>
                <button 
                  style={S.btn('#f59e0b', true)} 
                  className="ec-btn" 
                  disabled={genLoading === 'create_asset'} 
                  onClick={() => action('create_asset', { name: astName, type: document.getElementById('astType').value }).then(() => setAstName(''))}
                >
                  {genLoading === 'create_asset' ? '⏳ Registering...' : '📦 Add to CMDB Database'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
              {assets.map(a => (
                <div key={a.id} style={{ ...S.card(a.health_score < 50 ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)'), padding: 16, borderTop: `3px solid ${a.health_score < 50 ? '#ef4444' : '#10b981'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={S.badge(a.health_score < 50 ? '#ef4444' : '#64748b')}>{a.asset_tag}</span>
                    <span style={{ fontSize: 20 }}>{a.asset_type === 'cloud' ? '☁️' : a.asset_type === 'hardware' ? '💻' : '🌍'}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#e2e8f0', marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>{a.ip_address || 'No IP registered'}</div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>TICKETS</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: a.linked_ticket_count > 5 ? '#f59e0b' : '#14b8a6' }}>{a.linked_ticket_count}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>HEALTH</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: a.health_score < 50 ? '#ef4444' : '#10b981' }}>{a.health_score}%</div>
                    </div>
                  </div>
                  
                  <button style={{ ...S.btn('#38bdf8', false), width: '100%', marginTop: 8, padding: 6, fontSize: 11 }} onClick={() => action('link_asset', { asset_tag: a.asset_tag })}>
                    🔗 Simulate Ticket Crash Link
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

