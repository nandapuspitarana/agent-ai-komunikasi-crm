import { test, expect } from '@playwright/test';
import { loginAs, takeScreenshot } from './helpers';

test.describe('🔐 Login Flow', () => {
  test('01 - Login page renders correctly', async ({ page }) => {
    await page.goto('/en/login', { waitUntil: 'networkidle' });

    // Verify login page elements
    await expect(page.locator('h2')).toContainText('Welcome back');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    await takeScreenshot(page, '01-login-page.png');
    console.log('✅ Login page rendered correctly');
  });

  test('02 - Login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/en/login', { waitUntil: 'networkidle' });

    await page.fill('#email', 'wrong@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error message
    await expect(page.locator('text=Email atau password salah')).toBeVisible({ timeout: 10000 });

    await takeScreenshot(page, '02-login-error.png');
    console.log('✅ Invalid credentials error shown');
  });

  test('03 - Login with valid credentials redirects to inbox', async ({ page }) => {
    await page.goto('/en/login', { waitUntil: 'networkidle' });

    await page.fill('#email', 'partner@zetacrm.com');
    await page.fill('#password', 'password123');

    await takeScreenshot(page, '03-login-form-filled.png');

    await page.click('button[type="submit"]');

    // Wait for redirect - login redirects to /inbox
    await page.waitForURL(/\/inbox/, { timeout: 30000 });

    // Verify dashboard/inbox is loaded
    await expect(page).toHaveURL(/\/inbox/);

    await takeScreenshot(page, '04-login-success-inbox.png');
    console.log('✅ Successfully logged in and redirected to inbox');
  });
});
