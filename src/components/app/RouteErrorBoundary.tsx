import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { isChunkLoadError } from '@/lib/chunk-load-recovery';

type Labels = { title: string; body: string; retry: string; home: string };

type BoundaryProps = { children: ReactNode; labels: Labels };
type BoundaryState = { error: Error | null };

class PageBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Page crashed:', error, errorInfo);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    // Stale chunks after a deploy are handled by the app-level boundary, which reloads once.
    if (isChunkLoadError(error)) throw error;

    const { labels } = this.props;
    return (
      <div role="alert" className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-xl font-semibold text-foreground">{labels.title}</h1>
        <p className="text-sm text-muted-foreground">{labels.body}</p>
        <div className="flex gap-2">
          <Button type="button" onClick={() => this.setState({ error: null })}>{labels.retry}</Button>
          <Button type="button" variant="outline" onClick={() => window.location.assign('/')}>{labels.home}</Button>
        </div>
      </div>
    );
  }
}

/**
 * Keeps one broken page from taking down the whole app: the error shows in place of the page,
 * and moving to another route starts fresh.
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { t } = useLanguage();
  const labels: Labels = {
    title: t('settings.routeError.title'),
    body: t('settings.routeError.body'),
    retry: t('settings.routeError.retry'),
    home: t('settings.routeError.home'),
  };
  return (
    <PageBoundary key={location.pathname} labels={labels}>
      {children}
    </PageBoundary>
  );
}
