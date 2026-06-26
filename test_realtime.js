const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing connection to:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRealtime() {
  const sessionId = "test-session";
  const channel = supabase.channel(`session_${sessionId}`, {
    config: {
      broadcast: { ack: true },
    },
  });

  console.log('Subscribing...');
  
  channel.on('broadcast', { event: 'new_message' }, (payload) => {
    console.log('RECEIVED BROADCAST!', payload);
  });

  await new Promise((resolve, reject) => {
    channel.subscribe((status, err) => {
      console.log('Status:', status);
      if (status === 'SUBSCRIBED') {
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        reject(err || new Error(`Status: ${status}`));
      }
    });
  });

  console.log('Sending broadcast...');
  await channel.send({
    type: 'broadcast',
    event: 'new_message',
    payload: { message: 'Hello from Node!' }
  });

  setTimeout(() => {
    console.log('Done testing.');
    process.exit(0);
  }, 2000);
}

testRealtime().catch(console.error);
