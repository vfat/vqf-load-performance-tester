# FEAT: Real HTTP Load Testing Engine

> **Status:** `PLANNED` — Dokumentasi sebelum implementasi  
> **Author:** AI (diminta user sebelum coding)  
> **Date:** 2026-08-31  
> **References:** Postman Performance Testing, k6, Artillery.io  

---

## 1. Latar Belakang & Motivasi

### Kondisi Saat Ini (As-Is)

Modul `ArtilleryRunner` saat ini **bukan** load tester nyata. Ia hanya:
- Menerima **array `responses` yang sudah di-hardcode** (`simulatedResponses`).
- Menghitung statistik kuantil (p50/p90/p95/p99) dari data statis tersebut.
- **Tidak menembakkan request HTTP** ke server target sama sekali.

```typescript
// engine.ts — baris 178-189 (kondisi saat ini)
const simulatedResponses: LoadResponseItem[] = options.loadConfig?.simulatedResponses ?? [
  { statusCode: 200, latencyMs: 22 },
  { statusCode: 200, latencyMs: 28 },
  // ← Data statis, bukan request nyata
];
loadSummary = await this.artilleryRunner.aggregateResults({ ... });
```

Artinya:
- Grafik **"02. Live Telemetry Stream (SSE)"** memplot data fiktif.
- Metrik **RPS, p95 Latency** pada dashboard hanyalah kalkulasi dari angka simulasi.
- **Tidak ada real HTTP traffic** yang dikirim ke Target URL.

### Kondisi Target (To-Be)

Membangun **Real HTTP Load Testing Engine** yang benar-benar mengirim request HTTP ke target URL secara nyata — setara fungsionalitas inti Postman Performance Testing.

---

## 2. Fitur & Konfigurasi Input

### 2.1 Parameter dari Dashboard UI

| Parameter | Deskripsi | Default | Min / Max |
| :--- | :--- | :--- | :--- |
| **Virtual Users (VUs)** | Jumlah koneksi HTTP konkuren yang aktif menembak request secara paralel. | `10` | 1 – 100 |
| **Test Duration (detik)** | Durasi total pengujian. Semua VU akan terus mengulang request selama rentang waktu ini. | `30` | 5 – 300 |
| **Load Profile** | Pola distribusi VU sepanjang durasi tes. | `fixed` | `fixed` / `ramp-up` / `spike` |
| **Target URL** | URL endpoint yang dites (sudah ada di form saat ini). | — | Required |
| **HTTP Method** | Method request. | `GET` | `GET` / `POST` / `PUT` / `DELETE` |

### 2.2 Definisi Load Profile

| Profile | Perilaku |
| :--- | :--- |
| **Fixed** | Semua VU langsung aktif sejak detik 0 hingga akhir durasi. Beban konstan. |
| **Ramp Up** | VU dinaikkan bertahap dari 1 → target VU selama durasi. Berguna untuk menemukan titik saturasi (*breaking point*). |
| **Spike** | Beban rendah di awal, melonjak drastis ke target VU di tengah, lalu turun kembali. Mensimulasikan flash traffic. |

### 2.3 Batasan Keamanan VPS

Karena platform berjalan di VPS (resource terbatas), diterapkan *safety guard*:
- **Max concurrent connections:** 100 VUs.
- **Max durasi tes:** 300 detik (5 menit).
- **Request timeout per VU:** 10 detik (untuk menghindari connection hang indefinitely).
- **Abort otomatis** jika error rate > 90% selama 10 detik berturut-turut (mencegah DDoS ke target).

---

## 3. Arsitektur Internal

### 3.1 Alur Eksekusi

```
┌──────────────────────────────────────────────────────────────────┐
│ Dashboard UI (Browser)                                          │
│                                                                  │
│  [VUs: 50] [Duration: 30s] [Profile: ramp-up] [▶ START]        │
│                    │                                             │
│                    ▼ POST /api/runs                              │
└──────────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ TestExecutionEngine                                              │
│                                                                  │
│  1. Buat record di SQLite (status: RUNNING)                     │
│  2. Spawn HttpLoadWorker(targetUrl, vus, duration, profile)     │
│  3. Parallel: jalankan Playwright screenshot                    │
│                                                                  │
│  HttpLoadWorker:                                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Loop setiap 1 detik selama durasi:                       │  │
│  │                                                            │  │
│  │  1. Hitung activeVUs berdasarkan loadProfile + elapsed     │  │
│  │  2. Spawn `activeVUs` fetch() secara paralel               │  │
│  │  3. Kumpulkan: statusCode, latencyMs per response         │  │
│  │  4. Hitung metrik interval:                               │  │
│  │     - RPS = totalResponses / 1 (per detik)                │  │
│  │     - p50, p90, p95, p99 dari latencies interval          │  │
│  │     - Error count (status >= 400 atau timeout)            │  │
│  │  5. Broadcast via SSE: event 'telemetry'                  │  │
│  │  6. Simpan metric_point ke SQLite                         │  │
│  │                                                            │  │
│  │  Setelah durasi habis:                                    │  │
│  │  7. Aggregate seluruh responses → final summary           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  3. Update run record (COMPLETED / FAILED)                      │
│  4. Broadcast SSE 'run_completed' + loadSummary                 │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Modul yang Perlu Diubah / Dibuat

| File | Aksi | Deskripsi |
| :--- | :--- | :--- |
| `src/lib/server/http-load-worker.ts` | **[NEW]** | Worker inti yang menjalankan real HTTP requests dengan VUs dan load profiles. |
| `src/lib/server/artillery-runner.ts` | **[MODIFY]** | Refaktor `aggregateResults` agar bisa menerima response nyata dari worker (bukan hanya simulasi). Fungsi `calculateQuantiles` tetap dipakai. |
| `src/lib/server/engine.ts` | **[MODIFY]** | Integrasikan `HttpLoadWorker` untuk mode `ARTILLERY_ONLY` dan `HYBRID`. Hapus hardcoded `simulatedResponses`. |
| `src/server.ts` | **[MODIFY]** | Tambah field form UI: VUs slider (1–100), Duration input, Load Profile dropdown. Kirim parameter baru via POST `/api/runs`. |
| `src/lib/server/storage.ts` | **[MODIFY]** | Tambah kolom `virtual_users`, `duration_seconds`, `load_profile` ke tabel `test_runs`. |
| `tests/http-load-worker.test.ts` | **[NEW]** | Unit test TDD untuk HttpLoadWorker. |
| `tests/engine.test.ts` | **[MODIFY]** | Update integration test dengan real load worker. |

---

## 4. Metrik Output (Performance Report)

### 4.1 Metrik Realtime (SSE per detik)

Setiap detik selama tes berjalan, SSE event `telemetry` akan membawa:

```json
{
  "testRunId": "abc-123",
  "tick": 15,
  "activeVUs": 42,
  "requestsThisTick": 42,
  "currentRps": 42.0,
  "p50LatencyMs": 28.5,
  "p95LatencyMs": 95.2,
  "p99LatencyMs": 180.0,
  "errorsThisTick": 1,
  "errorRatePercent": 2.38,
  "totalRequestsSoFar": 630,
  "totalErrorsSoFar": 8
}
```

### 4.2 Metrik Final Summary (setelah tes selesai)

| Metrik | Deskripsi |
| :--- | :--- |
| **Total Requests** | Akumulasi seluruh request HTTP yang dikirim. |
| **Successful Requests** | Request dengan status 2xx/3xx. |
| **Failed Requests** | Request dengan status 4xx/5xx atau timeout. |
| **Request/s (RPS)** | Throughput rata-rata: `totalRequests / durationSeconds`. |
| **Error Rate (%)** | `(failedRequests / totalRequests) × 100`. |
| **Avg Response Time (ms)** | Rata-rata latensi seluruh request. |
| **Min / Max Response Time (ms)** | Waktu respon tercepat dan terlambat. |
| **p50 (Median)** | 50% request di bawah nilai ini. |
| **p90** | 90% request di bawah nilai ini. |
| **p95** | 95% request di bawah nilai ini. Standar SLA industri. |
| **p99** | 99% request di bawah nilai ini. Tail latency. |
| **Virtual Users** | Konfigurasi VU yang dipakai. |
| **Duration** | Durasi aktual tes. |
| **Load Profile** | Profile yang digunakan (fixed/ramp-up/spike). |

### 4.3 Data Grafik Time-Series (untuk ApexCharts)

Grafik **"02. Live Telemetry Stream (SSE)"** akan menampilkan 3 series:

| Series | Warna | Sumbu Y |
| :--- | :--- | :--- |
| **RPS (Throughput)** | `#0077C0` (Biru) | Kiri |
| **p95 Latency (ms)** | `#FF4D6D` (Merah) | Kanan |
| **Active VUs** | `#4DFFBE` (Hijau) | Kiri (secondary) |

---

## 5. Perubahan UI Dashboard

### 5.1 Form Control Bar (Section 01)

Field baru yang ditambahkan:

```
┌───────────────────────────────────────────────────────────────┐
│ 01. TEST EXECUTION CONTROL BAR                                │
│                                                               │
│ Suite Name: [________________]  Test Mode: [HYBRID ▼]        │
│ Target URL: [________________]  HTTP Method: [GET ▼]         │
│                                                               │
│ Virtual Users (VUs): ━━━━━━━━━━━● 50     (1 – 100)          │
│ Test Duration:       [30] detik                (5 – 300)      │
│ Load Profile:        [Fixed ▼]   (Fixed / Ramp Up / Spike)   │
│                                                               │
│ [▶ START RUN]                    [⏹ ABORT]                   │
└───────────────────────────────────────────────────────────────┘
```

### 5.2 Stats Cards (menambah metrik)

Stats cards tambahan:
- **Total Requests** (akumulatif selama tes)
- **Error Rate (%)** 
- **Avg Response Time (ms)**

### 5.3 Final Summary Panel

Setelah tes selesai, tampilkan panel summary di bawah chart:

```
┌───────────────────────────────────────────────────────────────┐
│ LOAD TEST SUMMARY                                             │
│                                                               │
│  Total Requests: 1,500    RPS: 50.0    Error Rate: 0.67%     │
│  Avg: 45ms   Min: 12ms   Max: 890ms                         │
│  p50: 32ms   p90: 78ms   p95: 120ms   p99: 450ms            │
│  VUs: 50     Duration: 30s     Profile: FIXED                │
└───────────────────────────────────────────────────────────────┘
```

---

## 6. HttpLoadWorker — Desain Detail

### 6.1 Interface

```typescript
export interface HttpLoadConfig {
  targetUrl: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
  virtualUsers: number;         // 1–100
  durationSeconds: number;      // 5–300
  loadProfile: 'fixed' | 'ramp-up' | 'spike';
  requestTimeoutMs?: number;    // default 10000
  abortSignal?: AbortSignal;
}

export interface TickMetrics {
  tick: number;
  activeVUs: number;
  requestsThisTick: number;
  currentRps: number;
  latencies: number[];
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorsThisTick: number;
  errorRatePercent: number;
  totalRequestsSoFar: number;
  totalErrorsSoFar: number;
}

export interface LoadTestFinalSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rps: number;
  errorRatePercent: number;
  avgLatencyMs: number;
  latency: LatencyQuantiles;  // reuse dari artillery-runner
  virtualUsers: number;
  durationSeconds: number;
  loadProfile: string;
  tickHistory: TickMetrics[];
}
```

### 6.2 Algoritma VU Scaling per Profile

```typescript
function getActiveVUs(profile: string, targetVUs: number, elapsed: number, total: number): number {
  switch (profile) {
    case 'fixed':
      return targetVUs;
    
    case 'ramp-up':
      // Linear ramp: 1 → targetVUs over duration
      return Math.max(1, Math.round((elapsed / total) * targetVUs));
    
    case 'spike':
      // Low → spike at 40-60% → low
      const ratio = elapsed / total;
      if (ratio < 0.3) return Math.max(1, Math.round(targetVUs * 0.1));
      if (ratio < 0.7) return targetVUs;
      return Math.max(1, Math.round(targetVUs * 0.1));
    
    default:
      return targetVUs;
  }
}
```

### 6.3 Core Loop (pseudo-code)

```typescript
async runLoadTest(config: HttpLoadConfig, onTick: (m: TickMetrics) => void): Promise<LoadTestFinalSummary> {
  const allLatencies: number[] = [];
  let totalErrors = 0;
  let totalRequests = 0;
  const tickHistory: TickMetrics[] = [];

  for (let tick = 1; tick <= config.durationSeconds; tick++) {
    if (config.abortSignal?.aborted) break;
    
    const activeVUs = getActiveVUs(config.loadProfile, config.virtualUsers, tick, config.durationSeconds);
    
    // Fire `activeVUs` parallel HTTP requests
    const promises = Array.from({ length: activeVUs }, () =>
      timedFetch(config.targetUrl, config.httpMethod, config.requestTimeoutMs)
    );
    
    const results = await Promise.allSettled(promises);
    
    // Collect metrics for this tick
    const tickLatencies = [];
    let tickErrors = 0;
    
    for (const r of results) {
      totalRequests++;
      if (r.status === 'fulfilled') {
        tickLatencies.push(r.value.latencyMs);
        allLatencies.push(r.value.latencyMs);
        if (r.value.statusCode >= 400) { tickErrors++; totalErrors++; }
      } else {
        tickErrors++;
        totalErrors++;
      }
    }
    
    const tickMetrics = calculateTickMetrics(tick, activeVUs, tickLatencies, tickErrors, totalRequests, totalErrors);
    tickHistory.push(tickMetrics);
    onTick(tickMetrics);
    
    // Wait remainder of 1-second interval
    await sleep(remainingMs);
  }
  
  return buildFinalSummary(allLatencies, totalRequests, totalErrors, config, tickHistory);
}
```

---

## 7. Alur TDD

Mengikuti kebijakan TDD yang sudah ditetapkan di [constitution.md](file:///home/ubuntu/workspace/minilab/pentest/.ai-doc/constitution.md):

| TDD ID | Komponen | Test File | Skenario Test |
| :--- | :--- | :--- | :--- |
| `TDD-006` | HttpLoadWorker | `tests/http-load-worker.test.ts` | 1. Fixed profile mengembalikan VU konstan<br>2. Ramp-up profile menaikkan VU bertahap<br>3. Spike profile melonjak di tengah<br>4. Abort signal menghentikan loop<br>5. Timeout handling untuk request yang hang<br>6. Metrik per-tick akurat (RPS, latency, error rate) |
| `TDD-005b` | ArtilleryRunner (refactor) | `tests/artillery-runner.test.ts` | Regression: `calculateQuantiles` tetap lulus |
| `TDD-INT-02` | Engine Integration | `tests/engine.test.ts` | Real HTTP load → SSE telemetry → SQLite metrics |

---

## 8. Perubahan Skema Database

### Tabel `test_runs` — kolom baru:

```sql
ALTER TABLE test_runs ADD COLUMN virtual_users INTEGER DEFAULT 1;
ALTER TABLE test_runs ADD COLUMN duration_seconds INTEGER DEFAULT 30;
ALTER TABLE test_runs ADD COLUMN load_profile TEXT DEFAULT 'fixed';
ALTER TABLE test_runs ADD COLUMN http_method TEXT DEFAULT 'GET';
ALTER TABLE test_runs ADD COLUMN avg_latency_ms REAL DEFAULT 0;
ALTER TABLE test_runs ADD COLUMN total_requests INTEGER DEFAULT 0;
ALTER TABLE test_runs ADD COLUMN error_rate_percent REAL DEFAULT 0;
```

---

## 9. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
| :--- | :--- | :--- |
| VPS kehabisan resource saat 100 VU | Server dashboard hang / OOM | Cap hard limit 100 VU, abort otomatis jika error rate > 90% selama 10 detik |
| Target server rate-limit / ban IP | Request mulai gagal massal | Deteksi 429 status, kurangi VU secara otomatis, tampilkan warning di dashboard |
| Test duration terlalu panjang | Memori akumulasi latency terlalu besar | Cap 300 detik, gunakan circular buffer untuk tickHistory jika > 300 ticks |
| Abort tidak responsif | VU tetap menembak setelah abort | AbortController propagated ke setiap fetch(), hard kill setelah 2 detik |

---

## 10. Mapping ke Postman Performance Testing

| Postman Feature | Implementasi Kita | Catatan |
| :--- | :--- | :--- |
| Virtual Users slider (max 100) | `virtualUsers` slider 1–100 | Setara |
| Test Duration dropdown | `durationSeconds` input 5–300 | Lebih fleksibel (angka bebas vs dropdown) |
| Load Profile (Fixed / Ramp Up / Spike) | `loadProfile` dropdown | Setara |
| Realtime chart (RPS + Latency + VUs) | ApexCharts SSE live | Setara |
| Summary table (Avg, Min, Max, p90, p95, p99) | `LoadTestFinalSummary` panel | Setara + tambahan p50 |
| Error Rate visualization | Error rate stat card + chart | Setara |
| Request breakdown per endpoint | ❌ Belum (single URL hit saat ini) | Future: multi-endpoint collection |
