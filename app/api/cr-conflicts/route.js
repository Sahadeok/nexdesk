import { NextResponse } from 'next/server'
import { detectConflicts } from '../../../lib/crEngine'

// ── POST: Detect conflicts for a CR ─────────────────────────────────
export async function POST(req) {
  try {
    const { cr_id } = await req.json()
    if (!cr_id) return NextResponse.json({ error: 'cr_id required' }, { status: 400 })

    const result = await detectConflicts(cr_id)

    return NextResponse.json({
      success: true,
      conflicts: result.conflicts || [],
      overall_conflict_level: result.overall_conflict_level || 'none',
      summary: result.summary || 'No conflicts detected',
    })

  } catch (e) {
    console.error('[cr-conflicts] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

