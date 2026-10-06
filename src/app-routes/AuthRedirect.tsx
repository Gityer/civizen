import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { resolveAuthReturnPath } from '@/lib/auth-return-path';

export function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={resolveAuthReturnPath(location.state)} replace />;
  }

  return <>{children}</>;
}
