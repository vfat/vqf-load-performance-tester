import { TaskScheduler } from './scheduler.js';
import { SqliteHistoryRepository, type TestRunRecord } from './storage.js';
import { TelemetryStreamer } from './streamer.js';
import { PlaywrightRunner, type ScenarioExecutionResult } from './playwright-runner.js';
import { ArtilleryRunner, type LoadResponseItem, type LoadRunSummaryResult } from './artillery-runner.js';
import { HttpLoadWorker, type LoadTestFinalSummary, type TickMetrics } from './http-load-worker.js';

export interface ScenarioDefinition {
  name: string;
  durationMs?: number;
  shouldFail?: boolean;
}

export interface LoadRunConfig {
  targetRps: number;
  durationSeconds: number;
  simulatedResponses?: LoadResponseItem[];
}

export interface StartRunOptions {
  id: string;
  suiteName: string;
  testType: 'PLAYWRIGHT_ONLY' | 'ARTILLERY_ONLY' | 'HYBRID';
  targetUrl?: string;
  concurrency?: number;
  scenarios?: ScenarioDefinition[];
  loadConfig?: LoadRunConfig;
  virtualUsers?: number;
  durationSeconds?: number;
  loadProfile?: 'fixed' | 'ramp-up' | 'spike';
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

export interface EngineStatus {
  state: 'IDLE' | 'RUNNING' | 'ABORTED' | 'COMPLETED' | 'FAILED';
  currentRunId: string | null;
  activeWorkers: number;
  totalTasks: number;
  completedTasks: number;
  currentRps: number;
  p95LatencyMs: number;
}


export class TestExecutionEngine {
  public storage: SqliteHistoryRepository;
  public streamer: TelemetryStreamer;
  private playwrightRunner: PlaywrightRunner;
  private artilleryRunner: ArtilleryRunner;
  private httpLoadWorker: HttpLoadWorker;
  private scheduler: TaskScheduler | null = null;
  private abortController: AbortController | null = null;
  
  private currentStatus: EngineStatus = {
    state: 'IDLE',
    currentRunId: null,
    activeWorkers: 0,
    totalTasks: 0,
    completedTasks: 0,
    currentRps: 0,
    p95LatencyMs: 0
  };

  constructor(options: {
    storage?: SqliteHistoryRepository;
    streamer?: TelemetryStreamer;
    concurrency?: number;
  } = {}) {
    this.storage = options.storage || new SqliteHistoryRepository();
    this.streamer = options.streamer || new TelemetryStreamer();
    this.playwrightRunner = new PlaywrightRunner();
    this.artilleryRunner = new ArtilleryRunner();
    this.httpLoadWorker = new HttpLoadWorker();
  }

  getStatus(): EngineStatus {
    return { ...this.currentStatus };
  }

  async startRun(options: StartRunOptions): Promise<TestRunRecord> {
    const runRecord = this.storage.createRun({
      id: options.id,
      suiteName: options.suiteName,
      testType: options.testType,
      targetUrl: options.targetUrl,
      virtualUsers: options.virtualUsers ?? 1,
      durationSeconds: options.durationSeconds ?? 30,
      loadProfile: options.loadProfile ?? 'fixed',
      httpMethod: options.httpMethod ?? 'GET'
    });

    this.abortController = new AbortController();
    this.scheduler = new TaskScheduler({ concurrency: options.concurrency ?? 2 });
    const startTime = Date.now();

    const scenarios = options.scenarios && options.scenarios.length > 0
      ? options.scenarios
      : [
          {
            name: options.targetUrl ? `GET ${options.targetUrl}` : 'Target URL Load Verification'
          }
        ];



    this.currentStatus = {
      state: 'RUNNING',
      currentRunId: options.id,
      activeWorkers: 1,
      totalTasks: scenarios.length,
      completedTasks: 0,
      currentRps: options.loadConfig?.targetRps ?? (options.testType === 'ARTILLERY_ONLY' || options.testType === 'HYBRID' ? 120 : 0),
      p95LatencyMs: 25.0
    };

    this.streamer.broadcast('run_started', {
      testRunId: options.id,
      suiteName: options.suiteName,
      status: 'RUNNING',
      timestamp: new Date().toISOString()
    });

    let passedCount = 0;
    let failedCount = 0;
    let wasAborted = false;

    // Execute Playwright scenarios via scheduler
    const taskPromises = scenarios.map((sc) => {
      return this.scheduler!.enqueue(async () => {
        if (this.scheduler?.isAborted) return null;

        let result;
        if (options.targetUrl) {
          result = await this.playwrightRunner.executeTargetScenario({
            testRunId: options.id,
            scenarioName: sc.name,
            targetUrl: options.targetUrl
          });
        } else {
          result = await this.playwrightRunner.runScenario({
            testRunId: options.id,
            scenarioName: sc.name,
            scenarioFn: async () => {
              await new Promise((r) => setTimeout(r, sc.durationMs ?? 50));
              if (sc.shouldFail) {
                throw new Error(`Assertion failed in ${sc.name}`);
              }
            }
          });
        }

        this.storage.addExecution({
          testRunId: options.id,
          scenarioName: result.scenarioName,
          status: result.status,
          durationMs: result.durationMs,
          retryCount: result.retryCount,
          errorMessage: result.errorMessage,
          screenshotPath: result.screenshotPath
        });

        if (result.status === 'PASSED') passedCount++;
        else failedCount++;

        this.currentStatus.completedTasks++;
        this.streamer.broadcast('scenario_completed', result);
        if (result.screenshotPath) {
          this.streamer.broadcast('screenshot_captured', {
            testRunId: options.id,
            scenarioName: result.scenarioName,
            screenshotUrl: `/api/screenshots/${result.screenshotPath.split('/').pop()}`
          });
        }
        this.emitTelemetryUpdate(options.id);

        return result;

      }).catch((err) => {
        if (this.scheduler?.isAborted) {
          wasAborted = true;
        }
        return null;
      });
    });

    await Promise.all(taskPromises);

    // Run real HTTP load test if configured
    let loadSummary: LoadTestFinalSummary | null = null;
    if ((options.testType === 'ARTILLERY_ONLY' || options.testType === 'HYBRID') && options.targetUrl) {
      const vus = options.virtualUsers ?? 10;
      const duration = options.durationSeconds ?? 30;
      const profile = options.loadProfile ?? 'fixed';
      const method = options.httpMethod ?? 'GET';

      loadSummary = await this.httpLoadWorker.runLoadTest(
        {
          targetUrl: options.targetUrl,
          httpMethod: method,
          virtualUsers: vus,
          durationSeconds: duration,
          loadProfile: profile,
          requestTimeoutMs: 10000,
          abortSignal: this.abortController?.signal
        },
        (tickMetrics: TickMetrics) => {
          // Stream each tick's metrics via SSE
          this.currentStatus.currentRps = tickMetrics.currentRps;
          this.currentStatus.p95LatencyMs = tickMetrics.p95LatencyMs;
          this.currentStatus.activeWorkers = tickMetrics.activeVUs;

          this.streamer.broadcast('telemetry', {
            testRunId: options.id,
            state: 'RUNNING',
            activeWorkers: tickMetrics.activeVUs,
            completedTasks: this.currentStatus.completedTasks,
            totalTasks: this.currentStatus.totalTasks,
            currentRps: tickMetrics.currentRps,
            p95LatencyMs: tickMetrics.p95LatencyMs,
            p50LatencyMs: tickMetrics.p50LatencyMs,
            p99LatencyMs: tickMetrics.p99LatencyMs,
            errorsThisTick: tickMetrics.errorsThisTick,
            errorRatePercent: tickMetrics.errorRatePercent,
            totalRequestsSoFar: tickMetrics.totalRequestsSoFar,
            totalErrorsSoFar: tickMetrics.totalErrorsSoFar,
            tick: tickMetrics.tick,
            activeVUs: tickMetrics.activeVUs,
            timestamp: new Date().toISOString()
          });

          // Save metric point to SQLite
          this.storage.addMetricPoint({
            testRunId: options.id,
            timestamp: new Date().toISOString(),
            rps: tickMetrics.currentRps,
            p50Ms: tickMetrics.p50LatencyMs,
            p95Ms: tickMetrics.p95LatencyMs,
            p99Ms: tickMetrics.p99LatencyMs,
            errorCount: tickMetrics.errorsThisTick
          });
        }
      );
    } else if (options.testType === 'ARTILLERY_ONLY' || options.testType === 'HYBRID') {
      // Fallback: simulated aggregation if no target URL
      const simulatedResponses: LoadResponseItem[] = options.loadConfig?.simulatedResponses ?? [
        { statusCode: 200, latencyMs: 22 },
        { statusCode: 200, latencyMs: 28 },
        { statusCode: 200, latencyMs: 35 },
        { statusCode: 200, latencyMs: 42 },
        { statusCode: 200, latencyMs: 78 }
      ];

      const legacySummary = await this.artilleryRunner.aggregateResults({
        testRunId: options.id,
        durationSeconds: options.loadConfig?.durationSeconds ?? 5,
        responses: simulatedResponses
      });

      this.storage.addMetricPoint({
        testRunId: options.id,
        timestamp: new Date().toISOString(),
        rps: legacySummary.rps,
        p50Ms: legacySummary.latency.p50,
        p95Ms: legacySummary.latency.p95,
        p99Ms: legacySummary.latency.p99,
        errorCount: legacySummary.failedRequests
      });

      this.currentStatus.currentRps = legacySummary.rps;
      this.currentStatus.p95LatencyMs = legacySummary.latency.p95;
    }

    const durationMs = Date.now() - startTime;
    const finalStatus = this.scheduler?.isAborted || wasAborted ? 'ABORTED' : failedCount > 0 ? 'FAILED' : 'COMPLETED';

    const updateData: any = {
      status: finalStatus,
      completedAt: new Date().toISOString(),
      durationMs,
      totalScenarios: scenarios.length,
      passedScenarios: passedCount,
      failedScenarios: failedCount,
      summaryJsonPath: `./reports/run-${options.id}/summary.json`,
      reportHtmlPath: `./reports/run-${options.id}/report.html`
    };

    if (loadSummary) {
      updateData.totalRequests = loadSummary.totalRequests;
      updateData.avgLatencyMs = loadSummary.avgLatencyMs;
      updateData.errorRatePercent = loadSummary.errorRatePercent;
    }

    this.storage.updateRun(options.id, updateData);

    this.currentStatus.state = finalStatus;
    this.currentStatus.activeWorkers = 0;

    const finalResult = this.storage.getRun(options.id)!;
    this.streamer.broadcast('run_completed', {
      ...finalResult,
      loadSummary
    });

    return finalResult;
  }

  abortRun(reason = 'Emergency abort by user'): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    if (this.scheduler) {
      this.scheduler.abort(reason);
    }
    this.currentStatus.state = 'ABORTED';
    this.currentStatus.activeWorkers = 0;

    if (this.currentStatus.currentRunId) {
      this.storage.updateRun(this.currentStatus.currentRunId, {
        status: 'ABORTED',
        completedAt: new Date().toISOString()
      });

      this.streamer.broadcast('run_aborted', {
        testRunId: this.currentStatus.currentRunId,
        reason,
        timestamp: new Date().toISOString()
      });
    }
  }

  private emitTelemetryUpdate(testRunId: string): void {
    const payload = {
      testRunId,
      state: this.currentStatus.state,
      activeWorkers: this.currentStatus.activeWorkers,
      completedTasks: this.currentStatus.completedTasks,
      totalTasks: this.currentStatus.totalTasks,
      currentRps: this.currentStatus.currentRps,
      p95LatencyMs: this.currentStatus.p95LatencyMs,
      timestamp: new Date().toISOString()
    };
    this.streamer.broadcast('telemetry', payload);
  }
}
