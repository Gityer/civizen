import { useState } from 'react';
import { Download, KeyRound, Loader2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { downloadJson, exportFileName, exportMyData } from '@/lib/account-export';

/**
 * Account lifecycle (Phase 3 step 3.5): change the sign-in e-mail, change the password after proving the
 * current one, export everything as JSON, and reach account deletion (Settings > Privacy).
 */
export default function AccountSettings() {
  const { session, profile } = useAuth();
  const { t } = useLanguage();
  const currentEmail = session?.user.email ?? '';
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState<'email' | 'password' | 'export' | null>(null);

  const changeEmail = async () => {
    const next = email.trim().toLowerCase();
    if (!next || next === currentEmail.toLowerCase()) return;
    setBusy('email');
    const { error } = await supabase.auth.updateUser({ email: next });
    setBusy(null);
    if (error) {
      toast.error(t('settings.account.emailFailed'));
      return;
    }
    setEmail('');
    toast.success(t('settings.account.emailPending', { email: next }));
  };

  const changePassword = async () => {
    if (!currentEmail || newPassword.length < 6) return;
    setBusy('password');
    const check = await supabase.auth.signInWithPassword({ email: currentEmail, password: currentPassword });
    if (check.error) {
      setBusy(null);
      toast.error(t('settings.account.currentPasswordWrong'));
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(null);
    if (error) {
      toast.error(t('settings.account.passwordFailed'));
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    toast.success(t('settings.account.passwordChanged'));
  };

  const exportData = async () => {
    setBusy('export');
    try {
      const data = await exportMyData();
      downloadJson(exportFileName(profile?.username), data);
      toast.success(t('settings.account.exportReady'));
    } catch {
      toast.error(t('settings.account.exportFailed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4 px-4 py-6">
        <AppPageHeader title={t('settings.account.title')} subtitle={t('settings.account.subtitle')} fallbackPath="/settings" />

        <Card className="space-y-3 border-border/80 p-4" data-testid="account-email-card">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="text-sm font-semibold text-foreground">{t('settings.account.emailTitle')}</h2>
          </div>
          <p className="text-xs text-muted-foreground">{t('settings.account.emailBody', { email: currentEmail })}</p>
          <div className="space-y-2">
            <Label htmlFor="account-new-email">{t('settings.account.newEmail')}</Label>
            <Input id="account-new-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <Button type="button" size="sm" disabled={busy !== null || !email.trim()} onClick={() => void changeEmail()}>
            {busy === 'email' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {t('settings.account.changeEmail')}
          </Button>
        </Card>

        <Card className="space-y-3 border-border/80 p-4" data-testid="account-password-card">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="text-sm font-semibold text-foreground">{t('settings.account.passwordTitle')}</h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-current-password">{t('settings.account.currentPassword')}</Label>
            <Input id="account-current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-new-password">{t('settings.account.newPassword')}</Label>
            <Input id="account-new-password" type="password" autoComplete="new-password" minLength={6} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          </div>
          <Button type="button" size="sm" disabled={busy !== null || !currentPassword || newPassword.length < 6} onClick={() => void changePassword()}>
            {busy === 'password' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {t('settings.account.changePassword')}
          </Button>
        </Card>

        <Card className="space-y-3 border-border/80 p-4" data-testid="account-export-card">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="text-sm font-semibold text-foreground">{t('settings.account.exportTitle')}</h2>
          </div>
          <p className="text-xs text-muted-foreground">{t('settings.account.exportBody')}</p>
          <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void exportData()}>
            {busy === 'export' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {t('settings.account.exportAction')}
          </Button>
        </Card>

        <p className="text-xs text-muted-foreground">
          {t('settings.account.deleteHint')}{' '}
          <Link to="/settings/privacy" className="font-medium text-primary hover:underline">
            {t('settings.privacy')}
          </Link>
        </p>
      </div>
    </AppLayout>
  );
}
