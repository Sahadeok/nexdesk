'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

export default function QuantumSupremacyDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('blockchain')
  const [stats, setStats] = useState({})
  
  const [ledger, setLedger] = useState([])
  const [prs, setPrs] = useState([])
  
  const [genLoading, setGenLoading] = useState('')
  const [ledgerStatus, setLedgerStatus] = useState({ valid: true })
  
  // AI PR inputs
  const [issueQuery, setIssueQuery] = useState('')

  useEffect(() => { init() }, [])

  async function init() {
    const { user } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    await loadAll()
    await action('verify_chain', {}, true)
    setLoading(false)
  }

  async function loadAll() {
    const res = await Promise.allSettled([
      fetch('/api/quantum-supremacy?type=stats').then(r => r.json()),
      fetch('/api/quantum-supremacy?type=ledger').then(r => r.json()),
      fetch('/api/quantum-supremacy?type=prs').then(r => r.json()),
    ])
    const [stR, lR, pR] = res.map(r => r.status === 'fulfilled' ? r.value : {})
    
    setStats(stR?.stats || {})
    setLedger((lR?.ledger || []).reverse()) // Display genesis first or chronological if preferred
    setPrs(pR?.prs || [])
  }

  async function action(a, body = {}, background = false) {
    if (!background) setGenLoading(a)
    try {
      const resp = await fetch('/api/quantum-supremacy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: a, ...body }) })
      const data = await resp.json()
      
      if (a === 'verify_chain' && data.verification) {
        setLedgerStatus(data.verification)
      } else if (!background) {
        await loadAll()
        // Re-verify after new blocks or corruption
        const check = await fetch('/api/quantum-supremacy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify_chain' }) })
        setLedgerStatus((await check.json()).verification)
      }
    } catch (e) {}
    if (!background) setGenLoading('')
  }

  const S = {
    page: { minHeight: '100vh', background: '#020617', fontFamily: "'DM Sans',sans-serif", color: '#e2e8f0' },
    card: (bg = 'rgba(255,255,255,0.02)') => ({ background: bg, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }),
    badge: c => ({ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: c + '20', color: c, border: `1px solid ${c}40`, display: 'inline-block' }),
    input: { width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#e2e8f0' },
    btn: (c, bg = false) => ({ padding: '11px 22px', background: bg ? `linear-gradient(135deg,${c},${c}bb)` : `${c}20`, border: `1px solid ${bg ? 'transparent' : c + '40'}`, borderRadius: 10, color: bg ? '#fff' : c, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", transition: 'all 0.2s', boxShadow: bg ? `0 4px 20px ${c}40` : 'none' }),
  }

  if (loading) return (
    <div style={S.page}><GlobalNav title="Quantum Core" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 64 }}>⚛️</div><div style={{ color: '#475569', fontSize: 13, letterSpacing: 2, marginTop: 16 }}>INITIALIZING QUANTUM CRYPTO...</div></div>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        *{box-sizing:border-box;}
        .q-tab{padding:10px 20px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid rgba(255,255,255,0.07);background:transparent;color:#475569;font-family:'DM Sans',sans-serif;transition:all 0.25s;letter-spacing:0.5px;text-transform:uppercase;}
        .q-tab:hover{color:#94a3b8;border-color:rgba(255,255,255,0.12);}
        .q-tab.active{background:linear-gradient(135deg,rgba(236,72,153,0.25),rgba(99,102,241,0.15));color:#fbcfe8;border-color:rgba(236,72,153,0.5);}
        .q-btn:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.1);}
        input:focus{border-color:rgba(236,72,153,0.6)!important;box-shadow:0 0 0 3px rgba(236,72,153,0.1)!important;outline:none;}
        
        .chain-link { width: 4px; height: 30px; background: #334155; margin-left: 30px; }
        .chain-link.broken { background: #ef4444; }
        .hash-string { font-family: 'Courier New', monospace; font-size: 11px; color: #64748b; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      `}</style>
      
      <GlobalNav title="Quantum Supremacy" />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <span style={{ fontSize: 32 }}>⚛️</span>
              <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, background: 'linear-gradient(135deg,#ec4899,#8b5cf6,#3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>
                Quantum Blockchain & AI Core
              </h1>
            </div>
            <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>P59-61 — Tamper-Proof Ledger · Quantum Keys · Code-Patching Engine</p>
          </div>
          <button style={S.btn('#475569')} className="q-btn" onClick={() => { loadAll(); action('verify_chain', {}, true) }}>↻ Re-sync Chains</button>
        </div>

        {/* Dash Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
          <div style={{ ...S.card(ledgerStatus.valid ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.1)'), padding: 20, border: `1px solid ${ledgerStatus.valid ? '#10b98133' : '#ef444455'}` }}>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>BLOCKCHAIN INTEGRITY</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: ledgerStatus.valid ? '#10b981' : '#ef4444', marginTop: 4 }}>
              {ledgerStatus.valid ? 'VERIFIED ✅' : 'CORRUPTED ❌'}
            </div>
            {!ledgerStatus.valid && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 8 }}>Mismatched hash detected at Block #{ledgerStatus.broken_at_index}</div>}
          </div>
          <div style={{ ...S.card(), padding: 20 }}>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>CRYPTO PROTOCOL</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#ec4899', marginTop: 4 }}>{stats.encryption_algo || 'PQ-Resistant'}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Post-Quantum KEM Sim</div>
          </div>
          <div style={{ ...S.card(), padding: 20 }}>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>LEDGER DEPTH</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#8b5cf6', marginTop: 4 }}>{stats.ledger_depth || 0} BLOCKS</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Genesis chain live</div>
          </div>
          <div style={{ ...S.card(), padding: 20 }}>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>AI COMMITS (AUTO-PR)</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#3b82f6', marginTop: 4 }}>{stats.ai_prs_created || 0} PRs</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Code fixes deployed automatically</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button className={`q-tab${tab === 'blockchain' ? ' active' : ''}`} onClick={() => setTab('blockchain')}>🔗 Tamper-Proof Audit Ledger (P59 & 61)</button>
          <button className={`q-tab${tab === 'autopr' ? ' active' : ''}`} onClick={() => setTab('autopr')}>👾 AI Code Fixer (P60)</button>
        </div>

        {/* ═══ BLOCKCHAIN AUDIT LEDGER ═══ */}
        {tab === 'blockchain' && (
          <div style={{ animation: 'fadeUp 0.3s ease both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 700 }}>Immutable Cryptographic Trail (Last 10 Blocks)</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={S.btn('#3b82f6', true)} className="q-btn" disabled={genLoading === 'log_event'} onClick={() => action('log_event', { event_type: 'MANUAL_DUMP', actor: 'SysAdmin', details: 'Triggered from DB console' })}>
                  {genLoading === 'log_event' ? '⏳ Minting Block...' : '🧱 Add Test Block'}
                </button>
                <button style={S.btn('#ef4444', false)} className="q-btn" disabled={!ledgerStatus.valid || ledger.length < 2 || genLoading === 'corrupt_block'} onClick={() => action('corrupt_block')}>
                  ☠️ Simulate DB Hack
                </button>
              </div>
            </div>

            <div style={{ padding: '0 20px' }}>
              {ledger.map((b, i) => {
                const isBrokenBlock = !ledgerStatus.valid && ledgerStatus.broken_at_index === b.block_index
                const linkBroken = !ledgerStatus.valid && b.block_index >= ledgerStatus.broken_at_index && i !== ledger.length - 1

                return (
                  <div key={b.id}>
                    <div style={{ ...S.card(isBrokenBlock ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.02)'), padding: 20, borderLeft: `4px solid ${isBrokenBlock ? '#ef4444' : '#10b981'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={S.badge(isBrokenBlock ? '#ef4444' : '#10b981')}>BLOCK #{b.block_index}</span>
                          <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 800 }}>{b.action_type}</span>
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>by {b.actor}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{new Date(b.timestamp).toLocaleString()}</div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 200px', gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2, fontWeight: 700 }}>PAYLOAD</div>
                          <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 12 }}>{JSON.stringify(b.payload)}</div>

                          <div style={{ fontSize: 10, color: '#ef4444', marginBottom: 2, fontWeight: 700 }}>PREV HASH (N-1)</div>
                          <div className="hash-string" style={{ marginBottom: 8 }}>{b.previous_block_hash}</div>

                          <div style={{ fontSize: 10, color: '#10b981', marginBottom: 2, fontWeight: 700 }}>CURRENT HASH (N)</div>
                          <div className="hash-string" style={{ color: isBrokenBlock ? '#fca5a5' : '#86efac' }}>{b.current_block_hash}</div>
                        </div>
                        
                        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 16 }}>
                          <div style={{ fontSize: 10, color: '#ec4899', marginBottom: 6, fontWeight: 700 }}>QUANTUM SIGNATURE</div>
                          <div style={{ fontSize: 10, color: '#fbcfe8', wordBreak: 'break-all', opacity: 0.8, lineHeight: 1.5 }}>
                            {b.quantum_signature}
                          </div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ec4899', animation: 'pulse 2s infinite' }}></span>
                            <span style={{ fontSize: 9, color: '#ec4899' }}>Lattice-Protected</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {i !== ledger.length - 1 && <div className={`chain-link ${linkBroken ? 'broken' : ''}`}></div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ═══ AI CODE FIXER ═══ */}
        {tab === 'autopr' && (
          <div style={{ animation: 'fadeUp 0.3s ease both' }}>
            <div style={{ ...S.card(), padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>🤖 Auto-Generate Git Pull Request for Bug</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input style={{ ...S.input, flex: 3 }} placeholder="Describe coding issue (e.g. Memory leak in cache module)" value={issueQuery} onChange={e => setIssueQuery(e.target.value)} />
                <button 
                  style={S.btn('#8b5cf6', true)} 
                  className="q-btn" 
                  disabled={genLoading === 'create_pr' || !issueQuery} 
                  onClick={() => action('create_pr', { issue_description: issueQuery }).then(() => setIssueQuery(''))}
                >
                  {genLoading === 'create_pr' ? '⏳ Coding...' : '👾 Build PR Patch'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {prs.length === 0 ? <div style={{ ...S.card(), padding: 70, textAlign: 'center' }}><div style={{ fontSize: 56, opacity: 0.15 }}>👾</div><div style={{ fontSize: 14, color: '#475569', marginTop: 16 }}>No AI-generated PRs yet</div></div> : null}
              {prs.map(pr => (
                <div key={pr.id} style={{ ...S.card('rgba(139,92,246,0.03)'), padding: 24, borderLeft: '4px solid #8b5cf6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <span style={S.badge('#8b5cf6')}>{pr.pr_number}</span>
                        <span style={S.badge('#10b981')}>{pr.status.toUpperCase()}</span>
                        <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 700 }}>Branch: {pr.branch_name}</span>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>{pr.commit_message}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Target: {pr.file_path}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: '#3b82f6' }}>{pr.confidence_score}%</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>CONFIDENCE</div>
                      {pr.security_scan_passed && <div style={{ fontSize: 10, color: '#10b981', marginTop: 4 }}>🛡️ Scan Passed</div>}
                    </div>
                  </div>

                  {/* Diff Viewer */}
                  <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 16px', background: '#1e293b', fontSize: 11, color: '#94a3b8', borderBottom: '1px solid #334155' }}>a/{pr.file_path} b/{pr.file_path}</div>
                    <div style={{ padding: 12, fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: '#e2e8f0', lineHeight: 1.6 }}>
                      <div style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)', padding: '2px 4px', display: 'flex', gap: 8 }}>
                        <span style={{ opacity: 0.5, userSelect: 'none' }}>-</span><span>{pr.original_code}</span>
                      </div>
                      <div style={{ color: '#86efac', background: 'rgba(16,185,129,0.1)', padding: '2px 4px', display: 'flex', gap: 8 }}>
                        <span style={{ opacity: 0.5, userSelect: 'none' }}>+</span><span>{pr.fixed_code}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: 16 }}>
                    <a href="#" style={{ fontSize: 12, color: '#cbd5e1', textDecoration: 'none', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span>View in GitHub</span><span>→</span>
                    </a>
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

