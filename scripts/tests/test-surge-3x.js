const url = 'http://localhost:3000/api/error-surge';
const payload = {
  app_id: 'test_app_123',
  app_name: 'Test Application',
  event: {
    event_type: 'js_error',
    message: "Simulated Uncaught TypeError: Cannot read property 'foo' of undefined"
  }
};

async function run() {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const t = await r.json();
    console.log(`Call ${i+1}:`, JSON.stringify(t));
  }
}
run();
