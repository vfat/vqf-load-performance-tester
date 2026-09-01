import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SqliteHistoryRepository } from '../src/lib/server/storage.js';
import { ReportGenerator } from '../src/lib/server/report-generator.js';

describe('ReportGenerator (TDD-010)', () => {
  let storage: SqliteHistoryRepository;
  const testDbPath = './data/test_report_gen.db';
  const testOutputDir = './reports/test-output';

  beforeEach(() => {
    storage = new SqliteHistoryRepository(testDbPath);
    storage.init();

    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterEach(() => {
    storage.close();
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
    if (fs.existsSync(testOutputDir)) {
      try { fs.rmSync(testOutputDir, { recursive: true, force: true }); } catch {}
    }
  });

  it('should generate valid JSON summary for a test run', () => {
    const runId = 'test-run-report-01';
    storage.createRun({
      id: runId,
      suiteName: 'E2E & Load Performance Suite',
      testType: 'PLAYWRIGHT_ONLY',
      targetUrl: 'https://httpbin.org',
      virtualUsers: 10,
      durationSeconds: 15,
      loadProfile: 'fixed',
      httpMethod: 'GET'
    });

    storage.updateRun(runId, {
      status: 'COMPLETED',
      totalScenarios: 3,
      avgLatencyMs: 120.5,
      totalRequests: 150,
      errorRatePercent: 0
    });

    storage.addExecution({
      testRunId: runId,
      scenarioName: '[GOTO] Open Target',
      status: 'PASSED',
      durationMs: 450,
      retryCount: 0,
      errorMessage: null,
      screenshotPath: '/reports/screenshots/step-1.png'
    });

    storage.addExecution({
      testRunId: runId,
      scenarioName: '[ASSERT_TEXT] Verify Title',
      status: 'PASSED',
      durationMs: 120,
      retryCount: 0,
      errorMessage: null,
      screenshotPath: null
    });

    const generator = new ReportGenerator(storage);
    const jsonSummary = generator.generateJsonSummary(runId);

    expect(jsonSummary).toBeDefined();
    expect(jsonSummary.run.id).toBe(runId);
    expect(jsonSummary.run.suiteName).toBe('E2E & Load Performance Suite');
    expect(jsonSummary.executions.length).toBe(2);
    expect(jsonSummary.executions[0].scenarioName).toBe('[GOTO] Open Target');
  });

  it('should generate standalone interactive HTML report string', () => {
    const runId = 'test-run-report-02';
    storage.createRun({
      id: runId,
      suiteName: 'REST API High Throughput Test',
      testType: 'ARTILLERY_ONLY',
      targetUrl: 'https://httpbin.org/get',
      virtualUsers: 25,
      durationSeconds: 30,
      loadProfile: 'spike',
      httpMethod: 'GET'
    });

    storage.updateRun(runId, {
      status: 'COMPLETED',
      totalScenarios: 1,
      avgLatencyMs: 85.2,
      totalRequests: 750,
      errorRatePercent: 0.5
    });

    storage.addExecution({
      testRunId: runId,
      scenarioName: '[GET] Root Health API',
      status: 'PASSED',
      durationMs: 75,
      retryCount: 0,
      errorMessage: null,
      screenshotPath: null
    });

    const generator = new ReportGenerator(storage);
    const htmlReport = generator.generateHtmlReport(runId);

    expect(htmlReport).toBeDefined();
    expect(htmlReport).toContain('<!DOCTYPE html>');
    expect(htmlReport).toContain('REST API High Throughput Test');
    expect(htmlReport).toContain('750');
    expect(htmlReport).toContain('85.2');
    expect(htmlReport).toContain('[GET] Root Health API');
  });

  it('should save static summary.json and report.html to disk and update database paths', () => {
    const runId = 'test-run-report-03';
    storage.createRun({
      id: runId,
      suiteName: 'Disk Persistence Test',
      testType: 'PLAYWRIGHT_ONLY'
    });

    storage.updateRun(runId, {
      status: 'COMPLETED',
      totalScenarios: 1
    });

    const generator = new ReportGenerator(storage);
    const result = generator.saveStaticReports(runId, testOutputDir);

    expect(result.summaryJsonPath).toBeDefined();
    expect(result.reportHtmlPath).toBeDefined();
    expect(fs.existsSync(result.summaryJsonPath)).toBe(true);
    expect(fs.existsSync(result.reportHtmlPath)).toBe(true);

    const savedJson = JSON.parse(fs.readFileSync(result.summaryJsonPath, 'utf-8'));
    expect(savedJson.run.id).toBe(runId);

    const updatedRun = storage.getRun(runId);
    expect(updatedRun?.summaryJsonPath).toBe(result.summaryJsonPath);
    expect(updatedRun?.reportHtmlPath).toBe(result.reportHtmlPath);
  });
});
