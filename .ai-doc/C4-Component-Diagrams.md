# C4 Component Diagrams: Lean Testing Platform & Single Dashboard Control

## Lean Testing & Single Dashboard Platform

### Deskripsi
Platform pengujian beban dan E2E browser mandiri (*lean & self-contained*) yang dilengkapi **Single Web Dashboard Control** berbasis SvelteKit & Risograph Broadsheet Design System, SQLite database lokal, engine worker Playwright + Artillery, dan SSE realtime telemetry stream.

### Diagram
```mermaid
C4Component
    title Component Diagram for Lean Testing Platform with Single Dashboard Control

    Container(qaBrowser, "QA User Web Browser", "Chrome / Edge / Firefox", "Interactive Single Dashboard Control (Svelte SPA)")
    Container(ciClient, "CI/CD CLI Pipeline", "Terminal / GitHub Actions", "Headless CLI runner ($ test-runner run)")
    ContainerDb(sqliteDb, "SQLite History DB", "Local File Storage", "./data/test_history.db with WAL mode")
    System_Ext(targetSut, "System Under Test (SUT)", "Target Web / API Service")
    Container(reportFiles, "Report Artifacts", "Static Files", "./reports/report.html and summary.json")

    Container_Boundary(platformBoundary, "Unified Platform (SvelteKit + Node.js Runner)") {
        Component(svelteUi, "SvelteKit Web Dashboard", "SvelteKit SPA (Risograph UI)", "Interactive Control Panel, Live ApexCharts, SQLite History Inspector")
        Component(sseStream, "SSE Telemetry Streamer", "SvelteKit +server.ts", "Pushes realtime RPS, p95 latency, and active workers via SSE")
        Component(apiRoutes, "REST Control API", "SvelteKit API Endpoints", "Handles /api/runs (Start, Abort, History queries)")
        Component(taskScheduler, "Task Scheduler & Queue", "In-Memory Async Queue", "Dispatches tasks safely with concurrency limits")
        Component(pwWorker, "Playwright Worker", "Playwright Core", "Executes headless browser E2E scenarios with context isolation")
        Component(artilleryWorker, "Artillery Runner", "Artillery Engine", "Generates synthetic HTTP/WS load traffic")
        Component(reportPersister, "Report & SQLite Persister", "better-sqlite3", "Persists test runs to SQLite and writes static reports")

        Rel(qaBrowser, svelteUi, "Loads Dashboard UI from")
        Rel(qaBrowser, sseStream, "Listens to /api/metrics/stream via SSE")
        Rel(qaBrowser, apiRoutes, "Triggers test runs & aborts via POST")
        Rel(ciClient, taskScheduler, "Directly triggers headless run via CLI")

        Rel(apiRoutes, taskScheduler, "Enqueues scenario run to")
        Rel(taskScheduler, pwWorker, "Dispatches E2E jobs to")
        Rel(taskScheduler, artilleryWorker, "Dispatches load jobs to")

        Rel(pwWorker, targetSut, "Interacts with")
        Rel(artilleryWorker, targetSut, "Generates traffic to")

        Rel(pwWorker, sseStream, "Streams live progress to")
        Rel(artilleryWorker, sseStream, "Streams realtime telemetry to")

        Rel(pwWorker, reportPersister, "Sends completion event to")
        Rel(artilleryWorker, reportPersister, "Sends summary metrics to")

        Rel(reportPersister, sqliteDb, "Writes run records to")
        Rel(reportPersister, reportFiles, "Exports report.html & summary.json")
        Rel(apiRoutes, sqliteDb, "Queries run history from")
    }
```

### Komponen
| Komponen | Deskripsi | Teknologi |
|---|---|---|
| **SvelteKit Web Dashboard** | Single Dashboard Control dengan gaya Risograph Broadsheet (Control form, Live ApexCharts, History Inspector). | SvelteKit / Svelte 5 |
| **SSE Telemetry Streamer** | Endpoint `/api/metrics/stream` untuk mendorong metrik realtime ke browser tanpa WebSocket overhead. | Node.js Server-Sent Events |
| **REST Control API** | Endpoint `/api/runs` untuk memicu test run baru, membatalkan test (*abort*), dan membaca riwayat SQLite. | SvelteKit API Routes |
| **Task Scheduler & Queue** | Mengatur antrean in-memory dan menjaga batas concurrency agar VPS terhindar dari OOM. | In-Memory Async Queue |
| **Playwright Worker** | Worker browser headless dengan isolasi browser context per test case. | Playwright Core |
| **Artillery Runner** | Engine traffic generator untuk beban HTTP/WS volume tinggi. | Artillery Core |
| **Report & SQLite Persister** | Modul penyimpanan riwayat ke SQLite dan penulisan file `report.html` & `summary.json`. | `better-sqlite3` |

### External Systems / Files
| System / File | Tipe | Fungsi |
|---|---|---|
| **SQLite DB (`history.db`)** | Local File Storage | Database riwayat run mandiri (WAL mode). |
| **Report Files** | File Artifacts | Arsip laporan pengujian mandiri di folder `./reports/`. |
| **System Under Test (SUT)** | Target Web / API | Aplikasi target yang diuji performa dan fungsionalnya. |
