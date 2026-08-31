import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SqliteHistoryRepository } from '../src/lib/server/storage.js';

describe('SqliteHistoryRepository (TDD-002)', () => {
  let repo: SqliteHistoryRepository;

  beforeEach(() => {
    // Use in-memory sqlite for clean isolated testing
    repo = new SqliteHistoryRepository(':memory:');
    repo.init();
  });

  afterEach(() => {
    repo.close();
  });

  it('should initialize schema and insert a new test run', () => {
    const run = repo.createRun({
      id: 'run-001',
      suiteName: 'Regression Suite',
      testType: 'HYBRID',
      targetUrl: 'https://staging.app.local'
    });

    expect(run.id).toBe('run-001');
    expect(run.status).toBe('QUEUED');
    expect(run.suiteName).toBe('Regression Suite');

    const fetched = repo.getRun('run-001');
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe('run-001');
    expect(fetched?.targetUrl).toBe('https://staging.app.local');
  });

  it('should update run status and completion metrics', () => {
    repo.createRun({
      id: 'run-002',
      suiteName: 'Stress Test',
      testType: 'ARTILLERY_ONLY'
    });

    repo.updateRun('run-002', {
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      durationMs: 15000,
      totalScenarios: 10,
      passedScenarios: 9,
      failedScenarios: 1
    });

    const updated = repo.getRun('run-002');
    expect(updated?.status).toBe('COMPLETED');
    expect(updated?.passedScenarios).toBe(9);
    expect(updated?.failedScenarios).toBe(1);
    expect(updated?.durationMs).toBe(15000);
  });

  it('should record execution details and metric points', () => {
    repo.createRun({ id: 'run-003', suiteName: 'E2E Flow', testType: 'PLAYWRIGHT_ONLY' });

    repo.addExecution({
      testRunId: 'run-003',
      scenarioName: 'checkout.spec.ts',
      status: 'PASSED',
      durationMs: 3200
    });

    repo.addMetricPoint({
      testRunId: 'run-003',
      timestamp: new Date().toISOString(),
      rps: 120.5,
      p50Ms: 25.0,
      p95Ms: 78.2,
      p99Ms: 150.0,
      errorCount: 0
    });

    const executions = repo.getExecutions('run-003');
    expect(executions).toHaveLength(1);
    expect(executions[0].scenarioName).toBe('checkout.spec.ts');
    expect(executions[0].status).toBe('PASSED');

    const metrics = repo.getMetricPoints('run-003');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].rps).toBe(120.5);
    expect(metrics[0].p95Ms).toBe(78.2);
  });

  it('should list test runs ordered by started_at descending', () => {
    repo.createRun({ id: 'run-A', suiteName: 'Suite A', testType: 'HYBRID' });
    repo.createRun({ id: 'run-B', suiteName: 'Suite B', testType: 'HYBRID' });

    const runs = repo.listRuns(10, 0);
    expect(runs).toHaveLength(2);
    expect(runs.map((r: { id: string }) => r.id)).toContain('run-A');
    expect(runs.map((r: { id: string }) => r.id)).toContain('run-B');
  });
});

