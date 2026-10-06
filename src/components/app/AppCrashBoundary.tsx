import { Component, type ErrorInfo, type ReactNode } from 'react';

import {
  clearChunkRecoveryFlag,
  getErrorMessage,
  isChunkLoadError,
  reloadForNewDeployment,
} from '@/lib/chunk-load-recovery';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string | null;
  isChunkError: boolean;
};

function sanitizeKnownLocalStorageKeys() {
  if (typeof window === 'undefined') return;

  const keysToValidateAsJson = [
    'customPillarCustomizations',
  ];

  keysToValidateAsJson.forEach((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    try {
      JSON.parse(raw);
    } catch {
      window.localStorage.removeItem(key);
    }
  });
}

export class AppCrashBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: null,
    isChunkError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'Unknown error',
      isChunkError: isChunkLoadError(error),
    };
  }

  componentDidMount() {
    sanitizeKnownLocalStorageKeys();
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught app error:', error, errorInfo);

    // Stale hashed chunks after a web deploy — recover without trapping the user.
    if (isChunkLoadError(error)) {
      reloadForNewDeployment(error);
    }
  }

  private handleReload = () => {
    clearChunkRecoveryFlag();
    if (!reloadForNewDeployment(this.state.message)) {
      window.location.reload();
    }
  };

  private handleResetLocalCache = () => {
    if (typeof window === 'undefined') return;

    const safePrefixes = [
      'civizen-',
      'customPillar',
      'sb-',
    ];

    const keysToRemove = Object.keys(window.localStorage).filter((key) =>
      safePrefixes.some((prefix) => key.startsWith(prefix)),
    );

    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    clearChunkRecoveryFlag();
    this.handleReload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const title = this.state.isChunkError ? 'Civizen updated' : 'Civizen hit a startup issue';
    const description = this.state.isChunkError
      ? 'A newer version of the site is available. Reloading picks up the latest files.'
      : 'We can recover safely by reloading, or resetting local cache if needed.';

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card/80 p-6 space-y-4">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
          {this.state.message && (
            <p className="text-xs text-muted-foreground wrap-break-word">
              Error: {getErrorMessage(this.state.message)}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              className="inline-flex h-10 min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
              onClick={this.handleReload}
            >
              Reload app
            </button>
            {!this.state.isChunkError && (
              <button
                type="button"
                className="inline-flex h-10 min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium"
                onClick={this.handleResetLocalCache}
              >
                Reset local cache
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
