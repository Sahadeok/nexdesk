'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

const DNA_LABELS = {
  speed_dna: { label: 'Speed', icon: '⚡', c: '#f59e0b' },
  quality_dna: { label: 'Quality', icon: '✨', c: '#6366f1' },
  empathy_dna: { label: 'Empathy', icon: '🤝', c: '#ec4899' },
  technical_dna: { label: 'Technical', icon: '🔧', c: '#06b6d4' },
  proactivity_dna: { label: 'Proactive', icon: '🔮', c: '#8b5cf6' },
  collaboration_dna: { label: 'Collab', icon: '🫂', c: '#16a34a' },
  learning_dna: { label: 'Learning', icon: '📈', c: '#d97706' },
  consistency_dna: { label: 'Consist.', icon: '🎯', c: '#2563eb' },
}

const GRADE_C = { S: '#f59e0b', 'A+': '#16a34a', A: '#22c55e', B: '#6366f1', C: '#d97706', D: '#dc2626' }
const RISK_C = { critical: '#dc2626', high: '#d97706', medium: '#6366f1', low: '#16a34a' }
const EMOTION_ICON = { calm: '😌', frustrated: '😤', panic: '😱', confused: '😕', crying: '😢', angry: '😡', relieved: '😌' }
const STATUS_C = { failed: '#dc2626', blocked: '#d97706', degraded: '#f59e0b', ok: '#16a34a' }

export default function BusinessSupremacyDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('roi')
  const [stats, setStats] = useState({})
  const [roiSnapshots, setRoiSnapshots] = useState([])
  const [roiEvents, setRoiEvents] = useState([])
  const [dnaProfiles, setDnaProfiles] = useState([])
  const [voices, setVoices] = useState([])
  const [contexts, setContexts] = useState([])
  const [impacts, setImpacts] = useState([])
  const [tickets, setTickets] = useState([])
  const [agents, setAgents] = useState([])
  const [genLoading, setGenLoading] = useState('')
  const [selectedTicket, setSelectedTicket] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('')
  const [dnaType, setDnaType] = useState('team')
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [originSystem, setOriginSystem] = useState('')
  const [impactSeverity, setImpactSeverity] = useState('high')
  const [selectedDNA, setSelectedDNA] = useState(null)
  const [selectedImpact, setSelectedImpact] = useState(null)
  const [selectedVoice, setSelectedVoice] = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { user } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    await loadAll()
    setLoading(false)
  }

  async function loadAll() {
    const results = await Promise.allSettled([
      fetch('/api/business-supremacy?type=stats').then(r => r.json()),
      fetch('/api/business-supremacy?type=roi_snapshots').then(r => r.json()),
      fetch('/api/business-supremacy?type=dna_profiles').then(r => r.json()),
      fetch('/api/business-supremacy?type=voice_interactions').then(r => r.json()),
      fetch('/api/business-supremacy?type=business_contexts').then(r => r.json()),
      fetch('/api/business-supremacy?type=process_impacts').then(r => r.json()),
      fetch('/api/business-supremacy?type=tickets_list').then(r => r.json()),
      fetch('/api/business-supremacy?type=agents').then(r => r.json()),
    ])
    const [stR, roiR, dnaR, voiR, ctxR, impR, tkR, agR] = results.map(r => r.status === 'fulfilled' ? r.value : {})
    setStats(stR?.stats || {})
    setRoiSnapshots(roiR?.snapshots || [])
    setDnaProfiles(dnaR?.profiles || [])
    setVoices(voiR?.interactions || [])
    setContexts(ctxR?.contexts || [])
    setImpacts(impR?.impacts || [])
    setTickets(tkR?.tickets || [])
    setAgents(agR?.agents || [])
  }

  async function action(a, body = {}) {
    setGenLoading(a)
    try {
      const res = await fetch('/api/business-supremacy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: a, ...body }),
      })
      await loadAll()
    } catch (e) {}
    setGenLoading('')
  }

  const S = {
    page: { minHeight: '100vh', background: '#050510', fontFamily: "'DM Sans',sans-serif", color: '#e2e8f0' },
    card: { background: 'linear-gradient(135deg, rgba(15,15,40,0.9) 0%, rgba(20,20,50,0.8) 100%)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, backdropFilter: 'blur(20px)' },
    glowCard: (c) => ({ background: `linear-gradient(135deg, rgba(15,15,40,0.9) 0%, ${c}08 100%)`, border: `1px solid ${c}20`, borderRadius: 16 }),
    badge: (c) => ({ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: c + '20', color: c, border: `1px solid ${c}40`, display: 'inline-block' }),
    input: { width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#e2e8f0', transition: 'border 0.2s' },
    btn: (c = '#6366f1') => ({ padding: '11px 22px', background: `linear-gradient(135deg, ${c}, ${c}bb)`, border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", transition: 'all 0.2s', boxShadow: `0 4px 20px ${c}40`, letterSpacing: 0.3 }),
    btnO: { padding: '9px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#64748b', cursor: 'pointer', fontSize: 12, fontFamily: "'DM Sans',sans-serif" },
    select: { padding: '11px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#e2e8f0' },
    sectionTitle: { fontSize: 15, fontWeight: 800, color: '#e2e8f0', marginBottom: 14, letterSpacing: '-0.3px' },
  }

  if (loading) return (
    <div style={S.page}><GlobalNav title="Business Supremacy" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>💼</div>
          <div style={{ color: '#475569', fontSize: 13, letterSpacing: 2 }}>LOADING BUSINESS SUPREMACY ENGINE...</div>
        </div>
      </div>
    </div>
  )

  const latestROI = roiSnapshots[0]

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes rotateDNA { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing:border-box; }
        .bs-tab { padding:10px 20px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer; border:1px solid rgba(255,255,255,0.07); background:transparent; color:#475569; font-family:'DM Sans',sans-serif; transition:all 0.25s; letter-spacing:0.5px; text-transform:uppercase; }
        .bs-tab:hover { color:#94a3b8; border-color:rgba(255,255,255,0.12); }
        .bs-tab.active { background:linear-gradient(135deg,rgba(99,102,241,0.25),rgba(168,85,247,0.15)); color:#c7d2fe; border-color:rgba(99,102,241,0.5); box-shadow:0 4px 20px rgba(99,102,241,0.2); }
        .bs-btn:hover { transform:translateY(-2px); filter:brightness(1.1); }
        .bs-row:hover { background:rgba(99,102,241,0.05) !important; cursor:pointer; }
        .dna-ring { transition:all 0.5s ease; }
        input:focus,select:focus,textarea:focus { border-color:rgba(99,102,241,0.6) !important; box-shadow:0 0 0 3px rgba(99,102,241,0.12) !important; outline:none; }
      `}</style>

      <GlobalNav title="Business Supremacy Hub" />

      <div style={{ maxWidth: 1500, margin: '0 auto', padding: '28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <div style={{ fontSize: 32 }}>💼</div>
              <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, background: 'linear-gradient(135deg,#f59e0b 0%,#ec4899 50%,#6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>
                Business Supremacy Hub
              </h1>
            </div>
            <p style={{ color: '#334155', fontSize: 13, margin: 0 }}>P41-45 — ROI Intelligence · Support DNA · Voice AI · Business Context · Process Impact</p>
          </div>
          <button style={S.btnO} onClick={loadAll}>↻ Refresh</button>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10,1fr)', gap: 8, marginBottom: 28 }}>
          {[
            { icon: '💰', label: 'ROI Multiple', val: `${stats.roi_multiple || 0}x`, c: '#f59e0b', big: true },
            { icon: '₹', label: 'Total ROI', val: `${Math.round((stats.total_roi_inr || 0) / 1000)}K`, c: '#16a34a' },
            { icon: '🏦', label: 'Hard Savings', val: `${Math.round((stats.total_hard_savings || 0) / 1000)}K`, c: '#059669' },
            { icon: '🧬', label: 'Avg DNA Score', val: stats.avg_dna_score || 0, c: '#8b5cf6' },
            { icon: '🎙️', label: 'Voice Calls', val: stats.voice_interactions || 0, c: '#06b6d4' },
            { icon: '⚡', label: 'Avg Urgency', val: `${stats.avg_voice_urgency || 0}%`, c: '#d97706' },
            { icon: '🔴', label: 'High Risk Tkts', val: stats.high_risk_tickets || 0, c: '#dc2626' },
            { icon: '🚨', label: 'Esc. Required', val: stats.escalations_required || 0, c: '#d97706' },
            { icon: '💥', label: 'Process Impact', val: `${Math.round((stats.total_process_impact_inr || 0) / 1000)}K`, c: '#dc2626' },
            { icon: '🔗', label: 'Processes Hit', val: stats.processes_impacted || 0, c: '#6366f1' },
          ].map((s, i) => (
            <div key={i} style={{ ...S.glowCard(s.c), padding: '12px 10px', animation: `fadeUp 0.3s ${i * 0.03}s ease both`, textAlign: 'center' }}>
              <div style={{ fontSize: 18 }}>{s.icon}</div>
              <div style={{ fontSize: s.big ? 22 : 18, fontWeight: 900, color: s.c, marginTop: 4, letterSpacing: '-0.5px' }}>{s.val}</div>
              <div style={{ fontSize: 9, color: '#334155', marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { key: 'roi', label: '💰 ROI Intelligence' },
            { key: 'dna', label: `🧬 Support DNA (${dnaProfiles.length})` },
            { key: 'voice', label: `🎙️ Voice AI (${voices.length})` },
            { key: 'context', label: `🏢 Business Context (${contexts.length})` },
            { key: 'impact', label: `💥 Process Impact (${impacts.length})` },
          ].map(t => <button key={t.key} className={`bs-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
        </div>

        {/* ═══ ROI ═══ */}
        {tab === 'roi' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'flex-end' }}>
              {['monthly', 'weekly', 'quarterly'].map(p => (
                <button key={p} style={S.btn(p === 'monthly' ? '#f59e0b' : p === 'weekly' ? '#16a34a' : '#6366f1')} className="bs-btn"
                  disabled={genLoading === 'calculate_roi'}
                  onClick={() => action('calculate_roi', { period_type: p })}>
                  {genLoading === 'calculate_roi' ? '⏳...' : `📊 ${p.charAt(0).toUpperCase() + p.slice(1)} ROI`}
                </button>
              ))}
            </div>

            {!latestROI ? (
              <div style={{ ...S.card, padding: 70, textAlign: 'center' }}>
                <div style={{ fontSize: 56, opacity: 0.15 }}>💰</div>
                <div style={{ fontSize: 14, color: '#334155', marginTop: 16 }}>Calculate your first ROI snapshot</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }}>
                {/* ROI Hero */}
                <div style={{ ...S.glowCard('#f59e0b'), padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#78716c', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>RETURN ON INVESTMENT</div>
                  <div style={{ fontSize: 88, fontWeight: 900, color: '#f59e0b', lineHeight: 1, letterSpacing: '-4px' }}>{latestROI.roi_multiple}x</div>
                  <div style={{ fontSize: 13, color: '#a16207', marginTop: 8 }}>per ₹1 invested in NexDesk</div>
                  <div style={{ width: '100%', marginTop: 20, padding: '12px 0', borderTop: '1px solid rgba(245,158,11,0.2)' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>₹{Math.round(latestROI.total_roi_inr || 0).toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>vs ₹{(latestROI.nexdesk_cost_inr || 0).toLocaleString()} platform cost</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>{latestROI.period} · {latestROI.period_type}</div>
                </div>

                {/* Savings Breakdown */}
                <div style={{ ...S.card, padding: 24 }}>
                  <div style={S.sectionTitle}>💰 Savings Breakdown</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {[
                      { l: '🕐 Agent Time Saved', v: `₹${Math.round(latestROI.agent_cost_savings_inr || 0).toLocaleString()}`, sub: `${(latestROI.agent_hours_saved || 0).toFixed(1)} hrs @ ₹${latestROI.agent_cost_per_hour_inr}/hr`, c: '#6366f1' },
                      { l: '🤖 Auto-Resolved', v: `₹${Math.round(latestROI.auto_resolve_savings_inr || 0).toLocaleString()}`, sub: `${latestROI.tickets_auto_resolved || 0} tickets × ₹750 avg`, c: '#8b5cf6' },
                      { l: '📋 SLA Penalties Avoided', v: `₹${Math.round(latestROI.sla_savings_inr || 0).toLocaleString()}`, sub: `${latestROI.sla_breaches_prevented || 0} breaches prevented`, c: '#d97706' },
                      { l: '🚀 Escalations Stopped', v: `₹${Math.round(latestROI.escalation_savings_inr || 0).toLocaleString()}`, sub: `${latestROI.escalations_prevented || 0} L2 escalations saved`, c: '#059669' },
                      { l: '🔒 Churn Neutralized', v: `₹${Math.round(latestROI.churn_value_saved_inr || 0).toLocaleString()}`, sub: `${latestROI.churn_prevented_count || 0} customers retained`, c: '#ec4899' },
                      { l: '🛡️ Brand Protection', v: `₹${Math.round(latestROI.brand_damage_prevented_inr || 0).toLocaleString()}`, sub: 'Soft value from incident prevention', c: '#06b6d4' },
                    ].map((m, i) => (
                      <div key={i} style={{ padding: 14, borderRadius: 12, background: `${m.c}0c`, border: `1px solid ${m.c}22` }}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{m.l}</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: m.c }}>{m.v}</div>
                        <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{m.sub}</div>
                      </div>
                    ))}
                  </div>
                  {latestROI.ai_roi_story && (
                    <div style={{ padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>📢 Executive Summary</div>
                      <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.8 }}>{latestROI.ai_roi_story}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ROI History */}
            {roiSnapshots.length > 1 && (
              <div style={{ ...S.card, padding: 20 }}>
                <div style={S.sectionTitle}>📈 ROI History</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 }}>
                  {roiSnapshots.slice(0, 6).map((s, i) => (
                    <div key={s.id} style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: '#f59e0b' }}>{s.roi_multiple}x</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{s.period}</div>
                      <div style={{ fontSize: 10, color: '#16a34a' }}>₹{Math.round((s.total_roi_inr || 0) / 1000)}K</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ SUPPORT DNA ═══ */}
        {tab === 'dna' && (
          <div>
            <div style={{ ...S.card, padding: 20, marginBottom: 16 }}>
              <div style={S.sectionTitle}>🧬 Build Support DNA Profile</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select style={{ ...S.select, width: 160 }} value={dnaType} onChange={e => setDnaType(e.target.value)}>
                  <option value="team">Full Team</option>
                  <option value="agent">Specific Agent</option>
                </select>
                {dnaType === 'agent' && (
                  <select style={{ ...S.select, flex: 1 }} value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
                    <option value="">Select Agent</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.full_name || a.email} ({a.role})</option>)}
                  </select>
                )}
                <button style={S.btn('#8b5cf6')} className="bs-btn" disabled={genLoading === 'build_dna' || (dnaType === 'agent' && !selectedAgent)} onClick={() => action('build_dna', { entity_type: dnaType, entity_id: dnaType === 'agent' ? selectedAgent : null }).then(() => setGenLoading(''))}>
                  {genLoading === 'build_dna' ? '⏳ Analyzing DNA...' : '🧬 Build DNA Profile'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selectedDNA ? '1fr 1.2fr' : '1fr 1fr 1fr', gap: 14 }}>
              {dnaProfiles.map(profile => (
                <div key={profile.id} className="bs-row" style={{ ...S.card, padding: 24, animation: 'fadeUp 0.3s ease both' }} onClick={() => setSelectedDNA(selectedDNA?.id === profile.id ? null : profile)}>
                  {/* Grade Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{profile.entity_name}</div>
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{profile.profile_type} · {profile.profile_period}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 36, fontWeight: 900, color: GRADE_C[profile.dna_grade] || '#6366f1', lineHeight: 1 }}>{profile.dna_grade}</div>
                      <div style={{ fontSize: 9, color: '#475569' }}>GRADE</div>
                    </div>
                  </div>

                  {/* DNA Radar Bars */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
                    {Object.entries(DNA_LABELS).map(([key, meta]) => (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 10, color: '#64748b' }}>{meta.icon} {meta.label}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: meta.c }}>{profile[key] || 0}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                          <div style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${meta.c}, ${meta.c}88)`, width: `${profile[key] || 0}%`, transition: 'width 0.8s ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={S.badge('#16a34a')}>Top {100 - (profile.industry_percentile || 50)}%</span>
                    <span style={{ ...S.badge('#8b5cf6'), fontSize: 10 }}>Score: {profile.overall_dna_score}</span>
                  </div>
                </div>
              ))}

              {/* DNA Detail Panel */}
              {selectedDNA && (
                <div style={{ ...S.card, padding: 24, animation: 'fadeUp 0.3s ease both' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#e2e8f0' }}>🧬 DNA Deep Dive</h3>
                    <button style={S.btnO} onClick={() => setSelectedDNA(null)}>✕</button>
                  </div>
                  <div style={{ padding: 14, borderRadius: 12, background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#86efac', marginBottom: 4 }}>💪 SUPERPOWER</div>
                    <div style={{ fontSize: 13, color: '#e2e8f0' }}>{selectedDNA.superpower}</div>
                  </div>
                  <div style={{ padding: 14, borderRadius: 12, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#fca5a5', marginBottom: 4 }}>⚡ KRYPTONITE</div>
                    <div style={{ fontSize: 13, color: '#e2e8f0' }}>{selectedDNA.kryptonite}</div>
                  </div>
                  <div style={{ padding: 14, borderRadius: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', marginBottom: 4 }}>📋 AI COACHING PLAN</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>{selectedDNA.ai_coaching_plan}</div>
                  </div>
                  {(selectedDNA.ai_prescription || []).map((p, i) => (
                    <div key={i} style={{ padding: 10, borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#fcd34d' }}>💊 {p.issue}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{p.fix}</div>
                      <span style={{ ...S.badge(p.priority === 'high' ? '#dc2626' : '#d97706'), fontSize: 9, marginTop: 4 }}>{p.priority}</span>
                    </div>
                  ))}
                  {selectedDNA.peak_performance_time && <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>⏰ Peak: {selectedDNA.peak_performance_time} · Style: {selectedDNA.resolution_style}</div>}
                </div>
              )}

              {dnaProfiles.length === 0 && <div style={{ ...S.card, padding: 70, textAlign: 'center', gridColumn: '1/4' }}><div style={{ fontSize: 56, opacity: 0.15 }}>🧬</div><div style={{ fontSize: 14, color: '#334155', marginTop: 16 }}>No DNA profiles yet. Build the first one.</div></div>}
            </div>
          </div>
        )}

        {/* ═══ VOICE AI ═══ */}
        {tab === 'voice' && (
          <div>
            <div style={{ ...S.card, padding: 24, marginBottom: 16 }}>
              <div style={S.sectionTitle}>🎙️ Voice Support AI Analyzer</div>
              <p style={{ fontSize: 12, color: '#475569', margin: '0 0 14px' }}>Paste a call transcript (or future: real audio upload) → AI detects emotion, extracts issues, drafts reply script</p>
              <textarea style={{ ...S.input, height: 100, resize: 'vertical' }}
                placeholder="Paste call transcript here... e.g. 'Customer: Our entire payment system has been down since 9am, we cannot process any orders. This is costing us lakhs every hour...'"
                value={voiceTranscript} onChange={e => setVoiceTranscript(e.target.value)} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button style={S.btn('#06b6d4')} className="bs-btn" disabled={genLoading === 'analyze_voice' || !voiceTranscript.trim()}
                  onClick={() => action('analyze_voice', { transcript: voiceTranscript, duration_sec: 180 }).then(() => { setGenLoading(''); setVoiceTranscript('') })}>
                  {genLoading === 'analyze_voice' ? '⏳ Analyzing Call...' : '🎙️ Analyze Call'}
                </button>
              </div>
            </div>

            {voices.length === 0 ? (
              <div style={{ ...S.card, padding: 70, textAlign: 'center' }}><div style={{ fontSize: 56, opacity: 0.15 }}>🎙️</div><div style={{ fontSize: 14, color: '#334155', marginTop: 16 }}>No voice interactions yet</div></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: selectedVoice ? '1fr 1fr' : '1fr', gap: 14 }}>
                <div>
                  {voices.map(v => (
                    <div key={v.id} className="bs-row" style={{ ...S.card, padding: 20, marginBottom: 12, borderLeft: `4px solid ${RISK_C[v.ai_urgency_score > 70 ? 'critical' : v.ai_urgency_score > 40 ? 'high' : 'low']}` }}
                      onClick={() => setSelectedVoice(selectedVoice?.id === v.id ? null : v)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 28 }}>{EMOTION_ICON[v.ai_emotion_detected] || '🎙️'}</span>
                          <div>
                            <span style={S.badge(RISK_C[v.ai_sentiment === 'distressed' ? 'critical' : v.ai_sentiment === 'frustrated' ? 'high' : 'low'] || '#6366f1')}>{v.ai_sentiment}</span>
                            <span style={{ ...S.badge('#06b6d4'), marginLeft: 6 }}>{v.ai_emotion_detected}</span>
                            <span style={{ ...S.badge('#d97706'), marginLeft: 6 }}>{v.speaking_pace} pace</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 28, fontWeight: 900, color: v.ai_urgency_score > 70 ? '#dc2626' : '#d97706' }}>{v.ai_urgency_score}%</div>
                          <div style={{ fontSize: 9, color: '#475569' }}>urgency</div>
                        </div>
                      </div>
                      {v.ai_summary && <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{v.ai_summary}</div>}
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 8 }}>Priority: <span style={{ color: RISK_C[v.auto_ticket_priority] || '#94a3b8', fontWeight: 700 }}>{v.auto_ticket_priority}</span> · {(v.ai_action_items || []).length} actions · {v.duration_sec}s call</div>
                    </div>
                  ))}
                </div>
                {selectedVoice && (
                  <div style={{ ...S.card, padding: 24, position: 'sticky', top: 20, maxHeight: '80vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#e2e8f0' }}>🎙️ Call Analysis</h3>
                      <button style={S.btnO} onClick={() => setSelectedVoice(null)}>✕</button>
                    </div>
                    {selectedVoice.ai_reply_script && (
                      <div style={{ padding: 14, borderRadius: 12, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)', marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#67e8f9', marginBottom: 6 }}>📞 AI REPLY SCRIPT — {selectedVoice.ai_reply_tone}</div>
                        <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.8, fontStyle: 'italic' }}>"{selectedVoice.ai_reply_script}"</div>
                      </div>
                    )}
                    {(selectedVoice.ai_key_issues || []).length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>🔑 KEY ISSUES</div>
                        {selectedVoice.ai_key_issues.map((issue, i) => (
                          <div key={i} style={{ padding: 10, background: 'rgba(220,38,38,0.06)', borderRadius: 8, marginBottom: 6, border: '1px solid rgba(220,38,38,0.15)' }}>
                            <div style={{ fontSize: 12, color: '#fca5a5' }}>{issue.issue}</div>
                            <span style={{ ...S.badge(RISK_C[issue.severity] || '#64748b'), fontSize: 9, marginTop: 4 }}>{issue.severity}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {(selectedVoice.ai_action_items || []).length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>✅ ACTION ITEMS</div>
                        {selectedVoice.ai_action_items.map((a, i) => (
                          <div key={i} style={{ padding: 10, background: 'rgba(22,163,74,0.06)', borderRadius: 8, marginBottom: 6, border: '1px solid rgba(22,163,74,0.15)' }}>
                            <div style={{ fontSize: 12, color: '#86efac' }}>{a.action}</div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Owner: {a.owner} · {a.deadline}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {(selectedVoice.stress_indicators || []).length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>⚠️ STRESS INDICATORS</div>
                        {selectedVoice.stress_indicators.map((s, i) => <div key={i} style={{ fontSize: 11, color: '#d97706', marginBottom: 3 }}>• {s}</div>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ BUSINESS CONTEXT ═══ */}
        {tab === 'context' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <select style={{ ...S.select, flex: 1 }} value={selectedTicket} onChange={e => setSelectedTicket(e.target.value)}>
                <option value="">Select Ticket for Business Context Analysis</option>
                {tickets.map(t => <option key={t.id} value={t.id}>{t.ticket_number}: {t.title?.substring(0, 55)}</option>)}
              </select>
              <button style={S.btn('#ec4899')} className="bs-btn" disabled={genLoading === 'build_context' || !selectedTicket}
                onClick={() => action('build_context', { ticket_id: selectedTicket }).then(() => setGenLoading(''))}>
                {genLoading === 'build_context' ? '⏳ Analyzing...' : '🏢 Analyze Business Context'}
              </button>
            </div>
            {contexts.length === 0 ? (
              <div style={{ ...S.card, padding: 70, textAlign: 'center' }}><div style={{ fontSize: 56, opacity: 0.15 }}>🏢</div><div style={{ fontSize: 14, color: '#334155', marginTop: 16 }}>No business contexts analyzed yet</div></div>
            ) : contexts.map(ctx => (
              <div key={ctx.id} style={{ ...S.card, padding: 24, marginBottom: 14, borderLeft: `4px solid ${RISK_C[ctx.business_risk_level]}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ padding: 12, borderRadius: 12, background: `${RISK_C[ctx.business_risk_level]}0c`, border: `1px solid ${RISK_C[ctx.business_risk_level]}22`, textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 900, color: RISK_C[ctx.business_risk_level] }}>{ctx.business_risk_score}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>Business Risk</div>
                    <span style={S.badge(RISK_C[ctx.business_risk_level])}>{ctx.business_risk_level}</span>
                  </div>
                  <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Affected Process</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{ctx.affected_process || 'Unknown'}</div>
                    <div style={{ fontSize: 11, color: '#475569' }}>{ctx.affected_department}</div>
                    <span style={S.badge(ctx.process_criticality === 'mission-critical' ? '#dc2626' : '#d97706')}>{ctx.process_criticality}</span>
                  </div>
                  <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Business Timing</div>
                    {[
                      { l: 'End of Quarter', v: ctx.is_end_of_quarter },
                      { l: 'Payroll Period', v: ctx.is_payroll_run_day },
                      { l: 'Audit Active', v: ctx.is_audit_period },
                      { l: 'Peak Traffic', v: ctx.is_peak_traffic_period },
                    ].filter(f => f.v).map((f, i) => <div key={i} style={{ ...S.badge('#dc2626'), marginBottom: 3, fontSize: 10 }}>🔴 {f.l}</div>)}
                    {!ctx.is_end_of_quarter && !ctx.is_payroll_run_day && <div style={{ fontSize: 11, color: '#475569' }}>Normal period</div>}
                  </div>
                  <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Customer</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{ctx.customer_industry}</div>
                    <span style={S.badge('#6366f1')}>{ctx.customer_company_size}</span>
                    {ctx.risk_escalation_required && <div style={{ ...S.badge('#dc2626'), marginTop: 6, fontSize: 10 }}>🚨 Escalation Required</div>}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: 12, borderRadius: 10, background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#f9a8d4', marginBottom: 4 }}>🎯 PRIORITY REASON</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{ctx.ai_business_priority_reason}</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', marginBottom: 4 }}>🚀 RESPONSE STRATEGY</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{ctx.ai_recommended_response_strategy}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ PROCESS IMPACT ═══ */}
        {tab === 'impact' && (
          <div>
            <div style={{ ...S.card, padding: 20, marginBottom: 16 }}>
              <div style={S.sectionTitle}>💥 Process Impact Analyzer</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select style={{ ...S.select, flex: 1 }} value={selectedTicket} onChange={e => setSelectedTicket(e.target.value)}>
                  <option value="">Select Ticket</option>
                  {tickets.map(t => <option key={t.id} value={t.id}>{t.ticket_number}: {t.title?.substring(0, 50)}</option>)}
                </select>
                <input style={{ ...S.input, width: 260 }} placeholder="Origin system (e.g. Payment Gateway)" value={originSystem} onChange={e => setOriginSystem(e.target.value)} />
                <select style={{ ...S.select, width: 140 }} value={impactSeverity} onChange={e => setImpactSeverity(e.target.value)}>
                  {['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button style={S.btn('#dc2626')} className="bs-btn" disabled={genLoading === 'analyze_impact' || !selectedTicket || !originSystem}
                  onClick={() => action('analyze_impact', { ticket_id: selectedTicket, origin_system: originSystem, severity: impactSeverity }).then(() => { setGenLoading(''); setOriginSystem('') })}>
                  {genLoading === 'analyze_impact' ? '⏳ Mapping...' : '💥 Map Impact'}
                </button>
              </div>
            </div>

            {impacts.length === 0 ? (
              <div style={{ ...S.card, padding: 70, textAlign: 'center' }}><div style={{ fontSize: 56, opacity: 0.15 }}>💥</div><div style={{ fontSize: 14, color: '#334155', marginTop: 16 }}>No process impact maps yet</div></div>
            ) : impacts.map(impact => (
              <div key={impact.id} style={{ ...S.card, padding: 24, marginBottom: 16, borderTop: '3px solid #dc2626' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#fca5a5', marginBottom: 4 }}>💥 {impact.analysis_name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Origin: {impact.origin_system} · {impact.origin_team} · Severity: {impact.origin_severity}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[
                      { l: 'Total Impact', v: `₹${Math.round((impact.total_impact_inr || 0) / 100000).toLocaleString()}L`, c: '#dc2626' },
                      { l: 'Processes', v: impact.total_processes_impacted, c: '#d97706' },
                      { l: 'Teams', v: impact.total_teams_impacted, c: '#6366f1' },
                      { l: 'People', v: impact.total_people_blocked, c: '#8b5cf6' },
                      { l: 'Recovery', v: `${impact.estimated_recovery_min}min`, c: '#059669' },
                    ].map((m, i) => (
                      <div key={i} style={{ padding: '8px 12px', background: `${m.c}0c`, borderRadius: 10, border: `1px solid ${m.c}22`, textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: m.c }}>{m.v}</div>
                        <div style={{ fontSize: 9, color: '#64748b' }}>{m.l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Impact Cascade Visualization */}
                {(impact.impact_nodes || []).length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>🌊 Cascade Blast Wave</div>
                    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
                      {impact.impact_nodes.map((node, i) => (
                        <div key={node.id} style={{ minWidth: 180, padding: 14, borderRadius: 12, background: `${STATUS_C[node.status] || '#6366f1'}0c`, border: `2px solid ${STATUS_C[node.status] || '#6366f1'}40`, flexShrink: 0 }}>
                          <div style={{ fontSize: 10, color: STATUS_C[node.status], fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>⚡ {node.status}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>{node.process}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>{node.team}</div>
                          {node.revenue_impact_inr > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>₹{Math.round(node.revenue_impact_inr / 1000)}K</div>}
                          {node.estimated_delay_min > 0 && <div style={{ fontSize: 10, color: '#d97706' }}>+{node.estimated_delay_min}min delay</div>}
                          {(node.depends_on || []).length > 0 && <div style={{ fontSize: 9, color: '#475569', marginTop: 4 }}>↑ depends on {node.depends_on.join(', ')}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Critical Path Fix */}
                {impact.critical_path_fix && (
                  <div style={{ padding: 12, borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', marginTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6ee7b7', marginBottom: 4 }}>🎯 CRITICAL PATH FIX — Single action that unblocks everything</div>
                    <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{impact.critical_path_fix}</div>
                  </div>
                )}

                {/* Recovery Sequence */}
                {(impact.recovery_sequence || []).length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>🔄 RECOVERY SEQUENCE</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {impact.recovery_sequence.map((step, i) => (
                        <div key={i} style={{ flex: 1, padding: 10, borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', marginBottom: 4 }}>STEP {step.step}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{step.action}</div>
                          <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>⏱️ {step.time_min}min</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

