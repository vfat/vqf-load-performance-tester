export interface LatencyQuantiles {
  min: number;
  max: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export function calculateQuantiles(latencies: number[]): LatencyQuantiles {
  if (!latencies || latencies.length === 0) {
    return { min: 0, max: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const len = sorted.length;

  const getPercentile = (p: number): number => {
    const rank = Math.ceil((p / 100) * len);
    const index = Math.max(0, Math.min(len - 1, rank - 1));
    return sorted[index];
  };


  return {
    min: sorted[0],
    max: sorted[len - 1],
    p50: getPercentile(50),
    p90: getPercentile(90),
    p95: getPercentile(95),
    p99: getPercentile(99)
  };
}

export interface LoadResponseItem {
  statusCode: number;
  latencyMs: number;
}

export interface AggregateLoadOptions {
  testRunId: string;
  durationSeconds: number;
  responses: LoadResponseItem[];
}

export interface LoadRunSummaryResult {
  testRunId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRatePercent: number;
  rps: number;
  latency: LatencyQuantiles;
}

export class ArtilleryRunner {
  async aggregateResults(options: AggregateLoadOptions): Promise<LoadRunSummaryResult> {
    const total = options.responses.length;
    const successful = options.responses.filter((r) => r.statusCode >= 200 && r.statusCode < 400).length;
    const failed = total - successful;
    const errorRatePercent = total > 0 ? (failed / total) * 100 : 0;
    const duration = Math.max(1, options.durationSeconds);
    const rps = total / duration;

    const latencies = options.responses.map((r) => r.latencyMs);
    const latency = calculateQuantiles(latencies);

    return {
      testRunId: options.testRunId,
      totalRequests: total,
      successfulRequests: successful,
      failedRequests: failed,
      errorRatePercent: parseFloat(errorRatePercent.toFixed(2)),
      rps: parseFloat(rps.toFixed(2)),
      latency
    };
  }
}
