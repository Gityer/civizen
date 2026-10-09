import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { proposeKnowledgeGap, proposeKnowledgeResource } from '@/lib/knowledge-api';

type Mode = 'closed' | 'resource' | 'gap';

/**
 * Members who do not run a knowledge space can still propose a resource or report a gap (Phase 4 step 4.3).
 * Proposals land as drafts the coordinators review; the proposer is told when a resource goes live.
 */
export function KnowledgeProposalPanel({ spaceId, onSubmitted }: { spaceId: string; onSubmitted?: () => void }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>('closed');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setTitle('');
    setSummary('');
    setUrl('');
    setMode('closed');
  };

  const submit = async () => {
    if (title.trim().length < 3 || summary.trim().length < 3) {
      toast.error(t('contribute.knowledge.proposeValidation'));
      return;
    }
    setBusy(true);
    try {
      if (mode === 'resource') {
        await proposeKnowledgeResource({ spaceId, title: title.trim(), summary: summary.trim(), externalUrl: url.trim() || null });
        toast.success(t('contribute.knowledge.proposeResourceSent'));
      } else {
        await proposeKnowledgeGap({ spaceId, title: title.trim(), description: summary.trim() });
        toast.success(t('contribute.knowledge.reportGapSent'));
      }
      reset();
      onSubmitted?.();
    } catch {
      toast.error(t('contribute.knowledge.proposeFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'closed') {
    return (
      <div className="flex flex-wrap gap-2" data-testid="knowledge-proposal-actions">
        <Button type="button" size="sm" variant="outline" onClick={() => setMode('resource')}>
          {t('contribute.knowledge.proposeResource')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setMode('gap')}>
          {t('contribute.knowledge.reportGap')}
        </Button>
      </div>
    );
  }

  return (
    <Card className="space-y-3 border-border/70 p-4" data-testid="knowledge-proposal-form">
      <p className="text-sm font-medium text-foreground">
        {t(mode === 'resource' ? 'contribute.knowledge.proposeResource' : 'contribute.knowledge.reportGap')}
      </p>
      <p className="text-xs text-muted-foreground">{t('contribute.knowledge.proposeHint')}</p>
      <div className="space-y-2">
        <Label htmlFor="knowledge-proposal-title">{t('contribute.knowledge.proposeTitle')}</Label>
        <Input id="knowledge-proposal-title" value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="knowledge-proposal-summary">
          {t(mode === 'resource' ? 'contribute.knowledge.proposeSummary' : 'contribute.knowledge.gapDescription')}
        </Label>
        <Textarea id="knowledge-proposal-summary" rows={3} maxLength={mode === 'resource' ? 400 : 2000} value={summary} onChange={(event) => setSummary(event.target.value)} />
      </div>
      {mode === 'resource' ? (
        <div className="space-y-2">
          <Label htmlFor="knowledge-proposal-url">{t('contribute.knowledge.proposeUrl')}</Label>
          <Input id="knowledge-proposal-url" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy} onClick={() => void submit()}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          {t('contribute.knowledge.proposeSend')}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={reset}>
          {t('common.cancel')}
        </Button>
      </div>
    </Card>
  );
}
