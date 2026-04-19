"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GlobalNav from '../../../components/GlobalNav';

export default function AdminSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    // SLA Tiers (Turnaround time in hours)
    sla_critical_hours: 4.0,
    sla_high_hours: 8.0,
    sla_medium_hours: 24.0,   // 1 Day
    sla_low_hours: 72.0,      // 3 Days

    // Business Hours
    business_start_time: '09:00:00',
    business_end_time: '18:00:00',
    business_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    timezone: 'Asia/Kolkata',

    // AI Automation
    ai_auto_route_enabled: true,
    ai_sre_enabled: true,
    ai_postmortem_enabled: true,
    slack_notifications_enabled: false
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings({ ...settings, ...data.settings });
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        alert("Global configurations saved successfully!");
      } else {
        alert("Error saving: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to reach server");
    } finally {
      setSaving(false);
    }
  }

  const toggleDay = (day) => {
    setSettings(prev => {
      const days = [...prev.business_days];
      const idx = days.indexOf(day);
      if (idx > -1) days.splice(idx, 1);
      else days.push(day);
      return { ...prev, business_days: days };
    });
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      Loading workspace configurations...
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      <GlobalNav title="Global Settings" />
      
      <div className="settings-wrapper">
        <div className="settings-header">
          <div>
            <h1 className="page-title">Workspace Configuration</h1>
            <p className="page-subtitle">Configure global SLAs, Business Logic, and AI Operations to match your organizational requirements.</p>
          </div>
          <button onClick={handleSave} className="save-btn" disabled={saving}>
            {saving ? 'Applying...' : 'Save Configuration'}
          </button>
        </div>

        <form onSubmit={handleSave} className="settings-grid">
          
          {/* 1. SLA TAT Settings */}
          <div className="setting-card">
            <div className="card-header">
              <div className="icon-wrapper bg-red-100 text-red-600">⏱️</div>
              <h2>SLA Turnaround Time (TAT)</h2>
            </div>
            <p className="section-desc">Define the maximum acceptable resolution time (in hours) before a ticket is officially breached.</p>
            
            <div className="form-group-grid">
              <div className="input-group">
                <label>Critical Priority (Hours)</label>
                <input 
                  type="number" 
                  step="0.5"
                  value={settings.sla_critical_hours} 
                  onChange={e => setSettings({...settings, sla_critical_hours: parseFloat(e.target.value)})} 
                  className="number-input critical-input" 
                />
              </div>
              <div className="input-group">
                <label>High Priority (Hours)</label>
                <input 
                  type="number"
                  step="0.5"
                  value={settings.sla_high_hours} 
                  onChange={e => setSettings({...settings, sla_high_hours: parseFloat(e.target.value)})} 
                  className="number-input high-input" 
                />
              </div>
              <div className="input-group">
                <label>Medium Priority (Hours) <span className="hint">e.g. 24 = 1 Day</span></label>
                <input 
                  type="number"
                  step="1"
                  value={settings.sla_medium_hours} 
                  onChange={e => setSettings({...settings, sla_medium_hours: parseFloat(e.target.value)})} 
                  className="number-input medium-input" 
                />
              </div>
              <div className="input-group">
                <label>Low Priority (Hours)</label>
                <input 
                  type="number"
                  step="1"
                  value={settings.sla_low_hours} 
                  onChange={e => setSettings({...settings, sla_low_hours: parseFloat(e.target.value)})} 
                  className="number-input low-input" 
                />
              </div>
            </div>
          </div>

          {/* 2. Business Hours Settings */}
          <div className="setting-card">
            <div className="card-header">
              <div className="icon-wrapper bg-blue-100 text-blue-600">📅</div>
              <h2>Business Hours Logic</h2>
            </div>
            <p className="section-desc">SLAs will automatically pause outside of these hours and on weekends to reflect true business availability.</p>
            
            <div className="form-group-row">
              <div className="input-group" style={{ flex: 1 }}>
                <label>Daily Start Time</label>
                <input 
                  type="time" 
                  value={settings.business_start_time} 
                  onChange={e => setSettings({...settings, business_start_time: e.target.value})} 
                  className="text-input" 
                />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label>Daily End Time</label>
                <input 
                  type="time" 
                  value={settings.business_end_time} 
                  onChange={e => setSettings({...settings, business_end_time: e.target.value})} 
                  className="text-input" 
                />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label>Timezone</label>
                <select 
                  value={settings.timezone} 
                  onChange={e => setSettings({...settings, timezone: e.target.value})} 
                  className="text-input"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="UTC">Universal Time (UTC)</option>
                </select>
              </div>
            </div>

            <div className="input-group" style={{ marginTop: '1.5rem' }}>
              <label>Operating Days</label>
              <div className="days-row">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                  const isActive = settings.business_days.includes(day);
                  return (
                    <button 
                      key={day} 
                      type="button" 
                      onClick={() => toggleDay(day)}
                      className={`day-btn ${isActive ? 'day-active' : 'day-inactive'}`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. AI Automation Options */}
          <div className="setting-card full-width">
            <div className="card-header">
              <div className="icon-wrapper bg-purple-100 text-purple-600">🤖</div>
              <h2>AI Platform Features</h2>
            </div>
            <p className="section-desc">Toggle the operational availability of NexDesk's deep-learning components.</p>
            
            <div className="toggle-list">
              <label className="toggle-item">
                <div className="toggle-text">
                  <h3>Autonomous Issue Routing</h3>
                  <p>AI automatically assigns tickets to appropriate L1, L2 or Developer teams based on contextual NLP analysis.</p>
                </div>
                <div className="toggle-switch">
                  <input type="checkbox" checked={settings.ai_auto_route_enabled} onChange={e => setSettings({...settings, ai_auto_route_enabled: e.target.checked})} />
                  <span className="slider"></span>
                </div>
              </label>

              <label className="toggle-item">
                <div className="toggle-text">
                  <h3>Agentic AI SRE (Auto-Healer)</h3>
                  <p>Encompasses Level-4 AI Operations. Allows the AI to autonomously fire commands to unblock outages directly in production.</p>
                </div>
                <div className="toggle-switch">
                  <input type="checkbox" checked={settings.ai_sre_enabled} onChange={e => setSettings({...settings, ai_sre_enabled: e.target.checked})} />
                  <span className="slider"></span>
                </div>
              </label>

              <label className="toggle-item">
                <div className="toggle-text">
                  <h3>AI Postmortem Architect</h3>
                  <p>Triggers a large language model to compile timeline logs and write incident reports directly after high-priority closures.</p>
                </div>
                <div className="toggle-switch">
                  <input type="checkbox" checked={settings.ai_postmortem_enabled} onChange={e => setSettings({...settings, ai_postmortem_enabled: e.target.checked})} />
                  <span className="slider"></span>
                </div>
              </label>
              
              <label className="toggle-item border-none">
                <div className="toggle-text">
                  <h3>Global Slack/Teams Webhooks</h3>
                  <p>Push critical SLA breaches and auto-healer actions to internal engineering channels.</p>
                </div>
                <div className="toggle-switch">
                  <input type="checkbox" checked={settings.slack_notifications_enabled} onChange={e => setSettings({...settings, slack_notifications_enabled: e.target.checked})} />
                  <span className="slider"></span>
                </div>
              </label>
            </div>
          </div>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .settings-wrapper { max-width: 1000px; margin: 0 auto; padding: 2rem 1.5rem; }
        .settings-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
        .page-title { font-size: 1.5rem; font-weight: 800; color: #111827; letter-spacing: -0.5px; margin: 0 0 0.5rem 0; }
        .page-subtitle { color: #6b7280; font-size: 0.875rem; max-width: 600px; line-height: 1.5; margin: 0; }
        
        .save-btn { background: #2563eb; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 0.5rem; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(37,99,235,0.2); }
        .save-btn:hover { background: #1d4ed8; transform: translateY(-1px); }
        .save-btn:disabled { background: #9ca3af; cursor: wait; transform: none; box-shadow: none; }

        .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .full-width { grid-column: 1 / -1; }

        .setting-card { background: white; border-radius: 1rem; border: 1px solid #e5e7eb; padding: 1.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        .card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
        .icon-wrapper { width: 32px; height: 32px; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
        .card-header h2 { font-size: 1.125rem; font-weight: 700; margin: 0; color: #1f2937; }
        .section-desc { font-size: 0.8125rem; color: #6b7280; margin: 0 0 1.5rem 0; line-height: 1.5; }

        .form-group-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        .form-group-row { display: flex; gap: 1rem; align-items: flex-end; }
        
        .input-group label { display: block; font-size: 0.75rem; font-weight: 600; color: #4b5563; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
        .hint { color: #9ca3af; font-weight: 400; text-transform: none; letter-spacing: normal; }
        
        .number-input, .text-input { width: 100%; padding: 0.625rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 0.875rem; color: #111827; font-family: inherit; transition: border-color 0.15s; outline: none; background: #f9fafb; font-weight: 600; }
        .number-input:focus, .text-input:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .critical-input { border-left: 4px solid #ef4444; } .high-input { border-left: 4px solid #f59e0b; }
        .medium-input { border-left: 4px solid #fcd34d; } .low-input { border-left: 4px solid #10b981; }

        .days-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .day-btn { padding: 0.5rem 1rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
        .day-active { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
        .day-inactive { background: #f3f4f6; color: #6b7280; border-color: #e5e7eb; }
        .day-inactive:hover { background: #e5e7eb; }

        .toggle-list { display: flex; flex-direction: column; }
        .toggle-item { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 0; border-bottom: 1px solid #f3f4f6; cursor: pointer; }
        .border-none { border-bottom: none; padding-bottom: 0; }
        .toggle-text h3 { margin: 0 0 0.25rem 0; font-size: 0.95rem; font-weight: 600; color: #111827; }
        .toggle-text p { margin: 0; font-size: 0.8125rem; color: #6b7280; max-width: 85%; line-height: 1.5; }

        /* The Switch (Toggle) */
        .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .3s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
        input:checked + .slider { background-color: #2563eb; }
        input:checked + .slider:before { transform: translateX(20px); }

        @media (max-width: 768px) {
          .settings-grid { grid-template-columns: 1fr; }
          .form-group-row { flex-direction: column; align-items: stretch; }
          .settings-header { flex-direction: column; gap: 1rem; }
        }
      `}} />
    </div>
  );
}

