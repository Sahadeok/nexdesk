-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PHASES 56–58 — INDUSTRY SECRECY & COMPLIANCE SUPREMACY          ║
-- ║  P56: BFSI Pack (Banking/FinTech) | P57: Healthcare Pack (HIPAA)  ║
-- ║  P58: E-Commerce Pack                                             ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══ P56 & P57: COMPLIANCE VALIDATION & DATA MASKING ═══════════════
-- Unified table for BFSI (PCI-DSS/RBI) and Healthcare (HIPAA)

CREATE TABLE IF NOT EXISTS industry_compliance_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID,
  industry_pack TEXT NOT NULL,                   -- bfsi | healthcare | ecommerce
  
  -- The Scan Details
  raw_text_scanned TEXT,                         -- snippet of what was checked (normally not stored in prod, just for demo)
  masked_text TEXT,                              -- what the agent actually sees
  
  -- Violations
  violation_found BOOLEAN DEFAULT FALSE,
  severity TEXT DEFAULT 'low',                   -- critical (CC number), high (PHI), medium
  regulatory_framework TEXT,                     -- PCI-DSS | HIPAA | GDPR | RBI
  
  -- Detection Details
  pii_entities_detected JSONB DEFAULT '[]',      -- [{"type": "credit_card", "framework": "PCI-DSS"}, {"type": "ssn", "framework": "HIPAA"}]
  ai_compliance_verdict TEXT,                    -- "Failed: Cleartext 16-digit PAN detected. Auto-vaulted."
  
  -- Vault (Simulated secure tokenization)
  secure_vault_token TEXT,                       -- tokenized reference to the real data
  
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ P58: E-COMMERCE BURST METRICS ═════════════════════════════════
-- Handles hyper-velocity events like Black Friday or Flash Sales

CREATE TABLE IF NOT EXISTS ecommerce_velocity_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name TEXT NOT NULL,                      -- 'Black_Friday_2026', 'Cart_Abandonment_Spike'
  
  -- E-Com specific metrics
  tickets_per_minute INTEGER DEFAULT 0,
  abandoned_carts_recovered INTEGER DEFAULT 0,
  lost_revenue_risk_inr NUMERIC(15,2) DEFAULT 0,
  
  -- Issues (Refunds, Shipping, Payment Gateway)
  top_friction_point TEXT,                       -- 'Razorpay_Timeout' | 'Delhivery_Delay'
  
  -- AI Automation
  auto_refunds_processed INTEGER DEFAULT 0,
  ai_ecommerce_strategy TEXT,                    -- "Surge detected in Payment Failures. Auto-extending cart expiry by 15 mins."
  
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ INDEXES ════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_compliance_ticket ON industry_compliance_scans(ticket_id);
CREATE INDEX IF NOT EXISTS idx_compliance_industry ON industry_compliance_scans(industry_pack);
CREATE INDEX IF NOT EXISTS idx_ecommerce_event ON ecommerce_velocity_events(event_name);

NOTIFY pgrst, 'reload schema';
