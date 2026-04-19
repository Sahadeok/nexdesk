import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runFullBrainScan, recommendFix, findBestEngineer } from '../../../lib/knowledgeAgents'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// ── POST: Trigger brain scan or recommend fix ───────────────────────
export async function POST(req) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'full_scan') {
      const result = await runFullBrainScan()
      return NextResponse.json({ success: true, ...result })
    }

    if (action === 'recommend_fix') {
      const result = await recommendFix(body.title, body.description)
      return NextResponse.json({ success: true, ...result })
    }

    if (action === 'find_engineer') {
      const result = await findBestEngineer(body.category)
      return NextResponse.json({ success: true, ...result })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[knowledge-brain] POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── GET: Fetch KB data ──────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'articles'
    const id = searchParams.get('id')
    const supabase = getSupabase()

    if (type === 'articles') {
      const status = searchParams.get('status')
      const category = searchParams.get('category')
      let query = supabase.from('knowledge_articles')
        .select('*').order('confidence_score', { ascending: false }).limit(100)
      if (status) query = query.eq('status', status)
      if (category) query = query.eq('category', category)
      if (id) query = query.eq('id', id)
      const { data, error } = await query
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, articles: data || [] })
    }

    if (type === 'graph') {
      const { data } = await supabase.from('knowledge_graph_edges')
        .select('*').order('weight', { ascending: false }).limit(200)
      return NextResponse.json({ success: true, edges: data || [] })
    }

    if (type === 'skills') {
      const { data } = await supabase.from('engineer_skill_map')
        .select('*').order('tickets_resolved', { ascending: false })
      return NextResponse.json({ success: true, skills: data || [] })
    }

    if (type === 'runs') {
      const { data } = await supabase.from('knowledge_brain_runs')
        .select('*').order('created_at', { ascending: false }).limit(20)
      return NextResponse.json({ success: true, runs: data || [] })
    }

    if (type === 'messages') {
      const { data } = await supabase.from('agent_messages')
        .select('*').order('created_at', { ascending: false }).limit(50)
      return NextResponse.json({ success: true, messages: data || [] })
    }

    if (type === 'stats') {
      const [articlesR, graphR, skillsR, runsR, messagesR] = await Promise.all([
        supabase.from('knowledge_articles').select('*', { count: 'exact', head: true }),
        supabase.from('knowledge_graph_edges').select('*', { count: 'exact', head: true }),
        supabase.from('engineer_skill_map').select('*', { count: 'exact', head: true }),
        supabase.from('knowledge_brain_runs').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('agent_messages').select('*', { count: 'exact', head: true }),
      ])
      // Article stats
      const { data: activeArticles } = await supabase.from('knowledge_articles')
        .select('confidence_score, status, category')
      const articles = activeArticles || []
      const avgConfidence = articles.length
        ? Math.round(articles.reduce((s,a) => s + (a.confidence_score||0), 0) / articles.length) : 0
      const staleCount = articles.filter(a => a.status === 'needs_review').length
      const categories = [...new Set(articles.map(a => a.category).filter(Boolean))]

      return NextResponse.json({
        success: true,
        stats: {
          total_articles: articlesR.count || 0,
          total_edges: graphR.count || 0,
          total_skills: skillsR.count || 0,
          total_runs: runsR.count || 0,
          total_messages: messagesR.count || 0,
          avg_confidence: avgConfidence,
          stale_count: staleCount,
          categories,
        },
      })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── PATCH: Update KB article ────────────────────────────────────────
export async function PATCH(req) {
  try {
    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Article id required' }, { status: 400 })
    const supabase = getSupabase()
    updates.updated_at = new Date().toISOString()
    if (updates.status === 'active' && !updates.last_validated_at) {
      updates.last_validated_at = new Date().toISOString()
      updates.staleness_score = 0
    }
    const { data, error } = await supabase.from('knowledge_articles')
      .update(updates).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, article: data })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

