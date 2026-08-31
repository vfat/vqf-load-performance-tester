# ⚡ Pentest Lab — Load & Performance Control Deck

> **Editorial Broadsheet Risograph Dashboard for Real HTTP Load Testing & Playwright E2E Verification**

A lightweight, zero-overhead testing platform that combines **Real HTTP Load Generation (Virtual Users up to 100, custom duration, load profiles)** with **Headless Playwright Chromium E2E verification**, local **SQLite persistence**, and real-time **Server-Sent Events (SSE)** telemetry.

---

## 🚀 Key Features

* **⚡ Real HTTP Load Engine**: Real asynchronous `fetch()` requests with Virtual Users (1–100 VUs), Test Duration (5–300s), and Load Profiles (`fixed`, `ramp-up`, `spike`).
* **🎭 Playwright E2E Verification**: Headless Chromium real DOM execution with `networkidle` state, automated full-page rendering, and screenshot evidence capture.
* **📊 Live Telemetry Stream (SSE)**: Real-time dual-axis metric streaming (`/api/metrics/stream`) plotting RPS Throughput, p95 Latency, and Active VUs dynamically via ApexCharts.
* **💾 Zero-Infra SQLite Storage**: Embedded SQLite with WAL mode (`./data/test_history.db`) for run history, scenario execution breakdowns, and quantile metrics.
* **🎨 Risograph Broadsheet Design**: Editorial print-inspired SaaS aesthetic with high-contrast tactile elements, dark/light theme toggle, and zero external heavy daemon dependencies (no Grafana / Prometheus needed).

---

## 🛠️ Tech Stack

* **Runtime:** Node.js (v20+) & TypeScript
* **Testing Engines:** Native Async HTTP Load Worker + Playwright Chromium + Artillery Quantiles
* **Database:** SQLite (`better-sqlite3` with WAL mode)
* **Frontend:** Vanilla HTML5 / CSS3 (Editorial Risograph UI) + ApexCharts CDN + Native SSE (`EventSource`)
* **Test Runner:** Vitest (TDD 100% Pass Rate)

---

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <YOUR_GITHUB_REPO_URL>
   cd pentest
   ```

2. **Install dependencies & Playwright browser:**
   ```bash
   npm install
   npx playwright install chromium
   ```

3. **Build TypeScript:**
   ```bash
   npm run build
   ```

4. **Start the Dashboard Server:**
   ```bash
   # Default port: 2087
   npm start
   
   # Or specify custom port
   PORT=2087 node dist/src/server.js
   ```

5. **Open Dashboard in Browser:**
   ```
   http://localhost:2087
   ```

---

## 🧪 Running Tests (TDD)

Run all 35+ automated unit, integration, and real headless browser tests:

```bash
npm test
```

---

## 📁 Project Structure

```
├── .ai-doc/            # Architecture decision records, MoMs, 3P tracking, TDD overview
├── data/               # SQLite history database directory
├── reports/            # Execution summaries & screenshot evidence artifacts
├── src/
│   ├── lib/server/
│   │   ├── http-load-worker.ts   # Real HTTP Load Engine with VUs & Profiles
│   │   ├── playwright-runner.ts  # Playwright Headless Browser Worker
│   │   ├── artillery-runner.ts   # Percentiles & Quantiles Calculation (p50..p99)
│   │   ├── scheduler.ts          # In-Memory Concurrency Throttle & Abort Guard
│   │   ├── storage.ts            # SQLite Repository (WAL mode)
│   │   ├── streamer.ts           # Server-Sent Events (SSE) Telemetry Broadcaster
│   │   └── engine.ts             # Hybrid Orchestration Engine
│   └── server.ts                 # Dashboard HTTP Server, SSE & REST Endpoints
├── tests/              # 100% TDD Vitest Test Suites
└── package.json
```

---

## 📄 License

MIT
