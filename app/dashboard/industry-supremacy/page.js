'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

export default function IndustrySupremacyDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('bfsi')
  const [stats, setStats] = useState({})
  
  const [bfsiScans, setBfsiScans] = useState([])
  const [healthScans, setHealthScans] = useState([])
  const [ecomEvents, setEcomEvents] = useState([])
  
  const [genLoading, setGenLoading] = useState('')
  const [scanText, setScanText] = useState('')
  
  // Ecom simulator inputs
  const [ecomEventName, setEcomEventName] = useState('Diwali Flash Sale 2026')
  const [ecomTpm, setEcomTpm] = useState(250)

  useEffect(() => { init() }, [])

  async function init() {
    const { user } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    await loadAll()
    setLoading(false)
  }

  async function loadAll() {
    const res = await Promise.allSettled([
      fetch('/api/industry-supremacy?type=stats').then(r => r.json()),
      fetch('/api/industry-supremacy?type=bfsi_scans').then(r => r.json()),
      fetch('/api/industry-supremacy?type=healthcare_scans').then(r => r.json()),
      fetch('/api/industry-supremacy?type=ecommerce_events').then(r => r.json()),
    ])
    const [stR, bR, hR, eR] = res.map(r => r.status === 'fulfilled' ? r.value : {})
    
    setStats(stR?.stats || {})
    setBfsiScans(bR?.scans || [])
    setHealthScans(hR?.scans || [])
    setEcomEvents(eR?.events || [])
  }

  async function action(a, body = {}) {
    setGenLoading(a)
    try {
      await fetch('/api/industry-supremacy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: a, ...body }) })
      await loadAll()
    } catch (e) {}
    setGenLoading('')
  }

  const S = {
    page: { minHeight: '100vh', background: '#0a0a0f', fontFamily: "'DM Sans',sans-serif", color: '#e2e8f0' },
    card: (c = 'rgba(255,255,255,0.03)') => ({ background: c, border: `1px solid ${c.replace('0.03', '0.1').replace('0.08', '0.2')}`, borderRadius: 14 }),
    badge: c => ({ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: c + '20', color: c, border: `1px solid ${c}40`, display: 'inline-block' }),
    input: { width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#e2e8f0' },
    btn: (c, bg = false) => ({ padding: '11px 22px', background: bg ? `linear-gradient(135deg,${c},${c}bb)` : `${c}20`, border: `1px solid ${bg ? 'transparent' : c + '40'}`, borderRadius: 10, color: bg ? '#fff' : c, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", transition: 'all 0.2s', boxShadow: bg ? `0 4px 20px ${c}40` : 'none' }),
  }

  if (loading) return (
    <div style={S.page}><GlobalNav title="Industry Supremacy" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 64 }}>🏦</div><div style={{ color: '#475569', fontSize: 13, letterSpacing: 2, marginTop: 16 }}>LOADING COMPLIANCE VAULTS...</div></div>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;}
        .ind-tab{padding:10px 20px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid rgba(255,255,255,0.07);background:transparent;color:#475569;font-family:'DM Sans',sans-serif;transition:all 0.25s;letter-spacing:0.5px;text-transform:uppercase;}
        .ind-tab:hover{color:#94a3b8;border-color:rgba(255,255,255,0.12);}
        .ind-tab.active{background:linear-gradient(135deg,rgba(59,130,246,0.25),rgba(147,51,234,0.15));color:#bfdbfe;border-color:rgba(59,130,246,0.5);}
        .ind-btn:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.1);}
        input:focus,textarea:focus,select:focus{border-color:rgba(59,130,246,0.6)!important;box-shadow:0 0 0 3px rgba(59,130,246,0.1)!important;outline:none;}
      `}</style>
      
      <GlobalNav title="Industry Packs Hub" />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <span style={{ fontSize: 32 }}>🏛️</span>
              <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>
                Industry Supremacy Packs
              </h1>
            </div>
            <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>P56-58 — BFSI (PCI-DSS), Healthcare (HIPAA), E-Commerce (Velocity)</p>
          </div>
          <button style={S.btn('#475569', false)} className="ind-btn" onClick={loadAll}>↻ Refresh Vaults</button>
        </div>

        {/* Global Compliance Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 28 }}>
          {[
            { icon: '🏦', l: 'BFSI Violations Vaulted', v: stats.bfsi_violations_caught || 0, c: '#3b82f6' },
            { icon: '🛡️', l: 'BFSI Scans', v: stats.bfsi_total_scans || 0, c: '#64748b' },
            { icon: '🏥', l: 'HIPAA Violations Vaulted', v: stats.health_violations_caught || 0, c: '#14b8a6' },
            { icon: '🩺', l: 'Healthcare Scans', v: stats.health_total_scans || 0, c: '#64748b' },
            { icon: '🛒', l: 'E-Com Revenue Protected', v: `₹${Math.round((stats.total_revenue_protected || 0)/1000)}K`, c: '#f59e0b' },
            { icon: '⚡', l: 'Auto Refunds Issued', v: stats.auto_refunds_processed || 0, c: '#8b5cf6' },
          ].map((s, i) => (
            <div key={i} style={{ ...S.card(`${s.c}0a`), padding: '16px 12px', border: `1px solid ${s.c}30`, animation: `fadeUp 0.3s ${i * 0.05}s ease both`, textAlign: 'center' }}>
              <div style={{ fontSize: 22 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.c, marginTop: 4 }}>{s.v}</div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[
            { key: 'bfsi', l: `🏦 BFSI Pack (PCI-DSS)` },
            { key: 'health', l: `🏥 Healthcare Pack (HIPAA)` },
            { key: 'ecom', l: `🛒 E-Commerce Pack (Velocity)` },
          ].map(t => <button key={t.key} className={`ind-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>{t.l}</button>)}
        </div>

        {/* ═══ BFSI VALIDATION ═══ */}
        {tab === 'bfsi' && (
          <div style={{ animation: 'fadeUp 0.3s ease both' }}>
            <div style={{ ...S.card(), padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <span>🏦 FinTech & BFSI Compliance Scanner</span>
                <span style={S.badge('#3b82f6')}>PCI-DSS / RBI / GDPR</span>
              </div>
              <textarea 
                style={{ ...S.input, minHeight: 100, marginBottom: 16 }} 
                placeholder="Paste ticket contents here. E.g., 'Please refund my credit card 4111-2222-3333-4444. My OTP is 728192.'" 
                value={scanText} 
                onChange={e => setScanText(e.target.value)} 
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  style={S.btn('#3b82f6', true)} 
                  className="ind-btn" 
                  disabled={genLoading === 'scan_compliance'} 
                  onClick={() => action('scan_compliance', { text: scanText, industry: 'bfsi' }).then(() => setScanText(''))}
                >
                  {genLoading === 'scan_compliance' ? '⏳ Scanning for PII/PCI Data...' : '🛡️ Validate BFSI Compliance'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {bfsiScans.length === 0 ? <div style={{ ...S.card(), padding: 70, textAlign: 'center' }}><div style={{ fontSize: 56, opacity: 0.15 }}>🏦</div><div style={{ fontSize: 14, color: '#475569', marginTop: 16 }}>No BFSI tickets scanned yet</div></div> : null}
              {bfsiScans.map(s => (
                <div key={s.id} style={{ ...S.card('rgba(59,130,246,0.04)'), padding: 20, borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={S.badge(s.violation_found ? '#dc2626' : '#10b981')}>
                        {s.violation_found ? 'VIOLATION DETECTED' : 'CLEAN'}
                      </span>
                      <span style={S.badge('#6366f1')}>{s.regulatory_framework}</span>
                      <span style={{ fontSize: 12, color: '#475569' }}>Vault Token: {s.secure_vault_token}</span>
                    </div>
                    {(s.pii_entities_detected || []).map((e, i) => <span key={i} style={S.badge('#d97706')} title={e.framework}>{e.type}</span>)}
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', marginBottom: 6 }}>ORIGINAL (DANGEROUS)</div>
                      <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8 }}>{s.raw_text_scanned}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', marginBottom: 6 }}>AGENT VIEW (MASKED)</div>
                      <div style={{ fontSize: 13, color: '#e2e8f0', background: 'rgba(16,185,129,0.05)', padding: 12, borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)' }}>{s.masked_text}</div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: 12, paddingD: 10, fontSize: 12, color: s.violation_found ? '#fca5a5' : '#a7f3d0' }}>
                    <strong>🤖 Security Verdict:</strong> {s.ai_compliance_verdict}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ HEALTHCARE VALIDATION ═══ */}
        {tab === 'health' && (
          <div style={{ animation: 'fadeUp 0.3s ease both' }}>
            <div style={{ ...S.card(), padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <span>🏥 Healthcare & Life Sciences Scanner</span>
                <span style={S.badge('#14b8a6')}>HIPAA / PHI / FHIR</span>
              </div>
              <textarea 
                style={{ ...S.input, minHeight: 100, marginBottom: 16 }} 
                placeholder="Paste medical ticket here. E.g., 'Patient John Doe (DOB: 05/12/1980) has SSN 123-45-6789 and needs his Xanax refilled for severe anxiety.'" 
                value={scanText} 
                onChange={e => setScanText(e.target.value)} 
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  style={S.btn('#14b8a6', true)} 
                  className="ind-btn" 
                  disabled={genLoading === 'scan_compliance'} 
                  onClick={() => action('scan_compliance', { text: scanText, industry: 'healthcare' }).then(() => setScanText(''))}
                >
                  {genLoading === 'scan_compliance' ? '⏳ Scanning for PHI...' : '🛡️ Validate HIPAA Compliance'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {healthScans.length === 0 ? <div style={{ ...S.card(), padding: 70, textAlign: 'center' }}><div style={{ fontSize: 56, opacity: 0.15 }}>🏥</div><div style={{ fontSize: 14, color: '#475569', marginTop: 16 }}>No Healthcare tickets scanned yet</div></div> : null}
              {healthScans.map(s => (
                <div key={s.id} style={{ ...S.card('rgba(20,184,166,0.04)'), padding: 20, borderLeft: '4px solid #14b8a6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={S.badge(s.violation_found ? '#dc2626' : '#10b981')}>
                        {s.violation_found ? 'PHI DETECTED' : 'CLEAN'}
                      </span>
                      <span style={S.badge('#6366f1')}>{s.regulatory_framework}</span>
                      <span style={{ fontSize: 12, color: '#475569' }}>Vault Token: {s.secure_vault_token}</span>
                    </div>
                    {(s.pii_entities_detected || []).map((e, i) => <span key={i} style={S.badge('#d97706')} title={e.framework}>{e.type}</span>)}
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#14b8a6', marginBottom: 6 }}>RAW DOCTOR/PATIENT NOTES</div>
                      <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8 }}>{s.raw_text_scanned}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', marginBottom: 6 }}>AGENT VIEW (HIPAA COMPLIANT)</div>
                      <div style={{ fontSize: 13, color: '#e2e8f0', background: 'rgba(16,185,129,0.05)', padding: 12, borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)' }}>{s.masked_text}</div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: 12, fontSize: 12, color: s.violation_found ? '#fca5a5' : '#a7f3d0' }}>
                    <strong>🤖 Compliance Verdict:</strong> {s.ai_compliance_verdict}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ E-COMMERCE VELOCITY ═══ */}
        {tab === 'ecom' && (
          <div style={{ animation: 'fadeUp 0.3s ease both' }}>
            <div style={{ ...S.card(), padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>🛒 Flash Sale / Velocity Simulator</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input style={{ ...S.input, flex: 2 }} placeholder="Event Name (e.g., Black Friday 2026)" value={ecomEventName} onChange={e => setEcomEventName(e.target.value)} />
                <input style={{ ...S.input, flex: 1 }} type="number" placeholder="Tickets Per Minute" value={ecomTpm} onChange={e => setEcomTpm(e.target.value)} />
                <button 
                  style={S.btn('#f59e0b', true)} 
                  className="ind-btn" 
                  disabled={genLoading === 'simulate_ecommerce_burst' || !ecomEventName} 
                  onClick={() => action('simulate_ecommerce_burst', { event_name: ecomEventName, tpm: parseInt(ecomTpm) })}
                >
                  {genLoading === 'simulate_ecommerce_burst' ? '⏳ Modding Burst...' : '⚡ Simulate Ticket Burst'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ecomEvents.length === 0 ? <div style={{ ...S.card(), padding: 70, textAlign: 'center' }}><div style={{ fontSize: 56, opacity: 0.15 }}>🛒</div><div style={{ fontSize: 14, color: '#475569', marginTop: 16 }}>No velocity events simulated</div></div> : null}
              {ecomEvents.map(ev => (
                <div key={ev.id} style={{ ...S.card('rgba(245,158,11,0.04)'), padding: 24, borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>{ev.event_name}</div>
                      <span style={S.badge('#ef4444')}>Critical Load: {ev.tickets_per_minute} TPM</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: '#f59e0b' }}>₹{Math.round((ev.lost_revenue_risk_inr || 0)/1000)}K</div>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>REVENUE RISK PREVENTED</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Top Friction Point</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fca5a5' }}>{ev.top_friction_point.replace(/_/g, ' ')}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Carts Auto-Recovered</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{ev.abandoned_carts_recovered}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Robotic Refunds</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#8b5cf6' }}>{ev.auto_refunds_processed}</div>
                    </div>
                  </div>

                  <div style={{ padding: 14, borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#fcd34d', marginBottom: 4 }}>🤖 AI DYNAMIC STRATEGY EXECUTED</div>
                    <div style={{ fontSize: 13, color: '#fef3c7', lineHeight: 1.6 }}>{ev.ai_ecommerce_strategy}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

