-- ═══════════════════════════════════════════════════════════
-- NexDesk Phase 2 — Complete Database Setup
-- Run this ENTIRE file in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/ihbeajjjdgtqswbjxziu/sql/new
-- ═══════════════════════════════════════════════════════════

-- ── 1. PROFILES TABLE (stores role for each user) ──────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email       VARCHAR(255),
  full_name   VARCHAR(200),
  role        VARCHAR(30) NOT NULL DEFAULT 'END_USER',
  department  VARCHAR(100),
  phone       VARCHAR(20),
  is_vip      BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. CATEGORIES TABLE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  code         VARCHAR(50) NOT NULL UNIQUE,
  default_team VARCHAR(20) NOT NULL DEFAULT 'L1',
  icon         VARCHAR(10),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. SLA RULES TABLE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS sla_rules (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  priority       VARCHAR(20) NOT NULL UNIQUE,
  response_hours NUMERIC(5,2) NOT NULL,
  resolve_hours  NUMERIC(5,2) NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. TICKET SEQUENCE (for TKT-2026-0001 format) ─────────
CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1;

-- ── 5. TICKETS TABLE (main table) ─────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number       VARCHAR(20) NOT NULL UNIQUE,
  title               VARCHAR(500) NOT NULL,
  description         TEXT,
  status              VARCHAR(30) NOT NULL DEFAULT 'open',
  priority            VARCHAR(20) NOT NULL DEFAULT 'medium',
  category_id         UUID REFERENCES categories(id),
  assigned_team       VARCHAR(20) DEFAULT 'L1',
  assigned_to         UUID REFERENCES auth.users(id),
  created_by          UUID REFERENCES auth.users(id) NOT NULL,
  escalated_to_l2     BOOLEAN DEFAULT FALSE,
  escalation_reason   TEXT,
  ai_routing_reason   TEXT,
  assigned_dev_team   VARCHAR(100),
  assigned_dev_reason TEXT,
  sla_response_due    TIMESTAMPTZ,
  sla_resolve_due     TIMESTAMPTZ,
  sla_response_met    BOOLEAN,
  sla_resolve_met     BOOLEAN,
  resolution_notes    TEXT,
  csat_rating         INTEGER,
  csat_comment        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  resolved_at         TIMESTAMPTZ,
  closed_at           TIMESTAMPTZ
);

-- ── 6. TICKET COMMENTS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_comments (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id    UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES auth.users(id) NOT NULL,
  comment_text TEXT NOT NULL,
  is_internal  BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. TICKET HISTORY (audit log) ─────────────────────────
CREATE TABLE IF NOT EXISTS ticket_history (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id     UUID REFERENCES tickets(id) NOT NULL,
  changed_by    UUID REFERENCES auth.users(id),
  field_changed VARCHAR(100),
  old_value     TEXT,
  new_value     TEXT,
  note          TEXT,
  changed_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. INDEXES (for fast queries) ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_tickets_status        ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_team ON tickets(assigned_team);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to   ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by    ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at    ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_priority      ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_comments_ticket       ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_history_ticket        ON ticket_history(ticket_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role         ON profiles(role);

-- ── 9. AUTO-CREATE PROFILE ON NEW USER SIGNUP ─────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'END_USER'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 10. SEED CATEGORIES ───────────────────────────────────
INSERT INTO categories (name, code, default_team, icon) VALUES
  ('Network & VPN',         'NETWORK',     'L1', '🌐'),
  ('Hardware & Devices',    'HARDWARE',    'L1', '💻'),
  ('Email & Communication', 'EMAIL',       'L1', '📧'),
  ('Access & Passwords',    'ACCESS',      'L1', '🔑'),
  ('Application Error',     'APP_ERROR',   'L2', '⚠️'),
  ('Software Installation', 'SOFTWARE',    'L1', '📦'),
  ('Performance Issue',     'PERFORMANCE', 'L1', '🐌'),
  ('Data & Database',       'DATABASE',    'L2', '🗄️'),
  ('Security Issue',        'SECURITY',    'L2', '🔒'),
  ('Other',                 'OTHER',       'L1', '❓')
ON CONFLICT (code) DO NOTHING;

-- ── 11. SEED SLA RULES ────────────────────────────────────
INSERT INTO sla_rules (priority, response_hours, resolve_hours) VALUES
  ('critical', 0.5,  2),
  ('high',     1,    4),
  ('medium',   4,    24),
  ('low',      24,   72)
ON CONFLICT (priority) DO NOTHING;

-- ── 12. DISABLE RLS (Phase 2 — enable properly in Phase 3) 
ALTER TABLE profiles         DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories       DISABLE ROW LEVEL SECURITY;
ALTER TABLE sla_rules        DISABLE ROW LEVEL SECURITY;
ALTER TABLE tickets          DISABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments  DISABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history   DISABLE ROW LEVEL SECURITY;

-- ── 13. SET YOUR ADMIN USER ROLE ──────────────────────────
-- This creates/updates admin@nexdesk.com profile as ADMIN
INSERT INTO profiles (id, email, full_name, role)
SELECT id, email, split_part(email,'@',1), 'ADMIN'
FROM auth.users
WHERE email = 'admin@nexdesk.com'
ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';

-- ── DONE! Check by running: SELECT * FROM profiles; ───────
-- You should see admin@nexdesk.com with role = ADMIN
