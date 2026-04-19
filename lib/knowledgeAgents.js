/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  KNOWLEDGE BRAIN — Multi-Agent Architecture                    ║
 * ║  🔍 Collector Agent → 🧠 Analysis Agent → ⚡ Action Agent      ║
 * ║  NexDesk Phase 17 — World's First Multi-Agent Knowledge Brain  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 *  Agent Communication Flow:
 *  ┌──────────┐    ticket_data    ┌──────────┐   action_request  ┌──────────┐
 *  │ COLLECTOR │ ──────────────→  │ ANALYSIS │ ───────────────→  │  ACTION  │
 *  │  Agent    │                  │  Agent   │                   │  Agent   │
 *  └──────────┘                  └──────────┘                   └──────────┘
 *   Scans tickets                 Finds patterns                 Creates KB
 *   Extracts data                 Clusters issues                Updates skills
 *   Sends to Analysis             Identifies gaps                Builds graph
 */

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

async function callAI(prompt, jsonMode = true, maxTokens = 4000) {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) throw new Error('GROQ_API_KEY missing')
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || '{}'
  return jsonMode ? JSON.parse(content) : content
}

// ─── INTER-AGENT MESSAGE BUS ──────────────────────────────────────
async function sendMessage(supabase, fromAgent, toAgent, messageType, payload) {
  const { data } = await supabase.from('agent_messages').insert({
    from_agent: fromAgent,
    to_agent: toAgent,
    message_type: messageType,
    payload,
    status: 'pending',
  }).select().single()
  return data
}

async function ackMessage(supabase, messageId, result = {}) {
  await supabase.from('agent_messages').update({
    status: 'completed',
    processed_at: new Date().toISOString(),
    result,
  }).eq('id', messageId)
}

async function generateKBNumber(supabase) {
  const { count } = await supabase
    .from('knowledge_articles')
    .select('*', { count: 'exact', head: true })
  return `KB-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`
}

// ═══════════════════════════════════════════════════════════════════
//  🔍 AGENT 1: COLLECTOR
//     Scans resolved tickets, extracts structured data,
//     sends to Analysis Agent via message bus
// ═══════════════════════════════════════════════════════════════════
export async function runCollectorAgent(runId) {
  const supabase = getSupabase()
  const logs = []

  logs.push({ time: new Date().toISOString(), msg: '🔍 Collector Agent started' })

  // Fetch resolved tickets not yet in any KB article
  const { data: existingArticles } = await supabase
    .from('knowledge_articles')
    .select('source_ticket_ids')

  const processedTicketIds = new Set()
  for (const a of (existingArticles || [])) {
    for (const id of (a.source_ticket_ids || [])) processedTicketIds.add(id)
  }

  const { data: resolvedTickets } = await supabase
    .from('tickets')
    .select('id, ticket_number, title, description, status, priority, category_id, assigned_team, assigned_to, resolution_notes, created_at, resolved_at, updated_at, ai_routing_reason, escalation_reason')
    .in('status', ['resolved', 'closed'])
    .order('resolved_at', { ascending: false })
    .limit(100)

  const newTickets = (resolvedTickets || []).filter(t => !processedTicketIds.has(t.id))

  logs.push({ time: new Date().toISOString(), msg: `Found ${newTickets.length} unprocessed resolved tickets` })

  if (newTickets.length === 0) {
    logs.push({ time: new Date().toISOString(), msg: 'No new tickets to process. Collector done.' })
    await supabase.from('knowledge_brain_runs').update({
      tickets_scanned: 0, collector_log: logs,
    }).eq('id', runId)
    return { tickets: 0, logs }
  }

  // For each batch of tickets, extract structured knowledge data
  const batchSize = 10
  let totalSent = 0

  for (let i = 0; i < newTickets.length; i += batchSize) {
    const batch = newTickets.slice(i, i + batchSize)

    // Also fetch comments for context
    const ticketIds = batch.map(t => t.id)
    const { data: comments } = await supabase
      .from('ticket_comments')
      .select('ticket_id, comment_text, is_internal')
      .in('ticket_id', ticketIds)
      .eq('is_internal', true)

    const commentMap = {}
    for (const c of (comments || [])) {
      if (!commentMap[c.ticket_id]) commentMap[c.ticket_id] = []
      commentMap[c.ticket_id].push(c.comment_text)
    }

    // Also fetch assigned engineer info
    const assignedIds = batch.map(t => t.assigned_to).filter(Boolean)
    const { data: engineers } = await supabase
      .from('profiles')
      .select('id, email, role')
      .in('id', assignedIds.length > 0 ? assignedIds : ['00000000-0000-0000-0000-000000000000'])

    const engMap = {}
    for (const e of (engineers || [])) engMap[e.id] = e

    // Build rich ticket data packages
    const ticketPackages = batch.map(t => ({
      id: t.id,
      ticket_number: t.ticket_number,
      title: t.title,
      description: t.description,
      priority: t.priority,
      assigned_team: t.assigned_team,
      resolution_notes: t.resolution_notes,
      ai_routing_reason: t.ai_routing_reason,
      escalation_reason: t.escalation_reason,
      internal_comments: commentMap[t.id] || [],
      engineer: engMap[t.assigned_to] || null,
      created_at: t.created_at,
      resolved_at: t.resolved_at,
      resolution_time_min: t.resolved_at
        ? Math.round((new Date(t.resolved_at) - new Date(t.created_at)) / 60000)
        : null,
    }))

    // Send to Analysis Agent via message bus
    await sendMessage(supabase, 'collector', 'analysis', 'ticket_data', {
      batch_index: Math.floor(i / batchSize),
      tickets: ticketPackages,
      count: ticketPackages.length,
    })

    totalSent += ticketPackages.length
    logs.push({ time: new Date().toISOString(), msg: `Sent batch ${Math.floor(i / batchSize) + 1} (${ticketPackages.length} tickets) to Analysis Agent` })
  }

  await supabase.from('knowledge_brain_runs').update({
    tickets_scanned: totalSent,
    collector_log: logs,
  }).eq('id', runId)

  return { tickets: totalSent, logs }
}

// ═══════════════════════════════════════════════════════════════════
//  🧠 AGENT 2: ANALYSIS
//     Receives ticket data from Collector, uses AI to:
//     - Cluster similar issues
//     - Extract knowledge patterns
//     - Identify knowledge gaps
//     - Detect stale knowledge
//     Sends action requests to Action Agent
// ═══════════════════════════════════════════════════════════════════
export async function runAnalysisAgent(runId) {
  const supabase = getSupabase()
  const logs = []

  logs.push({ time: new Date().toISOString(), msg: '🧠 Analysis Agent started — waiting for Collector data' })

  // Read pending messages from Collector
  const { data: messages } = await supabase
    .from('agent_messages')
    .select('*')
    .eq('to_agent', 'analysis')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (!messages || messages.length === 0) {
    logs.push({ time: new Date().toISOString(), msg: 'No pending messages from Collector' })
    await supabase.from('knowledge_brain_runs').update({ analysis_log: logs }).eq('id', runId)
    return { patterns: 0, logs }
  }

  let totalPatterns = 0

  for (const msg of messages) {
    const tickets = msg.payload?.tickets || []
    if (tickets.length === 0) {
      await ackMessage(supabase, msg.id, { skipped: true })
      continue
    }

    logs.push({ time: new Date().toISOString(), msg: `Processing batch with ${tickets.length} tickets` })

    // Build ticket summaries for AI
    const ticketSummaries = tickets.map(t =>
      `TICKET ${t.ticket_number}:\n  Title: ${t.title}\n  Priority: ${t.priority}\n  Team: ${t.assigned_team}\n  Description: ${(t.description || '').substring(0, 200)}\n  Resolution: ${(t.resolution_notes || 'No notes').substring(0, 300)}\n  Internal Comments: ${(t.internal_comments || []).join(' | ').substring(0, 200)}\n  Resolution Time: ${t.resolution_time_min || 'unknown'} min\n  Engineer: ${t.engineer?.email || 'unassigned'}`
    ).join('\n---\n')

    // AI Analysis: Extract knowledge articles and patterns
    const prompt = `You are the Analysis Agent of a Support Knowledge Brain. Analyze these resolved IT support tickets and extract knowledge that would help future engineers solve similar issues faster.

=== RESOLVED TICKETS ===
${ticketSummaries}

Tasks:
1. GROUP similar tickets together (tickets about the same root issue)
2. For each group, extract a KNOWLEDGE ARTICLE
3. Identify PATTERNS (recurring issues, common root causes)
4. Detect knowledge gaps (what information was missing)
5. Map engineer expertise (who is good at what)

Return JSON:
{
  "knowledge_articles": [
    {
      "title": "Clear, searchable article title",
      "problem_description": "What problem does this solve",
      "root_cause": "Why this happens",
      "solution_steps": "Step 1: ...\\nStep 2: ...\\nStep 3: ...",
      "prevention_tips": "How to prevent this",
      "quick_fix": "One-line fix for experienced engineers",
      "category": "Network|Application|Database|Security|Access|Hardware|Performance|Other",
      "subcategory": "specific subcategory",
      "error_signatures": ["specific error strings to match"],
      "tags": ["relevant", "tags"],
      "source_ticket_ids": ["ticket IDs used"],
      "confidence_score": 75
    }
  ],
  "patterns": [
    {
      "pattern_name": "Name of recurring pattern",
      "description": "What keeps happening",
      "frequency": "how often",
      "affected_systems": ["systems"],
      "suggested_permanent_fix": "systemic fix"
    }
  ],
  "engineer_skills": [
    {
      "engineer_email": "email",
      "specialties": ["areas of expertise based on resolutions"],
      "knowledge_gaps": ["areas they struggled with"],
      "skill_category": "category",
      "skill_level": "beginner|intermediate|advanced|expert"
    }
  ],
  "graph_edges": [
    {
      "source_type": "error|system|article|engineer",
      "source_label": "label",
      "target_type": "article|system|error",
      "target_label": "label",
      "relationship": "fixes|causes|related_to|expert_in"
    }
  ]
}`

    const analysis = await callAI(prompt)

    // Send each extracted article to Action Agent
    for (const article of (analysis.knowledge_articles || [])) {
      await sendMessage(supabase, 'analysis', 'action', 'create_article', { article })
      totalPatterns++
    }

    // Send pattern data
    for (const pattern of (analysis.patterns || [])) {
      await sendMessage(supabase, 'analysis', 'action', 'record_pattern', { pattern })
    }

    // Send engineer skill data
    for (const skill of (analysis.engineer_skills || [])) {
      await sendMessage(supabase, 'analysis', 'action', 'update_skill', { skill })
    }

    // Send graph edges
    if ((analysis.graph_edges || []).length > 0) {
      await sendMessage(supabase, 'analysis', 'action', 'build_graph', { edges: analysis.graph_edges })
    }

    await ackMessage(supabase, msg.id, {
      articles: (analysis.knowledge_articles || []).length,
      patterns: (analysis.patterns || []).length,
      skills: (analysis.engineer_skills || []).length,
    })

    logs.push({
      time: new Date().toISOString(),
      msg: `Analysis complete: ${(analysis.knowledge_articles || []).length} articles, ${(analysis.patterns || []).length} patterns, ${(analysis.engineer_skills || []).length} skill updates`,
    })
  }

  await supabase.from('knowledge_brain_runs').update({
    patterns_found: totalPatterns,
    analysis_log: logs,
  }).eq('id', runId)

  return { patterns: totalPatterns, logs }
}

// ═══════════════════════════════════════════════════════════════════
//  ⚡ AGENT 3: ACTION
//     Receives analysis results and takes concrete actions:
//     - Creates/updates KB articles
//     - Updates engineer skill map
//     - Builds knowledge graph edges
//     - Flags stale articles
// ═══════════════════════════════════════════════════════════════════
export async function runActionAgent(runId) {
  const supabase = getSupabase()
  const logs = []
  let articlesCreated = 0
  let articlesUpdated = 0
  let skillsUpdated = 0
  let graphEdgesCreated = 0
  let staleFlagged = 0

  logs.push({ time: new Date().toISOString(), msg: '⚡ Action Agent started — processing Analysis results' })

  // Read pending messages from Analysis
  const { data: messages } = await supabase
    .from('agent_messages')
    .select('*')
    .eq('to_agent', 'action')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (!messages || messages.length === 0) {
    logs.push({ time: new Date().toISOString(), msg: 'No pending actions' })
    await supabase.from('knowledge_brain_runs').update({ action_log: logs }).eq('id', runId)
    return { articlesCreated: 0, logs }
  }

  for (const msg of messages) {
    try {
      switch (msg.message_type) {
        case 'create_article': {
          const a = msg.payload?.article
          if (!a) break

          // Check if similar article already exists
          const { data: existing } = await supabase
            .from('knowledge_articles')
            .select('id, source_ticket_ids, confidence_score, times_used')
            .ilike('title', `%${a.title.split(' ').slice(0, 3).join('%')}%`)
            .limit(1)

          if (existing && existing.length > 0) {
            // Update existing article — merge source tickets, boost confidence
            const ex = existing[0]
            const mergedIds = [...new Set([...(ex.source_ticket_ids || []), ...(a.source_ticket_ids || [])])]
            await supabase.from('knowledge_articles').update({
              source_ticket_ids: mergedIds,
              source_ticket_count: mergedIds.length,
              confidence_score: Math.min(100, (ex.confidence_score || 0) + 5),
              updated_at: new Date().toISOString(),
            }).eq('id', ex.id)
            articlesUpdated++
            logs.push({ time: new Date().toISOString(), msg: `📝 Updated KB article: ${a.title}` })
          } else {
            // Create new article
            const kbNumber = await generateKBNumber(supabase)
            await supabase.from('knowledge_articles').insert({
              article_number: kbNumber,
              title: a.title,
              problem_description: a.problem_description,
              root_cause: a.root_cause,
              solution_steps: a.solution_steps,
              prevention_tips: a.prevention_tips,
              quick_fix: a.quick_fix,
              category: a.category,
              subcategory: a.subcategory,
              error_signatures: a.error_signatures || [],
              tags: a.tags || [],
              confidence_score: a.confidence_score || 50,
              source_ticket_ids: a.source_ticket_ids || [],
              source_ticket_count: (a.source_ticket_ids || []).length,
              frameworks: [],
              status: 'active',
            })
            articlesCreated++
            logs.push({ time: new Date().toISOString(), msg: `✨ Created KB article: ${kbNumber} — ${a.title}` })
          }
          break
        }

        case 'update_skill': {
          const s = msg.payload?.skill
          if (!s || !s.engineer_email) break

          // Find engineer
          const { data: eng } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', s.engineer_email)
            .single()

          if (eng) {
            // Upsert skill map
            const { data: existingSkill } = await supabase
              .from('engineer_skill_map')
              .select('id, tickets_resolved')
              .eq('engineer_id', eng.id)
              .eq('category', s.skill_category)
              .single()

            if (existingSkill) {
              await supabase.from('engineer_skill_map').update({
                skill_level: s.skill_level,
                tickets_resolved: (existingSkill.tickets_resolved || 0) + 1,
                specialties: s.specialties || [],
                knowledge_gaps: s.knowledge_gaps || [],
                last_resolution_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }).eq('id', existingSkill.id)
            } else {
              await supabase.from('engineer_skill_map').insert({
                engineer_id: eng.id,
                engineer_email: s.engineer_email,
                category: s.skill_category,
                skill_level: s.skill_level,
                tickets_resolved: 1,
                specialties: s.specialties || [],
                knowledge_gaps: s.knowledge_gaps || [],
                last_resolution_at: new Date().toISOString(),
              })
            }
            skillsUpdated++
            logs.push({ time: new Date().toISOString(), msg: `👤 Updated skill map: ${s.engineer_email} — ${s.skill_category}` })
          }
          break
        }

        case 'build_graph': {
          const edges = msg.payload?.edges || []
          for (const edge of edges) {
            // Check if edge already exists
            const { data: existingEdge } = await supabase
              .from('knowledge_graph_edges')
              .select('id, weight')
              .eq('source_type', edge.source_type)
              .eq('source_label', edge.source_label)
              .eq('target_type', edge.target_type)
              .eq('target_label', edge.target_label)
              .eq('relationship', edge.relationship)
              .single()

            if (existingEdge) {
              await supabase.from('knowledge_graph_edges').update({
                weight: (existingEdge.weight || 1) + 1,
              }).eq('id', existingEdge.id)
            } else {
              await supabase.from('knowledge_graph_edges').insert({
                source_type: edge.source_type,
                source_id: edge.source_label,
                source_label: edge.source_label,
                target_type: edge.target_type,
                target_id: edge.target_label,
                target_label: edge.target_label,
                relationship: edge.relationship,
              })
              graphEdgesCreated++
            }
          }
          logs.push({ time: new Date().toISOString(), msg: `🔗 Added ${edges.length} knowledge graph edges` })
          break
        }

        case 'record_pattern': {
          // Patterns get stored as a special type of graph edge
          const p = msg.payload?.pattern
          if (p) {
            await supabase.from('knowledge_graph_edges').insert({
              source_type: 'pattern',
              source_id: p.pattern_name,
              source_label: p.pattern_name,
              target_type: 'system',
              target_id: (p.affected_systems || ['unknown'])[0],
              target_label: p.description,
              relationship: 'recurring_pattern',
              metadata: { frequency: p.frequency, suggested_fix: p.suggested_permanent_fix },
            })
            graphEdgesCreated++
            logs.push({ time: new Date().toISOString(), msg: `🔄 Recorded pattern: ${p.pattern_name}` })
          }
          break
        }
      }

      await ackMessage(supabase, msg.id, { success: true })
    } catch (e) {
      logs.push({ time: new Date().toISOString(), msg: `❌ Error: ${e.message}` })
      await supabase.from('agent_messages').update({
        status: 'failed', result: { error: e.message },
      }).eq('id', msg.id)
    }
  }

  // Staleness detection — flag articles not validated in 30+ days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: staleArticles } = await supabase
    .from('knowledge_articles')
    .select('id')
    .eq('status', 'active')
    .or(`last_validated_at.is.null,last_validated_at.lt.${thirtyDaysAgo}`)
    .lt('confidence_score', 60)

  for (const sa of (staleArticles || [])) {
    await supabase.from('knowledge_articles').update({
      status: 'needs_review',
      staleness_score: 80,
      updated_at: new Date().toISOString(),
    }).eq('id', sa.id)
    staleFlagged++
  }

  if (staleFlagged > 0) {
    logs.push({ time: new Date().toISOString(), msg: `⚠️ Flagged ${staleFlagged} stale articles for review` })
  }

  logs.push({ time: new Date().toISOString(), msg: `⚡ Action Agent complete: ${articlesCreated} created, ${articlesUpdated} updated, ${skillsUpdated} skills, ${graphEdgesCreated} edges` })

  await supabase.from('knowledge_brain_runs').update({
    articles_created: articlesCreated,
    articles_updated: articlesUpdated,
    skills_updated: skillsUpdated,
    graph_edges_created: graphEdgesCreated,
    stale_articles_flagged: staleFlagged,
    action_log: logs,
  }).eq('id', runId)

  return { articlesCreated, articlesUpdated, skillsUpdated, graphEdgesCreated, staleFlagged, logs }
}

// ═══════════════════════════════════════════════════════════════════
//  🚀 ORCHESTRATOR: Full Brain Scan
//     Runs all 3 agents in sequence with proper communication
// ═══════════════════════════════════════════════════════════════════
export async function runFullBrainScan() {
  const supabase = getSupabase()

  // Create run record
  const { data: run } = await supabase.from('knowledge_brain_runs').insert({
    run_type: 'full_scan',
    status: 'running',
  }).select().single()

  const runId = run.id

  try {
    // 1. Collector Agent: scan tickets, send to Analysis
    const collectorResult = await runCollectorAgent(runId)

    // 2. Analysis Agent: process collected data, send to Action
    const analysisResult = await runAnalysisAgent(runId)

    // 3. Action Agent: execute all actions
    const actionResult = await runActionAgent(runId)

    // Mark run as complete
    await supabase.from('knowledge_brain_runs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', runId)

    return {
      run_id: runId,
      status: 'completed',
      collector: collectorResult,
      analysis: analysisResult,
      action: actionResult,
    }
  } catch (e) {
    await supabase.from('knowledge_brain_runs').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
    }).eq('id', runId)
    throw e
  }
}

// ═══════════════════════════════════════════════════════════════════
//  🔎 SMART FIX RECOMMENDER
//     When a new ticket comes in, find matching KB articles
// ═══════════════════════════════════════════════════════════════════
export async function recommendFix(ticketTitle, ticketDescription) {
  const supabase = getSupabase()

  // Get all active KB articles
  const { data: articles } = await supabase
    .from('knowledge_articles')
    .select('id, article_number, title, problem_description, solution_steps, quick_fix, confidence_score, success_rate, error_signatures, tags, category')
    .eq('status', 'active')
    .order('confidence_score', { ascending: false })
    .limit(50)

  if (!articles || articles.length === 0) return { matches: [] }

  const articleSummaries = articles.map(a =>
    `KB ${a.article_number}: ${a.title} | Category: ${a.category} | Errors: ${(a.error_signatures||[]).join(', ')} | Tags: ${(a.tags||[]).join(', ')} | Confidence: ${a.confidence_score}%`
  ).join('\n')

  const prompt = `You are a Smart Fix Recommender. Match this new ticket to the most relevant knowledge base articles.

NEW TICKET:
Title: ${ticketTitle}
Description: ${ticketDescription}

KNOWLEDGE BASE ARTICLES:
${articleSummaries}

Find the top 3 most relevant KB articles. Return JSON:
{
  "matches": [
    {
      "article_number": "KB number",
      "relevance_score": 95,
      "match_reason": "Why this KB article is relevant"
    }
  ]
}`

  const result = await callAI(prompt)
  const matchedNumbers = (result.matches || []).map(m => m.article_number)
  const matched = articles.filter(a => matchedNumbers.includes(a.article_number))

  return {
    matches: (result.matches || []).map(m => ({
      ...m,
      article: matched.find(a => a.article_number === m.article_number) || null,
    })),
  }
}

// ═══════════════════════════════════════════════════════════════════
//  👤 FIND BEST ENGINEER
//     Based on skill map, find the best engineer for a ticket
// ═══════════════════════════════════════════════════════════════════
export async function findBestEngineer(category) {
  const supabase = getSupabase()

  const { data: skills } = await supabase
    .from('engineer_skill_map')
    .select('*, profiles(email, full_name, role)')
    .eq('category', category)
    .order('tickets_resolved', { ascending: false })
    .limit(5)

  return {
    experts: (skills || []).map(s => ({
      email: s.engineer_email,
      name: s.profiles?.full_name,
      skill_level: s.skill_level,
      tickets_resolved: s.tickets_resolved,
      specialties: s.specialties,
      avg_resolution_min: s.avg_resolution_min,
    })),
  }
}
