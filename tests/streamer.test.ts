import { describe, it, expect, vi } from 'vitest';
import { TelemetryStreamer } from '../src/lib/server/streamer.js';

describe('TelemetryStreamer (TDD-003)', () => {
  it('should register and track active SSE clients', () => {
    const streamer = new TelemetryStreamer();
    const sendFn = vi.fn();

    const cleanup = streamer.addClient('client-1', sendFn);
    expect(streamer.activeClientCount).toBe(1);

    cleanup();
    expect(streamer.activeClientCount).toBe(0);
  });

  it('should broadcast formatted SSE messages to all active clients', () => {
    const streamer = new TelemetryStreamer();
    const client1 = vi.fn();
    const client2 = vi.fn();

    streamer.addClient('c1', client1);
    streamer.addClient('c2', client2);

    const payload = { rps: 150.2, p95Ms: 45.0, activeWorkers: 4 };
    streamer.broadcast('metrics', payload);

    const expectedMessage = `event: metrics\ndata: ${JSON.stringify(payload)}\n\n`;
    expect(client1).toHaveBeenCalledWith(expectedMessage);
    expect(client2).toHaveBeenCalledWith(expectedMessage);
  });

  it('should remove failing/disconnected clients automatically on broadcast error', () => {
    const streamer = new TelemetryStreamer();
    const goodClient = vi.fn();
    const brokenClient = vi.fn().mockImplementation(() => {
      throw new Error('Socket closed');
    });

    streamer.addClient('good', goodClient);
    streamer.addClient('broken', brokenClient);

    expect(streamer.activeClientCount).toBe(2);

    streamer.broadcast('ping', { time: 123 });

    // The broken client should have been removed automatically
    expect(streamer.activeClientCount).toBe(1);
    expect(goodClient).toHaveBeenCalledTimes(1);
  });
});
