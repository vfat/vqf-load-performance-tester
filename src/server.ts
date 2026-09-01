import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { SqliteHistoryRepository } from './lib/server/storage.js';
import { TestExecutionEngine } from './lib/server/engine.js';
import { ReportGenerator } from './lib/server/report-generator.js';
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
      --color-success: #10B981;
      --color-warning: #F59E0B;
      --color-danger: #EF4444;
      
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
      font-size: 1.75rem;
      font-weight: 900;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
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

    .btn-secondary {
      background: var(--color-surface-subtle);
      color: var(--color-ink);
    }

    .container {
      max-width: 1380px;
      margin: 1.5rem auto;
      padding: 0 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }

    /* Two-Deck Navigation Tabs */
    .deck-nav {
      display: flex;
      gap: 1rem;
      border-bottom: var(--border-thick);
      padding-bottom: 0.5rem;
    }

    .deck-tab-btn {
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 10px 24px;
      border: var(--border-thick);
      background: var(--color-surface);
      color: var(--color-ink-muted);
      cursor: pointer;
      box-shadow: var(--shadow-sm);
      transition: all 120ms ease;
    }

    .deck-tab-btn.active {
      background: var(--color-primary);
      color: #FFFFFF;
      box-shadow: var(--shadow-md);
      transform: translate(-2px, -2px);
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
      flex-wrap: wrap;
      gap: 0.5rem;
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

    /* Step Builder Container */
    .step-builder-box {
      margin-top: 1.25rem;
      border: var(--border-thick);
      background: var(--color-canvas);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .step-card {
      background: var(--color-surface);
      border: var(--border-subtle);
      box-shadow: var(--shadow-sm);
      padding: 0.75rem 1rem;
      display: grid;
      grid-template-columns: 80px 140px 1fr 1fr 50px;
      gap: 0.75rem;
      align-items: center;
    }

    .step-card-num {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 900;
      color: var(--color-primary);
    }

    /* Stat Cards Row */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
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
      font-size: 2.5rem;
      font-weight: 900;
      line-height: 1;
      color: var(--color-primary);
    }

    /* Dual-Panel Grid Layouts */
    .deck-split-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    @media (max-width: 1024px) {
      .deck-split-grid {
        grid-template-columns: 1fr;
      }
      .step-card {
        grid-template-columns: 1fr;
      }
    }

    /* Live Viewport Frame Mockup */
    .browser-viewport-frame {
      border: var(--border-thick);
      background: #1D242B;
      box-shadow: var(--shadow-md);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .browser-toolbar {
      background: #303A45;
      padding: 6px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 2px solid #1D242B;
    }

    .browser-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #FF5F56;
      display: inline-block;
    }
    .browser-dot.yellow { background: #FFBD2E; }
    .browser-dot.green { background: #27C93F; }

    .browser-address-bar {
      flex: 1;
      background: #1D242B;
      color: #FAFAFA;
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      padding: 4px 10px;
      border: 1px solid #4D5B6A;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .browser-screen-view {
      background: #FAFAFA;
      min-height: 380px;
      max-height: 480px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }

    .browser-screen-view img {
      width: 100%;
      height: auto;
      display: block;
      object-fit: contain;
    }

    .live-step-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      background: var(--color-primary);
      color: #FFFFFF;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 10px;
      border: var(--border-thick);
      box-shadow: var(--shadow-sm);
      z-index: 10;
    }

    /* Timeline & Progress Feed */
    .progress-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 380px;
      overflow-y: auto;
    }

    .progress-item {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      padding: 8px 12px;
      border: var(--border-subtle);
      background: var(--color-surface);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .badge {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 2px 6px;
      border: 1px solid var(--color-ink);
      text-transform: uppercase;
    }

    .badge-success { background: var(--color-success); color: #FFFFFF; }
    .badge-fail { background: var(--color-danger); color: #FFFFFF; }
    .badge-running { background: var(--color-primary); color: #FFFFFF; }

    /* Summary Metrics Panel */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .summary-metric-box {
      background: var(--color-surface-subtle);
      border: var(--border-subtle);
      padding: 0.75rem 1rem;
      display: flex;
      flex-direction: column;
    }

    .summary-metric-title {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      color: var(--color-ink-muted);
      text-transform: uppercase;
      font-weight: 700;
    }

    .summary-metric-value {
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 900;
      color: var(--color-primary);
      line-height: 1.1;
    }

    /* SQLite History Table */
    .table-container {
      overflow-x: auto;
      border: var(--border-thick);
      box-shadow: var(--shadow-sm);
    }

    .riso-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-family: var(--font-mono);
      font-size: 0.8125rem;
    }

    .riso-table th, .riso-table td {
      padding: 10px 14px;
      border: var(--border-subtle);
    }

    .riso-table th {
      background: var(--color-surface-subtle);
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 900;
      text-transform: uppercase;
    }

    .riso-table tbody tr:hover {
      background-color: var(--color-surface-hover);
      cursor: pointer;
    }

    /* Modal Inspector */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(29, 36, 43, 0.75);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .modal-content {
      background: var(--color-surface);
      border: var(--border-thick);
      box-shadow: var(--shadow-lg);
      width: 100%;
      max-width: 900px;
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
      <span>PENTEST LAB // TWO-DECK CONTROL SYSTEM</span>
      <span class="brand-badge">PLAYWRIGHT E2E + ARTILLERY LOAD ENGINE</span>
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

    <!-- Deck Switcher Tabs -->
    <nav class="deck-nav">
      <button class="deck-tab-btn active" id="tab-btn-deck1" onclick="switchDeck('DECK1')">
        🎭 01. PLAYWRIGHT E2E STUDIO
      </button>
      <button class="deck-tab-btn" id="tab-btn-deck2" onclick="switchDeck('DECK2')">
        ⚡ 02. REST API LOAD DECK
      </button>
    </nav>

    <!-- ========================================================== -->
    <!-- DECK 1: PLAYWRIGHT E2E STUDIO -->
    <!-- ========================================================== -->
    <div id="deck1-container">
      
      <!-- Control Bar & Step Builder -->
      <section class="riso-card">
        <div class="card-header">
          <h2 class="card-title">🎭 Playwright E2E Browser Studio</h2>
          <span class="card-subtitle">DOM INTERACTION & VISUAL WORKFLOW BUILDER</span>
        </div>

        <form id="e2e-form" class="control-grid" onsubmit="handleE2ESubmit(event)">
          <div class="form-group">
            <label class="form-label">Suite Name</label>
            <input type="text" id="e2e-suite-name" class="form-input" value="E2E Browser Interaction Test" required />
          </div>

          <div class="form-group">
            <label class="form-label">Preset Scenario Template</label>
            <select id="e2e-preset" class="form-select" onchange="loadE2EPreset(this.value)">
              <option value="custom">Custom Steps</option>
              <option value="nav-check">1. Web Page Load & Screenshot Check</option>
              <option value="form-flow">2. Web Form Filling & Result Verification</option>
              <option value="search-assert">3. Element Wait & Content Assertion</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Concurrency (Workers): <span id="e2e-concurrency-val">2</span></label>
            <input type="range" id="e2e-concurrency" min="1" max="5" value="2" class="form-input" style="padding:0;" oninput="document.getElementById('e2e-concurrency-val').innerText = this.value" />
          </div>

          <!-- Advanced Auth & Custom Headers -->
          <details style="grid-column: 1 / -1; margin-top: 0.5rem; background: var(--color-canvas); padding: 0.75rem; border: var(--border-subtle);">
            <summary style="font-family: var(--font-mono); font-size: 0.8125rem; font-weight: 700; cursor: pointer; color: var(--color-primary);">
              ⚙️ Advanced Auth, Custom Headers & User-Agent (Click to expand)
            </summary>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
              <div class="form-group">
                <label class="form-label">Custom User-Agent</label>
                <input type="text" id="e2e-user-agent" class="form-input" placeholder="e.g. Mozilla/5.0 (Windows NT 10.0; Win64; x64) / CustomPentestAgent/1.0" />
              </div>
              <div class="form-group">
                <label class="form-label">Custom Request Headers (JSON)</label>
                <textarea id="e2e-headers-json" class="form-input" rows="2" placeholder='{"Authorization": "Bearer secret_jwt_token", "X-API-Key": "adm_123"}'></textarea>
              </div>
            </div>
          </details>

          <div style="display:flex; gap: 0.75rem; grid-column: 1 / -1; margin-top: 0.5rem;">
            <button type="submit" id="btn-e2e-start" class="btn btn-primary" style="flex:2;">▶ RUN PLAYWRIGHT E2E</button>
            <button type="button" class="btn btn-danger" style="flex:1;" onclick="triggerAbort()">⏹ ABORT</button>
          </div>
        </form>

        <!-- Visual Step Cards -->
        <div class="step-builder-box">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="form-label">Sequential Browser Steps Pipeline</span>
            <button type="button" class="btn btn-secondary" style="font-size:0.875rem; padding:4px 10px;" onclick="addE2EStep()">+ Add Step</button>
          </div>
          <div id="e2e-steps-container" style="display:flex; flex-direction:column; gap:0.5rem;">
            <!-- Rendered by JS -->
          </div>
        </div>
      </section>

      <!-- Live Viewport Frame & Step Timeline -->
      <section class="deck-split-grid" style="margin-top: 1.75rem;">
        
        <!-- Live Browser Viewport Frame -->
        <div class="riso-card">
          <div class="card-header">
            <h2 class="card-title">Live Process Viewport Frame</h2>
            <span class="card-subtitle">HEADLESS CHROMIUM SCREEN</span>
          </div>

          <div class="browser-viewport-frame">
            <div class="browser-toolbar">
              <span class="browser-dot"></span>
              <span class="browser-dot yellow"></span>
              <span class="browser-dot green"></span>
              <div class="browser-address-bar" id="e2e-address-bar">about:blank</div>
            </div>
            <div class="browser-screen-view">
              <div class="live-step-badge" id="e2e-live-badge">STANDBY</div>
              <img id="e2e-live-frame-img" src="/screenshots/latest-target.png" alt="Viewport Frame" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'400\\' height=\\'200\\' viewBox=\\'0 0 400 200\\'><rect fill=\\'%23FAFAFA\\' width=\\'400\\' height=\\'200\\'/><text fill=\\'%236A7B8C\\' font-family=\\'monospace\\' font-size=\\'14\\' x=\\'50%\\' y=\\'50%\\' text-anchor=\\'middle\\'>Awaiting Browser Execution...</text></svg>'" />
            </div>
          </div>
        </div>

        <!-- E2E Step Execution Timeline -->
        <div class="riso-card">
          <div class="card-header">
            <h2 class="card-title">Step Execution Timeline</h2>
            <span class="card-subtitle">SEQUENTIAL LOG</span>
          </div>

          <div class="progress-list" id="e2e-step-timeline">
            <div class="progress-item">
              <span>Ready for E2E step execution</span>
              <span class="badge">READY</span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- ========================================================== -->
    <!-- DECK 2: REST API LOAD DECK -->
    <!-- ========================================================== -->
    <div id="deck2-container" style="display:none;">
      
      <!-- Control Bar -->
      <section class="riso-card">
        <div class="card-header">
          <h2 class="card-title">⚡ REST API Load Deck (Artillery Engine)</h2>
          <span class="card-subtitle">CONCURRENT TRAFFIC & LATENCY QUANTILE PROFILER</span>
        </div>

        <form id="api-load-form" class="control-grid" onsubmit="handleApiLoadSubmit(event)">
          <div class="form-group">
            <label class="form-label">Suite Name</label>
            <input type="text" id="api-suite-name" class="form-input" value="REST API Throughput & Load Test" required />
          </div>

          <div class="form-group">
            <label class="form-label">Target Endpoint URL</label>
            <input type="url" id="api-target-url" class="form-input" value="https://httpbin.org/get" required />
          </div>

          <div class="form-group">
            <label class="form-label">HTTP Method</label>
            <select id="api-http-method" class="form-select">
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Virtual Users (VUs): <span id="api-vu-val">10</span></label>
            <input type="range" id="api-vu-slider" min="1" max="100" value="10" class="form-input" style="padding:0;" oninput="document.getElementById('api-vu-val').innerText = this.value" />
          </div>

          <div class="form-group">
            <label class="form-label">Duration (seconds)</label>
            <input type="number" id="api-duration" class="form-input" value="30" min="5" max="300" />
          </div>

          <div class="form-group">
            <label class="form-label">Load Profile</label>
            <select id="api-load-profile" class="form-select">
              <option value="fixed">Fixed (Constant VUs)</option>
              <option value="ramp-up">Ramp Up (Gradual Saturation)</option>
              <option value="spike">Spike (Sudden Traffic Burst)</option>
            </select>
          </div>

          <!-- Advanced Auth & Custom Headers -->
          <details style="grid-column: 1 / -1; margin-top: 0.5rem; background: var(--color-canvas); padding: 0.75rem; border: var(--border-subtle);">
            <summary style="font-family: var(--font-mono); font-size: 0.8125rem; font-weight: 700; cursor: pointer; color: var(--color-primary);">
              ⚙️ Advanced Auth, Custom Headers & User-Agent (Click to expand)
            </summary>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
              <div class="form-group">
                <label class="form-label">Custom User-Agent</label>
                <input type="text" id="api-user-agent" class="form-input" placeholder="e.g. PentestLab-LoadWorker/2.0" />
              </div>
              <div class="form-group">
                <label class="form-label">Custom Request Headers (JSON)</label>
                <textarea id="api-headers-json" class="form-input" rows="2" placeholder='{"Authorization": "Bearer secret_jwt_token", "X-API-Key": "adm_123"}'></textarea>
              </div>
            </div>
          </details>

          <div style="display:flex; gap: 0.75rem; grid-column: 1 / -1; margin-top: 0.5rem;">
            <button type="submit" id="btn-api-start" class="btn btn-primary" style="flex:2;">▶ START API LOAD RUN</button>
            <button type="button" class="btn btn-danger" style="flex:1;" onclick="triggerAbort()">⏹ ABORT</button>
          </div>
        </form>
      </section>

      <!-- Telemetry Stats Cards -->
      <section class="stats-row" style="margin-top: 1.75rem;">
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
      </section>

      <!-- Live ApexCharts Telemetry Stream -->
      <section class="riso-card" style="margin-top: 1.75rem;">
        <div class="card-header">
          <h2 class="card-title">Live Telemetry Stream (SSE Multi-Series)</h2>
          <span class="card-subtitle">THROUGHPUT (RPS) // p95 LATENCY // ACTIVE VUs</span>
        </div>
        <div id="chart-telemetry" style="min-height: 320px;"></div>

        <!-- 12-Metrics Final Summary Panel -->
        <div id="summary-panel" style="display:none; margin-top: 1.5rem; border-top: var(--border-thick); padding-top: 1rem;">
          <h3 class="card-title" style="font-size:1.375rem; color:var(--color-primary);">✅ Final Performance Report Summary</h3>
          <div class="summary-grid" id="summary-metrics-content">
            <!-- Rendered by JS -->
          </div>
        </div>
      </section>
    </div>

    <!-- ========================================================== -->
    <!-- SHARED: SQLITE RUN HISTORY TABLE -->
    <!-- ========================================================== -->
    <section class="riso-card">
      <div class="card-header">
        <h2 class="card-title">03. Verified Run History (SQLite)</h2>
        <span class="card-subtitle">AUDIT LOG & EXECUTION TRACE</span>
      </div>
      <div class="table-container">
        <table class="riso-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Suite Name</th>
              <th>Type</th>
              <th>Target URL / Config</th>
              <th>VUs / Profile</th>
              <th>Duration</th>
              <th>RPS</th>
              <th>p95 Latency</th>
              <th>Errors</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody id="history-tbody">
            <tr>
              <td colspan="10" style="text-align:center; padding:1.5rem;">Loading audit records...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

  </main>

  <!-- Modal Inspector -->
  <div class="modal-overlay" id="inspector-modal" onclick="if(event.target===this)closeModal()">
    <div class="modal-content">
      <button class="modal-close" onclick="closeModal()">✕</button>
      <div class="card-header">
        <h2 class="card-title" id="modal-title">Run Inspection</h2>
        <span class="card-subtitle" id="modal-id">ID: ...</span>
      </div>
      <div id="modal-body" style="font-family:var(--font-mono); font-size:0.875rem; display:flex; flex-direction:column; gap:1.25rem;">
        <!-- Filled by JS -->
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

    // Two-Deck Switcher
    function switchDeck(deck) {
      const btn1 = document.getElementById('tab-btn-deck1');
      const btn2 = document.getElementById('tab-btn-deck2');
      const d1 = document.getElementById('deck1-container');
      const d2 = document.getElementById('deck2-container');

      if (deck === 'DECK1') {
        btn1.classList.add('active');
        btn2.classList.remove('active');
        d1.style.display = 'block';
        d2.style.display = 'none';
      } else {
        btn2.classList.add('active');
        btn1.classList.remove('active');
        d2.style.display = 'block';
        d1.style.display = 'none';
        if (chart) chart.render();
      }
    }

    // E2E Step Builder State
    let e2eSteps = [
      { id: 's1', action: 'GOTO', name: 'Open Web Page', url: 'https://httpbin.org/get' },
      { id: 's2', action: 'WAIT', name: 'Wait Page Hydration', timeoutMs: 1000 },
      { id: 's3', action: 'SCREENSHOT', name: 'Capture Evidence' }
    ];

    function renderE2ESteps() {
      const container = document.getElementById('e2e-steps-container');
      container.innerHTML = '';

      e2eSteps.forEach((step, idx) => {
        const div = document.createElement('div');
        div.className = 'step-card';
        div.innerHTML = \`
          <span class="step-card-num">#\${idx + 1}</span>
          <select class="form-select" style="padding:4px 6px; font-size:0.8125rem;" onchange="updateStepAction(\${idx}, this.value)">
            <option value="GOTO" \${step.action === 'GOTO' ? 'selected' : ''}>GOTO</option>
            <option value="CLICK" \${step.action === 'CLICK' ? 'selected' : ''}>CLICK</option>
            <option value="FILL" \${step.action === 'FILL' ? 'selected' : ''}>FILL</option>
            <option value="WAIT" \${step.action === 'WAIT' ? 'selected' : ''}>WAIT</option>
            <option value="ASSERT_TEXT" \${step.action === 'ASSERT_TEXT' ? 'selected' : ''}>ASSERT_TEXT</option>
            <option value="SCREENSHOT" \${step.action === 'SCREENSHOT' ? 'selected' : ''}>SCREENSHOT</option>
          </select>
          <input type="text" class="form-input" placeholder="Step Name" style="padding:4px 8px; font-size:0.8125rem;" value="\${step.name || ''}" oninput="e2eSteps[\${idx}].name = this.value" />
          <input type="text" class="form-input" placeholder="\${getStepPlaceholder(step.action)}" style="padding:4px 8px; font-size:0.8125rem;" value="\${getStepParam(step)}" oninput="updateStepParam(\${idx}, this.value)" />
          <button type="button" class="btn btn-danger" style="padding:4px 8px; font-size:0.875rem;" onclick="removeE2EStep(\${idx})">✕</button>
        \`;
        container.appendChild(div);
      });
    }

    function getStepPlaceholder(action) {
      if (action === 'GOTO') return 'Target URL (https://...)';
      if (action === 'CLICK' || action === 'WAIT') return 'CSS Selector (#btn)';
      if (action === 'FILL') return 'Selector : Value (#input:alice)';
      if (action === 'ASSERT_TEXT') return 'Selector : Expected (#h1:Welcome)';
      return '(Auto captures screenshot)';
    }

    function getStepParam(step) {
      if (step.action === 'GOTO') return step.url || '';
      if (step.action === 'FILL') return (step.selector || '') + (step.value ? ' : ' + step.value : '');
      if (step.action === 'ASSERT_TEXT') return (step.selector || '') + (step.expectedText ? ' : ' + step.expectedText : '');
      return step.selector || '';
    }

    function updateStepAction(idx, action) {
      e2eSteps[idx].action = action;
      renderE2ESteps();
    }

    function updateStepParam(idx, val) {
      const step = e2eSteps[idx];
      if (step.action === 'GOTO') {
        step.url = val;
      } else if (step.action === 'FILL') {
        const parts = val.split(':').map(s => s.trim());
        step.selector = parts[0];
        step.value = parts[1] || '';
      } else if (step.action === 'ASSERT_TEXT') {
        const parts = val.split(':').map(s => s.trim());
        step.selector = parts[0];
        step.expectedText = parts[1] || '';
      } else {
        step.selector = val;
      }
    }

    function addE2EStep() {
      e2eSteps.push({
        id: 's' + (e2eSteps.length + 1),
        action: 'CLICK',
        name: 'Click Element',
        selector: '#btn'
      });
      renderE2ESteps();
    }

    function removeE2EStep(idx) {
      e2eSteps.splice(idx, 1);
      renderE2ESteps();
    }

    function loadE2EPreset(preset) {
      if (preset === 'nav-check') {
        e2eSteps = [
          { id: 's1', action: 'GOTO', name: 'Open Target URL', url: 'https://httpbin.org' },
          { id: 's2', action: 'WAIT', name: 'Wait 1s Hydration', timeoutMs: 1000 },
          { id: 's3', action: 'SCREENSHOT', name: 'Verified Screenshot' }
        ];
      } else if (preset === 'form-flow') {
        e2eSteps = [
          { id: 's1', action: 'GOTO', name: 'Open Form', url: 'https://httpbin.org/forms/post' },
          { id: 's2', action: 'FILL', name: 'Fill Customer Name', selector: 'input[name="custname"]', value: 'Alice QA' },
          { id: 's3', action: 'CLICK', name: 'Select Size Large', selector: 'input[value="large"]' },
          { id: 's4', action: 'SCREENSHOT', name: 'Form Filled Evidence' }
        ];
      } else if (preset === 'search-assert') {
        e2eSteps = [
          { id: 's1', action: 'GOTO', name: 'Open Home', url: 'https://httpbin.org' },
          { id: 's2', action: 'ASSERT_TEXT', name: 'Assert Title', selector: 'h2', expectedText: 'httpbin' },
          { id: 's3', action: 'SCREENSHOT', name: 'Title Verified' }
        ];
      }
      renderE2ESteps();
    }

    renderE2ESteps();

    // ApexCharts Setup (Deck 2)
    let chart;
    let rpsSeries = [];
    let p95Series = [];
    let vuSeries = [];

    function initChart() {
      const options = {
        chart: {
          type: 'line',
          height: 320,
          animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 1000 } },
          toolbar: { show: false }
        },
        stroke: { curve: 'smooth', width: [3, 3, 2] },
        colors: ['#0077C0', '#EF4444', '#10B981'],
        series: [
          { name: 'RPS (Throughput)', data: rpsSeries },
          { name: 'p95 Latency (ms)', data: p95Series },
          { name: 'Active VUs', data: vuSeries }
        ],
        xaxis: { type: 'numeric', title: { text: 'Duration (seconds)' } },
        yaxis: [
          { title: { text: 'RPS & VUs' }, min: 0 },
          { opposite: true, title: { text: 'Latency (ms)' }, min: 0 }
        ]
      };
      chart = new ApexCharts(document.querySelector("#chart-telemetry"), options);
      chart.render();
    }
    initChart();

    // SSE Stream Connection
    const sse = new EventSource('/api/metrics/stream');

    sse.addEventListener('telemetry', (e) => {
      const data = JSON.parse(e.data);
      document.getElementById('stat-rps').innerText = Number(data.currentRps || 0).toFixed(1);
      document.getElementById('stat-latency').innerText = Math.round(data.p95LatencyMs || 0) + ' ms';
      document.getElementById('stat-workers').innerText = data.activeVUs || data.activeWorkers || 0;
      document.getElementById('stat-total-reqs').innerText = data.totalRequestsSoFar || 0;
      document.getElementById('stat-error-rate').innerText = Number(data.errorRatePercent || 0).toFixed(1) + '%';

      if (data.tick) {
        rpsSeries.push({ x: data.tick, y: Math.round(data.currentRps || 0) });
        p95Series.push({ x: data.tick, y: Math.round(data.p95LatencyMs || 0) });
        vuSeries.push({ x: data.tick, y: data.activeVUs || 0 });

        if (chart) {
          chart.updateSeries([
            { name: 'RPS (Throughput)', data: rpsSeries },
            { name: 'p95 Latency (ms)', data: p95Series },
            { name: 'Active VUs', data: vuSeries }
          ]);
        }
      }
    });

    sse.addEventListener('step_progress', (e) => {
      const data = JSON.parse(e.data);
      if (data.deck === 'PLAYWRIGHT_E2E') {
        const badge = document.getElementById('e2e-live-badge');
        badge.innerText = 'STEP ' + data.stepIndex + ' [' + data.action + ']';
        badge.className = data.status === 'PASSED' ? 'live-step-badge badge-success' : 'live-step-badge badge-fail';

        if (data.currentUrl) {
          document.getElementById('e2e-address-bar').innerText = data.currentUrl;
        } else if (data.action === 'GOTO' && data.url) {
          document.getElementById('e2e-address-bar').innerText = data.url;
        }

        if (data.screenshotUrl) {
          const img = document.getElementById('e2e-live-frame-img');
          img.src = data.screenshotUrl + '?t=' + Date.now();
        }

        const timeline = document.getElementById('e2e-step-timeline');
        const item = document.createElement('div');
        item.className = 'progress-item';
        item.innerHTML = \`
          <div>
            <strong>#\${data.stepIndex} [\${data.action}] \${data.name}</strong>
            <span style="font-size:0.75rem; color:var(--color-ink-muted);"> (\${data.durationMs}ms)</span>
            \${data.errorMessage ? \`<div style="font-size:0.75rem; color:var(--color-danger); margin-top:2px;">⚠️ \${data.errorMessage}</div>\` : ''}
          </div>
          <div>
            <span class="badge \${data.status === 'PASSED' ? 'badge-success' : 'badge-fail'}">\${data.status}</span>
            \${data.screenshotUrl ? \`<a href="\${data.screenshotUrl}" target="_blank" class="badge" style="margin-left:6px; text-decoration:none;">📷 VIEW</a>\` : ''}
          </div>
        \`;
        timeline.prepend(item);
      }
    });

    sse.addEventListener('screenshot_captured', (e) => {
      const data = JSON.parse(e.data);
      if (data.screenshotUrl) {
        const img = document.getElementById('e2e-live-frame-img');
        img.src = data.screenshotUrl + '?t=' + Date.now();
      }
    });

    sse.addEventListener('run_started', (e) => {
      setEngineState('RUNNING');
      rpsSeries = [];
      p95Series = [];
      vuSeries = [];
      document.getElementById('e2e-step-timeline').innerHTML = '';
      document.getElementById('summary-panel').style.display = 'none';
    });

    sse.addEventListener('run_completed', (e) => {
      setEngineState('COMPLETED');
      loadHistory();
      const data = JSON.parse(e.data);
      if (data.loadSummary) {
        renderSummaryPanel(data.loadSummary);
      }
    });

    sse.addEventListener('run_aborted', (e) => {
      setEngineState('ABORTED');
      loadHistory();
    });

    function setEngineState(state) {
      const dot = document.getElementById('system-dot');
      const txt = document.getElementById('system-status-text');
      txt.innerText = 'ENGINE: ' + state;
      dot.className = state === 'RUNNING' ? 'status-dot running' : 'status-dot';
    }

    // Submit Deck 1: Playwright E2E Run
    async function handleE2ESubmit(e) {
      e.preventDefault();
      const suiteName = document.getElementById('e2e-suite-name').value;
      const concurrency = parseInt(document.getElementById('e2e-concurrency').value, 10);
      const userAgent = document.getElementById('e2e-user-agent').value.trim();
      const headersStr = document.getElementById('e2e-headers-json').value.trim();
      let headers = undefined;

      if (headersStr) {
        try {
          headers = JSON.parse(headersStr);
        } catch (err) {
          alert('Invalid JSON in Custom Request Headers: ' + err.message);
          return;
        }
      }

      const payload = {
        suiteName,
        testType: 'PLAYWRIGHT_ONLY',
        concurrency,
        browserSteps: e2eSteps,
        userAgent: userAgent || undefined,
        headers
      };

      try {
        const res = await fetch('/api/runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.status !== 'success') alert(json.message);
      } catch (err) {
        alert(err.message);
      }
    }

    // Submit Deck 2: REST API Load Run
    async function handleApiLoadSubmit(e) {
      e.preventDefault();
      const suiteName = document.getElementById('api-suite-name').value;
      const targetUrl = document.getElementById('api-target-url').value;
      const httpMethod = document.getElementById('api-http-method').value;
      const virtualUsers = parseInt(document.getElementById('api-vu-slider').value, 10);
      const durationSeconds = parseInt(document.getElementById('api-duration').value, 10);
      const loadProfile = document.getElementById('api-load-profile').value;
      const userAgent = document.getElementById('api-user-agent').value.trim();
      const headersStr = document.getElementById('api-headers-json').value.trim();
      let headers = undefined;

      if (headersStr) {
        try {
          headers = JSON.parse(headersStr);
        } catch (err) {
          alert('Invalid JSON in Custom Request Headers: ' + err.message);
          return;
        }
      }

      const payload = {
        suiteName,
        testType: 'ARTILLERY_ONLY',
        targetUrl,
        httpMethod,
        virtualUsers,
        durationSeconds,
        loadProfile,
        userAgent: userAgent || undefined,
        headers
      };

      try {
        const res = await fetch('/api/runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.status !== 'success') alert(json.message);
      } catch (err) {
        alert(err.message);
      }
    }

    async function triggerAbort() {
      await fetch('/api/runs/abort', { method: 'POST' });
    }

    function renderSummaryPanel(s) {
      const panel = document.getElementById('summary-panel');
      const content = document.getElementById('summary-metrics-content');
      panel.style.display = 'block';

      content.innerHTML = \`
        <div class="summary-metric-box">
          <span class="summary-metric-title">Total Requests</span>
          <span class="summary-metric-value">\${s.totalRequests}</span>
        </div>
        <div class="summary-metric-box">
          <span class="summary-metric-title">Successful</span>
          <span class="summary-metric-value" style="color:var(--color-success);">\${s.successfulRequests}</span>
        </div>
        <div class="summary-metric-box">
          <span class="summary-metric-title">Failed</span>
          <span class="summary-metric-value" style="color:var(--color-danger);">\${s.failedRequests}</span>
        </div>
        <div class="summary-metric-box">
          <span class="summary-metric-title">Throughput (RPS)</span>
          <span class="summary-metric-value">\${Number(s.rps).toFixed(1)}</span>
        </div>
        <div class="summary-metric-box">
          <span class="summary-metric-title">Error Rate</span>
          <span class="summary-metric-value">\${Number(s.errorRatePercent).toFixed(1)}%</span>
        </div>
        <div class="summary-metric-box">
          <span class="summary-metric-title">Avg Latency</span>
          <span class="summary-metric-value">\${s.avgLatencyMs} ms</span>
        </div>
        <div class="summary-metric-box">
          <span class="summary-metric-title">p50 (Median)</span>
          <span class="summary-metric-value">\${s.latency?.p50 || 0} ms</span>
        </div>
        <div class="summary-metric-box">
          <span class="summary-metric-title">p95 Latency</span>
          <span class="summary-metric-value">\${s.latency?.p95 || 0} ms</span>
        </div>
        <div class="summary-metric-box">
          <span class="summary-metric-title">p99 (Tail)</span>
          <span class="summary-metric-value">\${s.latency?.p99 || 0} ms</span>
        </div>
        <div class="summary-metric-box">
          <span class="summary-metric-title">Min / Max</span>
          <span class="summary-metric-value" style="font-size:1.25rem;">\${s.latency?.min || 0} / \${s.latency?.max || 0} ms</span>
        </div>
      \`;
    }

    // Load History
    async function loadHistory() {
      try {
        const res = await fetch('/api/runs');
        const json = await res.json();
        const tbody = document.getElementById('history-tbody');
        tbody.innerHTML = '';

        if (!json.data || json.data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:1.5rem;">No test runs recorded yet.</td></tr>';
          return;
        }

        json.data.forEach(run => {
          const tr = document.createElement('tr');
          const isPass = run.status === 'COMPLETED';
          const typeBadge = run.testType === 'PLAYWRIGHT_ONLY' ? '🎭 E2E' : '⚡ API LOAD';

          tr.innerHTML = \`
            <td><span class="badge \${isPass ? 'badge-success' : 'badge-fail'}">\${run.status}</span></td>
            <td><strong>\${run.suiteName}</strong></td>
            <td><span class="badge">\${typeBadge}</span></td>
            <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">\${run.targetUrl || '-'}</td>
            <td>\${run.virtualUsers || 1} VUs (\${run.loadProfile || 'fixed'})</td>
            <td>\${run.durationSeconds || Math.round((run.durationMs || 0) / 1000)}s</td>
            <td>\${run.totalRequests ? Math.round(run.totalRequests / (run.durationSeconds || 1)) : '-'}</td>
            <td>\${run.avgLatencyMs ? Math.round(run.avgLatencyMs) + 'ms' : '-'}</td>
            <td>\${run.errorRatePercent ? Number(run.errorRatePercent).toFixed(1) + '%' : '0%'}</td>
            <td>\${new Date(run.startedAt).toLocaleTimeString()}</td>
          \`;
          tr.onclick = () => openModal(run.id);
          tbody.appendChild(tr);
        });
      } catch (err) {
        console.error('History load error:', err);
      }
    }
    loadHistory();

    // Modal Inspector
    async function openModal(runId) {
      const modal = document.getElementById('inspector-modal');
      const title = document.getElementById('modal-title');
      const mid = document.getElementById('modal-id');
      const body = document.getElementById('modal-body');

      modal.style.display = 'flex';
      title.innerText = 'Loading Run Inspector...';
      mid.innerText = 'ID: ' + runId;
      body.innerHTML = 'Fetching execution breakdown...';

      try {
        const res = await fetch('/api/runs/' + runId);
        const json = await res.json();
        const r = json.data.run;
        const execs = json.data.executions || [];

        title.innerText = r.suiteName;
        body.innerHTML = \`
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:0.75rem; background:var(--color-canvas); padding:0.75rem; border:var(--border-subtle);">
            <div><strong>Status:</strong> \${r.status}</div>
            <div><strong>Type:</strong> \${r.testType}</div>
            <div><strong>Total Requests:</strong> \${r.totalRequests || execs.length}</div>
            <div><strong>Avg Latency:</strong> \${r.avgLatencyMs ? Math.round(r.avgLatencyMs) + ' ms' : '-'}</div>
          </div>

          <div style="display:flex; gap:0.75rem; flex-wrap:wrap; margin-top:0.25rem;">
            <a href="/api/runs/\${r.id}/export/html" download="report-\${r.id}.html" class="btn btn-primary" style="text-decoration:none; font-size:0.875rem; padding:6px 14px;">📄 DOWNLOAD HTML REPORT</a>
            <a href="/api/runs/\${r.id}/export/json" download="summary-\${r.id}.json" class="btn btn-secondary" style="text-decoration:none; font-size:0.875rem; padding:6px 14px;">📥 DOWNLOAD JSON DATA</a>
          </div>

          <h4 style="font-family:var(--font-display); font-size:1.25rem; text-transform:uppercase; margin-top:0.5rem;">Execution Steps (\${execs.length})</h4>
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            \${execs.map(ex => \`
              <div class="progress-item">
                <div>
                  <strong>\${ex.scenarioName}</strong>
                  <div style="font-size:0.75rem; color:var(--color-ink-muted);">Duration: \${ex.durationMs}ms \${ex.errorMessage ? '— Error: ' + ex.errorMessage : ''}</div>
                </div>
                <div>
                  <span class="badge \${ex.status === 'PASSED' ? 'badge-success' : 'badge-fail'}">\${ex.status}</span>
                  \${ex.screenshotPath ? \`<a href="/api/screenshots/\${ex.screenshotPath.split('/').pop()}" target="_blank" class="badge" style="margin-left:6px; text-decoration:none;">📷 VIEW PNG</a>\` : ''}
                </div>
              </div>
            \`).join('')}
          </div>
        \`;
      } catch (err) {
        body.innerHTML = 'Error loading run: ' + err.message;
      }
    }

    function closeModal() {
      document.getElementById('inspector-modal').style.display = 'none';
    }
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

    // GET /api/runs/:id/export/json
    if (req.method === 'GET' && url.pathname.match(/^\/api\/runs\/([^/]+)\/export\/json$/)) {
      const match = url.pathname.match(/^\/api\/runs\/([^/]+)\/export\/json$/);
      const runId = match![1];
      try {
        const generator = new ReportGenerator(storage);
        const json = generator.generateJsonSummary(runId);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="summary-${runId}.json"`
        });
        res.end(JSON.stringify(json, null, 2));
        return;
      } catch (err: any) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
        return;
      }
    }

    // GET /api/runs/:id/export/html
    if (req.method === 'GET' && url.pathname.match(/^\/api\/runs\/([^/]+)\/export\/html$/)) {
      const match = url.pathname.match(/^\/api\/runs\/([^/]+)\/export\/html$/);
      const runId = match![1];
      try {
        const generator = new ReportGenerator(storage);
        const html = generator.generateHtmlReport(runId);
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="report-${runId}.html"`
        });
        res.end(html);
        return;
      } catch (err: any) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
        return;
      }
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

          engine.startRun({
            id,
            suiteName: body.suiteName || 'Manual Dashboard Run',
            testType: body.testType || (body.browserSteps ? 'PLAYWRIGHT_ONLY' : 'ARTILLERY_ONLY'),
            targetUrl: body.targetUrl,
            concurrency: body.concurrency || 2,
            scenarios: body.scenarios,
            browserSteps: body.browserSteps,
            apiSteps: body.apiSteps,
            loadConfig: body.loadConfig,
            virtualUsers: body.virtualUsers || 10,
            durationSeconds: body.durationSeconds || 30,
            loadProfile: body.loadProfile || 'fixed',
            httpMethod: body.httpMethod || 'GET',
            userAgent: body.userAgent,
            headers: body.headers,
            body: body.body
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

  const engine = new TestExecutionEngine({ storage });
  const server = createDashboardServer({ storage, engine });

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 2087;
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(` [PENTEST LAB] Two-Deck Control System`);
    console.log(` Deck 1: Playwright E2E Studio`);
    console.log(` Deck 2: REST API Load Deck`);
    console.log(` Running on: http://localhost:${PORT}`);
    console.log(`======================================================\n`);
  });
}
