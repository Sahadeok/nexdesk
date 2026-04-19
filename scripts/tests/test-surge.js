fetch('http://localhost:3000/api/error-surge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    app_id: 'test_app_123',
    app_name: 'Test Application',
    event: {
      event_type: 'js_error',
      message: "Simulated Uncaught TypeError: Cannot read property 'foo' of undefined"
    }
  })
})
.then(r => r.text().then(t => ({ status: r.status, body: t })))
.then(res => console.log('Surge API Result:', res))
.catch(err => console.error('Surge API Error:', err));

fetch('http://localhost:3000/api/app-watcher', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    app_id: 'test_app_123',
    app_name: 'Test Application',
    events: [{
      event_type: 'js_error',
      message: "Simulated Uncaught TypeError: Cannot read property 'foo' of undefined",
      severity: 'high',
      logged_at: new Date().toISOString()
    }]
  })
})
.then(r => r.text().then(t => ({ status: r.status, body: t })))
.then(res => console.log('Watcher API Result:', res))
.catch(err => console.error('Watcher API Error:', err));
