import { useEffect, useRef } from 'react';

type Options = {
  enabled: boolean;
  checkForUpdates: () => Promise<void>;
  onDisabled: () => void;
  waitingForPermission: () => boolean;
  onReturnWhileWaiting: () => void;
  onCleanup: () => void;
};

/**
 * Re-checks the Android update manifest when the app becomes visible or focused again, and tells the prompt when
 * the member came back from the install-permission settings screen instead of checking again.
 */
export function useAppUpdateRecheck(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const { enabled, checkForUpdates } = options;

  useEffect(() => {
    if (!enabled) {
      latest.current.onDisabled();
      return;
    }
    const onReturn = () => {
      if (latest.current.waitingForPermission()) {
        latest.current.onReturnWhileWaiting();
        return;
      }
      void checkForUpdates();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') onReturn();
    };
    void checkForUpdates();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', onReturn);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', onReturn);
      latest.current.onCleanup();
    };
  }, [checkForUpdates, enabled]);
}
