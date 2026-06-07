import { useEffect, useState } from 'react';

export type FocusPauseState = {
  isPaused: boolean;
  pausedMs: number;
  pausedAtMs: number | null;
};

export function computeFocusElapsedMs(
  startedAtIso: string,
  nowMs: number,
  pauseState: FocusPauseState,
): number {
  const startedMs = new Date(startedAtIso).getTime();
  let elapsedMs = nowMs - startedMs - pauseState.pausedMs;
  if (pauseState.isPaused && pauseState.pausedAtMs !== null) {
    elapsedMs -= nowMs - pauseState.pausedAtMs;
  }
  return Math.max(0, elapsedMs);
}

export function formatElapsedMs(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number): string => String(value).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function useFocusClock(startedAtIso: string | null): number {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (startedAtIso === null) {
      return;
    }
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [startedAtIso]);

  return nowMs;
}
