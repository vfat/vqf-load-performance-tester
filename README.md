# ⚡ Pentest Lab — Load & Performance Control Deck

> **Editorial Broadsheet Risograph Dashboard for Real HTTP Load Testing & Playwright E2E Studio**

A lightweight, zero-overhead testing platform that combines **Two-Deck Architecture**: **Playwright E2E Studio** with visual step builder & timeline evidence, and **REST API Load Deck** with Postman-like multi-endpoint request chaining, dynamic variable extraction, and scaling up to **1,000 Virtual Users (VUs)**. Includes embedded **SQLite persistence**, real-time **Server-Sent Events (SSE)** telemetry, and **Docker containerization**.

---

## 🚀 Key Features

* **⚡ Two-Deck Testing Architecture**:
  * **🎭 Deck 1 — Playwright E2E Studio**: Sequential DOM step builder (`GOTO`, `CLICK`, `FILL`, `WAIT`, `ASSERT_TEXT`, `SCREENSHOT`), live process viewport frame, real-time step timeline, and automatic on-failure screenshot evidence.
  * **⚡ Deck 2 — REST API Load Deck (Artillery Engine)**: Postman-like multi-endpoint request pipeline with dedicated sub-tabs (`Headers`, `Body JSON`, `Extract Vars`), dynamic token & variable chaining (`{{token}}`), status assertions, and scaling from **1 to 1,000 Concurrent VUs** with HTTP Keep-Alive connection pooling.
* **📊 Live Telemetry Stream (SSE)**: Real-time multi-series metric streaming (`/api/metrics/stream`) plotting RPS Throughput, p95 Latency, and Active VUs dynamically via ApexCharts.
* **💾 Zero-Infra SQLite Storage**: Embedded SQLite with WAL mode (`./data/test_history.db`) for run history, scenario execution breakdowns, and quantile metrics (`p50`, `p90`, `p95`, `p99`).
* **📄 Report Export Generator**: Interactive standalone HTML performance report export (`GET /api/runs/:id/export/html`) and raw JSON metrics export (`GET /api/runs/:id/export/json`).
* **💻 Headless CLI Test Runner**: Run tests directly from terminal/CI-CD (`npm run test:run -- --mode=api --vus=50 --duration=10`).
* **🐳 Docker & Docker Hub Ready**: Official multi-stage container image `vickyfatrian/vqf-load-tester:latest` with built-in Playwright Chromium and SQLite volume persistence.
* **🎨 Risograph Broadsheet Design**: Editorial print-inspired SaaS aesthetic with high-contrast tactile elements, dark/light theme toggle, and zero heavy external daemon requirements (no Grafana / Prometheus needed).

---

## 🛠️ Tech Stack

* **Runtime:** Node.js (v22+) & TypeScript
* **Testing Engines:** Native Async Chained Load Worker + Playwright Headless Chromium + Artillery Percentiles Engine
* **Database:** SQLite (`better-sqlite3` with WAL mode & cascading deletes)
* **Frontend:** Vanilla HTML5 / CSS3 (Editorial Risograph UI) + ApexCharts CDN + Native SSE (`EventSource`)
* **Containerization:** Docker (Multi-stage Debian Bookworm Slim with Chromium)
* **Test Runner:** Vitest (100% TDD, 14 Test Files, 54/54 Tests Passing)

---

## 🐳 Quick Start with Docker (Recommended)

Jalankan container resmi langsung dari Docker Hub:

```bash
docker run -d \
  --name vqf-load-tester \
  --restart unless-stopped \
  -p 2087:2087 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/reports:/app/reports \
  vickyfatrian/vqf-load-tester:latest
```

Atau menggunakan **Docker Compose**:

```bash
docker compose up -d
```

Buka dashboard di: **`http://localhost:2087`**

---

## 📦 Manual Installation & Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vfat/vqf-load-performance-tester.git
   cd vqf-load-performance-tester
   ```

2. **Install dependencies & Playwright Chromium:**
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
   PORT=2087 npm start
   ```

5. **Open Dashboard in Browser:**
   ```
   http://localhost:2087
   ```

---

## 💻 Headless CLI Usage

Run load or E2E tests in headless mode directly from command line (ideal for CI/CD pipelines):

```bash
# REST API Load test (50 VUs, 15 seconds, ramp-up profile)
npm run test:run -- --mode=api --url=https://httpbin.org/get --vus=50 --duration=15 --profile=ramp-up

# Playwright E2E browser verification
npm run test:run -- --mode=e2e --url=https://example.com --scenario="nav-check"
```

---

## 🧪 Running Automated Tests (TDD)

Run all 14 automated test suites (54 unit, integration, and real headless browser tests):

```bash
npm test
```

---

## 📁 Project Structure

```
├── .ai-doc/            # Architecture decision records, C4 diagrams, 3P tracking, TDD overview, lampiran
├── data/               # SQLite history database directory (auto-mounted volume)
├── reports/            # Execution summaries & screenshot evidence artifacts (auto-mounted volume)
├── src/
│   ├── lib/server/
│   │   ├── api-chaining-executor.ts    # Multi-endpoint REST API Chaining & Token Extraction
│   │   ├── http-load-worker.ts         # Real HTTP Load Worker (1-1000 VUs, Keep-Alive, Scenarios)
│   │   ├── playwright-step-executor.ts # Sequential DOM Playwright Studio Runner
│   │   ├── playwright-runner.ts        # Playwright Headless Browser Worker
│   │   ├── report-generator.ts         # Standalone HTML & JSON Report Exporters
│   │   ├── artillery-runner.ts         # Percentiles & Quantiles Calculation (p50..p99)
│   │   ├── scheduler.ts                # In-Memory Concurrency Throttle & Abort Guard
│   │   ├── storage.ts                  # SQLite Repository (WAL mode, 19 columns, Cascade FK)
│   │   ├── streamer.ts                 # Server-Sent Events (SSE) Telemetry Broadcaster
│   │   └── engine.ts                   # Hybrid Orchestration Engine
│   ├── cli.ts                          # Headless CLI Runner & Terminal ASCII Visualizer
│   └── server.ts                       # Two-Deck Dashboard Server, SSE & REST API Endpoints
├── tests/              # 14 Test Files — 54/54 Passed (TDD-001 s/d TDD-011)
├── Dockerfile          # Multi-stage Docker build with Playwright Chromium & C++ addons
├── docker-compose.yml  # Docker Compose definition with volume persistence
└── package.json
```

---

## 📄 License

MIT
