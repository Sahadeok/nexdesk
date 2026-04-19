-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PHASES 23-30 — PERCEPTION & INTELLIGENCE HUB                    ║
-- ║  P23: Ticket Mood DNA | P24: AI Code Surgeon                      ║
-- ║  P25: Neural Translator | P26: Revenue Blast Radius               ║
-- ║  P27: Session Time Machine | P28: Executive War Room              ║
-- ║  P29: AI Ticket Genome | P30: Adaptive Command Center             ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══ P23: TICKET MOOD DNA ══════════════════════════════════════════
-- Not just "positive/negative" — full emotional fingerprint per ticket

CREATE TABLE IF NOT EXISTS ticket_mood_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID UNIQUE NOT NULL,

  -- Primary Emotion (0-100 intensity each)
  anger_score INTEGER DEFAULT 0,
  frustration_score INTEGER DEFAULT 0,
  anxiety_score INTEGER DEFAULT 0,
  satisfaction_score INTEGER DEFAULT 0,
  confusion_score INTEGER DEFAULT 0,
  urgency_score INTEGER DEFAULT 0,
  desperation_score INTEGER DEFAULT 0,

  -- Composite Scores
  overall_sentiment TEXT DEFAULT 'neutral',        -- critical_distress, frustrated, neutral, satisfied, happy
  toxicity_risk BOOLEAN DEFAULT FALSE,             -- customer may churn
  escalation_risk_pct INTEGER DEFAULT 0,           -- 0-100 chance of escalation based on mood
  
  -- Mood Trajectory (per comment analysis)
  mood_timeline JSONB DEFAULT '[]',                -- [{time, emotion, score, trigger_word}]
  mood_shift TEXT DEFAULT 'stable',                -- improving, stable, declining, volatile
  
  -- Trigger Analysis
  key_trigger_phrases JSONB DEFAULT '[]',          -- phrases causing strongest emotion
  communication_style TEXT DEFAULT 'professional', -- aggressive, distressed, professional, confused
  
  -- AI Actions
  ai_suggested_tone TEXT,                          -- how agent should respond
  ai_priority_boost INTEGER DEFAULT 0,             -- extra priority points from mood
  ai_empathy_script TEXT,                          -- what opening line to use
  
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P24: AI CODE SURGEON ══════════════════════════════════════════
-- Analyzes error logs, decompiles stack traces, proposes actual code patches

CREATE TABLE IF NOT EXISTS code_surgery_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID,
  
  -- Input
  error_log TEXT,
  stack_trace TEXT,
  language TEXT,                                   -- python, javascript, java, go, etc.
  framework TEXT,                                  -- react, django, spring, etc.
  runtime_version TEXT,
  
  -- Diagnosis
  error_type TEXT,                                 -- NullPointerException, TypeError, etc.
  error_chain JSONB DEFAULT '[]',                  -- [{level, file, line, function, cause}]
  root_file TEXT,
  root_line INTEGER,
  
  -- Code Patches (the magic)
  patches JSONB DEFAULT '[]',                      -- [{file, original_code, patched_code, confidence_pct, explanation}]
  
  -- Fix Strategy
  fix_approach TEXT,                               -- one-line-fix, refactor, architectural-change
  estimated_fix_time TEXT,
  regression_risk TEXT,                            -- low, medium, high
  
  -- Similar Past Bugs
  similar_bugs JSONB DEFAULT '[]',                 -- [{ticket_number, how_fixed, success_rate}]
  
  -- Testing
  suggested_test_cases JSONB DEFAULT '[]',
  
  confidence_pct INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P25: NEURAL TRANSLATOR ════════════════════════════════════════
-- Not just translate — understands IT context, preserves technical terms

CREATE TABLE IF NOT EXISTS neural_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type TEXT NOT NULL,                       -- ticket, kb_article, resolution, comment
  source_id UUID,
  source_text TEXT NOT NULL,
  source_language TEXT DEFAULT 'en',
  
  -- Translations
  translations JSONB DEFAULT '{}',                 -- {hi: "...", ta: "...", ar: "...", fr: "..."}
  
  -- Smart Handling
  preserved_terms JSONB DEFAULT '[]',              -- technical terms NOT translated (DNS, API, etc.)
  cultural_adaptations JSONB DEFAULT '[]',         -- phrases adapted for culture
  formality_level TEXT DEFAULT 'professional',
  
  -- Quality
  translation_confidence JSONB DEFAULT '{}',       -- {hi: 97, ta: 89}
  back_translated TEXT,                            -- translate back to English to verify
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P26: REVENUE BLAST RADIUS ═════════════════════════════════════
-- Maps EXACTLY how much revenue a ticket/outage is destroying per minute

CREATE TABLE IF NOT EXISTS revenue_blast_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID UNIQUE,
  
  -- Business Context
  affected_service TEXT,
  affected_user_count INTEGER DEFAULT 0,
  transactions_blocked_per_min NUMERIC(10,2) DEFAULT 0,
  avg_transaction_value_inr NUMERIC(12,2) DEFAULT 0,
  
  -- Real-time Revenue Loss
  revenue_loss_per_minute_inr NUMERIC(12,2) DEFAULT 0,
  total_revenue_lost_inr NUMERIC(15,2) DEFAULT 0,
  
  -- Impact Cascade
  cascade_impacts JSONB DEFAULT '[]',              -- [{system, impact, revenue_pct}]
  secondary_loss_inr NUMERIC(15,2) DEFAULT 0,     -- indirect losses (brand, SLA penalties)
  
  -- SLA Penalty
  sla_penalty_inr NUMERIC(12,2) DEFAULT 0,
  penalty_accrual_rate NUMERIC(10,2) DEFAULT 0,   -- per hour
  
  -- Recovery Projection
  recovery_priority_score INTEGER DEFAULT 0,       -- how urgent resolution is financially
  break_even_minutes INTEGER DEFAULT 0,            -- time to justify emergency fix spending
  
  -- AI Calculation
  ai_assumptions TEXT,
  calculation_method TEXT DEFAULT 'transactional',
  
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P27: SESSION TIME MACHINE ═════════════════════════════════════
-- Full session replay: mouse, clicks, API calls, errors, rage-clicks

CREATE TABLE IF NOT EXISTS session_recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_token TEXT UNIQUE NOT NULL,
  ticket_id UUID,
  app_id TEXT,
  
  -- Session Metadata
  user_identifier TEXT,                            -- anonymized user id
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_sec INTEGER DEFAULT 0,
  
  -- Events Stream
  events JSONB DEFAULT '[]',                       -- [{t:1234, type:"click|scroll|input|error|api", data:{}}]
  
  -- AI Analysis
  ai_detected_frustrations JSONB DEFAULT '[]',     -- rage-clicks, dead clicks, u-turns
  ai_journey_summary TEXT,
  ai_ux_issues JSONB DEFAULT '[]',
  ai_error_chain JSONB DEFAULT '[]',               -- what events led to the error
  
  -- Highlights
  rage_click_count INTEGER DEFAULT 0,
  dead_click_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  -- Playback
  compressed_events JSONB DEFAULT '{}',            -- optimized for fast playback
  keyframes JSONB DEFAULT '[]',                    -- [{time, screenshot_base64_thumb}]
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P28: EXECUTIVE WAR ROOM ═══════════════════════════════════════
-- CXO-level real-time ops board with business, SLA, revenue all in one

CREATE TABLE IF NOT EXISTS war_room_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Business KPIs
  total_revenue_at_risk_inr NUMERIC(15,2) DEFAULT 0,
  tickets_in_sla_breach INTEGER DEFAULT 0,
  critical_incidents INTEGER DEFAULT 0,
  mttr_today_min INTEGER DEFAULT 0,
  
  -- System Health
  systems_health JSONB DEFAULT '{}',               -- {payments: 99, auth: 100, api: 87}
  overall_health_pct INTEGER DEFAULT 100,
  
  -- Team Performance
  team_performance JSONB DEFAULT '{}',             -- {L1: {resolved:12, avg_time:45}, L2: {...}}
  
  -- Trend: last 24h vs previous 24h
  ticket_volume_trend NUMERIC(5,2) DEFAULT 0,     -- +12% means volume up
  resolution_speed_trend NUMERIC(5,2) DEFAULT 0,
  
  -- AI Insights (board-level language)
  ai_boardroom_brief TEXT,                         -- 2-3 sentences for CXO
  ai_red_flags JSONB DEFAULT '[]',                 -- things that need exec attention
  ai_wins JSONB DEFAULT '[]',                      -- positive highlights
  
  -- Predictions
  predicted_escalations_next_4h INTEGER DEFAULT 0,
  predicted_revenue_risk_next_4h NUMERIC(15,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P29: AI TICKET GENOME ═════════════════════════════════════════
-- Every ticket gets a full DNA profile: category, priority, team, root cause,
-- expected resolution time — all predicted before a human touches it

CREATE TABLE IF NOT EXISTS ticket_genomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID UNIQUE NOT NULL,
  
  -- Auto-Classification (before human sees it)
  detected_category TEXT,
  detected_subcategory TEXT,
  detected_priority TEXT,
  detected_team TEXT,                              -- L1, L2, DevOps, DB, Security
  detected_framework TEXT,
  detected_language TEXT,
  
  -- Confidence
  classification_confidence_pct INTEGER DEFAULT 0,
  
  -- Predictions
  predicted_resolution_min INTEGER DEFAULT 0,
  predicted_escalation_probability_pct INTEGER DEFAULT 0,
  predicted_complexity TEXT,                       -- trivial, simple, medium, complex, epic
  
  -- Knowledge Links
  matching_kb_article_ids JSONB DEFAULT '[]',
  similar_ticket_ids JSONB DEFAULT '[]',
  suggested_fix TEXT,
  
  -- Business Impact
  business_impact_score INTEGER DEFAULT 0,         -- 0-100
  customer_type TEXT,                              -- vip, regular, trial, enterprise
  
  -- Tags (AI-generated)
  ai_tags JSONB DEFAULT '[]',
  ai_root_cause_hypothesis TEXT,
  
  -- Routing Decision
  auto_routed BOOLEAN DEFAULT FALSE,
  auto_routed_to TEXT,
  routing_reason TEXT,
  
  genome_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P30: ADAPTIVE COMMAND CENTER ══════════════════════════════════
-- Dashboard that LEARNS what each user cares about and reorganizes itself

CREATE TABLE IF NOT EXISTS user_dashboard_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES profiles(id),
  
  -- Learned Preferences
  preferred_tab_order JSONB DEFAULT '[]',          -- tabs sorted by usage frequency
  most_used_filters JSONB DEFAULT '[]',
  most_viewed_metrics JSONB DEFAULT '[]',
  
  -- Behavior Tracking
  click_heatmap JSONB DEFAULT '{}',               -- {element_id: click_count}
  avg_session_duration_sec INTEGER DEFAULT 0,
  last_active_section TEXT,
  
  -- AI Personalization
  ai_suggested_layout JSONB DEFAULT '{}',
  ai_shortcut_suggestions JSONB DEFAULT '[]',
  
  -- Widget Layout (drag-and-drop saved state)
  widget_layout JSONB DEFAULT '[]',               -- [{id, x, y, w, h, type}]
  
  -- Notification Preferences (AI-tuned)
  notification_filters JSONB DEFAULT '{}',
  smart_digest_enabled BOOLEAN DEFAULT TRUE,
  digest_cadence TEXT DEFAULT 'realtime',          -- realtime, hourly, daily
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ INDEXES ═══════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_mood_ticket ON ticket_mood_profiles(ticket_id);
CREATE INDEX IF NOT EXISTS idx_mood_sentiment ON ticket_mood_profiles(overall_sentiment);
CREATE INDEX IF NOT EXISTS idx_mood_escalation ON ticket_mood_profiles(escalation_risk_pct DESC);
CREATE INDEX IF NOT EXISTS idx_codesurgery_ticket ON code_surgery_sessions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_neural_source ON neural_translations(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_revenue_blast ON revenue_blast_profiles(ticket_id);
CREATE INDEX IF NOT EXISTS idx_session_token ON session_recordings(session_token);
CREATE INDEX IF NOT EXISTS idx_session_ticket ON session_recordings(ticket_id);
CREATE INDEX IF NOT EXISTS idx_warroom_time ON war_room_snapshots(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_genome_ticket ON ticket_genomes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_genome_team ON ticket_genomes(detected_team);
CREATE INDEX IF NOT EXISTS idx_user_dashboard ON user_dashboard_configs(user_id);

NOTIFY pgrst, 'reload schema';
