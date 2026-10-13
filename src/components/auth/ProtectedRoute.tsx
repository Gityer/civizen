import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { TermsReconsentGate } from '@/components/auth/TermsReconsentGate';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { permissionListHasAny, type AppPermission } from '@/lib/access-control';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermissions?: AppPermission[];
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredPermissions,
  redirectTo = '/',
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  // Auth unblocks as soon as the session is known; profile/permissions load next.
  // Do not treat a missing profile as "denied" or refresh will bounce admin routes to Home.
  if (requiredPermissions?.length && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (
    requiredPermissions?.length &&
    profile &&
    // Decision E5: founders pass on their permissions like everyone else; only system agents skip the check.
    profile.role !== 'system' &&
    !permissionListHasAny(profile.effective_permissions || [], requiredPermissions)
  ) {
    return <Navigate to={redirectTo} replace />;
  }

  return <TermsReconsentGate>{children}</TermsReconsentGate>;
}
