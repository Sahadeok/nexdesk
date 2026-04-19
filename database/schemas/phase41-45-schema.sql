-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PHASES 41–45 — BUSINESS INTELLIGENCE SUPREMACY LAYER            ║
-- ║  P41: ROI Intelligence Engine | P42: Support DNA Profiler         ║
-- ║  P43: Voice Support AI | P44: Business Context Engine             ║
-- ║  P45: Process Impact Analyzer                                     ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══ P41: ROI INTELLIGENCE ENGINE ══════════════════════════════════
-- Tracks every rupee NexDesk saves the business in real-time

CREATE TABLE IF NOT EXISTS roi_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period TEXT NOT NULL,                          -- '2026-03', 'Q1-2026', 'week-13'
  period_type TEXT DEFAULT 'monthly',            -- daily, weekly, monthly, quarterly

  -- Hard Savings (proven math)
  agent_hours_saved NUMERIC(10,2) DEFAULT 0,     -- hours AI automation saved
  agent_cost_per_hour_inr NUMERIC(8,2) DEFAULT 500,
  agent_cost_savings_inr NUMERIC(15,2) DEFAULT 0,

  tickets_auto_resolved INTEGER DEFAULT 0,
  avg_manual_resolve_cost_inr NUMERIC(8,2) DEFAULT 750,
  auto_resolve_savings_inr NUMERIC(15,2) DEFAULT 0,

  sla_breaches_prevented INTEGER DEFAULT 0,
  avg_sla_penalty_inr NUMERIC(10,2) DEFAULT 25000,
  sla_savings_inr NUMERIC(15,2) DEFAULT 0,

  escalations_prevented INTEGER DEFAULT 0,
  avg_escalation_cost_inr NUMERIC(8,2) DEFAULT 2000,
  escalation_savings_inr NUMERIC(15,2) DEFAULT 0,

  -- Soft Value (AI-estimated)
  churn_prevented_count INTEGER DEFAULT 0,
  churn_value_saved_inr NUMERIC(15,2) DEFAULT 0,
  brand_damage_prevented_inr NUMERIC(15,2) DEFAULT 0,

  -- Total
  total_hard_savings_inr NUMERIC(15,2) DEFAULT 0,
  total_soft_value_inr NUMERIC(15,2) DEFAULT 0,
  total_roi_inr NUMERIC(15,2) DEFAULT 0,
  nexdesk_cost_inr NUMERIC(12,2) DEFAULT 15000,  -- platform cost for period
  roi_multiple NUMERIC(6,2) DEFAULT 0,            -- 12.5x means ₹12.5 return per ₹1 spent

  -- AI Narrative
  ai_roi_story TEXT,                              -- exec-level ROI narrative
  ai_top_wins JSONB DEFAULT '[]',
  ai_opportunities JSONB DEFAULT '[]',

  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roi_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,                       -- auto_resolve, sla_save, escalation_prevent, churn_prevent
  ticket_id UUID,
  value_inr NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  agent_minutes_saved INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P42: SUPPORT DNA PROFILER ══════════════════════════════════════
-- Full organizational DNA: team patterns, strengths, blind spots, culture

CREATE TABLE IF NOT EXISTS support_dna_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_period TEXT NOT NULL,                   -- '2026-03'
  profile_type TEXT DEFAULT 'team',               -- team, agent, category

  -- Entity
  entity_id TEXT,                                 -- agent_id or 'team' or category name
  entity_name TEXT,

  -- DNA Dimensions (0-100 each)
  speed_dna INTEGER DEFAULT 0,                    -- how fast vs industry
  quality_dna INTEGER DEFAULT 0,                  -- resolution quality
  empathy_dna INTEGER DEFAULT 0,                  -- emotional intelligence in responses
  technical_dna INTEGER DEFAULT 0,                -- technical depth
  proactivity_dna INTEGER DEFAULT 0,              -- catches issues before customers notice
  collaboration_dna INTEGER DEFAULT 0,            -- cross-team effectiveness
  learning_dna INTEGER DEFAULT 0,                 -- improves over time?
  consistency_dna INTEGER DEFAULT 0,              -- same quality regardless of ticket type

  -- Overall DNA Score
  overall_dna_score INTEGER DEFAULT 0,
  dna_grade TEXT DEFAULT 'B',                     -- S, A+, A, B, C, D

  -- Superpower and Kryptonite
  superpower TEXT,                                -- what they're world-class at
  kryptonite TEXT,                                -- their critical weakness
  blind_spots JSONB DEFAULT '[]',                 -- issues they consistently miss

  -- Patterns
  peak_performance_time TEXT,                     -- '10am-12pm', 'Tuesday-Thursday'
  performance_drop_triggers JSONB DEFAULT '[]',   -- what causes quality drops
  resolution_style TEXT,                          -- methodical, intuitive, collaborative

  -- AI Insights
  ai_prescription JSONB DEFAULT '[]',             -- [{issue, fix, priority}]
  ai_coaching_plan TEXT,
  team_culture_analysis TEXT,

  -- Benchmarks
  industry_percentile INTEGER DEFAULT 50,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P43: VOICE SUPPORT AI ══════════════════════════════════════════
-- AI-powered voice tickets: transcription, analysis, voice replies

CREATE TABLE IF NOT EXISTS voice_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID,
  session_id TEXT UNIQUE NOT NULL,
  direction TEXT DEFAULT 'inbound',               -- inbound (customer→us), outbound (us→customer)

  -- Audio Metadata
  duration_sec INTEGER DEFAULT 0,
  language_detected TEXT DEFAULT 'en',
  language_confidence_pct INTEGER DEFAULT 0,
  accent_detected TEXT,

  -- Transcription
  raw_transcript TEXT,
  cleaned_transcript TEXT,                        -- removed filler words, corrected errors
  speaker_segments JSONB DEFAULT '[]',            -- [{speaker, start_sec, end_sec, text}]

  -- AI Voice Analysis
  ai_sentiment TEXT DEFAULT 'neutral',
  ai_emotion_detected TEXT,                       -- calm, frustrated, panic, crying, angry
  ai_urgency_score INTEGER DEFAULT 0,
  ai_key_issues JSONB DEFAULT '[]',               -- issues extracted from voice
  ai_action_items JSONB DEFAULT '[]',
  ai_summary TEXT,

  -- Voice Biometrics (privacy-safe metadata only)
  speaking_pace TEXT,                             -- slow, normal, fast, rushed
  stress_indicators JSONB DEFAULT '[]',           -- pauses, voice breaks, repetition

  -- Auto-ticket
  auto_ticket_created BOOLEAN DEFAULT FALSE,
  auto_ticket_priority TEXT,

  -- Voice Reply (AI generates script)
  ai_reply_script TEXT,
  ai_reply_tone TEXT,

  processing_status TEXT DEFAULT 'pending',       -- pending, transcribed, analyzed, replied
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P44: BUSINESS CONTEXT ENGINE ═══════════════════════════════════
-- Understands WHY a ticket matters to the business beyond its technical content

CREATE TABLE IF NOT EXISTS business_contexts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID UNIQUE NOT NULL,

  -- Business Timing Context
  is_end_of_quarter BOOLEAN DEFAULT FALSE,
  is_product_launch_week BOOLEAN DEFAULT FALSE,
  is_audit_period BOOLEAN DEFAULT FALSE,
  is_peak_traffic_period BOOLEAN DEFAULT FALSE,
  is_payroll_run_day BOOLEAN DEFAULT FALSE,
  is_board_meeting_week BOOLEAN DEFAULT FALSE,
  business_calendar_event TEXT,

  -- Customer Business Context
  customer_industry TEXT,
  customer_company_size TEXT,                     -- startup, smb, enterprise, large-enterprise
  customer_fiscal_period TEXT,                    -- their Q4, year-end, etc.
  customer_recent_activity TEXT,                  -- just raised funding, major launch, IPO prep

  -- Affected Process Criticality
  affected_department TEXT,
  affected_process TEXT,                          -- payroll, customer-onboarding, revenue-collection
  process_criticality TEXT,                       -- mission-critical, high, medium, low
  downstream_dependency_count INTEGER DEFAULT 0,

  -- Business Risk Score (our unique metric)
  business_risk_score INTEGER DEFAULT 0,          -- 0-100
  business_risk_level TEXT DEFAULT 'low',         -- critical, high, medium, low
  risk_escalation_required BOOLEAN DEFAULT FALSE,

  -- AI Business Analysis
  ai_business_context_summary TEXT,
  ai_business_priority_reason TEXT,
  ai_stakeholder_impact TEXT,                     -- who in the org is impacted
  ai_recommended_response_strategy TEXT,

  -- Context Source
  context_source TEXT DEFAULT 'ai_inferred',      -- ai_inferred, manual, calendar_integrated
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P45: PROCESS IMPACT ANALYZER ════════════════════════════════════
-- Maps how a ticket/outage cascades through business processes like a shockwave

CREATE TABLE IF NOT EXISTS process_impact_maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID,
  analysis_name TEXT,

  -- Origin
  origin_system TEXT NOT NULL,                    -- the system/process that failed
  origin_team TEXT,
  origin_severity TEXT DEFAULT 'medium',

  -- Impact Graph (directed acyclic graph of affected processes)
  impact_nodes JSONB DEFAULT '[]',
  /*
    [{
      id: "node_1",
      process: "Payment Collection",
      team: "Finance",
      severity: "critical",
      estimated_delay_min: 240,
      revenue_impact_inr: 500000,
      depends_on: ["node_0"],
      status: "blocked|degraded|ok"
    }]
  */

  -- Blast Wave Metrics
  total_processes_impacted INTEGER DEFAULT 0,
  total_teams_impacted INTEGER DEFAULT 0,
  total_people_blocked INTEGER DEFAULT 0,
  max_cascade_depth INTEGER DEFAULT 0,            -- how many hops from origin
  estimated_total_delay_hours NUMERIC(8,2) DEFAULT 0,

  -- Financial
  direct_revenue_impact_inr NUMERIC(15,2) DEFAULT 0,
  indirect_revenue_impact_inr NUMERIC(15,2) DEFAULT 0,
  total_impact_inr NUMERIC(15,2) DEFAULT 0,

  -- Recovery
  critical_path_fix TEXT,                         -- the ONE fix that unblocks everything
  recovery_sequence JSONB DEFAULT '[]',            -- [{step, action, unblocks, time_min}]
  estimated_recovery_min INTEGER DEFAULT 0,

  -- AI Analysis
  ai_impact_narrative TEXT,
  ai_priority_justification TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ INDEXES ════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_roi_period ON roi_snapshots(period, period_type);
CREATE INDEX IF NOT EXISTS idx_roi_events_ticket ON roi_events(ticket_id);
CREATE INDEX IF NOT EXISTS idx_roi_events_type ON roi_events(event_type);
CREATE INDEX IF NOT EXISTS idx_dna_entity ON support_dna_profiles(entity_id, profile_period);
CREATE INDEX IF NOT EXISTS idx_dna_grade ON support_dna_profiles(dna_grade);
CREATE INDEX IF NOT EXISTS idx_voice_ticket ON voice_interactions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_voice_session ON voice_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_bizctx_ticket ON business_contexts(ticket_id);
CREATE INDEX IF NOT EXISTS idx_bizctx_risk ON business_contexts(business_risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_process_ticket ON process_impact_maps(ticket_id);

NOTIFY pgrst, 'reload schema';
