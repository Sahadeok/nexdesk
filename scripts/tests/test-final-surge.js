const url = 'http://localhost:3000/api/error-surge';
const payload = {
  app_id: 'test_final_v2',
  app_name: 'Final Test App',
  event: {
    event_type: 'js_error',
    message: "FINAL_TEST: TypeError at handleSubmit line 42"
  }
};

async function run() {
  for (let i = 1; i <= 4; i++) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const t = await r.json();
    console.log(`Call ${i}: ${JSON.stringify(t)}`);
    // Small delay between calls
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Wait for async ticket creation
  await new Promise(r => setTimeout(r, 3000));

  // Check surges
  const headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYmVhampqZGd0cXN3Ymp4eml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODc1NzYsImV4cCI6MjA4Nzg2MzU3Nn0.160fbYCbdECRpied-F4tlSHIMtewQ93BG6Q9wcJ-UM8',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYmVhampqZGd0cXN3Ymp4eml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODc1NzYsImV4cCI6MjA4Nzg2MzU3Nn0.160fbYCbdECRpied-F4tlSHIMtewQ93BG6Q9wcJ-UM8'
  };

  const s = await (await fetch('https://ihbeajjjdgtqswbjxziu.supabase.co/rest/v1/error_surges?select=event_count,ticket_created,ticket_id&app_id=eq.test_final_v2&order=created_at.desc&limit=1', { headers })).json();
  console.log('\nSURGE RESULT:', JSON.stringify(s));
  
  // Check latest tickets
  const t = await (await fetch('https://ihbeajjjdgtqswbjxziu.supabase.co/rest/v1/tickets?select=ticket_number,title,priority,status,source&order=created_at.desc&limit=3', { headers })).json();
  console.log('\nLATEST TICKETS:');
  t.forEach(x => console.log(`  ${x.ticket_number} | ${x.title?.substring(0,60)} | ${x.source}`));
}
run();
