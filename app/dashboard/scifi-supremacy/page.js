'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

export default function SciFiSupremacyDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('swarm')
  const [stats, setStats] = useState({})
  
  const [swarmLogs, setSwarmLogs] = useState([])
  const [darkWeb, setDarkWeb] = useState([])
  const [nodes, setNodes] = useState([])
  const [ghosts, setGhosts] = useState([])
  
  const [genLoading, setGenLoading] = useState('')
  
  // Inputs
  const [swarmIssue, setSwarmIssue] = useState('Payment Gateway 504 Timeout')
  const [dwDomain, setDwDomain] = useState('company.internal')
  const [ghostJourney, setGhostJourney] = useState('User Onboarding Flow (v2.4)')

  useEffect(() => { init() }, [])

  async function init() {
    const { user } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    await loadAll()
    setLoading(false)
  }

  async function loadAll() {
    const res = await Promise.allSettled([
      fetch('/api/scifi-supremacy?type=stats').then(r => r.json()),
      fetch('/api/scifi-supremacy?type=swarm').then(r => r.json()),
      fetch('/api/scifi-supremacy?type=darkweb').then(r => r.json()),
      fetch('/api/scifi-supremacy?type=ar_nodes').then(r => r.json()),
      fetch('/api/scifi-supremacy?type=ghost').then(r => r.json()),
    ])
    const [stR, sR, dR, nR, gR] = res.map(r => r.status === 'fulfilled' ? r.value : {})
    
    setStats(stR?.stats || {})
    setSwarmLogs(sR?.swarm || [])
    setDarkWeb(dR?.intel || [])
    setNodes(nR?.nodes || [])
    setGhosts(gR?.telemetry || [])
  }

  async function action(a, body = {}) {
    setGenLoading(a)
    try {
      await fetch('/api/scifi-supremacy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: a, ...body }) })
      await loadAll()
    } catch (e) {}
    setGenLoading('')
  }

  const S = {
    page: { minHeight: '100vh', background: '#020617', fontFamily: "'DM Sans',sans-serif", color: '#e2e8f0' },
    card: (bg = 'rgba(255,255,255,0.02)') => ({ background: bg, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }),
    badge: c => ({ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: c + '20', color: c, border: `1px solid ${c}40`, display: 'inline-block' }),
    input: { width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#e2e8f0' },
    btn: (c, bg = false) => ({ padding: '11px 22px', background: bg ? `linear-gradient(135deg,${c},${c}bb)` : `${c}20`, border: `1px solid ${bg ? 'transparent' : c + '40'}`, borderRadius: 10, color: bg ? '#fff' : c, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", transition: 'all 0.2s', boxShadow: bg ? `0 4px 20px ${c}40` : 'none' })
  }

  if (loading) return (
    <div style={S.page}><GlobalNav title="Sci-Fi Core" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 64 }}>🌌</div><div style={{ color: '#475569', fontSize: 13, letterSpacing: 2, marginTop: 16 }}>INITIALIZING MATRIX...</div></div>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(200%)}}
        *{box-sizing:border-box;}
        .sf-tab{padding:10px 20px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid rgba(255,255,255,0.07);background:transparent;color:#475569;font-family:'DM Sans',sans-serif;transition:all 0.25s;letter-spacing:0.5px;text-transform:uppercase;}
        .sf-tab:hover{color:#94a3b8;border-color:rgba(255,255,255,0.15);}
        .sf-tab.active{background:linear-gradient(135deg,rgba(168,85,247,0.25),rgba(59,130,246,0.15));color:#d8b4fe;border-color:rgba(168,85,247,0.5);}
        .sf-btn:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.1);}
        input:focus{border-color:rgba(168,85,247,0.6)!important;box-shadow:0 0 0 3px rgba(168,85,247,0.1)!important;outline:none;}
        .matrix-text { font-family: 'Courier New', monospace; font-size: 11px; color: #10b981; }
      `}</style>
      
      <GlobalNav title="NextGen Intelligence Node" />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <span style={{ fontSize: 32 }}>🌌</span>
              <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, background: 'linear-gradient(135deg,#a855f7,#3b82f6,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>
                Sci-Fi Edge Supremacy
              </h1>
            </div>
            <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>P70-73 — Swarm JSON Routing · Zero-Day Intel · AR DC Specs · AI Ghost Telementry</p>
          </div>
          <button style={S.btn('#475569')} className="sf-btn" onClick={loadAll}>↻ Refresh Neural Net</button>
        </div>

        {/* Dashboard Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
          {[
             { icon: '🧠', l: 'Swarm Gossip Packets', v: stats.swarm_messages_passed || 0, c: '#a855f7' },
             { icon: '🕵️‍♂️', l: '0-Day Web Threats Nullified', v: stats.zero_day_threats_blocked || 0, c: '#dc2626' },
             { icon: '👓', l: 'Spatial Components Locked', v: stats.ar_nodes_mapped || 0, c: '#06b6d4' },
             { icon: '👻', l: 'Bugs Caught by Ghost QA', v: stats.ghost_bugs_found || 0, c: '#3b82f6' }
          ].map((s, i) => (
            <div key={i} style={{ ...S.card('rgba(255,255,255,0.02)'), padding: '20px 16px', border: `1px solid rgba(255,255,255,0.05)`, animation: `fadeUp 0.3s ${i * 0.05}s ease both` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 32 }}>{s.icon}</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.l}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button className={`sf-tab${tab === 'swarm' ? ' active' : ''}`} onClick={() => setTab('swarm')}>🧠 Swarm Matrix Simulator (P70)</button>
          <button className={`sf-tab${tab === 'darkweb' ? ' active' : ''}`} onClick={() => setTab('darkweb')}>🕵️‍♂️ Dark Web Intel Node (P71)</button>
          <button className={`sf-tab${tab === 'ar' ? ' active' : ''}`} onClick={() => setTab('ar')}>👓 AR Spatial Backend (P72)</button>
          <button className={`sf-tab${tab === 'ghost' ? ' active' : ''}`} onClick={() => setTab('ghost')}>👻 Ghost User QA (P73)</button>
        </div>

        {/* ═══ SWARM MATRIX SIMULATOR ═══ */}
        {tab === 'swarm' && (
          <div style={{ animation: 'fadeUp 0.3s ease both' }}>
            <div style={{ ...S.card(), padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>🧠 Feed Raw Input into Autonomous Swarm Neural Net</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input style={{ ...S.input, flex: 2 }} placeholder="Provide a raw IT event..." value={swarmIssue} onChange={e => setSwarmIssue(e.target.value)} />
                <button 
                  style={S.btn('#a855f7', true)} 
                  className="sf-btn" 
                  disabled={genLoading === 'trigger_swarm'} 
                  onClick={() => action('trigger_swarm', { issue: swarmIssue }).then(() => setSwarmIssue(''))}
                >
                  {genLoading === 'trigger_swarm' ? '⏳ Agents Negotiating...' : '⚡ Trigger Agent A2A Discussion'}
                </button>
              </div>
            </div>

            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: 20, overflow: 'hidden', position: 'relative' }}>
               {/* Terminal Style view */}
               <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'rgba(16,185,129,0.5)', animation: 'scanline 4s linear infinite' }} />
               <div style={{ color: '#64748b', fontSize: 11, marginBottom: 16, fontFamily: 'monospace' }}>[SYS] A2A Protocol Listener Active. Tailing Matrix Gossips...</div>
               
               {swarmLogs.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#334155' }}>NO RECENT AGENT HANDSHAKES</div>}
               {swarmLogs.map(log => (
                 <div key={log.id} style={{ marginBottom: 16, borderLeft: '2px solid #3b82f6', paddingLeft: 16, animation: 'fadeUp 0.3s ease both' }}>
                   <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6 }}>
                     <span style={S.badge('#3b82f6')}>{log.intent_verb}</span>
                     <div style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 700 }}>{log.sender_agent} <span style={{ color: '#64748b' }}>→</span> {log.recipient_agent}</div>
                     <div style={{ fontSize: 10, color: '#475569' }}>{log.session_id}</div>
                   </div>
                   <div className="matrix-text">
                     {JSON.stringify(log.payload, null, 2)}
                   </div>
                   <div style={{ fontSize: 9, color: '#ec4899', marginTop: 4, fontFamily: 'monospace' }}>PKI Signature: {log.lattice_signature}</div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* ═══ DARK WEB INTEL NODE ═══ */}
        {tab === 'darkweb' && (
          <div style={{ animation: 'fadeUp 0.3s ease both' }}>
            <div style={{ ...S.card(), padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>🕵️‍♂️ Proactive Zero-Day & Credentials Scanner</div>
              <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>NexDesk monitors external Tor indices and CVE repos to revoke keys before clients are aware of leaks.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <input style={{ ...S.input, flex: 1 }} placeholder="Target Domain" value={dwDomain} onChange={e => setDwDomain(e.target.value)} />
                <button 
                  style={S.btn('#dc2626', true)} 
                  className="sf-btn" 
                  disabled={genLoading === 'scan_dark_web'} 
                  onClick={() => action('scan_dark_web', { domain: dwDomain })}
                >
                  {genLoading === 'scan_dark_web' ? '⏳ Probing Hidden Services...' : '🕸️ Initiate Deep Scan'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 14 }}>
              {darkWeb.map((w, i) => (
                <div key={w.id} style={{ ...S.card('rgba(220,38,38,0.03)'), padding: 24, borderLeft: '4px solid #dc2626', animation: `fadeUp 0.3s ${i*0.05}s ease both` }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                     <div>
                       <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                         <span style={S.badge('#dc2626')}>CRITICAL INTELLIGENCE</span>
                         <span style={S.badge('#f59e0b')}>{w.threat_type.replace(/_/g, ' ')}</span>
                       </div>
                       <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0' }}>Exposure found on: {w.detected_on_source}</div>
                       <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Target: {w.target_domain}</div>
                     </div>
                     <span style={{ fontSize: 32 }}>🏴‍☠️</span>
                   </div>
                   
                   <div style={{ padding: 12, background: '#0f172a', borderRadius: 8, border: '1px solid #1e293b', marginBottom: 16 }}>
                     <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>DECRYPTED PAYLOAD SNIPPET</div>
                     <div style={{ fontFamily: 'monospace', color: '#fca5a5', fontSize: 13 }}>{w.leaked_data_snippet}</div>
                   </div>

                   <div style={{ padding: 12, background: 'rgba(16,185,129,0.05)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)' }}>
                     <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700, marginBottom: 4 }}>🛡️ AUTO-MITIGATION DEPLOYED</div>
                     <div style={{ fontSize: 13, color: '#a7f3d0' }}>{w.ai_mitigation_action}</div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ AR SPATIAL BACKEND ═══ */}
        {tab === 'ar' && (
          <div style={{ animation: 'fadeUp 0.3s ease both' }}>
            <div style={{ ...S.card(), padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>👓 Physical Data Center Topography (Spatial 3D Nodes)</div>
              <button 
                style={S.btn('#06b6d4', true)} 
                className="sf-btn" 
                disabled={genLoading === 'generate_ar_coords'} 
                onClick={() => action('generate_ar_coords', { asset_tag: `HW-${Math.floor(Math.random()*9000)+1000}` })}
              >
                {genLoading === 'generate_ar_coords' ? '⏳ Rendering 3D Grid...' : '📍 Extract Next Physical Asset Coordinate'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {nodes.map(n => (
                <div key={n.id} style={{ ...S.card('rgba(6,182,212,0.03)'), padding: 20, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 4, background: n.spatial_status === 'red' ? '#ef4444' : '#10b981' }} />
                  
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>{n.asset_tag}</div>
                  <div style={{ fontSize: 12, color: '#06b6d4', marginBottom: 12 }}>{n.data_center_floor}</div>
                  
                  <div style={{ padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 8, border: '1px solid #1e293b' }}>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6, fontWeight: 700 }}>SPATIAL COORDS</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: '#475569' }}>X</div><div style={{ fontSize: 12, color: '#a5f3fc', fontFamily: 'monospace' }}>{n.coord_x}</div></div>
                      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: '#475569' }}>Y</div><div style={{ fontSize: 12, color: '#a5f3fc', fontFamily: 'monospace' }}>{n.coord_y}</div></div>
                      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: '#475569' }}>Z</div><div style={{ fontSize: 12, color: '#a5f3fc', fontFamily: 'monospace' }}>{n.coord_z}</div></div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{n.rack_id} (Slot: {n.u_slot})</div>
                    {n.spatial_status === 'red' && <div style={{ fontSize: 12, color: '#ef4444', animation: 'pulse 1s infinite' }}>● DOWN</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ GHOST QA TELEMETRY ═══ */}
        {tab === 'ghost' && (
          <div style={{ animation: 'fadeUp 0.3s ease both' }}>
            <div style={{ ...S.card(), padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>👻 Phantom AI QA Web Drivers (Synthetic Load Simulation)</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input style={{ ...S.input, flex: 2 }} placeholder="Target Synthetic Journey..." value={ghostJourney} onChange={e => setGhostJourney(e.target.value)} />
                <button 
                  style={S.btn('#3b82f6', true)} 
                  className="sf-btn" 
                  disabled={genLoading === 'run_ghost_qa'} 
                  onClick={() => action('run_ghost_qa', { journey: ghostJourney })}
                >
                  {genLoading === 'run_ghost_qa' ? '⏳ Phantom Running...' : '👻 Spin up Ghost Bot Instance'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {ghosts.map(g => (
                <div key={g.id} style={{ ...S.card('rgba(59,130,246,0.02)'), padding: 24, borderLeft: `4px solid ${g.journey_status === 'failed' ? '#ef4444' : '#10b981'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <span style={S.badge(g.journey_status === 'failed' ? '#ef4444' : '#10b981')}>Run {g.journey_status.toUpperCase()}</span>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', marginTop: 6 }}>{g.target_journey}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Bot Identity: {g.ghost_bot_id}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: '#3b82f6' }}>{g.total_steps_executed}</div>
                      <div style={{ fontSize: 9, color: '#64748b' }}>STEPS EXECUTED</div>
                    </div>
                  </div>
                  
                  {g.journey_status === 'failed' && (
                    <div style={{ padding: 16, background: 'rgba(239,68,68,0.05)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>
                      <div style={{ fontSize: 11, color: '#fca5a5', fontWeight: 700, marginBottom: 6 }}>❌ FAIL: HTTP {g.caught_error_code} @ {g.failed_at_step_name}</div>
                      <div style={{ background: '#020617', padding: 8, borderRadius: 6, fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', overflowX: 'auto' }}>
                        {g.dom_snapshot}
                      </div>
                      <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 10 }}>P1 Auto-Ticket Generated: <span style={{ color: '#38bdf8' }}>{g.auto_created_ticket_id}</span></div>
                    </div>
                  )}
                  
                  {g.journey_status === 'passed' && (
                    <div style={{ padding: 16, background: 'rgba(16,185,129,0.05)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)' }}>
                      <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>✅ Selenium DOM Assessment Verified</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Frontend components rendered within operational parameters.</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

