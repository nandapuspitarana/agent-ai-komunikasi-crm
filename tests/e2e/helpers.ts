import { Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

export const CREDENTIALS = {
  email: 'partner@zetacrm.com',
  password: 'password123',
};

export const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

/**
 * Ensure screenshots directory exists
 */
export function ensureScreenshotsDir() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

/**
 * Take a labeled screenshot and save to screenshots directory
 */
export async function takeScreenshot(page: Page, filename: string): Promise<string> {
  ensureScreenshotsDir();
  const filePath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`📸 Screenshot saved: ${filename}`);
  return filePath;
}

/**
 * Login helper: navigate to login page and authenticate
 */
export async function loginAs(page: Page, email = CREDENTIALS.email, password = CREDENTIALS.password) {
  await page.goto('/en/login', { waitUntil: 'networkidle' });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  // Wait for redirect to inbox or dashboard
  await page.waitForURL(/\/(inbox|dashboard|en\/(inbox|dashboard))/, { timeout: 30000 });
}

/**
 * Get tenant ID from widget config for test usage
 */
export const TEST_TENANT_ID = 'demo-tenant-1234';
