-- ============================================================
-- Phase 11 Support 3.0 — Complete Schema
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- 1. app_events — events from nexdesk-widget-v3.js
CREATE TABLE IF NOT EXISTS public.app_events (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id      text,
  app_name    text,
  event_type  text,
  message     text,
  stack_trace text,
  page        text,
  endpoint    text,
  status_code integer,
  duration_ms integer,
  user_id     text,
  session_id  text,
  severity    text,
  framework   text,
  raw_data    jsonb,
  logged_at   timestamp with time zone DEFAULT now(),
  created_at  timestamp with time zone DEFAULT now()
);

-- 2. predictions — AI predictions from predict-issues engine
CREATE TABLE IF NOT EXISTS public.predictions (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id             text,
  app_name           text,
  prediction_type    text,
  title              text,
  description        text,
  confidence         integer,
  risk_level         text,
  pattern_found      text,
  affected_users     integer,
  recommended_action text,
  status             text DEFAULT 'active',
  ticket_id          uuid,
  predicted_at       timestamp with time zone DEFAULT now(),
  created_at         timestamp with time zone DEFAULT now()
);

-- 3. heal_actions — self-heal engine log
CREATE TABLE IF NOT EXISTS public.heal_actions (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id         text,
  app_name       text,
  trigger_event  text,
  action_type    text,
  action_taken   text,
  result         text,
  was_silent     boolean DEFAULT false,
  ticket_id      uuid,
  duration_ms    integer,
  healed_at      timestamp with time zone DEFAULT now(),
  created_at     timestamp with time zone DEFAULT now()
);

-- 4. widget_sessions — chat sessions from nexdesk-widget-v3.js
CREATE TABLE IF NOT EXISTS public.widget_sessions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id      text,
  app_name    text,
  session_id  text,
  page        text,
  issue_desc  text,
  ai_response text,
  resolved    boolean DEFAULT false,
  ticket_id   uuid,
  started_at  timestamp with time zone DEFAULT now(),
  created_at  timestamp with time zone DEFAULT now()
);

-- 5. error_surges — tracks repeated identical errors
CREATE TABLE IF NOT EXISTS public.error_surges (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id          text,
  app_name        text,
  error_signature text,
  event_count     integer DEFAULT 1,
  first_seen_at   timestamp with time zone DEFAULT now(),
  last_seen_at    timestamp with time zone DEFAULT now(),
  ticket_created  boolean DEFAULT false,
  ticket_id       uuid,
  created_at      timestamp with time zone DEFAULT now()
);

-- ============================================================
-- DISABLE ROW LEVEL SECURITY on all Phase 11 tables
-- (APIs use anon key — RLS must be off for them to work)
-- ============================================================
ALTER TABLE public.app_events     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.heal_actions   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_surges   DISABLE ROW LEVEL SECURITY;

-- Verification — should show 5 rows with relrowsecurity = false
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('app_events','predictions','heal_actions','widget_sessions','error_surges');
