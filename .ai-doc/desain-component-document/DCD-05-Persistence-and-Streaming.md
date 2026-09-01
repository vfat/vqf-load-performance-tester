# DCD-05-Persistence-and-Streaming

> **Komponen:** SQLite Storage Repository & Server-Sent Events (SSE) Telemetry Streamer  
> **Source Code:** [`src/lib/server/storage.ts`](../../src/lib/server/storage.ts), [`src/lib/server/streamer.ts`](../../src/lib/server/streamer.ts)  
> **Spec Ref:** [SCD-04-Result-Metrics-Collector.md](../plan/component/SCD-04-Result-Metrics-Collector.md)  
> **Status:** `Active / Implemented`  

---

## 1. Object Identification

### Boundary
* `File: ./data/test_history.db` — Database file SQLite lokal dengan pragma WAL mode.
* `Endpoint: /api/metrics/stream` — HTTP Server-Sent Events channel.
* `Interface: SseClientCallback` — Callback sender `(msg: string) => void` per-klien.

### Control
* `Control: SqliteHistoryRepository` — DAO/Repository wrapper `better-sqlite3` pengelola tabel `test_runs`, `test_executions`, dan `metric_points`.
* `Control: TelemetryStreamer` — Broadcaster event realtime dengan proteksi pembersihan klien putus (*broken pipe cleanup*).
* `Control: PragmaOptimizer` — Pengatur konfigurasi database performa tinggi (`journal_mode = WAL`, `synchronous = NORMAL`).

### Entity
* `Entity: test_runs (Table)` — Tabel penyimpanan sesi pengujian (`id`, `suite_name`, `test_type`, `status`, `target_url`, `started_at`, `completed_at`, `total_scenarios`, `passed_scenarios`, `failed_scenarios`, `duration_ms`, `virtual_users`, `duration_seconds`, `load_profile`, `http_method`, `avg_latency_ms`, `total_requests`, `error_rate_percent`).
* `Entity: test_executions (Table)` — Tabel detail sub-skenario (`id`, `test_run_id`, `scenario_name`, `status`, `duration_ms`, `retry_count`, `error_message`, `screenshot_path`).
* `Entity: metric_points (Table)` — Tabel time-series metrik load (`id`, `test_run_id`, `timestamp`, `rps`, `p50_ms`, `p95_ms`, `p99_ms`, `error_count`).

---

## 2. Use Case List

| No | Use Case Name | Actor | Status | Detail |
|---|---|---|---|---|
| 1 | `UC-DATA-01` — Persist Test Run Lifecycle Records | TestExecutionEngine | Active | Section 3.1 |
| 2 | `UC-DATA-02` — Persist Scenario Executions & Metric Points | Workers / Engine | Active | Section 3.2 |
| 3 | `UC-DATA-03` — Query Run History & Inspector Detail | Dashboard API | Active | Section 3.3 |
| 4 | `UC-DATA-04` — Broadcast SSE Telemetry to Multiple Clients | TelemetryStreamer | Active | Section 3.4 |

---

## 3. Use Case Detail

### 3.1 `UC-DATA-01`: Persist Test Run Lifecycle Records

* **Aktor:** `TestExecutionEngine`
* **Deskripsi:** Menyimpan metadata awal saat run dibuat (`createRun`), dan memperbarui status serta metrik ringkasan saat run selesai (`updateRun`).
* **Normal Flow:**
  1. `createRun` mengeksekusi `INSERT INTO test_runs` dengan status `QUEUED`.
  2. Saat pengujian berakhir, `updateRun` mengeksekusi query dinamis yang memperbarui status (`COMPLETED`/`FAILED`/`ABORTED`), `duration_ms`, `total_requests`, `avg_latency_ms`, dan `error_rate_percent`.

---

### 3.2 `UC-DATA-04`: Broadcast SSE Telemetry to Multiple Clients

* **Aktor:** `TelemetryStreamer` / Browser Clients
* **Deskripsi:** Mengirimkan payload JSON dengan format standar SSE (`event: <name>\ndata: <json>\n\n`) ke seluruh koneksi browser yang terhubung tanpa pemblokiran I/O.
* **Normal Flow:**
  1. Klien browser membuka koneksi `/api/metrics/stream`.
  2. Streamer mendaftarkan clientId ke `Map<string, SseClientCallback>`.
  3. Saat event dipicu (`broadcast(eventName, data)`), streamer mengiterasi seluruh klien dan menuliskan payload.
  4. Jika klien menutup tab atau koneksi putus, streamer menangkap error dan menghapus clientId dari memori.

---

## 4. Robustness Diagram (Mermaid BCE)

```mermaid
flowchart TD
    Engine([TestExecutionEngine])
    Client([Browser SSE Client])

    subgraph Boundary
        B_SSEStream[/api/metrics/stream Endpoint]
        B_DBFile[./data/test_history.db]
    end

    subgraph Control
        C_Storage[SqliteHistoryRepository]
        C_Streamer[TelemetryStreamer]
    end

    subgraph Entity
        E_Runs[(test_runs)]
        E_Executions[(test_executions)]
        E_Metrics[(metric_points)]
    end

    Engine -->|createRun / updateRun| C_Storage
    Engine -->|addExecution / addMetricPoint| C_Storage
    C_Storage -->|read / write| B_DBFile
    B_DBFile --- E_Runs
    B_DBFile --- E_Executions
    B_DBFile --- E_Metrics

    Client -->|connect| B_SSEStream
    B_SSEStream -->|addClient| C_Streamer
    Engine -->|broadcast event| C_Streamer
    C_Streamer -->|push SSE data| Client
```
