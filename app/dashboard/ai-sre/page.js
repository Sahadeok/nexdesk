"use client";
import { useState, useEffect, useRef } from 'react';
import TopBar from '../../components/TopBar';

export default function AISREDashboard() {
  const [autoPilot, setAutoPilot] = useState(false);
  const [systemHealth, setSystemHealth] = useState(100);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [activeIncident, setActiveIncident] = useState(null);
  const [incidentsResolved, setIncidentsResolved] = useState(1432);
  const [simulating, setSimulating] = useState(false);
  const logsEndRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  useEffect(() => {
    if (!autoPilot) return;
    const interval = setInterval(() => {
      if (!activeIncident && !simulating && Math.random() > 0.6) {
        triggerAnomaly();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [autoPilot, activeIncident, simulating]);

  const triggerAnomaly = async () => {
    setSimulating(true);
    const anomalies = [
      "Latency spike on /api/checkout (95th pctl > 4s)",
      "High memory usage in Kubernetes user-service pod (OOM pending)",
      "Database connection pool exhausted",
      "Redis cache hit rate dropped below 20%",
      "Payment gateway webhook failures > 15%"
    ];
    const picked = anomalies[Math.floor(Math.random() * anomalies.length)];
    
    setSystemHealth(Math.floor(Math.random() * 20) + 40);
    setActiveIncident(picked);
    
    setTerminalLogs(prev => [...prev, { id: Date.now(), time: new Date().toLocaleTimeString(), level: 'ALERT', msg: `CRITICAL TELEMETRY SPIKE: ${picked}`, type: 'alert' }]);
    
    try {
      const res = await fetch('/api/ai-sre/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anomaly: picked })
      });
      const data = await res.json();
      
      if (data.success) {
        streamLogs(data.logs);
      } else {
        addLog('ERROR', 'AI Brain disconnected or failed to route mitigation.', 'error');
        setSimulating(false);
      }
    } catch (err) {
      addLog('ERROR', 'AI Engine Offline: ' + err.message, 'error');
      setSimulating(false);
    }
  };

  const streamLogs = (logs) => {
    let i = 0;
    const interval = setInterval(() => {
      if (i >= logs.length) {
        clearInterval(interval);
        setTimeout(() => {
          setSystemHealth(100);
          setActiveIncident(null);
          setIncidentsResolved(prev => prev + 1);
          setSimulating(false);
        }, 2000);
        return;
      }
      
      const log = logs[i];
      let type = 'trace';
      if (log.level === 'ALERT') type = 'alert';
      if (log.level === 'WARN') type = 'warn';
      if (log.level === 'INFO') type = 'info';
      if (log.level === 'ACTION') type = 'action';
      if (log.level === 'CMD') type = 'cmd';
      if (log.level === 'SUCCESS') type = 'success';
      
      addLog(log.level, log.msg, type);
      i++;
    }, 1200);
  };

  const addLog = (level, msg, type) => {
    setTerminalLogs(prev => [...prev, { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), level, msg, type }]);
  };

  return (
    <div className="sre-layout">
      <TopBar title="AI Agentic L4 Ops" />
      
      <div className="sre-container">
        {/* HUD Header */}
        <div className="hud-header">
          <div className="hud-header-top-bar"></div>
          <div>
            <h1 className="hud-title">
              <span className="live-dot-container">
                <span className={`live-dot-ping ${systemHealth < 100 ? 'bg-red' : 'bg-green'}`}></span>
                <span className={`live-dot ${systemHealth < 100 ? 'bg-red' : 'bg-green'}`}></span>
              </span>
              Autonomous SRE
            </h1>
            <p className="hud-subtitle">Level 4 Autonomous Loop active</p>
          </div>
          
          <div className="hud-stats">
            <div className="stat-block">
              <div className="stat-label">Network Health</div>
              <div className={`stat-value ${systemHealth < 60 ? 'text-red' : 'text-green'}`}>
                {systemHealth}%
              </div>
            </div>
            
            <div className="stat-block">
              <div className="stat-label">Incidents Neutralized</div>
              <div className="stat-value text-white">{incidentsResolved.toLocaleString()}</div>
            </div>
            
            <div className="stat-block">
              <div className="stat-label auto-pilot-label">Auto-Pilot</div>
              <button 
                onClick={() => setAutoPilot(!autoPilot)}
                className={`toggle-btn ${autoPilot ? 'toggle-on' : 'toggle-off'}`}
              >
                <span className={`toggle-knob ${autoPilot ? 'knob-on' : 'knob-off'}`}></span>
              </button>
            </div>
          </div>
        </div>

        <div className="sre-grid">
          {/* Main Terminal */}
          <div className="sre-terminal">
            <div className="terminal-top">
              <div className="mac-buttons">
                <div className="mac-red"></div>
                <div className="mac-yellow"></div>
                <div className="mac-green"></div>
              </div>
              <div className="terminal-title">root@nexdesk-ai-sre-core-v4:~</div>
            </div>
            
            <div className="terminal-body">
              <div className="terminal-intro">
{`███╗   ██╗███████╗██╗  ██╗██████╗ ███████╗███████╗██╗  ██╗
████╗  ██║██╔════╝╚██╗██╔╝██╔══██╗██╔════╝██╔════╝██║ ██╔╝
██╔██╗ ██║█████╗   ╚███╔╝ ██║  ██║█████╗  ███████╗█████╔╝ 
██║╚██╗██║██╔══╝   ██╔██╗ ██║  ██║██╔══╝  ╚════██║██╔═██╗ 
██║ ╚████║███████╗██╔╝ ██╗██████╔╝███████╗███████║██║  ██╗
╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝
Autonomous SRE Subsystem Online.
Establishing multi-region telemetry mesh... [OK]
Waiting for catastrophic failures...`}
              </div>
              
              {terminalLogs.map(log => (
                <div key={log.id} className="log-row">
                  <span className="log-time">[{log.time}]</span>
                  <span className={`log-level level-${log.type}`}>
                    {log.level === 'CMD' ? 'EXEC >' : `${log.level}`}
                  </span>
                  <span className={`log-msg msg-${log.type}`}>{log.msg}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
              
              {(autoPilot && !activeIncident || simulating) && (
                <div className="polling-row">
                   <span className="log-time">[{new Date().toLocaleTimeString()}]</span>
                   <span className="log-level level-trace text-right">POLL</span>
                   <span className="log-msg msg-trace">Ingesting real-time cluster telemetry...</span>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="sre-sidebar">
            <div className="sidebar-card threat-box">
              <div className="threat-glow"></div>
              <h3 className="card-title">Current Mitigation</h3>
              
              {activeIncident ? (
                <div className="active-incident-box">
                  <div className="incident-pulse-border"></div>
                  <div className="incident-header">
                    <span className="incident-dot"></span> INCIDENT ACTIVE
                  </div>
                  <div className="incident-name">{activeIncident}</div>
                  <div className="incident-metrics">
                    <div className="metric-row"><span className="metric-lbl">AI Confidence:</span> <span className="text-green text-bold">98.2%</span></div>
                    <div className="metric-row"><span className="metric-lbl">Action:</span> <span className="text-action pulse">Computing...</span></div>
                  </div>
                </div>
              ) : (
                <div className="all-clear">
                   <div className="shield-icon">🛡️</div>
                   <p className="shield-text">All clusters protected.</p>
                   <p className="shield-sub">SRE Agent is standing by.</p>
                </div>
              )}
            </div>

            <div className="sidebar-card">
              <h3 className="card-title">Neural Diagnostics</h3>
              <div className="diagnostics">
                <div className="diag-row"><span className="diag-lbl">Threat Detection Core</span><span className="diag-val text-green text-shadow">Active</span></div>
                <div className="diag-row"><span className="diag-lbl">Groq LLM Inference</span><span className="diag-val text-warn">~300 ms</span></div>
                <div className="diag-row"><span className="diag-lbl">Human SLA Breach</span><span className="diag-val text-info">0%</span></div>
                <div className="diag-row"><span className="diag-lbl">Auto-Resolved %</span><span className="diag-val text-white text-bold">99.9%</span></div>
              </div>
            </div>
            
            <div className="sidebar-card override-box">
              <h3 className="override-title">Manual Override</h3>
              <p className="override-desc">Force the AI agent to react to a sudden infrastructure catastrophy. It will immediately diagnose and execute a self-healing action via Groq.</p>
              <button 
                onClick={triggerAnomaly} 
                disabled={!!activeIncident || simulating} 
                className="outage-btn"
              >
                Trigger Outage
              </button>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        /* Vanilla CSS Architecture */
        .sre-layout { background-color: #050810; min-height: 100vh; color: #d1d5db; font-family: 'Syne', 'DM Sans', sans-serif; }
        .sre-container { max-width: 1280px; margin: 0 auto; padding: 2rem 1rem; }
        
        /* HUD Header */
        .hud-header { display: flex; justify-content: space-between; align-items: center; background: linear-gradient(to right, #0a1120, #0f192b); padding: 1.5rem; border-radius: 1rem; border: 1px solid rgba(30,58,138,0.4); box-shadow: 0 0 40px rgba(30,58,138,0.15); margin-bottom: 2rem; position: relative; overflow: hidden; }
        .hud-header-top-bar { position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: linear-gradient(to right, #2563eb, #34d399, #8b5cf6); }
        .hud-title { font-size: 1.8rem; font-weight: 900; color: white; display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
        .hud-subtitle { font-size: 0.7rem; color: #60a5fa; letter-spacing: 0.2em; text-transform: uppercase; background: rgba(30,58,138,0.2); display: inline-block; padding: 0.25rem 0.75rem; border-radius: 0.25rem; border: 1px solid rgba(30,58,138,0.5); font-family: monospace; }
        
        .hud-stats { display: flex; align-items: center; gap: 2rem; }
        .stat-block { text-align: center; border-left: 1px solid #1f2937; padding-left: 2rem; }
        .stat-block:first-child { border-left: none; }
        .stat-label { font-size: 0.65rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.15em; font-weight: bold; margin-bottom: 0.25rem; }
        .stat-value { font-size: 2.25rem; font-weight: 900; font-family: monospace; }
        
        /* Layout Grid */
        .sre-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; }
        @media (max-width: 1024px) { .sre-grid { grid-template-columns: 1fr; } .hud-header { flex-direction: column; gap: 1.5rem; text-align: center; } .hud-stats { flex-wrap: wrap; justify-content: center; } .stat-block { border-left: none; padding-left: 0; } }
        
        /* Terminal */
        .sre-terminal { background-color: #020202; border-radius: 1rem; border: 1px solid rgba(31,41,55,0.8); box-shadow: 0 20px 50px rgba(0,0,0,0.5); display: flex; flex-direction: column; height: 650px; overflow: hidden; }
        .terminal-top { background-color: #1a1c23; padding: 0.5rem 1rem; border-bottom: 1px solid #1f2937; display: flex; justify-content: space-between; align-items: center; }
        .mac-buttons { display: flex; gap: 0.5rem; }
        .mac-red, .mac-yellow, .mac-green { width: 12px; height: 12px; border-radius: 50%; opacity: 0.8; }
        .mac-red { background-color: #ef4444; } .mac-yellow { background-color: #f59e0b; } .mac-green { background-color: #10b981; }
        .terminal-title { font-size: 0.7rem; font-family: monospace; color: #9ca3af; letter-spacing: 0.1em; }
        
        .terminal-body { padding: 1.5rem; overflow-y: auto; flex: 1; font-family: 'Courier New', monospace; font-size: 0.85rem; line-height: 1.5; color: #d1d5db; }
        .terminal-body::-webkit-scrollbar { width: 6px; }
        .terminal-body::-webkit-scrollbar-track { background: transparent; }
        .terminal-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        
        .terminal-intro { color: rgba(16,185,129,0.7); font-weight: 900; white-space: pre-wrap; margin-bottom: 2rem; }
        .log-row, .polling-row { display: flex; gap: 1rem; padding: 0.25rem 0.5rem; border-radius: 0.25rem; transition: background-color 0.2s; animation: fadeIn 0.3s ease-in-out; }
        .log-row:hover { background-color: rgba(255,255,255,0.03); }
        .log-time { color: #4b5563; flex-shrink: 0; }
        .log-level { flex-shrink: 0; width: 80px; text-align: right; font-weight: 900; }
        .log-msg { word-break: break-word; }
        .polling-row { opacity: 0.5; animation: pulse 2s infinite; }
        
        /* Terminal Colors */
        .level-alert { color: #3b82f6; } .msg-alert { color: #ef4444; font-weight: bold; text-shadow: 0 0 8px rgba(239,68,68,0.8); }
        .level-warn { color: #3b82f6; } .msg-warn { color: #facc15; }
        .level-info { color: #3b82f6; } .msg-info { color: #93c5fd; }
        .level-trace { color: #3b82f6; } .msg-trace { color: #6b7280; }
        .level-action { color: #3b82f6; } .msg-action { color: #c084fc; font-weight: bold; }
        .level-cmd { color: #10b981; } .msg-cmd { color: #34d399; letter-spacing: 0.05em; }
        .level-success { color: #3b82f6; } .msg-success { color: #10b981; font-weight: 900; text-shadow: 0 0 5px rgba(16,185,129,0.5); }
        .level-error { color: #ef4444; } .msg-error { color: #ef4444; font-weight: bold; }
        
        /* Sidebar layout */
        .sre-sidebar { display: flex; flex-direction: column; gap: 1.5rem; }
        .sidebar-card { background-color: #0a1120; padding: 1.5rem; border-radius: 1rem; border: 1px solid #1f2937; position: relative; }
        .card-title { font-size: 0.65rem; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 1rem; }
        
        /* Threat Box */
        .threat-box { overflow: hidden; flex: 1; }
        .threat-glow { position: absolute; top: 0; right: 0; width: 100px; height: 100px; background: rgba(239,68,68,0.1); filter: blur(40px); border-radius: 50%; }
        
        .active-incident-box { background: rgba(69,10,10,0.4); border: 1px solid rgba(239,68,68,0.5); border-radius: 0.75rem; padding: 1.25rem; position: relative; overflow: hidden; }
        .incident-pulse-border { position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: #ef4444; animation: pulse 2s infinite; }
        .incident-header { display: flex; align-items: center; gap: 0.5rem; color: #f87171; font-weight: 900; font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.75rem; }
        .incident-dot { width: 8px; height: 8px; border-radius: 50%; background: #f87171; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .incident-name { color: white; font-size: 0.875rem; font-weight: 500; line-height: 1.5; margin-bottom: 1rem; }
        .incident-metrics { background: rgba(0,0,0,0.5); border-radius: 0.25rem; padding: 0.75rem; font-size: 0.75rem; border: 1px solid rgba(127,29,29,0.5); }
        .metric-row { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
        .metric-row:last-child { margin-bottom: 0; }
        .metric-lbl { color: #9ca3af; }
        
        .all-clear { height: 100%; display: flex; flex-direction: column; items: center; justify-content: center; text-align: center; opacity: 0.6; min-height: 120px; }
        .shield-icon { font-size: 3rem; margin-bottom: 1rem; filter: drop-shadow(0 0 15px rgba(16,185,129,0.3)); }
        .shield-text { color: #34d399; font-weight: 600; font-size: 0.875rem; }
        .shield-sub { color: #6b7280; font-size: 0.75rem; margin-top: 0.25rem; }
        
        /* Diagnostics */
        .diag-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(31,41,55,0.6); padding-bottom: 0.75rem; margin-bottom: 0.75rem; }
        .diag-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .diag-lbl { font-size: 0.75rem; color: #9ca3af; }
        .diag-val { font-family: monospace; font-size: 0.85rem; }
        
        /* Override Box */
        .override-box { background: linear-gradient(to bottom right, rgba(49,46,129,0.2), rgba(30,58,138,0.1)); border: 1px solid rgba(99,102,241,0.2); }
        .override-title { font-size: 0.875rem; font-weight: bold; color: #a5b4fc; margin-bottom: 0.5rem; }
        .override-desc { font-size: 0.75rem; color: #9ca3af; line-height: 1.6; margin-bottom: 1.5rem; }
        .outage-btn { width: 100%; background-color: #2563eb; color: white; padding: 1rem; border-radius: 0.75rem; font-weight: 900; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; border: none; cursor: pointer; box-shadow: 0 0 20px rgba(37,99,235,0.4); transition: all 0.2s; }
        .outage-btn:hover:not(:disabled) { background-color: #3b82f6; box-shadow: 0 0 30px rgba(37,99,235,0.6); transform: translateY(-2px); }
        .outage-btn:active:not(:disabled) { transform: translateY(0); }
        .outage-btn:disabled { opacity: 0.4; cursor: not-allowed; animation: none; transform: none; box-shadow: none; }
        
        /* Components & Utilities */
        .bg-green { background-color: #10b981; } .bg-red { background-color: #ef4444; }
        .text-green { color: #34d399; } .text-red { color: #ef4444; } .text-warn { color: #facc15; } .text-info { color: #60a5fa; } .text-white { color: white; } .text-action { color: #c084fc; }
        .text-bold { font-weight: bold; }
        .text-shadow { text-shadow: 0 0 5px rgba(16,185,129,0.8); }
        .live-dot-container { position: relative; display: flex; width: 1rem; height: 1rem; }
        .live-dot { position: relative; display: inline-flex; width: 1rem; height: 1rem; border-radius: 50%; }
        .live-dot-ping { position: absolute; display: inline-flex; width: 100%; height: 100%; border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.75; }
        
        .toggle-btn { position: relative; display: inline-flex; height: 2rem; width: 4rem; align-items: center; border-radius: 9999px; border: none; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .toggle-on { background-color: #10b981; box-shadow: 0 0 20px rgba(16,185,129,0.6); }
        .toggle-off { background-color: #374151; }
        .toggle-knob { display: inline-block; height: 1.5rem; width: 1.5rem; border-radius: 50%; background-color: white; transform: translateX(0.25rem); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .knob-on { transform: translateX(2.25rem); }
        .auto-pilot-label { text-align: center; display: block; }
        
        /* Animations */
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
      `}} />
    </div>
  );
}

