# FEAT: Custom Scenarios Engine & Visual Step Builder

> **Status:** `PLANNED` — Dokumentasi Desain Fitur Skenario Kustom  
> **Author:** Tim AI Documentor (+Melon 🏗️, +Sultan ⚙️, +Nindi 🔬, +Bernadya ✨, +Lugi 📊)  
> **Date:** 2026-08-31  
> **MoM Reference:** [.ai-doc/brainstorming/mom-2026-08-31-custom-scenarios.md](file:///home/ubuntu/workspace/minilab/pentest/.ai-doc/brainstorming/mom-2026-08-31-custom-scenarios.md)  

---

## 1. Latar Belakang & Motivasi

Sebelumnya, platform pengujian mengeksekusi pengetesan berbasis **Single Target URL Direct Hit** (`GET [targetUrl]`). Ketika pengujian membutuhkan alur yang lebih realistis (seperti login dengan token, form submission bertahap, atau multi-endpoint API flow), pengguna membutuhkan fitur **Custom Scenarios**.

Fitur ini menyediakan:
1. **Multi-Step Execution Pipeline**: Menjalankan rangkaian langkah pengujian secara berurutan (*sequential*).
2. **Context & Variable Chaining**: Mengekstrak nilai dari response step sebelumnya (seperti auth token atau ID) dan menyuntikkannya ke step berikutnya via `{{varName}}`.
3. **Dual Execution Engine Support**:
   - **HTTP API Chaining Mode**: Sangat cepat untuk load testing dan API validation.
   - **Browser DOM Action Mode (Playwright)**: Navigasi, input teks, klik tombol, wait selector, dan screenshot per-step.
4. **Visual Scenario Builder UI**: Antarmuka visual no-code di dashboard web dengan preset template siap pakai serta tab declarative JSON.

---

## 2. Struktur Data & Schema Skenario

### 2.1 Definisi Step (`CustomScenarioStep`)

```typescript
export type StepActionType = 
  // HTTP Actions
  | 'HTTP_REQUEST'
  // Browser Actions
  | 'GOTO'
  | 'CLICK'
  | 'FILL'
  | 'WAIT_SELECTOR'
  | 'ASSERT_TEXT'
  | 'SCREENSHOT';

export interface CustomScenarioStep {
  id: string;
  name: string;
  action: StepActionType;
  
  // HTTP Configuration
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  
  // Browser Configuration
  selector?: string;
  value?: string;
  timeoutMs?: number;

  // Extraction & Assertion
  extractVars?: Record<string, string>; // e.g. { "authToken": "body.token", "userId": "body.user.id" }
  assertStatus?: number;               // e.g. 200, 201
  assertSelectorText?: string;         // e.g. "Welcome, Admin!"
  assertJsonPath?: {
    path: string;                      // e.g. "body.status"
    expected: any;                     // e.g. "success"
  };
}

export interface CustomScenarioDefinition {
  id: string;
  name: string;
  description?: string;
  type: 'HTTP_CHAIN' | 'BROWSER_E2E';
  steps: CustomScenarioStep[];
}
```

---

## 3. Variable Extraction & Interpolation Engine

Setiap eksekusi skenario memelihara sebuah **`ExecutionContext`** berupa `Record<string, any>`.

### 3.1 Sintaks Template Interpolation: `{{variableName}}`
Sebelum sebuah step dieksekusi, seluruh field string (`url`, `headers`, `body`, `value`) diproses dengan fungsi interpolasi:
```typescript
function interpolate(template: string, context: Record<string, any>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => {
    return context[key] !== undefined ? String(context[key]) : `{{${key}}}`;
  });
}
```

### 3.2 Contoh Alur Chaining Variabel:

```text
┌────────────────────────────────────────────────────────────┐
│ Step 1: POST https://api.target.com/auth/login             │
│ Body: { "username": "admin", "password": "secret" }        │
│ Extract: { "authToken": "body.token" }                     │
└─────────────────────────────┬──────────────────────────────┘
                              │ Context: { authToken: "eyJhbGciOi..." }
                              ▼
┌────────────────────────────────────────────────────────────┐
│ Step 2: GET https://api.target.com/api/v1/profile          │
│ Header: Authorization: Bearer {{authToken}}                │
│ AssertStatus: 200                                          │
└─────────────────────────────┬──────────────────────────────┘
                              │ Context: { authToken: "...", profileId: "982" }
                              ▼
┌────────────────────────────────────────────────────────────┐
│ Step 3: POST https://api.target.com/api/v1/checkout        │
│ Body: { "userId": "{{profileId}}", "amount": 100 }         │
│ AssertStatus: 201                                          │
└────────────────────────────────────────────────────────────┘
```

---

## 4. Spesifikasi Aksi Step (Step Actions)

### 4.1 HTTP API Steps
| Aksi | Parameter | Deskripsi |
| :--- | :--- | :--- |
| `HTTP_REQUEST` | `url`, `method`, `headers`, `body`, `assertStatus`, `extractVars` | Menembakkan request HTTP, mencatat waktu respon, melakukan ekstraksi variabel JSON, dan memvalidasi HTTP status code. |

### 4.2 Browser Actions (Playwright Headless)
| Aksi | Parameter | Deskripsi |
| :--- | :--- | :--- |
| `GOTO` | `url` | Membuka URL target dengan strategi `networkidle` + buffer hidrasi. |
| `CLICK` | `selector` | Menunggu elemen muncul lalu mengeksekusi klik DOM (`page.click(selector)`). |
| `FILL` | `selector`, `value` | Mengisi input field form atau textarea (`page.fill(selector, value)`). |
| `WAIT_SELECTOR`| `selector`, `timeoutMs` | Menunggu keberadaan elemen di DOM (`page.waitForSelector(selector)`). |
| `ASSERT_TEXT` | `selector`, `assertSelectorText` | Memvalidasi teks di dalam elemen cocok dengan ekspektasi. |
| `SCREENSHOT` | `name` | Mengambil tangkapan layar spesifik pada tahapan ini dan menyimpannya ke `./reports/screenshots/`. |

---

## 5. Rancangan UI/UX di Risograph Broadsheet Dashboard

Pada Seksi **01. Test Execution Control Bar**, ditambahkan toggle mode:
`[🔘 Quick URL Hit] | [🔘 Custom Scenario Builder]`

Saat **Custom Scenario Builder** dipilih, antarmuka memperluas panel:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 01B. CUSTOM SCENARIO BUILDER                                            │
│ [Preset Templates ▼]  [+ Add HTTP Step]  [+ Add Browser Step]  [📋 JSON]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─ Step 1: HTTP_REQUEST ──────────────────────────────────────────────┐ │
│ │ Name: [Auth Login]    Method: [POST ▼]                              │ │
│ │ URL:  [https://httpbin.org/post]                                    │ │
│ │ Body: [{"user": "qa_tester", "pass": "secret"}]                    │ │
│ │ Extract: [authToken = body.json.user]  Assert Status: [200]         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─ Step 2: HTTP_REQUEST ──────────────────────────────────────────────┐ │
│ │ Name: [Get Protected Resource]   Method: [GET ▼]                    │ │
│ │ URL:  [https://httpbin.org/headers]                                 │ │
│ │ Headers: [Authorization: Bearer {{authToken}}]                      │ │
│ │ Assert Status: [200]                                                │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [▶ START SCENARIO RUN]                                [⏹ ABORT]        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Preset Templates Siap Pakai:
1. **Preset 1: REST API Auth & Data Inspection Chain** (HTTP Flow)
2. **Preset 2: Web Form Login & Dashboard Screenshot** (Playwright Browser Flow)
3. **Preset 3: Microservice Health Check Flow** (Multi-endpoint Ping & Status Assertions)

---

## 6. Arsitektur Komponen & Eksekusi

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Svelte / Dashboard Web UI                                               │
│                                                                         │
│   Scenario Builder / Preset Selector / JSON Input                       │
│                        │                                                │
│                        ▼ POST /api/runs (payload: customScenario)       │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ TestExecutionEngine                                                     │
│                                                                         │
│   1. storage.createRun(...) dengan flag customScenario                  │
│   2. ScenarioStepExecutor.execute(scenario, runId)                      │
│                                                                         │
│   ScenarioStepExecutor:                                                 │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │ Loop for each step in scenario.steps:                            │  │
│   │                                                                  │  │
│   │ 1. Interpolate {{variables}} dari context                        │  │
│   │ 2. Execute step action (HttpFetcher / Playwright Context)        │  │
│   │ 3. Extract variables ke context                                  │  │
│   │ 4. Run assertions (Status code / text match)                     │  │
│   │ 5. Save step result to SQLite test_executions                    │  │
│   │ 6. Broadcast SSE 'step_completed' & 'scenario_completed'         │  │
│   │ 7. If failed & stopOnError → Break & capture fail screenshot     │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│   3. storage.updateRun(...) status COMPLETED / FAILED                   │
│   4. Broadcast SSE 'run_completed'                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Skema Database SQLite (`test_executions` & `test_runs`)

### Kolom Baru di `test_runs`:
* `scenario_payload`: Teks JSON yang menyimpan definisi lengkap skenario yang dijalankan.

### Kolom Baru di `test_executions`:
* `step_index`: Urutan langkah (`INTEGER`).
* `action_type`: Tipe aksi (`HTTP_REQUEST`, `CLICK`, dll).
* `step_details`: JSON string detail eksekusi (URL/selector, status code, latency, extracted variables).

---

## 8. Rencana Implementasi TDD (TDD-007)

| TDD Cycle | Komponen | Target Test File | Cakupan Pengujian |
| :--- | :--- | :--- | :--- |
| **`TDD-007`** | `ScenarioStepExecutor` | `tests/scenario-step-executor.test.ts` | 1. Variable interpolation `{{var}}`<br>2. Multi-step HTTP request chaining & variable extraction<br>3. Status code & JSON path assertions<br>4. Multi-step Playwright browser actions (goto, click, fill, assertText, screenshot)<br>5. Error boundary & stop-on-failure handling |
| **`TDD-002b`** | SQLite Storage | `tests/storage.test.ts` | Menyimpan dan mengambil `scenario_payload` serta `step_index` pada `test_executions` |
| **`TDD-INT-03`** | Engine Integration | `tests/engine.test.ts` | Eksekusi Custom Scenario via `TestExecutionEngine` end-to-end |
| **`TDD-REAL`** | Playwright Dashboard Test | `tests/playwright-real.test.ts` | Verifikasi visual Scenario Builder UI & Preset loading di browser |

---

## 9. VPS Guardrails & Keamanan
1. **Max Steps per Scenario:** Dibatasi maksimal 20 steps per skenario untuk mencegah resource starvation.
2. **Step Timeout:** Setiap step memiliki hard timeout maksimal 15 detik.
3. **No Dynamic Eval:** Ekstraksi variabel menggunakan safe property path resolver (`lodash.get` style) tanpa `eval()` / `Function()`.
