-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  ADMIN WORKSPACE SETTINGS SCHEMA                                     ║
-- ║  Configures SLAs, Business Hours, and AI Automation per Workspace    ║
-- ╚══════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS workspace_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID, -- If multi-tenant is enabled, link to tenants table
  
  -- ── SLA Configuration (Time to Resolve in Hours) ──
  sla_critical_hours NUMERIC DEFAULT 4.0,
  sla_high_hours NUMERIC DEFAULT 8.0,
  sla_medium_hours NUMERIC DEFAULT 24.0,
  sla_low_hours NUMERIC DEFAULT 72.0,
  
  -- ── Business Hours (For SLA pauses) ──
  business_days TEXT[] DEFAULT '{"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"}',
  business_start_time TIME DEFAULT '09:00:00',
  business_end_time TIME DEFAULT '18:00:00',
  timezone TEXT DEFAULT 'Asia/Kolkata',

  -- ── AI Automation Controls ──
  ai_auto_route_enabled BOOLEAN DEFAULT true,
  ai_sre_enabled BOOLEAN DEFAULT false,
  ai_postmortem_enabled BOOLEAN DEFAULT true,
  slack_notifications_enabled BOOLEAN DEFAULT false,

  -- ── Audit ──
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: In a true SaaS model, tenant_id would be UNIQUE. 
-- For MVP, we can just insert a single default row.
INSERT INTO workspace_settings (id, sla_critical_hours, sla_high_hours, sla_medium_hours, sla_low_hours) 
VALUES ('00000000-0000-0000-0000-000000000001', 4, 8, 24, 72)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
