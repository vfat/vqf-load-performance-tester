# Dokumentasi Komponen dan Use Case: Lean Testing & Single Dashboard

## 1. Ringkasan

Dokumen ini memetakan seluruh komponen dan use case untuk **Lean Load Testing & Single Dashboard Platform**. Sistem ini memadukan **Single Web Dashboard Control** (Risograph Broadsheet UI) dengan engine pengujian Playwright E2E, Real HTTP Load Generator, Custom Scenarios Pipeline, dan database lokal SQLite.

---

## 2. Diagram Use Case Tergrup

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor "QA / Developer" as WebUser
actor "CI/CD Pipeline" as CIUser
actor "System Under Test (SUT)" as SUT

package "Dashboard Web UI (Risograph)" {
  usecase "Configure & Trigger Run" as UC_UI_01
  usecase "Emergency Abort Run" as UC_UI_02
  usecase "View Live Telemetry via SSE" as UC_UI_03
  usecase "Inspect Run History & Artifacts" as UC_UI_04
  usecase "Build Custom Scenarios & Presets" as UC_UI_05
}

package "Task Scheduler & Orchestrator" {
  usecase "Throttle Safe Concurrency" as UC_SCHED_01
  usecase "Dispatch In-Memory Tasks" as UC_SCHED_02
  usecase "Execute Custom Step Pipeline" as UC_ORCH_05
}

package "Test Workers" {
  usecase "Execute Playwright E2E" as UC_WORK_01
  usecase "Execute Real HTTP Load Test" as UC_WORK_02
  usecase "Emit Realtime Progress Events" as UC_WORK_03
  usecase "Execute Multi-Step Browser Actions" as UC_WORK_04
  usecase "Execute HTTP API Step Chaining" as UC_WORK_05
}

package "Persistence & Reporting" {
  usecase "Write Run Records to SQLite" as UC_DATA_01
  usecase "Stream SSE Metrics" as UC_DATA_02
  usecase "Generate Static HTML/JSON Report" as UC_DATA_03
}

' Interactions
WebUser --> UC_UI_01
WebUser --> UC_UI_02
WebUser --> UC_UI_03
WebUser --> UC_UI_04
WebUser --> UC_UI_05

CIUser --> UC_SCHED_01

UC_UI_01 ..> UC_SCHED_02 : <<trigger>>
UC_UI_02 ..> UC_SCHED_01 : <<abort>>
UC_UI_05 ..> UC_ORCH_05 : <<dispatch>>

UC_SCHED_02 ..> UC_WORK_01 : <<dispatch>>
UC_SCHED_02 ..> UC_WORK_02 : <<dispatch>>
UC_ORCH_05 ..> UC_WORK_04 : <<invoke>>
UC_ORCH_05 ..> UC_WORK_05 : <<invoke>>

UC_WORK_01 --> SUT : Browser interaction
UC_WORK_02 --> SUT : Real HTTP traffic
UC_WORK_04 --> SUT : DOM step interaction
UC_WORK_05 --> SUT : Chained HTTP request

UC_WORK_03 ..> UC_DATA_02 : <<stream>>
UC_WORK_03 ..> UC_DATA_01 : <<persist>>
UC_DATA_02 ..> UC_UI_03 : <<push to browser>>
UC_DATA_01 ..> UC_UI_04 : <<query>>
UC_DATA_01 ..> UC_DATA_03 : <<export>>

@enduml
```

---

## 3. Daftar Use Case per Komponen

### 3.1 Dashboard Web UI (Risograph Broadsheet)
**Status**: ✅ **Ada (Active)**  
**Design Reference**: [.ai-doc/DESIGN.md](file:///home/ubuntu/workspace/minilab/pentest/.ai-doc/DESIGN.md)

Deskripsi:
Antarmuka web interaktif single-page yang menyajikan panel kontrol trigger, konfigurasi VUs/Duration/Load Profile, tombol emergency abort, visualisasi ApexCharts 3-series realtime via SSE, tabel riwayat run dengan inspector modal, serta visual builder untuk custom scenarios.

Use case yang terverifikasi:
- ✅ `Configure & Trigger Run` (`UC-UI-01`, **Active**)
- ✅ `Emergency Abort Run` (`UC-UI-02`, **Active**)
- ✅ `View Live Telemetry via SSE` (`UC-UI-03`, **Active**)
- ✅ `Inspect Run History & Artifacts` (`UC-UI-04`, **Active**)
- ⏳ `Build Custom Scenarios & Presets` (`UC-UI-05`, **Planned**)

---

### 3.2 Task Scheduler & Test Orchestrator
**Status**: ✅ **Ada (Active)**  
**Spec Reference**: [.ai-doc/plan/component/SCD-01-Test-Orchestrator.md](file:///home/ubuntu/workspace/minilab/pentest/.ai-doc/plan/component/SCD-01-Test-Orchestrator.md)

Deskripsi:
Modul orkestrasi internal yang mengatur antrean eksekusi task in-memory, menerapkan batas aman concurrency (2–4 worker) agar VPS aman dari OOM, menangani sinyal abort instan, dan mengorkestrasi pipeline eksekusi multi-step skenario kustom.

Use case yang terverifikasi:
- ✅ `Throttle Safe Concurrency` (`UC-SCHED-01`, **Active**)
- ✅ `Dispatch In-Memory Tasks` (`UC-SCHED-02`, **Active**)
- ⏳ `Execute Custom Step Pipeline` (`UC-ORCH-05`, **Planned**)

---

### 3.3 Test Workers (Playwright + HTTP Load Generator)
**Status**: ✅ **Ada (Active)**  
**Spec References**: 
- [.ai-doc/plan/component/SCD-02-Playwright-Worker-Pool.md](file:///home/ubuntu/workspace/minilab/pentest/.ai-doc/plan/component/SCD-02-Playwright-Worker-Pool.md)
- [.ai-doc/plan/component/SCD-03-Load-Generator-Artillery.md](file:///home/ubuntu/workspace/minilab/pentest/.ai-doc/plan/component/SCD-03-Load-Generator-Artillery.md)

Deskripsi:
Worker eksekutor yang menjalankan skenario headless browser (Playwright Chromium) dengan isolasi context dan pembangkit beban traffic HTTP nyata (`HttpLoadWorker`) dengan Virtual Users (1–100), durasi, dan load profiles (`fixed`, `ramp-up`, `spike`).

Use case yang terverifikasi:
- ✅ `Execute Playwright E2E` (`UC-WORK-01`, **Active**)
- ✅ `Execute Real HTTP Load Test` (`UC-WORK-02`, **Active**)
- ✅ `Emit Realtime Progress Events` (`UC-WORK-03`, **Active**)
- ⏳ `Execute Multi-Step Browser Actions` (`UC-WORK-04`, **Planned**)
- ⏳ `Execute HTTP API Step Chaining` (`UC-WORK-05`, **Planned**)

---

### 3.4 Persistence & Reporting (SQLite + SSE)
**Status**: ✅ **Ada (Active)**  
**Database Reference**: [.ai-doc/desain-database-document/ERD-overview.md](file:///home/ubuntu/workspace/minilab/pentest/.ai-doc/desain-database-document/ERD-overview.md)

Deskripsi:
Layanan backend yang mengalirkan metrik realtime via SSE endpoint (`/api/metrics/stream`), menyimpan riwayat run dan detail eksekusi ke SQLite WAL mode (`history.db`), dan men-generate file laporan ringkasan.

Use case yang terverifikasi:
- ✅ `Write Run Records to SQLite` (`UC-DATA-01`, **Active**)
- ✅ `Stream SSE Metrics` (`UC-DATA-02`, **Active**)
- ✅ `Generate Static HTML/JSON Report` (`UC-DATA-03`, **Active**)
