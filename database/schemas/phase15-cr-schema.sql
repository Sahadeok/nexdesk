-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 15 — CHANGE INTELLIGENCE (CR MODULE)                       ║
-- ║  AI-Powered Change Request Management                             ║
-- ║  NexDesk — The Future of IT Support                               ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ── 1. CHANGE REQUESTS ─────────────────────────────────────────────────
-- Core CR records with full lifecycle tracking
CREATE TABLE IF NOT EXISTS change_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cr_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  -- AI-Generated Fields
  ai_summary TEXT,
  ai_risk_score INTEGER DEFAULT 0,              -- 0-100
  ai_risk_reasoning TEXT,
  ai_impact_analysis TEXT,
  ai_rollback_plan TEXT,
  ai_blast_radius JSONB DEFAULT '{}',           -- { services: [], teams: [], users_affected: 0 }
  ai_recommended_window TEXT,
  ai_confidence INTEGER DEFAULT 0,
  
  -- Classification
  change_type TEXT DEFAULT 'standard',          -- standard, emergency, normal, expedited
  risk_level TEXT DEFAULT 'medium',             -- low, medium, high, critical
  category TEXT DEFAULT 'infrastructure',       -- infrastructure, application, database, network, security, config
  urgency TEXT DEFAULT 'medium',
  
  -- Scheduling
  planned_start TIMESTAMPTZ,
  planned_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  maintenance_window TEXT,
  
  -- Ownership
  requested_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  cab_lead UUID REFERENCES profiles(id),        -- Change Advisory Board lead
  
  -- Affected Systems
  affected_services JSONB DEFAULT '[]',         -- ["Payment Gateway", "BSE API", ...]
  affected_teams JSONB DEFAULT '[]',
  affected_environments TEXT DEFAULT 'production',  -- staging, production, both
  
  -- Implementation
  implementation_steps JSONB DEFAULT '[]',      -- [{step, description, duration_min, rollback_step}]
  rollback_plan TEXT,
  testing_plan TEXT,
  communication_plan TEXT,
  
  -- Status & Lifecycle
  status TEXT DEFAULT 'draft',                  -- draft, pending_review, approved, rejected, scheduled, in_progress, deployed, rolled_back, closed, cancelled
  approval_status TEXT DEFAULT 'pending',       -- pending, approved, rejected, cab_review
  
  -- Results
  deployment_success BOOLEAN,
  post_deployment_notes TEXT,
  lessons_learned TEXT,
  
  -- Relations
  related_tickets JSONB DEFAULT '[]',           -- ticket IDs that triggered this CR
  related_crs JSONB DEFAULT '[]',               -- linked CRs
  tenant_id UUID REFERENCES tenants(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. CR APPROVALS ────────────────────────────────────────────────────
-- Multi-stage CAB (Change Advisory Board) approval workflow
CREATE TABLE IF NOT EXISTS cr_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cr_id UUID REFERENCES change_requests(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES profiles(id),
  approver_role TEXT,                           -- cab_member, technical_lead, manager, security
  
  status TEXT DEFAULT 'pending',                -- pending, approved, rejected, deferred
  decision_reason TEXT,
  conditions TEXT,                              -- "Approved with condition: deploy after market hours"
  
  ai_recommendation TEXT,                       -- AI suggests approve/reject with reasoning
  ai_risk_flag BOOLEAN DEFAULT FALSE,
  
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. CR CONFLICTS ───────────────────────────────────────────────────
-- AI-detected cross-CR conflicts
CREATE TABLE IF NOT EXISTS cr_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cr_id_a UUID REFERENCES change_requests(id) ON DELETE CASCADE,
  cr_id_b UUID REFERENCES change_requests(id) ON DELETE CASCADE,
  
  conflict_type TEXT DEFAULT 'service_overlap',  -- service_overlap, time_overlap, dependency_chain, resource_conflict, team_conflict
  severity TEXT DEFAULT 'medium',                -- low, medium, high, critical
  
  description TEXT,
  ai_analysis TEXT,
  ai_recommendation TEXT,                        -- "Reschedule CR-2026-042 to next maintenance window"
  
  status TEXT DEFAULT 'active',                  -- active, resolved, dismissed, auto_resolved
  resolution_notes TEXT,
  resolved_by UUID REFERENCES profiles(id),
  
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ── 4. CR DEPLOYMENTS ─────────────────────────────────────────────────
-- Live deployment tracking with real-time metrics
CREATE TABLE IF NOT EXISTS cr_deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cr_id UUID REFERENCES change_requests(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT DEFAULT 'preparing',              -- preparing, deploying, monitoring, stable, degraded, rolling_back, rolled_back, completed, failed
  phase TEXT DEFAULT 'pre_deploy',              -- pre_deploy, deploy, smoke_test, canary, full_rollout, post_deploy
  progress INTEGER DEFAULT 0,                   -- 0-100%
  
  -- Live Metrics
  error_rate_before FLOAT DEFAULT 0,
  error_rate_during FLOAT DEFAULT 0,
  error_rate_after FLOAT DEFAULT 0,
  latency_before_ms INTEGER DEFAULT 0,
  latency_during_ms INTEGER DEFAULT 0,
  latency_after_ms INTEGER DEFAULT 0,
  health_score INTEGER DEFAULT 100,             -- 0-100
  
  -- Canary Analysis
  canary_percentage INTEGER DEFAULT 0,
  canary_healthy BOOLEAN DEFAULT TRUE,
  canary_metrics JSONB DEFAULT '{}',
  
  -- Rollback
  auto_rollback_triggered BOOLEAN DEFAULT FALSE,
  rollback_reason TEXT,
  rollback_completed_at TIMESTAMPTZ,
  
  -- Timeline
  deploy_started_at TIMESTAMPTZ,
  deploy_completed_at TIMESTAMPTZ,
  monitoring_until TIMESTAMPTZ,
  
  -- Logs
  deploy_logs JSONB DEFAULT '[]',               -- [{timestamp, message, level}]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. CR POST ANALYSIS ──────────────────────────────────────────────
-- AI-powered post-deployment analysis
CREATE TABLE IF NOT EXISTS cr_post_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cr_id UUID REFERENCES change_requests(id) ON DELETE CASCADE,
  
  -- AI Analysis
  overall_verdict TEXT DEFAULT 'success',       -- success, partial_success, failure, needs_review
  success_score INTEGER DEFAULT 0,              -- 0-100
  
  ai_summary TEXT,
  ai_what_went_well TEXT,
  ai_what_went_wrong TEXT,
  ai_root_cause TEXT,
  ai_lessons_learned TEXT,
  ai_action_items JSONB DEFAULT '[]',           -- [{action, owner, deadline, priority}]
  ai_recommendations JSONB DEFAULT '[]',
  
  -- Metrics Comparison
  metrics_before JSONB DEFAULT '{}',
  metrics_after JSONB DEFAULT '{}',
  performance_delta JSONB DEFAULT '{}',         -- { error_rate: -2.3, latency: +5ms, ... }
  
  -- Impact
  users_affected INTEGER DEFAULT 0,
  downtime_minutes INTEGER DEFAULT 0,
  revenue_impact_estimate TEXT,
  incidents_caused INTEGER DEFAULT 0,
  
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ
);

-- ── INDEXES ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cr_status ON change_requests(status);
CREATE INDEX IF NOT EXISTS idx_cr_risk ON change_requests(risk_level);
CREATE INDEX IF NOT EXISTS idx_cr_planned ON change_requests(planned_start);
CREATE INDEX IF NOT EXISTS idx_cr_tenant ON change_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cr_approvals_cr ON cr_approvals(cr_id);
CREATE INDEX IF NOT EXISTS idx_cr_conflicts_a ON cr_conflicts(cr_id_a);
CREATE INDEX IF NOT EXISTS idx_cr_conflicts_b ON cr_conflicts(cr_id_b);
CREATE INDEX IF NOT EXISTS idx_cr_deploy_cr ON cr_deployments(cr_id);

-- ── RELOAD SCHEMA ──────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
