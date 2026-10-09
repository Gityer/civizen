import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { CollaborationAgreementView } from '@/components/agreements/CollaborationAgreementView';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAgreementDetail, isCollaborationAgreement, type AgreementDetailBundle } from '@/lib/agreements-api';
import { isMissingAgreementsBackend } from '@/lib/agreements-backend';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** One agreement system (Phase 6 step 6.1): every agreement opens in the collaboration document view. */
export default function AgreementDetail() {
  const { agreementId } = useParams<{ agreementId: string }>();
  const { t } = useLanguage();
  const [bundle, setBundle] = useState<AgreementDetailBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendMissing, setBackendMissing] = useState(false);

  const load = useCallback(async () => {
    if (!agreementId || !UUID_RE.test(agreementId)) {
      setBundle(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const detail = await getAgreementDetail(agreementId);
      setBundle(detail && isCollaborationAgreement(detail) ? detail : null);
      setBackendMissing(false);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '';
      setBackendMissing(isMissingAgreementsBackend({ message }));
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, [agreementId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <AppLayout>
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">{t('common.loading')}</div>
      </AppLayout>
    );
  }

  if (backendMissing) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-2xl px-4 py-8">
          <Card className="rounded-2xl border-border/60 p-5 text-sm text-muted-foreground">{t('agreements.backendUnavailable')}</Card>
        </div>
      </AppLayout>
    );
  }

  if (!bundle) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md space-y-4 px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">{t('agreements.notFound')}</p>
          <Button type="button" variant="outline" asChild>
            <Link to="/agreements">{t('agreements.backToList')}</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <CollaborationAgreementView bundle={bundle} onReload={load} />
    </AppLayout>
  );
}
