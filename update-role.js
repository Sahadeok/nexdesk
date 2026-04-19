const { createClient } = require('@supabase/supabase-js');
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYmVhampqZGd0cXN3Ymp4eml1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI4NzU3NiwiZXhwIjoyMDg3ODYzNTc2fQ.MchauOLVeRSOUwo3-S8x4MuQe3k6DGTqiXeZO5EaM20';
async function run() {
  const s = createClient('https://ihbeajjjdgtqswbjxziu.supabase.co', KEY);
  const { data, error } = await s.from('profiles').update({ role: 'DEVELOPER' }).eq('email', 'user1@nexdesk.com').select();
  if (error) {
    console.log('Error updating role:', error.message);
  } else {
    console.log('✅ Successfully updated user1@nexdesk.com to DEVELOPER role.');
  }
}
run();
