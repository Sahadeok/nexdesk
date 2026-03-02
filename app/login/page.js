'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode]         = useState('login')   // 'login' | 'forgot'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [googleLoad, setGoogleLoad] = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [mounted, setMounted]   = useState(false)

  useEffect(() => {
    setMounted(true)
    // If already logged in, redirect
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/dashboard')
    })
  }, [])

  // ── Login with Email + Password ────────────────────────────
  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true)
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) throw err
      router.replace('/dashboard')
    } catch (err) {
      setError(friendlyError(err.message))
    } finally {
      setLoading(false)
    }
  }

  // ── Login with Google ──────────────────────────────────────
  async function handleGoogle() {
    setError(''); setGoogleLoad(true)
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (err) throw err
    } catch (err) {
      setError(friendlyError(err.message))
      setGoogleLoad(false)
    }
  }

  // ── Forgot Password ────────────────────────────────────────
  async function handleForgot(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!email) { setError('Please enter your email address.'); return }
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })
      if (err) throw err
      setSuccess('Password reset email sent! Please check your inbox.')
    } catch (err) {
      setError(friendlyError(err.message))
    } finally {
      setLoading(false)
    }
  }

  function friendlyError(msg) {
    if (msg.includes('Invalid login')) return 'Incorrect email or password. Please try again.'
    if (msg.includes('Email not confirmed')) return 'Please verify your email first. Check your inbox.'
    if (msg.includes('rate limit')) return 'Too many attempts. Please wait a minute and try again.'
    if (msg.includes('network')) return 'Network error. Please check your internet connection.'
    return msg || 'Something went wrong. Please try again.'
  }

  if (!mounted) return null

  return (
    <>
      <style>{`
        .login-wrap {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: #0a0e1a;
        }

        /* ── LEFT PANEL ── */
        .left-panel {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #0a0e1a 0%, #0f1e35 50%, #091224 100%);
          display: flex; flex-direction: column;
          justify-content: center; align-items: flex-start;
          padding: 60px;
        }
        .left-panel::before {
          content: '';
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(59,130,246,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.07) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: gridMove 8s linear infinite;
        }
        .left-panel::after {
          content: '';
          position: absolute;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%);
          bottom: -100px; right: -100px;
        }
        .left-glow {
          position: absolute;
          width: 300px; height: 300px; border-radius: 50%;
          background: radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%);
          top: -50px; left: -50px;
        }

        .brand-wrap {
          position: relative; z-index: 2;
          animation: slideRight 0.6s ease both;
        }
        .brand-logo {
          display: flex; align-items: center; gap: 14px; margin-bottom: 48px;
        }
        .logo-icon {
          width: 52px; height: 52px; border-radius: 14px;
          background: linear-gradient(135deg, #3b82f6, #06b6d4);
          display: flex; align-items: center; justify-content: center;
          font-size: 24px;
          box-shadow: 0 0 40px rgba(59,130,246,0.4);
          animation: float 3s ease-in-out infinite;
        }
        .logo-name {
          font-family: 'Syne', sans-serif;
          font-size: 28px; font-weight: 800;
          letter-spacing: -0.5px;
        }
        .logo-name span { color: #06b6d4; }

        .brand-heading {
          font-family: 'Syne', sans-serif;
          font-size: 42px; font-weight: 800;
          line-height: 1.1;
          letter-spacing: -1px;
          margin-bottom: 20px;
          color: #e2e8f0;
        }
        .brand-heading em {
          font-style: normal;
          background: linear-gradient(90deg, #3b82f6, #06b6d4, #8b5cf6);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
        .brand-sub {
          font-size: 16px; color: #64748b; line-height: 1.7;
          max-width: 360px; margin-bottom: 48px;
        }

        .features {
          display: flex; flex-direction: column; gap: 16px;
        }
        .feat-item {
          display: flex; align-items: center; gap: 14px;
          animation: slideRight 0.6s ease both;
        }
        .feat-item:nth-child(2) { animation-delay: 0.1s; }
        .feat-item:nth-child(3) { animation-delay: 0.2s; }
        .feat-item:nth-child(4) { animation-delay: 0.3s; }
        .feat-icon {
          width: 38px; height: 38px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
          background: rgba(59,130,246,0.1);
          border: 1px solid rgba(59,130,246,0.2);
        }
        .feat-text { font-size: 14px; color: #94a3b8; }
        .feat-text strong { color: #e2e8f0; font-weight: 500; }

        .left-footer {
          position: absolute; bottom: 30px; left: 60px;
          font-size: 12px; color: #334155; z-index: 2;
        }

        /* ── RIGHT PANEL ── */
        .right-panel {
          display: flex; align-items: center; justify-content: center;
          padding: 40px 60px;
          background: #080c17;
          border-left: 1px solid #1f2d45;
        }
        .form-box {
          width: 100%; max-width: 400px;
          animation: fadeUp 0.5s ease both;
        }
        .form-title {
          font-family: 'Syne', sans-serif;
          font-size: 26px; font-weight: 700;
          margin-bottom: 6px;
          color: #e2e8f0;
        }
        .form-sub {
          font-size: 14px; color: #64748b;
          margin-bottom: 32px;
        }
        .form-sub a {
          color: #3b82f6; cursor: pointer; text-decoration: none;
        }
        .form-sub a:hover { text-decoration: underline; }

        /* Google Button */
        .google-btn {
          width: 100%; padding: 13px 16px;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          background: transparent;
          border: 1px solid #1f2d45;
          border-radius: 10px; cursor: pointer;
          color: #e2e8f0; font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 500;
          transition: all 0.2s;
          margin-bottom: 24px;
        }
        .google-btn:hover { background: #111827; border-color: #3b82f6; }
        .google-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .google-icon { width: 20px; height: 20px; flex-shrink: 0; }

        /* Divider */
        .divider {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 24px;
        }
        .divider::before, .divider::after {
          content: ''; flex: 1; height: 1px; background: #1f2d45;
        }
        .divider span { font-size: 12px; color: #475569; white-space: nowrap; }

        /* Form fields */
        .field { margin-bottom: 18px; }
        .field-label {
          display: block; font-size: 13px; font-weight: 500;
          color: #94a3b8; margin-bottom: 8px;
        }
        .field-wrap { position: relative; }
        .field-input {
          width: 100%; padding: 13px 16px;
          background: #111827;
          border: 1px solid #1f2d45;
          border-radius: 10px; outline: none;
          color: #e2e8f0; font-family: 'DM Sans', sans-serif;
          font-size: 14px; transition: all 0.2s;
        }
        .field-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
          background: #0f1929;
        }
        .field-input::placeholder { color: #334155; }
        .field-input.has-icon { padding-right: 46px; }
        .field-input.error-state { border-color: #ef4444; }

        .eye-btn {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: #475569; font-size: 18px; padding: 4px;
          transition: color 0.2s;
        }
        .eye-btn:hover { color: #94a3b8; }

        /* Forgot link */
        .forgot-link {
          display: block; text-align: right;
          font-size: 12px; color: #3b82f6;
          cursor: pointer; margin-top: 6px;
          text-decoration: none;
        }
        .forgot-link:hover { text-decoration: underline; }

        /* Submit button */
        .submit-btn {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          border: none; border-radius: 10px;
          color: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-top: 8px;
          box-shadow: 0 4px 20px rgba(59,130,246,0.25);
        }
        .submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(59,130,246,0.35);
        }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

        .spinner {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          animation: spin 0.7s linear infinite;
        }

        /* Error / Success */
        .alert {
          padding: 12px 14px; border-radius: 10px;
          font-size: 13px; margin-bottom: 18px;
          display: flex; align-items: flex-start; gap: 10px;
          animation: fadeUp 0.3s ease;
        }
        .alert.error {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          color: #fca5a5;
        }
        .alert.success {
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.3);
          color: #6ee7b7;
        }
        .alert-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }

        /* Back link */
        .back-link {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; color: #64748b; cursor: pointer;
          margin-bottom: 28px; text-decoration: none;
          transition: color 0.2s;
        }
        .back-link:hover { color: #3b82f6; }

        /* Secure badge */
        .secure-badge {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          margin-top: 28px; font-size: 12px; color: #334155;
        }

        /* Role badges */
        .role-hint {
          background: #0f172a; border: 1px solid #1e293b;
          border-radius: 10px; padding: 12px 14px;
          margin-bottom: 24px;
          font-size: 12px; color: #475569;
        }
        .role-hint strong { color: #64748b; display: block; margin-bottom: 8px; }
        .role-list {
          display: flex; flex-wrap: wrap; gap: 6px;
        }
        .role-tag {
          padding: 3px 8px; border-radius: 6px;
          font-size: 11px; font-weight: 500;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .login-wrap { grid-template-columns: 1fr; }
          .left-panel { display: none; }
          .right-panel { padding: 40px 24px; }
        }
      `}</style>

      <div className="login-wrap">

        {/* ── LEFT PANEL ──────────────────────────────── */}
        <div className="left-panel">
          <div className="left-glow" />

          <div className="brand-wrap">
            <div className="brand-logo">
              <div className="logo-icon">⚡</div>
              <div className="logo-name">Nex<span>Desk</span></div>
            </div>

            <h1 className="brand-heading">
              IT Support<br />
              <em>Reimagined</em><br />
              with AI
            </h1>

            <p className="brand-sub">
              Enterprise helpdesk with AI auto-resolution,
              real-time RCA, and intelligent ticket routing
              for teams of 500+.
            </p>

            <div className="features">
              {[
                ['🤖', 'AI Auto-Resolution', '68%+ tickets resolved without human touch'],
                ['⚡', 'Instant Diagnosis', 'API, Browser, OS issues identified in seconds'],
                ['📊', 'Smart RCA Reports', 'Root cause analysis generated automatically'],
                ['🔒', 'Enterprise Security', 'AES-256 encryption, GDPR & SEBI compliant'],
              ].map(([icon, title, desc]) => (
                <div key={title} className="feat-item">
                  <div className="feat-icon">{icon}</div>
                  <div className="feat-text">
                    <strong>{title}</strong><br />{desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="left-footer">
            © 2026 NexDesk · Enterprise Edition · v1.0.0
          </div>
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────── */}
        <div className="right-panel">
          <div className="form-box">

            {mode === 'forgot' ? (
              /* ── FORGOT PASSWORD ── */
              <>
                <span className="back-link" onClick={() => { setMode('login'); setError(''); setSuccess('') }}>
                  ← Back to Login
                </span>
                <h2 className="form-title">Reset Password</h2>
                <p className="form-sub">
                  Enter your email and we'll send you a reset link.
                </p>

                {error   && <div className="alert error"><span className="alert-icon">⚠️</span>{error}</div>}
                {success && <div className="alert success"><span className="alert-icon">✅</span>{success}</div>}

                {!success && (
                  <form onSubmit={handleForgot}>
                    <div className="field">
                      <label className="field-label">Work Email</label>
                      <input
                        type="email" className="field-input"
                        placeholder="you@company.com"
                        value={email} onChange={e => setEmail(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <button type="submit" className="submit-btn" disabled={loading}>
                      {loading ? <><div className="spinner" />Sending...</> : '📧 Send Reset Link'}
                    </button>
                  </form>
                )}
              </>
            ) : (
              /* ── LOGIN ── */
              <>
                <h2 className="form-title">Welcome back</h2>
                <p className="form-sub">
                  Sign in to your NexDesk account
                </p>

                {/* Role hint */}
                <div className="role-hint">
                  <strong>🎭 Login as any role:</strong>
                  <div className="role-list">
                    {[
                      ['Admin','#EF4444'],['IT Manager','#F97316'],
                      ['L1 Agent','#3B82F6'],['L2 Agent','#8B5CF6'],
                      ['Developer','#06B6D4'],['End User','#10B981'],
                    ].map(([role, color]) => (
                      <span key={role} className="role-tag"
                        style={{ background: color + '20', color, border: `1px solid ${color}40` }}>
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && <div className="alert error"><span className="alert-icon">⚠️</span>{error}</div>}

                {/* Google */}
                <button className="google-btn" onClick={handleGoogle} disabled={googleLoad}>
                  {googleLoad ? (
                    <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                  ) : (
                    <svg className="google-icon" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  {googleLoad ? 'Connecting...' : 'Continue with Google'}
                </button>

                <div className="divider"><span>or sign in with email</span></div>

                <form onSubmit={handleLogin}>
                  <div className="field">
                    <label className="field-label">Work Email</label>
                    <input
                      type="email"
                      className={`field-input ${error ? 'error-state' : ''}`}
                      placeholder="you@company.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      autoComplete="email"
                    />
                  </div>

                  <div className="field">
                    <label className="field-label">Password</label>
                    <div className="field-wrap">
                      <input
                        type={showPass ? 'text' : 'password'}
                        className={`field-input has-icon ${error ? 'error-state' : ''}`}
                        placeholder="Enter your password"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError('') }}
                        autoComplete="current-password"
                      />
                      <button
                        type="button" className="eye-btn"
                        onClick={() => setShowPass(p => !p)}
                        aria-label={showPass ? 'Hide password' : 'Show password'}
                      >
                        {showPass ? '🙈' : '👁️'}
                      </button>
                    </div>
                    <span className="forgot-link" onClick={() => { setMode('forgot'); setError('') }}>
                      Forgot password?
                    </span>
                  </div>

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading
                      ? <><div className="spinner" />Signing in...</>
                      : '→ Sign In to NexDesk'
                    }
                  </button>
                </form>

                <div className="secure-badge">
                  🔒 &nbsp;256-bit encrypted · SOC 2 compliant · GDPR ready
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
