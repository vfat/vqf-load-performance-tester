# DCD-01-Dashboard-Web-UI

> **Komponen:** Single Web Dashboard & Two-Deck Control UI  
> **Source Code:** [`src/server.ts`](../../src/server.ts)  
> **Design Ref:** [DESIGN.md](../DESIGN.md)  
> **Status:** `Active / Implemented`  

---

## 1. Object Identification

### Boundary (UI & Antarmuka Interaksi)
* `Nav: Two-Deck Tab Switcher` — Navigasi tab switching antara `[🎭 01. PLAYWRIGHT E2E STUDIO]` dan `[⚡ 02. REST API LOAD DECK]`.
* `Deck 1 (Playwright E2E Studio UI)`:
  * `Form: E2E Scenario Builder` — Builder aksi DOM langkah-demi-langkah (`GOTO`, `CLICK`, `FILL`, `WAIT`, `ASSERT_TEXT`, `SCREENSHOT`).
  * `Frame: Interactive Live Viewport Frame` — Frame pratinjau visual eksekusi browser dan rendering DOM.
  * `Timeline: E2E Step Execution Timeline` — List timeline eksekusi per-langkah beserta status pass/fail.
  * `Gallery: Visual Evidence Screenshot Gallery` — Frame tangkapan layar bukti nyata dari halaman web target.
* `Deck 2 (REST API Load Deck UI)`:
  * `Form: API Chaining & Load Control Bar` — Form konfigurasi multi-endpoint, parameter Virtual Users (`#vu-slider`), duration (`#test-duration`), load profile dropdown (`#load-profile`), method (`#http-method`).
  * `Card: Telemetry Stats Row` — Kartu RPS, p95 Latency, Active VUs, Total Requests, Error Rate.
  * `Chart: Live Telemetry Stream` — Visualisasi interaktif ApexCharts multi-series (RPS, Latensi p95, Active VUs).
  * `Panel: 12-Metrics Load Summary Panel` — Panel metrik post-test run (p50, p90, p95, p99, min/max, throughput, error rate).
* `Shared UI Elements`:
  * `Screen: Topbar Header` — Baris brand header dengan status dot running indicator dan tombol Theme Toggle (`#theme-toggle`).
  * `Table: SQLite History Table` — Tabel render riwayat eksekusi test run terurut.
  * `Modal: Run History Inspector` — Dialog overlay modal detail eksekusi run dan screenshot target.

### Control (Logika & Handler Proses)
* `Handler: DeckSwitcher` — Pengatur switching visibilitas aktif antara Deck 1 (E2E) dan Deck 2 (API Load).
* `Handler: E2EStepBuilderHandler` — Handler penambahan/pengurangan langkah DOM browser Playwright.
* `Handler: ApiChainingBuilderHandler` — Handler konfigurasi alur REST API multi-endpoint dan ekstraksi token.
* `Handler: TelemetrySseListener` — Handler `EventSource('/api/metrics/stream')` penerima event `telemetry`, `scenario_completed`, `screenshot_captured`, `run_completed`, `run_aborted`.
* `Handler: RunSubmitHandler` — Form submit interceptor yang mem-POST payload konfigurasi uji ke `/api/runs`.
* `Handler: AbortHandler` — Click interceptor tombol abort yang mem-POST `/api/runs/abort`.

### Entity (Model Data & Schema Kontrak)
* `Entity: Endpoint GET /` — Single page HTML broadsheet dashboard dengan Two-Deck UI.
* `Entity: Endpoint GET /api/metrics/stream` — SSE stream endpoint `text/event-stream`.
* `Entity: Endpoint GET /api/status` — Engine status snapshot JSON.
* `Entity: Endpoint GET /api/runs` — Daftar riwayat test runs JSON.
* `Entity: Endpoint GET /api/runs/:id` — Detail run, execution steps, dan metric points JSON.
* `Entity: Endpoint POST /api/runs` — Trigger dispatch run JSON contract.
* `Entity: Endpoint POST /api/runs/abort` — Sinyal emergency cancel JSON contract.
* `Entity: Endpoint GET /api/screenshots/:filename` — Binary image PNG stream.

---

## 2. Use Case List

| No | Use Case Name | Actor | Status | Detail |
|---|---|---|---|---|
| 1 | `UC-UI-01` — Switch Active Deck (E2E vs API Load) | QA / Developer | Active | Section 3.1 |
| 2 | `UC-UI-02` — Build & Execute Playwright E2E Scenario | QA / Developer | Planned | Section 3.2 |
| 3 | `UC-UI-03` — Configure & Trigger REST API Load Test | QA / Developer | Active | Section 3.3 |
| 4 | `UC-UI-04` — View Live Viewport & Step Screenshots (Deck 1) | QA / Developer | Active | Section 3.4 |
| 5 | `UC-UI-05` — View Live Telemetry Stream & Summary (Deck 2) | QA / Developer | Active | Section 3.5 |
| 6 | `UC-UI-06` — Inspect Past History & Artifacts | QA / Developer | Active | Section 3.6 |

---

## 3. Robustness Diagram (Mermaid BCE)

```mermaid
flowchart TD
    User([QA / Developer])

    subgraph Boundary
        B_Tabs[Two-Deck Tab Switcher]
        B_Deck1[Deck 1: Playwright E2E Studio]
        B_Deck2[Deck 2: REST API Load Deck]
        B_SSE[SSE EventSource Stream]
        B_Modal[Modal: Run Inspector]
    end

    subgraph Control
        C_DeckSwitch[DeckSwitcher]
        C_E2EHandler[E2EStepBuilderHandler]
        C_ApiHandler[ApiChainingBuilderHandler]
        C_Abort[AbortHandler]
        C_Inspect[RunInspector]
    end

    subgraph Entity
        E_Engine[(TestExecutionEngine)]
        E_Storage[(SQLite Repository)]
        E_Streamer[(TelemetryStreamer)]
    end

    User -->|Pilih Tab| B_Tabs
    B_Tabs -->|switchDeck| C_DeckSwitch
    C_DeckSwitch -->|tampilkan| B_Deck1
    C_DeckSwitch -->|tampilkan| B_Deck2

    User -->|Trigger E2E Steps| B_Deck1
    B_Deck1 -->|POST /api/runs (type: PLAYWRIGHT)| C_E2EHandler
    C_E2EHandler -->|startRun| E_Engine

    User -->|Trigger API Load| B_Deck2
    B_Deck2 -->|POST /api/runs (type: ARTILLERY)| C_ApiHandler
    C_ApiHandler -->|startRun| E_Engine

    E_Streamer -->|Push Live Events| B_SSE
    B_SSE -->|Update Viewport & Screenshots| B_Deck1
    B_SSE -->|Update Telemetry & Chart| B_Deck2

    User -->|Klik Baris Riwayat| B_Modal
    B_Modal -->|GET /api/runs/:id| C_Inspect
    C_Inspect -->|getRun & getExecutions| E_Storage
```
