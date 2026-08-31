# Daftar Endpoint

## 1. Ringkasan

Dokumen ini memuat inventaris rancangan REST API control plane untuk **Scalable Load Testing & Playwright Platform**. API ini digunakan oleh client (CLI, Developer Webhook, CI/CD) untuk mengontrol eksekusi pengujian, mengecek status progres, membatalkan test run, dan membaca metrik real-time.

---

## 2. Daftar Endpoint per Komponen

### Komponen Test Orchestrator

| Method | Endpoint | Description | Status |
|---|---|---|---|
| POST | `/api/v1/test-runs` | Submit konfigurasi pengujian baru (Playwright/Artillery) dan trigger eksekusi. | Published |
| GET | `/api/v1/test-runs` | Mengambil daftar riwayat test run dengan pagination dan filter status. | Published |
| GET | `/api/v1/test-runs/{id}` | Mengambil detail status dan metrik progres dari sesi test run tertentu. | Published |
| POST | `/api/v1/test-runs/{id}/cancel` | Membatalkan (*abort/terminate*) test run yang sedang berlangsung. | Published |

### Komponen Result & Metrics Collector

| Method | Endpoint | Description | Status |
|---|---|---|---|
| GET | `/api/v1/test-runs/{id}/results` | Mengambil hasil detail test case (passed/failed assertions, latency summary). | Published |
| GET | `/api/v1/test-runs/{id}/logs` | Mengambil stream log dan error stack traces per worker. | Draft |
| GET | `/metrics` | Endpoint scraping Prometheus untuk metrik sistem, latency, dan throughput. | Published |

---

## 3. Catatan Validitas

- Seluruh endpoint di atas dirancang dengan autentikasi API Key / Bearer token untuk lingkungan staging/production.
- Format response menggunakan standar JSON dengan envelope terstruktur (`status`, `data`, `error`).

---

## 4. Asumsi, Risiko, dan Hal yang Perlu Dikonfirmasi

| Item | Tipe | Catatan |
|---|---|---|
| Rate Limiting | Asumsi | API control plane menerapkan rate limiting untuk mencegah spam trigger test run. |
| Streaming Response | Perlu Dikonfirmasi | Apakah progress monitoring menggunakan Polling REST API biasa atau Server-Sent Events (SSE) / WebSocket? |
