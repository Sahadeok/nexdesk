async function run() {
  try {
    console.log("Fetching a sample resolved ticket to perform a postmortem on...");
    const headers = {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
    };
    
    // Using simple fetch to the REST API endpoints directly
    const tBody = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/tickets?select=id,ticket_number,title&limit=1', { headers });
    const t = await tBody.json();
    
    if (!t || t.length === 0) {
      console.log("❌ No tickets found to run Postmortem against! Create a ticket first.");
      return;
    }
    
    const ticket_id = t[0].id;
    console.log("Found Ticket:", t[0].ticket_number, "|", t[0].title);
    
    console.log("\nGenerating AI Postmortem... This might take 10-15 seconds. Please wait...");
    
    // Call our new API! Need to point to localhost. Next.js server MUST be running.
    const res = await fetch('http://localhost:3000/api/postmortems/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_id: ticket_id })
    });
    
    const pmResult = await res.json();
    if (pmResult.postmortem) {
       console.log("✅ Success! Postmortem Generated.");
       console.log("=========================================");
       console.log("Number:", pmResult.postmortem.pm_number);
       console.log("Title: ", pmResult.postmortem.title);
       console.log("Type:  ", pmResult.postmortem.incident_type);
       console.log("=========================================");
       console.log("You can view the full postmortem at:");
       console.log(`http://localhost:3000/dashboard/postmortems/${pmResult.postmortem.id}`);
    } else {
       console.error("❌ Failed:", pmResult);
    }

  } catch (err) {
    if(err.cause?.code === 'ECONNREFUSED'){
      console.error("❌ Error: Could not connect to the API. Make sure your Next.js frontend is running (npm run dev) on port 3000!");
    } else {
      console.error("❌ Error:", err.message);
    }
  }
}

run();
