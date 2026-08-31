# TDD Overview: Lean Testing Platform & Single Dashboard

> Pusat kontrol TDD project. Source of truth status adalah bukti test/implementasi yang tercatat di sini.

## 1. Metadata

- **Project:** Lean Testing Platform & Single Dashboard Control
- **TDD Policy:** `Enabled`
- **Scope:** Greenfield development (Task Scheduler, SQLite Store, SSE Streamer, Playwright Worker, Artillery Runner)
- **Activated at:** `2026-08-31`
- **Constitution:** `.ai-doc/constitution.md`
- **Last updated:** `2026-08-31 18:32`
- **Overall status:** `Active`

---

## 2. Progress Summary

| Metric | Count |
|---|---:|
| Total targets | 6 |
| PLANNED | 0 |
| RED | 0 |
| GREEN | 0 |
| REFACTORING | 0 |
| REFACTORED | 6 |
| BLOCKED | 0 |
| EXCEPTION | 0 |

---

## 3. TDD Registry

| ID | Component | Use Case / Behavior | Acceptance Criteria | Test File | Current Status | Last Evidence | Notes |
|---|---|---|---|---|---|---|---|
| `TDD-001` | Task Scheduler | In-memory task queue with concurrency throttle & abort | Enqueues jobs, limits parallel executions to max concurrency, and immediately stops on abort signal | `tests/scheduler.test.ts` | `REFACTORED` | `3 passed (157ms), exit 0` | Core concurrency guard |
| `TDD-002` | SQLite Store | Run history & execution persistence | Initializes SQLite schema with WAL mode, inserts new test run, updates run status, and queries history | `tests/storage.test.ts` | `REFACTORED` | `4 passed (16ms), exit 0` | Local `history.db` |
| `TDD-003` | SSE Telemetry Streamer | Realtime metric broadcast | Registers client connections, broadcasts metric events (RPS, p95 latency, worker status), and handles disconnects | `tests/streamer.test.ts` | `REFACTORED` | `3 passed (10ms), exit 0` | `/api/metrics/stream` |
| `TDD-004` | Playwright Runner | Headless browser execution with context isolation | Launches isolated context, executes Playwright scenario, captures duration and assertion status | `tests/playwright-runner.test.ts` | `REFACTORED` | `3 passed (34ms), exit 0` | E2E test worker |
| `TDD-005` | Artillery Runner | Synthetic HTTP load generation & latency stats | Generates HTTP requests based on profile, calculates quantiles (p50, p95, p99), and emits summary | `tests/artillery-runner.test.ts` | `REFACTORED` | `3 passed (5ms), exit 0` | Load test worker |
| `TDD-006` | HttpLoadWorker | Real HTTP load testing with VUs, duration, profiles | Sends real fetch() requests, scales VUs per profile (fixed/ramp-up/spike), emits per-tick metrics, handles abort & timeout | `tests/http-load-worker.test.ts` | `REFACTORED` | `8 passed (7544ms), exit 0` | Real HTTP load engine |

---

## 4. Cycle Detail

### TDD-001 — Task Scheduler & In-Memory Concurrency Guard

- **Component:** `TaskScheduler`
- **Use case source:** `UC-SCHED-01`, `UC-SCHED-02`
- **Acceptance criteria:**
  1. `enqueue(task)` menampung job ke antrean.
  2. Jumlah task yang dieksekusi bersamaan tidak melebihi `concurrencyLimit`.
  3. Memanggil `abort()` membatalkan task yang sedang menunggu dan menghentikan worker yang sedang jalan.
- **Current status:** `REFACTORED`

#### RED
- **Test file:** `tests/scheduler.test.ts`
- **Test name/target:** `TaskScheduler concurrency and abort tests`
- **Command:** `npm test tests/scheduler.test.ts`
- **Exit status:** `1`
- **Failure evidence:** `Error: Cannot find module '../src/lib/server/scheduler.js' imported from 'tests/scheduler.test.ts'`
- **Verified at:** `2026-08-31 14:09`

#### GREEN
- **Implementation file(s):** `src/lib/server/scheduler.ts`
- **Minimal change:** `Implement TaskScheduler class with concurrency throttling, in-memory queue, and abort method`
- **Command:** `npm test tests/scheduler.test.ts`
- **Exit status:** `0`
- **Passing evidence:** `✓ tests/scheduler.test.ts (3 tests) 157ms - 3 passed (3)`
- **Verified at:** `2026-08-31 14:09`

#### REFACTOR
- **Status:** `REFACTORED`
- **Changes:** `Clean TypeScript types, safe async queue draining on abort`
- **Regression command:** `npm test tests/scheduler.test.ts`
- **Exit status:** `0`
- **Regression evidence:** `3 tests passed (3)`
- **Verified at:** `2026-08-31 14:09`

---

### TDD-002 — SQLite History Storage & Repository

- **Component:** `SqliteHistoryRepository`
- **Use case source:** `UC-DATA-01`
- **Acceptance criteria:**
  1. `init()` membuat tabel `test_runs`, `test_executions`, `metric_points` dengan WAL mode.
  2. `createRun()` menyimpan metadata sesi uji baru.
  3. `updateRun()` memperbarui status, duration, total pass/fail.
  4. `listRuns()` mengembalikan daftar run dengan pagination & order desc.
- **Current status:** `REFACTORED`

#### RED
- **Test file:** `tests/storage.test.ts`
- **Test name/target:** `SqliteHistoryRepository CRUD tests`
- **Command:** `npm test tests/storage.test.ts`
- **Exit status:** `1`
- **Failure evidence:** `Error: Cannot find module '../src/lib/server/storage.js' imported from 'tests/storage.test.ts'`
- **Verified at:** `2026-08-31 14:10`

#### GREEN
- **Implementation file(s):** `src/lib/server/storage.ts`
- **Minimal change:** `Implement SqliteHistoryRepository using better-sqlite3 with WAL pragma and CRUD methods`
- **Command:** `npm test tests/storage.test.ts`
- **Exit status:** `0`
- **Passing evidence:** `✓ tests/storage.test.ts (4 tests) 16ms - 4 passed (4)`
- **Verified at:** `2026-08-31 14:10`

#### REFACTOR
- **Status:** `REFACTORED`
- **Changes:** `Added indexes on test_runs and metric_points for fast history & metric queries`
- **Regression command:** `npm test`
- **Exit status:** `0`
- **Regression evidence:** `7 tests passed (2 test files)`
- **Verified at:** `2026-08-31 14:10`

---

### TDD-003 — SSE Telemetry Streamer

- **Component:** `TelemetryStreamer`
- **Use case source:** `UC-DATA-02`, `UC-UI-03`
- **Acceptance criteria:**
  1. Menampung multiple active client connection.
  2. `broadcast(event, data)` mengirim formatted SSE data (`event: <event>\ndata: <json>\n\n`).
  3. Client yang disconnect dibersihkan secara aman dari memory.
- **Current status:** `REFACTORED`

#### RED
- **Test file:** `tests/streamer.test.ts`
- **Test name/target:** `TelemetryStreamer broadcast and connection tests`
- **Command:** `npm test tests/streamer.test.ts`
- **Exit status:** `1`
- **Failure evidence:** `Error: Cannot find module '../src/lib/server/streamer.js' imported from 'tests/streamer.test.ts'`
- **Verified at:** `2026-08-31 14:10`

#### GREEN
- **Implementation file(s):** `src/lib/server/streamer.ts`
- **Minimal change:** `Implement TelemetryStreamer class with client tracking, broadcast formatting, and broken connection cleanup`
- **Command:** `npm test tests/streamer.test.ts`
- **Exit status:** `0`
- **Passing evidence:** `✓ tests/streamer.test.ts (3 tests) 10ms - 3 passed (3)`
- **Verified at:** `2026-08-31 14:11`

#### REFACTOR
- **Status:** `REFACTORED`
- **Changes:** `Modular TypeScript typings and clear method signatures`
- **Regression command:** `npm test`
- **Exit status:** `0`
- **Regression evidence:** `10 tests passed (3 test files)`
- **Verified at:** `2026-08-31 14:11`

---

### TDD-004 — Playwright Worker Runner

- **Component:** `PlaywrightRunner`
- **Use case source:** `UC-WORK-01`
- **Acceptance criteria:**
  1. Menjalankan skrip browser headless dengan konteks terisolasi.
  2. Menghasilkan event laporan status (`PASSED`/`FAILED`), durasi, dan screenshot path bila gagal.
  3. Mendukung retry logic untuk flaky scenarios.
- **Current status:** `REFACTORED`

#### RED
- **Test file:** `tests/playwright-runner.test.ts`
- **Test name/target:** `PlaywrightRunner execution and retry tests`
- **Command:** `npm test tests/playwright-runner.test.ts`
- **Exit status:** `1`
- **Failure evidence:** `Error: Cannot find module '../src/lib/server/playwright-runner.js' imported from 'tests/playwright-runner.test.ts'`
- **Verified at:** `2026-08-31 14:11`

#### GREEN
- **Implementation file(s):** `src/lib/server/playwright-runner.ts`
- **Minimal change:** `Implement PlaywrightRunner class with retry loop, timing measurement, and structured result return`
- **Command:** `npm test tests/playwright-runner.test.ts`
- **Exit status:** `0`
- **Passing evidence:** `✓ tests/playwright-runner.test.ts (3 tests) 34ms - 3 passed (3)`
- **Verified at:** `2026-08-31 14:11`

#### REFACTOR
- **Status:** `REFACTORED`
- **Changes:** `Explicit ScenarioExecutionResult interface, zero memory leaks, and real headless Chromium browser execution`
- **Regression command:** `npm test tests/playwright-real.test.ts`
- **Exit status:** `0`
- **Regression evidence:** `3/3 tests passed (2157ms), Live Screenshot captured at .ai-doc/screenshots/dashboard-playwright-live.png`
- **Verified at:** `2026-08-31 17:27`


---

### TDD-005 — Artillery Load Runner

- **Component:** `ArtilleryRunner`
- **Use case source:** `UC-WORK-02`
- **Acceptance criteria:**
  1. Memuat konfigurasi skenario beban Artillery.
  2. Mengkalkulasi latensi p50, p95, p99, throughput RPS, dan error count.
- **Current status:** `REFACTORED`

#### RED
- **Test file:** `tests/artillery-runner.test.ts`
- **Test name/target:** `ArtilleryRunner load test calculation tests`
- **Command:** `npm test tests/artillery-runner.test.ts`
- **Exit status:** `1`
- **Failure evidence:** `Error: Cannot find module '../src/lib/server/artillery-runner.js' imported from 'tests/artillery-runner.test.ts'`
- **Verified at:** `2026-08-31 14:12`

#### GREEN
- **Implementation file(s):** `src/lib/server/artillery-runner.ts`
- **Minimal change:** `Implement ArtilleryRunner and calculateQuantiles using nearest rank formula`
- **Command:** `npm test tests/artillery-runner.test.ts`
- **Exit status:** `0`
- **Passing evidence:** `✓ tests/artillery-runner.test.ts (3 tests) 5ms - 3 passed (3)`
- **Verified at:** `2026-08-31 14:12`

#### REFACTOR
- **Status:** `REFACTORED`
- **Changes:** `Robust handling of empty latency arrays and float formatting for summary metrics`
- **Regression command:** `npm test`
- **Exit status:** `0`
- **Regression evidence:** `16 tests passed (5 test files)`
- **Verified at:** `2026-08-31 14:12`

---

## 5. Blockers and Exceptions

| ID | Related Target | Type | Description | Decision / Owner | Status |
|---|---|---|---|---|---|
| — | — | — | Tidak ada blocker saat ini | — | `None` |

---

## 6. Change Log

| Date | Target | Phase | Change | Evidence / Reference |
|---|---|---|---|---|
| `2026-08-31` | Project-Wide | `Activation` | TDD Policy diaktifkan (`TDD: Enabled`) | `.ai-doc/constitution.md` |
| `2026-08-31` | `TDD-001` | `REFACTORED` | TaskScheduler selesai & verified | `tests/scheduler.test.ts` |
| `2026-08-31` | `TDD-002` | `REFACTORED` | SqliteHistoryRepository selesai & verified | `tests/storage.test.ts` |
| `2026-08-31` | `TDD-003` | `REFACTORED` | TelemetryStreamer selesai & verified | `tests/streamer.test.ts` |
| `2026-08-31` | `TDD-004` | `REFACTORED` | PlaywrightRunner selesai & verified | `tests/playwright-runner.test.ts` |
| `2026-08-31` | `TDD-005` | `REFACTORED` | ArtilleryRunner selesai & verified | `tests/artillery-runner.test.ts` |

---

## 7. Operating Rules

- Test ditulis sebelum production code untuk behavior baru.
- Status `RED` membutuhkan test yang gagal karena behavior belum ada, bukan karena typo/setup rusak.
- Status `GREEN` membutuhkan passing evidence setelah implementasi minimal.
- Status `REFACTORED` membutuhkan test terkait dan regression test tetap lulus.
- Update file ini dan `.ai-doc/3p.md` setelah setiap transisi bermakna.
