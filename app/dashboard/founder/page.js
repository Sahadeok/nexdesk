'use client'
import { useState, useEffect } from 'react'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  ShieldAlert, 
  Cpu, 
  Activity, 
  Globe, 
  CreditCard, 
  Zap, 
  Terminal,
  Search,
  DollarSign,
  TrendingUp,
  BarChart3,
  Users
} from 'lucide-react'

export default function FounderDashboard() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTenants: 12,
    totalTickets: 1240,
    activeAgents: 84,
    forensicSuccess: '94.2%',
    mrr: '$124,500', // Monthly Recurring Revenue
    platformCost: '$14,250', // API & Hosting spend
    profitMargin: '88.5%',
    customerGrowth: '+14%'
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkAuth() {
      const { profile } = await getCurrentUserProfile(supabase)
      if (!profile || profile.role !== 'SUPER_ADMIN') {
        router.push('/')
        return
      }
      setProfile(profile)
      setLoading(false)
    }
    checkAuth()
  }, [])

  if (loading) return null

  return (
    <div style={{ minHeight:'100vh', background:'#020617', color:'#fff', padding:'40px 60px', fontFamily:'"Outfit", sans-serif' }}>
      
      {/* ── HEADER ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:40 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, color:'#3b82f6', fontWeight:600, fontSize:13, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>
            <ShieldAlert size={14} /> Elite Founder Mission Control
          </div>
          <h1 style={{ fontSize:48, fontWeight:800, margin:0, letterSpacing:-1 }}>
            Platform <span style={{ color:'#3b82f6' }}>Supremacy</span>.
          </h1>
        </div>
        <div style={{ background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)', padding:'12px 24px', borderRadius:16, display:'flex', alignItems:'center', gap:15 }}>
          <Activity size={18} color="#3b82f6" />
          <span style={{ fontSize:14, fontWeight:600 }}>System Integrity: <strong style={{ color:'#10b981' }}>99.99%</strong></span>
        </div>
      </div>

      {/* ── REVENUE & MONETIZATION COMMANDER ── */}
      <div style={{ marginBottom:40 }}>
        <h2 style={{ fontSize:15, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1, marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
          <DollarSign size={16} /> Monetization & Revenue Analytics
        </h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:24 }}>
          {[
            { label: 'Total MRR', value: stats.mrr, icon: <TrendingUp size={20} />, color: '#10b981', trend: '+12.5%' },
            { label: 'Platform Spend', value: stats.platformCost, icon: <Zap size={20} />, color: '#f59e0b', trend: '-2.4%' },
            { label: 'Gross Profit', value: stats.profitMargin, icon: <DollarSign size={20} />, color: '#3b82f6', trend: 'Healthy' },
            { label: 'Customer Acquisition', value: stats.customerGrowth, icon: <Users size={20} />, color: '#ec4899', trend: '+4 New' },
          ].map((kpi, i) => (
            <div key={i} style={{ 
              background: 'linear-gradient(135deg, rgba(30,41,59,0.5) 0%, rgba(15,23,42,0.5) 100%)', 
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 24, 
              padding: 30,
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Abstract Glow Background */}
              <div style={{ position:'absolute', top:'-20%', right:'-10%', width:80, height:80, borderRadius:'50%', background: kpi.color + '15', filter:'blur(30px)' }}/>
              
              <div style={{ color: kpi.color, marginBottom:20, background: kpi.color + '1a', width:40, height:40, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {kpi.icon}
              </div>
              <div style={{ fontSize:13, color:'#94a3b8', marginBottom:10 }}>{kpi.label}</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
                <div style={{ fontSize:32, fontWeight:800 }}>{kpi.value}</div>
                <div style={{ fontSize:12, fontWeight:700, color: kpi.trend.includes('+') ? '#10b981' : kpi.trend.includes('-') ? '#fca5a5' : '#3b82f6' }}>{kpi.trend}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TENANT PROFITABILITY & OPS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.8fr 1.2fr', gap:30 }}>
        
        {/* ── TOP TENANT REVENUE ── */}
        <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:30, padding:32 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:32 }}>
             <h2 style={{ fontSize:20, fontWeight:700, margin:0, display:'flex', alignItems:'center', gap:12 }}>
               <Globe size={20} color="#3b82f6" /> Top Performers (By Tenant)
             </h2>
             <button style={{ fontSize:12, color:'#3b82f6', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>View All Clients</button>
          </div>

          <div style={{ display:'grid', gap:16 }}>
            {[
              { name: 'CyberDyne Inc', plan: 'ENTERPRISE', rev: '$28,400', tickets: 442, health: 'Stable' },
              { name: 'Star-Link Global', plan: 'GROWTH', rev: '$12,200', tickets: 122, health: 'High Growth' },
              { name: 'Omni-Consumer', plan: 'ENTERPRISE', rev: '$34,900', tickets: 871, health: 'Action Needed' },
            ].map((tenant, i) => (
              <div key={i} style={{ padding:20, background:'rgba(255,255,255,0.03)', borderRadius:20, border:'1px solid rgba(255,255,255,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:'rgba(59,130,246,0.1)', display:'flex', alignItems:'center', justifyContent:'center', color:'#3b82f6', fontWeight:800, fontSize:14 }}>{tenant.name[0]}</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:16 }}>{tenant.name}</div>
                    <div style={{ fontSize:11, color: '#64748b', textTransform:'uppercase', letterSpacing:1, marginTop:4 }}>{tenant.plan} · {tenant.tickets} Active Tickets</div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:18, fontWeight:800, color:'#fff' }}>{tenant.rev}</div>
                  <div style={{ fontSize:11, color: tenant.health === 'High Growth' ? '#10b981' : tenant.health === 'Action Needed' ? '#fca5a5' : '#94a3b8', fontWeight:700, marginTop:4 }}>● {tenant.health}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── PLATFORM BURN RATE ── */}
        <div style={{ background: 'linear-gradient(to bottom, #1e293b1a, #020617)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:30, padding:32 }}>
          <h2 style={{ fontSize:20, fontWeight:700, marginBottom:32, display:'flex', alignItems:'center', gap:12 }}>
            <Activity size={20} color="#ec4899" /> Platform Burn Rate
          </h2>
          <div style={{ display:'grid', gap:24 }}>
            {[
              { label: 'LLM Intelligence Spend', cost: '$9,220', limit: '$15,000' },
              { label: 'Storage & DB Infrastructure', cost: '$2,140', limit: '$5,000' },
              { label: 'Forensic Agent Compute', cost: '$2,890', limit: '$4,000' },
            ].map((spend, i) => (
              <div key={i}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, marginBottom:10 }}>
                  <span style={{ color:'#94a3b8' }}>{spend.label}</span>
                  <span style={{ fontWeight:700 }}>{spend.cost} <span style={{ color:'#475569', fontSize:12 }}>/ {spend.limit}</span></span>
                </div>
                <div style={{ width:'100%', height:8, background:'rgba(255,255,255,0.05)', borderRadius:10, overflow:'hidden' }}>
                    <div style={{ 
                      width: `${(parseFloat(spend.cost.replace('$','').replace(',','')) / parseFloat(spend.limit.replace('$','').replace(',',''))) * 100}%`, 
                      height:'100%', 
                      background:'linear-gradient(to right, #3b82f6, #ec4899)',
                      borderRadius:10
                    }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        body { background: #020617; }
      `}</style>
    </div>
  )
}
