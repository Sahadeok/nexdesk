'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

const SENTIMENT_C = {
  critical_distress: '#dc2626', frustrated: '#d97706', neutral: '#6b7280',
  satisfied: '#2563eb', happy: '#16a34a'
}
const SENTIMENT_ICON = {
  critical_distress: '🆘', frustrated: '😤', neutral: '😐', satisfied: '🙂', happy: '😊'
}
const COMPLEXITY_C = { trivial:'#16a34a', simple:'#059669', medium:'#2563eb', complex:'#7c3aed', epic:'#dc2626' }

export default function PerceptionDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('warroom')
  const [stats, setStats] = useState({})
  const [moods, setMoods] = useState([])
  const [surgeries, setSurgeries] = useState([])
  const [translations, setTranslations] = useState([])
  const [blasts, setBlasts] = useState([])
  const [warRoom, setWarRoom] = useState([])
  const [genomes, setGenomes] = useState([])
  const [sessions, setSessions] = useState([])
  const [tickets, setTickets] = useState([])
  const [genLoading, setGenLoading] = useState('')
  const [selectedTicket, setSelectedTicket] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [stackInput, setStackInput] = useState('')
  const [codeLang, setCodeLang] = useState('javascript')
  const [translateText, setTranslateText] = useState('')
  const [selectedMood, setSelectedMood] = useState(null)
  const [selectedSurgery, setSelectedSurgery] = useState(null)
  const [selectedGenome, setSelectedGenome] = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { user } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    await loadAll()
    setLoading(false)
  }

  async function loadAll() {
    const results = await Promise.allSettled([
      fetch('/api/perception-intelligence?type=stats').then(r => r.json()),
      fetch('/api/perception-intelligence?type=moods').then(r => r.json()),
      fetch('/api/perception-intelligence?type=surgeries').then(r => r.json()),
      fetch('/api/perception-intelligence?type=translations').then(r => r.json()),
      fetch('/api/perception-intelligence?type=revenue_blasts').then(r => r.json()),
      fetch('/api/perception-intelligence?type=war_room').then(r => r.json()),
      fetch('/api/perception-intelligence?type=genomes').then(r => r.json()),
      fetch('/api/perception-intelligence?type=sessions').then(r => r.json()),
      fetch('/api/perception-intelligence?type=tickets_list').then(r => r.json()),
    ])
    const [stR, moodR, surgR, transR, blastR, warR, genR, sessR, tkR] = results.map(r => r.status === 'fulfilled' ? r.value : {})
    setStats(stR?.stats || {})
    setMoods(moodR?.moods || [])
    setSurgeries(surgR?.surgeries || [])
    setTranslations(transR?.translations || [])
    setBlasts(blastR?.blasts || [])
    setWarRoom(warR?.snapshots || [])
    setGenomes(genR?.genomes || [])
    setSessions(sessR?.sessions || [])
    setTickets(tkR?.tickets || [])
  }

  async function action(a, body = {}) {
    setGenLoading(a)
    try {
      const res = await fetch('/api/perception-intelligence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: a, ...body }),
      })
      const data = await res.json()
      await loadAll()
      return data
    } catch (e) { /* ignore */ }
    setGenLoading('')
  }

  const S = {
    page: { minHeight: '100vh', background: '#0f0f1a', fontFamily: "'DM Sans',sans-serif", color: '#e2e8f0' },
    card: { background: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 100%)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' },
    cardLight: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
    badge: (c) => ({ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, background: c + '20', color: c, border: `1px solid ${c}40`, display: 'inline-block' }),
    input: { width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#e2e8f0' },
    btn: (c = '#6366f1') => ({ padding: '10px 20px', background: `linear-gradient(135deg,${c},${c}cc)`, border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s', boxShadow: `0 4px 15px ${c}40` }),
    btnO: { padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'inherit' },
    select: { padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#e2e8f0' },
    glow: (c) => ({ boxShadow: `0 0 20px ${c}30, 0 4px 20px rgba(0,0,0,0.4)` }),
  }

  if (loading) return (
    <div style={S.page}>
      <GlobalNav title="Perception Intelligence" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🧬</div>
          <div style={{ color: '#94a3b8', fontSize: 14, letterSpacing: 1 }}>LOADING PERCEPTION INTELLIGENCE...</div>
        </div>
      </div>
    </div>
  )

  const latestWR = warRoom[0]

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes spin { to{transform:rotate(360deg)} }
        * { box-sizing:border-box; }
        .pi-tab { padding:9px 18px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#94a3b8; font-family:'DM Sans',sans-serif; transition:all 0.2s; letter-spacing:0.3px; }
        .pi-tab:hover { border-color:rgba(99,102,241,0.5); color:#c7d2fe; }
        .pi-tab.active { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; border-color:transparent; box-shadow:0 4px 15px rgba(99,102,241,0.4); }
        .pi-btn:hover { transform:translateY(-2px); filter:brightness(1.1); }
        .pi-row:hover { background:rgba(99,102,241,0.05) !important; }
        .code-block { background:#0d1117; border-radius:8px; padding:14px; font-family:'Fira Code',monospace; font-size:12px; color:#e6edf3; overflow-x:auto; border:1px solid rgba(99,102,241,0.2); }
        textarea { color-scheme:dark; }
      `}</style>

      <GlobalNav title="Perception & Intelligence Hub" />

      <div style={{ maxWidth: 1500, margin: '0 auto', padding: '28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg,#6366f1,#a855f7,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
              🧬 Perception & Intelligence Hub
            </h1>
            <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>P23-30 — Mood DNA · Code Surgeon · Neural Translate · Revenue Blast · Session Replay · War Room · Ticket Genome · Adaptive Center</p>
          </div>
          <button style={S.btnO} onClick={loadAll}>↻ Refresh</button>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 10, marginBottom: 28 }}>
          {[
            { icon: '😤', label: 'Distressed', val: stats.distressed_tickets || 0, c: '#dc2626' },
            { icon: '⚠️', label: 'Escalation Risk', val: `${stats.avg_escalation_risk || 0}%`, c: '#d97706' },
            { icon: '🔧', label: 'Code Surgeries', val: stats.code_surgeries || 0, c: '#6366f1' },
            { icon: '🌍', label: 'Translations', val: stats.translations || 0, c: '#059669' },
            { icon: '💰', label: 'Rev at Risk (₹K)', val: Math.round((stats.total_revenue_at_risk || 0) / 1000), c: '#dc2626' },
            { icon: '🏥', label: 'System Health', val: `${stats.system_health || 100}%`, c: (stats.system_health || 100) > 95 ? '#16a34a' : '#d97706' },
            { icon: '🧬', label: 'Genomes Built', val: stats.genomes_built || 0, c: '#8b5cf6' },
            { icon: '😡', label: 'Rage Clicks', val: stats.rage_clicks_detected || 0, c: '#dc2626' },
          ].map((s, i) => (
            <div key={i} style={{ ...S.card, padding: '14px 16px', animation: `fadeUp 0.3s ${i * 0.04}s ease both`, ...S.glow(s.c) }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.c, letterSpacing: '-0.5px' }}>{s.val}</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { key: 'warroom', label: '🏛️ War Room' },
            { key: 'mood', label: `😤 Mood DNA (${moods.length})` },
            { key: 'genome', label: `🧬 Ticket Genome (${genomes.length})` },
            { key: 'surgery', label: `🔧 Code Surgeon (${surgeries.length})` },
            { key: 'revenue', label: `💰 Revenue Blast (${blasts.length})` },
            { key: 'translate', label: `🌍 Neural Translate (${translations.length})` },
            { key: 'session', label: `🎬 Session Replay (${sessions.length})` },
          ].map(t => (
            <button key={t.key} className={`pi-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        {/* ═══ WAR ROOM ═══ */}
        {tab === 'warroom' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button style={S.btn('#dc2626')} className="pi-btn" disabled={genLoading === 'war_room'} onClick={() => action('war_room')}>{genLoading === 'war_room' ? '⏳ Generating...' : '🏛️ Refresh War Room'}</button>
            </div>
            {!latestWR ? (
              <div style={{ ...S.card, padding: 60, textAlign: 'center' }}>
                <div style={{ fontSize: 56, opacity: 0.3 }}>🏛️</div>
                <div style={{ fontSize: 14, color: '#64748b', marginTop: 12 }}>Generate the first War Room snapshot</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* System Health Big */}
                <div style={{ ...S.card, padding: 24, display: 'flex', gap: 20, alignItems: 'center', ...S.glow(latestWR.overall_health_pct > 95 ? '#16a34a' : '#dc2626') }}>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 64, fontWeight: 900, color: latestWR.overall_health_pct > 95 ? '#16a34a' : latestWR.overall_health_pct > 80 ? '#d97706' : '#dc2626' }}>{latestWR.overall_health_pct}%</div>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>System Health</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.8 }}>{latestWR.ai_boardroom_brief}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                      {[
                        { l: 'Revenue at Risk', v: `₹${Math.round(latestWR.total_revenue_at_risk_inr || 0).toLocaleString()}`, c: '#dc2626' },
                        { l: 'SLA Breaches', v: latestWR.tickets_in_sla_breach, c: '#d97706' },
                        { l: 'Critical Incidents', v: latestWR.critical_incidents, c: '#dc2626' },
                        { l: 'MTTR Today', v: `${latestWR.mttr_today_min}min`, c: '#6366f1' },
                      ].map((m, i) => (
                        <div key={i} style={{ padding: 8, borderRadius: 8, background: `${m.c}10`, border: `1px solid ${m.c}30` }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: m.c }}>{m.v}</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>{m.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Red Flags & Wins */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ ...S.card, padding: 16, borderLeft: '4px solid #dc2626' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 10 }}>🚨 Red Flags</div>
                    {(latestWR.ai_red_flags || []).map((f, i) => (
                      <div key={i} style={{ padding: 8, background: 'rgba(220,38,38,0.08)', borderRadius: 8, marginBottom: 6, border: '1px solid rgba(220,38,38,0.2)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#fca5a5' }}>{f.flag}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{f.impact}</div>
                        <span style={S.badge(f.urgency === 'immediate' ? '#dc2626' : '#d97706')}>{f.urgency}</span>
                      </div>
                    ))}
                    {!(latestWR.ai_red_flags || []).length && <div style={{ fontSize: 12, color: '#64748b' }}>No critical red flags</div>}
                  </div>
                  <div style={{ ...S.card, padding: 16, borderLeft: '4px solid #16a34a' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', marginBottom: 10 }}>✅ Wins</div>
                    {(latestWR.ai_wins || []).map((w, i) => (
                      <div key={i} style={{ padding: 8, background: 'rgba(22,163,74,0.08)', borderRadius: 8, marginBottom: 6, border: '1px solid rgba(22,163,74,0.2)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#86efac' }}>{w.win}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{w.impact}</div>
                      </div>
                    ))}
                    {!(latestWR.ai_wins || []).length && <div style={{ fontSize: 12, color: '#64748b' }}>No wins recorded yet</div>}
                  </div>
                </div>
                {/* System Health per Service */}
                <div style={{ ...S.card, padding: 20, gridColumn: '1/3' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>🏥 Service Health Monitor</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 }}>
                    {Object.entries(latestWR.systems_health || {}).map(([name, pct]) => {
                      const c = pct >= 99 ? '#16a34a' : pct >= 95 ? '#d97706' : '#dc2626'
                      return (
                        <div key={name} style={{ padding: 12, borderRadius: 10, background: `${c}10`, border: `1px solid ${c}30`, textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{pct}%</div>
                          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{name}</div>
                          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', marginTop: 6 }}>
                            <div style={{ height: '100%', borderRadius: 2, background: c, width: `${pct}%`, transition: 'width 1s' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ MOOD DNA ═══ */}
        {tab === 'mood' && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-end' }}>
              <select style={{ ...S.select, flex: 1 }} value={selectedTicket} onChange={e => setSelectedTicket(e.target.value)}>
                <option value="">Select Ticket to Analyze</option>
                {tickets.map(t => <option key={t.id} value={t.id}>{t.ticket_number}: {t.title?.substring(0, 50)}</option>)}
              </select>
              <button style={S.btn('#d97706')} className="pi-btn" disabled={genLoading === 'analyze_mood' || !selectedTicket} onClick={() => action('analyze_mood', { ticket_id: selectedTicket }).then(() => setGenLoading(''))}>{genLoading === 'analyze_mood' ? '⏳...' : '😤 Analyze Mood'}</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: selectedMood ? '1fr 1fr' : '1fr', gap: 16 }}>
              <div>
                {moods.length === 0 ? (
                  <div style={{ ...S.card, padding: 60, textAlign: 'center' }}><div style={{ fontSize: 48, opacity: 0.3 }}>😤</div><div style={{ fontSize: 14, color: '#64748b', marginTop: 12 }}>No mood profiles yet</div></div>
                ) : moods.map(m => {
                  const sc = SENTIMENT_C[m.overall_sentiment] || '#6b7280'
                  return (
                    <div key={m.id} className="pi-row" style={{ ...S.card, padding: 16, marginBottom: 10, cursor: 'pointer', borderLeft: `4px solid ${sc}`, transition: 'all 0.2s' }} onClick={() => setSelectedMood(m)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 24 }}>{SENTIMENT_ICON[m.overall_sentiment] || '😐'}</span>
                          <div>
                            <span style={S.badge(sc)}>{m.overall_sentiment?.replace('_', ' ')}</span>
                            {m.toxicity_risk && <span style={{ ...S.badge('#dc2626'), marginLeft: 6 }}>⚠️ Churn Risk</span>}
                            {m.mood_shift === 'declining' && <span style={{ ...S.badge('#d97706'), marginLeft: 6 }}>📉 Declining</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: m.escalation_risk_pct > 70 ? '#dc2626' : '#d97706' }}>{m.escalation_risk_pct}%</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>escalation risk</div>
                        </div>
                      </div>
                      {/* Emotion bars */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginTop: 12 }}>
                        {[
                          { l: '😡', v: m.anger_score, c: '#dc2626' },
                          { l: '😤', v: m.frustration_score, c: '#d97706' },
                          { l: '😰', v: m.anxiety_score, c: '#8b5cf6' },
                          { l: '😊', v: m.satisfaction_score, c: '#16a34a' },
                          { l: '😕', v: m.confusion_score, c: '#6366f1' },
                          { l: '⚡', v: m.urgency_score, c: '#f59e0b' },
                          { l: '🆘', v: m.desperation_score, c: '#dc2626' },
                        ].map((e, i) => (
                          <div key={i} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 9 }}>{e.l}</div>
                            <div style={{ height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 4, position: 'relative', overflow: 'hidden', marginTop: 2 }}>
                              <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${e.v || 0}%`, background: e.c, borderRadius: 4, transition: 'height 0.5s' }} />
                            </div>
                            <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>{e.v || 0}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              {selectedMood && (
                <div style={{ ...S.card, padding: 20, position: 'sticky', top: 20, maxHeight: '80vh', overflow: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>😤 Mood Detail</h3>
                    <button style={S.btnO} onClick={() => setSelectedMood(null)}>✕</button>
                  </div>
                  <div style={{ padding: 14, background: 'rgba(99,102,241,0.1)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', marginBottom: 6 }}>🎭 AI EMPATHY SCRIPT</div>
                    <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, fontStyle: 'italic' }}>"{selectedMood.ai_empathy_script}"</div>
                  </div>
                  <div style={{ padding: 12, background: 'rgba(245,158,11,0.1)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.3)', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#fcd34d', marginBottom: 4 }}>🎯 SUGGESTED TONE</div>
                    <div style={{ fontSize: 12, color: '#e2e8f0' }}>{selectedMood.ai_suggested_tone}</div>
                  </div>
                  {(selectedMood.key_trigger_phrases || []).length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>🔑 Trigger Phrases</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {selectedMood.key_trigger_phrases.map((p, i) => <span key={i} style={{ padding: '4px 10px', background: 'rgba(220,38,38,0.15)', borderRadius: 6, fontSize: 11, color: '#fca5a5', border: '1px solid rgba(220,38,38,0.3)' }}>"{p}"</span>)}
                      </div>
                    </div>
                  )}
                  {(selectedMood.mood_timeline || []).length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>📈 Mood Timeline</div>
                      {selectedMood.mood_timeline.slice(0, 5).map((t, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: 11, color: '#64748b', minWidth: 70 }}>{t.time}</span>
                          <span style={{ ...S.badge(SENTIMENT_C[t.emotion] || '#6b7280'), fontSize: 10 }}>{t.emotion}</span>
                          {t.trigger_word && <span style={{ fontSize: 11, color: '#94a3b8' }}>"{t.trigger_word}"</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ TICKET GENOME ═══ */}
        {tab === 'genome' && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <select style={{ ...S.select, flex: 1 }} value={selectedTicket} onChange={e => setSelectedTicket(e.target.value)}>
                <option value="">Select Ticket to Build Genome</option>
                {tickets.map(t => <option key={t.id} value={t.id}>{t.ticket_number}: {t.title?.substring(0, 50)}</option>)}
              </select>
              <button style={S.btn('#8b5cf6')} className="pi-btn" disabled={genLoading === 'build_genome' || !selectedTicket} onClick={() => action('build_genome', { ticket_id: selectedTicket }).then(() => setGenLoading(''))}>{genLoading === 'build_genome' ? '⏳...' : '🧬 Build Genome'}</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: selectedGenome ? '1fr 1fr' : '1fr', gap: 16 }}>
              <div>
                {genomes.length === 0 ? (
                  <div style={{ ...S.card, padding: 60, textAlign: 'center' }}><div style={{ fontSize: 48, opacity: 0.3 }}>🧬</div><div style={{ fontSize: 14, color: '#64748b', marginTop: 12 }}>No genomes yet</div></div>
                ) : genomes.map(g => (
                  <div key={g.id} className="pi-row" style={{ ...S.card, padding: 16, marginBottom: 10, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedGenome(g)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={S.badge('#6366f1')}>{g.detected_category}</span>
                          <span style={S.badge(g.detected_priority === 'critical' ? '#dc2626' : g.detected_priority === 'high' ? '#d97706' : '#2563eb')}>{g.detected_priority}</span>
                          <span style={S.badge('#059669')}>{g.detected_team}</span>
                          <span style={S.badge(COMPLEXITY_C[g.predicted_complexity] || '#6b7280')}>{g.predicted_complexity}</span>
                          {g.auto_routed && <span style={S.badge('#16a34a')}>✓ Auto-Routed</span>}
                        </div>
                        {g.detected_subcategory && <div style={{ fontSize: 11, color: '#64748b' }}>{g.detected_subcategory}</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#6366f1' }}>{g.classification_confidence_pct}%</div>
                        <div style={{ fontSize: 9, color: '#64748b' }}>confidence</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748b' }}>
                      <span>⏱️ Predicted: {g.predicted_resolution_min}min</span>
                      <span>📈 Escalation: {g.predicted_escalation_probability_pct}%</span>
                      <span>💼 Impact: {g.business_impact_score}/100</span>
                    </div>
                  </div>
                ))}
              </div>
              {selectedGenome && (
                <div style={{ ...S.card, padding: 20, position: 'sticky', top: 20, maxHeight: '80vh', overflow: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>🧬 Genome Detail</h3>
                    <button style={S.btnO} onClick={() => setSelectedGenome(null)}>✕</button>
                  </div>
                  {selectedGenome.ai_root_cause_hypothesis && (
                    <div style={{ padding: 12, background: 'rgba(139,92,246,0.1)', borderRadius: 10, border: '1px solid rgba(139,92,246,0.3)', marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#c4b5fd', marginBottom: 4 }}>🔍 ROOT CAUSE HYPOTHESIS</div>
                      <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.7 }}>{selectedGenome.ai_root_cause_hypothesis}</div>
                    </div>
                  )}
                  {selectedGenome.suggested_fix && (
                    <div style={{ padding: 12, background: 'rgba(16,163,74,0.1)', borderRadius: 10, border: '1px solid rgba(16,163,74,0.3)', marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#86efac', marginBottom: 4 }}>✅ SUGGESTED FIX</div>
                      <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }}>{selectedGenome.suggested_fix}</div>
                    </div>
                  )}
                  {selectedGenome.auto_routed && (
                    <div style={{ padding: 12, background: 'rgba(99,102,241,0.1)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', marginBottom: 4 }}>🚀 AUTO-ROUTING DECISION</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#c7d2fe' }}>→ Routed to {selectedGenome.auto_routed_to}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{selectedGenome.routing_reason}</div>
                    </div>
                  )}
                  {(selectedGenome.ai_tags || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {selectedGenome.ai_tags.map((tag, i) => <span key={i} style={{ padding: '3px 8px', background: 'rgba(99,102,241,0.15)', borderRadius: 6, fontSize: 11, color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>#{tag}</span>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ CODE SURGEON ═══ */}
        {tab === 'surgery' && (
          <div>
            <div style={{ ...S.card, padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: '#e2e8f0' }}>🔧 AI Code Surgeon</h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 14px' }}>Paste an error log + stack trace → AI surgically locates and patches the exact line of code</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <textarea style={{ ...S.input, height: 120, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} placeholder="Paste error log here..." value={codeInput} onChange={e => setCodeInput(e.target.value)} />
                <textarea style={{ ...S.input, height: 120, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} placeholder="Paste stack trace here..." value={stackInput} onChange={e => setStackInput(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select style={{ ...S.select, width: 160 }} value={codeLang} onChange={e => setCodeLang(e.target.value)}>
                  {['javascript', 'python', 'java', 'typescript', 'go', 'ruby', 'php', 'csharp'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <button style={S.btn('#6366f1')} className="pi-btn" disabled={genLoading === 'code_surgery' || (!codeInput && !stackInput)} onClick={() => action('code_surgery', { error_log: codeInput, stack_trace: stackInput, language: codeLang, ticket_id: selectedTicket || null }).then(() => { setGenLoading(''); setCodeInput(''); setStackInput('') })}>{genLoading === 'code_surgery' ? '⏳ Analyzing...' : '🔧 Perform Surgery'}</button>
              </div>
            </div>
            {surgeries.map(s => (
              <div key={s.id} style={{ ...S.card, padding: 20, marginBottom: 12, borderLeft: `4px solid ${s.confidence_pct > 85 ? '#16a34a' : s.confidence_pct > 60 ? '#d97706' : '#dc2626'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <span style={S.badge('#6366f1')}>{s.language}</span>
                    {s.framework && <span style={{ ...S.badge('#8b5cf6'), marginLeft: 6 }}>{s.framework}</span>}
                    <span style={{ ...S.badge(s.regression_risk === 'low' ? '#16a34a' : '#d97706'), marginLeft: 6 }}>Regression: {s.regression_risk}</span>
                    <span style={{ ...S.badge('#059669'), marginLeft: 6 }}>{s.fix_approach}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.confidence_pct > 85 ? '#16a34a' : '#d97706' }}>{s.confidence_pct}%</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>confidence</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fca5a5', marginBottom: 8 }}>💥 {s.error_type}</div>
                {(s.patches || []).slice(0, 2).map((p, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>📄 {p.file}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 600, marginBottom: 4 }}>BEFORE</div>
                        <div className="code-block" style={{ fontSize: 11, color: '#fca5a5' }}>{p.original_code}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 600, marginBottom: 4 }}>AFTER (PATCHED)</div>
                        <div className="code-block" style={{ fontSize: 11, color: '#86efac' }}>{p.patched_code}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, fontStyle: 'italic' }}>💡 {p.explanation}</div>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: '#64748b' }}>⏱️ {s.estimated_fix_time} · {(s.suggested_test_cases || []).length} test cases suggested</div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ REVENUE BLAST ═══ */}
        {tab === 'revenue' && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <select style={{ ...S.select, flex: 1 }} value={selectedTicket} onChange={e => setSelectedTicket(e.target.value)}>
                <option value="">Select Ticket for Revenue Blast Analysis</option>
                {tickets.map(t => <option key={t.id} value={t.id}>{t.ticket_number}: {t.title?.substring(0, 50)}</option>)}
              </select>
              <button style={S.btn('#dc2626')} className="pi-btn" disabled={genLoading === 'revenue_blast' || !selectedTicket} onClick={() => action('revenue_blast', { ticket_id: selectedTicket }).then(() => setGenLoading(''))}>{genLoading === 'revenue_blast' ? '⏳...' : '💰 Calculate Blast Radius'}</button>
            </div>
            {blasts.length === 0 ? (
              <div style={{ ...S.card, padding: 60, textAlign: 'center' }}><div style={{ fontSize: 48, opacity: 0.3 }}>💰</div><div style={{ fontSize: 14, color: '#64748b', marginTop: 12 }}>No revenue blast profiles yet</div></div>
            ) : blasts.map(b => (
              <div key={b.id} style={{ ...S.card, padding: 24, marginBottom: 16, borderTop: '3px solid #dc2626' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 16 }}>
                  {[
                    { l: 'Total Lost', v: `₹${Math.round(b.total_revenue_lost_inr || 0).toLocaleString()}`, c: '#dc2626', big: true },
                    { l: 'Per Minute', v: `₹${Math.round(b.revenue_loss_per_minute_inr || 0).toLocaleString()}`, c: '#d97706' },
                    { l: 'Users Affected', v: (b.affected_user_count || 0).toLocaleString(), c: '#6366f1' },
                    { l: 'SLA Penalty', v: `₹${Math.round(b.sla_penalty_inr || 0).toLocaleString()}`, c: '#8b5cf6' },
                    { l: 'Recovery Score', v: b.recovery_priority_score, c: b.recovery_priority_score > 80 ? '#dc2626' : '#d97706' },
                  ].map((m, i) => (
                    <div key={i} style={{ padding: 14, borderRadius: 10, background: `${m.c}10`, border: `1px solid ${m.c}30`, textAlign: 'center' }}>
                      <div style={{ fontSize: m.big ? 24 : 18, fontWeight: 900, color: m.c }}>{m.v}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{m.l}</div>
                    </div>
                  ))}
                </div>
                {(b.cascade_impacts || []).length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>🌊 Cascade Impact</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                      {b.cascade_impacts.map((c, i) => (
                        <div key={i} style={{ padding: 10, background: 'rgba(220,38,38,0.08)', borderRadius: 8, border: '1px solid rgba(220,38,38,0.2)' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5' }}>{c.system}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.impact}</div>
                          <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>{c.revenue_pct}% revenue</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {b.break_even_minutes && <div style={{ fontSize: 12, color: '#64748b', marginTop: 10 }}>⚖️ Break-even: {b.break_even_minutes} minutes · Method: {b.calculation_method}</div>}
              </div>
            ))}
          </div>
        )}

        {/* ═══ NEURAL TRANSLATE ═══ */}
        {tab === 'translate' && (
          <div>
            <div style={{ ...S.card, padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: '#e2e8f0' }}>🌍 Neural IT Translator</h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>Translates IT support text while intelligently preserving technical terms (DNS, API, HTTP etc.)</p>
              <textarea style={{ ...S.input, height: 80, resize: 'vertical', marginBottom: 10 }} placeholder="Enter technical resolution text to translate..." value={translateText} onChange={e => setTranslateText(e.target.value)} />
              <button style={S.btn('#059669')} className="pi-btn" disabled={genLoading === 'translate' || !translateText.trim()} onClick={() => action('translate', { text: translateText, source_type: 'manual', languages: ['hi', 'ta', 'ar', 'fr', 'de'] }).then(() => { setGenLoading(''); setTranslateText('') })}>{genLoading === 'translate' ? '⏳ Translating...' : '🌍 Translate'}</button>
            </div>
            {translations.map(t => (
              <div key={t.id} style={{ ...S.card, padding: 20, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {(t.preserved_terms || []).map((term, i) => <span key={i} style={{ padding: '3px 8px', background: 'rgba(99,102,241,0.15)', borderRadius: 6, fontSize: 11, color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>🔒 {term}</span>)}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>Original: <span style={{ color: '#94a3b8' }}>{t.source_text?.substring(0, 100)}...</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
                  {Object.entries(t.translations || {}).map(([lang, text]) => {
                    const langLabel = { hi: '🇮🇳 Hindi', ta: '🇮🇳 Tamil', ar: '🇸🇦 Arabic', fr: '🇫🇷 French', de: '🇩🇪 German', es: '🇪🇸 Spanish' }
                    const conf = (t.translation_confidence || {})[lang] || 0
                    return (
                      <div key={lang} style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc' }}>{langLabel[lang] || lang}</span>
                          {conf > 0 && <span style={{ fontSize: 10, color: conf > 90 ? '#16a34a' : '#d97706', fontWeight: 700 }}>{conf}%</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#e2e8f0', lineHeight: 1.6 }}>{text?.substring(0, 120)}...</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ SESSION REPLAY ═══ */}
        {tab === 'session' && (
          <div>
            <div style={{ ...S.card, padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px', color: '#e2e8f0' }}>🎬 Session Time Machine</h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>Real user sessions are recorded via the NexDesk widget. Analyze recorded sessions to find UX pain points, rage-clicks, and error chains.</p>
              <div style={{ padding: 14, background: 'rgba(99,102,241,0.08)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)' }}>
                <div style={{ fontSize: 12, color: '#a5b4fc', marginBottom: 6, fontWeight: 600 }}>📡 Widget Integration (add to client app)</div>
                <div className="code-block" style={{ fontSize: 11 }}>{`// Add to your app for automatic session recording
nexdesk.startSession({ userId: currentUser.id, appId: 'your-app-id' })
// Events auto-posted to /api/perception-intelligence`}</div>
              </div>
            </div>
            {sessions.length === 0 ? (
              <div style={{ ...S.card, padding: 60, textAlign: 'center' }}><div style={{ fontSize: 48, opacity: 0.3 }}>🎬</div><div style={{ fontSize: 14, color: '#64748b', marginTop: 12 }}>No session recordings yet. Integrate the widget to start capturing sessions.</div></div>
            ) : sessions.map(s => (
              <div key={s.id} style={{ ...S.card, padding: 16, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#6366f1' }}>{s.session_token}</div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{s.duration_sec}s</span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {s.rage_click_count > 0 && <span style={S.badge('#dc2626')}>😡 {s.rage_click_count} rage clicks</span>}
                  {s.dead_click_count > 0 && <span style={S.badge('#d97706')}>💀 {s.dead_click_count} dead clicks</span>}
                  {s.error_count > 0 && <span style={S.badge('#8b5cf6')}>💥 {s.error_count} errors</span>}
                </div>
                {s.ai_journey_summary && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, lineHeight: 1.6 }}>{s.ai_journey_summary}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

