import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Clock, ShieldCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { matchDocumentFace } from '@/lib/face-checks';
import {
  startLiveVerification, submitLiveVerification, uploadIdentityMedia, verificationErrorKey, type LiveStart,
} from '@/lib/identity-live';
import { DocumentStep, type DocumentInput } from '@/pages/verify/DocumentStep';
import { LiveStep, type LiveCapture } from '@/pages/verify/LiveStep';

type Step = 'consent' | 'document' | 'live' | 'sending' | 'sent';

function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/verify') ? raw : '/';
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => resolve(img);
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image_unreadable')); };
    img.src = url;
  });
}

function extension(blob: Blob, fallback: string): string {
  const sub = blob.type.split('/')[1]?.split(';')[0];
  return sub === 'jpeg' ? 'jpg' : sub || fallback;
}

function StatusCard({ icon, title, body, next }: { icon: React.ReactNode; title: string; body: string; next: string }) {
  const { t } = useLanguage();
  return (
    <Card className="space-y-3 p-4" data-testid="verify-status">
      <h2 className="flex items-center gap-2 text-base font-semibold">{icon}{title}</h2>
      <p className="text-sm text-muted-foreground">{body}</p>
      <Button asChild><Link to={next}>{t('verify.continue')}</Link></Button>
    </Card>
  );
}

/** /verify: in-house live identity verification. Optional at sign-up; required before posting, messaging, supporting and voting. */
export default function Verify() {
  const { t } = useLanguage();
  const { profile, refreshProfile } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const reverify = params.get('reverify') === '1';
  const [start, setStart] = useState<LiveStart | null>(null);
  const [step, setStep] = useState<Step>('consent');
  const [consent, setConsent] = useState(false);
  const [document, setDocument] = useState<DocumentInput | null>(null);
  const [loadError, setLoadError] = useState(false);

  const begin = useCallback(async () => {
    setLoadError(false);
    try {
      setStart(await startLiveVerification(reverify));
    } catch {
      setLoadError(true);
    }
  }, [reverify]);
  useEffect(() => { void begin(); }, [begin]);

  const send = async (capture: LiveCapture) => {
    if (!profile?.id || !document || start?.status !== 'draft') return;
    setStep('sending');
    try {
      const image = await loadImage(document.file);
      const faceMatch = await matchDocumentFace(image, capture.descriptor).catch(() => ({ passed: false, distance: null, reason: 'check_failed' }));
      URL.revokeObjectURL(image.src);
      const documentPath = await uploadIdentityMedia(profile.id, start.caseId, `document.${extension(document.file, 'jpg')}`, document.file);
      const videoPath = await uploadIdentityMedia(profile.id, start.caseId, `live.${extension(capture.video, 'webm')}`, capture.video);
      await submitLiveVerification({ videoPath, documentPath, mrz: document.mrz, liveness: capture.liveness, faceMatch });
      setStep('sent');
      void refreshProfile();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(t(verificationErrorKey(message)));
      if (message.includes('challenge_expired') || message.includes('start_first')) {
        setStep('consent');
        await begin();
      } else {
        setStep('live');
      }
    }
  };

  let body: React.ReactNode;
  if (loadError) {
    body = (
      <Card className="space-y-3 p-4">
        <p className="text-sm text-destructive" role="alert">{t('verify.errors.generic')}</p>
        <Button type="button" variant="outline" onClick={() => void begin()}>{t('verify.live.retry')}</Button>
      </Card>
    );
  } else if (!start) {
    body = <p className="text-sm text-muted-foreground">{t('verify.loading')}</p>;
  } else if (start.status === 'verified') {
    body = <StatusCard icon={<ShieldCheck className="h-5 w-5 text-primary" aria-hidden />} title={t('verify.verified.title')} body={t('verify.verified.body')} next={next} />;
  } else if (step === 'sent' || start.status !== 'draft') {
    const again = 'reverification' in start && start.reverification;
    body = <StatusCard icon={<Clock className="h-5 w-5 text-primary" aria-hidden />} title={t(again ? 'verify.reverify.sentTitle' : 'verify.sent.title')}
      body={t(again ? 'verify.reverify.sentBody' : 'verify.sent.body')} next={next} />;
  } else if (step === 'consent') {
    body = (
      <Card className="space-y-4 p-4" data-testid="verify-consent-step">
        <h2 className="text-base font-semibold">{t('verify.consent.title')}</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>{t('verify.consent.what')}</li>
          <li>{t('verify.consent.device')}</li>
          <li>{t('verify.consent.who')}</li>
          <li>{t('verify.consent.keep')}</li>
        </ul>
        <p className="text-sm">
          <Link to="/privacy" className="underline">{t('verify.consent.privacy')}</Link>
        </p>
        <div className="flex items-start gap-2">
          <Checkbox id="verify-consent" data-testid="verify-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
          <Label htmlFor="verify-consent" className="text-sm font-normal leading-snug">{t('verify.consent.agree')}</Label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to={next}>{t('verify.prompt.later')}</Link></Button>
          <Button type="button" data-testid="verify-consent-next" disabled={!consent} onClick={() => setStep('document')}>{t('verify.next')}</Button>
        </div>
      </Card>
    );
  } else if (step === 'document') {
    body = <DocumentStep onBack={() => setStep('consent')} onNext={(input) => { setDocument(input); setStep('live'); }} />;
  } else if (step === 'live') {
    body = <LiveStep challenge={start.challenge} onBack={() => setStep('document')} onDone={(capture) => void send(capture)} />;
  } else {
    body = <p className="text-sm text-muted-foreground" aria-live="polite" data-testid="verify-sending">{t('verify.sending')}</p>;
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <AppPageHeader title={t('verify.title')} subtitle={t('verify.subtitle')} />
        {body}
      </div>
    </AppLayout>
  );
}
