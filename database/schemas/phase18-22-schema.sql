-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PHASES 18-22 — OPERATIONS INTELLIGENCE HUB                      ║
-- ║  P18: SLA Negotiator | P19: Client Health | P20: AI Interview     ║
-- ║  P21: Shift Handover | P22: Vendor SLA Tracker                    ║
-- ║  NexDesk — Unified Operations Intelligence                        ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══ P18: SLA NEGOTIATOR ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sla_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_number TEXT UNIQUE NOT NULL,           -- SLA-2026-0001
  client_name TEXT NOT NULL,
  industry TEXT DEFAULT 'BFSI',
  
  -- Current Performance (auto-detected)
  current_avg_response_min NUMERIC(10,2),
  current_avg_resolve_min NUMERIC(10,2),
  current_sla_compliance_pct NUMERIC(5,2),
  current_ticket_volume_monthly INTEGER,
  
  -- AI Recommendations
  ai_recommended_response_hours JSONB DEFAULT '{}',  -- {critical:0.5, high:1, medium:4, low:24}
  ai_recommended_resolve_hours JSONB DEFAULT '{}',
  ai_confidence_pct INTEGER DEFAULT 0,
  ai_risk_assessment TEXT,
  ai_cost_estimate TEXT,
  ai_gap_analysis TEXT,
  ai_negotiation_tips TEXT,
  
  -- Tier Options
  tier_basic JSONB DEFAULT '{}',
  tier_standard JSONB DEFAULT '{}',
  tier_premium JSONB DEFAULT '{}',
  
  status TEXT DEFAULT 'draft',                     -- draft, proposed, negotiating, agreed, active
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P19: CLIENT HEALTH SCORE ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS client_health_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name TEXT NOT NULL,
  
  -- Health Score 0-100
  overall_score INTEGER DEFAULT 0,
  
  -- Dimension Scores (each 0-100)
  ticket_volume_score INTEGER DEFAULT 0,           -- Lower volume = better
  resolution_speed_score INTEGER DEFAULT 0,        -- Faster = better
  sla_compliance_score INTEGER DEFAULT 0,          -- Higher = better
  recurring_issues_score INTEGER DEFAULT 0,        -- Fewer = better
  satisfaction_score INTEGER DEFAULT 0,            -- Higher = better
  escalation_score INTEGER DEFAULT 0,              -- Fewer = better
  
  -- Trend
  trend TEXT DEFAULT 'stable',                     -- improving, stable, declining, critical
  previous_score INTEGER DEFAULT 0,
  score_change INTEGER DEFAULT 0,
  
  -- Risk
  churn_risk TEXT DEFAULT 'low',                   -- low, medium, high, critical
  ai_risk_factors JSONB DEFAULT '[]',
  ai_recommendations JSONB DEFAULT '[]',
  
  -- Data Points
  total_tickets INTEGER DEFAULT 0,
  open_tickets INTEGER DEFAULT 0,
  avg_resolution_min INTEGER DEFAULT 0,
  sla_breaches INTEGER DEFAULT 0,
  recurring_count INTEGER DEFAULT 0,
  
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P20: AI INTERVIEW SESSIONS ════════════════════════════════════
CREATE TABLE IF NOT EXISTS ai_interview_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  
  status TEXT DEFAULT 'in_progress',               -- in_progress, completed, abandoned
  current_step INTEGER DEFAULT 1,
  
  -- Collected Data
  answers JSONB DEFAULT '{}',                      -- {step1: "answer", step2: "answer"}
  ai_detected_category TEXT,
  ai_detected_priority TEXT,
  ai_detected_framework TEXT,
  ai_similar_tickets JSONB DEFAULT '[]',
  
  -- Result
  created_ticket_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ═══ P21: SHIFT HANDOVER ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS shift_handovers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  handover_number TEXT UNIQUE NOT NULL,            -- HO-2026-0001
  
  shift_from TEXT NOT NULL,                        -- 'morning', 'evening', 'night'
  shift_to TEXT NOT NULL,
  handover_time TIMESTAMPTZ DEFAULT NOW(),
  
  -- Auto-Generated Content
  ai_summary TEXT,
  open_tickets_snapshot JSONB DEFAULT '[]',
  critical_items JSONB DEFAULT '[]',
  service_health JSONB DEFAULT '{}',
  pending_escalations JSONB DEFAULT '[]',
  watch_items JSONB DEFAULT '[]',                  -- Things to watch in next shift
  
  -- Metrics at handover time
  total_open INTEGER DEFAULT 0,
  total_critical INTEGER DEFAULT 0,
  sla_at_risk INTEGER DEFAULT 0,
  resolved_this_shift INTEGER DEFAULT 0,
  new_this_shift INTEGER DEFAULT 0,
  
  generated_by UUID,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  
  status TEXT DEFAULT 'generated',                 -- generated, acknowledged, archived
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P22: VENDOR SLA TRACKER ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS vendor_sla_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_name TEXT NOT NULL,
  vendor_type TEXT DEFAULT 'cloud',                -- cloud, payment, sms, api, database
  
  -- SLA Terms
  guaranteed_uptime_pct NUMERIC(5,3) DEFAULT 99.9,
  max_response_time_min INTEGER DEFAULT 60,
  
  -- Monitoring
  health_check_url TEXT,
  check_interval_min INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Current Status
  current_status TEXT DEFAULT 'healthy',           -- healthy, degraded, down, unknown
  last_check_at TIMESTAMPTZ,
  last_down_at TIMESTAMPTZ,
  
  -- Cumulative Stats
  total_downtime_min NUMERIC(10,2) DEFAULT 0,
  total_incidents INTEGER DEFAULT 0,
  actual_uptime_pct NUMERIC(5,3) DEFAULT 100,
  monthly_credit_inr NUMERIC(12,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID REFERENCES vendor_sla_configs(id) ON DELETE CASCADE,
  
  incident_type TEXT DEFAULT 'outage',             -- outage, degradation, latency, error_spike
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_min NUMERIC(10,2),
  
  -- Impact
  affected_services JSONB DEFAULT '[]',
  error_rate_pct NUMERIC(5,2),
  latency_ms INTEGER,
  users_affected INTEGER DEFAULT 0,
  
  -- Resolution
  root_cause TEXT,
  vendor_response TEXT,
  credit_claimed BOOLEAN DEFAULT FALSE,
  credit_amount_inr NUMERIC(12,2) DEFAULT 0,
  
  -- AI
  ai_impact_summary TEXT,
  ai_claim_draft TEXT,
  
  auto_detected BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ INDEXES ═══════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_sla_proposals_status ON sla_proposals(status);
CREATE INDEX IF NOT EXISTS idx_client_health_score ON client_health_scores(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_client_health_churn ON client_health_scores(churn_risk);
CREATE INDEX IF NOT EXISTS idx_interview_user ON ai_interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_handover_time ON shift_handovers(handover_time DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_status ON vendor_sla_configs(current_status);
CREATE INDEX IF NOT EXISTS idx_vendor_incidents ON vendor_incidents(vendor_id, started_at DESC);

NOTIFY pgrst, 'reload schema';
