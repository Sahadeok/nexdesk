const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  console.log('🚀 Creating test ticket for Password Reset...');
  
  const ticket_number = `TKT-TEST-${Date.now()}`;
  const { data: ticket, error } = await supabase.from('tickets').insert({
    ticket_number,
    title: 'Password Reset Request',
    description: 'Autonomous Agent Test: Please reset my password immediately.',
    status: 'open',
    priority: 'high',
    source: 'test_script'
  }).select().single();

  if (error) {
    console.error('❌ Failed to create ticket:', error);
    return;
  }

  console.log('✅ Ticket created:', ticket.ticket_number, 'ID:', ticket.id);
  console.log('🤖 Triggering Autonomous Agent...');

  try {
    const res = await fetch('http://localhost:3000/api/autonomous-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_id: ticket.id })
    });

    const data = await res.json();
    console.log('📦 Agent Response:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('🔥 SUCCESS! Agent resolved requested ticket.');
    } else {
      console.log('⚠️ Agent finished but could not resolve (Confidence might be low).');
    }
  } catch (e) {
    console.error('❌ API Call failed:', e.message);
  }
}

test();
