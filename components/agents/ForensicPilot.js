'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * PHASE 31: NEXDESK FORENSIC PILOT COMPONENT
 * On-demand autonomous testing for L3 Developers
 */
export default function ForensicPilot({ ticketId, onInvestigationComplete }) {
  const [isLaunching, setIsLaunching] = useState(false)
  const [status, setStatus] = useState('idle') // idle | testing | analyzing | complete | error
  const [findings, setFindings] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handleLaunchInvestigation = async () => {
    setIsLaunching(true)
    setStatus('testing')
    setFindings(null)
    setErrorMsg('')

    try {
      const res = await fetch('/api/agents/forensic/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId })
      })

      const data = await res.json()

      if (data.error) {
        setStatus('error')
        setErrorMsg(data.error)
      } else {
        setStatus('complete')
        setFindings(data)
        if (onInvestigationComplete) onInvestigationComplete(data)
      }

    } catch (err) {
      setStatus('error')
      setErrorMsg('Network error: Could not contact Forensic Agent.')
    } finally {
      setIsLaunching(false)
    }
  }

  return (
    <div className="p-6 bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden relative group">
      {/* Background Bio-Metric Animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${status === 'complete' ? 'bg-green-500' : 'bg-cyan-500'}`} />
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">
              L3 Forensic Investigation
            </h3>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLaunchInvestigation}
            disabled={isLaunching}
            className={`px-4 py-2 rounded-lg font-bold transition-all shadow-lg shadow-cyan-500/20 
              ${isLaunching ? 'bg-gray-700 text-gray-400' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}
          >
            {isLaunching ? 'Agent Investigating...' : 'Pilot Agent Launch'}
          </motion.button>
        </div>

        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.p 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-slate-400 text-sm italic"
            >
              Launch the autonomous subagent to login as the user and reproduce the reported issue in a headless browser.
            </motion.p>
          )}

          {status === 'testing' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-4 p-4 bg-black/50 border border-cyan-500/10 rounded-xl font-mono text-xs text-cyan-400/80"
            >
              <p className="animate-pulse">_ EXEC_ENGINE: Playwright 1.41.0</p>
              <p className="mt-1">_ BROWSER: Chromium (Headless: true)</p>
              <p className="mt-1">_ TARGET: ${ticketId}</p>
              <p className="mt-1">_ ACTION: Replaying User Recording Sessions...</p>
              <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }} animate={{ width: '70%' }} transition={{ duration: 5 }}
                  className="h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]" 
                />
              </div>
            </motion.div>
          )}

          {status === 'complete' && findings && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="mt-4 p-6 bg-green-500/5 border border-green-500/20 rounded-xl"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-green-500 font-bold">100% Bug Confirmed:</span>
                <span className="text-white text-sm">{findings.findings.exact_failure}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <span className="text-slate-500 uppercase font-bold tracking-widest block mb-1">Root Cause</span>
                  <span className="text-green-400/90">{findings.findings.root_cause}</span>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-cyan-500/10">
                  <span className="text-slate-500 uppercase font-bold tracking-widest block mb-1">Fix Suggestion</span>
                  <span className="text-cyan-400/90">{findings.findings.fix_suggestion}</span>
                </div>
              </div>

              {findings.surgery && (
                <div className="mt-4 p-4 bg-slate-900 border-l-4 border-yellow-500 rounded-r-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-yellow-500 font-mono text-[10px] uppercase font-bold tracking-tighter">AI Code Surgeon Patch</span>
                    <span className="text-[10px] text-slate-500">Auto-Fix Ready</span>
                  </div>
                  <pre className="text-[11px] text-white/90 overflow-x-auto p-2 bg-black/40 rounded font-mono">
                    {findings.surgery.patches?.[0]?.patched_code}
                  </pre>
                </div>
              )}
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mt-4 p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-red-400 text-sm"
            >
              Failed to launch agent: {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
