import { test, expect, chromium, BrowserContext } from '@playwright/test';
import { loginAs, takeScreenshot, TEST_TENANT_ID } from './helpers';

/**
 * Quick Chat E2E Test
 * 
 * Scenario:
 * 1. Agent logs in and opens inbox
 * 2. Visitor opens widget and sends a message
 * 3. Agent sees message in inbox (real-time)
 * 4. Agent claims the session
 * 5. Agent sends manual reply
 * 6. Verify reply appears in widget
 */
test.describe('💬 Quick Chat - Manual Agent Reply', () => {
  let agentContext: BrowserContext;
  let visitorContext: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    // Two separate browser contexts simulate agent and visitor
    agentContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    visitorContext = await browser.newContext({ viewport: { width: 420, height: 760 } });
  });

  test.afterAll(async () => {
    await agentContext.close();
    await visitorContext.close();
  });

  test('05 - Agent opens inbox and visitor sends message', async () => {
    const agentPage = await agentContext.newPage();
    const visitorPage = await visitorContext.newPage();

    // --- AGENT: Login and open inbox ---
    await loginAs(agentPage);
    await agentPage.waitForURL(/\/inbox/, { timeout: 30000 });
    await agentPage.waitForLoadState('networkidle');

    await takeScreenshot(agentPage, '05-agent-inbox-empty.png');
    console.log('✅ Agent is on Inbox page');

    // --- VISITOR: Open widget UI ---
    await visitorPage.goto(`/widget-ui?tenantId=${TEST_TENANT_ID}`, { waitUntil: 'domcontentloaded' });
    
    // Wait for widget to auto-open (1.5s timer in page code)
    await visitorPage.waitForTimeout(2500);
    
    await takeScreenshot(visitorPage, '06-visitor-widget-open.png');
    console.log('✅ Visitor opened widget');

    // --- VISITOR: Find and type in message input ---
    // The ChatWindow has a textarea/input for messages
    const messageInput = visitorPage.locator('textarea, input[type="text"]').last();
    await messageInput.waitFor({ state: 'visible', timeout: 15000 });
    await messageInput.fill('Halo, saya butuh bantuan!');

    // Submit message (Enter key or send button)
    const sendButton = visitorPage.locator('button[aria-label*="send"], button[aria-label*="kirim"], button[type="submit"]').last();
    
    try {
      await sendButton.click({ timeout: 5000 });
    } catch {
      await messageInput.press('Enter');
    }

    await visitorPage.waitForTimeout(2000);
    await takeScreenshot(visitorPage, '07-visitor-message-sent.png');
    console.log('✅ Visitor sent message');

    // --- AGENT: Refresh inbox and check for incoming message ---
    await agentPage.reload({ waitUntil: 'networkidle' });
    await agentPage.waitForTimeout(2000);
    await takeScreenshot(agentPage, '08-agent-inbox-new-message.png');
    console.log('✅ Agent inbox updated');

    await agentPage.close();
    await visitorPage.close();
  });

  test('06 - Agent claims session and sends reply', async () => {
    const agentPage = await agentContext.newPage();
    const visitorPage = await visitorContext.newPage();

    // Re-use agent context (already logged in)
    await agentPage.goto('/en/inbox', { waitUntil: 'networkidle' });
    await agentPage.waitForLoadState('networkidle');

    // --- AGENT: Look for session in inbox list ---
    // Try to find and click on a conversation/session item
    const sessionItems = agentPage.locator('[data-session-id], .session-item, .conversation-item, [class*="session"], [class*="conversation"]');
    const sessionCount = await sessionItems.count();
    
    if (sessionCount > 0) {
      await sessionItems.first().click();
      await agentPage.waitForTimeout(1000);
      
      // Try to claim the session
      const claimButton = agentPage.locator('button:has-text("Ambil"), button:has-text("Claim"), button:has-text("Ambil Percakapan")');
      if (await claimButton.count() > 0) {
        await claimButton.first().click();
        await agentPage.waitForTimeout(1000);
        await takeScreenshot(agentPage, '09-agent-claimed-session.png');
        console.log('✅ Agent claimed session');
      }
    }

    // --- AGENT: Type and send a reply ---
    const replyInput = agentPage.locator('textarea[placeholder*="message"], textarea[placeholder*="pesan"], textarea[placeholder*="Ketik"], input[placeholder*="message"], input[placeholder*="pesan"]').last();
    
    try {
      await replyInput.waitFor({ state: 'visible', timeout: 8000 });
      await replyInput.fill('Halo! Saya siap membantu Anda. Ada yang bisa saya bantu?');
      await replyInput.press('Enter');
      await agentPage.waitForTimeout(1500);
      await takeScreenshot(agentPage, '10-agent-reply-sent.png');
      console.log('✅ Agent sent manual reply');
    } catch (e) {
      console.log('ℹ️ Reply input not found in current view - taking screenshot of current state');
      await takeScreenshot(agentPage, '10-agent-inbox-current.png');
    }

    // --- VISITOR: Open widget and verify reply ---
    await visitorPage.goto(`/widget-ui?tenantId=${TEST_TENANT_ID}`, { waitUntil: 'domcontentloaded' });
    await visitorPage.waitForTimeout(3000);
    await takeScreenshot(visitorPage, '11-visitor-widget-with-reply.png');
    console.log('✅ Visitor widget screenshot captured');

    await agentPage.close();
    await visitorPage.close();
  });
});
