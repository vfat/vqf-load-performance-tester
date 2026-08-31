import { describe, it, expect } from 'vitest';
import { ArtilleryRunner, calculateQuantiles } from '../src/lib/server/artillery-runner.js';

describe('ArtilleryRunner (TDD-005)', () => {
  it('should calculate accurate latency quantiles (p50, p90, p95, p99)', () => {
    // Array of 100 response times from 1ms to 100ms
    const latencies = Array.from({ length: 100 }, (_, i) => i + 1);

    const quantiles = calculateQuantiles(latencies);
    expect(quantiles.p50).toBe(50);
    expect(quantiles.p90).toBe(90);
    expect(quantiles.p95).toBe(95);
    expect(quantiles.p99).toBe(99);
    expect(quantiles.min).toBe(1);
    expect(quantiles.max).toBe(100);
  });

  it('should handle empty latencies array gracefully', () => {
    const quantiles = calculateQuantiles([]);
    expect(quantiles.p50).toBe(0);
    expect(quantiles.p95).toBe(0);
    expect(quantiles.p99).toBe(0);
    expect(quantiles.min).toBe(0);
    expect(quantiles.max).toBe(0);
  });

  it('should aggregate load run summary and compute overall throughput and error rate', async () => {
    const runner = new ArtilleryRunner();

    const result = await runner.aggregateResults({
      testRunId: 'run-art-01',
      durationSeconds: 10,
      responses: [
        { statusCode: 200, latencyMs: 25 },
        { statusCode: 200, latencyMs: 30 },
        { statusCode: 200, latencyMs: 45 },
        { statusCode: 200, latencyMs: 80 },
        { statusCode: 500, latencyMs: 120 }
      ]
    });

    expect(result.testRunId).toBe('run-art-01');
    expect(result.totalRequests).toBe(5);
    expect(result.successfulRequests).toBe(4);
    expect(result.failedRequests).toBe(1);
    expect(result.errorRatePercent).toBe(20.0);
    expect(result.rps).toBe(0.5); // 5 requests / 10s
    expect(result.latency.p95).toBeGreaterThanOrEqual(80);
  });
});
