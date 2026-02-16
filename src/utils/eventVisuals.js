// Shared event visualization config
// Colors, sizing, and ripple params keyed by event type and importance

export const eventTypeColors = {
  spawn: 'hsl(150, 70%, 50%)',     // Green
  complete: 'hsl(210, 70%, 50%)',   // Blue
  pause: 'hsl(45, 60%, 50%)',       // Gold
  resume: 'hsl(45, 60%, 50%)',      // Gold
  input: 'hsl(30, 80%, 55%)',       // Orange/Accent
  activity: 'hsl(210, 30%, 50%)',   // Muted blue
  status: 'hsl(280, 50%, 50%)',     // Purple
  error: 'hsl(0, 80%, 55%)',        // Red
};

export const importanceConfig = {
  critical: {
    rippleRings: 3,
    rippleMaxRadius: 120,
    rippleDuration: 3000,
    annotationLifetime: 8000,
    annotationVisible: true,
    zoomThreshold: 0, // visible at all zoom levels
  },
  important: {
    rippleRings: 2,
    rippleMaxRadius: 80,
    rippleDuration: 2000,
    annotationLifetime: 5000,
    annotationVisible: true,
    zoomThreshold: 0.4,
  },
  normal: {
    rippleRings: 1,
    rippleMaxRadius: 40,
    rippleDuration: 1500,
    annotationLifetime: 3000,
    annotationVisible: true,
    zoomThreshold: 1.0,
  },
  debug: {
    rippleRings: 0,
    rippleMaxRadius: 0,
    rippleDuration: 0,
    annotationLifetime: 0,
    annotationVisible: false,
    zoomThreshold: Infinity,
  },
};

/**
 * Get the display color for an event by type.
 */
export function getEventColor(type) {
  return eventTypeColors[type] || 'hsl(210, 30%, 50%)';
}

/**
 * Get ripple configuration for an event.
 */
export function getRippleConfig(importance) {
  return importanceConfig[importance] || importanceConfig.normal;
}

/**
 * Check if an annotation should be visible at the given zoom level.
 */
export function isAnnotationVisibleAtZoom(importance, zoomK) {
  const config = importanceConfig[importance];
  if (!config?.annotationVisible) return false;
  return zoomK >= config.zoomThreshold;
}

/**
 * Bucket events into time columns for the PulseBar timeline.
 * @param {Array} events - Array of event objects with timestamp
 * @param {number} bucketMs - Bucket width in milliseconds
 * @param {number} windowMs - Total time window
 * @returns {Array} Array of bucket objects
 */
export function bucketEvents(events, bucketMs = 3000, windowMs = 300000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  const bucketCount = Math.ceil(windowMs / bucketMs);
  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    startTime: windowStart + i * bucketMs,
    endTime: windowStart + (i + 1) * bucketMs,
    events: [],
    counts: { spawn: 0, complete: 0, error: 0, input: 0, status: 0, activity: 0, pause: 0, resume: 0 },
    total: 0,
  }));

  for (const event of events) {
    const t = event.timestamp instanceof Date ? event.timestamp.getTime() : event.timestamp;
    if (t < windowStart) continue;

    const bucketIndex = Math.min(
      Math.floor((t - windowStart) / bucketMs),
      bucketCount - 1
    );
    if (bucketIndex >= 0) {
      buckets[bucketIndex].events.push(event);
      buckets[bucketIndex].total++;
      const type = event.type || 'status';
      if (type in buckets[bucketIndex].counts) {
        buckets[bucketIndex].counts[type]++;
      }
    }
  }

  return buckets;
}
