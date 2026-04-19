const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually for test script
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL or Key not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- Phase 15 Test: Multi-tenant & Super Admin ---');
  
  console.log('\n1. Checking for "tenants" table...');
  const { data: tData, error: tErr } = await supabase.from('tenants').select('*');
  if (tErr) {
    console.error('❌ Error checking tenants:', tErr.message);
  } else {
    console.log('✅ Table "tenants" exists.');
    console.log(`📊 Found ${tData.length} tenants:`, tData.map(t => t.subdomain).join(', '));
  }

  console.log('\n2. Checking for "is_super_admin" column in "profiles"...');
  const { data: pData, error: pErr } = await supabase.from('profiles').select('email, is_super_admin').limit(5);
  if (pErr) {
    console.error('❌ Error checking is_super_admin column:', pErr.message);
  } else {
    console.log('✅ "is_super_admin" column exists.');
    console.log('📊 Sample Profiles:', pData);
  }

  console.log('\n3. Checking tenant association in other tables...');
  const tables = ['tickets', 'app_registry', 'health_logs', 'session_events'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('tenant_id').limit(1);
    if (error) {
      console.error(`❌ Table "${table}" error check:`, error.message);
    } else {
      console.log(`✅ Table "${table}" has "tenant_id" column.`);
    }
  }
  
  console.log('\n--- Test Complete ---');
}

check();
