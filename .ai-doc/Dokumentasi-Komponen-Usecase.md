# Dokumentasi Komponen dan Use Case: Lean Testing & Two-Deck Dashboard

## 1. Ringkasan

Dokumen ini memetakan seluruh komponen dan use case untuk **Lean Load Testing & Dual-Deck Dashboard Platform**. Sistem memisahkan secara tegas dua ranah pengujian ke dalam antarmuka khusus:
1. **🎭 Playwright E2E Studio Deck:** Pengujian fungsional interaksi browser DOM nyata, form-filling, assertion teks visual, dan *Live Process Viewport Frame*.
2. **⚡ REST API Load Deck (Artillery Engine):** Otomatisasi alur REST API berantai (*API Chaining*), penembakan beban masif dengan Virtual Users (1–100), dan visualisasi metrik performa (RPS, Latensi p50..p99, Error Rate).

---

## 2. Diagram Use Case Tergrup

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor "QA / Developer" as WebUser
actor "CI/CD Pipeline" as CIUser
actor "System Under Test (SUT)" as SUT

package "Deck 1: Playwright E2E Studio" {
  usecase "Build Browser DOM Steps" as UC_E2E_01
  usecase "Trigger E2E Headless Run" as UC_E2E_02
  usecase "View Live Viewport Frame" as UC_E2E_03
  usecase "Inspect Step Screenshots" as UC_E2E_04
}

package "Deck 2: REST API Load Deck" {
  usecase "Configure API Chaining Steps" as UC_API_01
  usecase "Set Virtual Users & Profile" as UC_API_02
  usecase "Trigger HTTP Load Run" as UC_API_03
  usecase "Stream Live Telemetry (ApexCharts)" as UC_API_04
  usecase "View Final Summary Metrics" as UC_API_05
}

package "Task Scheduler & Control Plane" {
  usecase "Throttle Safe Concurrency" as UC_SCHED_01
  usecase "Dispatch E2E Task" as UC_SCHED_02
  usecase "Dispatch API Load Task" as UC_SCHED_03
  usecase "Emergency Abort Signal" as UC_SCHED_04
}

package "Workers & Persistence" {
  usecase "Playwright Browser Worker" as UC_WORK_PW
  usecase "HTTP Load Worker" as UC_WORK_HTTP
  usecase "Persist Records to SQLite" as UC_DATA_01
  usecase "Stream Realtime SSE Events" as UC_DATA_02
}

' Interactions Deck 1
WebUser --> UC_E2E_01
WebUser --> UC_E2E_02
WebUser --> UC_E2E_03
WebUser --> UC_E2E_04

' Interactions Deck 2
WebUser --> UC_API_01
WebUser --> UC_API_02
WebUser --> UC_API_03
WebUser --> UC_API_04
WebUser --> UC_API_05

CIUser --> UC_SCHED_01

' Trigger to Schedulers
UC_E2E_02 ..> UC_SCHED_02 : <<trigger>>
UC_API_03 ..> UC_SCHED_03 : <<trigger>>

UC_SCHED_02 ..> UC_WORK_PW : <<execute>>
UC_SCHED_03 ..> UC_WORK_HTTP : <<execute>>

UC_WORK_PW --> SUT : DOM Actions (Click/Fill/Wait)
UC_WORK_HTTP --> SUT : Concurrent HTTP Traffic

UC_WORK_PW ..> UC_DATA_01 : <<save screenshot & step log>>
UC_WORK_HTTP ..> UC_DATA_02 : <<broadcast per-tick SSE>>
UC_WORK_HTTP ..> UC_DATA_01 : <<save summary metrics>>

UC_DATA_02 ..> UC_API_04 : <<push to ApexCharts>>
UC_DATA_01 ..> UC_E2E_04 : <<render screenshot gallery>>

@enduml
```

---

## 3. Daftar Use Case per Komponen

### 3.1 Deck 1: Playwright E2E Studio (Halaman Browser Automation)
**Status**: ✅ **Active / Planned Enhancements**  
**Design Reference**: [.ai-doc/DESIGN.md](file:///home/ubuntu/workspace/minilab/pentest/.ai-doc/DESIGN.md)

Deskripsi:
Halaman terdedikasi untuk perancangan dan eksekusi pengujian visual browser Playwright. Dilengkapi antarmuka step builder (`GOTO`, `CLICK`, `FILL`, `WAIT`, `ASSERT_TEXT`, `SCREENSHOT`), *Interactive Live Viewport Frame*, dan *Screenshot Evidence Gallery*.

Use case terverifikasi:
- ⏳ `Build Browser DOM Steps` (`UC-E2E-01`, **Planned**)
- ✅ `Trigger E2E Headless Run` (`UC-E2E-02`, **Active**)
- ⏳ `View Live Viewport Frame` (`UC-E2E-03`, **Planned**)
- ✅ `Inspect Step Screenshots` (`UC-E2E-04`, **Active**)

---

### 3.2 Deck 2: REST API Load Deck (Halaman Performance & API Chaining)
**Status**: ✅ **Active / Implemented**  
**Spec Reference**: [.ai-doc/plan/component/SCD-03-Load-Generator-Artillery.md](file:///home/ubuntu/workspace/minilab/pentest/.ai-doc/plan/component/SCD-03-Load-Generator-Artillery.md)

Deskripsi:
Halaman terdedikasi untuk otomatisasi REST API berantai (*API Chaining*) dan pengujian beban traffic tinggi. Dilengkapi builder konfigurasi endpoint (Method, Headers, Body, Token Extraction `{{var}}`), slider Virtual Users (1–100), grafik ApexCharts multi-series live stream, dan panel ringkasan 12 metrik quantile (p50..p99).

Use case terverifikasi:
- ⏳ `Configure API Chaining Steps` (`UC-API-01`, **Planned**)
- ✅ `Set Virtual Users & Profile` (`UC-API-02`, **Active**)
- ✅ `Trigger HTTP Load Run` (`UC-API-03`, **Active**)
- ✅ `Stream Live Telemetry (ApexCharts)` (`UC-API-04`, **Active**)
- ✅ `View Final Summary Metrics` (`UC-API-05`, **Active**)

---

### 3.3 Task Scheduler & Control Plane
**Status**: ✅ **Active / Implemented**  
**Spec Reference**: [.ai-doc/plan/component/SCD-01-Test-Orchestrator.md](file:///home/ubuntu/workspace/minilab/pentest/.ai-doc/plan/component/SCD-01-Test-Orchestrator.md)

Deskripsi:
Pengatur alur antrean tugas in-memory dengan throttle concurrency (2–4 worker) dan sinyal emergency abort instan untuk kedua deck.

Use case terverifikasi:
- ✅ `Throttle Safe Concurrency` (`UC-SCHED-01`, **Active**)
- ✅ `Dispatch E2E Task` (`UC-SCHED-02`, **Active**)
- ✅ `Dispatch API Load Task` (`UC-SCHED-03`, **Active**)
- ✅ `Emergency Abort Signal` (`UC-SCHED-04`, **Active**)

---

### 3.4 Persistence & Telemetry Streaming
**Status**: ✅ **Active / Implemented**  
**Database Reference**: [.ai-doc/desain-database-document/ERD-overview.md](file:///home/ubuntu/workspace/minilab/pentest/.ai-doc/desain-database-document/ERD-overview.md)

Deskripsi:
Layanan backend yang mengalirkan metrik realtime via SSE endpoint (`/api/metrics/stream`), menyimpan riwayat ke SQLite WAL mode (`history.db`), dan melayani binary screenshot image.

Use case terverifikasi:
- ✅ `Write Run Records to SQLite` (`UC-DATA-01`, **Active**)
- ✅ `Stream SSE Metrics` (`UC-DATA-02`, **Active**)
