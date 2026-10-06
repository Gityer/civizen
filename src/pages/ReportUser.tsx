import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Flag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { blockProfile } from '@/lib/profile-blocks';
import { REPORT_CATEGORIES, isReportReasonLongEnough, submitProfileReport, type ReportCategory } from '@/lib/user-reports';

export default function ReportUser() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [targetName, setTargetName] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [category, setCategory] = useState<ReportCategory>('harassment');
  const [reason, setReason] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .eq('id', userId)
        .is('deleted_at', null)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        setNotFound(true);
        return;
      }
      setTargetName(data.full_name || (data.username ? `@${data.username}` : null));
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isSelf = Boolean(profile?.id && userId && profile.id === userId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.id || !userId || isSelf) return;
    if (!isReportReasonLongEnough(reason)) {
      toast.error(t('settings.reportUser.tooShort'));
      return;
    }
    setSubmitting(true);
    const { error } = await submitProfileReport({
      reporterProfileId: profile.id,
      reportedProfileId: userId,
      category,
      reason,
    });
    if (!error && alsoBlock) {
      await blockProfile(userId);
    }
    setSubmitting(false);
    if (error) {
      toast.error(t('settings.reportUser.failed'));
      return;
    }
    toast.success(t('settings.reportUser.submitted'));
    navigate(-1);
  };

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6">
        <AppPageHeader
          title={targetName ? `${t('settings.reportUser.title')}: ${targetName}` : t('settings.reportUser.title')}
          subtitle={t('settings.reportUser.subtitle')}
          fallbackPath={userId ? `/user/${userId}` : '/'}
          leading={
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <Flag className="h-6 w-6" />
            </div>
          }
        />

        {notFound ? (
          <Card className="border-border/80 p-4 text-sm">{t('settings.reportUser.notFound')}</Card>
        ) : isSelf ? (
          <Card className="border-border/80 p-4 text-sm">{t('settings.reportUser.self')}</Card>
        ) : (
          <Card className="border-border/80 p-4">
            <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-foreground">{t('settings.reportUser.categoryLabel')}</legend>
                <RadioGroup value={category} onValueChange={(value) => setCategory(value as ReportCategory)}>
                  {REPORT_CATEGORIES.map((option) => (
                    <div key={option} className="flex items-center gap-2">
                      <RadioGroupItem id={`report-category-${option}`} value={option} />
                      <Label htmlFor={`report-category-${option}`} className="font-normal">
                        {t(`settings.reportUser.categories.${option}`)}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </fieldset>

              <div className="space-y-2">
                <Label htmlFor="report-reason">{t('settings.reportUser.reasonLabel')}</Label>
                <Textarea
                  id="report-reason"
                  value={reason}
                  maxLength={2000}
                  rows={5}
                  placeholder={t('settings.reportUser.reasonPlaceholder')}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="report-also-block" checked={alsoBlock} onCheckedChange={(checked) => setAlsoBlock(checked === true)} />
                <Label htmlFor="report-also-block" className="font-normal">{t('settings.reportUser.blockToo')}</Label>
              </div>

              <Button type="submit" variant="destructive" disabled={submitting || !profile?.id} className="w-full">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('settings.reportUser.submit')}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
