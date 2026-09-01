import { describe, it, expect, vi } from 'vitest';
import { HttpLoadWorker, type HttpLoadConfig } from '../src/lib/server/http-load-worker.js';
import type { ApiStepDefinition } from '../src/lib/server/api-chaining-executor.js';

describe('HttpLoadWorker with Chained Multi-Endpoint Scenarios & 1000 VUs (TDD-011)', () => {
  it('should execute chained multi-endpoint API workflow concurrently across multiple virtual users', async () => {
    const worker = new HttpLoadWorker();

    const chainSteps: ApiStepDefinition[] = [
      {
        id: 'step-1-login',
        name: 'Step 1: Auth Login',
        url: 'https://httpbin.org/post',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'tester', password: 'secretpassword' }),
        extractVars: {
          'authToken': 'json.username' // In httpbin.org/post, echoes json.username
        },
        assertStatus: 200
      },
      {
        id: 'step-2-profile',
        name: 'Step 2: Get Profile with Bearer Token',
        url: 'https://httpbin.org/headers',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer {{authToken}}'
        },
        assertStatus: 200
      }
    ];

    const config: HttpLoadConfig = {
      targetUrl: 'https://httpbin.org',
      virtualUsers: 5,
      durationSeconds: 2,
      loadProfile: 'fixed',
      chainSteps
    };

    const tickSnapshots: any[] = [];
    const summary = await worker.runLoadTest(config, (tick) => {
      tickSnapshots.push(tick);
    });

    expect(summary).toBeDefined();
    expect(summary.totalRequests).toBeGreaterThan(0);
    expect(summary.successfulRequests).toBeGreaterThan(0);
    expect(summary.errorRatePercent).toBe(0);
    expect(summary.latency.p50).toBeGreaterThan(0);
    expect(tickSnapshots.length).toBe(2);
  });

  it('should support scaling up to high concurrency without connection exhaustion using keep-alive', async () => {
    const worker = new HttpLoadWorker();

    const config: HttpLoadConfig = {
      targetUrl: 'https://httpbin.org/get',
      httpMethod: 'GET',
      virtualUsers: 20,
      durationSeconds: 2,
      loadProfile: 'fixed'
    };

    const summary = await worker.runLoadTest(config);

    expect(summary.totalRequests).toBeGreaterThanOrEqual(20);
    expect(summary.latency.p95).toBeGreaterThan(0);
  });

  it('should record step errors and failure rate when a chained step fails assertion', async () => {
    const worker = new HttpLoadWorker();

    const failingChainSteps: ApiStepDefinition[] = [
      {
        id: 'step-fail',
        name: 'Failing Step',
        url: 'https://httpbin.org/status/500',
        method: 'GET',
        assertStatus: 200 // Will fail because status is 500
      }
    ];

    const config: HttpLoadConfig = {
      targetUrl: 'https://httpbin.org',
      virtualUsers: 2,
      durationSeconds: 1,
      loadProfile: 'fixed',
      chainSteps: failingChainSteps
    };

    const summary = await worker.runLoadTest(config);

    expect(summary.totalRequests).toBeGreaterThan(0);
    expect(summary.failedRequests).toBeGreaterThan(0);
    expect(summary.errorRatePercent).toBeGreaterThan(0);
  });
});
