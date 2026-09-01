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

  it('should navigate to dashboard and verify page title and two-deck branding', async () => {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    const title = await page.title();
    expect(title).toContain('PENTEST LAB');

    const brandText = await page.textContent('.brand-title');
    expect(brandText).toContain('PENTEST LAB // TWO-DECK CONTROL SYSTEM');
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

  it('should switch between Deck 1 (Playwright E2E) and Deck 2 (REST API Load)', async () => {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    // Initial state: Deck 1 visible, Deck 2 hidden
    const deck1Display = await page.locator('#deck1-container').evaluate(el => window.getComputedStyle(el).display);
    const deck2Display = await page.locator('#deck2-container').evaluate(el => window.getComputedStyle(el).display);
    expect(deck1Display).toBe('block');
    expect(deck2Display).toBe('none');

    // Switch to Deck 2
    await page.click('#tab-btn-deck2');
    const deck2After = await page.locator('#deck2-container').evaluate(el => window.getComputedStyle(el).display);
    expect(deck2After).toBe('block');

    // Switch back to Deck 1
    await page.click('#tab-btn-deck1');
    const deck1After = await page.locator('#deck1-container').evaluate(el => window.getComputedStyle(el).display);
    expect(deck1After).toBe('block');
  });

  it('should submit Playwright E2E run and capture screenshot evidence on disk', async () => {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    // Fill suite name on Deck 1
    await page.fill('#e2e-suite-name', 'Live E2E Verification');

    // Click Start Run
    await page.click('#btn-e2e-start');

    // Wait for step timeline to receive events
    await page.waitForTimeout(2500);

    // Capture screenshot of dashboard
    const screenshotsDir = path.resolve(process.cwd(), 'reports/screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const screenshotPath = path.join(screenshotsDir, 'dashboard-playwright-live.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    expect(fs.existsSync(screenshotPath)).toBe(true);
  }, 15000);
});
