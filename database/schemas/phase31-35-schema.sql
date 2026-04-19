-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PHASES 31-35 — WORKFORCE INTELLIGENCE HUB                       ║
-- ║  P31: Recurring Issue Tracker | P32: Workload Heatmap             ║
-- ║  P33: Plain English Resolver | P34: AI Shadow Coaching            ║
-- ║  P35: Predictive Staffing                                         ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══ P31: RECURRING ISSUE TRACKER ══════════════════════════════════
CREATE TABLE IF NOT EXISTS recurring_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_fingerprint TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Pattern Data
  occurrence_count INTEGER DEFAULT 1,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  affected_ticket_ids JSONB DEFAULT '[]',
  
  -- Fix Tracking
  fix_type TEXT DEFAULT 'none',                    -- none, temporary, permanent
  temp_fix_description TEXT,
  permanent_fix_description TEXT,
  permanent_fix_deadline TIMESTAMPTZ,
  permanent_fix_owner TEXT,
  
  -- AI Analysis
  ai_root_cause TEXT,
  ai_permanent_fix_suggestion TEXT,
  ai_estimated_effort TEXT,
  ai_business_impact TEXT,
  ai_priority_score INTEGER DEFAULT 0,             -- 0-100
  
  -- Escalation
  escalation_level INTEGER DEFAULT 0,              -- 0=none, 1=manager, 2=director, 3=CTO
  last_escalated_at TIMESTAMPTZ,
  
  category TEXT,
  status TEXT DEFAULT 'open',                      -- open, temp_fixed, permanent_fixed, accepted_risk
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P32: WORKLOAD HEATMAP ═════════════════════════════════════════
CREATE TABLE IF NOT EXISTS workload_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_time TIMESTAMPTZ DEFAULT NOW(),
  
  -- Per-Agent Data
  agent_loads JSONB DEFAULT '[]',                  -- [{agent_id, email, open_tickets, in_progress, avg_resolution_min, burnout_risk}]
  
  -- Team-Level
  team_loads JSONB DEFAULT '{}',                   -- {L1: {total, avg_per_agent}, L2: {...}}
  
  -- Hourly Heatmap
  hourly_heatmap JSONB DEFAULT '[]',               -- [{hour:0, day:'Mon', tickets_created:5, tickets_resolved:3}]
  
  -- AI Recommendations
  ai_rebalance_suggestions JSONB DEFAULT '[]',
  ai_peak_prediction TEXT,
  ai_burnout_alerts JSONB DEFAULT '[]',
  
  -- Summary Metrics
  total_open INTEGER DEFAULT 0,
  total_agents INTEGER DEFAULT 0,
  avg_load_per_agent NUMERIC(5,2) DEFAULT 0,
  max_load_agent TEXT,
  min_load_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P33: PLAIN ENGLISH RESOLVER ═══════════════════════════════════
CREATE TABLE IF NOT EXISTS plain_english_resolutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID,
  
  -- Original Technical Resolution
  original_resolution TEXT NOT NULL,
  
  -- AI-Generated Plain English Versions
  user_friendly TEXT,                              -- For non-technical users
  executive_summary TEXT,                          -- For management
  technical_steps TEXT,                            -- Cleaned up technical steps
  
  -- Metadata
  complexity_level TEXT DEFAULT 'medium',           -- simple, medium, complex
  jargon_removed JSONB DEFAULT '[]',               -- [{original: "DNS", replaced: "internet address lookup"}]
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P34: AI SHADOW COACHING ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS shadow_coaching_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES profiles(id),
  ticket_id UUID,
  
  -- Coaching Data
  coaching_type TEXT DEFAULT 'realtime',            -- realtime, post_action, review
  
  ai_observations JSONB DEFAULT '[]',               -- [{type: "missing_info", message: "Ask about browser version"}]
  ai_suggestions JSONB DEFAULT '[]',                -- [{category: "escalation", suggestion: "Escalate to L2 — pattern matches known DB issue"}]
  ai_quality_score INTEGER DEFAULT 0,               -- 0-100
  ai_quality_breakdown JSONB DEFAULT '{}',           -- {completeness:80, accuracy:90, speed:70, communication:85}
  
  -- What a Senior Would Do
  senior_approach TEXT,
  
  -- Agent Response
  feedback TEXT,
  helpful BOOLEAN,
  
  status TEXT DEFAULT 'active',                     -- active, reviewed, dismissed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P35: PREDICTIVE STAFFING ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS staffing_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_date DATE NOT NULL,
  
  -- Predictions
  predicted_ticket_volume INTEGER DEFAULT 0,
  predicted_peak_hours JSONB DEFAULT '[]',          -- [9, 10, 14, 15]
  predicted_critical_pct NUMERIC(5,2) DEFAULT 0,
  
  -- Staffing Recommendations
  recommended_l1_agents INTEGER DEFAULT 0,
  recommended_l2_agents INTEGER DEFAULT 0,
  recommended_dev_agents INTEGER DEFAULT 0,
  
  -- Shift-wise Breakdown
  shift_morning JSONB DEFAULT '{}',                 -- {predicted_volume:20, recommended_staff:3, peak_hour:10}
  shift_evening JSONB DEFAULT '{}',
  shift_night JSONB DEFAULT '{}',
  
  -- Context
  is_market_day BOOLEAN DEFAULT FALSE,
  is_deployment_day BOOLEAN DEFAULT FALSE,
  special_events JSONB DEFAULT '[]',
  
  -- AI Analysis
  ai_reasoning TEXT,
  ai_confidence_pct INTEGER DEFAULT 0,
  
  -- Actual (filled post-facto)
  actual_ticket_volume INTEGER,
  accuracy_pct NUMERIC(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ INDEXES ═══════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_recurring_fingerprint ON recurring_issues(issue_fingerprint);
CREATE INDEX IF NOT EXISTS idx_recurring_status ON recurring_issues(status);
CREATE INDEX IF NOT EXISTS idx_recurring_priority ON recurring_issues(ai_priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_workload_time ON workload_snapshots(snapshot_time DESC);
CREATE INDEX IF NOT EXISTS idx_plain_eng_ticket ON plain_english_resolutions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_shadow_agent ON shadow_coaching_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_shadow_ticket ON shadow_coaching_sessions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_staffing_date ON staffing_predictions(prediction_date DESC);

NOTIFY pgrst, 'reload schema';
