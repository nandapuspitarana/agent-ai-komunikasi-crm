async function main() {
  const url = 'http://172.22.4.127:11434/api/chat';
  const payload = {
    model: 'gemma4:e4b',
    messages: [
      { role: 'user', content: 'Halo, siapa kamu?' }
    ],
    stream: false
  };

  try {
    console.log('Sending chat request to native Ollama API at:', url);
    const start = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000)
    });
    const duration = Date.now() - start;
    console.log(`Status: ${response.status} (${duration}ms)`);
    const data = await response.json();
    console.log('Response Data:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error calling Ollama:', e.message);
  }
}

main();
