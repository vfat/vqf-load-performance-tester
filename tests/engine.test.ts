import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestExecutionEngine } from '../src/lib/server/engine.js';
import { SqliteHistoryRepository } from '../src/lib/server/storage.js';
import http from 'node:http';


describe('TestExecutionEngine Integration', () => {
  let storage: SqliteHistoryRepository;
  let engine: TestExecutionEngine;

  beforeEach(() => {
    storage = new SqliteHistoryRepository(':memory:');
    storage.init();
    engine = new TestExecutionEngine({ storage, concurrency: 2 });
  });

  afterEach(() => {
    storage.close();
  });

  it('should initialize and report initial idle status', () => {
    const status = engine.getStatus();
    expect(status.state).toBe('IDLE');
    expect(status.activeWorkers).toBe(0);
    expect(status.currentRunId).toBeNull();
  });

  it('should execute a hybrid test run, update storage, and emit telemetry', async () => {
    // Local mock target server for real browser test
    const targetServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html><html><body><h1>STAGING APP LOCAL SUT</h1></body></html>`);
    });
    let targetPort = 0;
    await new Promise<void>((resolve) => {
      targetServer.listen(0, () => {
        targetPort = (targetServer.address() as any).port;
        resolve();
      });
    });

    const run = await engine.startRun({
      id: 'run-engine-01',
      suiteName: 'E2E & Load Verification',
      testType: 'HYBRID',
      targetUrl: `http://127.0.0.1:${targetPort}`,
      scenarios: [
        { name: 'login.spec.ts' },
        { name: 'checkout.spec.ts' }
      ],
      virtualUsers: 2,
      durationSeconds: 2,
      loadProfile: 'fixed',
      httpMethod: 'GET'
    });

    await new Promise<void>((resolve) => targetServer.close(() => resolve()));


    expect(run.id).toBe('run-engine-01');
    expect(run.status).toBe('COMPLETED');
    expect(run.totalScenarios).toBe(2);
    expect(run.passedScenarios).toBe(2);
    expect(run.failedScenarios).toBe(0);

    // Verify stored records in SQLite
    const storedRun = storage.getRun('run-engine-01');
    expect(storedRun).not.toBeNull();
    expect(storedRun?.status).toBe('COMPLETED');

    // Verify real load test metrics were recorded
    const metrics = storage.getMetricPoints('run-engine-01');
    expect(metrics.length).toBeGreaterThanOrEqual(1);

    const executions = storage.getExecutions('run-engine-01');
    expect(executions).toHaveLength(2);
    const scenarioNames = executions.map(e => e.scenarioName);
    expect(scenarioNames).toContain('login.spec.ts');
    expect(scenarioNames).toContain('checkout.spec.ts');
    expect(executions.every(e => e.status === 'PASSED')).toBe(true);
  }, 30000);


  it('should handle abort signal during run execution', async () => {
    const runPromise = engine.startRun({
      id: 'run-engine-abort',
      suiteName: 'Long Running Suite',
      testType: 'PLAYWRIGHT_ONLY',
      scenarios: [
        { name: 'slow-1.spec.ts', durationMs: 100 },
        { name: 'slow-2.spec.ts', durationMs: 100 }
      ]
    });

    // Abort shortly after start
    setTimeout(() => {
      engine.abortRun('User Emergency Stop');
    }, 20);

    const result = await runPromise;
    expect(result.status).toBe('ABORTED');

    const stored = storage.getRun('run-engine-abort');
    expect(stored?.status).toBe('ABORTED');
  });
});
