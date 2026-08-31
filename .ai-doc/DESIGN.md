# DESIGN.md — Risograph Broadsheet Single Dashboard Control

## 1. Overview & Philosophy
- **Name:** Risograph Broadsheet Single Dashboard Control
- **Style:** Editorial Broadsheet Risograph Print — SaaS Telemetry & Runner Control Deck
- **Color Palette Signature:**
  - `#FAFAFA` — Canvas / Crisp Paper Background
  - `#C7EEFF` — Ice Sky Cyan Accent & Card Subtles
  - `#0077C0` — Electric Royal Cyan (Primary Action & Active States)
  - `#1D242B` — Deep Charcoal Ink (Hard Borders, Text, & Drop Shadows)
- **Key Characteristics:**
  - Printed letterpress broadsheet aesthetic, tactile hard press rules (`2px solid #1D242B`), hard-cast risograph shadows (`4px 4px 0px #1D242B`).
  - Typography triad: `Big Shoulders Display` for display slabs + `Fraunces` for serif labels/body + `JetBrains Mono` for telemetry numbers & metrics.
  - Zero-lag reactivity with SvelteKit & Server-Sent Events (SSE).

---

## 2. Design Tokens

### 2.1 Colors (Tailored 4-Color Signature)

```css
:root {
  /* Core Palette */
  --color-canvas: #FAFAFA;
  --color-surface: #FFFFFF;
  --color-surface-subtle: #C7EEFF;
  --color-surface-hover: #B4E6FC;
  --color-primary: #0077C0;
  --color-primary-hover: #005F9A;
  --color-ink: #1D242B;
  --color-ink-muted: #3D4A56;
  --color-ink-subtle: #6A7B8C;
  
  /* Status Colors */
  --color-success: #4DFFBE;
  --color-warning: #FFE66D;
  --color-danger: #FF4D6D;
  --color-info: #0077C0;

  /* Borders & Rules */
  --border-thick: 2px solid #1D242B;
  --border-subtle: 1px solid #1D242B;
  --border-radius: 4px;
  --border-radius-sm: 2px;
  --border-radius-pill: 999px;

  /* Hard-Cast Risograph Shadows */
  --shadow-sm: 2px 2px 0px #1D242B;
  --shadow-md: 4px 4px 0px #1D242B;
  --shadow-lg: 6px 6px 0px #1D242B;
  --shadow-hover: 6px 6px 0px #1D242B;
  --shadow-active: 1px 1px 0px #1D242B;

  /* Typography */
  --font-display: "Big Shoulders Display", -apple-system, sans-serif;
  --font-body: "Fraunces", Georgia, serif;
  --font-mono: "JetBrains Mono", monospace;
}

/* Dark Mode Adaptation */
[data-theme="dark"] {
  --color-canvas: #1D242B;
  --color-surface: #262E37;
  --color-surface-subtle: #303A45;
  --color-surface-hover: #3C4855;
  --color-primary: #0077C0;
  --color-primary-hover: #2998DF;
  --color-ink: #FAFAFA;
  --color-ink-muted: #D1D7DC;
  --color-ink-subtle: #98A5B3;
  --border-thick: 2px solid #C7EEFF;
  --border-subtle: 1px solid #C7EEFF;
  --shadow-sm: 2px 2px 0px #0077C0;
  --shadow-md: 4px 4px 0px #0077C0;
  --shadow-lg: 6px 6px 0px #0077C0;
}
```

---

## 3. Typography Hierarchy

* **Page Title / Main Slab:** `Big Shoulders Display` (Uppercase, ExtraBold, `letter-spacing: 0.05em`)
* **Card Subheadings & Body Copy:** `Fraunces` (Editorial Serif, elegant & crisp)
* **Realtime Telemetry, RPS, Latency, & Logs:** `JetBrains Mono` (Monospace, high readability)

---

## 4. Component Styles

### 4.1 Buttons
* **Primary Trigger Button:**
  ```css
  background: var(--color-primary);
  color: #FAFAFA;
  border: var(--border-thick);
  box-shadow: var(--shadow-md);
  font-family: var(--font-display);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: transform 120ms ease, box-shadow 120ms ease;
  ```
  *Hover:* `transform: translate(-2px, -2px); box-shadow: var(--shadow-lg);`  
  *Active:* `transform: translate(2px, 2px); box-shadow: var(--shadow-active);`

* **Secondary / Ghost Button:**
  ```css
  background: var(--color-surface);
  color: var(--color-ink);
  border: var(--border-thick);
  box-shadow: var(--shadow-sm);
  ```

### 4.2 Stat Cards & Telemetry Gauges
* Hard border `2px solid var(--color-ink)`, background `var(--color-surface)` dengan aksen `var(--color-surface-subtle)`.
* Nilai angka metrik dirender dalam `Big Shoulders Display` ukuran besar (`text-3xl` / `2.5rem`).
* Label dan satuan unit dirender dalam `JetBrains Mono`.

### 4.3 Charts (ApexCharts Risograph Theme)
* Grid lines: solid (bukan dashed) `1px solid var(--color-ink)`.
* Line curves: `straight` (risograph broadsheet khas).
* Palette: `#0077C0` (Primary), `#C7EEFF` (Secondary), `#4DFFBE` (Success/RPS), `#FF4D6D` (Errors).
* Tooltip: hard shadow `3px 3px 0px var(--color-ink)`, background `var(--color-canvas)`.

---

## 5. Dashboard Layout Structure

```
┌────────────────────────────────────────────────────────────────────────┐
│ TOPBAR (64px) — Logo: VIP-1 LOAD-TEST ┃ Target: [SUT URL] ┃ [Theme 🌗] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ CONTROL PANEL (Trigger Bar)                                        │ │
│ │ [Mode: Hybrid ▼] [Scenario: checkout.spec ▼] [Users: ━━●━━━ 25]    │ │
│ │ [ ▶ START TEST RUN ]           [ ⏹ EMERGENCY ABORT ]               │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ REALTIME TELEMETRY (Live via SSE)                                  │ │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │ │
│ │ │  CURRENT RPS │ │  p95 LATENCY │ │ ACTIVE VUs   │ │ ERROR RATE  │ │ │
│ │ │   248.5 rps  │ │    42.1 ms   │ │  25 Workers  │ │   0.00 %    │ │ │
│ │ └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │ │
│ │ ┌─────────────────────────────────┐ ┌────────────────────────────┐ │ │
│ │ │ Live Latency Chart (ApexCharts) │ │ Scenario Progress Feed     │ │ │
│ │ │                                 │ │ 🔄 checkout.spec (Step 3/5)│ │ │
│ │ └─────────────────────────────────┘ └────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ RUN HISTORY & ARTIFACT INSPECTOR (SQLite ./data/history.db)        │ │
│ │ [Search / Filter...]                                               │ │
│ │ ┌──────────┬──────────────┬────────┬──────────┬──────────────────┐ │ │
│ │ │ RUN ID   │ SUITE NAME   │ TYPE   │ STATUS   │ ACTION           │ │ │
│ │ ├──────────┼──────────────┼────────┼──────────┼──────────────────┤ │ │
│ │ │ #RUN-104 │ Checkout E2E │ Hybrid │ PASSED   │ [ Inspect / Log ]│ │ │
│ │ └──────────┴──────────────┴────────┴──────────┴──────────────────┘ │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```
