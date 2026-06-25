import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:8201';

async function runTest() {
  console.log('🧪 Starting Visitor Collection Test...\n');

  try {
    // 1. Get a Tenant ID
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.log('❌ No tenant found in DB.');
      return;
    }
    const tenantId = tenant.id;
    const contactId = `test_visitor_${Date.now()}`;
    console.log(`✅ Using Tenant ID: ${tenantId}`);
    console.log(`✅ Generated Contact ID: ${contactId}\n`);

    // 2. Test Layer 1 (Passive)
    console.log('📍 [Phase 2] Testing Passive Data Collection (POST /api/widget/visitor)...');
    const passiveRes = await fetch(`${BASE_URL}/api/widget/visitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        contactId,
        referrerUrl: 'https://google.com',
        pageUrl: 'https://test.com/pricing',
        deviceType: 'desktop',
        browserName: 'Chrome',
        os: 'Windows'
      })
    });
    
    console.log(`   Response Status: ${passiveRes.status}`);
    const passiveData = await passiveRes.json();
    console.log('   Response Data:', passiveData);

    // 3. Test Layer 1 (Geolocation)
    console.log('\n🌍 [Phase 2] Testing Geolocation (POST /api/widget/visitor/geo)...');
    const geoRes = await fetch(`${BASE_URL}/api/widget/visitor/geo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        contactId,
        latitude: -6.2088,
        longitude: 106.8456
      })
    });
    console.log(`   Response Status: ${geoRes.status}`);
    const geoData = await geoRes.json();
    console.log('   Response Data:', geoData);

    // 4. Test Layer 2 & 4 (NLP & Classification via Message)
    console.log('\n💬 [Phase 3 & 4] Testing Message NLP & AI Classification...');
    // We send a message with name, email and a "hot lead" intent
    const message = "halo, nama saya John Doe. email saya john.doe@example.com. Saya tertarik membeli layanan premium ini sekarang juga, berapa harganya?";
    console.log(`   Sending message: "${message}"`);
    
    // Create a dummy chat session first
    const sessionRes = await fetch(`${BASE_URL}/api/widget/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        contactId,
        message
      })
    });
    console.log(`   Response Status: ${sessionRes.status}`);
    const msgData = await sessionRes.json();
    console.log('   Response Data:', msgData);

    // Wait a brief moment for background tasks (fire and forget updates)
    console.log('\n⏳ Waiting 2 seconds for background DB updates...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. Verify DB
    console.log('\n🔍 [Verification] Checking VisitorProfile in Database...');
    const profile = await prisma.visitorProfile.findUnique({
      where: {
        tenantId_contactId: { tenantId, contactId }
      }
    });

    if (profile) {
      console.log('✅ VisitorProfile found!');
      console.log('   - Name:', profile.name, profile.name === 'John Doe' ? '✅' : '❌');
      console.log('   - Email:', profile.email, profile.email === 'john.doe@example.com' ? '✅' : '❌');
      console.log('   - Device:', profile.deviceType, profile.deviceType === 'desktop' ? '✅' : '❌');
      console.log('   - Browser:', profile.browserName, profile.browserName === 'Chrome' ? '✅' : '❌');
      console.log('   - Geo:', `${profile.latitude}, ${profile.longitude}`, (profile.latitude === -6.2088) ? '✅' : '❌');
      console.log('   - Lead Classification:', profile.leadClassification);
      console.log('   - Lead Score:', profile.leadScore);
      console.log('   - Topics Discussed:', profile.topicsDiscussed);
      console.log('   - Message Count:', profile.messageCount);
      console.log('   - Sessions:', profile.sessions);
      
      if (msgData.triggerLeadForm) {
        console.log('✅ Lead Form Triggered! Config:', msgData.leadFormConfig);
      } else {
        console.log('⚠️ Lead form not triggered in this response (might be dependent on AI parsing)');
      }

      // 6. Test parsing tag manually to verify the function works
      console.log('\n🔧 Testing classification tag parser...');
      const { parseClassificationTag } = require('../src/lib/ai-rules.ts');
      const mockAiReply = 'Tentu, harganya Rp 50.000 [CLASS:booking]';
      const parsed = parseClassificationTag(mockAiReply);
      console.log('   Mock AI Reply:', mockAiReply);
      console.log('   Parsed Classification:', parsed.classification);
      
      if (parsed.classification === 'booking') {
         console.log('   Parser works perfectly ✅');
      } else {
         console.log('   Parser failed ❌');
      }
    } else {
      console.log('❌ VisitorProfile NOT found in DB!');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
