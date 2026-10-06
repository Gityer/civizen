import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { clearPendingAuthReturn, peekPendingAuthReturn } from '@/lib/pending-auth-return';

/**
 * After an email-confirmation link lands a new member on the home page, send them on to the
 * page they were trying to reach (for example the ballot). Only acts on "/", once.
 */
export function PendingAuthReturnRedirect() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user || location.pathname !== '/') return;
    const pending = peekPendingAuthReturn();
    if (!pending) return;
    clearPendingAuthReturn();
    navigate(pending, { replace: true });
  }, [loading, user, location.pathname, navigate]);

  return null;
}
