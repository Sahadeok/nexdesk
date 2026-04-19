'use client'
import { useEffect, useRef } from 'react'

export default function AmbientAurora() {
  const auroraCanvasRef = useRef(null)
  const sparklesCanvasRef = useRef(null)

  useEffect(() => {
    const auroraCanvas = auroraCanvasRef.current
    const sparklesCanvas = sparklesCanvasRef.current
    if (!auroraCanvas || !sparklesCanvas) return
    
    const ctxA = auroraCanvas.getContext('2d')
    const ctxS = sparklesCanvas.getContext('2d')

    let w, h
    let animationFrameId
    const orbs = []
    let sparkles = []
    
    // Mouse tracking 
    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, moved: false }
    let lastSpawnTime = 0

    const handleMouseMove = (e) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.moved = true
      
      // Heavily throttle so it spawns far fewer stars and spaces them out elegantly (~90ms gap)
      const now = Date.now()
      if (now - lastSpawnTime > 90) { 
        sparkles.push(new Sparkle(mouse.x, mouse.y))
        lastSpawnTime = now
      }
    }

    const setSize = () => {
      w = window.innerWidth
      h = window.innerHeight
      auroraCanvas.width = w
      auroraCanvas.height = h
      sparklesCanvas.width = w
      sparklesCanvas.height = h
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('resize', setSize)
    setSize()

    // ── AURORA LOGIC ──
    const colors = [
      'rgba(37, 99, 235, 0.8)',   // Primary Blue
      'rgba(147, 51, 234, 0.6)',  // Deep Purple
      'rgba(16, 185, 129, 0.5)',  // Emerald Green
      'rgba(245, 158, 11, 0.5)'   // Golden Amber
    ]

    class AuroraOrb {
      constructor(color, sizeModifier) {
        this.baseX = Math.random() * w
        this.baseY = Math.random() * h
        this.x = this.baseX
        this.y = this.baseY
        this.radius = Math.max(w, h) * sizeModifier
        this.color = color
        
        // Gentle drift
        this.vx = (Math.random() - 0.5) * 1.5
        this.vy = (Math.random() - 0.5) * 1.5
        this.angle = Math.random() * Math.PI * 2
        this.angleSpeed = Math.random() * 0.01 + 0.005
      }

      update() {
        this.angle += this.angleSpeed
        this.baseX += this.vx
        this.baseY += this.vy

        // Bounce gently
        if (this.baseX > w + this.radius || this.baseX < -this.radius) this.vx *= -1
        if (this.baseY > h + this.radius || this.baseY < -this.radius) this.vy *= -1

        // Extreme soft pull towards mouse
        const dx = mouse.x - this.baseX
        const dy = mouse.y - this.baseY
        this.x = this.baseX + (dx * 0.04) + Math.cos(this.angle) * 120
        this.y = this.baseY + (dy * 0.04) + Math.sin(this.angle) * 120
      }

      draw() {
        const gradient = ctxA.createRadialGradient(this.x, this.y, this.radius * 0.1, this.x, this.y, this.radius)
        gradient.addColorStop(0, this.color)
        gradient.addColorStop(1, 'rgba(255,255,255,0)') 

        ctxA.beginPath()
        ctxA.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
        ctxA.fillStyle = gradient
        ctxA.fill()
      }
    }

    // ── SPARKLES LOGIC ──
    class Sparkle {
      constructor(x, y) {
        // Perfect, precise strict-line placement exactly on the exact mouse cursor path
        this.x = x
        this.y = y
        this.vx = 0 // Absolutely zero drift so they form perfect unmoving lines
        this.vy = 0
        this.size = Math.random() * 1.5 + 1.0 // Perfect Goldilocks size: Small but distinct rays
        this.life = 1.0 
        this.decay = Math.random() * 0.03 + 0.015 // Lingering naturally
        this.rot = Math.random() * Math.PI * 2
        this.rotSpeed = (Math.random() - 0.5) * 0.05 // Barely rotating
        // Highly colorful palette as requested!
        const palette = ['#ffffff', '#60a5fa', '#fbbf24', '#38bdf8', '#a855f7', '#10b981']
        this.baseColor = palette[Math.floor(Math.random() * palette.length)]
      }

      update() {
        this.x += this.vx
        this.y += this.vy
        this.life -= this.decay
        this.rot += this.rotSpeed
      }

      draw() {
        if (this.life <= 0) return
        
        ctxS.save()
        ctxS.translate(this.x, this.y)
        ctxS.rotate(this.rot)
        
        // Intense vivid brightness - stays near maximum opacity
        const twinkle = 0.8 + Math.abs(Math.sin(this.life * 45)) * 0.5
        ctxS.globalAlpha = Math.max(0, Math.min(1, this.life * twinkle * 1.5))
        
        ctxS.beginPath()
        // Dynamic size scaling: they shrink gracefully as their 'life' fades (big to small)
        const currentScale = this.size * Math.max(0, this.life)
        
        // Draw completely OPEN lines radiating from center with high density
        const rays = 12 // Optimal number of lines to keep each ray distinctly visible
        for (let i = 0; i < rays; i++) {
          const angle = (Math.PI * 2 * i) / rays
          // Shoot the rays much further outward so they don't overlap into a dot
          const length = (i % 2 === 0) ? currentScale * 3.5 : currentScale * 1.5 
          // Start drawing slightly off-center to avoid the lines crushing into a single pixel blob
          const offset = currentScale * 0.3
          ctxS.moveTo(offset * Math.cos(angle), offset * Math.sin(angle))
          ctxS.lineTo(length * Math.cos(angle), length * Math.sin(angle))
        }
        
        ctxS.lineWidth = 0.4 // Ultra-thin, delicate strokes so the rays separate beautifully
        ctxS.strokeStyle = this.baseColor
        ctxS.shadowBlur = 8 // Lowering the neon bloom stops the shape from blurring into a solid dot
        ctxS.shadowColor = this.baseColor
        ctxS.stroke() // Notice: ONLY stroking now, no fill!
        
        ctxS.restore()
      }
    }

    // INIT
    const init = () => {
      orbs.length = 0
      orbs.push(new AuroraOrb(colors[0], 0.6))
      orbs.push(new AuroraOrb(colors[1], 0.5))
      orbs.push(new AuroraOrb(colors[2], 0.4))
      orbs.push(new AuroraOrb(colors[3], 0.55))
    }

    const animate = () => {
      ctxA.clearRect(0, 0, w, h)
      ctxS.clearRect(0, 0, w, h)
      
      // Render blurred Aurora Layer
      ctxA.globalCompositeOperation = 'multiply'
      for (let i = 0; i < orbs.length; i++) {
        orbs[i].update()
        orbs[i].draw()
      }
      ctxA.globalCompositeOperation = 'source-over'

      // Render sharp, bright Sparkles Layer
      ctxS.globalCompositeOperation = 'screen'
      for (let i = 0; i < sparkles.length; i++) {
        sparkles[i].update()
        sparkles[i].draw()
      }
      
      // Cleanup dead sparkles automatically
      sparkles = sparkles.filter((s) => s.life > 0)
      
      animationFrameId = requestAnimationFrame(animate)
    }

    init()
    animate()

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', setSize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <>
      {/* Heavy CSS blurred Aurora blobs */}
      <canvas 
        ref={auroraCanvasRef} 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          zIndex: 0, 
          pointerEvents: 'none',
          opacity: 0.40, // Perfect bold opacity
          filter: 'blur(40px)' // Creates the seamless mesh blend
        }} 
      />
      {/* Razor sharp interactive Sparkle mouse-trail */}
      <canvas 
        ref={sparklesCanvasRef} 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          zIndex: 1, // On top of the Aurora
          pointerEvents: 'none',
          opacity: 1 // Maximum 100% visibility for the stars
        }} 
      />
    </>
  )
}

