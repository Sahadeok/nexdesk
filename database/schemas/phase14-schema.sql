-- Phase 14: Multi-tenant SaaS Schema
-- Run this in Supabase SQL Editor

-- 1. Create Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL, -- e.g. 'google', 'microsoft', 'testing'
  logo_url TEXT,
  brand_primary_color TEXT DEFAULT '#2563eb',
  brand_secondary_color TEXT DEFAULT '#0f172a',
  billing_plan TEXT DEFAULT 'trial', -- trial, pro, enterprise
  subscription_status TEXT DEFAULT 'active', -- 'active', 'past_due', 'canceled'
  billing_cycle_start TIMESTAMPTZ DEFAULT NOW(),
  tickets_used_this_month INTEGER DEFAULT 0,
  mural_url TEXT,
  login_welcome TEXT DEFAULT 'Welcome to NexDesk IT Support',
  plan_status TEXT DEFAULT 'active',
  max_users INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add tenant_id to Profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- 3. Add tenant_id to Tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- 4. Add tenant_id to App Registry
ALTER TABLE app_registry ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- 5. Add tenant_id to Health Logs & Session Events (for isolation)
ALTER TABLE health_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE session_events ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- 6. Insert a Default Tenant for Existing Data
INSERT INTO tenants (name, subdomain, billing_plan)
VALUES ('NexDesk Global', 'main', 'enterprise')
ON CONFLICT (subdomain) DO NOTHING;

-- Associate all existing data with the default tenant
DO $$
DECLARE
    main_id UUID;
BEGIN
    SELECT id INTO main_id FROM tenants WHERE subdomain = 'main' LIMIT 1;
    
    UPDATE profiles SET tenant_id = main_id WHERE tenant_id IS NULL;
    UPDATE tickets SET tenant_id = main_id WHERE tenant_id IS NULL;
    UPDATE app_registry SET tenant_id = main_id WHERE tenant_id IS NULL;
    UPDATE health_logs SET tenant_id = main_id WHERE tenant_id IS NULL;
    UPDATE session_events SET tenant_id = main_id WHERE tenant_id IS NULL;
END $$;

-- 7. Enable RLS for Strict Isolation
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_registry ENABLE ROW LEVEL SECURITY;

-- Tenant Policy: Users can see their own tenant details
CREATE POLICY tenant_view_policy ON tenants FOR SELECT TO authenticated USING (
  id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Profile Policy: Users can see profiles in their own tenant
CREATE POLICY profile_tenant_policy ON profiles FOR ALL TO authenticated USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Ticket Policy: Users can only see tickets for their organization
CREATE POLICY ticket_tenant_policy ON tickets FOR ALL TO authenticated USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- App Registry Policy: Users can see apps for their organization
CREATE POLICY app_tenant_policy ON app_registry FOR ALL TO authenticated USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);
