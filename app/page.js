'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ParticleNetwork from './components/ParticleNetwork'
import FeaturesScroll from './components/FeaturesScroll'

export default function LandingPage() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)

  // Subtle navbar shadow on scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div style={{ position: 'relative', background: '#fcfbf8', color: '#111827', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>
      <ParticleNetwork />
      
      {/* ── HIGH-END LUXURY ANIMATIONS ── */}
      <style>{`
        * { box-sizing: border-box; }
        ::selection { background: #2563eb; color: #fff; }

        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }

        @keyframes drawLine {
          from { stroke-dashoffset: 200; }
          to { stroke-dashoffset: 0; }
        }

        .fade-up-1 { animation: fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards; opacity: 0; }
        .fade-up-2 { animation: fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; opacity: 0; }
        .fade-up-3 { animation: fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards; opacity: 0; }
        
        .nav-link { color: #4b5563; font-weight: 500; font-size: 15px; text-decoration: none; transition: color 0.2s; cursor: pointer; }
        .nav-link:hover { color: #111827; }
        
        .btn-primary { background: #2563eb; color: #fff; padding: 12px 28px; border-radius: 40px; font-weight: 600; font-size: 15px; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(37,99,235,0.25); text-decoration: none; }
        .btn-primary:hover { background: #1d4ed8; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37,99,235,0.35); }
        
        .btn-outline { background: transparent; color: #111827; padding: 12px 28px; border-radius: 40px; font-weight: 600; font-size: 15px; border: 2px solid #e5e7eb; cursor: pointer; transition: all 0.2s; }
        .btn-outline:hover { border-color: #d1d5db; background: rgba(0,0,0,0.03); }

        .glass-widget { 
          background: rgba(17, 24, 39, 0.95); 
          border-radius: 20px; 
          border: 1px solid rgba(255,255,255,0.1); 
          box-shadow: 0 20px 40px rgba(0,0,0,0.15); 
          backdrop-filter: blur(10px);
          animation: float 6s ease-in-out infinite;
        }

        .blob-bg {
          position: absolute; width: 600px; height: 600px; border-radius: 50%;
          background: radial-gradient(circle, rgba(37,99,235,0.1) 0%, rgba(255,255,255,0) 70%);
          animation: blob 10s infinite alternate; z-index: 0;
        }
      `}</style>

      {/* ── NAVIGATION AREA ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, padding: scrolled ? '16px 40px' : '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100, transition: 'all 0.3s ease', background: scrolled ? 'rgba(252, 251, 248, 0.9)' : 'transparent', backdropFilter: scrolled ? 'blur(10px)' : 'none', borderBottom: scrolled ? '1px solid rgba(0,0,0,0.05)' : '1px solid transparent' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
          <div style={{ background: '#2563eb', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>N</div>
          <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.8px', color: '#111827' }}>NexDesk</span>
        </div>

        <div style={{ display: 'none' }} className="nav-links-desktop">
          {/* We will hide this on mobile if needed, but for now inline block */}
        </div>
        <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
          <a href="#home" className="nav-link">Home</a>
          <a href="#vision" className="nav-link">Vision</a>
          <a href="#features-demo" className="nav-link">Features</a>
          <a href="#about" className="nav-link">Founder</a>
          <a href="#pricing" className="nav-link">Pricing</a>
          <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />
          <a className="nav-link" onClick={() => router.push('/dashboard/tenant-setup')} style={{ color: '#2563eb', fontWeight: 600 }}>Create Tenant Portals</a>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-outline" onClick={() => router.push('/login')} style={{ padding:'10px 20px', fontSize:14 }}>Founder Login</button>
            <button className="btn-primary" onClick={() => router.push('/login')} style={{ padding:'10px 20px', fontSize:14 }}>Agent Login</button>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <header id="home" style={{ position: 'relative', paddingTop: 180, paddingBottom: 120, paddingLeft: '8%', paddingRight: '8%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 60 }}>
        
        {/* Background Decorative Element */}
        <div className="blob-bg" style={{ top: -100, right: -100 }} />
        
        {/* LEFT TEXT CONTENT */}
        <div style={{ flex: 1, position: 'relative', zIndex: 1, maxWidth: 640 }}>
          <div className="fade-up-1" style={{ display: 'inline-block', padding: '6px 14px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', fontWeight: 700, fontSize: 13, borderRadius: 20, letterSpacing: '0.5px', marginBottom: 24, textTransform: 'uppercase' }}>
            Introducing Gen-3 Auto-Heal
          </div>
          
          <h1 className="fade-up-1" style={{ fontSize: 62, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-2px', color: '#111827', marginBottom: 24 }}>
            THE <span style={{ color:'#2563eb' }}>AUTONOMOUS</span> IT<br/>SUPPORT ENGINE.
          </h1>
          
          <p className="fade-up-2" style={{ fontSize: 18, color: '#4b5563', lineHeight: 1.6, marginBottom: 40, maxWidth: 540 }}>
            NexDesk injects a digital brain into your entire tech stack. We don't just log tickets—our AI predicts outages, isolates the broken code, and deploys the fix automatically.
          </p>
          
          <div className="fade-up-3" style={{ display: 'flex', gap: 16 }}>
            <button className="btn-primary" onClick={() => router.push('/dashboard/tenant-setup')} style={{ padding: '16px 36px', fontSize: 16 }}>Deploy Magic Script</button>
            <button className="btn-outline" onClick={() => document.getElementById('features-demo').scrollIntoView({behavior:'smooth'})} style={{ padding: '16px 36px', fontSize: 16 }}>Watch How It Works</button>
          </div>
          
          <div className="fade-up-3" style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 12, color: '#6b7280', fontSize: 13, fontWeight: 500 }}>
            <div style={{ display:'flex' }}>
              {[1,2,3,4,5].map(i => <div key={i} style={{ color:'#fbbf24', fontSize:16, letterSpacing:-2 }}>★</div>)}
            </div>
            Trusted by World-Class BFSI & Health Industries
          </div>
        </div>

        {/* RIGHT VISUAL ELEMENT - PREMIUM GLASS WIDGET */}
        <div className="fade-up-2" style={{ flex: 1, position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'flex-end', paddingRight: '2%' }}>
          
          {/* Main Widget Card */}
          <div className="glass-widget" style={{ width: 440, padding: 32, position: 'relative' }}>
            
            {/* Widget Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
              <div>
                <div style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>System Optimization</div>
                <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>Live AI Autonomous Resolution</div>
              </div>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80' }} />
            </div>

            {/* Simulated Live Code Fix Terminal */}
            <div style={{ background: '#0a0e1a', borderRadius: 12, padding: 16, border: '1px solid #1f2937', marginBottom: 24, fontSize: 12, fontFamily: 'monospace', color: '#a5b4fc', position: 'relative', overflow: 'hidden' }}>
              <div style={{ opacity: 0.5, marginBottom: 8 }}>// Detect: NullPointerException in checkout.ts</div>
              <div style={{ color: '#fca5a5', marginBottom: 4 }}>- const cart = await db.get(req.userId);</div>
              <div style={{ color: '#4ade80', marginBottom: 8 }}>+ const cart = await db.get(req.userId) || [];</div>
              <div>&gt; Generating pull request... <span style={{ color: '#4ade80' }}>✓ Merged</span></div>
            </div>

            {/* Data Spline Simulated Graph */}
            <div style={{ position: 'relative', height: 120, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 10 }}>
              {/* Fake SVG line chart */}
              <svg width="100%" height="80" style={{ position: 'absolute', bottom: 10, left: 0, overflow: 'visible' }}>
                <path d="M 0 60 C 40 60, 60 20, 100 30 C 140 40, 160 10, 200 20 C 240 30, 260 50, 300 10 C 340 -30, 360 40, 440 20" 
                      fill="none" stroke="#2563eb" strokeWidth="4" 
                      style={{ strokeDasharray: 600, animation: 'drawLine 3s ease-out forwards' }}/>
                {/* Floating dot */}
                <circle cx="200" cy="20" r="6" fill="#fff" style={{ boxShadow:'0 0 10px #fff' }} />
              </svg>
              
              {/* X axis labels */}
              {['9 AM','10 AM','11 AM','12 PM','1 PM'].map(time => (
                <div key={time} style={{ fontSize: 10, color: '#6b7280', zIndex: 1 }}>{time}</div>
              ))}
            </div>

            {/* Alert Pop */}
            <div style={{ position: 'absolute', bottom: -20, left: -40, background: '#fff', padding: '12px 20px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', animation: 'float 5s ease-in-out infinite reverse' }}>
              <div style={{ background: '#fef2f2', color: '#ef4444', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>!</div>
              <div>
                <div style={{ color: '#111827', fontSize: 13, fontWeight: 700 }}>142 Bugs Prevented</div>
                <div style={{ color: '#6b7280', fontSize: 11 }}>Saved $12,400 today</div>
              </div>
            </div>
            
          </div>
        </div>
      </header>

      {/* ── FEATURES STORYTELLING ── */}
      <FeaturesScroll />

      {/* ── VISION & ABOUT LOGOS ── */}
      <section id="vision" style={{ padding: '60px 8%', background: '#fff', borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 30 }}>Our Vision: A World Without IT Downtime</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 30, maxWidth: 1000, margin: '0 auto' }}>
          {[
            { t: 'Zero-Touch Setup', d: 'Paste one <body> script and we map your entire Twin structure.' },
            { t: '100% Autonomous', d: 'Our AI agents write the SRs, the CRs, and the exact code fixes.' },
            { t: 'RBI/HIPAA Compliant', d: 'Built precisely for high-security BFSI and Healthcare environments.' },
            { t: 'ROI Analytics', d: 'Watch exactly how much revenue was saved by preemptive error stopping.' }
          ].map(f => (
            <div key={f.t} style={{ padding: 12 }}>
              <h4 style={{ color: '#111827', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.t}</h4>
              <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING SECTION ── */}
      <section id="pricing" style={{ padding: '100px 8%', background: '#fcfbf8' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: '#111827', letterSpacing: '-1px', marginBottom: 16 }}>Simple, Scaling Pricing.</h2>
          <p style={{ fontSize: 16, color: '#6b7280', maxWidth: 600, margin: '0 auto' }}>Pay a fraction of what legacy humans cost. Get 24/7 autonomous monitoring and infinite concurrent incident resolution.</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 30, maxWidth: 1000, margin: '0 auto', flexWrap: 'wrap' }}>
          {/* Growth Plan */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 24, padding: 40, width: 320, transition: 'all 0.3s', cursor: 'pointer' }}
            onMouseOver={e=>{e.currentTarget.style.boxShadow='0 20px 40px rgba(0,0,0,0.05)'; e.currentTarget.style.transform='translateY(-5px)'}}
            onMouseOut={e=>{e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'}}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Multi-Tenant SaaS</h3>
            <div style={{ marginTop: 16, marginBottom: 24 }}>
              <span style={{ fontSize: 44, fontWeight: 800, color: '#111827' }}>$499</span>
              <span style={{ color: '#6b7280', fontSize: 15, fontWeight: 500 }}>/mo</span>
            </div>
            <p style={{ color: '#4b5563', fontSize: 14, lineHeight: 1.5, marginBottom: 30 }}>Perfect for startups and E-commerce platforms. Handled securely on NexDesk Cloud.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
              {['Unlimited Monitoring', '1 AI Agent', 'Auto SR/CR Gen', 'Standard SLAs'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#374151' }}>
                  <div style={{ color: '#2563eb', fontWeight: 'bold' }}>✓</div> {item}
                </div>
              ))}
            </div>
            <button className="btn-outline" style={{ width: '100%' }} onClick={() => router.push('/dashboard/tenant-setup')}>Start 14-Day Trial</button>
          </div>

          {/* Enterprise Plan */}
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 24, padding: 40, width: 340, position: 'relative', transform: 'scale(1.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#2563eb', color: '#fff', padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Most Popular</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Air-Gapped On-Premise</h3>
            <div style={{ marginTop: 16, marginBottom: 24 }}>
              <span style={{ fontSize: 44, fontWeight: 800, color: '#fff' }}>Custom</span>
            </div>
            <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.5, marginBottom: 30 }}>Deployed securely within your own firewall using open-source AI models.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
              {['No External API Calls', 'Infinite AI Agents', 'Compliance Engines (RBI)', 'Digital Twin Builder'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#f3f4f6' }}>
                  <div style={{ color: '#4ade80', fontWeight: 'bold' }}>✓</div> {item}
                </div>
              ))}
            </div>
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => router.push('/dashboard/tenant-setup')}>Generate Deployment Script</button>
          </div>
        </div>
      </section>

      {/* ── ABOUT THE FOUNDER ── */}
      <section id="about" style={{ padding: '100px 8%', background: '#111827', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative background circle */}
        <div style={{ position: 'absolute', width: 400, height: 400, background: '#2563eb', borderRadius: '50%', filter: 'blur(150px)', opacity: 0.2, top: '50%', left: -100, transform: 'translateY(-50%)' }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 60, maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          
          {/* Founder Image Column */}
          <div style={{ flex: '1 1 400px', maxWidth: 450, position: 'relative' }}>
            <div style={{ position: 'relative', borderRadius: 24, padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {/* NOTE: The user will need to place their image exactly at /public/founder.jpg (must be .jpg) */}
              <img src="/sandy.png" alt="Sahadeo Khandekar - Founder" style={{ width: '100%', height: 'auto', maxHeight: '600px', borderRadius: 16, display: 'block', objectFit: 'cover', objectPosition: 'center' }} />
              
              {/* Floating Badge */}
              <div style={{ position: 'absolute', bottom: -20, right: -20, background: '#2563eb', color: '#fff', padding: '16px 24px', borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.3)', border: '1px solid #3b82f6', letterSpacing: '0.5px' }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600, opacity: 0.8, marginBottom: 4 }}>Founder & Architect</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>Sahadeo Khandekar</div>
              </div>
            </div>
          </div>

          {/* Text Content Column */}
          <div style={{ flex: '1 1 500px' }}>
            <div style={{ display: 'inline-block', padding: '6px 14px', background: 'rgba(255,255,255,0.1)', color: '#e5e7eb', fontWeight: 700, fontSize: 13, borderRadius: 20, letterSpacing: '0.5px', marginBottom: 24, textTransform: 'uppercase' }}>
              The Story Behind NexDesk
            </div>
            
            <h2 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 30 }}>
              "I built NexDesk to <span style={{ color: '#60a5fa' }}>eliminate the chaos</span> of endless IT tickets."
            </h2>
            
            <p style={{ fontSize: 17, color: '#9ca3af', lineHeight: 1.7, marginBottom: 24 }}>
              For over a decade, traditional IT support solutions have primarily functioned as incident logbooks. They are designed to merely track symptoms, ultimately forcing human engineers to do the exhausting manual labor of investigating logs, tracing failures, and writing the actual code fixes.
            </p>
            <p style={{ fontSize: 17, color: '#9ca3af', lineHeight: 1.7, marginBottom: 32 }}>
              I envisioned a fundamentally different paradigm—an intelligence platform that doesn't just record your problems, but natively <strong>solves them autonomously</strong>. From instantly deploying Zero-Touch Digital Twins to running AI-driven code resolution, NexDesk is engineered to act as your complete, self-healing enterprise workforce.
            </p>
            
            {/* Signature */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 40, height: 2, background: '#60a5fa' }} />
              <span style={{ fontSize: 24, fontFamily: "serif", color: '#e5e7eb', fontStyle: 'italic', fontWeight: 'bold' }}>Sahadeo Khandekar</span>
            </div>
          </div>

        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#111827', padding: '60px 8%', color: '#9ca3af', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ background: '#2563eb', width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 }}>N</div>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>NexDesk Global</span>
          </div>
          <div style={{ fontSize: 13 }}>© 2026 NexDesk Intelligence Platform. All rights reserved.</div>
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 14 }}>
          <a href="#" style={{ color: '#9ca3af', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="#" style={{ color: '#9ca3af', textDecoration: 'none' }}>Terms of Service</a>
          <a onClick={() => router.push('/login')} style={{ color: '#2563eb', textDecoration: 'none', cursor: 'pointer', fontWeight: 600 }}>Employee Portal</a>
        </div>
      </footer>
      
    </div>
  )
}

