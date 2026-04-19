-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PHASES 62–65 — ENTERPRISE CORE SUPREMACY                        ║
-- ║  P62: Email-to-Ticket | P63: SSO Integration (SAML/OIDC)          ║
-- ║  P64: Automation Builder | P65: Asset Management (CMDB)           ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══ P62: EMAIL TO TICKET PARSER ═══════════════════════════════════
-- NexDesk AI reading unstructured IT emails and building perfect metadata

CREATE TABLE IF NOT EXISTS email_ingestion_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id TEXT UNIQUE,
  sender_email TEXT NOT NULL,
  raw_subject TEXT,
  raw_body TEXT,

  -- AI Parsed Output
  parsed_intent TEXT,                            -- password_reset, hardware_request, outage_report
  parsed_urgency TEXT DEFAULT 'medium',          -- critical, high, medium, low
  parsed_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ai_sentiment TEXT,                             -- angry, urgent, neutral, polite
  extracted_assets JSONB DEFAULT '[]',           -- ["MacBook Pro 16", "Docker Engine"]
  
  -- Result
  converted_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  ai_accuracy_score INTEGER DEFAULT 0,           -- Internal routing confidence %
  
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P63: SSO INTEGRATION (SAML/OIDC) ═══════════════════════════════
-- Configuration for enterprise identity providers

CREATE TABLE IF NOT EXISTS sso_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT DEFAULT 'default',              -- Multi-tenant link
  provider_name TEXT NOT NULL,                   -- Okta, Entra ID (Azure AD), Google Workspace
  protocol TEXT NOT NULL,                        -- SAML 2.0, OpenID Connect
  
  -- Config
  issuer_url TEXT,
  client_id TEXT,
  metadata_url TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT FALSE,
  last_test_sync_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  last_error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P64: AUTOMATION BUILDER ═══════════════════════════════════════
-- No-code workflow recipes (Trigger -> Condition -> Action)

CREATE TABLE IF NOT EXISTS automation_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Logic
  trigger_event TEXT NOT NULL,                   -- ticket.created, ticket.updated, email.received
  conditions JSONB DEFAULT '[]',                 -- [{"field": "priority", "operator": "eq", "value": "critical"}]
  actions JSONB DEFAULT '[]',                    -- [{"type": "webhook", "url": "..."}, {"type": "assign_to", "team": "L2"}]
  
  -- Stats
  times_triggered INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P65: ASSET MANAGEMENT (CMDB) ══════════════════════════════════
-- Hardware, software, and cloud assets linked to tickets

CREATE TABLE IF NOT EXISTS asset_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_tag TEXT UNIQUE NOT NULL,                -- AST-10023
  name TEXT NOT NULL,                            -- "MacBook Pro M3", "Prod DB Cluster"
  asset_type TEXT NOT NULL,                      -- hardware, software, network, cloud
  
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  department TEXT,
  
  -- Status & Lifecycle
  status TEXT DEFAULT 'active',                  -- active, in_repair, deprecated, lost
  purchase_date DATE,
  warranty_expiry DATE,
  annual_cost_inr NUMERIC(10,2) DEFAULT 0,
  
  -- Operational Details
  ip_address TEXT,
  os_version TEXT,
  last_scanned_at TIMESTAMPTZ,
  health_score INTEGER DEFAULT 100,              -- 0-100 based on linked tickets/incidents
  
  -- Link tracking
  linked_ticket_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ INDEXES ════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_email_sender ON email_ingestion_logs(sender_email);
CREATE INDEX IF NOT EXISTS idx_automation_trigger ON automation_recipes(trigger_event) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_asset_tag ON asset_inventory(asset_tag);

NOTIFY pgrst, 'reload schema';
