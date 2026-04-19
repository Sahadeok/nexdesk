import { createClient } from '@supabase/supabase-js';

// We simulate a single-tenant environment for now by targeting a dummy static UUID
const WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

export async function GET(req) {
  try {
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim().replace(/[\r\n]/g, '');
    const supabase = createClient(url, key);

    const { data: settings, error } = await supabase
      .from('workspace_settings')
      .select('*')
      .eq('id', WORKSPACE_ID)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    // Default fallback if table is empty or missing
    const fallback = {
      sla_critical_hours: 4.0,
      sla_high_hours: 8.0,
      sla_medium_hours: 24.0,
      sla_low_hours: 72.0,
      business_start_time: '09:00:00',
      business_end_time: '18:00:00',
      business_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      timezone: 'Asia/Kolkata',
      ai_auto_route_enabled: true,
      ai_sre_enabled: true,
      ai_postmortem_enabled: true,
      slack_notifications_enabled: false
    };

    return new Response(JSON.stringify({ success: true, settings: settings || fallback }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}

export async function POST(req) {
  try {
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim().replace(/[\r\n]/g, '');
    const supabase = createClient(url, key);

    const body = await req.json();
    const { sla_critical_hours, sla_high_hours, sla_medium_hours, sla_low_hours, business_start_time, business_end_time, business_days, timezone, ai_auto_route_enabled, ai_sre_enabled, ai_postmortem_enabled, slack_notifications_enabled } = body;

    const payload = {
      id: WORKSPACE_ID,
      sla_critical_hours,
      sla_high_hours,
      sla_medium_hours,
      sla_low_hours,
      business_start_time,
      business_end_time,
      business_days,
      timezone,
      ai_auto_route_enabled,
      ai_sre_enabled,
      ai_postmortem_enabled,
      slack_notifications_enabled,
      updated_at: new Date()
    };

    const { data, error } = await supabase
      .from('workspace_settings')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    
    return new Response(JSON.stringify({ success: true, message: 'Settings saved successfully', settings: data }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}

