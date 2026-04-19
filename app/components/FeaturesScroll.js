'use client'
import { motion } from 'framer-motion'

const features = [
  {
    title: "Gen-3 AI Auto-Heal Engine",
    description: "NexDesk identifies code failures in real-time, generates the exact fix, and deploys it before users even notice. Stop outages before they exist.",
    image: "/features/auto-heal.png",
    color: "#2563eb",
    bg: "radial-gradient(circle at center, rgba(37,99,235,0.08) 0%, transparent 70%)"
  },
  {
    title: "Strategic Change Intelligence",
    description: "Transforming complex BRDs into audit-ready, 80-page technical documents in seconds. 100% compliance automation for BFSI & Healthcare.",
    image: "/features/change-writer.png",
    color: "#7c3aed",
    bg: "radial-gradient(circle at center, rgba(124,58,237,0.08) 0%, transparent 70%)"
  },
  {
    title: "8D Risk Prediction Matrix",
    description: "Predict outages across 8 vectors: Infrastructure, Code, Security, Scale, Latency, API, Database, and User Behavior. Total enterprise oversight.",
    image: "/features/risk-prediction.png",
    color: "#db2777",
    bg: "radial-gradient(circle at center, rgba(219,39,119,0.08) 0%, transparent 70%)"
  },
  {
    title: "Zero-Touch Digital Twin",
    description: "A real-time mirroring of your entire IT infrastructure. Test every fix on a synthetic 'Twin' before it touches production. Zero risk, total confidence.",
    image: "/features/digital-twin.png",
    color: "#059669",
    bg: "radial-gradient(circle at center, rgba(5,150,105,0.08) 0%, transparent 70%)"
  },
  {
    title: "Technical Architect Engine",
    description: "Turn business vision into technical reality. AI generates database schemas, API structures, and microservices topology from a simple prompt.",
    image: "/features/tech-architect.png",
    color: "#ea580c",
    bg: "radial-gradient(circle at center, rgba(234,88,12,0.08) 0%, transparent 70%)"
  }
]

export default function FeaturesScroll() {
  return (
    <div id="features-demo" style={{ background: '#fcfbf8' }}>
      {features.map((f, i) => (
        <section 
          key={i} 
          style={{ 
            height: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            position: 'relative',
            overflow: 'hidden',
            borderBottom: '1px solid rgba(0,0,0,0.03)'
          }}
        >
          {/* Background Animated Gradient */}
          <div style={{ position: 'absolute', inset: 0, background: f.bg, opacity: 0.8, zIndex: 0 }} />
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 80, 
            padding: '0 8%', 
            maxWidth: 1300, 
            position: 'relative', 
            zIndex: 1,
            flexDirection: i % 2 === 0 ? 'row' : 'row-reverse'
          }}>
            {/* Left Content Side */}
            <motion.div 
              initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              viewport={{ once: false, amount: 0.4 }}
              style={{ flex: 1 }}
            >
              <div style={{ display: 'inline-block', padding: '6px 14px', background: `${f.color}15`, color: f.color, fontWeight: 700, fontSize: 13, borderRadius: 20, marginBottom: 24, textTransform: 'uppercase' }}>
                Capability {i + 1}
              </div>
              <h2 style={{ fontSize: 52, fontWeight: 800, color: '#111827', lineHeight: 1.1, marginBottom: 28 }}>{f.title}</h2>
              <p style={{ fontSize: 18, color: '#4b5563', lineHeight: 1.6, marginBottom: 36 }}>{f.description}</p>
              <button 
                className="btn-primary" 
                style={{ 
                  background: f.color, 
                  boxShadow: `0 10px 20px ${f.color}30`, 
                  borderRadius: 40,
                  padding: '14px 32px'
                }}
              >
                Access Intelligence
              </button>
            </motion.div>

            {/* Right Visual Side */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: false, amount: 0.4 }}
              style={{ flex: 1.2 }}
            >
              <div style={{ 
                position: 'relative', 
                padding: 10, 
                background: '#fff', 
                borderRadius: 32, 
                boxShadow: '0 40px 80px rgba(0,0,0,0.1)',
                border: '1px solid rgba(0,0,0,0.05)'
              }}>
                <img 
                  src={f.image} 
                  alt={f.title} 
                  style={{ width: '100%', borderRadius: 24, display: 'block' }} 
                />
                
                {/* Micro badge */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ position: 'absolute', bottom: 30, right: i % 2 === 0 ? '-20px' : 'auto', left: i % 2 === 0 ? 'auto' : '-20px', background: '#fff', padding: '12px 20px', borderRadius: 16, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: f.color }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>AI PIPELINE ACTIVE</span>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      ))}
    </div>
  )
}
