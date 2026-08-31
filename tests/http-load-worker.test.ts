import { describe, it, expect, vi } from 'vitest';
import {
  HttpLoadWorker,
  getActiveVUs,
  type HttpLoadConfig,
  type TickMetrics,
  type LoadTestFinalSummary
} from '../src/lib/server/http-load-worker.js';

describe('getActiveVUs — VU scaling per load profile', () => {
  it('should return constant VUs for "fixed" profile', () => {
    expect(getActiveVUs('fixed', 50, 1, 30)).toBe(50);
    expect(getActiveVUs('fixed', 50, 15, 30)).toBe(50);
    expect(getActiveVUs('fixed', 50, 30, 30)).toBe(50);
  });

  it('should ramp up VUs linearly for "ramp-up" profile', () => {
    // At 10% elapsed → ~10% of target VUs
    const early = getActiveVUs('ramp-up', 100, 3, 30);
    expect(early).toBeGreaterThanOrEqual(1);
    expect(early).toBeLessThanOrEqual(15);

    // At 50% elapsed → ~50% of target VUs
    const mid = getActiveVUs('ramp-up', 100, 15, 30);
    expect(mid).toBeGreaterThanOrEqual(40);
    expect(mid).toBeLessThanOrEqual(60);

    // At 100% elapsed → target VUs
    const end = getActiveVUs('ramp-up', 100, 30, 30);
    expect(end).toBe(100);
  });

  it('should spike VUs in the middle for "spike" profile', () => {
    // Early phase (< 30%) → low VUs
    const early = getActiveVUs('spike', 100, 3, 30);
    expect(early).toBeLessThanOrEqual(15);

    // Mid phase (30-70%) → full VUs
    const mid = getActiveVUs('spike', 100, 15, 30);
    expect(mid).toBe(100);

    // Late phase (> 70%) → low VUs again
    const late = getActiveVUs('spike', 100, 25, 30);
    expect(late).toBeLessThanOrEqual(15);
  });

  it('should always return at least 1 VU', () => {
    expect(getActiveVUs('ramp-up', 100, 0, 30)).toBeGreaterThanOrEqual(1);
    expect(getActiveVUs('spike', 100, 1, 30)).toBeGreaterThanOrEqual(1);
    expect(getActiveVUs('spike', 100, 29, 30)).toBeGreaterThanOrEqual(1);
  });
});

describe('HttpLoadWorker — core load test execution', () => {
  it('should execute a short fixed load test and return a valid summary', async () => {
    const worker = new HttpLoadWorker();
    const ticks: TickMetrics[] = [];

    // Use a real publicly accessible URL with minimal VUs and short duration
    const config: HttpLoadConfig = {
      targetUrl: 'https://httpbin.org/get',
      httpMethod: 'GET',
      virtualUsers: 2,
      durationSeconds: 3,
      loadProfile: 'fixed',
      requestTimeoutMs: 8000
    };

    const summary = await worker.runLoadTest(config, (tick) => {
      ticks.push(tick);
    });

    // Verify summary structure
    expect(summary.totalRequests).toBeGreaterThan(0);
    expect(summary.successfulRequests).toBeGreaterThanOrEqual(0);
    expect(summary.rps).toBeGreaterThan(0);
    expect(summary.virtualUsers).toBe(2);
    expect(summary.durationSeconds).toBe(3);
    expect(summary.loadProfile).toBe('fixed');
    expect(summary.latency).toBeDefined();
    expect(summary.latency.p50).toBeGreaterThanOrEqual(0);
    expect(summary.latency.p95).toBeGreaterThanOrEqual(0);
    expect(summary.latency.p99).toBeGreaterThanOrEqual(0);
    expect(summary.tickHistory.length).toBe(3);

    // Verify ticks were emitted
    expect(ticks.length).toBe(3);
    expect(ticks[0].tick).toBe(1);
    expect(ticks[0].activeVUs).toBe(2);
  }, 30000); // 30s timeout for network test

  it('should respect abort signal and stop early', async () => {
    const worker = new HttpLoadWorker();
    const controller = new AbortController();
    const ticks: TickMetrics[] = [];

    const config: HttpLoadConfig = {
      targetUrl: 'https://httpbin.org/get',
      httpMethod: 'GET',
      virtualUsers: 2,
      durationSeconds: 10,
      loadProfile: 'fixed',
      requestTimeoutMs: 5000,
      abortSignal: controller.signal
    };

    // Abort after 2 seconds
    setTimeout(() => controller.abort(), 2000);

    const summary = await worker.runLoadTest(config, (tick) => {
      ticks.push(tick);
    });

    // Should have stopped well before 10 ticks
    expect(ticks.length).toBeLessThanOrEqual(3);
    expect(summary.tickHistory.length).toBeLessThanOrEqual(3);
  }, 15000);

  it('should calculate correct error rate for failing endpoints', async () => {
    const worker = new HttpLoadWorker();

    const config: HttpLoadConfig = {
      targetUrl: 'https://httpbin.org/status/500',
      httpMethod: 'GET',
      virtualUsers: 2,
      durationSeconds: 2,
      loadProfile: 'fixed',
      requestTimeoutMs: 5000
    };

    const summary = await worker.runLoadTest(config, () => {});

    // All requests should be "failed" (5xx)
    expect(summary.failedRequests).toBeGreaterThan(0);
    expect(summary.errorRatePercent).toBeGreaterThan(0);
  }, 20000);

  it('should handle connection timeout gracefully', async () => {
    const worker = new HttpLoadWorker();

    const config: HttpLoadConfig = {
      targetUrl: 'https://httpbin.org/delay/10',  // 10s delay
      httpMethod: 'GET',
      virtualUsers: 1,
      durationSeconds: 2,
      loadProfile: 'fixed',
      requestTimeoutMs: 1000  // 1s timeout — will timeout before response
    };

    const summary = await worker.runLoadTest(config, () => {});

    // Requests should fail due to timeout
    expect(summary.totalRequests).toBeGreaterThan(0);
    expect(summary.failedRequests).toBeGreaterThan(0);
  }, 20000);
});
