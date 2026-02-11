// Priority request queue for managing concurrent LLM calls
// Ensures rate limits are respected and critical agents get priority

const PRIORITY_MAP = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
  background: 4,
};

export class RequestQueue {
  constructor({ concurrency = 3, onMetrics = null } = {}) {
    this.queue = [];
    this.active = 0;
    this.concurrency = concurrency;
    this.paused = false;
    this.onMetrics = onMetrics;
    this.metrics = {
      totalProcessed: 0,
      totalErrors: 0,
      avgLatencyMs: 0,
      latencySum: 0,
    };
  }

  enqueue(agentId, priority, callFn) {
    return new Promise((resolve, reject) => {
      const item = {
        agentId,
        priority: PRIORITY_MAP[priority] ?? PRIORITY_MAP.normal,
        callFn,
        resolve,
        reject,
        enqueuedAt: Date.now(),
      };
      this._insertByPriority(item);
      this._emitMetrics();
      this._processNext();
    });
  }

  cancel(agentId) {
    this.queue = this.queue.filter((item) => {
      if (item.agentId === agentId) {
        item.reject(new Error('Cancelled'));
        return false;
      }
      return true;
    });
    this._emitMetrics();
  }

  cancelAll() {
    for (const item of this.queue) {
      item.reject(new Error('Cancelled'));
    }
    this.queue = [];
    this._emitMetrics();
  }

  getMetrics() {
    return {
      queued: this.queue.length,
      inFlight: this.active,
      totalProcessed: this.metrics.totalProcessed,
      totalErrors: this.metrics.totalErrors,
      avgLatencyMs: this.metrics.totalProcessed > 0
        ? Math.round(this.metrics.latencySum / this.metrics.totalProcessed)
        : 0,
    };
  }

  _insertByPriority(item) {
    // Binary insert: lower priority number = higher priority
    let lo = 0;
    let hi = this.queue.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.queue[mid].priority <= item.priority) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    this.queue.splice(lo, 0, item);
  }

  async _processNext() {
    if (this.paused || this.active >= this.concurrency || this.queue.length === 0) return;

    this.active++;
    const item = this.queue.shift();
    this._emitMetrics();

    const startTime = Date.now();

    try {
      const result = await item.callFn();
      const latency = Date.now() - startTime;
      this.metrics.totalProcessed++;
      this.metrics.latencySum += latency;
      item.resolve(result);
    } catch (error) {
      // Handle rate limiting (HTTP 429)
      if (error.status === 429 || error.message?.includes('429')) {
        this._handleRateLimit(error);
        // Re-queue at front with same priority
        this.queue.unshift(item);
      } else {
        this.metrics.totalErrors++;
        item.reject(error);
      }
    } finally {
      this.active--;
      this._emitMetrics();
      // Process next in queue
      this._processNext();
    }
  }

  _handleRateLimit(error) {
    // Parse Retry-After header if available, default to 5s
    const retryAfter = 5000;
    console.warn(`[RequestQueue] Rate limited. Pausing for ${retryAfter}ms`);
    this.paused = true;
    setTimeout(() => {
      this.paused = false;
      // Kick off processing for all available concurrency slots
      for (let i = 0; i < this.concurrency; i++) {
        this._processNext();
      }
    }, retryAfter);
  }

  _emitMetrics() {
    this.onMetrics?.(this.getMetrics());
  }
}
