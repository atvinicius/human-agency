// Hook to bucket events into time columns for the PulseBar
// Re-computes on event changes and every 3 seconds (to advance the "now" marker)

import { useState, useEffect, useMemo } from 'react';
import { bucketEvents } from '../utils/eventVisuals';

const BUCKET_MS = 3000;
const WINDOW_MS = 300000; // 5 minutes

export default function useTimelineBuckets(events) {
  const [tick, setTick] = useState(0);

  // Update every 3s to keep the timeline current
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), BUCKET_MS);
    return () => clearInterval(interval);
  }, []);

  const buckets = useMemo(
    () => bucketEvents(events, BUCKET_MS, WINDOW_MS),
    [events, tick]
  );

  const maxCount = useMemo(
    () => Math.max(1, ...buckets.map((b) => b.total)),
    [buckets]
  );

  return { buckets, maxCount, bucketMs: BUCKET_MS, windowMs: WINDOW_MS };
}
