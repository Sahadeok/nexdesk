const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envLocal = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let serviceKey = '';

envLocal.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, serviceKey);

async function fixDeva() {
  console.log('Fixing Deva using Service Role Key...');

  // First get the user id
  const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.log("Failed to list users:", listErr.message);
    return;
  }

  const devaUser = usersData.users.find(u => u.email === 'deva@nexdesk.com');
  
  if (devaUser) {
    console.log("Found Deva user ID:", devaUser.id);
    
    // Auto-confirm the user
    console.log("Updating user to auto-confirm...");
    const { data: updateData, error: updateErr } = await supabase.auth.admin.updateUserById(
      devaUser.id,
      { email_confirm: true }
    );
    
    if (updateErr) {
      console.log("Failed to confirm email:", updateErr.message);
    } else {
      console.log("SUCCESS! User email is now confirmed.");
    }
  } else {
    console.log("Deva not found in auth.users. Creating via Admin API...");
    const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
      email: 'deva@nexdesk.com',
      password: 'Deva@123',
      email_confirm: true,
      user_metadata: { name: 'Deva' }
    });
    
    if (createErr) {
      console.log("Failed to create admin user:", createErr.message);
    } else {
      console.log("SUCCESS! Created Deva user natively confirmed. ID:", createData.user.id);
    }
  }
}

fixDeva();
