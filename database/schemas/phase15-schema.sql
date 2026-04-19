-- 1. Create Tenants Table (Wait, you didn't have this yet!)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL, 
  logo_url TEXT,
  brand_primary_color TEXT DEFAULT '#2563eb',
  brand_secondary_color TEXT DEFAULT '#0f172a',
  billing_plan TEXT DEFAULT 'trial',
  subscription_status TEXT DEFAULT 'active',
  billing_cycle_start TIMESTAMPTZ DEFAULT NOW(),
  tickets_used_this_month INTEGER DEFAULT 0,
  mural_url TEXT,
  login_welcome TEXT DEFAULT 'Welcome to NexDesk IT Support',
  plan_status TEXT DEFAULT 'active',
  max_users INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add Multi-tenant columns to everything
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE app_registry ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE health_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE session_events ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- 3. Add Super Admin Flag
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- 4. MAKE YOU THE SUPER ADMIN!
UPDATE profiles SET is_super_admin = TRUE WHERE email IN ('admin@nexdesk.com', 'user1@nexdesk.com');

-- 5. Force the Schema Cache to Reload so your App stops showing the red error
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
