-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PHASES 46–50 — ENGINEERING INTELLIGENCE SUPREMACY               ║
-- ║  P46: Auto-Improvement Engine | P47: Code Quality Scanner         ║
-- ║  P48: User Journey Analytics | P49: Tech Debt Tracker             ║
-- ║  P50: Error Cost Calculator                                        ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══ P46: AUTO-IMPROVEMENT ENGINE ══════════════════════════════════
-- AI continuously scans everything and generates ranked improvement actions

CREATE TABLE IF NOT EXISTS auto_improvements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggestion_number TEXT UNIQUE NOT NULL,        -- AIS-001

  -- Category
  category TEXT NOT NULL,                        -- process | agent | technical | sla | knowledge | communication
  subcategory TEXT,

  -- The Suggestion
  title TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  suggested_action TEXT NOT NULL,
  implementation_steps JSONB DEFAULT '[]',        -- [{step, detail, owner}]
  expected_outcome TEXT,

  -- Impact Scoring
  impact_score INTEGER DEFAULT 0,                -- 0-100 business impact
  effort_score INTEGER DEFAULT 0,                -- 0-100 implementation effort (lower=easier)
  priority_score INTEGER DEFAULT 0,              -- impact / effort ratio
  roi_estimate_inr NUMERIC(15,2) DEFAULT 0,
  payback_days INTEGER DEFAULT 0,

  -- Evidence (what triggered this suggestion)
  evidence_data JSONB DEFAULT '{}',              -- {ticket_count, error_rate, resolution_time_delta}
  supporting_tickets JSONB DEFAULT '[]',

  -- Status
  status TEXT DEFAULT 'pending',                 -- pending | accepted | rejected | implemented
  accepted_by TEXT,
  implemented_at TIMESTAMPTZ,
  actual_roi_inr NUMERIC(15,2),

  -- AI Confidence
  ai_confidence_pct INTEGER DEFAULT 0,

  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P47: CODE QUALITY SCANNER ══════════════════════════════════════
-- Deep analysis of error patterns to detect code quality issues

CREATE TABLE IF NOT EXISTS code_quality_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_number TEXT UNIQUE NOT NULL,              -- CQS-001
  scan_type TEXT DEFAULT 'full',                 -- full | incremental | targeted

  -- Source
  source_type TEXT DEFAULT 'error_logs',         -- error_logs | ticket_patterns | stack_traces | manual
  source_data JSONB DEFAULT '{}',
  tickets_analyzed INTEGER DEFAULT 0,

  -- Findings
  total_issues INTEGER DEFAULT 0,
  critical_issues INTEGER DEFAULT 0,
  high_issues INTEGER DEFAULT 0,
  medium_issues INTEGER DEFAULT 0,
  low_issues INTEGER DEFAULT 0,

  -- Issues Detail
  issues JSONB DEFAULT '[]',
  /*
    [{
      id: "issue_1",
      type: "null_pointer | memory_leak | race_condition | sql_injection | unhandled_exception | dead_code | circular_dependency",
      severity: "critical | high | medium | low",
      file_pattern: "UserService.java line ~145",
      description: "Unhandled NullPointerException in payment processing",
      evidence: "Stack trace appears in 23 tickets",
      ai_fix_suggestion: "Add null check before accessing user.getPaymentMethod()",
      estimated_fix_hours: 2,
      recurrence_count: 23,
      first_seen: "2026-01-15",
      last_seen: "2026-03-28"
    }]
  */

  -- Code Health Score
  code_health_score INTEGER DEFAULT 0,           -- 0-100
  code_health_grade TEXT DEFAULT 'B',            -- A+, A, B, C, D, F
  technical_risk_level TEXT DEFAULT 'medium',

  -- Predictions
  ai_risk_prediction TEXT,                       -- what will break next if not fixed
  ai_priority_fixes JSONB DEFAULT '[]',          -- top 3 fixes with highest ROI
  estimated_total_fix_hours INTEGER DEFAULT 0,
  estimated_rework_cost_inr NUMERIC(12,2) DEFAULT 0,

  scan_started_at TIMESTAMPTZ DEFAULT NOW(),
  scan_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P48: USER JOURNEY ANALYTICS ════════════════════════════════════
-- Complete lifecycle analytics of every ticket's journey

CREATE TABLE IF NOT EXISTS ticket_journey_maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID UNIQUE,
  ticket_number TEXT,

  -- Journey Phases
  journey_phases JSONB DEFAULT '[]',
  /*
    [{
      phase: "submission | triage | assignment | diagnosis | fix_attempt | escalation | resolution | closure",
      started_at: "timestamp",
      ended_at: "timestamp",
      duration_min: 45,
      actor: "customer | L1 | L2 | system | AI",
      outcome: "passed | delayed | failed | escalated",
      delay_reason: null or "waiting_for_customer | resource_unavailable | unclear_priority"
    }]
  */

  -- Timing Analysis
  total_journey_min INTEGER DEFAULT 0,
  active_work_min INTEGER DEFAULT 0,             -- time someone actually worked on it
  idle_time_min INTEGER DEFAULT 0,               -- time nothing happened
  idle_pct NUMERIC(5,2) DEFAULT 0,
  handoff_count INTEGER DEFAULT 0,
  escalation_count INTEGER DEFAULT 0,

  -- Bottlenecks
  critical_bottleneck TEXT,                      -- the single biggest delay
  bottleneck_phase TEXT,
  bottleneck_duration_min INTEGER DEFAULT 0,

  -- Quality
  first_contact_resolution BOOLEAN DEFAULT FALSE,
  rework_count INTEGER DEFAULT 0,               -- times ticket reopened/reassigned
  sla_breach_risk_pct INTEGER DEFAULT 0,

  -- AI Journey Analysis
  ai_journey_grade TEXT DEFAULT 'B',            -- A-F: how smooth was the journey
  ai_efficiency_score INTEGER DEFAULT 0,         -- 0-100
  ai_friction_points JSONB DEFAULT '[]',         -- where friction occurred
  ai_recommendations JSONB DEFAULT '[]',         -- how to improve this journey type

  -- Customer Experience Score
  predicted_csat INTEGER DEFAULT 0,             -- 1-5 predicted based on journey
  customer_effort_score INTEGER DEFAULT 0,       -- 1-10 (lower = better)

  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P49: TECH DEBT TRACKER ══════════════════════════════════════════
-- Identifies, quantifies, and tracks technical debt from support patterns

CREATE TABLE IF NOT EXISTS tech_debt_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debt_number TEXT UNIQUE NOT NULL,             -- TD-001

  -- Debt Classification
  debt_type TEXT NOT NULL,                      -- architectural | code | test | documentation | process | infrastructure
  debt_severity TEXT DEFAULT 'medium',          -- critical | high | medium | low
  component TEXT,                               -- which system/module this affects

  -- Description
  title TEXT NOT NULL,
  description TEXT,
  root_cause TEXT,

  -- Evidence from Tickets
  recurring_ticket_count INTEGER DEFAULT 0,     -- how many tickets point to this debt
  evidence_tickets JSONB DEFAULT '[]',
  first_observed_at TIMESTAMPTZ,
  last_observed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Cost Quantification (the magic nobody else does)
  monthly_support_cost_inr NUMERIC(12,2) DEFAULT 0,   -- agent hours wasted monthly
  monthly_customer_impact_inr NUMERIC(12,2) DEFAULT 0, -- customer churn/NPS impact
  interest_rate_pct NUMERIC(5,2) DEFAULT 0,             -- % cost increase per month if not fixed
  total_debt_cost_inr NUMERIC(15,2) DEFAULT 0,          -- accumulated cost so far
  projected_6m_cost_inr NUMERIC(15,2) DEFAULT 0,       -- cost if ignored for 6 months

  -- Resolution
  estimated_fix_hours INTEGER DEFAULT 0,
  estimated_fix_cost_inr NUMERIC(12,2) DEFAULT 0,
  fix_roi_multiple NUMERIC(6,2) DEFAULT 0,
  fix_priority_score INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'identified',             -- identified | acknowledged | in_progress | resolved | accepted_risk
  assigned_to TEXT,
  target_resolution_date DATE,
  resolved_at TIMESTAMPTZ,

  -- AI Analysis
  ai_impact_projection TEXT,
  ai_fix_recommendation TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P50: ERROR COST CALCULATOR ══════════════════════════════════════
-- Calculates true total business cost of every error — not just fix time

CREATE TABLE IF NOT EXISTS error_cost_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_number TEXT UNIQUE NOT NULL,         -- ECA-001
  error_signature TEXT NOT NULL,                -- normalized error identifier

  -- Error Profile
  error_type TEXT,                              -- exception_type or category
  error_frequency INTEGER DEFAULT 0,            -- occurrences in period
  affected_tickets INTEGER DEFAULT 0,
  affected_users_estimated INTEGER DEFAULT 0,
  period_days INTEGER DEFAULT 30,

  -- Cost Breakdown (true total cost most companies never calculate)
  -- Direct Costs
  agent_time_cost_inr NUMERIC(12,2) DEFAULT 0,     -- agent hours diagnosing
  l2_escalation_cost_inr NUMERIC(12,2) DEFAULT 0,  -- L2 time
  developer_fix_time_cost_inr NUMERIC(12,2) DEFAULT 0, -- dev hours to fix

  -- Indirect Costs
  customer_downtime_cost_inr NUMERIC(12,2) DEFAULT 0, -- revenue lost by customers
  sla_penalty_cost_inr NUMERIC(12,2) DEFAULT 0,
  churn_risk_cost_inr NUMERIC(12,2) DEFAULT 0,
  reputation_cost_inr NUMERIC(12,2) DEFAULT 0,
  ops_overhead_cost_inr NUMERIC(12,2) DEFAULT 0,

  -- Hidden Costs
  rework_opportunity_cost_inr NUMERIC(12,2) DEFAULT 0, -- what else dev could build
  monitoring_overhead_inr NUMERIC(12,2) DEFAULT 0,
  customer_service_overhead_inr NUMERIC(12,2) DEFAULT 0,

  -- Totals
  total_direct_cost_inr NUMERIC(15,2) DEFAULT 0,
  total_indirect_cost_inr NUMERIC(15,2) DEFAULT 0,
  total_hidden_cost_inr NUMERIC(15,2) DEFAULT 0,
  true_total_cost_inr NUMERIC(15,2) DEFAULT 0,
  cost_per_occurrence_inr NUMERIC(12,2) DEFAULT 0,

  -- Fix Economics
  fix_investment_inr NUMERIC(12,2) DEFAULT 0,
  fix_roi_multiple NUMERIC(6,2) DEFAULT 0,
  fix_payback_days INTEGER DEFAULT 0,
  fix_priority TEXT DEFAULT 'medium',           -- immediate | high | medium | low

  -- AI Analysis
  ai_cost_narrative TEXT,
  ai_fix_urgency TEXT,
  ai_prevention_strategy TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ INDEXES ════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_improvements_priority ON auto_improvements(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_improvements_status ON auto_improvements(status);
CREATE INDEX IF NOT EXISTS idx_cqs_scan_number ON code_quality_scans(scan_number);
CREATE INDEX IF NOT EXISTS idx_cqs_health ON code_quality_scans(code_health_score);
CREATE INDEX IF NOT EXISTS idx_journey_ticket ON ticket_journey_maps(ticket_id);
CREATE INDEX IF NOT EXISTS idx_journey_grade ON ticket_journey_maps(ai_journey_grade);
CREATE INDEX IF NOT EXISTS idx_techdebt_severity ON tech_debt_items(debt_severity, status);
CREATE INDEX IF NOT EXISTS idx_techdebt_cost ON tech_debt_items(total_debt_cost_inr DESC);
CREATE INDEX IF NOT EXISTS idx_eca_signature ON error_cost_analyses(error_signature);
CREATE INDEX IF NOT EXISTS idx_eca_cost ON error_cost_analyses(true_total_cost_inr DESC);

NOTIFY pgrst, 'reload schema';
