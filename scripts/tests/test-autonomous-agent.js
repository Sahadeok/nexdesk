const { createClient } = require('@supabase/supabase-js')

// Manual env config for the script
const SUBA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const SUBA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(SUBA_URL, SUBA_KEY)

async function test() {
  console.log('🚀 Phase 12: Autonomous Agent Simulation')
  
  // 1. Create Ticket
  const { data: ticket, error } = await supabase.from('tickets').insert({
    ticket_number: 'AUTO-' + Math.floor(Math.random() * 9000 + 1000),
    title: 'FORGOT PASSWORD: User Sahadeo needs reset',
    description: 'Autonomous agent test case for password reset',
    priority: 'low',
    status: 'open',
    created_by_email: 'sahadeok@gmail.com'
  }).select().single()

  if (error) {
    console.error('❌ Ticket creation failed:', error)
    return
  }

  console.log('✅ Created Ticket:', ticket.ticket_number, 'ID:', ticket.id)

  // 2. Trigger API via cURL in the terminal later, or just log instructions
  console.log('\n👉 NEXT STEP: Run this cURL command to trigger the agent:')
  console.log(`curl -X POST http://localhost:3000/api/autonomous-agent -H "Content-Type: application/json" -d "{\\"ticket_id\\": \\"${ticket.id}\\"}"`)
}

test()
