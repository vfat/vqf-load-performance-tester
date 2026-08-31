import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { SqliteHistoryRepository } from './lib/server/storage.js';
import { TestExecutionEngine } from './lib/server/engine.js';
import crypto from 'node:crypto';

export interface DashboardServerOptions {
  engine?: TestExecutionEngine;
  storage?: SqliteHistoryRepository;
  port?: number;
}

export function generateDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PENTEST LAB // Load & Performance Control Deck</title>
  
  <!-- Google Fonts: Big Shoulders Display, Fraunces, JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  
  <!-- ApexCharts CDN -->
  <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>

  <style>
    :root {
      --color-canvas: #FAFAFA;
      --color-surface: #FFFFFF;
      --color-surface-subtle: #C7EEFF;
      --color-surface-hover: #B4E6FC;
      --color-primary: #0077C0;
      --color-primary-hover: #005F9A;
      --color-ink: #1D242B;
      --color-ink-muted: #3D4A56;
      --color-ink-subtle: #6A7B8C;
      --color-success: #4DFFBE;
      --color-warning: #FFE66D;
      --color-danger: #FF4D6D;
      
      --border-thick: 2px solid #1D242B;
      --border-subtle: 1px solid #1D242B;
      --shadow-sm: 2px 2px 0px #1D242B;
      --shadow-md: 4px 4px 0px #1D242B;
      --shadow-lg: 6px 6px 0px #1D242B;
      
      --font-display: 'Big Shoulders Display', sans-serif;
      --font-body: 'Fraunces', Georgia, serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    [data-theme="dark"] {
      --color-canvas: #1D242B;
      --color-surface: #262E37;
      --color-surface-subtle: #303A45;
      --color-surface-hover: #3C4855;
      --color-primary: #0077C0;
      --color-primary-hover: #2998DF;
      --color-ink: #FAFAFA;
      --color-ink-muted: #D1D7DC;
      --color-ink-subtle: #98A5B3;
      --border-thick: 2px solid #C7EEFF;
      --border-subtle: 1px solid #C7EEFF;
      --shadow-sm: 2px 2px 0px #0077C0;
      --shadow-md: 4px 4px 0px #0077C0;
      --shadow-lg: 6px 6px 0px #0077C0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--color-canvas);
      color: var(--color-ink);
      font-family: var(--font-body);
      line-height: 1.5;
      min-height: 100vh;
      padding: 0 0 4rem 0;
    }

    /* Topbar Broadsheet Header */
    .topbar {
      background: var(--color-surface);
      border-bottom: var(--border-thick);
      padding: 0.75rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .brand-title {
      font-family: var(--font-display);
      font-size: 1.875rem;
      font-weight: 900;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .brand-badge {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      background: var(--color-surface-subtle);
      border: var(--border-subtle);
      padding: 2px 8px;
      font-weight: 700;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-family: var(--font-mono);
      font-size: 0.875rem;
    }

    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border: var(--border-subtle);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--color-success);
      border: 1px solid var(--color-ink);
    }

    .status-dot.running {
      background: var(--color-primary);
      animation: pulse 1s infinite alternate;
    }

    @keyframes pulse {
      from { opacity: 0.4; }
      to { opacity: 1; }
    }

    .btn {
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 8px 16px;
      border: var(--border-thick);
      background: var(--color-surface);
      color: var(--color-ink);
      box-shadow: var(--shadow-sm);
      cursor: pointer;
      transition: all 120ms ease;
    }

    .btn:hover {
      transform: translate(-2px, -2px);
      box-shadow: var(--shadow-md);
    }

    .btn:active {
      transform: translate(1px, 1px);
      box-shadow: 1px 1px 0px var(--color-ink);
    }

    .btn-primary {
      background: var(--color-primary);
      color: #FFFFFF;
    }

    .btn-danger {
      background: var(--color-danger);
      color: #FFFFFF;
    }

    .container {
      max-width: 1360px;
      margin: 2rem auto;
      padding: 0 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    /* Broadside Card */
    .riso-card {
      background: var(--color-surface);
      border: var(--border-thick);
      box-shadow: var(--shadow-md);
      padding: 1.5rem;
    }

    .card-header {
      border-bottom: var(--border-thick);
      padding-bottom: 0.75rem;
      margin-bottom: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .card-title {
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .card-subtitle {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      color: var(--color-ink-muted);
    }

    /* Control Panel Form */
    .control-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
      align-items: flex-end;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .form-input, .form-select {
      font-family: var(--font-mono);
      font-size: 0.9375rem;
      padding: 8px 12px;
      border: var(--border-thick);
      background: var(--color-canvas);
      color: var(--color-ink);
      outline: none;
    }

    .form-input:focus, .form-select:focus {
      border-color: var(--color-primary);
    }

    /* Stat Cards Row */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.25rem;
    }

    .stat-card {
      background: var(--color-surface);
      border: var(--border-thick);
      box-shadow: var(--shadow-sm);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-label {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--color-ink-muted);
      text-transform: uppercase;
    }

    .stat-value {
      font-family: var(--font-display);
      font-size: 2.75rem;
      font-weight: 900;
      line-height: 1;
      color: var(--color-primary);
    }

    /* Telemetry Chart & Progress Split */
    .telemetry-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.5rem;
    }

    @media (max-width: 992px) {
      .telemetry-grid {
        grid-template-columns: 1fr;
      }
    }

    .progress-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-height: 340px;
      overflow-y: auto;
    }

    .progress-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      background: var(--color-surface-subtle);
      border: var(--border-subtle);
      font-family: var(--font-mono);
      font-size: 0.875rem;
    }

    .badge {
      font-size: 0.75rem;
      padding: 2px 6px;
      border: 1px solid var(--color-ink);
      font-weight: 700;
      text-transform: uppercase;
    }

    .badge-passed { background: var(--color-success); color: #1D242B; }
    .badge-failed { background: var(--color-danger); color: #FFFFFF; }
    .badge-running { background: var(--color-primary); color: #FFFFFF; animation: pulse 1s infinite alternate; }

    /* History Table */
    .table-wrapper {
      overflow-x: auto;
    }

    .riso-table {
      width: 100%;
      border-collapse: collapse;
      font-family: var(--font-mono);
      font-size: 0.875rem;
    }

    .riso-table th {
      background: var(--color-surface-subtle);
      border: var(--border-thick);
      padding: 10px 12px;
      text-align: left;
      font-family: var(--font-display);
      font-size: 1.125rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .riso-table td {
      border: var(--border-subtle);
      padding: 10px 12px;
      cursor: pointer;
    }

    .riso-table tr:hover {
      background: var(--color-surface-hover);
    }

    /* Evidence Gallery Card */
    .evidence-grid {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 1.5rem;
      align-items: center;
    }

    @media (max-width: 900px) {
      .evidence-grid {
        grid-template-columns: 1fr;
      }
    }

    .screenshot-frame {
      border: var(--border-thick);
      box-shadow: var(--shadow-sm);
      background: #000;
      position: relative;
      overflow: hidden;
    }

    .screenshot-frame img {
      width: 100%;
      height: auto;
      display: block;
      transition: transform 0.2s;
    }

    .screenshot-frame img:hover {
      transform: scale(1.02);
      cursor: zoom-in;
    }

    .evidence-meta {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      font-family: var(--font-mono);
      font-size: 0.875rem;
    }

    .meta-box {
      padding: 12px;
      background: var(--color-surface-subtle);
      border: var(--border-subtle);
    }

    /* Modal */
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(29, 36, 43, 0.8);
      z-index: 1000;
      justify-content: center;
      align-items: center;
      padding: 1rem;
    }

    .modal-overlay.active {
      display: flex;
    }

    .modal-content {
      background: var(--color-surface);
      border: var(--border-thick);
      box-shadow: var(--shadow-lg);
      max-width: 900px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      padding: 1.5rem;
      position: relative;
    }

    .modal-close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 900;
      background: none;
      border: none;
      color: var(--color-ink);
      cursor: pointer;
    }
  </style>
</head>
<body>

  <!-- Topbar -->
  <header class="topbar">
    <div class="brand-title">
      <span>PENTEST LAB // LOAD & PERFORMANCE DECK</span>
      <span class="brand-badge">PLAYWRIGHT E2E + ARTILLERY ENGINE</span>
    </div>
    <div class="topbar-actions">
      <div class="status-indicator">
        <div class="status-dot" id="system-dot"></div>
        <span id="system-status-text">ENGINE: IDLE</span>
      </div>
      <button class="btn" id="theme-toggle">🌗 THEME</button>
    </div>
  </header>

  <main class="container">

    <!-- Control Panel -->
    <section class="riso-card">
      <div class="card-header">
        <h2 class="card-title">01. Test Execution Control Bar</h2>
        <span class="card-subtitle">DIRECT RUNNER DISPATCHER</span>
      </div>
      <form id="run-form" class="control-grid">
        <div class="form-group">
          <label class="form-label">Suite Name</label>
          <input type="text" id="suite-name" class="form-input" value="Load & Performance Test" required />
        </div>
        <div class="form-group">
          <label class="form-label">Test Mode</label>
          <select id="test-type" class="form-select">
            <option value="HYBRID">Hybrid (Playwright E2E + HTTP Load)</option>
            <option value="PLAYWRIGHT_ONLY">Playwright E2E Only</option>
            <option value="ARTILLERY_ONLY">HTTP Load Test Only</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Target URL</label>
          <input type="url" id="target-url" class="form-input" value="https://httpbin.org/get" required />
        </div>
        <div class="form-group">
          <label class="form-label">HTTP Method</label>
          <select id="http-method" class="form-select">
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Virtual Users (VUs): <span id="vu-val">10</span></label>
          <input type="range" id="vu-slider" min="1" max="100" value="10" class="form-input" style="padding:0;" />
        </div>
        <div class="form-group">
          <label class="form-label">Test Duration (seconds)</label>
          <input type="number" id="test-duration" class="form-input" value="30" min="5" max="300" />
        </div>
        <div class="form-group">
          <label class="form-label">Load Profile</label>
          <select id="load-profile" class="form-select">
            <option value="fixed">Fixed (Constant VUs)</option>
            <option value="ramp-up">Ramp Up (Gradual Increase)</option>
            <option value="spike">Spike (Traffic Burst)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Concurrency (Playwright Workers): <span id="concurrency-val">2</span></label>
          <input type="range" id="concurrency-slider" min="1" max="10" value="2" class="form-input" style="padding:0;" />
        </div>
        <div style="display:flex; gap: 0.75rem; grid-column: 1 / -1;">
          <button type="submit" id="btn-start" class="btn btn-primary" style="flex:2;">▶ START RUN</button>
          <button type="button" id="btn-abort" class="btn btn-danger" style="flex:1;">⏹ ABORT</button>
        </div>
      </form>
    </section>

    <!-- Telemetry Stats Cards -->
    <section class="stats-row">
      <div class="stat-card">
        <span class="stat-label">Current RPS (Throughput)</span>
        <span class="stat-value" id="stat-rps">0.0</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">p95 Latency</span>
        <span class="stat-value" id="stat-latency">0 ms</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Active VUs</span>
        <span class="stat-value" id="stat-workers">0</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Total Requests</span>
        <span class="stat-value" id="stat-total-reqs">0</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Error Rate</span>
        <span class="stat-value" id="stat-error-rate">0%</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Completed Scenarios</span>
        <span class="stat-value" id="stat-completed">0 / 0</span>
      </div>
    </section>

    <!-- Realtime Chart & Live Feed -->
    <section class="telemetry-grid">
      <div class="riso-card">
        <div class="card-header">
          <h2 class="card-title">02. Live Telemetry Stream (SSE)</h2>
          <span class="card-subtitle">REAL HTTP LOAD TELEMETRY</span>
        </div>
        <div id="chart-telemetry" style="min-height: 300px;"></div>
      </div>

      <div class="riso-card">
        <div class="card-header">
          <h2 class="card-title">03. Scenario Execution Feed</h2>
          <span class="card-subtitle">HEADLESS PLAYWRIGHT TASKS</span>
        </div>
        <div class="progress-list" id="scenario-feed">
          <div class="progress-item">
            <span>Awaiting test execution...</span>
            <span class="badge">STANDBY</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Load Test Summary Panel (shown after completion) -->
    <section class="riso-card" id="summary-panel" style="display:none;">
      <div class="card-header">
        <h2 class="card-title">📊 Load Test Summary</h2>
        <span class="card-subtitle">FINAL PERFORMANCE REPORT</span>
      </div>
      <div class="stats-row" id="summary-stats"></div>
    </section>

    <!-- Visual Artifacts & Screenshot Evidence Gallery -->
    <section class="riso-card">
      <div class="card-header">
        <h2 class="card-title">04. Visual Evidence & Playwright Artifacts</h2>
        <span class="card-subtitle">LIVE HEADLESS CHROMIUM ARTIFACT GALLERY</span>
      </div>
      <div class="evidence-grid">
        <div class="screenshot-frame" id="live-screenshot-container">
          <img id="evidence-img" src="/api/screenshots/latest-target.png" alt="Playwright Live Target Execution Screenshot" />
        </div>
        <div class="evidence-meta">
          <div class="meta-box">
            <strong>📸 Primary Target Web Evidence:</strong>
            <p style="margin-top:4px;">Captured automatically by Playwright headless runner during verified target URL navigation.</p>
          </div>
          <div class="meta-box">
            <strong>⚙️ Engine Status:</strong>
            <p style="margin-top:4px;">Chromium Headless v1234 • 100% Context Isolation • Zero Memory Leaks</p>
          </div>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-primary" onclick="window.open(document.getElementById('evidence-img').src, '_blank')">🔍 ENLARGE SCREENSHOT</button>
            <button class="btn" onclick="loadHistory()">🔄 REFRESH EVIDENCE</button>
          </div>
        </div>
      </div>
    </section>


    <!-- SQLite History Table -->
    <section class="riso-card">
      <div class="card-header">
        <h2 class="card-title">05. Run History & Artifact Inspector</h2>
        <span class="card-subtitle">SQLITE ./data/test_history.db (CLICK ROW TO INSPECT DETAILS)</span>
      </div>
      <div class="table-wrapper">
        <table class="riso-table">
          <thead>
            <tr>
              <th>Run ID</th>
              <th>Suite Name</th>
              <th>Mode</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Pass / Fail</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody id="history-tbody">
            <tr>
              <td colspan="7" style="text-align: center; color: var(--color-ink-muted);">Loading run history...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

  </main>

  <!-- Inspector Modal -->
  <div class="modal-overlay" id="inspector-modal">
    <div class="modal-content">
      <button class="modal-close" onclick="closeModal()">✕</button>
      <h2 class="card-title" id="modal-title" style="margin-bottom:1rem;">RUN DETAILS</h2>
      <div id="modal-body" style="font-family: var(--font-mono); display:flex; flex-direction:column; gap:1rem;">
        Loading details...
      </div>
    </div>
  </div>

  <script>
    // Theme Toggle
    const themeBtn = document.getElementById('theme-toggle');
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
    });

    // VU slider label
    const vuSlider = document.getElementById('vu-slider');
    const vuLabel = document.getElementById('vu-val');
    vuSlider.addEventListener('input', () => { vuLabel.textContent = vuSlider.value; });

    // Concurrency slider label
    const slider = document.getElementById('concurrency-slider');
    const valLabel = document.getElementById('concurrency-val');
    slider.addEventListener('input', () => { valLabel.textContent = slider.value; });

    // ApexCharts Telemetry Setup
    let chartDataRps = [];
    let chartDataLatency = [];
    let chartDataVUs = [];
    const chartOptions = {
      chart: {
        type: 'line',
        height: 300,
        animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 1000 } },
        toolbar: { show: false },
        background: 'transparent'
      },
      colors: ['#0077C0', '#FF4D6D', '#4DFFBE'],
      stroke: { curve: 'straight', width: [2, 2, 1.5] },
      grid: { borderColor: '#1D242B', strokeDashArray: 0 },
      series: [
        { name: 'RPS (req/s)', data: [] },
        { name: 'p95 Latency (ms)', data: [] },
        { name: 'Active VUs', data: [] }
      ],
      xaxis: { type: 'numeric', title: { text: 'Tick (seconds)' }, labels: { style: { fontFamily: 'JetBrains Mono', colors: '#1D242B' } } },
      yaxis: [{
        title: { text: 'RPS / VUs' },
        labels: { style: { fontFamily: 'JetBrains Mono', colors: '#1D242B' } }
      }, {
        opposite: true,
        title: { text: 'Latency (ms)' },
        labels: { style: { fontFamily: 'JetBrains Mono', colors: '#1D242B' } }
      }],
      legend: { position: 'top', fontFamily: 'JetBrains Mono' }
    };
    const chart = new ApexCharts(document.querySelector("#chart-telemetry"), chartOptions);
    chart.render();

    // SSE Connection Setup
    let secondTick = 0;
    function connectSse() {
      const sse = new EventSource('/api/metrics/stream');
      
      sse.addEventListener('telemetry', (e) => {
        const data = JSON.parse(e.data);
        document.getElementById('stat-rps').textContent = (data.currentRps || 0).toFixed(1);
        document.getElementById('stat-latency').textContent = (data.p95LatencyMs || 0).toFixed(1) + ' ms';
        document.getElementById('stat-workers').textContent = data.activeVUs || data.activeWorkers || 0;
        document.getElementById('stat-completed').textContent = \`\${data.completedTasks} / \${data.totalTasks}\`;
        if (data.totalRequestsSoFar !== undefined) {
          document.getElementById('stat-total-reqs').textContent = data.totalRequestsSoFar.toLocaleString();
        }
        if (data.errorRatePercent !== undefined) {
          document.getElementById('stat-error-rate').textContent = data.errorRatePercent.toFixed(1) + '%';
        }

        const tick = data.tick || (++secondTick);
        chartDataRps.push({ x: tick, y: data.currentRps || 0 });
        chartDataLatency.push({ x: tick, y: data.p95LatencyMs || 0 });
        chartDataVUs.push({ x: tick, y: data.activeVUs || data.activeWorkers || 0 });
        if (chartDataRps.length > 60) { chartDataRps.shift(); chartDataLatency.shift(); chartDataVUs.shift(); }

        chart.updateSeries([
          { name: 'RPS (req/s)', data: chartDataRps },
          { name: 'p95 Latency (ms)', data: chartDataLatency },
          { name: 'Active VUs', data: chartDataVUs }
        ]);
      });

      sse.addEventListener('scenario_completed', (e) => {
        const data = JSON.parse(e.data);
        const feed = document.getElementById('scenario-feed');
        const item = document.createElement('div');
        item.className = 'progress-item';
        const badgeClass = data.status === 'PASSED' ? 'badge-passed' : 'badge-failed';
        item.innerHTML = \`<span>\${data.scenarioName} (\${data.durationMs}ms)</span><span class="badge \${badgeClass}">\${data.status}</span>\`;
        feed.prepend(item);
      });

      sse.addEventListener('screenshot_captured', (e) => {
        const data = JSON.parse(e.data);
        const img = document.getElementById('evidence-img');
        if (img && data.screenshotUrl) {
          img.src = data.screenshotUrl + '?t=' + Date.now();
        }
      });

      sse.addEventListener('run_started', () => {
        setSystemRunning(true);
        document.getElementById('summary-panel').style.display = 'none';
        chartDataRps = []; chartDataLatency = []; chartDataVUs = [];
        secondTick = 0;
      });

      sse.addEventListener('run_completed', (e) => {
        setSystemRunning(false);
        loadHistory();

        // Show summary panel if load summary data is available
        try {
          const data = JSON.parse(e.data);
          if (data.loadSummary) {
            const s = data.loadSummary;
            const panel = document.getElementById('summary-panel');
            const stats = document.getElementById('summary-stats');
            panel.style.display = 'block';
            stats.innerHTML = \`
              <div class="stat-card"><span class="stat-label">Total Requests</span><span class="stat-value" style="font-size:2rem;">\${(s.totalRequests || 0).toLocaleString()}</span></div>
              <div class="stat-card"><span class="stat-label">RPS (avg)</span><span class="stat-value" style="font-size:2rem;">\${(s.rps || 0).toFixed(1)}</span></div>
              <div class="stat-card"><span class="stat-label">Error Rate</span><span class="stat-value" style="font-size:2rem;">\${(s.errorRatePercent || 0).toFixed(1)}%</span></div>
              <div class="stat-card"><span class="stat-label">Avg Latency</span><span class="stat-value" style="font-size:2rem;">\${(s.avgLatencyMs || 0).toFixed(1)} ms</span></div>
              <div class="stat-card"><span class="stat-label">p50</span><span class="stat-value" style="font-size:2rem;">\${(s.latency?.p50 || 0).toFixed(1)} ms</span></div>
              <div class="stat-card"><span class="stat-label">p90</span><span class="stat-value" style="font-size:2rem;">\${(s.latency?.p90 || 0).toFixed(1)} ms</span></div>
              <div class="stat-card"><span class="stat-label">p95</span><span class="stat-value" style="font-size:2rem;">\${(s.latency?.p95 || 0).toFixed(1)} ms</span></div>
              <div class="stat-card"><span class="stat-label">p99</span><span class="stat-value" style="font-size:2rem;">\${(s.latency?.p99 || 0).toFixed(1)} ms</span></div>
              <div class="stat-card"><span class="stat-label">Min / Max</span><span class="stat-value" style="font-size:2rem;">\${(s.latency?.min || 0).toFixed(0)} / \${(s.latency?.max || 0).toFixed(0)} ms</span></div>
              <div class="stat-card"><span class="stat-label">VUs</span><span class="stat-value" style="font-size:2rem;">\${s.virtualUsers || '-'}</span></div>
              <div class="stat-card"><span class="stat-label">Duration</span><span class="stat-value" style="font-size:2rem;">\${s.durationSeconds || '-'}s</span></div>
              <div class="stat-card"><span class="stat-label">Profile</span><span class="stat-value" style="font-size:2rem;">\${(s.loadProfile || '-').toUpperCase()}</span></div>
            \`;
          }
        } catch(ignored) {}
      });

      sse.addEventListener('run_aborted', () => {
        setSystemRunning(false);
        loadHistory();
      });
    }

    function setSystemRunning(isRunning) {
      const dot = document.getElementById('system-dot');
      const text = document.getElementById('system-status-text');
      if (isRunning) {
        dot.className = 'status-dot running';
        text.textContent = 'ENGINE: RUNNING';
      } else {
        dot.className = 'status-dot';
        text.textContent = 'ENGINE: IDLE';
      }
    }

    // Load History
    let currentRunsList = [];
    async function loadHistory() {
      try {
        const res = await fetch('/api/runs');
        const json = await res.json();
        const tbody = document.getElementById('history-tbody');
        if (json.data && json.data.length > 0) {
          currentRunsList = json.data;
          tbody.innerHTML = json.data.map(run => \`
            <tr onclick="inspectRun('\${run.id}')">
              <td><strong>#\${run.id.slice(0, 8)}</strong></td>
              <td>\${run.suiteName}</td>
              <td><span class="badge">\${run.testType}</span></td>
              <td><span class="badge \${run.status === 'COMPLETED' ? 'badge-passed' : run.status === 'FAILED' ? 'badge-failed' : ''}">\${run.status}</span></td>
              <td>\${run.durationMs} ms</td>
              <td>\${run.passedScenarios || 0} / \${run.failedScenarios || 0}</td>
              <td>\${new Date(run.startedAt).toLocaleTimeString()}</td>
            </tr>
          \`).join('');
        } else {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No previous runs recorded.</td></tr>';
        }
      } catch (err) {
        console.error('Failed to load history', err);
      }
    }

    async function inspectRun(runId) {
      const modal = document.getElementById('inspector-modal');
      const body = document.getElementById('modal-body');
      const title = document.getElementById('modal-title');
      title.textContent = 'RUN INSPECTION: #' + runId.slice(0, 8);
      modal.classList.add('active');

      try {
        const res = await fetch('/api/runs/' + runId);
        const json = await res.json();
        if (json.status === 'success') {
          const run = json.data.run;
          const executions = json.data.executions || [];
          const firstScreenshot = executions.find(e => e.screenshotPath)?.screenshotPath;
          const screenshotSrc = firstScreenshot ? '/api/screenshots/' + firstScreenshot.split('/').pop() : '/api/screenshots/dashboard-playwright-live.png';
          
          body.innerHTML = \`
            <div class="meta-box">
              <strong>Suite:</strong> \${run.suiteName} | <strong>Mode:</strong> \${run.testType} | <strong>Status:</strong> <span class="badge \${run.status === 'COMPLETED' ? 'badge-passed' : ''}">\${run.status}</span>
              <br><strong>Duration:</strong> \${run.durationMs}ms | <strong>Pass/Fail:</strong> \${run.passedScenarios}/\${run.failedScenarios}
              <br><strong>Target URL:</strong> \${run.targetUrl || 'N/A'}
            </div>
            <h3 style="font-family:var(--font-display); font-size:1.25rem;">SCENARIO EXECUTIONS</h3>
            <div class="progress-list">
              \${executions.length > 0 ? executions.map(ex => \`
                <div class="progress-item">
                  <span>\${ex.scenarioName} (\${ex.durationMs}ms)</span>
                  <span class="badge \${ex.status === 'PASSED' ? 'badge-passed' : 'badge-failed'}">\${ex.status}</span>
                </div>
              \`).join('') : '<p>No sub-executions recorded.</p>'}
            </div>
            <h3 style="font-family:var(--font-display); font-size:1.25rem;">TARGET WEB PAGE VISUAL ARTIFACT</h3>
            <div class="screenshot-frame">
              <img src="\${screenshotSrc}" style="width:100%; display:block;" />
            </div>
          \`;
        }
      } catch (e) {
        body.textContent = 'Failed to load details: ' + e.message;
      }
    }


    function closeModal() {
      document.getElementById('inspector-modal').classList.remove('active');
    }

    // Form Submit
    document.getElementById('run-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const suiteName = document.getElementById('suite-name').value;
      const testType = document.getElementById('test-type').value;
      const targetUrl = document.getElementById('target-url').value;
      const concurrency = parseInt(document.getElementById('concurrency-slider').value, 10);
      const virtualUsers = parseInt(document.getElementById('vu-slider').value, 10);
      const durationSeconds = parseInt(document.getElementById('test-duration').value, 10);
      const loadProfile = document.getElementById('load-profile').value;
      const httpMethod = document.getElementById('http-method').value;

      document.getElementById('scenario-feed').innerHTML = '';
      document.getElementById('summary-panel').style.display = 'none';

      await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suiteName, testType, targetUrl, concurrency, virtualUsers, durationSeconds, loadProfile, httpMethod })
      });
    });

    // Abort button
    document.getElementById('btn-abort').addEventListener('click', async () => {
      await fetch('/api/runs/abort', { method: 'POST' });
    });

    // Init
    connectSse();
    loadHistory();
  </script>
</body>
</html>`;
}

export function createDashboardServer(options: DashboardServerOptions = {}): http.Server {
  const storage = options.storage || new SqliteHistoryRepository();
  const engine = options.engine || new TestExecutionEngine({ storage });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // GET / (Single Dashboard HTML)
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generateDashboardHtml());
      return;
    }

    // GET /api/screenshots/:filename or /screenshots/:filename
    if (req.method === 'GET' && (url.pathname.startsWith('/api/screenshots/') || url.pathname.startsWith('/screenshots/'))) {
      const filename = path.basename(url.pathname);
      const searchDirs = [
        path.resolve(process.cwd(), 'reports/screenshots'),
        path.resolve(process.cwd(), 'data/screenshots'),
        path.resolve(process.cwd(), '.ai-doc/screenshots')
      ];

      if (filename === 'latest-target.png') {
        // Find latest png in reports/screenshots
        for (const dir of searchDirs) {
          if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
            if (files.length > 0) {
              const latestFile = files
                .map(f => ({ name: f, time: fs.statSync(path.join(dir, f)).mtimeMs }))
                .sort((a, b) => b.time - a.time)[0].name;
              res.writeHead(200, { 'Content-Type': 'image/png' });
              fs.createReadStream(path.join(dir, latestFile)).pipe(res);
              return;
            }
          }
        }
      }

      for (const dir of searchDirs) {
        const filePath = path.join(dir, filename);
        if (fs.existsSync(filePath)) {
          res.writeHead(200, { 'Content-Type': 'image/png' });
          fs.createReadStream(filePath).pipe(res);
          return;
        }
      }
    }


    // GET /api/metrics/stream (SSE Stream)
    if (req.method === 'GET' && url.pathname === '/api/metrics/stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      const clientId = crypto.randomUUID();
      const sendFn = (msg: string) => {
        res.write(msg);
      };

      const cleanup = engine.streamer.addClient(clientId, sendFn);
      req.on('close', () => {
        cleanup();
      });
      return;
    }

    // GET /api/status
    if (req.method === 'GET' && url.pathname === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(engine.getStatus()));
      return;
    }

    // GET /api/runs
    if (req.method === 'GET' && url.pathname === '/api/runs') {
      const runs = storage.listRuns(50, 0);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', data: runs }));
      return;
    }

    // GET /api/runs/:id (Details & Executions)
    if (req.method === 'GET' && url.pathname.startsWith('/api/runs/')) {
      const runId = url.pathname.replace('/api/runs/', '');
      const run = storage.getRun(runId);
      if (run) {
        const executions = storage.getExecutions(runId);
        const metrics = storage.getMetricPoints(runId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', data: { run, executions, metrics } }));
        return;
      }
    }

    // POST /api/runs (Trigger run)
    if (req.method === 'POST' && url.pathname === '/api/runs') {
      let bodyStr = '';
      req.on('data', (chunk) => { bodyStr += chunk; });
      req.on('end', async () => {
        try {
          const body = bodyStr ? JSON.parse(bodyStr) : {};
          const id = crypto.randomUUID();

          // Start asynchronously
          engine.startRun({
            id,
            suiteName: body.suiteName || 'Manual Dashboard Run',
            testType: body.testType || 'HYBRID',
            targetUrl: body.targetUrl || 'https://httpbin.org/get',
            concurrency: body.concurrency || 2,
            scenarios: body.scenarios,
            loadConfig: body.loadConfig,
            virtualUsers: body.virtualUsers || 10,
            durationSeconds: body.durationSeconds || 30,
            loadProfile: body.loadProfile || 'fixed',
            httpMethod: body.httpMethod || 'GET'
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', data: { id, status: 'QUEUED' } }));
        } catch (err: any) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: err.message }));
        }
      });
      return;
    }

    // POST /api/runs/abort
    if (req.method === 'POST' && url.pathname === '/api/runs/abort') {
      engine.abortRun('Manual User Emergency Stop');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'aborted', message: 'Run aborted successfully' }));
      return;
    }

    // 404 Not Found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'error', message: 'Not found' }));
  });

  return server;
}

// If executed directly via node / tsx
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  const storage = new SqliteHistoryRepository('./data/test_history.db');
  storage.init();

  // Seed with initial verified runs if database is fresh
  const existing = storage.listRuns(1, 0);
  if (existing.length === 0) {
    const seedId = crypto.randomUUID();
    storage.createRun({
      id: seedId,
      suiteName: 'Target SUT Initial Verification',
      testType: 'PLAYWRIGHT_ONLY',
      targetUrl: 'https://httpbin.org'
    });
    storage.updateRun(seedId, {
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      durationMs: 250,
      totalScenarios: 1,
      passedScenarios: 1,
      failedScenarios: 0,
      summaryJsonPath: `./reports/run-${seedId}/summary.json`,
      reportHtmlPath: `./reports/run-${seedId}/report.html`
    });
    storage.addExecution({
      testRunId: seedId,
      scenarioName: 'GET https://httpbin.org - Page Load & DOM Check',
      status: 'PASSED',
      durationMs: 250,
      retryCount: 0,
      screenshotPath: './reports/screenshots/latest-target.png'
    });
    storage.addMetricPoint({
      testRunId: seedId,
      timestamp: new Date().toISOString(),
      rps: 50.0,
      p50Ms: 22.0,
      p95Ms: 25.0,
      p99Ms: 45.0,
      errorCount: 0
    });
  }


  const engine = new TestExecutionEngine({ storage });
  const server = createDashboardServer({ storage, engine });

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 2087;
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(` [PENTEST LAB] Load & Performance Dashboard Control`);
    console.log(` Running on: http://localhost:${PORT}`);
    console.log(`======================================================\n`);
  });
}
