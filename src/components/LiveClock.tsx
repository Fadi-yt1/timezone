'use client';

import { useEffect, useState } from 'react';

/**
 * Shared ticking clock.
 *
 * Every consumer renders `initialNow` (the server's timestamp) on its first
 * pass, so hydration matches exactly; the interval takes over afterwards.
 */
export function useNow(initialNow: number, intervalMs = 1000): number {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
