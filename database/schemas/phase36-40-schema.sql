-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PHASES 36–40 — CUSTOMER EXPERIENCE & INTELLIGENCE LAYER         ║
-- ║  P36: Client Self-Serve Portal | P37: Agent Digital Twin          ║
-- ║  P38: Incident War Room v2 | P39: Competitor Intelligence         ║
-- ║  P40: NexDesk Command OS                                          ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══ P36: CLIENT SELF-SERVE PORTAL ════════════════════════════════
CREATE TABLE IF NOT EXISTS client_portal_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT UNIQUE NOT NULL,            -- could be org name or external ID
  client_name TEXT NOT NULL,
  client_email TEXT,
  portal_token TEXT UNIQUE NOT NULL,         -- secure token for portal access
  
  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  
  -- Feature Flags
  show_sla_status BOOLEAN DEFAULT TRUE,
  show_health_score BOOLEAN DEFAULT TRUE,
  show_kb_articles BOOLEAN DEFAULT TRUE,
  show_revenue_impact BOOLEAN DEFAULT FALSE,
  allow_self_raise_tickets BOOLEAN DEFAULT TRUE,
  
  -- Portal Stats Cache (refresh every 30 min)
  cached_open_tickets INTEGER DEFAULT 0,
  cached_health_score INTEGER DEFAULT 0,
  cached_sla_compliance_pct NUMERIC(5,2) DEFAULT 100,
  cache_updated_at TIMESTAMPTZ,

  -- Client-specific AI Digest (weekly email summary)
  digest_enabled BOOLEAN DEFAULT TRUE,
  digest_cadence TEXT DEFAULT 'weekly',
  last_digest_at TIMESTAMPTZ,

  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_portal_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_config_id UUID REFERENCES client_portal_configs(id),
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P37: AGENT DIGITAL TWIN ═══════════════════════════════════════
-- AI learns EXACTLY how each agent writes, thinks, escalates
CREATE TABLE IF NOT EXISTS agent_digital_twins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID UNIQUE REFERENCES profiles(id),

  -- Voice / Style Profile
  writing_style TEXT,                        -- formal, casual, empathetic, technical, bullet-first
  avg_response_length TEXT,                  -- concise (<50w), medium (50-150w), detailed (150w+)
  signature_phrases JSONB DEFAULT '[]',      -- phrases this agent always uses
  never_uses JSONB DEFAULT '[]',             -- phrases/words they avoid
  
  -- Diagnostic Patterns
  diagnosis_pattern TEXT,                    -- do they ask 1 question or many? gather info first?
  escalation_threshold TEXT,                 -- quick-escalate or always tries L1 fix first?
  typical_resolution_steps JSONB DEFAULT '[]',
  
  -- Performance Metrics (actual)
  avg_resolution_min INTEGER DEFAULT 0,
  first_contact_resolution_pct NUMERIC(5,2) DEFAULT 0,
  csat_avg NUMERIC(3,1) DEFAULT 0,
  
  -- Twin Training
  training_ticket_count INTEGER DEFAULT 0,
  twin_accuracy_pct INTEGER DEFAULT 0,
  last_trained_at TIMESTAMPTZ,
  
  -- Simulation Results
  last_simulation JSONB DEFAULT '{}',        -- {ticket_id, twin_response, actual_response, match_score}
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS twin_simulations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  twin_id UUID REFERENCES agent_digital_twins(id),
  ticket_id UUID,
  
  -- What the twin generated
  twin_initial_response TEXT,
  twin_diagnosis_questions JSONB DEFAULT '[]',
  twin_resolution_approach TEXT,
  twin_escalation_decision TEXT,              -- would_escalate | would_resolve_l1
  
  -- What actually happened
  actual_response TEXT,
  actual_resolution TEXT,
  
  -- Accuracy Scoring
  response_style_match_pct INTEGER DEFAULT 0,
  diagnosis_match_pct INTEGER DEFAULT 0,
  resolution_match_pct INTEGER DEFAULT 0,
  overall_accuracy_pct INTEGER DEFAULT 0,
  
  -- AI Analysis of Differences
  ai_differences TEXT,
  ai_learning_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P38: INCIDENT WAR ROOM V2 ═════════════════════════════════════
-- Real-time multi-stakeholder incident command center
CREATE TABLE IF NOT EXISTS incident_war_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_number TEXT UNIQUE NOT NULL,          -- IWR-001
  ticket_id UUID,
  
  -- Incident Details
  incident_title TEXT NOT NULL,
  severity TEXT DEFAULT 'P2',               -- P1-Catastrophic, P2-Critical, P3-Major, P4-Minor
  status TEXT DEFAULT 'active',             -- active, contained, resolved, post-mortem
  
  -- Timeline
  declared_at TIMESTAMPTZ DEFAULT NOW(),
  contained_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  duration_min INTEGER,
  
  -- Stakeholders
  incident_commander TEXT,
  technical_lead TEXT,
  comms_lead TEXT,
  stakeholders JSONB DEFAULT '[]',           -- [{name, role, notified_at}]
  
  -- Updates Log (live feed)
  timeline_updates JSONB DEFAULT '[]',       -- [{time, author, message, type: update|decision|escalation}]
  
  -- AI Assistance
  ai_impact_assessment TEXT,
  ai_suggested_actions JSONB DEFAULT '[]',
  ai_communication_drafts JSONB DEFAULT '{}', -- {customer_email, internal_slack, status_page}
  ai_predicted_resolution_min INTEGER,
  ai_similar_incidents JSONB DEFAULT '[]',
  
  -- Business Impact
  affected_services JSONB DEFAULT '[]',
  estimated_revenue_loss_inr NUMERIC(15,2) DEFAULT 0,
  users_impacted INTEGER DEFAULT 0,
  
  -- Post-Incident
  root_cause TEXT,
  preventive_actions JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P39: COMPETITOR INTELLIGENCE ══════════════════════════════════
-- AI monitors industry benchmarks, patterns, competitive positioning
CREATE TABLE IF NOT EXISTS competitor_intelligence_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_number TEXT UNIQUE NOT NULL,        -- CIR-001
  
  -- Benchmark Data
  industry TEXT DEFAULT 'IT Support',
  your_avg_resolution_min INTEGER DEFAULT 0,
  industry_avg_resolution_min INTEGER DEFAULT 0,
  your_sla_compliance_pct NUMERIC(5,2) DEFAULT 0,
  industry_sla_compliance_pct NUMERIC(5,2) DEFAULT 0,
  your_csat NUMERIC(3,1) DEFAULT 0,
  industry_csat NUMERIC(3,1) DEFAULT 0,
  
  -- AI-Generated Insights
  ai_strengths JSONB DEFAULT '[]',           -- where you beat the market
  ai_weaknesses JSONB DEFAULT '[]',          -- where competitors win
  ai_opportunities JSONB DEFAULT '[]',       -- market gaps you can exploit
  ai_threats JSONB DEFAULT '[]',             -- risks from competitive moves
  
  -- SWOT as structured data
  swot_analysis JSONB DEFAULT '{}',
  
  -- Recommendations
  ai_quick_wins JSONB DEFAULT '[]',          -- [{action, impact, effort, timeline}]
  ai_strategic_moves JSONB DEFAULT '[]',
  
  -- Competitive Score
  competitive_score INTEGER DEFAULT 0,       -- 0-100 vs industry
  rank_percentile INTEGER DEFAULT 50,        -- top X% of industry
  
  report_period TEXT,                        -- 'Q1 2026', 'March 2026'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P40: NEXDESK COMMAND OS ═══════════════════════════════════════
-- Natural language command interface for all operations
CREATE TABLE IF NOT EXISTS command_os_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  
  -- Command
  natural_language_input TEXT NOT NULL,      -- "show me all critical tickets from last week"
  parsed_intent TEXT,                        -- query_tickets | trigger_ai | export_data | configure
  parsed_parameters JSONB DEFAULT '{}',
  
  -- Execution
  executed_action TEXT,
  result_summary TEXT,
  result_data JSONB DEFAULT '{}',
  
  -- Response
  ai_narrative_response TEXT,               -- human-readable answer
  
  success BOOLEAN DEFAULT TRUE,
  execution_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ INDEXES ═══════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_portal_token ON client_portal_configs(portal_token);
CREATE INDEX IF NOT EXISTS idx_portal_session ON client_portal_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_twin_agent ON agent_digital_twins(agent_id);
CREATE INDEX IF NOT EXISTS idx_twin_sim ON twin_simulations(twin_id);
CREATE INDEX IF NOT EXISTS idx_warroom_status ON incident_war_rooms(status);
CREATE INDEX IF NOT EXISTS idx_warroom_number ON incident_war_rooms(room_number);
CREATE INDEX IF NOT EXISTS idx_competitor_created ON competitor_intelligence_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commandos_user ON command_os_history(user_id);
CREATE INDEX IF NOT EXISTS idx_commandos_created ON command_os_history(created_at DESC);

NOTIFY pgrst, 'reload schema';
