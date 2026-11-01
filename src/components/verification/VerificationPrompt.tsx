import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { VERIFICATION_REQUIRED_EVENT, verifyPath } from '@/lib/identity-live';

/**
 * Shown when the member tried something that needs a verified identity: verify now (and come back here), or later.
 * Mounted once at the app root; any refused request raises it (see verification-signal.ts).
 */
export function VerificationPrompt() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [next, setNext] = useState<string | null>(null);

  useEffect(() => {
    const onRequired = (event: Event) => {
      const detail = (event as CustomEvent<{ next?: string }>).detail;
      if (window.location.pathname.startsWith('/verify')) return;
      setNext(detail?.next ?? '/');
    };
    window.addEventListener(VERIFICATION_REQUIRED_EVENT, onRequired);
    return () => window.removeEventListener(VERIFICATION_REQUIRED_EVENT, onRequired);
  }, []);

  return (
    <Dialog open={next !== null} onOpenChange={(open) => { if (!open) setNext(null); }}>
      <DialogContent data-testid="verification-prompt">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" aria-hidden />{t('verify.prompt.title')}</DialogTitle>
          <DialogDescription>{t('verify.prompt.body')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => setNext(null)}>{t('verify.prompt.later')}</Button>
          <Button type="button" data-testid="verification-prompt-start" onClick={() => { const target = next ?? '/'; setNext(null); navigate(verifyPath(target)); }}>
            {t('verify.prompt.start')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
