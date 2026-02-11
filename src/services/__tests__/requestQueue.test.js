import { describe, it, expect, vi } from 'vitest';
import { RequestQueue } from '../requestQueue';

describe('RequestQueue', () => {
  it('should process a single request', async () => {
    const queue = new RequestQueue({ concurrency: 3 });
    const result = await queue.enqueue('agent-1', 'normal', () => Promise.resolve('done'));
    expect(result).toBe('done');
  });

  it('should process requests in priority order', async () => {
    const order = [];
    const queue = new RequestQueue({ concurrency: 1 });

    // Block the queue with a slow request
    const blocker = queue.enqueue('blocker', 'background', () =>
      new Promise((r) => setTimeout(() => { order.push('background'); r(); }, 50))
    );

    // Queue higher-priority requests while blocked
    const p1 = queue.enqueue('a1', 'normal', () => { order.push('normal'); return Promise.resolve(); });
    const p2 = queue.enqueue('a2', 'critical', () => { order.push('critical'); return Promise.resolve(); });
    const p3 = queue.enqueue('a3', 'high', () => { order.push('high'); return Promise.resolve(); });

    await Promise.all([blocker, p1, p2, p3]);

    // After blocker finishes, priority order should be: critical, high, normal
    expect(order).toEqual(['background', 'critical', 'high', 'normal']);
  });

  it('should respect concurrency limit', async () => {
    const queue = new RequestQueue({ concurrency: 2 });
    let concurrent = 0;
    let maxConcurrent = 0;

    const task = () => new Promise((resolve) => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      setTimeout(() => { concurrent--; resolve(); }, 30);
    });

    await Promise.all([
      queue.enqueue('a1', 'normal', task),
      queue.enqueue('a2', 'normal', task),
      queue.enqueue('a3', 'normal', task),
      queue.enqueue('a4', 'normal', task),
    ]);

    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it('should reject when request fails', async () => {
    const queue = new RequestQueue({ concurrency: 3 });
    await expect(
      queue.enqueue('a1', 'normal', () => Promise.reject(new Error('fail')))
    ).rejects.toThrow('fail');
  });

  it('should cancel pending requests for an agent', async () => {
    const queue = new RequestQueue({ concurrency: 1 });

    // Block with slow request
    const blocker = queue.enqueue('blocker', 'normal', () =>
      new Promise((r) => setTimeout(r, 50))
    );

    const cancelled = queue.enqueue('to-cancel', 'normal', () => Promise.resolve('should not run'));
    // Attach rejection handler before cancel to avoid unhandled rejection
    const cancelAssertion = expect(cancelled).rejects.toThrow('Cancelled');
    queue.cancel('to-cancel');

    await blocker;
    await cancelAssertion;
  });

  it('should cancel all pending requests', async () => {
    const queue = new RequestQueue({ concurrency: 1 });

    const blocker = queue.enqueue('blocker', 'normal', () =>
      new Promise((r) => setTimeout(r, 50))
    );

    const p1 = queue.enqueue('a1', 'normal', () => Promise.resolve());
    const p2 = queue.enqueue('a2', 'normal', () => Promise.resolve());
    // Attach rejection handlers before cancelAll to avoid unhandled rejections
    const p1Assertion = expect(p1).rejects.toThrow('Cancelled');
    const p2Assertion = expect(p2).rejects.toThrow('Cancelled');

    queue.cancelAll();

    await blocker;
    await p1Assertion;
    await p2Assertion;
  });

  it('should report correct metrics', async () => {
    const queue = new RequestQueue({ concurrency: 3 });

    await queue.enqueue('a1', 'normal', () => Promise.resolve());
    await queue.enqueue('a2', 'normal', () => Promise.resolve());

    const metrics = queue.getMetrics();
    expect(metrics.totalProcessed).toBe(2);
    expect(metrics.totalErrors).toBe(0);
    expect(metrics.queued).toBe(0);
    expect(metrics.inFlight).toBe(0);
  });

  it('should increment error count on failures', async () => {
    const queue = new RequestQueue({ concurrency: 3 });

    await queue.enqueue('a1', 'normal', () => Promise.resolve()).catch(() => {});
    await queue.enqueue('a2', 'normal', () => Promise.reject(new Error('err'))).catch(() => {});

    const metrics = queue.getMetrics();
    expect(metrics.totalProcessed).toBe(1);
    expect(metrics.totalErrors).toBe(1);
  });

  it('should handle rate limiting (429) by re-queuing', async () => {
    vi.useFakeTimers();
    const queue = new RequestQueue({ concurrency: 1 });
    let callCount = 0;

    const p = queue.enqueue('a1', 'normal', () => {
      callCount++;
      if (callCount === 1) {
        const err = new Error('Rate limited');
        err.status = 429;
        return Promise.reject(err);
      }
      return Promise.resolve('success');
    });

    // Advance past the rate limit pause (5000ms)
    await vi.advanceTimersByTimeAsync(6000);

    const result = await p;
    expect(result).toBe('success');
    expect(callCount).toBe(2);

    vi.useRealTimers();
  });
});
