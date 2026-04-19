async function run() {
  try {
    const headers = {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYmVhampqZGd0cXN3Ymp4eml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODc1NzYsImV4cCI6MjA4Nzg2MzU3Nn0.160fbYCbdECRpied-F4tlSHIMtewQ93BG6Q9wcJ-UM8',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYmVhampqZGd0cXN3Ymp4eml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODc1NzYsImV4cCI6MjA4Nzg2MzU3Nn0.160fbYCbdECRpied-F4tlSHIMtewQ93BG6Q9wcJ-UM8'
    };
    
    // Surges
    const s = await (await fetch('https://ihbeajjjdgtqswbjxziu.supabase.co/rest/v1/error_surges?select=event_count,ticket_created,error_signature&order=created_at.desc&limit=3', { headers })).json();
    console.log('=== SURGES ===');
    s.forEach(x => console.log(`count=${x.event_count} ticket=${x.ticket_created} sig=${x.error_signature?.substring(0,25)}`));

    // Latest tickets
    const t = await (await fetch('https://ihbeajjjdgtqswbjxziu.supabase.co/rest/v1/tickets?select=ticket_number,title,priority,status&order=created_at.desc&limit=3', { headers })).json();
    console.log('\n=== LATEST TICKETS ===');
    t.forEach(x => console.log(`${x.ticket_number} | ${x.title?.substring(0,55)} | ${x.priority} | ${x.status}`));
  } catch(e) { console.error(e.message); }
}
run();
