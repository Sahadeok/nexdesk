-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 17 — SUPPORT KNOWLEDGE BRAIN                               ║
-- ║  Multi-Agent AI Architecture: Collector → Analysis → Action       ║
-- ║  NexDesk — The Future of IT Support                               ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ── 1. KNOWLEDGE ARTICLES ───────────────────────────────────────────
-- AI-generated knowledge base articles extracted from resolved tickets
CREATE TABLE IF NOT EXISTS knowledge_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_number TEXT UNIQUE NOT NULL,           -- KB-2026-0001
  title TEXT NOT NULL,
  
  -- Content (AI-Generated)
  problem_description TEXT,                      -- What was the problem
  root_cause TEXT,                               -- Why it happened
  solution_steps TEXT,                           -- Step-by-step fix (JSON or markdown)
  prevention_tips TEXT,                          -- How to prevent recurrence
  quick_fix TEXT,                                -- 1-line fix for experienced engineers
  
  -- Classification
  category TEXT,                                 -- Network, Application, Database, etc.
  subcategory TEXT,
  frameworks JSONB DEFAULT '[]',                 -- ["React", "Spring Boot"]
  error_signatures JSONB DEFAULT '[]',           -- ["TimeoutError", "ECONNREFUSED"]
  tags JSONB DEFAULT '[]',
  
  -- Quality & Confidence
  confidence_score INTEGER DEFAULT 0,            -- 0-100 based on how many times fix worked
  times_used INTEGER DEFAULT 0,                  -- How many tickets used this KB
  times_successful INTEGER DEFAULT 0,            -- How many times fix actually worked
  success_rate NUMERIC(5,2) DEFAULT 0,           -- success/used * 100
  
  -- Source Tickets
  source_ticket_ids JSONB DEFAULT '[]',          -- Tickets this KB was extracted from
  source_ticket_count INTEGER DEFAULT 0,
  
  -- Lifecycle
  status TEXT DEFAULT 'active',                  -- active, stale, archived, needs_review
  staleness_score INTEGER DEFAULT 0,             -- 0-100, high = needs update
  last_validated_at TIMESTAMPTZ,
  auto_generated BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. KNOWLEDGE GRAPH EDGES ────────────────────────────────────────
-- Maps relationships: Error ↔ Fix, System ↔ Issue, Article ↔ Article
CREATE TABLE IF NOT EXISTS knowledge_graph_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  source_type TEXT NOT NULL,                     -- article, error, system, engineer, category
  source_id TEXT NOT NULL,                       -- ID or name
  source_label TEXT,
  
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_label TEXT,
  
  relationship TEXT NOT NULL,                    -- fixes, causes, related_to, supersedes, depends_on, expert_in
  weight INTEGER DEFAULT 1,                      -- Strength of relationship
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. AGENT MESSAGES (Inter-Agent Communication Bus) ───────────────
-- Collector → Analysis → Action communication
CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  from_agent TEXT NOT NULL,                      -- collector, analysis, action
  to_agent TEXT NOT NULL,
  message_type TEXT NOT NULL,                    -- ticket_data, pattern_found, action_request, action_result
  
  payload JSONB NOT NULL DEFAULT '{}',           -- The actual data
  
  status TEXT DEFAULT 'pending',                 -- pending, processing, completed, failed
  processed_at TIMESTAMPTZ,
  result JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. ENGINEER SKILL MAP ───────────────────────────────────────────
-- Tracks what each engineer knows based on resolution history
CREATE TABLE IF NOT EXISTS engineer_skill_map (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  engineer_id UUID REFERENCES profiles(id),
  engineer_email TEXT,
  
  category TEXT NOT NULL,                        -- Network, Database, Security, etc.
  skill_level TEXT DEFAULT 'beginner',           -- beginner, intermediate, advanced, expert
  tickets_resolved INTEGER DEFAULT 0,
  avg_resolution_min INTEGER DEFAULT 0,
  
  specialties JSONB DEFAULT '[]',               -- ["Redis timeouts", "OAuth2 flows"]
  knowledge_gaps JSONB DEFAULT '[]',            -- ["Docker networking", "K8s pods"]
  
  last_resolution_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. KNOWLEDGE BRAIN RUNS ─────────────────────────────────────────
-- Tracks each brain scan cycle
CREATE TABLE IF NOT EXISTS knowledge_brain_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  run_type TEXT DEFAULT 'full_scan',            -- full_scan, incremental, targeted
  status TEXT DEFAULT 'running',                -- running, completed, failed
  
  tickets_scanned INTEGER DEFAULT 0,
  articles_created INTEGER DEFAULT 0,
  articles_updated INTEGER DEFAULT 0,
  patterns_found INTEGER DEFAULT 0,
  skills_updated INTEGER DEFAULT 0,
  graph_edges_created INTEGER DEFAULT 0,
  stale_articles_flagged INTEGER DEFAULT 0,
  
  -- Agent Activity Log
  collector_log JSONB DEFAULT '[]',
  analysis_log JSONB DEFAULT '[]',
  action_log JSONB DEFAULT '[]',
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_kb_status ON knowledge_articles(status);
CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_articles(category);
CREATE INDEX IF NOT EXISTS idx_kb_confidence ON knowledge_articles(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_kb_graph_source ON knowledge_graph_edges(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_kb_graph_target ON knowledge_graph_edges(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_kb_graph_rel ON knowledge_graph_edges(relationship);
CREATE INDEX IF NOT EXISTS idx_kb_agents_status ON agent_messages(status);
CREATE INDEX IF NOT EXISTS idx_kb_agents_to ON agent_messages(to_agent, status);
CREATE INDEX IF NOT EXISTS idx_kb_skill_eng ON engineer_skill_map(engineer_id);
CREATE INDEX IF NOT EXISTS idx_kb_skill_cat ON engineer_skill_map(category);
CREATE INDEX IF NOT EXISTS idx_kb_runs ON knowledge_brain_runs(status);

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
