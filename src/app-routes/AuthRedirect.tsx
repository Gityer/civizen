import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { resolveAuthReturnPath } from '@/lib/auth-return-path';
import { clearPendingAuthReturn, peekPendingAuthReturn } from '@/lib/pending-auth-return';

export function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  // Read during render, clear after: render must stay free of storage side effects.
  useEffect(() => {
    if (user && !loading) clearPendingAuthReturn();
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (user) {
    return (
      <Navigate
        to={resolveAuthReturnPath(location.state, peekPendingAuthReturn() ?? '/')}
        replace
      />
    );
  }

  return <>{children}</>;
}
