'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

const SEV_C = { critical: '#dc2626', high: '#d97706', medium: '#6366f1', low: '#16a34a' }
const CHAN_C = { sms: '#f59e0b', slack: '#ec4899', in_app: '#6366f1', email: '#06b6d4', push: '#8b5cf6' }
const PROVIDERS = { jira: 'Jira', slack: 'Slack', pagerduty: 'PagerDuty', salesforce: 'Salesforce', github: 'GitHub' }

export default function EcosystemDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('experts')
  const [stats, setStats] = useState({})
  
  const [experts, setExperts] = useState([])
  const [burnoutScans, setBurnoutScans] = useState([])
  const [gaps, setGaps] = useState([])
  const [integrations, setIntegrations] = useState([])
  const [notifications, setNotifications] = useState([])
  const [agents, setAgents] = useState([])
  
  const [genLoading, setGenLoading] = useState('')
  const [ticketQuery, setTicketQuery] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('jira')
  const [notifContext, setNotifContext] = useState('')
  
  const [expandedGap, setExpandedGap] = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { user } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    await loadAll()
    setLoading(false)
  }

  async function loadAll() {
    const res = await Promise.allSettled([
      fetch('/api/ecosystem-supremacy?type=stats').then(r => r.json()),
      fetch('/api/ecosystem-supremacy?type=experts').then(r => r.json()),
      fetch('/api/ecosystem-supremacy?type=burnout').then(r => r.json()),
      fetch('/api/ecosystem-supremacy?type=knowledge_gaps').then(r => r.json()),
      fetch('/api/ecosystem-supremacy?type=integrations').then(r => r.json()),
      fetch('/api/ecosystem-supremacy?type=notifications').then(r => r.json()),
      fetch('/api/ecosystem-supremacy?type=agents_list').then(r => r.json()),
    ])
    const [stR, expR, bR, kgR, inR, ntR, agR] = res.map(r => r.status === 'fulfilled' ? r.value : {})
    
    setStats(stR?.stats || {})
    setExperts(expR?.experts || [])
    setBurnoutScans(bR?.scans || [])
    setGaps(kgR?.gaps || [])
    setIntegrations(inR?.integrations || [])
    setNotifications(ntR?.notifications || [])
    setAgents(agR?.agents || [])
  }

  async function action(a, body = {}) {
    setGenLoading(a)
    try {
      await fetch('/api/ecosystem-supremacy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: a, ...body }) })
      await loadAll()
    } catch (e) {}
    setGenLoading('')
  }

  const S = {
    page: { minHeight: '100vh', background: '#050714', fontFamily: "'DM Sans',sans-serif", color: '#e2e8f0' },
    card: (c = 'rgba(255,255,255,0.03)') => ({ background: c, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }),
    badge: c => ({ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: c + '20', color: c, border: `1px solid ${c}40`, display: 'inline-block' }),
    input: { width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#e2e8f0' },
    btn: (c, bg = false) => ({ padding: '11px 22px', background: bg ? `linear-gradient(135deg,${c},${c}bb)` : `${c}20`, border: `1px solid ${bg ? 'transparent' : c + '40'}`, borderRadius: 10, color: bg ? '#fff' : c, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", transition: 'all 0.2s', boxShadow: bg ? `0 4px 20px ${c}40` : 'none' }),
    sel: { padding: '11px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#e2e8f0' },
  }

  if (loading) return (
    <div style={S.page}><GlobalNav title="Ecosystem Supremacy" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 64 }}>🌍</div><div style={{ color: '#475569', fontSize: 13, letterSpacing: 2, marginTop: 16 }}>LOADING WORKFORCE & APPS...</div></div>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;}
        .es-tab{padding:10px 20px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid rgba(255,255,255,0.07);background:transparent;color:#475569;font-family:'DM Sans',sans-serif;transition:all 0.25s;letter-spacing:0.5px;text-transform:uppercase;}
        .es-tab:hover{color:#94a3b8;border-color:rgba(255,255,255,0.12);}
        .es-tab.active{background:linear-gradient(135deg,rgba(16,185,129,0.25),rgba(6,182,212,0.15));color:#a7f3d0;border-color:rgba(16,185,129,0.5);}
        .es-btn:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.1);}
        input:focus,select:focus,textarea:focus{border-color:rgba(16,185,129,0.6)!important;box-shadow:0 0 0 3px rgba(16,185,129,0.1)!important;outline:none;}
        .glass-row:hover{background:rgba(255,255,255,0.05)!important;cursor:pointer;}
      `}</style>
      
      <GlobalNav title="Ecosystem Supremacy Hub" />

      <div style={{ maxWidth: 1500, margin: '0 auto', padding: '28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <span style={{ fontSize: 32 }}>🌍</span>
              <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, background: 'linear-gradient(135deg,#10b981,#06b6d4,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>
                Ecosystem & Workforce Hub
              </h1>
            </div>
            <p style={{ color: '#334155', fontSize: 13, margin: 0 }}>P51-55 — Experts · Burnout · Knowledge Gaps · Integrations · Smart Alerts</p>
          </div>
          <button style={S.btn('#475569', false)} className="es-btn" onClick={loadAll}>↻ Refresh</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10,1fr)', gap: 8, marginBottom: 28 }}>
          {[
            { icon: '🧠', l: 'Identified Experts', v: stats.total_experts || 0, c: '#10b981' },
            { icon: '🔥', l: 'Critical Burnout', v: stats.critical_burnout || 0, c: '#dc2626' },
            { icon: '⚠️', l: 'High Risk Burnout', v: stats.high_burnout || 0, c: '#d97706' },
            { icon: '💸', l: 'Cost of KB Gaps', v: `₹${Math.round((stats.total_gap_cost || 0)/1000)}K`, c: '#f59e0b' },
            { icon: '📚', l: 'Missing Articles', v: stats.active_gaps || 0, c: '#8b5cf6' },
            { icon: '🔌', l: 'Connected Apps', v: stats.connected_apps || 0, c: '#06b6d4' },
            { icon: '📢', l: 'Alerts Sent', v: stats.notifications_sent || 0, c: '#3b82f6' },
            { icon: '🚨', l: 'High Urgency Alert', v: stats.high_urgency_alerts || 0, c: '#ec4899' },
          ].map((s, i) => (
            <div key={i} style={{ ...S.card(`${s.c}08`), padding: '12px 10px', border: `1px solid ${s.c}20`, animation: `fadeUp 0.3s ${i * 0.03}s ease both`, textAlign: 'center' }}>
              <div style={{ fontSize: 18 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: s.c, marginTop: 4 }}>{s.v}</div>
              <div style={{ fontSize: 9, color: '#475569', marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { key: 'experts', l: `🧠 Expert Finder (${experts.length})` },
            { key: 'burnout', l: `🔥 Burnout Radar (${burnoutScans.length})` },
            { key: 'gaps', l: `📚 KB Gap Detect (${gaps.length})` },
            { key: 'connector', l: `🔌 Univ. Connector (${integrations.length})` },
            { key: 'notify', l: `📢 Smart Notify (${notifications.length})` },
          ].map(t => <button key={t.key} className={`es-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>{t.l}</button>)}
        </div>

        {/* ═══ EXPERT FINDER ═══ */}
        {tab === 'experts' && (
          <div>
            <div style={{ ...S.card(), padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>🧠 AI Expert Finder</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={S.input} placeholder="Describe the complex issue to find the ONE exact person to assign it to..." value={ticketQuery} onChange={e => setTicketQuery(e.target.value)} />
                <button style={S.btn('#10b981', true)} className="es-btn" disabled={genLoading === 'find_expert' || !ticketQuery.trim()} onClick={() => action('find_expert', { ticket_description: ticketQuery }).then(() => setTicketQuery(''))}>
                  {genLoading === 'find_expert' ? '⏳ Scanning Talent...' : '🔎 Find Expert'}
                </button>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 14 }}>
              {experts.length === 0 ? (
                <div style={{ ...S.card(), padding: 70, textAlign: 'center', gridColumn: '1/-1' }}><div style={{ fontSize: 56, opacity: 0.15 }}>🧠</div><div style={{ fontSize: 14, color: '#334155', marginTop: 16 }}>Describe an issue to find experts</div></div>
              ) : experts.map(e => (
                <div key={e.id} style={{ ...S.card('rgba(16,185,129,0.03)'), padding: 20, borderTop: `3px solid #10b981`, animation: 'fadeUp 0.3s ease both' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#a7f3d0', marginBottom: 2 }}>{e.agent_name}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        {(e.top_categories || []).map((c, i) => <span key={i} style={S.badge('#06b6d4')}>{c}</span>)}
                        {(e.niche_expertise || []).map((n, i) => <span key={i} style={S.badge('#8b5cf6')}>{n}</span>)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: '#10b981' }}>{e.expert_score}%</div>
                      <div style={{ fontSize: 9, color: '#64748b' }}>CONFIDENCE</div>
                    </div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>💡 AI SUMMARY</div>
                    <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>{e.ai_expertise_summary}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ BURNOUT DETECTION ═══ */}
        {tab === 'burnout' && (
          <div>
            <div style={{ ...S.card(), padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>🔥 Run Burnout Scanner</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select style={{ ...S.sel, width: 300 }} value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
                  <option value="">Select Agent to Scan...</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.full_name || a.email}</option>)}
                </select>
                <button style={S.btn('#dc2626', true)} className="es-btn" disabled={genLoading === 'scan_burnout' || !selectedAgent} onClick={() => action('scan_burnout', { agent_id: selectedAgent }).then(() => setSelectedAgent(''))}>
                  {genLoading === 'scan_burnout' ? '⏳ Profiling...' : '🔥 Scan Agent'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: 14 }}>
              {burnoutScans.length === 0 ? <div style={{ ...S.card(), padding: 70, textAlign: 'center', gridColumn: '1/-1' }}><div style={{ fontSize: 56, opacity: 0.15 }}>🔥</div><div style={{ fontSize: 14, color: '#334155', marginTop: 16 }}>No scans completed yet</div></div>
              : burnoutScans.map(s => (
                <div key={s.id} style={{ ...S.card(SEV_C[s.burnout_level]+'08'), padding: 20, borderLeft: `6px solid ${SEV_C[s.burnout_level]}`, animation: 'fadeUp 0.3s ease both' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0', marginBottom: 2 }}>{s.agent_name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Scan Period: {s.scan_period}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {s.intervention_applied && <span style={S.badge('#10b981')}>Intervention Applied</span>}
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 900, color: SEV_C[s.burnout_level] }}>{s.burnout_risk_score}</div>
                        <div style={{ fontSize: 9, color: '#64748b' }}>RISK SCORE</div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                    <span style={S.badge(s.burnout_level === 'critical' ? '#dc2626' : '#64748b')}>{s.burnout_level} hazard</span>
                    <span style={S.badge(s.sentiment_score < 40 ? '#d97706' : '#64748b')}>Sentiment: {s.sentiment_score}</span>
                    <span style={S.badge('#06b6d4')}>Handling: {s.avg_handling_time_trend}</span>
                  </div>

                  <div style={{ padding: 12, borderRadius: 10, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#fca5a5', marginBottom: 4 }}>🚩 AI INDICATORS</div>
                    {(s.ai_burnout_indicators || []).map((ind, i) => <div key={i} style={{ fontSize: 12, color: '#e2e8f0', marginBottom: 2 }}>• {ind}</div>)}
                  </div>
                  
                  <div style={{ padding: 12, borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#86efac', marginBottom: 4 }}>💊 INTERVENTION PLAN</div>
                    <div style={{ fontSize: 13, color: '#a7f3d0' }}>{s.ai_intervention_plan}</div>
                    {!s.intervention_applied && (
                      <button style={{ ...S.btn('#10b981', true), padding: '6px 14px', fontSize: 11, marginTop: 8 }} className="es-btn" onClick={() => action('update_burnout', { id: s.id })}>
                        Apply Intervention
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ KNOWLEDGE GAP DETECT ═══ */}
        {tab === 'gaps' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button style={S.btn('#8b5cf6', true)} className="es-btn" disabled={genLoading === 'detect_gap'} onClick={() => action('detect_gap')}>
                {genLoading === 'detect_gap' ? '⏳ Mining Gaps...' : '📚 Auto-Detect Missing KB'}
              </button>
            </div>
            {gaps.length === 0 ? <div style={{ ...S.card(), padding: 70, textAlign: 'center' }}><div style={{ fontSize: 56, opacity: 0.15 }}>📚</div><div style={{ fontSize: 14, color: '#334155', marginTop: 16 }}>No gaps analyzed</div></div>
            : gaps.map(g => (
              <div key={g.id} className="glass-row" style={{ ...S.card(), padding: 24, marginBottom: 14, animation: 'fadeUp 0.3s ease both', borderLeft: '4px solid #8b5cf6' }} onClick={() => setExpandedGap(expandedGap === g.id ? null : g.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <span style={S.badge('#8b5cf6')}>KB Gap</span>
                      <span style={S.badge(g.status === 'identified' ? '#d97706' : '#10b981')}>{g.status}</span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{g.escalation_count} L2 Escalations</span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>{g.gap_topic}</div>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Draft Title: {g.ai_suggested_kb_title}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#f59e0b' }}>₹{Math.round((g.cost_of_gap_inr || 0)/1000)}K</div>
                    <div style={{ fontSize: 9, color: '#475569' }}>WASTED COST</div>
                  </div>
                </div>
                {expandedGap === g.id && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ padding: 16, background: '#0f172a', borderRadius: 8, color: '#e2e8f0', fontSize: 13, whiteSpace: 'pre-wrap', fontFamily: 'monospace', border: '1px solid #1e293b' }}>
                      {g.ai_suggested_kb_draft}
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                      {g.status === 'identified' && <button style={S.btn('#10b981', true)} className="es-btn" onClick={e => { e.stopPropagation(); action('update_gap', { id: g.id, status: 'published' }) }}>Publish to Knowledge Base</button>}
                      <button style={S.btn('#475569', false)} className="es-btn" onClick={e => { e.stopPropagation(); action('update_gap', { id: g.id, status: 'ignored' }) }}>Ignore Theme</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ═══ UNIVERSAL CONNECTOR ═══ */}
        {tab === 'connector' && (
          <div>
            <div style={{ ...S.card(), padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>🔌 Sync External App</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select style={{ ...S.sel, width: 250 }} value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)}>
                  {Object.entries(PROVIDERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button style={S.btn('#06b6d4', true)} className="es-btn" disabled={genLoading === 'sync_integration'} onClick={() => action('sync_integration', { provider: selectedProvider })}>
                  {genLoading === 'sync_integration' ? '⏳ Connecting...' : '🔄 Run Sync'}
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {integrations.length === 0 ? <div style={{ ...S.card(), padding: 70, textAlign: 'center', gridColumn: '1/-1' }}><div style={{ fontSize: 56, opacity: 0.15 }}>🔌</div><div style={{ fontSize: 14, color: '#334155', marginTop: 16 }}>No integrations tested</div></div>
              : integrations.map(int => (
                <div key={int.id} style={{ ...S.card(), padding: 20, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ height: 4, background: int.connection_status === 'connected' ? '#10b981' : '#dc2626', position: 'absolute', top: 0, left: 0, right: 0 }} />
                  <div style={{ fontSize: 32, marginBottom: 8, marginTop: 10 }}>{PROVIDERS[int.provider] ? PROVIDERS[int.provider][0] : '🔌'}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>{PROVIDERS[int.provider] || int.provider}</div>
                  <span style={S.badge(int.connection_status === 'connected' ? '#10b981' : '#dc2626')}>{int.connection_status}</span>
                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#06b6d4' }}>{int.total_events_synced}</div>
                      <div style={{ fontSize: 9, color: '#64748b' }}>EVENTS SYNCED</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: int.error_count > 0 ? '#dc2626' : '#475569' }}>{int.error_count}</div>
                      <div style={{ fontSize: 9, color: '#64748b' }}>ERRORS</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ SMART NOTIFICATIONS ═══ */}
        {tab === 'notify' && (
          <div>
            <div style={{ ...S.card(), padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>📢 Simulate System Alert</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select style={{ ...S.sel, width: 250 }} value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
                  <option value="">Select On-Call Agent...</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.full_name || a.email}</option>)}
                </select>
                <input style={S.input} placeholder="Describe the trigger event (e.g. Server cpu load at 100% for 10mins)" value={notifContext} onChange={e => setNotifContext(e.target.value)} />
                <button style={S.btn('#3b82f6', true)} className="es-btn" disabled={genLoading === 'smart_notify' || !selectedAgent || !notifContext.trim()} onClick={() => action('smart_notify', { user_id: selectedAgent, event_context: notifContext }).then(() => setNotifContext(''))}>
                  {genLoading === 'smart_notify' ? '⏳ Dispatching...' : '📡 Send Alert'}
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notifications.length === 0 ? <div style={{ ...S.card(), padding: 70, textAlign: 'center' }}><div style={{ fontSize: 56, opacity: 0.15 }}>📢</div><div style={{ fontSize: 14, color: '#334155', marginTop: 16 }}>No intelligent alerts sent</div></div>
              : notifications.map(n => (
                <div key={n.id} style={{ ...S.card(CHAN_C[n.delivery_channel]+'05'), padding: '16px 20px', borderLeft: `4px solid ${CHAN_C[n.delivery_channel] || '#64748b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>To: {n.target?.full_name || 'Agent'}</span>
                      <span style={S.badge(CHAN_C[n.delivery_channel] || '#64748b')}>via {n.delivery_channel.toUpperCase()}</span>
                      <span style={S.badge(n.urgency_score > 80 ? '#dc2626' : '#d97706')}>Priority {n.urgency_score}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{new Date(n.created_at).toLocaleTimeString()}</div>
                  </div>
                  <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600, marginBottom: 8 }}>{n.ai_summarized_message}</div>
                  <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#94a3b8' }}>🤖 AI Logic:</span> {n.delivery_reason}
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

