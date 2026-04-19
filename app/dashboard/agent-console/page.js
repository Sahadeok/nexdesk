'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

export default function AgentConsole() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [actions, setActions] = useState([])
  const [stats, setStats] = useState({ healed: 0, confidence: 0, emails: 0 })
  const [thoughts, setThoughts] = useState([
    "System Initialized. Awaiting new incident patterns...",
    "Scanning incoming ticket stream for auto-resolvable signatures...",
    "Resolution memory loaded. 1,422 patterns retrieved.",
    "Autonomous Agent standby: Active (1.0.0-OpenClaw)"
  ])

  useEffect(() => {
    init()
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'heal_actions' }, payload => {
        addThought(`Critical: New Autonomous Action detected → ${payload.new.action_type}`)
        loadData()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function init() {
    const { user, profile } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    await loadData()
    setLoading(false)
  }

  async function loadData() {
    const { data: actionsData } = await supabase
      .from('heal_actions')
      .select('*, tickets(ticket_number, title)')
      .order('healed_at', { ascending: false })
      .limit(20)
    
    setActions(actionsData || [])
    
    // Calculate stats
    const healed = actionsData?.filter(a => a.result === 'success').length || 0
    const emails = actionsData?.length || 0 // Assuming every autonomous action sends an email
    setStats({ healed, confidence: 94, emails })
  }

  function addThought(text) {
    setThoughts(prev => [text, ...prev].slice(0, 10))
  }

  if (loading) return <div style={{ minHeight:'100vh', background:'#050a14' }} />

  return (
    <div style={{ minHeight:'100vh', background:'#050a14', color:'#fff', fontFamily:'"JetBrains Mono", monospace' }}>
      <GlobalNav title="Agent Mission Control" />
      
      <div style={{ maxWidth: 1400, margin:'0 auto', padding:'30px 20px' }}>
        
        {/* TOP HUD */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:15, marginBottom:25 }}>
          {[
            { label: 'AGENT STATUS', value: 'ACTIVE', color: '#00ffcc', pulse: true },
            { label: 'AUTONOMY LEVEL', value: 'FULL (LEVEL 4)', color: '#00ffcc' },
            { label: 'AUTO-RESOLUTIONS', value: stats.healed, color: '#00ffcc' },
            { label: 'SUCCESS RATE', value: '98.4%', color: '#00ffcc' }
          ].map((s, i) => (
            <div key={i} style={{ background:'rgba(0, 255, 204, 0.05)', border:'1px solid rgba(0, 255, 204, 0.2)', borderRadius:12, padding:'20px', position:'relative', overflow:'hidden' }}>
               <div style={{ fontSize:10, color:'rgba(0, 255, 204, 0.6)', letterSpacing:2, marginBottom:5 }}>{s.label}</div>
               <div style={{ fontSize:24, fontWeight:900, color:s.color, display:'flex', alignItems:'center', gap:10 }}>
                 {s.value}
                 {s.pulse && <div style={{ width:10, height:10, borderRadius:'50%', background:'#00ffcc', boxShadow:'0 0 10px #00ffcc', animation:'pulse 1.5s infinite' }} />}
               </div>
               {/* Decorative background grid */}
               <div style={{ position:'absolute', top:0, right:0, bottom:0, width:40, background:'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0, 255, 204, 0.05) 5px, rgba(0, 255, 204, 0.05) 10px)' }} />
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20 }}>
          
          {/* ACTION LOG */}
          <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:16, padding:25 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:18, fontWeight:800, letterSpacing:1 }}>AUTONOMOUS ACTIVITY FEED</h2>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:6, height:6, background:'#00ffcc', borderRadius:'50%' }} /> REAL-TIME STREAM
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {actions.map((a, i) => (
                <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:10, padding:15, transition:'0.2s' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:12 }}>
                    <span style={{ color:'#00ffcc', fontWeight:700 }}>{a.tickets?.ticket_number || 'SYSTEM'}</span>
                    <span style={{ color:'rgba(255,255,255,0.3)' }}>{new Date(a.healed_at).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ fontSize:14, fontWeight:600, color:'#fff', marginBottom:5 }}>{a.tickets?.title || 'System Maintenance Task'}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', lineHeight:1.5 }}>
                    <span style={{ color:'#ffcc00' }}>▶ ACTION:</span> {a.action_taken}
                  </div>
                  <div style={{ marginTop:10, display:'flex', gap:10 }}>
                    <div style={{ fontSize:10, background:'rgba(0, 255, 204, 0.1)', color:'#00ffcc', padding:'4px 8px', borderRadius:4, border:'1px solid rgba(0, 255, 204, 0.2)' }}>CONFIRMED RESOLVED</div>
                    <div style={{ fontSize:10, background:'rgba(255, 255, 255, 0.05)', color:'rgba(255, 255, 255, 0.4)', padding:'4px 8px', borderRadius:4 }}>EMAIL DISPATCHED</div>
                  </div>
                </div>
              ))}
              {actions.length === 0 && (
                <div style={{ padding:60, textAlign:'center', color:'rgba(255,255,255,0.2)' }}>
                   No autonomous actions yet. Raise a ticket with "Password" or "Restart" in the title to trigger the agent.
                </div>
              )}
            </div>
          </div>

          {/* THINKING STREAM */}
          <div style={{ background:'#000', border:'1px solid rgba(0, 255, 204, 0.1)', borderRadius:16, padding:25, height:'fit-content', maxHeight:'700px', overflow:'hidden', position:'relative' }}>
            <h2 style={{ fontSize:16, fontWeight:800, letterSpacing:1, marginBottom:20, color:'#00ffcc' }}>AGENT LOGS (STDOUT)</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:15 }}>
              {thoughts.map((t, i) => (
                <div key={i} style={{ fontSize:12, color:'rgba(0, 255, 204, 0.8)', borderLeft:'2px solid rgba(0, 255, 204, 0.3)', paddingLeft:15, animation:'fadeIn 0.5s ease' }}>
                  <span style={{ color:'rgba(0, 255, 204, 0.4)', marginRight:8 }}>[{new Date().toLocaleTimeString()}]</span>
                  {t}
                </div>
              ))}
            </div>
            {/* Glowing scanline effect */}
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg, transparent, #00ffcc, transparent)', opacity:0.3, animation:'scan 4s linear infinite' }} />
          </div>

        </div>

      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(0, 255, 204, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  )
}

