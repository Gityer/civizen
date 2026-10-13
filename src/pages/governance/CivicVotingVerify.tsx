import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Download, Loader2, XCircle } from 'lucide-react';

import { CivicVotingPageShell } from '@/components/governance/CivicVotingPageShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  computeMerkleRoot,
  fetchElectionAuditAnchor,
  fetchElectionReceipts,
  fetchMerkleRoot,
  fetchReceiptProof,
  verifyReceiptProof,
  type ElectionAuditAnchor,
} from '@/lib/civic-voting/merkle';
import { PUBLIC_SOURCE_REPOSITORY } from '@/lib/public-source';

type ElectionSummary = { id: string; title: string; status: string; voting_closes_at: string | null; ballot_box_commitment: string | null };
type Check = 'idle' | 'running' | 'match' | 'mismatch' | 'error';

function Hash({ value }: { value: string | null | undefined }) {
  return <code className="break-all rounded bg-muted px-1.5 py-0.5 text-xs">{value || '—'}</code>;
}

function Verdict({ state, okKey, badKey }: { state: Check; okKey: string; badKey: string }) {
  const { t } = useLanguage();
  if (state === 'running') return <Loader2 className="h-4 w-4 animate-spin" aria-hidden />;
  if (state === 'match') return <p className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400" role="status"><CheckCircle2 className="h-4 w-4" aria-hidden />{t(okKey)}</p>;
  if (state === 'mismatch') return <p className="flex items-center gap-1.5 text-sm text-destructive" role="status"><XCircle className="h-4 w-4" aria-hidden />{t(badKey)}</p>;
  if (state === 'error') return <p className="text-sm text-destructive" role="status">{t('electionVerify.error')}</p>;
  return null;
}

/**
 * Public "verify this election" page (v2 step C4), open to signed-out readers: the committed ballot box,
 * a recomputation of its Merkle root in the browser from the downloadable receipts, a check of one's own
 * receipt, where the commitment sits in the public audit log, and how to verify independently.
 */
export default function CivicVotingVerify() {
  const { electionId = '' } = useParams();
  const { t, language } = useLanguage();
  const [election, setElection] = useState<ElectionSummary | null | undefined>(undefined);
  const [liveRoot, setLiveRoot] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<ElectionAuditAnchor | null>(null);
  const [receipts, setReceipts] = useState<string[] | null>(null);
  const [recompute, setRecompute] = useState<Check>('idle');
  const [recomputed, setRecomputed] = useState<string | null>(null);
  const [receipt, setReceipt] = useState('');
  const [receiptCheck, setReceiptCheck] = useState<Check>('idle');

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await supabase
        .from('civic_elections')
        .select('id, title, status, voting_closes_at, ballot_box_commitment')
        .eq('id', electionId)
        .maybeSingle();
      if (!alive) return;
      setElection((data as ElectionSummary | null) ?? null);
      if (!data) return;
      const [root, audit] = await Promise.all([fetchMerkleRoot(electionId), fetchElectionAuditAnchor(electionId).catch(() => null)]);
      if (alive) {
        setLiveRoot(root);
        setAnchor(audit);
      }
    })();
    return () => {
      alive = false;
    };
  }, [electionId]);

  const published = election?.ballot_box_commitment ?? null;
  const trail = [{ label: t('civicVoting.openElections'), href: '/governance/voting' }, { label: t('electionVerify.short') }];

  const loadReceipts = useCallback(async () => {
    if (receipts) return receipts;
    const rows = await fetchElectionReceipts(electionId);
    setReceipts(rows);
    return rows;
  }, [electionId, receipts]);

  const runRecompute = async () => {
    setRecompute('running');
    try {
      const root = await computeMerkleRoot(await loadReceipts());
      setRecomputed(root);
      setRecompute(root === (published ?? liveRoot) ? 'match' : 'mismatch');
    } catch {
      setRecompute('error');
    }
  };

  const download = async () => {
    const rows = await loadReceipts();
    const blob = new Blob([JSON.stringify({ election_id: electionId, merkle_root: published ?? liveRoot, receipts: rows }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `civizen-election-${electionId}-receipts.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const checkReceipt = async () => {
    setReceiptCheck('running');
    try {
      const proof = await fetchReceiptProof(electionId, receipt.trim());
      setReceiptCheck(proof && (await verifyReceiptProof(receipt, proof)) ? 'match' : 'mismatch');
    } catch {
      setReceiptCheck('error');
    }
  };

  if (election === undefined) {
    return <CivicVotingPageShell sectionTrail={trail}><Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-muted-foreground" /></CivicVotingPageShell>;
  }
  if (election === null) {
    return <CivicVotingPageShell sectionTrail={trail}><p className="mt-6 text-sm text-muted-foreground">{t('civicVoting.observer.notFound')}</p></CivicVotingPageShell>;
  }

  const closed = election.status === 'closed' || election.status === 'certified';

  return (
    <CivicVotingPageShell sectionTrail={trail}>
      <div className="mx-auto max-w-3xl space-y-4 py-4" data-testid="election-verify">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('electionVerify.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link to={`/governance/voting/${electionId}`} className="text-primary hover:underline">{election.title}</Link>
            {' · '}{t(`civicVoting.status.${election.status}`)}
            {election.voting_closes_at ? ` · ${t('electionVerify.closes', { date: new Date(election.voting_closes_at).toLocaleString(language) })}` : ''}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{t('electionVerify.intro')}</p>
        </div>

        <Card className="space-y-2 p-4">
          <h2 className="font-semibold">{t('electionVerify.boxTitle')}</h2>
          {closed ? (
            <>
              <p className="text-sm">{t('electionVerify.committedRoot')} <Hash value={published} /></p>
              <p className="text-sm">{t('electionVerify.liveRoot')} <Hash value={liveRoot} /></p>
              <Verdict state={published && liveRoot ? (published === liveRoot ? 'match' : 'mismatch') : 'idle'}
                okKey="electionVerify.liveMatches" badKey="electionVerify.liveDiffers" />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('electionVerify.notClosed')}</p>
          )}
        </Card>

        <Card className="space-y-3 p-4">
          <h2 className="font-semibold">{t('electionVerify.browserTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('electionVerify.browserBody')}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void runRecompute()} disabled={recompute === 'running'} data-testid="election-verify-recompute">
              {t('electionVerify.recompute')}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void download()}>
              <Download className="h-4 w-4" aria-hidden />{t('electionVerify.download')}
            </Button>
          </div>
          {receipts ? <p className="text-xs text-muted-foreground">{t('electionVerify.receiptCount', { count: receipts.length })}</p> : null}
          {recomputed ? <p className="text-sm">{t('electionVerify.recomputedRoot')} <Hash value={recomputed} /></p> : null}
          <Verdict state={recompute} okKey="electionVerify.recomputeMatches" badKey="electionVerify.recomputeDiffers" />
        </Card>

        <Card className="space-y-3 p-4">
          <h2 className="font-semibold">{t('electionVerify.receiptTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('electionVerify.receiptBody')}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={receipt} onChange={(event) => { setReceipt(event.target.value); setReceiptCheck('idle'); }}
              placeholder={t('electionVerify.receiptPlaceholder')} aria-label={t('electionVerify.receiptTitle')} data-testid="election-verify-receipt" />
            <Button size="sm" onClick={() => void checkReceipt()} disabled={receipt.trim().length < 8 || receiptCheck === 'running'}>
              {t('electionVerify.checkReceipt')}
            </Button>
          </div>
          <Verdict state={receiptCheck} okKey="electionVerify.receiptIncluded" badKey="electionVerify.receiptMissing" />
        </Card>

        <Card className="space-y-2 p-4">
          <h2 className="font-semibold">{t('electionVerify.auditTitle')}</h2>
          {anchor ? (
            <div className="space-y-1 text-sm">
              <p>{t('electionVerify.eventHash')} <Hash value={anchor.eventHash} /></p>
              {anchor.batchId ? (
                <p>{t('electionVerify.batch', { index: anchor.batchIndex ?? '—' })} <Hash value={anchor.batchHash} /></p>
              ) : (
                <p className="text-muted-foreground">{t('electionVerify.notBatched')}</p>
              )}
              {anchor.anchorReference ? (
                <p>{t('electionVerify.anchor', { network: anchor.anchorNetwork ?? '—' })} <Hash value={anchor.anchorReference} /></p>
              ) : anchor.batchId ? (
                <p className="text-muted-foreground">{t('electionVerify.notAnchored')}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('electionVerify.noAuditYet')}</p>
          )}
        </Card>

        <Card className="space-y-2 p-4">
          <h2 className="font-semibold">{t('electionVerify.independentTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('electionVerify.independentBody')}</p>
          <code className="block break-all rounded bg-muted p-2 text-xs">node scripts/verify-election.mjs --file civizen-election-{electionId}-receipts.json</code>
          <a href={`${PUBLIC_SOURCE_REPOSITORY}/blob/main/scripts/verify-election.mjs`} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
            {t('electionVerify.sourceLink')}
          </a>
        </Card>
      </div>
    </CivicVotingPageShell>
  );
}
