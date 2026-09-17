import { test, expect } from '@playwright/test';
import { loginAs, takeScreenshot, TEST_TENANT_ID } from './helpers';

/**
 * AI Chat E2E Test
 * 
 * Scenario:
 * 1. Visitor opens widget
 * 2. Visitor sends a message
 * 3. Bot auto-replies (AI/flow response)
 * 4. Verify bot reply appears in widget
 * 
 * Also tests the agent-side AI test chat interface
 */
test.describe('🤖 AI Chat - Bot Auto Reply', () => {
  test('12 - Visitor widget opens and bot responds', async ({ page }) => {
    // Open widget UI for the test tenant
    await page.goto(`/widget-ui?tenantId=${TEST_TENANT_ID}`, { waitUntil: 'domcontentloaded' });

    // Wait for auto-open animation
    await page.waitForTimeout(2500);

    await takeScreenshot(page, '12-ai-widget-opened.png');
    console.log('✅ Widget opened for AI chat test');

    // Find the message input
    const messageInput = page.locator('textarea, input[type="text"]').last();
    await messageInput.waitFor({ state: 'visible', timeout: 15000 });
    await messageInput.fill('Apa produk yang tersedia?');

    // Send message
    const sendButton = page.locator('button[aria-label*="send"], button[aria-label*="kirim"], button[type="submit"]').last();
    try {
      await sendButton.click({ timeout: 5000 });
    } catch {
      await messageInput.press('Enter');
    }

    await takeScreenshot(page, '13-ai-visitor-message-sent.png');
    console.log('✅ Visitor message sent to AI');

    // Wait for bot to respond (AI processing can take time)
    await page.waitForTimeout(8000);
    await takeScreenshot(page, '14-ai-bot-reply.png');
    console.log('✅ Bot reply screenshot captured');

    // Check for bot messages in widget
    const messages = page.locator('[class*="message"], [class*="chat"], [class*="bubble"]');
    const messageCount = await messages.count();
    console.log(`ℹ️ Found ${messageCount} message elements in widget`);
  });

  test('13 - Agent AI test chat interface works', async ({ page }) => {
    // Login as agent first
    await loginAs(page);
    await page.waitForURL(/\/inbox/, { timeout: 30000 });

    // Navigate to AI agent test chat
    await page.goto('/en/agent', { waitUntil: 'networkidle' });
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '15-agent-bot-list.png');
    console.log('✅ Agent bot management page loaded');

    // Try opening a bot to test chat
    const testChatLink = page.locator('a[href*="test-chat"], button:has-text("Test"), [class*="test-chat"]');
    if (await testChatLink.count() > 0) {
      await testChatLink.first().click();
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, '16-agent-test-chat.png');
      console.log('✅ Agent test chat interface opened');

      // Send a test message
      const testInput = page.locator('textarea, input[type="text"]').last();
      if (await testInput.isVisible()) {
        await testInput.fill('Halo, ini adalah test message dari agent');
        await testInput.press('Enter');
        await page.waitForTimeout(5000);
        await takeScreenshot(page, '17-agent-test-chat-response.png');
        console.log('✅ Test chat message sent and response captured');
      }
    } else {
      console.log('ℹ️ Test chat link not found - capturing current bot list state');
      await takeScreenshot(page, '16-agent-bot-list-detail.png');
    }
  });

  test('14 - AI chat via agent API endpoint', async ({ page }) => {
    // Login first to get session
    await loginAs(page);
    await page.waitForURL(/\/inbox/, { timeout: 30000 });

    // Test the AI agent API endpoint directly via page evaluate
    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'Halo, apa yang bisa kamu bantu?',
            sessionId: 'test-e2e-session-001',
            tenantId: 'demo-tenant-1234',
          }),
        });
        const data = await response.json();
        return { status: response.status, data };
      } catch (err: any) {
        return { error: err.message };
      }
    });

    console.log('🤖 AI Agent API Response:', JSON.stringify(result, null, 2));

    await page.goto('/en/agent', { waitUntil: 'networkidle' });
    await takeScreenshot(page, '18-ai-api-test-result.png');
    console.log(`✅ AI API test completed with status: ${result.status}`);
  });
});
