'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

const SEV_C = { P1: '#dc2626', P2: '#d97706', P3: '#2563eb', P4: '#16a34a' }
const SEV_LABEL = { P1: '🔴 P1-Catastrophic', P2: '🟠 P2-Critical', P3: '🔵 P3-Major', P4: '🟢 P4-Minor' }
const SWOT_C = { S: '#16a34a', W: '#dc2626', O: '#2563eb', T: '#d97706' }
const SWOT_LABEL = { S: '💪 Strengths', W: '⚠️ Weaknesses', O: '🚀 Opportunities', T: '⚡ Threats' }

export default function NextGenDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('warroom')
  const [stats, setStats] = useState({})
  const [portals, setPortals] = useState([])
  const [twins, setTwins] = useState([])
  const [simulations, setSimulations] = useState([])
  const [rooms, setRooms] = useState([])
  const [reports, setReports] = useState([])
  const [commands, setCommands] = useState([])
  const [agents, setAgents] = useState([])
  const [tickets, setTickets] = useState([])
  const [user, setUser] = useState(null)

  // Forms
  const [genLoading, setGenLoading] = useState('')
  const [portalName, setPortalName] = useState('')
  const [portalEmail, setPortalEmail] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('')
  const [selectedTicket, setSelectedTicket] = useState('')
  const [selectedTwin, setSelectedTwin] = useState('')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [incTitle, setIncTitle] = useState('')
  const [incSev, setIncSev] = useState('P2')
  const [incCmd, setIncCmd] = useState('')
  const [updateMsg, setUpdateMsg] = useState('')
  const [rootCause, setRootCause] = useState('')
  const [cmdInput, setCmdInput] = useState('')
  const [cmdHistory, setCmdHistory] = useState([])
  const cmdRef = useRef(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { user } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    setUser(user)
    await loadAll()
    setLoading(false)
  }

  async function loadAll() {
    const results = await Promise.allSettled([
      fetch('/api/nextgen-intelligence?type=stats').then(r => r.json()),
      fetch('/api/nextgen-intelligence?type=portals').then(r => r.json()),
      fetch('/api/nextgen-intelligence?type=twins').then(r => r.json()),
      fetch('/api/nextgen-intelligence?type=simulations').then(r => r.json()),
      fetch('/api/nextgen-intelligence?type=war_rooms').then(r => r.json()),
      fetch('/api/nextgen-intelligence?type=competitor_reports').then(r => r.json()),
      fetch('/api/nextgen-intelligence?type=commands').then(r => r.json()),
      fetch('/api/nextgen-intelligence?type=agents').then(r => r.json()),
      fetch('/api/nextgen-intelligence?type=tickets_list').then(r => r.json()),
    ])
    const [stR, pR, twR, siR, wrR, crR, cmR, agR, tkR] = results.map(r => r.status === 'fulfilled' ? r.value : {})
    setStats(stR?.stats || {})
    setPortals(pR?.portals || [])
    setTwins(twR?.twins || [])
    setSimulations(siR?.simulations || [])
    setRooms(wrR?.rooms || [])
    setReports(crR?.reports || [])
    setCommands(cmR?.commands || [])
    setAgents(agR?.agents || [])
    setTickets(tkR?.tickets || [])
  }

  async function action(a, body = {}) {
    setGenLoading(a)
    try {
      const res = await fetch('/api/nextgen-intelligence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: a, ...body }),
      })
      const data = await res.json()
      await loadAll()
      return data
    } catch (e) {}
    setGenLoading('')
  }

  async function runCommand() {
    if (!cmdInput.trim()) return
    const input = cmdInput
    setCmdInput('')
    setCmdHistory(prev => [...prev, { role: 'user', text: input }])
    try {
      const res = await fetch('/api/nextgen-intelligence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'command', input, user_id: user?.id }),
      })
      const data = await res.json()
      setCmdHistory(prev => [...prev, {
        role: 'os',
        text: data.result?.narrative || data.result?.result_summary || 'Command executed.',
        data: data.result?.result_data,
      }])
      await loadAll()
    } catch (e) {
      setCmdHistory(prev => [...prev, { role: 'os', text: 'Command failed. Please try again.', error: true }])
    }
    setTimeout(() => cmdRef.current?.scrollTo(0, cmdRef.current.scrollHeight), 100)
  }

  const S = {
    page: { minHeight: '100vh', background: '#0a0a14', fontFamily: "'DM Sans',sans-serif", color: '#e2e8f0' },
    card: (c = 'rgba(255,255,255,0.04)') => ({ background: c, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, backdropFilter: 'blur(10px)' }),
    badge: (c) => ({ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: c + '22', color: c, border: `1px solid ${c}44`, display: 'inline-block' }),
    input: { width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#e2e8f0' },
    btn: (c = '#6366f1') => ({ padding: '10px 22px', background: c, border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", transition: 'all 0.2s', letterSpacing: 0.2 }),
    btnO: { padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', fontSize: 12, fontFamily: "'DM Sans',sans-serif" },
    select: { padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#e2e8f0' },
  }

  if (loading) return (
    <div style={S.page}><GlobalNav title="NexGen Intelligence" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 60 }}>🚀</div>
          <div style={{ color: '#64748b', marginTop: 12, letterSpacing: 2, fontSize: 13 }}>INITIALIZING NEXGEN INTELLIGENCE...</div>
        </div>
      </div>
    </div>
  )

  const latestReport = reports[0]
  const activeRooms = rooms.filter(r => r.status === 'active')

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        * { box-sizing:border-box; }
        .ng-tab { padding:9px 18px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid rgba(255,255,255,0.08); background:transparent; color:#64748b; font-family:'DM Sans',sans-serif; transition:all 0.2s; letter-spacing:0.5px; text-transform:uppercase; }
        .ng-tab:hover { color:#94a3b8; border-color:rgba(255,255,255,0.15); }
        .ng-tab.active { background:rgba(99,102,241,0.2); color:#a5b4fc; border-color:rgba(99,102,241,0.5); }
        .ng-btn:hover { transform:translateY(-1px); filter:brightness(1.15); }
        .ng-row:hover { background:rgba(99,102,241,0.06) !important; }
        .cmd-input:focus { border-color:rgba(99,102,241,0.6) !important; box-shadow:0 0 0 3px rgba(99,102,241,0.15); }
        .pulse-dot { width:8px; height:8px; border-radius:50%; background:#dc2626; animation:pulse 1s infinite; display:inline-block; }
      `}</style>

      <GlobalNav title="NexGen Intelligence Hub" />

      <div style={{ maxWidth: 1500, margin: '0 auto', padding: '28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, background: 'linear-gradient(135deg,#6366f1 0%,#a855f7 50%,#06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>
              🚀 NexGen Intelligence Hub
            </h1>
            <p style={{ color: '#475569', fontSize: 13, margin: '6px 0 0', letterSpacing: 0.3 }}>P36-40 — Client Portal · Digital Twin · Incident War Room · Competitor Intel · Command OS</p>
          </div>
          {activeRooms.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'rgba(220,38,38,0.12)', borderRadius: 10, border: '1px solid rgba(220,38,38,0.3)' }}>
              <span className="pulse-dot" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fca5a5' }}>{activeRooms.length} Active Incident{activeRooms.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9,1fr)', gap: 8, marginBottom: 28 }}>
          {[
            { icon: '🌐', label: 'Portals', val: stats.active_portals || 0, c: '#06b6d4' },
            { icon: '🤖', label: 'Twins', val: stats.twins_trained || 0, c: '#8b5cf6' },
            { icon: '🎯', label: 'Twin Accuracy', val: `${stats.avg_twin_accuracy || 0}%`, c: stats.avg_twin_accuracy > 75 ? '#16a34a' : '#d97706' },
            { icon: '🧪', label: 'Simulations', val: stats.simulations_run || 0, c: '#6366f1' },
            { icon: '🎭', label: 'Sim Accuracy', val: `${stats.avg_sim_accuracy || 0}%`, c: stats.avg_sim_accuracy > 75 ? '#16a34a' : '#d97706' },
            { icon: '🚨', label: 'Active Incidents', val: stats.active_incidents || 0, c: stats.active_incidents > 0 ? '#dc2626' : '#16a34a' },
            { icon: '🏆', label: 'Comp. Score', val: stats.competitive_score || 0, c: stats.competitive_score > 70 ? '#16a34a' : '#d97706' },
            { icon: '📊', label: 'Rank Top', val: `${stats.rank_percentile || 50}%`, c: '#2563eb' },
            { icon: '⌨️', label: 'Commands', val: stats.commands_run || 0, c: '#94a3b8' },
          ].map((s, i) => (
            <div key={i} style={{ ...S.card(), padding: '12px 14px', animation: `fadeUp 0.3s ${i * 0.04}s ease both` }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.val}</div>
              <div style={{ fontSize: 9, color: '#475569', marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { key: 'warroom', label: '🚨 War Room' },
            { key: 'twin', label: `🤖 Digital Twin (${twins.length})` },
            { key: 'portal', label: `🌐 Client Portal (${portals.length})` },
            { key: 'competitor', label: `📊 Competitor Intel (${reports.length})` },
            { key: 'commandos', label: '⌨️ Command OS' },
          ].map(t => <button key={t.key} className={`ng-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
        </div>

        {/* ═══ WAR ROOM ═══ */}
        {tab === 'warroom' && (
          <div>
            {/* Declare Incident */}
            <div style={{ ...S.card(), padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: '#e2e8f0' }}>🚨 Declare New Incident</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={S.input} placeholder="Incident title (e.g. Payment Gateway Down)" value={incTitle} onChange={e => setIncTitle(e.target.value)} />
                <select style={{ ...S.select, width: 180 }} value={incSev} onChange={e => setIncSev(e.target.value)}>
                  {['P1', 'P2', 'P3', 'P4'].map(s => <option key={s} value={s}>{SEV_LABEL[s]}</option>)}
                </select>
                <input style={{ ...S.input, width: 220 }} placeholder="Incident Commander" value={incCmd} onChange={e => setIncCmd(e.target.value)} />
                <button style={S.btn('#dc2626')} className="ng-btn" disabled={genLoading === 'declare_incident' || !incTitle.trim()} onClick={async () => { await action('declare_incident', { title: incTitle, severity: incSev, commander: incCmd }); setIncTitle(''); setIncCmd('') }}>
                  {genLoading === 'declare_incident' ? '⏳...' : '🚨 Declare'}
                </button>
              </div>
            </div>

            {/* Active Incident Rooms */}
            {rooms.length === 0 ? (
              <div style={{ ...S.card(), padding: 60, textAlign: 'center' }}><div style={{ fontSize: 48, opacity: 0.2 }}>🚨</div><div style={{ fontSize: 14, color: '#475569', marginTop: 12 }}>No incidents declared. System healthy.</div></div>
            ) : rooms.map(r => (
              <div key={r.id} style={{ ...S.card(), padding: 20, marginBottom: 14, borderLeft: `4px solid ${r.status === 'active' ? SEV_C[r.severity] : '#16a34a'}`, animation: 'fadeUp 0.3s ease both' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      {r.status === 'active' && <span className="pulse-dot" />}
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#e2e8f0' }}>{r.room_number}</span>
                      <span style={S.badge(SEV_C[r.severity])}>{r.severity}</span>
                      <span style={S.badge(r.status === 'active' ? '#dc2626' : '#16a34a')}>{r.status}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#c7d2fe', marginBottom: 4 }}>{r.incident_title}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Commander: {r.incident_commander} · Declared: {new Date(r.declared_at).toLocaleString('en-IN')} {r.duration_min ? `· Duration: ${r.duration_min}min` : ''}</div>
                  </div>
                  {r.status === 'active' && (
                    <button style={S.btn('#16a34a')} className="ng-btn" onClick={() => setSelectedRoom(selectedRoom?.id === r.id ? null : r)}>
                      {selectedRoom?.id === r.id ? '↑ Collapse' : '📋 Manage'}
                    </button>
                  )}
                </div>

                {/* AI Impact Assessment */}
                {r.ai_impact_assessment && (
                  <div style={{ padding: 12, background: 'rgba(220,38,38,0.08)', borderRadius: 10, border: '1px solid rgba(220,38,38,0.2)', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#fca5a5', marginBottom: 4 }}>⚡ AI IMPACT ASSESSMENT</div>
                    <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }}>{r.ai_impact_assessment}</div>
                  </div>
                )}

                {/* AI Comms Drafts */}
                {r.ai_communication_drafts?.customer_email && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                    {[
                      { label: '📧 Customer Email', key: 'customer_email', c: '#2563eb' },
                      { label: '💬 Slack Update', key: 'internal_slack', c: '#7c3aed' },
                      { label: '📡 Status Page', key: 'status_page', c: '#059669' },
                    ].map(k => r.ai_communication_drafts?.[k.key] && (
                      <div key={k.key} style={{ padding: 10, background: `rgba(99,102,241,0.06)`, borderRadius: 8, border: `1px solid rgba(99,102,241,0.15)` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>{k.label}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>{r.ai_communication_drafts[k.key]?.substring(0, 150)}...</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Timeline */}
                {(r.timeline_updates || []).length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>📜 Timeline</div>
                    {r.timeline_updates.slice(-5).map((u, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, color: '#475569', minWidth: 80 }}>{new Date(u.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span style={S.badge(u.type === 'resolution' ? '#16a34a' : u.type === 'escalation' ? '#dc2626' : '#6366f1')}>{u.type}</span>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}><strong style={{ color: '#c7d2fe' }}>{u.author}:</strong> {u.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Room Management Panel */}
                {selectedRoom?.id === r.id && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <input style={S.input} placeholder="Add update (e.g. DB team engaged, investigating root cause)" value={updateMsg} onChange={e => setUpdateMsg(e.target.value)} />
                      <button style={S.btn('#6366f1')} className="ng-btn" disabled={!updateMsg.trim()} onClick={async () => { await action('add_update', { room_id: r.id, author: user?.email || 'Admin', message: updateMsg, type: 'update' }); setUpdateMsg('') }}>+ Update</button>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input style={S.input} placeholder="Root cause (to resolve incident)" value={rootCause} onChange={e => setRootCause(e.target.value)} />
                      <button style={S.btn('#16a34a')} className="ng-btn" disabled={!rootCause.trim() || genLoading === 'resolve_incident'} onClick={async () => { await action('resolve_incident', { room_id: r.id, root_cause: rootCause }); setRootCause(''); setSelectedRoom(null) }}>✅ Resolve</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ═══ DIGITAL TWIN ═══ */}
        {tab === 'twin' && (
          <div>
            <div style={{ ...S.card(), padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: '#e2e8f0' }}>🤖 Train Digital Twin</h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>AI learns from an agent's resolved tickets & comments to clone their exact style, diagnostic approach, and resolution patterns</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <select style={{ ...S.select, flex: 1 }} value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
                  <option value="">Select Agent to Create Digital Twin</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.full_name || a.email} ({a.role})</option>)}
                </select>
                <button style={S.btn('#8b5cf6')} className="ng-btn" disabled={genLoading === 'train_twin' || !selectedAgent} onClick={() => action('train_twin', { agent_id: selectedAgent }).then(() => setGenLoading(''))}>{genLoading === 'train_twin' ? '⏳ Training...' : '🤖 Train Twin'}</button>
              </div>
            </div>

            {/* Twins List */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              {twins.map(t => (
                <div key={t.id} style={{ ...S.card(), padding: 20, animation: 'fadeUp 0.3s ease both' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>🤖 Digital Twin</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Trained on {t.training_ticket_count} items · {new Date(t.last_trained_at).toLocaleDateString('en-IN')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: t.twin_accuracy_pct > 75 ? '#16a34a' : '#d97706' }}>{t.twin_accuracy_pct}%</div>
                      <div style={{ fontSize: 9, color: '#64748b' }}>ACCURACY</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    <span style={S.badge('#8b5cf6')}>{t.writing_style}</span>
                    <span style={S.badge('#6366f1')}>{t.avg_response_length}</span>
                    <span style={S.badge('#059669')}>{t.escalation_threshold}</span>
                  </div>
                  {(t.signature_phrases || []).length > 0 && (
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
                      Phrases: {t.signature_phrases.slice(0, 2).map(p => `"${p}"`).join(', ')}
                    </div>
                  )}
                  <button style={{ ...S.btn('#6366f1'), padding: '7px 14px', fontSize: 12 }} className="ng-btn" onClick={() => setSelectedTwin(t.id)}>🧪 Run Simulation</button>
                </div>
              ))}
              {twins.length === 0 && <div style={{ ...S.card(), padding: 60, textAlign: 'center', gridColumn: '1/3' }}><div style={{ fontSize: 48, opacity: 0.2 }}>🤖</div><div style={{ fontSize: 14, color: '#475569', marginTop: 12 }}>No twins trained yet</div></div>}
            </div>

            {/* Run Simulation */}
            {selectedTwin && (
              <div style={{ ...S.card(), padding: 20, marginBottom: 16, border: '1px solid rgba(99,102,241,0.3)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: '#a5b4fc' }}>🧪 Run Twin Simulation</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select style={{ ...S.select, flex: 1 }} value={selectedTicket} onChange={e => setSelectedTicket(e.target.value)}>
                    <option value="">Select a ticket to simulate against</option>
                    {tickets.map(t => <option key={t.id} value={t.id}>{t.ticket_number}: {t.title?.substring(0, 50)}</option>)}
                  </select>
                  <button style={S.btn('#8b5cf6')} className="ng-btn" disabled={genLoading === 'simulate_twin' || !selectedTicket} onClick={() => action('simulate_twin', { twin_id: selectedTwin, ticket_id: selectedTicket }).then(() => setGenLoading(''))}>{genLoading === 'simulate_twin' ? '⏳ Simulating...' : '▶ Run Simulation'}</button>
                  <button style={S.btnO} onClick={() => setSelectedTwin('')}>✕</button>
                </div>
              </div>
            )}

            {/* Simulation Results */}
            {simulations.length > 0 && (
              <div style={{ ...S.card(), overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>🧪 Simulation Results ({simulations.length})</div>
                {simulations.slice(0, 5).map(s => (
                  <div key={s.id} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={S.badge('#8b5cf6')}>Style: {s.response_style_match_pct}%</span>
                        <span style={S.badge('#6366f1')}>Diagnosis: {s.diagnosis_match_pct}%</span>
                        <span style={S.badge('#059669')}>Resolution: {s.resolution_match_pct}%</span>
                        <span style={S.badge(s.overall_accuracy_pct > 75 ? '#16a34a' : '#d97706')}>Overall: {s.overall_accuracy_pct}%</span>
                      </div>
                      <span style={{ fontSize: 10, color: '#475569' }}>{new Date(s.created_at).toLocaleString('en-IN')}</span>
                    </div>
                    {s.twin_initial_response && (
                      <div style={{ padding: 10, background: 'rgba(139,92,246,0.08)', borderRadius: 8, border: '1px solid rgba(139,92,246,0.2)', marginBottom: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#c4b5fd', marginBottom: 4 }}>🤖 TWIN RESPONSE</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{s.twin_initial_response?.substring(0, 200)}...</div>
                      </div>
                    )}
                    {s.ai_differences && <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>Δ {s.ai_differences}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ CLIENT PORTAL ═══ */}
        {tab === 'portal' && (
          <div>
            <div style={{ ...S.card(), padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: '#e2e8f0' }}>🌐 Provision Client Portal</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={S.input} placeholder="Client/Company Name" value={portalName} onChange={e => setPortalName(e.target.value)} />
                <input style={S.input} placeholder="Client email" value={portalEmail} onChange={e => setPortalEmail(e.target.value)} />
                <button style={S.btn('#06b6d4')} className="ng-btn" disabled={genLoading === 'provision_portal' || !portalName.trim()} onClick={async () => { await action('provision_portal', { client_name: portalName, client_email: portalEmail }); setPortalName(''); setPortalEmail('') }}>{genLoading === 'provision_portal' ? '⏳...' : '🌐 Provision'}</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {portals.map(p => (
                <div key={p.id} style={{ ...S.card(), padding: 20, animation: 'fadeUp 0.3s ease both' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{p.client_name}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>{p.client_email || 'No email'}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div style={{ padding: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#d97706' }}>{p.cached_open_tickets}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>Open Tickets</div>
                    </div>
                    <div style={{ padding: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a' }}>{p.cached_sla_compliance_pct}%</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>SLA Compliance</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#4ade80', background: 'rgba(74,222,128,0.08)', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(74,222,128,0.2)', wordBreak: 'break-all' }}>
                    Token: {p.portal_token}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                    {p.show_sla_status && <span style={S.badge('#6366f1')}>SLA</span>}
                    {p.show_health_score && <span style={S.badge('#059669')}>Health</span>}
                    {p.allow_self_raise_tickets && <span style={S.badge('#8b5cf6')}>Self-Raise</span>}
                  </div>
                </div>
              ))}
              {portals.length === 0 && <div style={{ ...S.card(), padding: 60, textAlign: 'center', gridColumn: '1/4' }}><div style={{ fontSize: 48, opacity: 0.2 }}>🌐</div><div style={{ fontSize: 14, color: '#475569', marginTop: 12 }}>No portals provisioned yet</div></div>}
            </div>
          </div>
        )}

        {/* ═══ COMPETITOR INTEL ═══ */}
        {tab === 'competitor' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button style={S.btn('#f59e0b')} className="ng-btn" disabled={genLoading === 'generate_competitor_report'} onClick={() => action('generate_competitor_report').then(() => setGenLoading(''))}>{genLoading === 'generate_competitor_report' ? '⏳ Analyzing...' : '📊 Generate Report'}</button>
            </div>
            {!latestReport ? (
              <div style={{ ...S.card(), padding: 60, textAlign: 'center' }}><div style={{ fontSize: 48, opacity: 0.2 }}>📊</div><div style={{ fontSize: 14, color: '#475569', marginTop: 12 }}>Generate your first competitor intelligence report</div></div>
            ) : (
              <div>
                {/* Score Header */}
                <div style={{ ...S.card(), padding: 24, marginBottom: 16, display: 'flex', gap: 24, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 72, fontWeight: 900, color: latestReport.competitive_score > 70 ? '#16a34a' : '#d97706', lineHeight: 1 }}>{latestReport.competitive_score}</div>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>COMPETITIVE SCORE</div>
                    <div style={{ fontSize: 11, color: '#475569' }}>Top {latestReport.rank_percentile}% of industry</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, flex: 1 }}>
                    {[
                      { l: 'Your Avg Resolve', yours: `${latestReport.your_avg_resolution_min}min`, industry: `${latestReport.industry_avg_resolution_min}min`, better: latestReport.your_avg_resolution_min < latestReport.industry_avg_resolution_min },
                      { l: 'SLA Compliance', yours: `${latestReport.your_sla_compliance_pct}%`, industry: `${latestReport.industry_sla_compliance_pct}%`, better: latestReport.your_sla_compliance_pct > latestReport.industry_sla_compliance_pct },
                      { l: 'CSAT Score', yours: `${latestReport.your_csat}/5`, industry: `${latestReport.industry_csat}/5`, better: latestReport.your_csat > latestReport.industry_csat },
                    ].map((m, i) => (
                      <div key={i} style={{ padding: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>{m.l}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div><div style={{ fontSize: 20, fontWeight: 800, color: m.better ? '#16a34a' : '#dc2626' }}>{m.yours}</div><div style={{ fontSize: 9, color: '#64748b' }}>You {m.better ? '✓ Leading' : '✗ Behind'}</div></div>
                          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>{m.industry}</div><div style={{ fontSize: 9, color: '#64748b' }}>Industry avg</div></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SWOT */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {Object.entries(latestReport.swot_analysis || {}).map(([k, items]) => (
                    <div key={k} style={{ ...S.card(), padding: 16, borderTop: `3px solid ${SWOT_C[k]}` }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: SWOT_C[k], marginBottom: 10 }}>{SWOT_LABEL[k]}</div>
                      {(items || []).map((item, i) => <div key={i} style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6, paddingLeft: 10, borderLeft: `2px solid ${SWOT_C[k]}40` }}>• {item}</div>)}
                    </div>
                  ))}
                </div>

                {/* Quick Wins */}
                {(latestReport.ai_quick_wins || []).length > 0 && (
                  <div style={{ ...S.card(), padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>⚡ Quick Wins</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                      {latestReport.ai_quick_wins.map((w, i) => (
                        <div key={i} style={{ padding: 12, background: 'rgba(99,102,241,0.08)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#c7d2fe', marginBottom: 6 }}>{w.action}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{w.impact}</div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <span style={S.badge(w.effort === 'low' ? '#16a34a' : w.effort === 'medium' ? '#d97706' : '#dc2626')}>{w.effort} effort</span>
                            <span style={S.badge('#6366f1')}>{w.timeline}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ COMMAND OS ═══ */}
        {tab === 'commandos' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            {/* Terminal */}
            <div style={{ ...S.card(), display: 'flex', flexDirection: 'column', height: 600 }}>
              {/* Terminal Header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#d97706' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a' }} />
                <span style={{ fontSize: 11, color: '#475569', marginLeft: 8, fontFamily: 'monospace' }}>nexdesk-command-os v1.0</span>
              </div>
              {/* Output Area */}
              <div ref={cmdRef} style={{ flex: 1, padding: 16, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
                {cmdHistory.length === 0 && (
                  <div style={{ color: '#475569' }}>
                    <div style={{ color: '#4ade80', marginBottom: 8 }}>NexDesk Command OS — Natural Language Interface</div>
                    <div>Type anything in plain English. Examples:</div>
                    <div style={{ color: '#94a3b8', marginTop: 8, lineHeight: 2 }}>
                      → "show me all open critical tickets"<br />
                      → "how many tickets were resolved today?"<br />
                      → "detect recurring issues"<br />
                      → "what is the current system health?"
                    </div>
                  </div>
                )}
                {cmdHistory.map((m, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    {m.role === 'user' ? (
                      <div style={{ color: '#6366f1' }}>❯ {m.text}</div>
                    ) : (
                      <div style={{ color: m.error ? '#fca5a5' : '#4ade80', marginTop: 4, lineHeight: 1.7 }}>
                        {m.text}
                        {m.data && Object.keys(m.data).length > 0 && (
                          <div style={{ marginTop: 6, padding: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 6, color: '#94a3b8', fontSize: 11 }}>
                            {JSON.stringify(m.data, null, 2).substring(0, 300)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Input */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8 }}>
                <span style={{ color: '#6366f1', fontFamily: 'monospace', paddingTop: 11 }}>❯</span>
                <input
                  className="cmd-input"
                  style={{ ...S.input, fontFamily: 'monospace', fontSize: 13 }}
                  placeholder="Type a command in plain English..."
                  value={cmdInput}
                  onChange={e => setCmdInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runCommand()}
                />
                <button style={S.btn('#6366f1')} className="ng-btn" onClick={runCommand}>Run</button>
              </div>
            </div>

            {/* Command History */}
            <div style={{ ...S.card(), overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 600 }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>⌨️ Command History</div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {commands.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: 12 }}>No commands yet</div>
                ) : commands.map(c => (
                  <div key={c.id} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: 12, color: '#6366f1', fontFamily: 'monospace', marginBottom: 4 }}>❯ {c.natural_language_input}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{c.ai_narrative_response?.substring(0, 100)}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={S.badge('#6366f1')}>{c.parsed_intent}</span>
                      <span style={{ fontSize: 10, color: '#475569' }}>{c.execution_ms}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

