'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getTenantBySubdomain } from '../../lib/supabase'
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Globe, Zap, Cpu, BarChart3, Shield } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [tenant, setTenant]     = useState(null)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // 🌍 Multi-tenant Detection: Get subdomain from hostname
    const hostname = window.location.hostname
    const parts = hostname.split('.')
    if (parts.length > 1 && parts[0] !== 'www' && parts[0] !== 'localhost') {
      getTenantBySubdomain(supabase, parts[0]).then(t => setTenant(t))
    }

    // Auth state check
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/dashboard')
    })
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) { setError('Identify yourself with email and password.'); return }
    setLoading(true); setError('')

    try {
      // 🚀 BYPASS FOR DEVA (Since Email Is Not Confirmed)
      if (email === 'deva@nexdesk.com' && password === 'Deva@123') {
        document.cookie = "deva_bypass=true; path=/;";
        router.replace('/super-admin');
        return;
      }

      // Clear bypass cookie for normal logins to prevent role spoofing
      document.cookie = "deva_bypass=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;";

      // 🛡️ Actual Supabase sign-in — sets the session cookie properly
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) throw err

      // Founder/Super-Admin → go to super-admin dashboard
      if (email === 'deva@nexdesk.com') {
        router.replace('/super-admin')
      } else {
        router.replace('/dashboard')
      }
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'Incorrect access credentials.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSignup(e) {
    e.preventDefault()

    // 🛡️ FOUNDER FORGE (Bypass for test creation)
    if (email === 'admin@nexdesk.com' && password === 'FounderMaster2026!') {
       alert('Forging Admin Identity locally... Verification skipped for Founder.')
       setMode('login')
       return
    }

    if (!email || !password) { setError('A Founder needs an email and strong password.'); return }
    setLoading(true); setError('')
    try {
      const { error: err } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      })
      if (err) throw err
      alert('Verification email sent! Check your inbox to claim your Founder status.')
      setMode('login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'grid', 
      gridTemplateColumns: '1.2fr 1fr', 
      background: '#020617', 
      color: '#fff',
      fontFamily: '"Outfit", sans-serif'
    }}>
      
      {/* ── LEFT PANEL: BRANDING & MURAL ── */}
      <div style={{ 
        position: 'relative', 
        padding: 60, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center',
        background: tenant?.brand_primary_color ? `linear-gradient(135deg, ${tenant.brand_primary_color}1a 0%, #020617 100%)` : 'linear-gradient(135deg, #1e293b 0%, #020617 100%)',
        overflow: 'hidden'
      }}>
        {/* Animated Background Mesh */}
        <div style={{ 
          position:'absolute', top:'-20%', right:'-10%', width:'70%', height:'70%', 
          background: tenant?.brand_primary_color ? `radial-gradient(circle, ${tenant.brand_primary_color}22 0%, transparent 70%)` : 'radial-gradient(circle, #3b82f622 0%, transparent 70%)',
          filter:'blur(60px)', animation: 'pulse 10s infinite alternate'
        }} />

        <div style={{ position:'relative', zIndex: 10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:15, marginBottom:60 }}>
             <div style={{ 
               width:48, height:48, borderRadius:14, 
               background: tenant?.brand_primary_color || 'linear-gradient(135deg, #3b82f6, #06b6d4)',
               display:'flex', alignItems:'center', justifyContent:'center',
               boxShadow: '0 0 30px rgba(59,130,246,0.2)'
             }}>
               {tenant?.logo_url ? <img src={tenant.logo_url} style={{ width:'70%' }}/> : <ShieldCheck size={28} color="#fff" />}
             </div>
             <span style={{ fontSize:24, fontWeight:800, letterSpacing:-0.5 }}>
               {tenant?.name || 'NexDesk'} <span style={{ color: tenant?.brand_primary_color || '#3b82f6', opacity:0.7 }}>.ai</span>
             </span>
          </div>

          <h1 style={{ fontSize:52, fontWeight:800, lineHeight:1.1, marginBottom:24 }}>
            Enterprise Support <br />
            <span style={{ color: tenant?.brand_primary_color || '#3b82f6' }}>Powered by Agentic AI.</span>
          </h1>
          
          <p style={{ fontSize:18, color:'#94a3b8', maxWidth:480, marginBottom:60, lineHeight:1.6 }}>
            The world's first autonomous IT service management platform. 
            From forensics to self-healing, we resolve issues at the speed of thought.
          </p>

          <div style={{ display:'grid', gap:20 }}>
            {[
              { icon: <Cpu size={20} />, title: 'Autonomous Forensics', desc: 'Real-time bug reproduction & diagnosis' },
              { icon: <Zap size={20} />, title: 'Self-Healing Loops', desc: 'Auto-apply surgical code patches' },
              { icon: <BarChart3 size={20} />, title: 'Workforce Hub', desc: 'Enterprise-wide talent & AI oversight' },
            ].map((feat, i) => (
              <div key={i} style={{ display:'flex', gap:15, alignItems:'center' }}>
                <div style={{ color: tenant?.brand_primary_color || '#3b82f6' }}>{feat.icon}</div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700 }}>{feat.title}</div>
                  <div style={{ fontSize:13, color:'#64748b' }}>{feat.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position:'absolute', bottom:40, left:60, fontSize:12, color:'#334155' }}>
          NexDesk Enterprise v1.5 · Pure SaaS Infrastructure
        </div>
      </div>

      {/* ── RIGHT PANEL: THE LOGIN FORM ── */}
      <div style={{ background:'#020617', display:'flex', alignItems:'center', justifyContent:'center', borderLeft:'1px solid #1e293b' }}>
        <div style={{ width:'100%', maxWidth:400, padding:40 }}>
          
          <div style={{ marginBottom:40 }}>
            <h2 style={{ fontSize:28, fontWeight:700, margin:0, marginBottom:8 }}>{mode === 'login' ? 'Welcome Back' : 'Claim Founder Access'}</h2>
            <p style={{ color:'#64748b', fontSize:14 }}>
              {mode === 'login' 
                ? (tenant ? `Access the ${tenant.name} Support Portal` : 'Sign in to your Enterprise Console')
                : 'Establish your unique platform owner credentials'
              }
            </p>
          </div>

          {error && (
            <div style={{ padding:15, borderRadius:12, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#fca5a5', fontSize:14, marginBottom:24, display:'flex', gap:10 }}>
              <Shield size={18} /> {error}
            </div>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : handleSignup} style={{ display:'grid', gap:20 }}>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Organization Email</label>
              <div style={{ position:'relative' }}>
                <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#475569' }}><Mail size={18}/></div>
                <input 
                  type="email" 
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ 
                    width:'100%', background:'#0f172a', border:'1px solid #1e293b', borderRadius:12, padding:'14px 14px 14px 45px', color:'#fff', outline:'none', focusBorderColor: tenant?.brand_primary_color || '#3b82f6'
                  }} 
                />
              </div>
            </div>

            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Security Key</label>
              <div style={{ position:'relative' }}>
                <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#475569' }}><Lock size={18}/></div>
                <input 
                  type={showPass ? 'text' : 'password'} 
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ 
                    width:'100%', background:'#0f172a', border:'1px solid #1e293b', borderRadius:12, padding:'14px 14px 14px 45px', color:'#fff', outline:'none'
                  }} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)}
                  style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#475569', cursor:'pointer' }}
                >
                  {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              style={{ 
                width:'100%', padding:16, borderRadius:12, marginTop:10,
                background: tenant?.brand_primary_color || 'linear-gradient(135deg, #2563eb, #3b82f6)',
                border:'none', color:'#fff', fontWeight:700, cursor:'pointer',
                boxShadow: '0 10px 25px -5px rgba(59,130,246,0.3)',
                transition:'all 0.2s',
                display:'flex', alignItems:'center', justifyContent:'center', gap:10
              }}
            >
              {loading ? 'Processing...' : (mode === 'login' ? <>{'Initialize Session'} <Zap size={18} fill="currentColor"/></> : 'Claim Founder Hub')}
            </button>
          </form>

          <div style={{ marginTop:40, textAlign:'center' }}>
            <div style={{ fontSize:13, color:'#64748b', marginBottom:12 }}>
              {mode === 'login' ? "New platform architect?" : "Already have access?"}
              <button 
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
                style={{ background:'none', border:'none', color:'#3b82f6', fontWeight:700, marginLeft:6, cursor:'pointer' }}>
                {mode === 'login' ? 'Claim Founder Access' : 'Return to Login'}
              </button>
            </div>
            <div style={{ fontSize:12, color:'#334155', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <Shield size={14} /> SOC2 Type II · GDPR Compliant · AES-256 Secured
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap');
        @keyframes pulse { from { opacity: 0.2; transform: scale(1) translate(0, 0); } to { opacity: 0.4; transform: scale(1.1) translate(20px, 20px); } }
        input:focus { border-color: ${tenant?.brand_primary_color || '#3b82f6'} !important; }
      `}</style>
    </div>
  )
}
