require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data, error } = await supabase.from('app_events').insert({
    app_id: 'test',
    app_name: 'test',
    event_type: 'test',
    message: 'test'
  }).select().single();
  
  if (error) {
    console.log('INSERT ERROR:', error.message, error.code, error.details);
  } else {
    console.log('INSERT SUCCESS:', data.id);
  }
}
run();
