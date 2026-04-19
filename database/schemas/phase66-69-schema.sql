-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PHASES 66–69 — ITIL & GOVERNANCE SUPREMACY                      ║
-- ║  P66: Problem Management (ITIL) | P67: Mobile App Sync Backend    ║
-- ║  P68: Advanced CMDB Graph      | P69: On-Premise Deployment Track║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══ P66: PROBLEM MANAGEMENT (ITIL) ════════════════════════════════
-- Groups multiple Incidents (tickets) under a singular Root Problem

CREATE TABLE IF NOT EXISTS itil_problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_title TEXT NOT NULL,
  state TEXT DEFAULT 'investigating',            -- investigating, root_cause_identified, workaround_applied, resolved
  
  -- Root Cause Analysis
  rca_summary TEXT,                              -- "Switch module 5 memory overflow"
  known_error_record BOOLEAN DEFAULT FALSE,      -- KEDB publication flag
  workaround_details TEXT,
  
  -- AI Deduplication & Mapping
  ai_cluster_confidence INTEGER DEFAULT 0,
  linked_incident_count INTEGER DEFAULT 0,
  estimated_business_impact_inr NUMERIC(12,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: We map tickets to problems using a simple tracking column on tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS itil_problem_id UUID REFERENCES itil_problems(id) ON DELETE SET NULL;


-- ═══ P68: ADVANCED CMDB (RELATIONSHIP GRAPH) ════════════════════════
-- Builds upon P65 Asset Management. Maps dependencies (A relies on B)

CREATE TABLE IF NOT EXISTS cmdb_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_asset_id UUID NOT NULL,                 -- e.g., The VM Server
  child_asset_id UUID NOT NULL,                  -- e.g., The PostgreSQL Database
  
  relationship_type TEXT DEFAULT 'hosts',        -- hosts, connects_to, depends_on, powers
  impact_severity TEXT DEFAULT 'critical',       -- if parent dies, child status
  
  -- Prevent cyclic
  UNIQUE(parent_asset_id, child_asset_id)
);


-- ═══ P67: MOBILE APP SYNC BACKEND ══════════════════════════════════
-- Tracks agent mobile devices for emergency Push Notification routing

CREATE TABLE IF NOT EXISTS mobile_fleet_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  device_os TEXT NOT NULL,                       -- iOS, Android
  app_version TEXT,
  
  -- Push & Offline Capabilities
  fcm_push_token TEXT,
  offline_cache_size_mb INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ═══ P69: ON-PREMISE DEPLOYMENT TRACKER ════════════════════════════
-- Tracks isolated NexDesk installations (Air-gapped)

CREATE TABLE IF NOT EXISTS onprem_deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name TEXT NOT NULL,                     -- "SBI Internal Data Center"
  deployment_mode TEXT DEFAULT 'air_gapped',     -- air_gapped, hybrid, vpc_peered
  
  -- Versions & Licenses
  installed_version TEXT NOT NULL,
  target_upgrade_version TEXT,
  license_status TEXT DEFAULT 'valid',
  
  -- Health (Manual sync for air-gapped)
  last_health_packet_date TIMESTAMPTZ,
  node_count INTEGER DEFAULT 3,
  infra_status_json JSONB DEFAULT '{}',          -- {"cpu": "45%", "mem": "12GB"}
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ INDEXES ════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_itil_state ON itil_problems(state);
CREATE INDEX IF NOT EXISTS idx_cmdb_parent ON cmdb_relationships(parent_asset_id);
CREATE INDEX IF NOT EXISTS idx_cmdb_child ON cmdb_relationships(child_asset_id);
CREATE INDEX IF NOT EXISTS idx_mobile_agent ON mobile_fleet_devices(agent_id);

NOTIFY pgrst, 'reload schema';
