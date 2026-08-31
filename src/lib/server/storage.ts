import Database, { type Database as DatabaseType } from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export interface TestRunRecord {
  id: string;
  suiteName: string;
  testType: string;
  status: string;
  targetUrl?: string | null;
  startedAt: string;
  completedAt?: string | null;
  totalScenarios?: number;
  passedScenarios?: number;
  failedScenarios?: number;
  durationMs?: number;
  summaryJsonPath?: string | null;
  reportHtmlPath?: string | null;
  virtualUsers?: number;
  durationSeconds?: number;
  loadProfile?: string | null;
  httpMethod?: string | null;
  avgLatencyMs?: number;
  totalRequests?: number;
  errorRatePercent?: number;
}

export interface TestExecutionRecord {
  id?: number;
  testRunId: string;
  scenarioName: string;
  status: string;
  durationMs?: number;
  retryCount?: number;
  errorMessage?: string | null;
  screenshotPath?: string | null;
}

export interface MetricPointRecord {
  id?: number;
  testRunId: string;
  timestamp: string;
  rps: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  errorCount: number;
}

export class SqliteHistoryRepository {
  private db: DatabaseType;

  constructor(dbPath = './data/test_history.db') {
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    this.db = new Database(dbPath);
  }


  init(): void {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS test_runs (
        id TEXT PRIMARY KEY,
        suite_name TEXT NOT NULL,
        test_type TEXT NOT NULL,
        status TEXT NOT NULL,
        target_url TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        total_scenarios INTEGER DEFAULT 0,
        passed_scenarios INTEGER DEFAULT 0,
        failed_scenarios INTEGER DEFAULT 0,
        duration_ms INTEGER DEFAULT 0,
        summary_json_path TEXT,
        report_html_path TEXT,
        virtual_users INTEGER DEFAULT 1,
        duration_seconds INTEGER DEFAULT 30,
        load_profile TEXT DEFAULT 'fixed',
        http_method TEXT DEFAULT 'GET',
        avg_latency_ms REAL DEFAULT 0,
        total_requests INTEGER DEFAULT 0,
        error_rate_percent REAL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS test_executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_run_id TEXT NOT NULL,
        scenario_name TEXT NOT NULL,
        status TEXT NOT NULL,
        duration_ms INTEGER DEFAULT 0,
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        screenshot_path TEXT,
        FOREIGN KEY(test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS metric_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_run_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        rps REAL DEFAULT 0,
        p50_ms REAL DEFAULT 0,
        p95_ms REAL DEFAULT 0,
        p99_ms REAL DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        FOREIGN KEY(test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_runs_date ON test_runs(started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_exec_run ON test_executions(test_run_id);
      CREATE INDEX IF NOT EXISTS idx_metrics_run ON metric_points(test_run_id, timestamp);
    `);
  }

  createRun(data: {
    id: string;
    suiteName: string;
    testType: string;
    targetUrl?: string | null;
    virtualUsers?: number;
    durationSeconds?: number;
    loadProfile?: string;
    httpMethod?: string;
  }): TestRunRecord {
    const startedAt = new Date().toISOString();
    const status = 'QUEUED';

    const stmt = this.db.prepare(`
      INSERT INTO test_runs (id, suite_name, test_type, status, target_url, started_at, virtual_users, duration_seconds, load_profile, http_method)
      VALUES (@id, @suiteName, @testType, @status, @targetUrl, @startedAt, @virtualUsers, @durationSeconds, @loadProfile, @httpMethod)
    `);

    stmt.run({
      id: data.id,
      suiteName: data.suiteName,
      testType: data.testType,
      status,
      targetUrl: data.targetUrl || null,
      startedAt,
      virtualUsers: data.virtualUsers ?? 1,
      durationSeconds: data.durationSeconds ?? 30,
      loadProfile: data.loadProfile || 'fixed',
      httpMethod: data.httpMethod || 'GET'
    });

    return {
      id: data.id,
      suiteName: data.suiteName,
      testType: data.testType,
      status,
      targetUrl: data.targetUrl,
      startedAt,
      virtualUsers: data.virtualUsers ?? 1,
      durationSeconds: data.durationSeconds ?? 30,
      loadProfile: data.loadProfile || 'fixed',
      httpMethod: data.httpMethod || 'GET'
    };
  }

  updateRun(id: string, updates: Partial<TestRunRecord>): void {
    if (!this.db.open) return;
    const fields: string[] = [];
    const params: Record<string, any> = { id };

    if (updates.status !== undefined) {
      fields.push('status = @status');
      params.status = updates.status;
    }
    if (updates.completedAt !== undefined) {
      fields.push('completed_at = @completedAt');
      params.completedAt = updates.completedAt;
    }
    if (updates.durationMs !== undefined) {
      fields.push('duration_ms = @durationMs');
      params.durationMs = updates.durationMs;
    }
    if (updates.totalScenarios !== undefined) {
      fields.push('total_scenarios = @totalScenarios');
      params.totalScenarios = updates.totalScenarios;
    }
    if (updates.passedScenarios !== undefined) {
      fields.push('passed_scenarios = @passedScenarios');
      params.passedScenarios = updates.passedScenarios;
    }
    if (updates.failedScenarios !== undefined) {
      fields.push('failed_scenarios = @failedScenarios');
      params.failedScenarios = updates.failedScenarios;
    }
    if (updates.summaryJsonPath !== undefined) {
      fields.push('summary_json_path = @summaryJsonPath');
      params.summaryJsonPath = updates.summaryJsonPath;
    }
    if (updates.reportHtmlPath !== undefined) {
      fields.push('report_html_path = @reportHtmlPath');
      params.reportHtmlPath = updates.reportHtmlPath;
    }
    if (updates.avgLatencyMs !== undefined) {
      fields.push('avg_latency_ms = @avgLatencyMs');
      params.avgLatencyMs = updates.avgLatencyMs;
    }
    if (updates.totalRequests !== undefined) {
      fields.push('total_requests = @totalRequests');
      params.totalRequests = updates.totalRequests;
    }
    if (updates.errorRatePercent !== undefined) {
      fields.push('error_rate_percent = @errorRatePercent');
      params.errorRatePercent = updates.errorRatePercent;
    }

    if (fields.length === 0) return;

    const sql = `UPDATE test_runs SET ${fields.join(', ')} WHERE id = @id`;
    try {
      this.db.prepare(sql).run(params);
    } catch {
      // safe fallback if closed
    }
  }


  getRun(id: string): TestRunRecord | null {
    if (!this.db.open) return null;
    const row = this.db.prepare(`
      SELECT 
        id,
        suite_name as suiteName,
        test_type as testType,
        status,
        target_url as targetUrl,
        started_at as startedAt,
        completed_at as completedAt,
        total_scenarios as totalScenarios,
        passed_scenarios as passedScenarios,
        failed_scenarios as failedScenarios,
        duration_ms as durationMs,
        summary_json_path as summaryJsonPath,
        report_html_path as reportHtmlPath,
        virtual_users as virtualUsers,
        duration_seconds as durationSeconds,
        load_profile as loadProfile,
        http_method as httpMethod,
        avg_latency_ms as avgLatencyMs,
        total_requests as totalRequests,
        error_rate_percent as errorRatePercent
      FROM test_runs 
      WHERE id = ?
    `).get(id) as TestRunRecord | undefined;

    return row || null;
  }

  addExecution(data: TestExecutionRecord): void {
    if (!this.db.open) return;
    const stmt = this.db.prepare(`
      INSERT INTO test_executions (test_run_id, scenario_name, status, duration_ms, retry_count, error_message, screenshot_path)
      VALUES (@testRunId, @scenarioName, @status, @durationMs, @retryCount, @errorMessage, @screenshotPath)
    `);

    stmt.run({
      testRunId: data.testRunId,
      scenarioName: data.scenarioName,
      status: data.status,
      durationMs: data.durationMs || 0,
      retryCount: data.retryCount || 0,
      errorMessage: data.errorMessage || null,
      screenshotPath: data.screenshotPath || null
    });
  }

  getExecutions(testRunId: string): TestExecutionRecord[] {
    if (!this.db.open) return [];
    const rows = this.db.prepare(`
      SELECT 
        id,
        test_run_id as testRunId,
        scenario_name as scenarioName,
        status,
        duration_ms as durationMs,
        retry_count as retryCount,
        error_message as errorMessage,
        screenshot_path as screenshotPath
      FROM test_executions
      WHERE test_run_id = ?
      ORDER BY id ASC
    `).all(testRunId) as TestExecutionRecord[];

    return rows;
  }

  addMetricPoint(data: MetricPointRecord): void {
    if (!this.db.open) return;
    const stmt = this.db.prepare(`
      INSERT INTO metric_points (test_run_id, timestamp, rps, p50_ms, p95_ms, p99_ms, error_count)
      VALUES (@testRunId, @timestamp, @rps, @p50Ms, @p95Ms, @p99Ms, @errorCount)
    `);

    stmt.run({
      testRunId: data.testRunId,
      timestamp: data.timestamp,
      rps: data.rps,
      p50Ms: data.p50Ms,
      p95Ms: data.p95Ms,
      p99Ms: data.p99Ms,
      errorCount: data.errorCount
    });
  }

  getMetricPoints(testRunId: string): MetricPointRecord[] {
    if (!this.db.open) return [];
    const rows = this.db.prepare(`
      SELECT 
        id,
        test_run_id as testRunId,
        timestamp,
        rps,
        p50_ms as p50Ms,
        p95_ms as p95Ms,
        p99_ms as p99Ms,
        error_count as errorCount
      FROM metric_points
      WHERE test_run_id = ?
      ORDER BY id ASC
    `).all(testRunId) as MetricPointRecord[];

    return rows;
  }

  listRuns(limit = 20, offset = 0): TestRunRecord[] {
    if (!this.db.open) return [];
    const rows = this.db.prepare(`
      SELECT 
        id,
        suite_name as suiteName,
        test_type as testType,
        status,
        target_url as targetUrl,
        started_at as startedAt,
        completed_at as completedAt,
        total_scenarios as totalScenarios,
        passed_scenarios as passedScenarios,
        failed_scenarios as failedScenarios,
        duration_ms as durationMs,
        summary_json_path as summaryJsonPath,
        report_html_path as reportHtmlPath,
        virtual_users as virtualUsers,
        duration_seconds as durationSeconds,
        load_profile as loadProfile,
        http_method as httpMethod,
        avg_latency_ms as avgLatencyMs,
        total_requests as totalRequests,
        error_rate_percent as errorRatePercent
      FROM test_runs
      ORDER BY started_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as TestRunRecord[];

    return rows;
  }


  close(): void {
    this.db.close();
  }
}
