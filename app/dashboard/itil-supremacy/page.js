'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

export default function ITILSupremacyDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('problem')
  const [stats, setStats] = useState({})
  
  const [problems, setProblems] = useState([])
  const [cmdbResult, setCmdbResult] = useState(null)
  const [mobileFleet, setMobileFleet] = useState([])
  const [airgapped, setAirgapped] = useState([])
  
  const [genLoading, setGenLoading] = useState('')
  const [cmdbAssetTag, setCmdbAssetTag] = useState('AST-10023')

  // Mobile Simulator
  const [mAgent, setMAgent] = useState('')
  const [agents, setAgents] = useState([])

  useEffect(() => { init() }, [])

  async function init() {
    const { user } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    await loadAll()
    const { data } = await supabase.from('profiles').select('id, full_name').limit(10)
    if (data) setAgents(data)
    setLoading(false)
  }

  async function loadAll() {
    const res = await Promise.allSettled([
      fetch('/api/itil-supremacy?type=stats').then(r => r.json()),
      fetch('/api/itil-supremacy?type=problems').then(r => r.json()),
      fetch('/api/itil-supremacy?type=mobile_fleet').then(r => r.json()),
      fetch('/api/itil-supremacy?type=airgapped').then(r => r.json()),
    ])
    const [stR, pR, mR, aR] = res.map(r => r.status === 'fulfilled' ? r.value : {})
    
    setStats(stR?.stats || {})
    setProblems(pR?.problems || [])
    setMobileFleet(mR?.fleet || [])
    setAirgapped(aR?.deployments || [])
  }

  async function action(a, body = {}) {
    setGenLoading(a)
    try {
      const res = await fetch('/api/itil-supremacy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: a, ...body }) }).then(r=>r.json())
      if (a === 'simulate_blast' && res.success) {
        setCmdbResult(res.blast)
      } else {
        await loadAll()
      }
    } catch (e) {}
    setGenLoading('')
  }

  const S = {
    page: { minHeight: '100vh', background: '#09090b', fontFamily: "'DM Sans',sans-serif", color: '#e4e4e7' },
    card: (bg = 'rgba(255,255,255,0.02)') => ({ background: bg, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }),
    badge: c => ({ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: c + '20', color: c, border: `1px solid ${c}40`, display: 'inline-block' }),
    input: { width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#e4e4e7' },
    btn: (c, bg = false) => ({ padding: '11px 22px', background: bg ? `linear-gradient(135deg,${c},${c}bb)` : `${c}20`, border: `1px solid ${bg ? 'transparent' : c + '40'}`, borderRadius: 10, color: bg ? '#fff' : c, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", transition: 'all 0.2s', boxShadow: bg ? `0 4px 20px ${c}40` : 'none' }),
    sel: { padding: '11px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#e4e4e7' }
  }

  if (loading) return (
    <div style={S.page}><GlobalNav title="ITIL & Gov" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 64 }}>🏛️</div><div style={{ color: '#71717a', fontSize: 13, letterSpacing: 2, marginTop: 16 }}>LOADING GOVERNANCE ENGINE...</div></div>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;}
        .ig-tab{padding:10px 20px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid rgba(255,255,255,0.07);background:transparent;color:#71717a;font-family:'DM Sans',sans-serif;transition:all 0.25s;letter-spacing:0.5px;text-transform:uppercase;}
        .ig-tab:hover{color:#d4d4d8;border-color:rgba(255,255,255,0.15);}
        .ig-tab.active{background:linear-gradient(135deg,rgba(245,158,11,0.25),rgba(220,38,38,0.15));color:#fde68a;border-color:rgba(245,158,11,0.5);}
        .ig-btn:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.1);}
        input:focus,textarea:focus,select:focus{border-color:rgba(245,158,11,0.6)!important;box-shadow:0 0 0 3px rgba(245,158,11,0.1)!important;outline:none;}
      `}</style>
      
      <GlobalNav title="ITIL & Gov Supremacy" />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <span style={{ fontSize: 32 }}>🏛️</span>
              <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, background: 'linear-gradient(135deg,#f59e0b,#ef4444,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>
                ITIL Governance & Infrastructure Framework
              </h1>
            </div>
            <p style={{ color: '#71717a', fontSize: 13, margin: 0 }}>P66-69 — Problem Mining (ITIL) · Blast Radius (CMDB) · App Sync · Air-gapped Infra</p>
          </div>
          <button style={S.btn('#71717a')} className="ig-btn" onClick={loadAll}>↻ Sync Frameworks</button>
        </div>

        {/* Dashboard Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 28 }}>
          {[
             { icon: '🧩', l: 'Root Problems Found', v: stats.total_master_problems || 0, c: '#f59e0b' },
             { icon: '💸', l: 'Avg Problem Cost', v: `₹${stats.total_master_problems ? Math.round((stats.total_problem_cost||0)/stats.total_master_problems) : 0}`, c: '#ef4444' },
             { icon: '🕸️', l: 'Live CMDB Matrix', v: 'ACTIVE', c: '#8b5cf6' },
             { icon: '📱', l: 'FCM Push Enrolled', v: stats.mobile_agents_enrolled || 0, c: '#06b6d4' },
             { icon: '🖧', l: 'Air-Gapped Nodes Tracked', v: stats.total_onprem_nodes || 0, c: '#10b981' }
          ].map((s, i) => (
            <div key={i} style={{ ...S.card('rgba(255,255,255,0.02)'), padding: '16px 12px', border: `1px solid rgba(255,255,255,0.05)`, animation: `fadeUp 0.3s ${i * 0.05}s ease both`, textAlign: 'center' }}>
              <div style={{ fontSize: 24 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: s.c, marginTop: 4 }}>{s.v}</div>
              <div style={{ fontSize: 9, color: '#71717a', marginTop: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button className={`ig-tab${tab === 'problem' ? ' active' : ''}`} onClick={() => setTab('problem')}>🧩 ITIL Problem Manager (P66)</button>
          <button className={`ig-tab${tab === 'cmdb' ? ' active' : ''}`} onClick={() => setTab('cmdb')}>🕸️ CMDB Blast Radius (P68)</button>
          <button className={`ig-tab${tab === 'mobile' ? ' active' : ''}`} onClick={() => setTab('mobile')}>📱 Mobile Push Fleet (P67)</button>
          <button className={`ig-tab${tab === 'airgap' ? ' active' : ''}`} onClick={() => setTab('airgap')}>🖧 Validated On-Prem Deployment (P69)</button>
        </div>

        {/* ═══ ITIL PROBLEM MANAGER ═══ */}
        {tab === 'problem' && (
          <div style={{ animation: 'fadeUp 0.3s ease both' }}>
            <div style={{ ...S.card(), padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e4e4e7', marginBottom: 16 }}>🧩 AI Pattern Mining: Group Incidents into Root Master Problems</div>
              <p style={{ color: '#71717a', fontSize: 13, marginBottom: 16 }}>The AI continuously scans incoming L1 tickets for shared dependencies and underlying themes to prevent duplicate effort (Root Cause Analysis automation).</p>
              <button 
                style={S.btn('#f59e0b', true)} 
                className="ig-btn" 
                disabled={genLoading === 'detect_problem'} 
                onClick={() => action('detect_problem')}
              >
                {genLoading === 'detect_problem' ? '⏳ Scanning Tickets...' : '🔍 Mine Open Tickets for Root ITIL Problems'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {problems.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#52525b' }}>No Master problems identified</div>}
              {problems.map(p => (
                <div key={p.id} style={{ ...S.card('rgba(245,158,11,0.03)'), padding: 24, borderLeft: `5px solid #f59e0b` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <span style={S.badge(p.state === 'investigating' ? '#ef4444' : '#10b981')}>{p.state.toUpperCase()}</span>
                        <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>{p.linked_incident_count} Linked Incidents Filtered</span>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#e4e4e7' }}>{p.problem_title}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: '#ef4444' }}>₹{Math.round(p.estimated_business_impact_inr/1000)}K</div>
                      <div style={{ fontSize: 10, color: '#71717a' }}>IMPACT / DOWNTIME COST</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 10, color: '#a1a1aa', fontWeight: 700, marginBottom: 4 }}>🤖 AI AUTO-GENERATED ROOT CAUSE (RCA)</div>
                      <div style={{ fontSize: 13, color: '#e4e4e7' }}>{p.rca_summary}</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700, marginBottom: 4 }}>✅ WORKAROUND / KEDB ENTRY</div>
                      <div style={{ fontSize: 12, color: '#a7f3d0' }}>{p.workaround_details}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ CMDB BLAST RADIUS ═══ */}
        {tab === 'cmdb' && (
          <div style={{ animation: 'fadeUp 0.3s ease both' }}>
            <div style={{ ...S.card(), padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e4e4e7', marginBottom: 16 }}>🕸️ Blast Radius Graph Simulator (CMDB Toplogy Engine)</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input style={{ ...S.input, flex: 1 }} placeholder="Enter Root Failed Asset Tag (e.g. AST-10023)" value={cmdbAssetTag} onChange={e => setCmdbAssetTag(e.target.value)} />
                <button 
                  style={S.btn('#8b5cf6', true)} 
                  className="ig-btn" 
                  disabled={genLoading === 'simulate_blast' || !cmdbAssetTag} 
                  onClick={() => action('simulate_blast', { asset_tag: cmdbAssetTag })}
                >
                  {genLoading === 'simulate_blast' ? '⏳ Calculating Cascading Impact...' : '🕸️ Calculate Blast Radius'}
                </button>
              </div>
            </div>

            {cmdbResult && (
               <div style={{ ...S.card('rgba(139,92,246,0.05)'), padding: 30, border: '1px solid #8b5cf666', animation: 'fadeUp 0.3s ease both' }}>
                 <div style={{ textAlign: 'center', marginBottom: 24 }}>
                   <div style={{ fontSize: 32, marginBottom: 8 }}>🔥</div>
                   <div style={{ fontSize: 14, color: '#ef4444', fontWeight: 800 }}>ROOT FAILURE IDENTIFIED</div>
                   <div style={{ fontSize: 24, fontWeight: 900, color: '#f4f4f5' }}>{cmdbResult.root_failed}</div>
                 </div>
                 
                 <div style={{ borderTop: '2px dashed #3f3f46', position: 'relative', margin: '30px 0' }}>
                   <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#09090b', padding: '0 10px', fontSize: 11, color: '#a1a1aa' }}>Cascading Sub-System Failures (Blast Radius)</div>
                 </div>

                 <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                   {cmdbResult.blast_radius.map((br, i) => (
                     <div key={i} style={{ padding: '12px 20px', background: '#3f3f46', borderRadius: 8, color: '#f4f4f5', fontWeight: 600, border: '1px solid #52525b', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
                       {br}
                     </div>
                   ))}
                 </div>
                 
                 <div style={{ marginTop: 24, padding: 16, background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid #ef444444' }}>
                   <div style={{ fontSize: 11, color: '#fca5a5', fontWeight: 700, marginBottom: 4 }}>🤖 AI CHANGE-ADVISORY BOARD (CAB) ASSESSMENT</div>
                   <div style={{ fontSize: 13, color: '#fecaca', lineHeight: 1.5 }}>{cmdbResult.summary}</div>
                 </div>
               </div>
            )}
          </div>
        )}

        {/* ═══ MOBILE FLEET SYNC ═══ */}
        {tab === 'mobile' && (
          <div style={{ animation: 'fadeUp 0.3s ease both' }}>
            <div style={{ ...S.card(), padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e4e4e7', marginBottom: 16 }}>📱 Agent Push Notification Node (PNN) Registration</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <select style={{ ...S.sel, flex: 2 }} value={mAgent} onChange={e => setMAgent(e.target.value)}>
                  <option value="">Select Agent...</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                </select>
                <select style={{ ...S.sel, flex: 1 }} id="osSelect">
                  <option value="iOS">iOS 17.4</option>
                  <option value="Android">Android 14</option>
                </select>
                <button 
                  style={S.btn('#06b6d4', true)} 
                  className="ig-btn" 
                  disabled={genLoading === 'sync_mobile' || !mAgent} 
                  onClick={() => action('sync_mobile', { agent_id: mAgent, os: document.getElementById('osSelect').value })}
                >
                  {genLoading === 'sync_mobile' ? '⏳ Handshaking tokens...' : '📡 Sync Push Device Endpoint'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {mobileFleet.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#52525b' }}>No mobile nodes registered</div>}
              {mobileFleet.map(m => (
                <div key={m.id} style={{ ...S.card('rgba(6,182,212,0.03)'), padding: 20, borderLeft: '3px solid #06b6d4' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#e4e4e7' }}>{m.agent?.full_name || 'System Agent'}</div>
                      <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 2 }}>{m.device_os} • {m.app_version}</div>
                    </div>
                    <span style={{ fontSize: 24 }}>{m.device_os.includes('iOS') ? '📱' : '📲'}</span>
                  </div>
                  <div style={{ background: '#18181b', padding: 8, borderRadius: 6, fontSize: 10, color: '#71717a', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    FCM: {m.fcm_push_token}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}>
                    <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>● Device Reachable</div>
                    <div style={{ fontSize: 11, color: '#71717a' }}>Cache: {Math.round(m.offline_cache_size_mb)}MB</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ AIR GAPPED DEPLOYMENT ═══ */}
        {tab === 'airgap' && (
          <div style={{ animation: 'fadeUp 0.3s ease both' }}>
            <div style={{ ...S.card(), padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e4e4e7', marginBottom: 16 }}>🖧 Validated Enterprise Air-Gapped Network Dashboard</div>
              <p style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 16 }}>Use this to ingest offline encrypted `.nxd` JSON packets returned from isolated client datacenters that have no internet access.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <input style={{ ...S.input, flex: 1 }} id="dcClient" placeholder="e.g., NSA Defense Intranet Node 01" defaultValue="SBI Core Intranet" />
                <button 
                  style={S.btn('#10b981', true)} 
                  className="ig-btn" 
                  disabled={genLoading === 'sync_airgap'} 
                  onClick={() => action('sync_airgap', { client_name: document.getElementById('dcClient').value })}
                >
                  {genLoading === 'sync_airgap' ? '⏳ Decrypting USB Packet...' : '🔌 Import Air-Gapped Health Packet Dump'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 16 }}>
              {airgapped.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#52525b' }}>No isolated instances synchronized.</div>}
              {airgapped.map(g => (
                <div key={g.id} style={{ ...S.card('rgba(16,185,129,0.03)'), padding: 24, display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 20 }}>
                    <div style={{ fontSize: 40 }}>🖧</div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#f4f4f5', marginBottom: 4 }}>{g.client_name}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={S.badge('#10b981')}>AIR-GAPPED 100% SECURE</span>
                        <span style={S.badge('#71717a')}>Version: {g.installed_version}</span>
                        <span style={S.badge('#8b5cf6')}>{g.node_count} Worker Nodes</span>
                      </div>
                      
                      <div style={{ marginTop: 24, padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 8, display: 'inline-flex', gap: 40, border: '1px dashed #3f3f46' }}>
                        <div>
                          <div style={{ fontSize: 10, color: '#71717a' }}>INGESTED CPU LOAD</div>
                          <div style={{ fontSize: 16, color: '#a7f3d0', fontWeight: 700 }}>{g.infra_status_json?.cpu || 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#71717a' }}>INGESTED MEMORY</div>
                          <div style={{ fontSize: 16, color: '#a7f3d0', fontWeight: 700 }}>{g.infra_status_json?.mem || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 11, color: '#71717a' }}>
                      <strong>Last Packet Handshake:</strong><br />
                      {new Date(g.last_health_packet_date).toLocaleString()}
                    </div>
                    <button style={S.btn('#ef4444', false)} disabled>🛡️ Offline (Cannot Push DB)</button>
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

