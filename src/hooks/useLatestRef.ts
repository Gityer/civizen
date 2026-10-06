import { useEffect, useRef } from 'react';

/**
 * Ref that always holds the latest value. Read it inside effects, timers and callbacks that must
 * use current props/state without being re-created (or re-run) every time that value changes.
 * Declare it before the effects that read it so it is updated first within each commit.
 */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}
