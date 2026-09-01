import fs from 'node:fs';
import path from 'node:path';
import type { SqliteHistoryRepository, TestRunRecord, TestExecutionRecord, MetricPointRecord } from './storage.js';

export interface StaticReportResult {
  runId: string;
  summaryJsonPath: string;
  reportHtmlPath: string;
}

export class ReportGenerator {
  private storage: SqliteHistoryRepository;

  constructor(storage: SqliteHistoryRepository) {
    this.storage = storage;
  }

  /**
   * Generate raw JSON summary object for a given test run ID
   */
  generateJsonSummary(runId: string): { run: TestRunRecord; executions: TestExecutionRecord[]; metrics: MetricPointRecord[] } {
    const run = this.storage.getRun(runId);
    if (!run) {
      throw new Error(`Test run with ID "${runId}" not found in database.`);
    }

    const executions = this.storage.getExecutions(runId);
    const metrics = this.storage.getMetricPoints(runId);

    return {
      run,
      executions,
      metrics
    };
  }

  /**
   * Generate a standalone, self-contained HTML report string for offline viewing
   */
  generateHtmlReport(runId: string): string {
    const data = this.generateJsonSummary(runId);
    const r = data.run;
    const isPass = r.status === 'COMPLETED';

    const rps = r.totalRequests && r.durationSeconds
      ? (r.totalRequests / r.durationSeconds).toFixed(1)
      : (r.totalRequests ? r.totalRequests : '-');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PERFORMANCE REPORT // ${r.suiteName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;900&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-canvas: #FAFAFA;
      --color-surface: #FFFFFF;
      --color-primary: #0077C0;
      --color-ink: #1D242B;
      --color-ink-muted: #4A5568;
      --color-success: #10B981;
      --color-danger: #EF4444;
      --border-thick: 2px solid #1D242B;
      --border-subtle: 1px solid #CBD5E1;
      --shadow: 4px 4px 0px #1D242B;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--color-canvas);
      color: var(--color-ink);
      font-family: 'Fraunces', Georgia, serif;
      line-height: 1.5;
      padding: 2rem 1.5rem;
    }
    .container { max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }
    .card {
      background: var(--color-surface);
      border: var(--border-thick);
      box-shadow: var(--shadow);
      padding: 1.5rem;
    }
    .header-title {
      font-family: 'Big Shoulders Display', sans-serif;
      font-size: 2.25rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 10px;
      border: 1px solid #1D242B;
      text-transform: uppercase;
    }
    .badge-success { background: var(--color-success); color: #fff; }
    .badge-danger { background: var(--color-danger); color: #fff; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    .stat-box {
      background: #F1F5F9;
      border: var(--border-subtle);
      padding: 1rem;
      display: flex;
      flex-direction: column;
    }
    .stat-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6875rem;
      color: var(--color-ink-muted);
      text-transform: uppercase;
      font-weight: 700;
    }
    .stat-value {
      font-family: 'Big Shoulders Display', sans-serif;
      font-size: 2.25rem;
      font-weight: 900;
      color: var(--color-primary);
    }
    .execution-list { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; }
    .execution-item {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8125rem;
      padding: 10px 14px;
      border: var(--border-subtle);
      background: #FFFFFF;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="card" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
      <div>
        <h1 class="header-title">${r.suiteName}</h1>
        <div style="font-family:'JetBrains Mono', monospace; font-size:0.8125rem; color:var(--color-ink-muted);">
          RUN ID: ${r.id} // TYPE: ${r.testType} // TARGET: ${r.targetUrl || '-'}
        </div>
      </div>
      <span class="badge ${isPass ? 'badge-success' : 'badge-danger'}">${r.status}</span>
    </header>

    <section class="card">
      <h2 style="font-family:'Big Shoulders Display', sans-serif; font-size:1.5rem; text-transform:uppercase;">Performance Summary Metrics</h2>
      <div class="stats-grid">
        <div class="stat-box">
          <span class="stat-label">Total Requests</span>
          <span class="stat-value">${r.totalRequests || data.executions.length}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">Throughput (RPS)</span>
          <span class="stat-value">${rps}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">Avg Latency</span>
          <span class="stat-value">${r.avgLatencyMs ? Number(r.avgLatencyMs).toFixed(1) + ' ms' : '-'}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">Error Rate</span>
          <span class="stat-value">${r.errorRatePercent ? Number(r.errorRatePercent).toFixed(1) + '%' : '0%'}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">Virtual Users</span>
          <span class="stat-value">${r.virtualUsers || 1} VUs</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">Duration</span>
          <span class="stat-value">${r.durationSeconds || Math.round((r.durationMs || 0) / 1000)}s</span>
        </div>
      </div>
    </section>

    <section class="card">
      <h2 style="font-family:'Big Shoulders Display', sans-serif; font-size:1.5rem; text-transform:uppercase;">Step Executions Breakdown (${data.executions.length})</h2>
      <div class="execution-list">
        ${data.executions.map((ex, idx) => `
          <div class="execution-item">
            <div>
              <strong>#${idx + 1} ${ex.scenarioName}</strong>
              <div style="font-size:0.75rem; color:var(--color-ink-muted);">Duration: ${ex.durationMs}ms ${ex.errorMessage ? '— Error: ' + ex.errorMessage : ''}</div>
            </div>
            <span class="badge ${ex.status === 'PASSED' ? 'badge-success' : 'badge-danger'}">${ex.status}</span>
          </div>
        `).join('')}
      </div>
    </section>

    <footer style="text-align:center; font-family:'JetBrains Mono', monospace; font-size:0.75rem; color:var(--color-ink-muted);">
      Report Generated at ${new Date().toISOString()} // Pentest Lab Engine
    </footer>
  </div>
</body>
</html>`;
  }

  /**
   * Save both static JSON and HTML report files to disk and update database record
   */
  saveStaticReports(runId: string, outputBaseDir = './reports'): StaticReportResult {
    const targetDir = path.resolve(outputBaseDir, `run-${runId}`);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const summaryJsonPath = path.join(targetDir, 'summary.json');
    const reportHtmlPath = path.join(targetDir, 'report.html');

    const jsonContent = JSON.stringify(this.generateJsonSummary(runId), null, 2);
    const htmlContent = this.generateHtmlReport(runId);

    fs.writeFileSync(summaryJsonPath, jsonContent, 'utf-8');
    fs.writeFileSync(reportHtmlPath, htmlContent, 'utf-8');

    // Update SQLite test_runs table
    this.storage.updateRun(runId, {
      summaryJsonPath,
      reportHtmlPath
    });

    return {
      runId,
      summaryJsonPath,
      reportHtmlPath
    };
  }
}
