const url = 'http://localhost:3000/api/error-surge';
const payload = {
  app_id: 'test_app_full',
  app_name: 'Full Test App',
  event: {
    event_type: 'js_error',
    message: "FULLTEST: Cannot read property 'bar' of null"
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
    console.log(`Call ${i}: status=${r.status} body=${JSON.stringify(t)}`);
  }

  // Now check error_surges table
  const check = await fetch('https://ihbeajjjdgtqswbjxziu.supabase.co/rest/v1/error_surges?select=*&order=created_at.desc&limit=5', {
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYmVhampqZGd0cXN3Ymp4eml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODc1NzYsImV4cCI6MjA4Nzg2MzU3Nn0.160fbYCbdECRpied-F4tlSHIMtewQ93BG6Q9wcJ-UM8',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYmVhampqZGd0cXN3Ymp4eml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODc1NzYsImV4cCI6MjA4Nzg2MzU3Nn0.160fbYCbdECRpied-F4tlSHIMtewQ93BG6Q9wcJ-UM8'
    }
  });
  const surges = await check.json();
  console.log('\n--- error_surges table ---');
  console.log(JSON.stringify(surges, null, 2));

  // Check tickets
  const tcheck = await fetch('https://ihbeajjjdgtqswbjxziu.supabase.co/rest/v1/tickets?select=id,ticket_number,title,source&order=created_at.desc&limit=3', {
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYmVhampqZGd0cXN3Ymp4eml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODc1NzYsImV4cCI6MjA4Nzg2MzU3Nn0.160fbYCbdECRpied-F4tlSHIMtewQ93BG6Q9wcJ-UM8',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYmVhampqZGd0cXN3Ymp4eml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODc1NzYsImV4cCI6MjA4Nzg2MzU3Nn0.160fbYCbdECRpied-F4tlSHIMtewQ93BG6Q9wcJ-UM8'
    }
  });
  const tickets = await tcheck.json();
  console.log('\n--- latest tickets ---');
  console.log(JSON.stringify(tickets, null, 2));
}
run();
