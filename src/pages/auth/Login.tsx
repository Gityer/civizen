import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserRound, Lock, ArrowRight, Fingerprint } from 'lucide-react';
import { PublicAuthHeader } from '@/components/public/PublicAuthHeader';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { resolvePostAuthPath } from '@/lib/pending-auth-return';
import { isEmailIdentifier } from '@/lib/sign-in-with-identifier';
import { toast } from 'sonner';
import { getBiometricSignInCapability } from '@/lib/biometric-sign-in';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, resendSignUpConfirmation, signInWithBiometrics } = useAuth();
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricReady, setBiometricReady] = useState(false);

  useEffect(() => {
    let active = true;
    void getBiometricSignInCapability().then((capability) => {
      if (active) setBiometricReady(capability.canUnlock);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await signIn(identifier, password);

      if (error) {
        setError(error.message);
        return;
      }

      navigate(resolvePostAuthPath(location.state));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    const { error: resendError } = await resendSignUpConfirmation(identifier);
    setResending(false);
    if (resendError) toast.error(t('auth.resendConfirmationFailed'));
    else toast.success(t('auth.resendConfirmationSent'));
  };

  const handleBiometricSignIn = async () => {
    setBiometricLoading(true);
    setError(null);
    const { error } = await signInWithBiometrics({
      reason: t('auth.biometricPromptReason'),
    });
    if (error) {
      setError(error.message);
      setBiometricLoading(false);
      return;
    }
    navigate(resolvePostAuthPath(location.state));
  };

  return (
    <PublicPageShell
      contentClassName="flex flex-col justify-center px-6 py-12"
      maxWidthClass="max-w-sm"
      sectionTrail={[{ label: t('auth.loginTitle') }]}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-sm"
      >
          <PublicAuthHeader title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')} />

          {biometricReady ? (
            <div className="mb-6 space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                disabled={loading || biometricLoading}
                onClick={() => void handleBiometricSignIn()}
              >
                <Fingerprint className="w-4 h-4" />
                {biometricLoading ? t('auth.biometricSigningIn') : t('auth.biometricSignIn')}
              </Button>
              <p className="text-center text-xs text-muted-foreground">{t('auth.biometricOrPassword')}</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">{t('auth.loginIdentifier')}</Label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="identifier"
                  type="text"
                  placeholder={t('auth.loginIdentifierPlaceholder')}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                  {t('auth.forgotPassword')}
                </Link>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-destructive"
              >
                {error}
                {error.toLowerCase().includes('not confirmed') && isEmailIdentifier(identifier) && (
                  <span className="block mt-1 text-muted-foreground">
                    {t('auth.emailNotConfirmedHint')}{' '}
                    <button
                      type="button"
                      className="text-primary hover:underline font-medium"
                      disabled={resending}
                      onClick={() => void handleResend()}
                      data-testid="resend-confirmation"
                    >
                      {resending ? t('auth.sending') : t('auth.resendConfirmation')}
                    </button>
                  </span>
                )}
                {error.toLowerCase().includes('invalid login credentials') && (
                  <span className="block mt-1 text-muted-foreground">
                    {t('auth.invalidCredentialsPrefix')}{' '}
                    <Link to="/forgot-password" className="text-primary hover:underline font-medium">
                      {t('auth.forgotPassword')}
                    </Link>
                    .
                  </span>
                )}
              </motion.p>
            )}

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={loading || biometricLoading}
            >
              {loading ? t('auth.signingIn') : t('auth.signIn')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            {t('auth.dontHaveAccount')}{' '}
            <Link to="/signup" state={location.state} className="text-primary hover:underline font-medium">
              {t('auth.signUpLink')}
            </Link>
          </p>
          <p className="text-center mt-3 text-sm text-muted-foreground">
            <Link to="/download" className="text-primary hover:underline font-medium">
              {t('auth.downloadAndroid')}
            </Link>
          </p>
        </motion.div>
    </PublicPageShell>
  );
}
