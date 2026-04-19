-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 12 — AUTONOMOUS AI SRE                                      ║
-- ║  Agentic L4 Operations & Zero-Touch Incident Management            ║
-- ║  NexDesk — The Future of IT Support                                ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ── 1. ACTIVE AI INCIDENTS ──────────────────────────────────────────
-- Stores the high-level anomalies currently being handled by the Autonomous SRE
CREATE TABLE IF NOT EXISTS ai_sre_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  active_anomaly TEXT NOT NULL,
  
  status TEXT DEFAULT 'investigating', -- investigating, mitigating, resolved, escalated
  severity TEXT DEFAULT 'critical',    -- critical, high, warning
  
  -- The core intelligence findings securely logged
  root_cause_identified TEXT,
  chosen_action TEXT,
  execution_command TEXT,
  confidence_pct NUMERIC DEFAULT 0,
  
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ── 2. AI TELEMETRY LOGS (TERMINAL AUDIT) ───────────────────────────
-- Maintains a perfect audit history of every thought/action the AI took
CREATE TABLE IF NOT EXISTS ai_sre_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID REFERENCES ai_sre_incidents(id) ON DELETE CASCADE,
  
  log_level TEXT NOT NULL,             -- ALERT, INFO, TRACE, WARN, ACTION, CMD, SUCCESS, FAIL
  log_message TEXT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. AI ACTION LIBRARY (ALLOWED AUTO-FIXES) ───────────────────────
-- Defines exactly what functions the AI is legally allowed to execute autonomously
CREATE TABLE IF NOT EXISTS ai_sre_allowed_actions (
  action_code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  requires_human_approval BOOLEAN DEFAULT FALSE,
  
  -- Webhook or shell command to hit when chosen
  execution_target TEXT 
);

-- ── INDEXES & SECURITY ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_sre_incidents_status ON ai_sre_incidents(status);
CREATE INDEX IF NOT EXISTS idx_ai_sre_logs_incident ON ai_sre_logs(incident_id);

-- ── DEFAULT RULES ──────────────────────────────────────────────────
INSERT INTO ai_sre_allowed_actions (action_code, description, is_enabled, requires_human_approval, execution_target) VALUES
('ROLLBACK_DEPLOYMENT', 'Reverts the last pushed branch to the previous stable commit hash.', true, false, 'bash:/scripts/ops/rollback.sh'),
('CLEAR_REDIS_CACHE', 'Flushes the primary Redis cluster instances completely.', true, false, 'api:/infrastructure/redis/flush'),
('RESTART_PAYMENT_K8S_POD', 'Evicts and forcibly respawns Kubernetes pods specifically in the payment namespace.', true, false, 'kubectl:/payment-service/restart'),
('OPTIMIZE_DB_INDEX', 'Runs a REINDEX CONCURRENTLY or EXPLAIN ANALYZE tuning query.', true, true, 'psql:/scripts/db/tune.sql'),
('BLOCK_IP_ADDRESS', 'Adds a malicious IP to the WAF global deny-blocklist.', true, false, 'api:/security/waf/block')
ON CONFLICT DO NOTHING;

-- ── RELOAD SCHEMA ──────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
