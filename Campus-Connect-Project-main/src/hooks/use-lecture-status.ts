'use client';

import { useState, useEffect } from 'react';
import { parse, format } from 'date-fns';

export type LectureActiveStatus = 'upcoming' | 'active' | 'ended';

interface UseLectureStatusOptions {
  timeFrom: string;   // e.g. "07:40"
  timeTo: string;     // e.g. "08:25"
  day: string;        // e.g. "Monday"
}

interface UseLectureStatusResult {
  isActive: boolean;
  status: LectureActiveStatus;
  isMounted: boolean;
}

/**
 * Hook that determines whether a lecture is currently active based on a ±10 minute window.
 *
 * Active window: (timeFrom - 10 min) to (timeTo + 10 min)
 * - 'upcoming': current time is before (timeFrom - 10 min)
 * - 'active':   current time is within the window
 * - 'ended':    current time is after (timeTo + 10 min), or the lecture is on a different day
 *
 * Re-evaluates every 30 seconds so cards update in real-time.
 */
export function useLectureStatus({ timeFrom, timeTo, day }: UseLectureStatusOptions): UseLectureStatusResult {
  const [status, setStatus] = useState<LectureActiveStatus>('upcoming');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    function computeStatus(): LectureActiveStatus {
      try {
        const now = new Date();

        // If the lecture day doesn't match today, treat as ended
        if (day !== format(now, 'EEEE')) {
          return 'ended';
        }

        if (!timeFrom || !timeTo) {
          return 'ended';
        }

        const start = parse(timeFrom, 'HH:mm', now);
        const end = parse(timeTo, 'HH:mm', now);

        // Active window: 10 minutes before start to 10 minutes after end
        const BUFFER_MS = 10 * 60 * 1000; // 10 minutes in milliseconds
        const windowStart = new Date(start.getTime() - BUFFER_MS);
        const windowEnd = new Date(end.getTime() + BUFFER_MS);

        if (now < windowStart) return 'upcoming';
        if (now > windowEnd) return 'ended';
        return 'active';
      } catch (e) {
        console.error('Failed to compute lecture status', { timeFrom, timeTo, day }, e);
        return 'ended';
      }
    }

    setStatus(computeStatus());

    // Re-check every 30 seconds
    const interval = setInterval(() => {
      setStatus(computeStatus());
    }, 30_000);

    return () => clearInterval(interval);
  }, [isMounted, timeFrom, timeTo, day]);

  return {
    isActive: status === 'active',
    status,
    isMounted,
  };
}
