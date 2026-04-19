-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 16 — AI POSTMORTEM WRITER                                  ║
-- ║  Incident Forensics & Auto-Generated Postmortem Reports           ║
-- ║  NexDesk — The Future of IT Support                               ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ── 1. POSTMORTEMS ──────────────────────────────────────────────────
-- Core postmortem records with AI-generated content and PQI scoring
CREATE TABLE IF NOT EXISTS postmortems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pm_number TEXT UNIQUE NOT NULL,               -- PM-2026-0001
  title TEXT NOT NULL,
  
  -- Source Incident
  incident_ticket_id UUID,                      -- Primary ticket that triggered this PM
  related_ticket_ids JSONB DEFAULT '[]',        -- All related tickets
  related_cr_ids JSONB DEFAULT '[]',            -- Related change requests
  incident_severity TEXT DEFAULT 'medium',      -- critical, high, medium, low
  incident_type TEXT DEFAULT 'outage',          -- outage, degradation, security, data_loss, near_miss
  
  -- AI-Generated Content (6 formats)
  ai_executive_brief TEXT,                      -- 1-page CXO summary
  ai_technical_deepdive TEXT,                   -- Full technical report
  ai_narrative_story TEXT,                      -- Human-readable incident story
  ai_regulatory_report TEXT,                    -- RBI/SEBI formatted
  ai_lessons_learned TEXT,                      -- Key takeaways
  ai_prevention_plan TEXT,                      -- Systemic prevention measures
  
  -- Incident Metrics
  incident_start TIMESTAMPTZ,
  incident_end TIMESTAMPTZ,
  time_to_detect_min INTEGER DEFAULT 0,         -- How long to detect
  time_to_respond_min INTEGER DEFAULT 0,        -- How long before first action
  time_to_resolve_min INTEGER DEFAULT 0,        -- Total resolution time (MTTR)
  users_affected INTEGER DEFAULT 0,
  transactions_affected INTEGER DEFAULT 0,
  revenue_impact_inr NUMERIC DEFAULT 0,         -- ₹ impact
  services_affected JSONB DEFAULT '[]',
  
  -- AI Analysis
  ai_summary TEXT,
  ai_impact_analysis TEXT,
  ai_what_went_well TEXT,
  ai_what_went_wrong TEXT,
  ai_contributing_factors JSONB DEFAULT '[]',
  ai_systemic_issues JSONB DEFAULT '[]',
  
  -- Postmortem Quality Index (PQI)
  pqi_score INTEGER DEFAULT 0,                  -- 0-100
  pqi_timeline_completeness INTEGER DEFAULT 0,  -- 0-100
  pqi_root_cause_depth INTEGER DEFAULT 0,       -- 0-100
  pqi_action_specificity INTEGER DEFAULT 0,     -- 0-100
  pqi_lessons_quality INTEGER DEFAULT 0,        -- 0-100
  pqi_prevention_measures INTEGER DEFAULT 0,    -- 0-100
  
  -- Historical Pattern
  similar_incident_count INTEGER DEFAULT 0,
  ai_recurring_pattern TEXT,
  past_action_items_status TEXT,                -- "X of Y completed from similar incidents"
  
  -- Blame-Free Analysis
  blame_free_mode BOOLEAN DEFAULT TRUE,
  
  -- Status & Lifecycle
  status TEXT DEFAULT 'generating',             -- generating, draft, review, approved, published, archived
  generated_by UUID REFERENCES profiles(id),
  reviewed_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. POSTMORTEM TIMELINE EVENTS ───────────────────────────────────
-- Reconstructed timeline from multiple data sources
CREATE TABLE IF NOT EXISTS postmortem_timeline_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  postmortem_id UUID REFERENCES postmortems(id) ON DELETE CASCADE,
  
  event_time TIMESTAMPTZ NOT NULL,
  event_type TEXT NOT NULL,                     -- error, alert, action, communication, escalation, deployment, rollback, resolution, detection, recovery
  source TEXT DEFAULT 'ai_reconstructed',       -- ticket, session_event, health_log, cr_deployment, audit_trail, manual, ai_reconstructed
  source_id TEXT,                               -- ID of the source record
  
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'info',                 -- critical, high, medium, low, info
  
  actor TEXT,                                   -- Who/What took action
  affected_system TEXT,                         -- Which system was affected
  
  ai_significance TEXT,                         -- AI explains why this event matters
  is_key_moment BOOLEAN DEFAULT FALSE,          -- Highlighted on timeline
  
  metadata JSONB DEFAULT '{}',                  -- Extra data from source
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. POSTMORTEM ROOT CAUSES ───────────────────────────────────────
-- Multi-level root cause chain (parent-child causality)
CREATE TABLE IF NOT EXISTS postmortem_root_causes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  postmortem_id UUID REFERENCES postmortems(id) ON DELETE CASCADE,
  parent_cause_id UUID REFERENCES postmortem_root_causes(id),  -- NULL for top-level symptom
  
  level INTEGER DEFAULT 0,                     -- 0=symptom, 1=proximate, 2=contributing, 3=systemic, 4=organizational
  level_label TEXT,                            -- "Symptom", "Proximate Cause", "Contributing Factor", "Systemic Root Cause", "Organizational Factor"
  
  title TEXT NOT NULL,
  description TEXT,
  evidence TEXT,                               -- What data supports this cause
  confidence_pct INTEGER DEFAULT 0,            -- 0-100% AI confidence
  
  category TEXT DEFAULT 'technical',           -- technical, process, human, organizational, external
  is_preventable BOOLEAN DEFAULT TRUE,
  
  ai_explanation TEXT,                         -- Detailed AI analysis of this cause
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. POSTMORTEM ACTION ITEMS ──────────────────────────────────────
-- AI-generated with tracking, linked to root causes
CREATE TABLE IF NOT EXISTS postmortem_action_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  postmortem_id UUID REFERENCES postmortems(id) ON DELETE CASCADE,
  root_cause_id UUID REFERENCES postmortem_root_causes(id),
  
  title TEXT NOT NULL,
  description TEXT,
  action_type TEXT DEFAULT 'corrective',       -- corrective, preventive, detective, improvement
  priority TEXT DEFAULT 'medium',              -- critical, high, medium, low
  
  owner TEXT,                                  -- Team or person responsible
  deadline TEXT,                               -- "Within 1 week", "Q2 2026", etc.
  
  status TEXT DEFAULT 'open',                  -- open, in_progress, completed, cancelled, overdue
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  
  -- Effectiveness Tracking
  expected_impact TEXT,                        -- "Reduce Payment Gateway outages by 80%"
  actual_impact TEXT,
  linked_ticket_id UUID,                       -- If this creates a follow-up ticket
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. POSTMORTEM TEMPLATES ─────────────────────────────────────────
-- Industry-specific report templates
CREATE TABLE IF NOT EXISTS postmortem_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  industry TEXT DEFAULT 'generic',             -- generic, bfsi, healthcare, ecommerce
  description TEXT,
  
  sections JSONB DEFAULT '[]',                 -- [{title, required, ai_prompt_hint}]
  regulatory_requirements JSONB DEFAULT '[]',  -- Framework requirements met by this template
  
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pm_status ON postmortems(status);
CREATE INDEX IF NOT EXISTS idx_pm_severity ON postmortems(incident_severity);
CREATE INDEX IF NOT EXISTS idx_pm_tenant ON postmortems(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pm_ticket ON postmortems(incident_ticket_id);
CREATE INDEX IF NOT EXISTS idx_pm_timeline_pm ON postmortem_timeline_events(postmortem_id);
CREATE INDEX IF NOT EXISTS idx_pm_timeline_time ON postmortem_timeline_events(event_time);
CREATE INDEX IF NOT EXISTS idx_pm_rc_pm ON postmortem_root_causes(postmortem_id);
CREATE INDEX IF NOT EXISTS idx_pm_rc_parent ON postmortem_root_causes(parent_cause_id);
CREATE INDEX IF NOT EXISTS idx_pm_actions_pm ON postmortem_action_items(postmortem_id);
CREATE INDEX IF NOT EXISTS idx_pm_actions_status ON postmortem_action_items(status);

-- ── DEFAULT TEMPLATES ──────────────────────────────────────────────────
INSERT INTO postmortem_templates (name, industry, description, sections, is_default) VALUES
('Standard IT Postmortem', 'generic', 'Universal postmortem template following SRE best practices', 
 '[{"title":"Executive Summary","required":true},{"title":"Incident Timeline","required":true},{"title":"Root Cause Analysis","required":true},{"title":"Impact Assessment","required":true},{"title":"Action Items","required":true},{"title":"Lessons Learned","required":true}]',
 true),
('BFSI Regulatory Postmortem', 'bfsi', 'RBI/SEBI compliant incident postmortem with regulatory fields',
 '[{"title":"Incident Classification (Cat A/B/C)","required":true},{"title":"RBI Mandatory Timeline","required":true},{"title":"Customer Impact Assessment","required":true},{"title":"Financial Impact (₹)","required":true},{"title":"Root Cause Analysis","required":true},{"title":"Corrective Actions with Deadlines","required":true},{"title":"SEBI CSCRF Compliance","required":true}]',
 false),
('Healthcare Incident Review', 'healthcare', 'HIPAA-aware clinical IT incident postmortem',
 '[{"title":"Patient Impact Assessment","required":true},{"title":"PHI Exposure Analysis","required":true},{"title":"System Downtime Log","required":true},{"title":"Root Cause Analysis","required":true},{"title":"HIPAA Compliance Status","required":true},{"title":"Corrective Actions","required":true}]',
 false)
ON CONFLICT DO NOTHING;

-- ── RELOAD SCHEMA ──────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
