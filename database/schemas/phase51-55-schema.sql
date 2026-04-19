-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PHASES 51–55 — ECOSYSTEM & WORKFORCE SUPREMACY                  ║
-- ║  P51: Expert Finder | P52: Burnout Detection                      ║
-- ║  P53: Knowledge Gap Detection | P54: Universal Connector          ║
-- ║  P55: Smart Notification Engine                                   ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══ P51: EXPERT FINDER ════════════════════════════════════════════
-- Routes tickets to the EXACT right person based on past success

CREATE TABLE IF NOT EXISTS expert_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  agent_name TEXT,

  -- Expertise Vectors
  top_categories JSONB DEFAULT '[]',             -- ["database_lock", "payment_gateway"]
  niche_expertise JSONB DEFAULT '[]',            -- ["legacy_php_system", "aws_iam_policies"]
  
  -- Stats
  tickets_resolved INTEGER DEFAULT 0,
  avg_resolution_min INTEGER DEFAULT 0,
  positive_csat_pct INTEGER DEFAULT 0,
  
  -- The AI finding
  ai_expertise_summary TEXT,                     -- "Go-to person for complex database deadlocks"
  expert_score INTEGER DEFAULT 0,                -- 0-100
  
  last_analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_expert_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID UNIQUE,
  
  matched_expert_id UUID,
  matched_expert_name TEXT,
  match_confidence_pct INTEGER DEFAULT 0,
  
  ai_match_reason TEXT,                          -- "Agent solved 4 identical 'Kafka lag' issues last week in under 15 mins"
  
  -- Effectiveness tracking
  routed_to_expert BOOLEAN DEFAULT FALSE,
  resolution_time_min INTEGER,                   -- Time it took after routing to them
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ═══ P52: BURNOUT DETECTION ═════════════════════════════════════════
-- Protects the mental health of the workforce

CREATE TABLE IF NOT EXISTS agent_burnout_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  agent_name TEXT,
  scan_period TEXT,                              -- '2026-W13'

  -- Signals
  avg_handling_time_trend TEXT,                  -- 'stable', 'spiking', 'dropping'
  escalation_rate_pct INTEGER DEFAULT 0,
  after_hours_work_min INTEGER DEFAULT 0,
  sentiment_score INTEGER DEFAULT 50,            -- 0-100 based on their internal comments
  customer_csat_drop BOOLEAN DEFAULT FALSE,

  -- Assessment
  burnout_risk_score INTEGER DEFAULT 0,          -- 0-100 (100 = imminent collapse)
  burnout_level TEXT DEFAULT 'low',              -- critical, high, medium, low
  
  ai_burnout_indicators JSONB DEFAULT '[]',      -- ["Working 3 weekends in a row", "Increased cynical language in tickets"]
  ai_intervention_plan TEXT,                     -- "Mandatory 2-day paid wellness leave. Route complex tickets away."
  
  intervention_applied BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ═══ P53: KNOWLEDGE GAP DETECTION ═══════════════════════════════════
-- Finds where L1s are escalating because of missing docs

CREATE TABLE IF NOT EXISTS knowledge_gap_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- The Gap
  gap_topic TEXT NOT NULL,
  escalation_count INTEGER DEFAULT 0,            -- How many times tickets on this escalated
  avg_escalation_delay_min INTEGER DEFAULT 0,
  
  -- Impact
  cost_of_gap_inr NUMERIC(12,2) DEFAULT 0,
  
  -- Resolution
  ai_suggested_kb_title TEXT,
  ai_suggested_kb_draft TEXT,                    -- The AI literally writes the missing article
  
  status TEXT DEFAULT 'identified',              -- identified | draft_created | published | ignored
  published_kb_id UUID,                          -- Link to the actual published KB (p14)
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ═══ P54: UNIVERSAL CONNECTOR ═══════════════════════════════════════
-- NexDesk integration abstraction layer

CREATE TABLE IF NOT EXISTS uniconnect_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  provider TEXT NOT NULL,                        -- jira | slack | pagerduty | salesforce | github
  connection_status TEXT DEFAULT 'disconnected', -- connected | disconnected | failing
  
  sync_direction TEXT DEFAULT 'bidirectional',   -- inbound | outbound | bidirectional
  last_sync_at TIMESTAMPTZ,
  total_events_synced INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  -- Config
  webhook_url TEXT,
  auth_config JSONB DEFAULT '{}',
  
  -- Logs
  ai_health_summary TEXT,                        -- "Jira integration stable. PagerDuty failing due to auth token expiry."
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider)
);

CREATE TABLE IF NOT EXISTS uniconnect_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES uniconnect_integrations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  
  event_type TEXT,                               -- ticket_created | issue_synced | alert_triggered
  payload JSONB DEFAULT '{}',
  
  status TEXT DEFAULT 'processed',               -- processed | failed | pending
  error_details TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ═══ P55: SMART NOTIFICATION ENGINE ═════════════════════════════════
-- Prevents alert fatigue using AI routing and batching

CREATE TABLE IF NOT EXISTS smart_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Context
  ticket_id UUID,
  event_trigger TEXT,                            -- sla_warning | critical_ticket | mention
  urgency_score INTEGER DEFAULT 0,               -- 0-100
  
  -- The AI Magic
  raw_message TEXT,
  ai_summarized_message TEXT,                    -- Condensed context-rich short version
  
  -- Routing Decision
  delivery_channel TEXT DEFAULT 'in_app',        -- slack | sms | email | push | in_app | batched_digest
  delivery_reason TEXT,                          -- "User is off-shift, batched for tomorrow morning." or "Critical P1, overriding DND via SMS."
  
  status TEXT DEFAULT 'pending',                 -- pending | sent | read | batched | suppressed
  sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ INDEXES ════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_expert_agent ON expert_profiles(agent_id);
CREATE INDEX IF NOT EXISTS idx_expert_score ON expert_profiles(expert_score DESC);
CREATE INDEX IF NOT EXISTS idx_burnout_agent ON agent_burnout_scans(agent_id);
CREATE INDEX IF NOT EXISTS idx_burnout_score ON agent_burnout_scans(burnout_risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_kgap_status ON knowledge_gap_reports(status);
CREATE INDEX IF NOT EXISTS idx_uniconnect_prov ON uniconnect_events(provider);
CREATE INDEX IF NOT EXISTS idx_smart_notif_target ON smart_notifications(target_user_id, status);

NOTIFY pgrst, 'reload schema';
