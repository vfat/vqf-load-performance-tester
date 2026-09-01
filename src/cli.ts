import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { SqliteHistoryRepository } from './lib/server/storage.js';
import { TestExecutionEngine } from './lib/server/engine.js';
import type { BrowserStepDefinition } from './lib/server/playwright-step-executor.js';
import type { ApiStepDefinition } from './lib/server/api-chaining-executor.js';
import type { LoadTestFinalSummary } from './lib/server/http-load-worker.js';

export interface CliOptions {
  mode?: 'e2e' | 'api';
  url?: string;
  suiteName?: string;
  vus?: number;
  duration?: number;
  profile?: 'fixed' | 'ramp-up' | 'spike';
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  userAgent?: string;
  headers?: Record<string, string>;
  body?: string;
  scenarioFile?: string;
  browserSteps?: BrowserStepDefinition[];
  apiSteps?: ApiStepDefinition[];
  silent?: boolean;
  help?: boolean;
}

export interface CliExecutionResult {
  runId: string;
  exitCode: number;
  status: 'COMPLETED' | 'FAILED' | 'ABORTED';
  durationMs: number;
  summary?: LoadTestFinalSummary | any;
  errorMessage?: string;
}

/**
 * Parse CLI arguments into structured CliOptions
 */
export function parseCliArgs(rawArgs: string[]): CliOptions {
  const options: CliOptions = {
    vus: 10,
    duration: 10,
    profile: 'fixed',
    method: 'GET'
  };

  for (const arg of rawArgs) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--silent') {
      options.silent = true;
      continue;
    }

    if (arg.startsWith('--mode=')) {
      const mode = arg.split('=')[1].toLowerCase();
      if (mode === 'e2e' || mode === 'api') options.mode = mode;
    } else if (arg.startsWith('--url=')) {
      options.url = arg.substring(6);
    } else if (arg.startsWith('--suite-name=')) {
      options.suiteName = arg.substring(13);
    } else if (arg.startsWith('--vus=')) {
      options.vus = parseInt(arg.split('=')[1], 10) || 10;
    } else if (arg.startsWith('--duration=')) {
      options.duration = parseInt(arg.split('=')[1], 10) || 10;
    } else if (arg.startsWith('--profile=')) {
      const p = arg.split('=')[1].toLowerCase();
      if (p === 'fixed' || p === 'ramp-up' || p === 'spike') options.profile = p;
    } else if (arg.startsWith('--method=')) {
      const m = arg.split('=')[1].toUpperCase();
      if (['GET', 'POST', 'PUT', 'DELETE'].includes(m)) options.method = m as any;
    } else if (arg.startsWith('--user-agent=')) {
      options.userAgent = arg.substring(13);
    } else if (arg.startsWith('--headers=')) {
      const raw = arg.substring(10);
      try {
        options.headers = JSON.parse(raw);
      } catch {
        // Simple key:value fallback
        const parts = raw.split(':');
        if (parts.length >= 2) {
          options.headers = { [parts[0].trim()]: parts.slice(1).join(':').trim() };
        }
      }
    } else if (arg.startsWith('--body=')) {
      options.body = arg.substring(7);
    } else if (arg.startsWith('--scenario=')) {
      const filePath = arg.substring(11);
      options.scenarioFile = filePath;

      if (fs.existsSync(filePath)) {
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (content.name) options.suiteName = content.name;
          if (content.mode) options.mode = content.mode;
          if (content.url) options.url = content.url;
          if (content.browserSteps) options.browserSteps = content.browserSteps;
          if (content.apiSteps) options.apiSteps = content.apiSteps;
          if (content.vus) options.vus = content.vus;
          if (content.duration) options.duration = content.duration;
          if (content.profile) options.profile = content.profile;
          if (content.headers) options.headers = content.headers;
          if (content.userAgent) options.userAgent = content.userAgent;
        } catch (err: any) {
          console.error(`Failed to parse scenario file ${filePath}: ${err.message}`);
        }
      }
    }
  }

  // Auto-detect mode if not explicitly supplied
  if (!options.mode) {
    if (options.browserSteps && options.browserSteps.length > 0) {
      options.mode = 'e2e';
    } else {
      options.mode = 'api';
    }
  }

  return options;
}

export function printHelp(): void {
  console.log(`
================================================================================
  PENTEST LAB // HEADLESS CLI TEST RUNNER
================================================================================

Usage:
  npm run test:run -- [options]
  node dist/src/cli.js [options]

Modes:
  --mode=e2e              Run Playwright Browser E2E automation
  --mode=api              Run REST API concurrent load / chaining test

General Options:
  --scenario=<file.json>  Load full test scenario pipeline from JSON file
  --suite-name=<name>     Custom label/name for the test suite run
  --user-agent=<agent>    Custom User-Agent header (for auth / security bypass)
  --headers=<json>        Custom Request Headers in JSON format
  --silent                Suppress real-time CLI console prints
  --help, -h              Show this help screen

Deck 1 (Playwright E2E) Options:
  --url=<target-url>      Target web URL to navigate

Deck 2 (REST API Load) Options:
  --url=<target-url>      Target API endpoint (e.g. https://httpbin.org/get)
  --method=GET|POST|PUT   HTTP request method (Default: GET)
  --vus=<number>          Virtual Users count (1-100, Default: 10)
  --duration=<seconds>    Test duration in seconds (Default: 10)
  --profile=fixed|ramp-up Load profile shape (Default: fixed)
  --body=<string>         Request body payload for POST/PUT

Examples:
  npm run test:run -- --mode=api --url=https://httpbin.org/get --vus=20 --duration=10
  npm run test:run -- --scenario=scenarios/login_flow.json
  npm run test:run -- --mode=e2e --url=https://httpbin.org --user-agent=CustomScanner/1.0
================================================================================
`);
}

/**
 * Execute test runner via CLI
 */
export async function runCli(
  opts: CliOptions,
  dependencies: { engine?: TestExecutionEngine; storage?: SqliteHistoryRepository } = {}
): Promise<CliExecutionResult> {
  const storage = dependencies.storage || new SqliteHistoryRepository('./data/test_history.db');
  storage.init();

  const engine = dependencies.engine || new TestExecutionEngine({ storage });
  const runId = crypto.randomUUID();
  const startTime = Date.now();
  const isSilent = opts.silent || false;

  const suiteName = opts.suiteName || (opts.mode === 'e2e' ? 'CLI Playwright E2E Test' : 'CLI REST API Load Test');

  if (!isSilent) {
    console.log(`\n================================================================================`);
    console.log(` 🚀 STARTING HEADLESS TEST RUN // [${opts.mode?.toUpperCase()}] ${suiteName}`);
    console.log(` ID: ${runId}`);
    if (opts.url) console.log(` Target URL: ${opts.url}`);
    if (opts.mode === 'api') {
      console.log(` Config: ${opts.vus} VUs | ${opts.duration}s | Profile: ${opts.profile} | Method: ${opts.method}`);
    }
    console.log(`================================================================================\n`);
  }

  // Subscribe to live SSE events for CLI console output
  let finalSummary: any = null;
  let finalStatus: 'COMPLETED' | 'FAILED' | 'ABORTED' = 'COMPLETED';
  let overallError: string | undefined;

  const clientId = `cli-${runId}`;
  engine.streamer.addClient(clientId, (rawSse: string) => {
    if (isSilent) return;

    if (rawSse.startsWith('event: step_progress')) {
      try {
        const jsonStr = rawSse.split('\ndata: ')[1]?.split('\n\n')[0];
        if (jsonStr) {
          const step = JSON.parse(jsonStr);
          const icon = step.status === 'PASSED' ? '✅' : '❌';
          console.log(` [STEP ${step.stepIndex}] ${icon} [${step.action}] ${step.name} (${step.durationMs}ms)`);
          if (step.errorMessage) {
            console.log(`    ⚠️ Error: ${step.errorMessage}`);
          }
        }
      } catch {}
    } else if (rawSse.startsWith('event: telemetry')) {
      try {
        const jsonStr = rawSse.split('\ndata: ')[1]?.split('\n\n')[0];
        if (jsonStr) {
          const m = JSON.parse(jsonStr);
          if (m.tick) {
            process.stdout.write(`\r ⏱️  Tick ${m.tick}s | RPS: ${Number(m.currentRps || 0).toFixed(1)} | p95: ${Math.round(m.p95LatencyMs || 0)}ms | VUs: ${m.activeVUs} | Errors: ${m.totalErrorsSoFar}`);
          }
        }
      } catch {}
    }
  });

  try {
    let browserSteps = opts.browserSteps;
    if (opts.mode === 'e2e' && (!browserSteps || browserSteps.length === 0) && opts.url) {
      // Default single-step E2E navigation & screenshot if only URL provided
      browserSteps = [
        { id: 's1', action: 'GOTO', name: 'Open Web Page', url: opts.url },
        { id: 's2', action: 'WAIT', name: 'Wait 1s Hydration', timeoutMs: 1000 },
        { id: 's3', action: 'SCREENSHOT', name: 'Capture Evidence' }
      ];
    }

    const startOptions = {
      id: runId,
      suiteName,
      testType: (opts.mode === 'e2e' ? 'PLAYWRIGHT_ONLY' : 'ARTILLERY_ONLY') as any,
      targetUrl: opts.url,
      virtualUsers: opts.vus || 10,
      durationSeconds: opts.duration || 10,
      loadProfile: opts.profile || 'fixed',
      httpMethod: opts.method || 'GET',
      userAgent: opts.userAgent,
      headers: opts.headers,
      body: opts.body,
      browserSteps,
      apiSteps: opts.apiSteps
    };

    // Execute through engine
    await engine.startRun(startOptions);

    // Wait until engine state settles
    while (engine.getStatus().state === 'RUNNING') {
      await new Promise((r) => setTimeout(r, 200));
    }

    const statusObj = engine.getStatus();
    if (statusObj.state === 'FAILED' || statusObj.state === 'ABORTED') {
      finalStatus = statusObj.state;
    }

    // Check recorded executions in SQLite for failures
    const executions = storage.getExecutions(runId);
    const failedSteps = executions.filter(e => e.status === 'FAILED');
    if (failedSteps.length > 0) {
      finalStatus = 'FAILED';
      overallError = failedSteps[0].errorMessage || 'Scenario step failed';
    }

    const recordedRun = storage.getRun(runId);
    if (recordedRun && recordedRun.status === 'FAILED') {
      finalStatus = 'FAILED';
    }

    // Capture summary
    if (recordedRun) {
      finalSummary = {
        totalRequests: recordedRun.totalRequests,
        avgLatencyMs: recordedRun.avgLatencyMs,
        errorRatePercent: recordedRun.errorRatePercent,
        durationMs: recordedRun.durationMs,
        status: recordedRun.status
      };
    }

    const durationMs = Date.now() - startTime;
    const exitCode = finalStatus === 'COMPLETED' ? 0 : 1;

    if (!isSilent) {
      console.log(`\n\n================================================================================`);
      console.log(` 🏁 TEST EXECUTION FINISHED // STATUS: ${finalStatus} (Exit Code: ${exitCode})`);
      console.log(` Duration: ${(durationMs / 1000).toFixed(2)}s | Total Steps / Executions: ${executions.length}`);
      if (recordedRun && recordedRun.totalRequests) {
        console.log(` Throughput: ${Math.round(recordedRun.totalRequests / (opts.duration || 1))} RPS | Error Rate: ${recordedRun.errorRatePercent || 0}% | Avg Latency: ${recordedRun.avgLatencyMs || 0}ms`);
      }
      if (overallError) {
        console.log(` ❌ Error Details: ${overallError}`);
      }
      console.log(`================================================================================\n`);
    }

    return {
      runId,
      exitCode,
      status: finalStatus,
      durationMs,
      summary: finalSummary,
      errorMessage: overallError
    };
  } finally {
    engine.streamer.removeClient(clientId);
  }
}

// Direct Execution Entrypoint
if (process.argv[1] && process.argv[1].endsWith('cli.js')) {
  const args = process.argv.slice(2);
  const options = parseCliArgs(args);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  runCli(options)
    .then((res) => {
      process.exit(res.exitCode);
    })
    .catch((err) => {
      console.error(`\n❌ Fatal CLI Error: ${err.message}\n`);
      process.exit(1);
    });
}
