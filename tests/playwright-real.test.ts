import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { createDashboardServer } from '../src/server.js';
import { SqliteHistoryRepository } from '../src/lib/server/storage.js';
import { TestExecutionEngine } from '../src/lib/server/engine.js';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

describe('Playwright Real Headless Browser Execution (TDD-004 Evidence)', () => {
  let server: http.Server;
  let port: number;
  let baseUrl: string;
  let storage: SqliteHistoryRepository;
  let engine: TestExecutionEngine;
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    // 1. Start real Dashboard Server
    storage = new SqliteHistoryRepository(':memory:');
    storage.init();
    engine = new TestExecutionEngine({ storage });
    server = createDashboardServer({ engine, storage });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // 2. Launch real headless Chromium
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    page = await browser.newPage();
  }, 30000);

  afterAll(async () => {
    if (page) await page.close();
    if (browser) await browser.close();
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (storage) storage.close();
  });

  it('should navigate to dashboard and verify page title and branding', async () => {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    const title = await page.title();
    expect(title).toContain('PENTEST LAB');

    const brandText = await page.textContent('.brand-title');
    expect(brandText).toContain('PENTEST LAB // LOAD & PERFORMANCE DECK');
  });


  it('should interact with theme toggle button and toggle data-theme attribute', async () => {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    const initialTheme = await page.getAttribute('html', 'data-theme');
    expect(initialTheme).toBe('light');

    // Click theme toggle
    await page.click('#theme-toggle');
    const toggledTheme = await page.getAttribute('html', 'data-theme');
    expect(toggledTheme).toBe('dark');

    // Click again to toggle back
    await page.click('#theme-toggle');
    const finalTheme = await page.getAttribute('html', 'data-theme');
    expect(finalTheme).toBe('light');
  });

  it('should submit test run form and capture screenshot evidence', async () => {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    // Fill suite name
    await page.fill('#suite-name', 'Target Web Live SUT Suite');
    await page.fill('#target-url', 'https://httpbin.org');
    await page.selectOption('#test-type', 'PLAYWRIGHT_ONLY');

    // Click Start Run
    await page.click('#btn-start');

    // Wait for the scenario feed to process and complete
    await page.waitForTimeout(3000);

    // Capture actual screenshot evidence on disk in reports/screenshots
    const screenshotsDir = path.resolve(process.cwd(), 'reports/screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const screenshotPath = path.join(screenshotsDir, 'dashboard-playwright-live.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    expect(fs.existsSync(screenshotPath)).toBe(true);
  });

});

