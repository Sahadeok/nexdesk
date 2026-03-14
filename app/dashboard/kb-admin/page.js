'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import GlobalNav from '../../components/GlobalNav'

const CATEGORIES = [
  { key:'account',        icon:'👤', label:'Account & Access' },
  { key:'network',        icon:'🌐', label:'Network & VPN' },
  { key:'email',          icon:'📧', label:'Email & Office' },
  { key:'hardware',       icon:'💻', label:'Hardware' },
  { key:'software',       icon:'💾', label:'Software' },
  { key:'security',       icon:'🔒', label:'Security' },
  { key:'infrastructure', icon:'🖥️', label:'Infrastructure' },
  { key:'howto',          icon:'📋', label:'How-To Guides' },
]

const DEFAULT_ARTICLES = [
  {
    title: 'How to Reset Your Password',
    category: 'account',
    summary: 'Step-by-step guide to reset your NexDesk or Windows login password.',
    tags: 'password,login,reset,account',
    is_featured: true,
    author_name: 'IT Support Team',
    content: `## Overview
Forgotten passwords are one of the most common IT issues. Follow this guide to reset your password quickly.

## Steps to Reset Windows Password
1. Press **Ctrl + Alt + Delete** on your keyboard
2. Click **Change a password**
3. Enter your old password, then new password twice
4. Press the arrow button or Enter

## Steps to Reset via IT Portal
1. Go to the self-service portal at **portal.company.com**
2. Click **Forgot Password**
3. Enter your registered email address
4. Check your email for the reset link (valid for 15 minutes)
5. Click the link and set a new password

## Password Requirements
- Minimum **8 characters**
- At least **1 uppercase** letter
- At least **1 number**
- At least **1 special character** (e.g. @, #, !)
- Cannot reuse last **5 passwords**

## Still Can't Login?
If you're still unable to login after resetting, raise a support ticket and an L1 agent will assist you within 2 hours.

> **Tip:** Use a password manager like Bitwarden or LastPass to remember complex passwords securely.`,
  },
  {
    title: 'VPN Setup and Troubleshooting Guide',
    category: 'network',
    summary: 'How to install, configure and fix common VPN connection issues.',
    tags: 'vpn,network,remote,cisco,anyconnect',
    is_featured: true,
    author_name: 'Network Team',
    content: `## Overview
The company uses **Cisco AnyConnect** for VPN access. This guide covers setup and common issues.

## Initial Setup
1. Download Cisco AnyConnect from the **IT Software Portal**
2. Install with default settings (admin rights required)
3. Open AnyConnect and enter server address: \`vpn.company.com\`
4. Login with your **company email and password**
5. Accept the security certificate when prompted

## Common Issues and Fixes

### Cannot Connect
- Check your internet connection first
- Ensure you're not already on the company network
- Try disconnecting and reconnecting
- Restart the AnyConnect service: Services -> Cisco AnyConnect -> Restart

### Authentication Failed
- Verify your username (use full email, not just name)
- Check Caps Lock is not on
- Try resetting your password

### VPN Connected but Cannot Access Resources
- Disconnect VPN and reconnect
- Clear DNS cache: open CMD and run ipconfig /flushdns
- Check if specific resource is down (not VPN issue)

### Slow VPN Connection
- Test your internet speed without VPN
- Connect to the nearest server location
- Close unused applications consuming bandwidth

## Supported Platforms
- Windows 10/11 ✅
- macOS 12+ ✅
- iOS / Android ✅ (via AnyConnect mobile app)

> **Note:** VPN is required for all remote access to company systems.`,
  },
  {
    title: 'Email Configuration in Outlook',
    category: 'email',
    summary: 'Setup Microsoft Outlook with company email on Windows and Mac.',
    tags: 'email,outlook,office365,smtp,imap',
    is_featured: false,
    author_name: 'IT Support Team',
    content: `## Overview
This guide helps you configure Microsoft Outlook with your company Office 365 email account.

## Auto Setup (Recommended)
1. Open **Microsoft Outlook**
2. Click **File -> Add Account**
3. Enter your company email address
4. Click **Connect**
5. Outlook will auto-detect Office 365 settings
6. Enter your password when prompted
7. Complete MFA if enabled

## Manual Setup (If auto fails)
Use these settings:

**Incoming Mail (IMAP)**
- Server: \`outlook.office365.com\`
- Port: \`993\`
- Encryption: \`SSL/TLS\`

**Outgoing Mail (SMTP)**
- Server: \`smtp.office365.com\`
- Port: \`587\`
- Encryption: \`STARTTLS\`

## Setup on Mobile
1. Download **Microsoft Outlook** from App Store / Play Store
2. Open app -> Add Account -> Add Email Account
3. Enter your company email -> Continue
4. Enter password -> Sign In
5. Allow required permissions

## Common Issues
- **Cannot send email:** Check SMTP port is 587 not 465
- **Password keeps asking:** Enable "Remember password" or check MFA settings
- **Emails not syncing:** Check internet and re-sync the account

> **Tip:** Enable Focused Inbox to keep important emails separate from notifications.`,
  },
  {
    title: 'Laptop Not Starting — Troubleshooting Guide',
    category: 'hardware',
    summary: 'Quick fixes for laptop not powering on, black screen, or boot failures.',
    tags: 'laptop,hardware,boot,power,black screen',
    is_featured: false,
    author_name: 'Hardware Support Team',
    content: `## Overview
Before raising a ticket, try these quick fixes. Most boot issues can be resolved in a few minutes.

## Step 1 — Check Power
- Ensure the **power adapter is plugged in** correctly
- Check the charging light — if not lit, try a different power outlet
- Remove the battery (if removable), wait 30 seconds, reinsert

## Step 2 — Force Restart
1. Hold the **power button for 10 seconds** until it shuts off
2. Wait 10 seconds
3. Press power button once to start

## Step 3 — Check External Devices
- Disconnect all USB drives, external monitors, docking stations
- Sometimes a USB device causes boot failure
- Try starting without any peripherals connected

## Step 4 — Check Display
If laptop starts (you hear fans/sounds) but screen is black:
- Press **Fn + F7** or **Fn + F8** (varies by laptop) to toggle display
- Connect to external monitor to test if it's a screen issue
- Adjust brightness using Fn + brightness keys

## Step 5 — Boot into Safe Mode
1. Hold power button to force off
2. Turn on and immediately press **F8** repeatedly
3. Select **Safe Mode** from boot menu
4. If Windows loads in safe mode, it's a software/driver issue

## When to Escalate
Raise a ticket immediately if:
- Laptop makes **beeping sounds** on startup (hardware fault)
- You see a **BIOS error** or memory error
- The screen has **physical damage** or cracking
- Steps above don't resolve the issue after 2 attempts`,
  },
  {
    title: 'How to Request Software Installation',
    category: 'software',
    summary: 'Process to request, approve and install software on company devices.',
    tags: 'software,install,request,license,approval',
    is_featured: false,
    author_name: 'IT Support Team',
    content: `## Overview
All software installations on company devices must go through the **IT approval process** to ensure security and licensing compliance.

## Approved Software List
The following software is pre-approved and can be installed directly:
- Microsoft Office 365 ✅
- Google Chrome / Firefox ✅
- 7-Zip / WinRAR ✅
- Adobe Acrobat Reader ✅
- Cisco AnyConnect VPN ✅
- Zoom / Microsoft Teams ✅

## How to Request New Software
1. Raise a ticket in NexDesk with:
   - Software name and version
   - Business justification
   - Number of licenses needed
   - Official download link
2. Your manager will be asked for approval
3. IT team verifies licensing and security
4. Installation scheduled within **2 business days** after approval

## Self-Installation of Approved Software
1. Open **Company Software Portal** (intranet link)
2. Browse approved software catalog
3. Click **Install** — software deploys automatically
4. Restart if prompted

## Important Rules
- **Never install** unlicensed or pirated software
- **Never install** software from unknown sources
- Personal software on company devices requires IT approval
- Violations may result in disciplinary action

> **Note:** Some software requires admin rights. Raise a ticket and IT will assist with installation.`,
  },
  {
    title: 'Multi-Factor Authentication (MFA) Setup',
    category: 'security',
    summary: 'Enable and configure MFA on your company account for better security.',
    tags: 'mfa,2fa,security,authenticator,microsoft',
    is_featured: true,
    author_name: 'Security Team',
    content: `## Why MFA is Required
Multi-Factor Authentication adds an extra layer of security. Even if your password is stolen, attackers cannot access your account without the second factor.

## Setup Microsoft Authenticator (Recommended)
1. Download **Microsoft Authenticator** on your phone (iOS/Android)
2. Go to **myaccount.microsoft.com**
3. Click **Security Info -> Add Method**
4. Select **Authenticator App**
5. Open the app -> **+** -> **Work or school account**
6. Scan the QR code shown on screen
7. Enter the 6-digit code to verify

## Alternative: SMS Authentication
1. Go to **Security Info -> Add Method**
2. Select **Phone**
3. Enter your mobile number
4. Enter the verification code sent via SMS

## Using MFA to Login
1. Enter your email and password as usual
2. You'll be prompted for the second factor
3. Open Authenticator app and enter the **6-digit code**
4. Code refreshes every 30 seconds — enter it quickly

## Lost Your Phone / New Phone?
- Contact IT immediately via support ticket marked **CRITICAL**
- Do not attempt to bypass MFA yourself
- IT will temporarily disable MFA and help you re-enroll

## Common Issues
- **Code not working:** Ensure your phone time is correct (auto time recommended)
- **Not receiving SMS:** Check mobile signal and network
- **App deleted:** Raise ticket — IT will reset and re-enroll

> **Security Tip:** Never share your MFA codes with anyone, including IT staff.`,
  },
]

export default function KBAdmin() {
  const router   = useRouter()
  const supabase = createClient()

  const [articles, setArticles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')
  const [search,   setSearch]   = useState('')
  const [view,     setView]     = useState('list') // 'list' | 'editor'
  const [editArt,  setEditArt]  = useState(null)
  const [confirm,  setConfirm]  = useState(null)
  const [preview,  setPreview]  = useState(false)

  const blankForm = { title:'', category:'howto', summary:'', content:'', tags:'', author_name:'IT Support Team', is_featured:false, is_published:true }
  const [form, setForm] = useState(blankForm)

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    if (!['ADMIN','IT_MANAGER'].includes(p?.role)) { router.replace('/dashboard'); return }
    if (p?.full_name) setForm(f => ({...f, author_name: p.full_name}))
    await loadArticles()
    setLoading(false)
  }

  async function loadArticles() {
    const { data } = await supabase
      .from('kb_articles')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setArticles(data)
  }

  async function seedDefaults() {
    setSaving(true)
    for (const a of DEFAULT_ARTICLES) {
      await supabase.from('kb_articles').upsert({
        ...a, is_published: true, views: 0, helpful_yes: 0, helpful_no: 0,
      }, { onConflict: 'title' })
    }
    await loadArticles()
    setMsg('✅ 6 default articles loaded!')
    setTimeout(() => setMsg(''), 3000)
    setSaving(false)
  }

  function openNew() {
    setForm(blankForm); setEditArt(null); setPreview(false); setView('editor'); setMsg('')
  }

  function openEdit(a) {
    setForm({ title:a.title, category:a.category, summary:a.summary||'', content:a.content||'', tags:a.tags||'', author_name:a.author_name||'', is_featured:a.is_featured||false, is_published:a.is_published!==false })
    setEditArt(a); setPreview(false); setView('editor'); setMsg('')
  }

  async function saveArticle() {
    if (!form.title.trim() || !form.content.trim()) { setMsg('❌ Title and content are required'); return }
    setSaving(true); setMsg('')
    try {
      const payload = {
        title:        form.title.trim(),
        category:     form.category,
        summary:      form.summary.trim(),
        content:      form.content,
        tags:         form.tags.trim(),
        author_name:  form.author_name.trim(),
        is_featured:  form.is_featured,
        is_published: form.is_published,
        updated_at:   new Date().toISOString(),
      }
      if (editArt) {
        await supabase.from('kb_articles').update(payload).eq('id', editArt.id)
        setMsg('✅ Article updated!')
      } else {
        await supabase.from('kb_articles').insert({ ...payload, views:0, helpful_yes:0, helpful_no:0 })
        setMsg('✅ Article published!')
      }
      await loadArticles()
      setView('list')
    } catch(e) { setMsg('❌ ' + e.message) }
    setSaving(false)
  }

  async function deleteArticle() {
    await supabase.from('kb_articles').delete().eq('id', confirm.id)
    setArticles(prev => prev.filter(a => a.id !== confirm.id))
    setConfirm(null)
    setMsg('✅ Article deleted!')
    setTimeout(() => setMsg(''), 3000)
  }

  async function togglePublish(a) {
    await supabase.from('kb_articles').update({ is_published: !a.is_published }).eq('id', a.id)
    setArticles(prev => prev.map(x => x.id===a.id ? {...x, is_published:!x.is_published} : x))
  }

  const shown = articles.filter(a => !search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.category?.toLowerCase().includes(search.toLowerCase()) || a.tags?.toLowerCase().includes(search.toLowerCase()))

  const stats = {
    total:     articles.length,
    published: articles.filter(a=>a.is_published!==false).length,
    featured:  articles.filter(a=>a.is_featured).length,
    views:     articles.reduce((s,a)=>s+(a.views||0),0),
  }

  // Simple markdown preview renderer
  function markdownToHtml(md) {
    return md
      .replace(/^### (.+)$/gm,'<h3 style="color:#60a5fa;font-size:15px;margin:16px 0 8px">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 style="color:#e2e8f0;font-size:18px;border-bottom:1px solid #1f2d45;padding-bottom:8px;margin:20px 0 10px">$1</h2>')
      .replace(/^# (.+)$/gm,  '<h1 style="color:#e2e8f0;font-size:22px;margin:20px 0 10px">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g,'<strong style="color:#e2e8f0">$1</strong>')
      .replace(/`([^`]+)`/g,   '<code style="background:#0f172a;color:#34d399;padding:2px 7px;border-radius:5px;font-size:12px;font-family:monospace">$1</code>')
      .replace(/```([\s\S]*?)```/g,'<pre style="background:#0f172a;border:1px solid #1f2d45;border-radius:10px;padding:16px;overflow-x:auto;margin:14px 0"><code style="color:#e2e8f0;font-family:monospace;font-size:12px">$1</code></pre>')
      .replace(/^> (.+)$/gm,  '<blockquote style="border-left:3px solid #3b82f6;padding:10px 16px;margin:14px 0;background:#0f172a;border-radius:0 8px 8px 0;color:#64748b">$1</blockquote>')
      .replace(/^- (.+)$/gm,  '<li style="color:#94a3b8;margin:6px 0">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm,'<li style="color:#94a3b8;margin:6px 0">$2</li>')
      .replace(/(<li[^>]*>.*<\/li>\n?)+/g, s=>`<ul style="padding-left:20px;margin:10px 0">${s}</ul>`)
      .replace(/^---$/gm,'<hr style="border:none;border-top:1px solid #1f2d45;margin:20px 0"/>')
      .replace(/\n\n/g,'</p><p style="color:#94a3b8;line-height:1.8;margin:10px 0">')
      .replace(/^([^<].+)$/gm,'<p style="color:#94a3b8;line-height:1.8;margin:10px 0">$1</p>')
  }

  if (loading) return <Loader />

  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .arow:hover  { background:#0f172a!important; }
        .inp:focus   { border-color:#3b82f6!important; outline:none; }
        textarea:focus { border-color:#3b82f6!important; outline:none; }
      `}</style>

      <GlobalNav title="KB Admin" />

      <div style={{ maxWidth:1400, margin:'0 auto', padding:'28px 24px' }}>

        {/* ── EDITOR VIEW ── */}
        {view === 'editor' ? (
          <div style={{ animation:'fadeUp 0.3s ease' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <button onClick={() => setView('list')} style={{ background:'transparent', border:'none', color:'#64748b', cursor:'pointer', fontSize:14 }}>← Back</button>
                <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800 }}>{editArt ? '✏️ Edit Article' : '+ New Article'}</h1>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setPreview(!preview)}
                  style={{ padding:'9px 18px', background:preview?'#1e3a5f':'transparent', border:'1px solid #1f2d45', borderRadius:10, color:preview?'#60a5fa':'#64748b', cursor:'pointer', fontSize:13 }}>
                  {preview ? '✏️ Edit' : '👁️ Preview'}
                </button>
                <button onClick={saveArticle} disabled={saving}
                  style={{ padding:'9px 20px', background:'linear-gradient(135deg,#2563eb,#3b82f6)', border:'none', borderRadius:10, color:'#fff', cursor:saving?'not-allowed':'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8 }}>
                  {saving ? <><div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', animation:'spin 0.7s linear infinite' }}/>Saving...</> : '💾 Publish'}
                </button>
              </div>
            </div>

            {msg && <div style={{ padding:'10px 16px', borderRadius:8, marginBottom:14, background:msg.startsWith('✅')?'#052e16':'#450a0a', color:msg.startsWith('✅')?'#34d399':'#fca5a5', fontSize:13 }}>{msg}</div>}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'start' }}>
              {/* Main editor */}
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <input className="inp" value={form.title} onChange={e => setForm(p=>({...p, title:e.target.value}))} placeholder="Article title..."
                  style={{ padding:'12px 16px', background:'#111827', border:'1px solid #1f2d45', borderRadius:10, color:'#e2e8f0', fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700 }}/>

                <input className="inp" value={form.summary} onChange={e => setForm(p=>({...p, summary:e.target.value}))} placeholder="Short summary (shown in article list)"
                  style={{ padding:'10px 14px', background:'#111827', border:'1px solid #1f2d45', borderRadius:10, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13 }}/>

                {/* Content editor / preview */}
                {preview ? (
                  <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:12, padding:'24px 28px', minHeight:500 }}
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(form.content) }}/>
                ) : (
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                      <span style={{ fontSize:11, fontWeight:600, color:'#475569', textTransform:'uppercase' }}>Content (Markdown)</span>
                      <span style={{ fontSize:11, color:'#334155' }}>{form.content.length} chars · {form.content.split('\n').length} lines</span>
                    </div>
                    <textarea value={form.content} onChange={e => setForm(p=>({...p, content:e.target.value}))}
                      placeholder={`# Article Title\n\n## Overview\nWrite your article here using Markdown...\n\n## Steps\n1. First step\n2. Second step\n\n## Notes\n> This is a tip or note`}
                      style={{ width:'100%', minHeight:500, padding:'16px', background:'#111827', border:'1px solid #1f2d45', borderRadius:12, color:'#e2e8f0', fontFamily:'monospace', fontSize:13, resize:'vertical', lineHeight:1.7, boxSizing:'border-box', outline:'none' }}/>
                  </div>
                )}
              </div>

              {/* Sidebar settings */}
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, padding:'16px 18px' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#475569', textTransform:'uppercase', marginBottom:14 }}>Article Settings</div>

                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:11, color:'#475569', fontWeight:600, display:'block', marginBottom:6 }}>Category</label>
                    <select value={form.category} onChange={e => setForm(p=>({...p, category:e.target.value}))}
                      style={{ width:'100%', padding:'9px 12px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:'none' }}>
                      {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:11, color:'#475569', fontWeight:600, display:'block', marginBottom:6 }}>Author Name</label>
                    <input className="inp" value={form.author_name} onChange={e => setForm(p=>({...p, author_name:e.target.value}))}
                      style={{ width:'100%', padding:'9px 12px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, boxSizing:'border-box' }}/>
                  </div>

                  <div style={{ marginBottom:14 }}>
                    <label style={{ fontSize:11, color:'#475569', fontWeight:600, display:'block', marginBottom:6 }}>Tags <span style={{ fontWeight:400 }}>(comma separated)</span></label>
                    <input className="inp" value={form.tags} onChange={e => setForm(p=>({...p, tags:e.target.value}))} placeholder="password,login,reset"
                      style={{ width:'100%', padding:'9px 12px', background:'#0f172a', border:'1px solid #1f2d45', borderRadius:9, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, boxSizing:'border-box' }}/>
                  </div>

                  {/* Toggles */}
                  {[
                    { label:'⭐ Featured Article', key:'is_featured', desc:'Shows in featured section' },
                    { label:'✅ Published', key:'is_published', desc:'Visible to all users' },
                  ].map(t => (
                    <div key={t.key} onClick={() => setForm(p=>({...p, [t.key]:!p[t.key]}))}
                      style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderTop:'1px solid #0f172a', cursor:'pointer' }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:600, color:form[t.key]?'#e2e8f0':'#64748b' }}>{t.label}</div>
                        <div style={{ fontSize:10, color:'#334155' }}>{t.desc}</div>
                      </div>
                      <div style={{ width:40, height:22, borderRadius:11, background:form[t.key]?'#3b82f6':'#1f2d45', transition:'all 0.2s', position:'relative', flexShrink:0 }}>
                        <div style={{ position:'absolute', top:3, left:form[t.key]?20:3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'all 0.2s' }}/>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Markdown cheatsheet */}
                <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:14, padding:'14px 16px' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#475569', textTransform:'uppercase', marginBottom:10 }}>📝 Markdown Guide</div>
                  {[
                    ['## Heading 2', 'Section title'],
                    ['### Heading 3', 'Sub-section'],
                    ['**bold text**', 'Bold'],
                    ['`inline code`', 'Code'],
                    ['- item', 'Bullet list'],
                    ['1. item', 'Numbered list'],
                    ['> note text', 'Tip/Note box'],
                    ['---', 'Divider line'],
                  ].map(([syntax, desc]) => (
                    <div key={syntax} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                      <code style={{ fontSize:11, color:'#34d399', background:'#0f172a', padding:'1px 6px', borderRadius:4 }}>{syntax}</code>
                      <span style={{ fontSize:11, color:'#334155' }}>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        ) : (
          /* ── LIST VIEW ── */
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <div>
                <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:4 }}>📚 Knowledge Base Admin</h1>
                <p style={{ color:'#64748b', fontSize:13 }}>Create and manage help articles for users and agents</p>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => router.push('/kb')}
                  style={{ padding:'10px 16px', background:'transparent', border:'1px solid #1f2d45', borderRadius:10, color:'#64748b', cursor:'pointer', fontSize:13 }}>
                  👁️ View Public KB
                </button>
                {articles.length === 0 && (
                  <button onClick={seedDefaults} disabled={saving}
                    style={{ padding:'10px 16px', background:'#1e3a5f', border:'1px solid #3b82f640', borderRadius:10, color:'#60a5fa', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                    {saving ? '⏳ Loading...' : '⚡ Load 6 Default Articles'}
                  </button>
                )}
                <button onClick={openNew}
                  style={{ padding:'10px 20px', background:'linear-gradient(135deg,#2563eb,#3b82f6)', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:14, fontWeight:600 }}>
                  + New Article
                </button>
              </div>
            </div>

            {msg && <div style={{ padding:'12px 18px', borderRadius:10, marginBottom:16, background:msg.startsWith('✅')?'#052e16':'#450a0a', color:msg.startsWith('✅')?'#34d399':'#fca5a5', fontSize:13 }}>{msg}</div>}

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
              {[
                ['📚','Total Articles', stats.total,     '#3b82f6','#1e3a5f'],
                ['✅','Published',       stats.published, '#10b981','#052e16'],
                ['⭐','Featured',        stats.featured,  '#fbbf24','#451a03'],
                ['👁️','Total Views',     stats.views,     '#8b5cf6','#2e1065'],
              ].map(([icon,label,val,color,bg],i) => (
                <div key={label} style={{ background:'#111827', border:`1px solid ${color}30`, borderRadius:14, padding:'14px 18px', animation:`fadeUp 0.4s ${i*0.05}s ease both` }}>
                  <div style={{ fontSize:18, marginBottom:4 }}>{icon}</div>
                  <div style={{ fontSize:22, fontWeight:700, color, fontFamily:"'Syne',sans-serif" }}>{val}</div>
                  <div style={{ fontSize:11, color:'#64748b', marginTop:1 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Search */}
            <input className="inp" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Search articles by title, category or tags..."
              style={{ width:'100%', padding:'10px 14px', background:'#111827', border:'1px solid #1f2d45', borderRadius:10, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", fontSize:13, marginBottom:20, boxSizing:'border-box' }}/>

            {/* Articles Table */}
            <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, overflow:'hidden' }}>
              <div style={{ padding:'14px 24px', borderBottom:'1px solid #1f2d45', display:'flex', justifyContent:'space-between' }}>
                <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700 }}>Articles <span style={{ fontSize:12, color:'#475569', fontWeight:400 }}>({shown.length})</span></h2>
                <button onClick={loadArticles} style={{ fontSize:12, color:'#475569', background:'transparent', border:'none', cursor:'pointer' }}>🔄 Refresh</button>
              </div>

              {shown.length === 0 ? (
                <div style={{ padding:48, textAlign:'center' }}>
                  <div style={{ fontSize:44, marginBottom:16 }}>📚</div>
                  <p style={{ color:'#475569', marginBottom:16 }}>No articles yet</p>
                  <button onClick={seedDefaults} style={{ padding:'10px 24px', background:'#1e3a5f', border:'1px solid #3b82f640', borderRadius:10, color:'#60a5fa', cursor:'pointer', fontSize:13 }}>
                    ⚡ Load Default Articles
                  </button>
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr style={{ background:'#0a0e1a' }}>
                    {['Title','Category','Status','Views','Helpful','Updated','Actions'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {shown.map(a => {
                      const cat = CATEGORIES.find(c=>c.key===a.category)
                      const helpfulPct = (a.helpful_yes||0)+(a.helpful_no||0) > 0
                        ? Math.round(((a.helpful_yes||0)/((a.helpful_yes||0)+(a.helpful_no||0)))*100)
                        : null
                      return (
                        <tr key={a.id} className="arow" style={{ borderTop:'1px solid #1f2d45', transition:'background 0.15s', opacity:a.is_published!==false?1:0.6 }}>
                          <td style={{ padding:'11px 14px', maxWidth:240 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              {a.is_featured && <span style={{ fontSize:12 }}>⭐</span>}
                              <span style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.title}</span>
                            </div>
                            <div style={{ fontSize:10, color:'#334155', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.summary}</div>
                          </td>
                          <td style={{ padding:'11px 14px', whiteSpace:'nowrap' }}>
                            <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'#1e3a5f', color:'#60a5fa' }}>{cat?.icon} {cat?.label||a.category}</span>
                          </td>
                          <td style={{ padding:'11px 14px' }}>
                            <span style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:20, background:a.is_published!==false?'#052e16':'#1f2d45', color:a.is_published!==false?'#34d399':'#475569' }}>
                              {a.is_published!==false?'✅ Published':'📝 Draft'}
                            </span>
                          </td>
                          <td style={{ padding:'11px 14px' }}><span style={{ fontSize:12, color:'#64748b' }}>👁️ {a.views||0}</span></td>
                          <td style={{ padding:'11px 14px' }}>
                            <span style={{ fontSize:12, color: helpfulPct>=70?'#34d399':helpfulPct>=40?'#fbbf24':'#94a3b8' }}>
                              {helpfulPct !== null ? `👍 ${helpfulPct}%` : '—'}
                            </span>
                          </td>
                          <td style={{ padding:'11px 14px' }}><span style={{ fontSize:11, color:'#475569' }}>{new Date(a.updated_at||a.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span></td>
                          <td style={{ padding:'11px 14px' }}>
                            <div style={{ display:'flex', gap:5 }}>
                              <button onClick={() => openEdit(a)} style={{ padding:'4px 9px', background:'#1e3a5f', border:'none', color:'#60a5fa', borderRadius:6, cursor:'pointer', fontSize:11 }}>✏️</button>
                              <button onClick={() => togglePublish(a)} style={{ padding:'4px 9px', background:a.is_published!==false?'#1f2d45':'#052e16', border:'none', color:a.is_published!==false?'#475569':'#34d399', borderRadius:6, cursor:'pointer', fontSize:11 }}>
                                {a.is_published!==false?'📝':'✅'}
                              </button>
                              <button onClick={() => setConfirm(a)} style={{ padding:'4px 9px', background:'#450a0a', border:'none', color:'#fca5a5', borderRadius:6, cursor:'pointer', fontSize:11 }}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {confirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, animation:'fadeIn 0.2s' }}>
          <div style={{ background:'#111827', border:'1px solid #1f2d45', borderRadius:16, padding:'28px 32px', width:380, textAlign:'center' }}>
            <div style={{ fontSize:44, marginBottom:12 }}>🗑️</div>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:17, marginBottom:8 }}>Delete Article?</h3>
            <p style={{ color:'#64748b', fontSize:13, marginBottom:22 }}>"{confirm.title}" will be permanently deleted.</p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={deleteArticle} style={{ flex:1, padding:'11px', background:'#ef4444', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontWeight:600 }}>Delete</button>
              <button onClick={() => setConfirm(null)} style={{ flex:1, padding:'11px', background:'transparent', border:'1px solid #1f2d45', borderRadius:10, color:'#64748b', cursor:'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Loader() {
  return <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #1f2d45', borderTopColor:'#06b6d4', animation:'spin 0.7s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}
