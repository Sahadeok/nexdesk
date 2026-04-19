require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase.from('app_events').select('id').limit(1);
  if (error) {
    if (error.code === '42P01') {
      console.log('TABLE_MISSING');
    } else {
      console.log('ERROR:', error);
    }
  } else {
    console.log('TABLE_EXISTS');
  }
}

check();
