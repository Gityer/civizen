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
import { blockProfile } from '@/lib/profile-blocks';
import {
  REPORT_CATEGORIES,
  isReportReasonLongEnough,
  loadReportTarget,
  submitContentReport,
  type ReportCategory,
  type ReportTarget,
  type ReportTargetKind,
} from '@/lib/user-reports';

/** Report a person (/report/user/:targetId) or one of their posts (/report/post/:targetId). */
export default function ReportContent({ kind = 'user' }: { kind?: ReportTargetKind }) {
  const { targetId } = useParams<{ targetId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [target, setTarget] = useState<ReportTarget | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [category, setCategory] = useState<ReportCategory>('harassment');
  const [reason, setReason] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!targetId) return;
    let cancelled = false;
    void loadReportTarget(kind, targetId).then((loaded) => {
      if (cancelled) return;
      if (!loaded) setNotFound(true);
      else setTarget(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [kind, targetId]);

  const isSelf = Boolean(profile?.id && target && profile.id === target.profileId);
  const titleKey = kind === 'post' ? 'settings.reportUser.postTitle' : 'settings.reportUser.title';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.id || !target || isSelf) return;
    if (!isReportReasonLongEnough(reason)) {
      toast.error(t('settings.reportUser.tooShort'));
      return;
    }
    setSubmitting(true);
    const { error } = await submitContentReport({ reporterProfileId: profile.id, target, category, reason });
    if (!error && alsoBlock) {
      await blockProfile(target.profileId);
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
          title={target?.displayName ? `${t(titleKey)}: ${target.displayName}` : t(titleKey)}
          subtitle={t('settings.reportUser.subtitle')}
          fallbackPath={kind === 'user' && targetId ? `/user/${targetId}` : '/'}
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
              {target?.excerpt ? (
                <blockquote className="border-l-2 border-border pl-3 text-sm text-muted-foreground">{target.excerpt}</blockquote>
              ) : null}
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

              <Button type="submit" variant="destructive" disabled={submitting || !profile?.id || !target} className="w-full">
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
