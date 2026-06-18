async function main() {
  const targets = [
    { 
      name: 'Proxy Chat Check', 
      url: 'http://172.22.4.127:8200/api/v1/chat', 
      method: 'POST', 
      body: {
        message: 'Halo, saya perlu bantuan',
        session_id: 'test-session-1234',
        user_id: 'test-user-1234',
        tenant_id: 'default-tenant',
        system_prompt: 'You are a helpful assistant',
        document_ids: []
      }
    }
  ];

  for (const t of targets) {
    try {
      console.log(`Checking ${t.name}: ${t.url}`);
      const headers = { 'Content-Type': 'application/json' };
      const options = {
        method: t.method || 'GET',
        headers,
        signal: AbortSignal.timeout(10000)
      };
      if (t.body) {
        options.body = JSON.stringify(t.body);
      }
      const res = await fetch(t.url, options);
      console.log(`Status: ${res.status}`);
      const text = await res.text();
      console.log('Response:', text.slice(0, 500));
    } catch (e) {
      console.error(`Error checking ${t.name}:`, e.message);
    }
    console.log('----------------------------------------------------');
  }
}

main();
