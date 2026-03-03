'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      setUser(user)
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (!user) return (
    <div style={{
      minHeight:'100vh', background:'#0a0e1a',
      display:'flex', alignItems:'center', justifyContent:'center'
    }}>
      <div style={{
        width:40, height:40, borderRadius:'50%',
        border:'3px solid #1f2d45', borderTopColor:'#3b82f6',
        animation:'spin 0.7s linear infinite'
      }}/>
    </div>
  )

  return (
    <div style={{
      minHeight:'100vh', background:'#0a0e1a',
      fontFamily:"'DM Sans', sans-serif", color:'#e2e8f0'
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Topbar */}
      <div style={{
        background:'#111827', borderBottom:'1px solid #1f2d45',
        padding:'16px 32px', display:'flex',
        alignItems:'center', justifyContent:'space-between'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            width:38, height:38, borderRadius:10,
            background:'linear-gradient(135deg,#3b82f6,#06b6d4)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:18
          }}>⚡</div>
          <span style={{
            fontFamily:"'Syne',sans-serif",
            fontSize:20, fontWeight:800
          }}>Nex<span style={{color:'#06b6d4'}}>Desk</span></span>
        </div>
        <button onClick={handleLogout} style={{
          background:'transparent', border:'1px solid #1f2d45',
          color:'#64748b', padding:'8px 16px', borderRadius:8,
          cursor:'pointer', fontSize:13, fontFamily:"'DM Sans',sans-serif"
        }}>Sign Out</button>
      </div>

      {/* Content */}
      <div style={{
        maxWidth:700, margin:'80px auto', padding:'0 24px', textAlign:'center'
      }}>
        <div style={{ fontSize:60, marginBottom:24 }}>🎉</div>
        <h1 style={{
          fontFamily:"'Syne',sans-serif",
          fontSize:36, fontWeight:800, marginBottom:16
        }}>Login Successful!</h1>
        <p style={{ color:'#64748b', fontSize:16, marginBottom:32 }}>
          Welcome, <strong style={{color:'#3b82f6'}}>{user.email}</strong>
        </p>

        <div style={{
          background:'#111827', border:'1px solid #1f2d45',
          borderRadius:16, padding:32, textAlign:'left'
        }}>
          <div style={{
            background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)',
            borderRadius:10, padding:'12px 16px', marginBottom:24,
            color:'#6ee7b7', fontSize:14, display:'flex', gap:10
          }}>
            ✅ &nbsp;<strong>Phase 1 Complete!</strong>&nbsp; Authentication is working perfectly.
          </div>

          <p style={{ color:'#94a3b8', fontSize:14, marginBottom:16 }}>
            <strong style={{color:'#e2e8f0'}}>What's next:</strong>
          </p>
          {[
            ['🎫','Phase 2','Ticket Management System — Create, assign, escalate tickets'],
            ['🤖','Phase 3','AI Engine — Auto-analysis and resolution'],
            ['📊','Phase 4','Reports, analytics, email notifications'],
          ].map(([icon, phase, desc]) => (
            <div key={phase} style={{
              display:'flex', gap:14, padding:'12px 0',
              borderBottom:'1px solid #1f2d45'
            }}>
              <span style={{fontSize:24}}>{icon}</span>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:'#e2e8f0'}}>{phase}</div>
                <div style={{fontSize:13,color:'#64748b'}}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
