import { calculateQuantiles, type LatencyQuantiles } from './artillery-runner.js';
import { ApiChainingExecutor, type ApiStepDefinition } from './api-chaining-executor.js';

export interface HttpLoadConfig {
  targetUrl: string;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  virtualUsers: number;
  durationSeconds: number;
  loadProfile: 'fixed' | 'ramp-up' | 'spike';
  requestTimeoutMs?: number;
  abortSignal?: AbortSignal;
  userAgent?: string;
  headers?: Record<string, string>;
  body?: string;
  chainSteps?: ApiStepDefinition[];
}

export interface TickMetrics {
  tick: number;
  activeVUs: number;
  requestsThisTick: number;
  currentRps: number;
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
  latency: LatencyQuantiles;
  virtualUsers: number;
  durationSeconds: number;
  loadProfile: string;
  tickHistory: TickMetrics[];
}

/**
 * Calculate the number of active Virtual Users based on load profile and elapsed time.
 */
export function getActiveVUs(
  profile: string,
  targetVUs: number,
  elapsed: number,
  total: number
): number {
  switch (profile) {
    case 'fixed':
      return targetVUs;

    case 'ramp-up': {
      if (total <= 0) return targetVUs;
      const ratio = elapsed / total;
      return Math.max(1, Math.round(ratio * targetVUs));
    }

    case 'spike': {
      if (total <= 0) return targetVUs;
      const ratio = elapsed / total;
      if (ratio < 0.3) return Math.max(1, Math.round(targetVUs * 0.1));
      if (ratio < 0.7) return targetVUs;
      return Math.max(1, Math.round(targetVUs * 0.1));
    }

    default:
      return targetVUs;
  }
}

interface FetchResult {
  statusCode: number;
  latencyMs: number;
}

/**
 * Perform a single timed HTTP fetch with timeout support and custom headers/agent.
 */
async function timedFetch(
  url: string,
  method: string,
  timeoutMs: number,
  parentSignal?: AbortSignal,
  customHeaders?: Record<string, string>,
  userAgent?: string,
  body?: string
): Promise<FetchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // If parent abort signal fires, also abort this fetch
  const onParentAbort = () => controller.abort();
  if (parentSignal) {
    parentSignal.addEventListener('abort', onParentAbort, { once: true });
  }

  const start = Date.now();
  try {
    const finalHeaders: Record<string, string> = {
      'User-Agent': userAgent || 'PentestLab-LoadWorker/1.0',
      'Accept': '*/*',
      ...(customHeaders || {})
    };

    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: finalHeaders,
      body: ['GET', 'HEAD'].includes(method.toUpperCase()) ? undefined : body,
      keepalive: true
    });
    const latencyMs = Date.now() - start;
    // Consume body to free resources
    await response.text().catch(() => {});
    return { statusCode: response.status, latencyMs };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    // Aborted or network error → treat as timeout/failure
    return { statusCode: 0, latencyMs };
  } finally {
    clearTimeout(timeoutId);
    if (parentSignal) {
      parentSignal.removeEventListener('abort', onParentAbort);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

export class HttpLoadWorker {
  /**
   * Run a real HTTP load test against a single target URL or a multi-endpoint chained scenario.
   * Emits per-tick metrics via the onTick callback, and returns a final summary.
   */
  async runLoadTest(
    config: HttpLoadConfig,
    onTick?: (metrics: TickMetrics) => void
  ): Promise<LoadTestFinalSummary> {
    const timeoutMs = config.requestTimeoutMs ?? 10000;
    const allLatencies: number[] = [];
    let totalRequests = 0;
    let totalErrors = 0;
    const tickHistory: TickMetrics[] = [];

    const isChained = Array.isArray(config.chainSteps) && config.chainSteps.length > 0;

    for (let tick = 1; tick <= config.durationSeconds; tick++) {
      if (config.abortSignal?.aborted) break;

      const tickStart = Date.now();

      const activeVUs = getActiveVUs(
        config.loadProfile,
        config.virtualUsers,
        tick,
        config.durationSeconds
      );

      const tickLatencies: number[] = [];
      let tickErrors = 0;

      if (isChained) {
        // Execute multi-endpoint chained workflow per Virtual User
        const chainExecutor = new ApiChainingExecutor();
        const vuPromises = Array.from({ length: activeVUs }, async (_, vuIdx) => {
          return chainExecutor.executeChain({
            testRunId: `vu-${vuIdx + 1}-tick-${tick}`,
            chainName: `VU-${vuIdx + 1}`,
            steps: config.chainSteps!,
            abortSignal: config.abortSignal,
            stopOnError: false
          });
        });

        const chainResults = await Promise.allSettled(vuPromises);
        for (const res of chainResults) {
          if (res.status === 'fulfilled') {
            const chainReport = res.value;
            for (const step of chainReport.stepDetails) {
              totalRequests++;
              tickLatencies.push(step.durationMs);
              allLatencies.push(step.durationMs);
              if (step.status === 'FAILED') {
                tickErrors++;
                totalErrors++;
              }
            }
          } else {
            // Whole chain failed
            totalRequests++;
            tickErrors++;
            totalErrors++;
          }
        }
      } else {
        // Fire `activeVUs` parallel single-endpoint HTTP requests
        const method = config.httpMethod || 'GET';
        const promises = Array.from({ length: activeVUs }, () =>
          timedFetch(
            config.targetUrl,
            method,
            timeoutMs,
            config.abortSignal,
            config.headers,
            config.userAgent,
            config.body
          )
        );

        const results = await Promise.allSettled(promises);

        for (const r of results) {
          totalRequests++;
          if (r.status === 'fulfilled') {
            const res = r.value;
            tickLatencies.push(res.latencyMs);
            allLatencies.push(res.latencyMs);
            if (res.statusCode === 0 || res.statusCode >= 400) {
              tickErrors++;
              totalErrors++;
            }
          } else {
            tickErrors++;
            totalErrors++;
          }
        }
      }

      const quantiles = calculateQuantiles(tickLatencies);
      const tickMetrics: TickMetrics = {
        tick,
        activeVUs,
        requestsThisTick: tickLatencies.length,
        currentRps: tickLatencies.length, // per 1-second tick
        p50LatencyMs: quantiles.p50,
        p95LatencyMs: quantiles.p95,
        p99LatencyMs: quantiles.p99,
        errorsThisTick: tickErrors,
        errorRatePercent: tickLatencies.length > 0
          ? parseFloat(((tickErrors / (tickErrors + tickLatencies.length)) * 100).toFixed(2))
          : 0,
        totalRequestsSoFar: totalRequests,
        totalErrorsSoFar: totalErrors
      };

      tickHistory.push(tickMetrics);
      if (onTick) {
        onTick(tickMetrics);
      }

      // Wait remainder of 1-second interval
      const elapsed = Date.now() - tickStart;
      if (elapsed < 1000 && tick < config.durationSeconds) {
        await sleep(1000 - elapsed);
      }
    }

    // Build final summary
    const finalLatency = calculateQuantiles(allLatencies);
    const avgLatency = allLatencies.length > 0
      ? parseFloat((allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length).toFixed(2))
      : 0;

    const actualDuration = tickHistory.length || 1;

    return {
      totalRequests,
      successfulRequests: totalRequests - totalErrors,
      failedRequests: totalErrors,
      rps: parseFloat((totalRequests / actualDuration).toFixed(2)),
      errorRatePercent: totalRequests > 0
        ? parseFloat(((totalErrors / totalRequests) * 100).toFixed(2))
        : 0,
      avgLatencyMs: avgLatency,
      latency: finalLatency,
      virtualUsers: config.virtualUsers,
      durationSeconds: config.durationSeconds,
      loadProfile: config.loadProfile,
      tickHistory
    };
  }
}
