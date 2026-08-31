import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDashboardServer } from '../src/server.js';
import { SqliteHistoryRepository } from '../src/lib/server/storage.js';
import { TestExecutionEngine } from '../src/lib/server/engine.js';
import http from 'node:http';

describe('Dashboard Server API Endpoints', () => {
  let server: http.Server;
  let port: number;
  let baseUrl: string;
  let storage: SqliteHistoryRepository;
  let engine: TestExecutionEngine;

  beforeEach(async () => {
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
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    storage.close();
  });

  it('should serve dashboard HTML on GET /', async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('PENTEST LAB');
    expect(html).toContain('Big Shoulders Display');

    expect(html).toContain('Fraunces');
    expect(html).toContain('JetBrains Mono');
  });

  it('should return engine status on GET /api/status', async () => {
    const res = await fetch(`${baseUrl}/api/status`);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.state).toBe('IDLE');
    expect(data.activeWorkers).toBe(0);
  });

  it('should trigger a test run via POST /api/runs', async () => {
    const res = await fetch(`${baseUrl}/api/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suiteName: 'Smoke Test Suite',
        testType: 'PLAYWRIGHT_ONLY',
        targetUrl: 'https://staging.app.local',
        concurrency: 2,
        scenarios: [{ name: 'smoke-1.spec.ts', durationMs: 10 }]
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.status).toBe('success');
    expect(body.data.id).toBeDefined();

    // Verify run list
    const listRes = await fetch(`${baseUrl}/api/runs`);
    const listData = await listRes.json() as any;
    expect(listData.data).toHaveLength(1);
    expect(listData.data[0].suiteName).toBe('Smoke Test Suite');
  });

  it('should handle abort request on POST /api/runs/abort', async () => {
    const res = await fetch(`${baseUrl}/api/runs/abort`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Manual User Abort' })
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.status).toBe('aborted');
  });
});
