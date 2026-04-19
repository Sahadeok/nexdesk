const url = 'http://localhost:3000/api/error-surge';
const payload = {
  app_id: 'final_v3',
  app_name: 'Final V3',
  event: {
    event_type: 'js_error',
    message: 'V3: TypeError at line 42'
  }
};

const h = {
  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYmVhampqZGd0cXN3Ymp4eml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODc1NzYsImV4cCI6MjA4Nzg2MzU3Nn0.160fbYCbdECRpied-F4tlSHIMtewQ93BG6Q9wcJ-UM8',
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYmVhampqZGd0cXN3Ymp4eml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODc1NzYsImV4cCI6MjA4Nzg2MzU3Nn0.160fbYCbdECRpied-F4tlSHIMtewQ93BG6Q9wcJ-UM8'
};

async function run() {
  for (let i = 1; i <= 4; i++) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const b = await r.json();
    console.log('C' + i + ': cnt=' + b.event_count + ' tkt=' + b.ticket_created + ' action=' + b.action);
    await new Promise(r => setTimeout(r, 800));
  }

  await new Promise(r => setTimeout(r, 2000));

  const s = await (await fetch('https://ihbeajjjdgtqswbjxziu.supabase.co/rest/v1/error_surges?app_id=eq.final_v3&select=event_count,ticket_created', { headers: h })).json();
  console.log('SURGE: cnt=' + s[0]?.event_count + ' tkt=' + s[0]?.ticket_created);

  const t = await (await fetch('https://ihbeajjjdgtqswbjxziu.supabase.co/rest/v1/tickets?source=eq.error_surge&order=created_at.desc&limit=1&select=ticket_number,title', { headers: h })).json();
  if (t[0]) console.log('TKT: ' + t[0].ticket_number + ' ' + t[0].title);
  else console.log('TKT: none');
  
  console.log(s[0]?.ticket_created ? '\n✅ SUCCESS!' : '\n❌ FAIL');
}
run();
