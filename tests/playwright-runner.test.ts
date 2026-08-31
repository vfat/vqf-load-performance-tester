import { describe, it, expect, vi } from 'vitest';
import { PlaywrightRunner } from '../src/lib/server/playwright-runner.js';
import http from 'node:http';
import fs from 'node:fs';

describe('PlaywrightRunner (TDD-004)', () => {
  it('should execute a passing scenario and return passed status with duration', async () => {
    const runner = new PlaywrightRunner();

    const scenario = vi.fn().mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return { ok: true };
    });

    const result = await runner.runScenario({
      testRunId: 'run-101',
      scenarioName: 'login.spec.ts',
      scenarioFn: scenario
    });

    expect(result.status).toBe('PASSED');
    expect(result.scenarioName).toBe('login.spec.ts');
    expect(result.durationMs).toBeGreaterThanOrEqual(15);
    expect(result.retryCount).toBe(0);
    expect(result.errorMessage).toBeNull();
  });

  it('should capture failure details on assertion error', async () => {
    const runner = new PlaywrightRunner();

    const failingScenario = vi.fn().mockImplementation(async () => {
      throw new Error('Element not found: button#submit');
    });

    const result = await runner.runScenario({
      testRunId: 'run-102',
      scenarioName: 'checkout.spec.ts',
      scenarioFn: failingScenario,
      maxRetries: 0
    });

    expect(result.status).toBe('FAILED');
    expect(result.errorMessage).toContain('Element not found: button#submit');
    expect(result.retryCount).toBe(0);
  });

  it('should retry flaky scenarios up to maxRetries until pass', async () => {
    const runner = new PlaywrightRunner();
    let attempts = 0;

    const flakyScenario = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('Transient network timeout');
      }
      return { ok: true };
    });

    const result = await runner.runScenario({
      testRunId: 'run-103',
      scenarioName: 'payment.spec.ts',
      scenarioFn: flakyScenario,
      maxRetries: 2
    });

    expect(result.status).toBe('PASSED');
    expect(result.retryCount).toBe(1);
    expect(attempts).toBe(2);
  });

  it('should navigate to real target web page, capture actual target screenshot, and save artifact', async () => {
    // 1. Create a dummy target SUT server
    const targetServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html><html><body><h1>TARGET SUT APPLICATION</h1><p>Payment Checkout Flow</p></body></html>`);
    });

    let targetPort = 0;
    await new Promise<void>((resolve) => {
      targetServer.listen(0, () => {
        targetPort = (targetServer.address() as any).port;
        resolve();
      });
    });

    const targetUrl = `http://127.0.0.1:${targetPort}`;
    const runner = new PlaywrightRunner();

    const result = await runner.executeTargetScenario({
      testRunId: 'run-sut-01',
      scenarioName: 'sut-checkout.spec.ts',
      targetUrl
    });

    await new Promise<void>((resolve) => targetServer.close(() => resolve()));

    expect(result.status).toBe('PASSED');
    expect(result.screenshotPath).not.toBeNull();
    expect(fs.existsSync(result.screenshotPath!)).toBe(true);
  }, 15000);
});
