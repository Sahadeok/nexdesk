import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(req) {
  try {
    const { ticket_id, pm_number } = await req.json();
    if (!ticket_id) return NextResponse.json({ error: 'ticket_id is required' }, { status: 400 });

    // 1. Fetch Ticket Data
    const { data: ticket, error: ticketErr } = await supabase
      .from('tickets')
      .select('*, profiles(full_name)')
      .eq('id', ticket_id)
      .single();

    if (ticketErr || !ticket) throw new Error('Ticket not found');

    // 2. Draft prompt for Groq
    const prompt = `You are an expert Enterprise Site Reliability Engineer and AI Postmortem Writer.
Your task is to generate a comprehensive, blame-free postmortem for the following resolved incident.

Ticket ID: ${ticket.ticket_number}
Title: ${ticket.title}
Severity/Priority: ${ticket.priority}
Description: ${ticket.description}
Status: ${ticket.status}
Resolution Notes: ${ticket.ai_solution || 'Incident was resolved successfully by the team.'}

Produce a JSON response with the following schema exactly:
{
  "title": "Postmortem: [short sensible title]",
  "executive_brief": "A 2-paragraph CXO level summary of what happened and the impact.",
  "technical_deepdive": "Detailed technical explanation of the failure mechanism.",
  "narrative_story": "A timeline-based story of the incident.",
  "lessons_learned": "What did we learn from this?",
  "prevention_plan": "Systemic prevention measures to avoid recurrence.",
  "incident_type": "outage", // or degradation, security, etc.
  "root_causes": [
    {
      "level_label": "Proximate Cause", // or Contributing Factor, Systemic Root Cause
      "title": "Short title",
      "description": "Longer description",
      "confidence_pct": 95,
      "ai_explanation": "Detailed explanation"
    }
  ],
  "action_items": [
    {
      "title": "Action title",
      "description": "What needs to be done",
      "action_type": "preventive", // or corrective
      "priority": "high", // or medium, low
      "owner": "SRE Team",
      "deadline": "Q3 2026"
    }
  ]
}

Return ONLY valid JSON. Nothing else.`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
    });

    const groqData = await groqRes.json();
    if (!groqData.choices || !groqData.choices[0].message) {
        throw new Error("Failed to get response from Groq");
    }

    const pmData = JSON.parse(groqData.choices[0].message.content);

    // 3. Insert Postmortem into Supabase
    const pmNumberToUse = pm_number || `PM-${new Date().getFullYear()}-${Math.floor(Math.random()*10000).toString().padStart(4, '0')}`;

    const { data: pm, error: pmErr } = await supabase
      .from('postmortems')
      .insert({
        pm_number: pmNumberToUse,
        title: pmData.title,
        incident_ticket_id: ticket.id,
        incident_severity: ticket.priority,
        incident_type: pmData.incident_type || 'outage',
        ai_executive_brief: pmData.executive_brief,
        ai_technical_deepdive: pmData.technical_deepdive,
        ai_narrative_story: pmData.narrative_story,
        ai_lessons_learned: pmData.lessons_learned,
        ai_prevention_plan: pmData.prevention_plan,
        status: 'draft',
        tenant_id: ticket.tenant_id
      })
      .select()
      .single();

    if (pmErr) throw pmErr;

    // 4. Insert Root Causes
    if (pmData.root_causes && Array.isArray(pmData.root_causes)) {
      const dbCauses = pmData.root_causes.map(rc => ({
        postmortem_id: pm.id,
        level_label: rc.level_label,
        title: rc.title,
        description: rc.description,
        confidence_pct: rc.confidence_pct,
        ai_explanation: rc.ai_explanation
      }));
      await supabase.from('postmortem_root_causes').insert(dbCauses);
    }

    // 5. Insert Action Items
    if (pmData.action_items && Array.isArray(pmData.action_items)) {
      const dbActions = pmData.action_items.map(ai => ({
        postmortem_id: pm.id,
        title: ai.title,
        description: ai.description,
        action_type: ai.action_type,
        priority: ai.priority,
        owner: ai.owner,
        deadline: ai.deadline,
        status: 'open'
      }));
      await supabase.from('postmortem_action_items').insert(dbActions);
    }

    return NextResponse.json({ success: true, postmortem: pm });
  } catch (err) {
    console.error('Postmortem Generation Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

