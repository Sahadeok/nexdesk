'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function FounderPortal() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [mounted, setMounted]   = useState(false)
  const [dots, setDots]         = useState(0)

  useEffect(() => {
    setMounted(true)
    // Animate loading dots
    const t = setInterval(() => setDots(d => (d + 1) % 4), 500)
    // If already logged in as founder, skip to super-admin
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/super-admin')
    })
    return () => clearInterval(t)
  }, [])

  async function handleFounderLogin(e) {
    e.preventDefault()
    if (!email || !password) { setError('Access credentials required.'); return }
    setLoading(true); setError('')

    try {
      // 🚀 BYPASS FOR DEVA (Since Email Is Not Confirmed)
      if (email === 'deva@nexdesk.com' && password === 'Deva@123') {
        document.cookie = "deva_bypass=true; path=/;";
        router.replace('/super-admin');
        return;
      }

      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) throw err

      // Verify this is actually a founder/super-admin
      const { data: profile } = await supabase.from('profiles').select('role, is_super_admin').eq('id', (await supabase.auth.getUser()).data.user.id).single()
      const isFounderEmail = email === 'user1@nexdesk.com' || email === 'admin@nexdesk.com' || email === 'deva@nexdesk.com'
      const isSuperAdmin   = profile?.role === 'SUPER_ADMIN' || profile?.is_super_admin === true

      if (!isFounderEmail && !isSuperAdmin) {
        await supabase.auth.signOut()
        setError('Access denied. This portal is for platform founders only.')
        setLoading(false)
        return
      }

      router.replace('/super-admin')
    } catch (err) {
      setError(err.message === 'Invalid login credentials' 
        ? 'Invalid founder credentials.' 
        : err.message)
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div style={{ minHeight:'100vh', background:'#000', color:'#fff', fontFamily:'"Outfit", sans-serif', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>

      {/* ── ANIMATED BACKGROUND ── */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }}>
        {/* Large glow orbs */}
        <div style={{ position:'absolute', top:'-15%', left:'-10%', width:'60vw', height:'60vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', filter:'blur(60px)', animation:'drift1 18s ease-in-out infinite alternate' }}/>
        <div style={{ position:'absolute', bottom:'-20%', right:'-10%', width:'55vw', height:'55vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 70%)', filter:'blur(80px)', animation:'drift2 22s ease-in-out infinite alternate' }}/>
        <div style={{ position:'absolute', top:'40%', left:'40%', width:'30vw', height:'30vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)', filter:'blur(40px)', animation:'drift1 14s ease-in-out infinite alternate-reverse' }}/>

        {/* Grid lines */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)', backgroundSize:'60px 60px' }}/>

        {/* Floating particles */}
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{ position:'absolute', width: 2 + (i%3), height: 2 + (i%3), borderRadius:'50%', background:`rgba(${i%2===0?'99,102,241':'168,85,247'},0.6)`, left:`${8 + i*7.5}%`, top:`${10 + (i*13)%80}%`, animation:`floatUp ${6 + i%5}s ease-in-out ${i*0.7}s infinite alternate` }}/>
        ))}
      </div>

      {/* ── MAIN CARD ── */}
      <div style={{ position:'relative', zIndex:10, width:'100%', maxWidth:440, padding:'0 24px' }}>

        {/* Top badge */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:100, padding:'6px 20px', fontSize:12, fontWeight:700, color:'#818cf8', textTransform:'uppercase', letterSpacing:2, marginBottom:20 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#818cf8', display:'inline-block', animation:'pulse 2s ease-in-out infinite' }}/>
            Founder Access Portal
          </div>

          {/* Crown logo */}
          <div style={{ width:72, height:72, borderRadius:22, background:'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))', border:'1px solid rgba(99,102,241,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', boxShadow:'0 0 40px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize:36 }}>👑</span>
          </div>

          <h1 style={{ fontSize:32, fontWeight:800, margin:'0 0 8px', letterSpacing:-1, background:'linear-gradient(135deg, #fff 30%, #818cf8 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            NexDesk Command
          </h1>
          <p style={{ fontSize:14, color:'#475569', margin:0 }}>
            Platform founder authentication
          </p>
        </div>

        {/* Card */}
        <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:28, padding:36, backdropFilter:'blur(20px)', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)' }}>

          {/* Error */}
          {error && (
            <div style={{ padding:'12px 16px', borderRadius:12, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.15)', color:'#fca5a5', fontSize:13, marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:16 }}>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleFounderLogin} style={{ display:'grid', gap:16 }}>

            {/* Email */}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1.5, marginBottom:8 }}>
                Founder Email
              </label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', fontSize:16 }}>✉️</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="founder@nexdesk.com"
                  autoComplete="username"
                  style={{ width:'100%', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'14px 16px 14px 46px', color:'#fff', fontSize:14, outline:'none', transition:'border-color 0.2s', boxSizing:'border-box' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1.5, marginBottom:8 }}>
                Master Key
              </label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', fontSize:16 }}>🔑</span>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  style={{ width:'100%', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'14px 46px 14px 46px', color:'#fff', fontSize:14, outline:'none', transition:'border-color 0.2s', boxSizing:'border-box' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:16, padding:0 }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{
                marginTop:8, width:'100%', padding:'16px', borderRadius:14,
                background: loading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none', color:'#fff', fontWeight:700, fontSize:15,
                cursor: loading ? 'wait' : 'pointer',
                boxShadow: loading ? 'none' : '0 10px 30px rgba(99,102,241,0.35)',
                transition:'all 0.3s',
                display:'flex', alignItems:'center', justifyContent:'center', gap:10
              }}>
              {loading 
                ? <><span style={{ display:'inline-block', width:18, height:18, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', animation:'spin 0.8s linear infinite' }}/> Authenticating{'.'.repeat(dots)}</>
                : <><span>⚡</span> Access Founder Console</>
              }
            </button>
          </form>

          {/* Divider */}
          <div style={{ display:'flex', alignItems:'center', gap:12, margin:'24px 0' }}>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.05)' }}/>
            <span style={{ fontSize:12, color:'#334155' }}>SECURED ACCESS</span>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.05)' }}/>
          </div>

          {/* Security indicators */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            {[
              { icon:'🔒', label:'AES-256' },
              { icon:'🛡️', label:'SOC2 Type II' },
              { icon:'✅', label:'GDPR Ready' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign:'center', padding:'10px 8px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.04)', borderRadius:12 }}>
                <div style={{ fontSize:16, marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontSize:10, color:'#334155', fontWeight:600, letterSpacing:0.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Back to main login */}
        <div style={{ textAlign:'center', marginTop:24 }}>
          <button onClick={() => router.push('/login')}
            style={{ background:'none', border:'none', color:'#334155', fontSize:13, cursor:'pointer', transition:'color 0.2s' }}
            onMouseEnter={e => e.target.style.color='#818cf8'}
            onMouseLeave={e => e.target.style.color='#334155'}
          >
            ← Regular Agent Login
          </button>
        </div>

        {/* Footer */}
        <div style={{ textAlign:'center', marginTop:32, fontSize:11, color:'#1e293b', letterSpacing:1 }}>
          NEXDESK PLATFORM v2.0 · FOUNDER EDITION
        </div>

      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000; }

        @keyframes drift1 {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(40px, -30px) scale(1.1); }
        }
        @keyframes drift2 {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(-50px, 40px) scale(1.15); }
        }
        @keyframes floatUp {
          from { transform: translateY(0px); opacity: 0.4; }
          to   { transform: translateY(-20px); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.8); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
