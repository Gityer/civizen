import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { GovernanceHubSanctionsSection } from '@/components/governance/GovernanceHubSanctionsSection';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { isMissingGovernanceSanctionsBackend } from '@/lib/governance-hub-backend';
import { isAppealOpen, isGovernanceSanctionCurrentlyActive } from '@/lib/governance-sanctions';

type SanctionRow = Database['public']['Tables']['governance_sanctions']['Row'];
type AppealRow = Database['public']['Tables']['governance_sanction_appeals']['Row'];
type Drafts = Record<string, { reason: string; evidence: string }>;

/**
 * A member's own governance sanctions and appeals (v2 step C5). Shown on /governance only when the
 * member has an active sanction or an appeal on record; staff manage sanctions in Users admin.
 */
export function MySanctionsCard({
  profileId,
  t,
  language,
}: {
  profileId: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  language: string;
}) {
  const [sanctions, setSanctions] = useState<SanctionRow[]>([]);
  const [appeals, setAppeals] = useState<AppealRow[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [sanctionsResponse, appealsResponse] = await Promise.all([
      supabase.from('governance_sanctions').select('*').eq('profile_id', profileId).order('created_at', { ascending: false }),
      supabase.from('governance_sanction_appeals').select('*').eq('profile_id', profileId).order('created_at', { ascending: false }),
    ]);
    if (isMissingGovernanceSanctionsBackend(sanctionsResponse.error) || isMissingGovernanceSanctionsBackend(appealsResponse.error)) {
      setUnavailable(true);
      return;
    }
    if (sanctionsResponse.error || appealsResponse.error) return;
    setSanctions(sanctionsResponse.data ?? []);
    setAppeals(appealsResponse.data ?? []);
    setUnavailable(false);
  }, [profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeSanctions = useMemo(() => sanctions.filter((row) => isGovernanceSanctionCurrentlyActive(row)), [sanctions]);
  const openAppealsBySanctionId = useMemo(
    () =>
      appeals.reduce<Record<string, AppealRow>>((map, appeal) => {
        if (isAppealOpen(appeal.status) && !map[appeal.sanction_id]) map[appeal.sanction_id] = appeal;
        return map;
      }, {}),
    [appeals],
  );

  const submitAppeal = async (sanction: SanctionRow) => {
    if (openAppealsBySanctionId[sanction.id]) {
      toast.error(t('governanceHub.appealAlreadyOpen'));
      return;
    }
    const draft = drafts[sanction.id] ?? { reason: '', evidence: '' };
    if (!draft.reason.trim()) {
      toast.error(t('governanceHub.appealReasonRequired'));
      return;
    }
    setSubmittingId(sanction.id);
    const { error } = await supabase.from('governance_sanction_appeals').insert({
      sanction_id: sanction.id,
      profile_id: profileId,
      appeal_reason: draft.reason.trim(),
      evidence_notes: draft.evidence.trim() || null,
    });
    setSubmittingId(null);
    if (error) {
      toast.error(t('governanceHub.appealSubmitFailed'));
      return;
    }
    setDrafts((current) => ({ ...current, [sanction.id]: { reason: '', evidence: '' } }));
    toast.success(t('governanceHub.appealSubmitted'));
    await load();
  };

  if (unavailable || (activeSanctions.length === 0 && appeals.length === 0)) return null;

  const formatDateTime = (value: string | null) => (value ? new Date(value).toLocaleString(language) : '—');

  return (
    <div className="mb-4" data-testid="governance-my-sanctions">
      <GovernanceHubSanctionsSection
        t={t}
        formatDateTime={formatDateTime}
        sanctionsBackendUnavailable={false}
        activeSanctions={activeSanctions}
        openAppealsBySanctionId={openAppealsBySanctionId}
        appealDraftBySanctionId={drafts}
        setAppealDraftBySanctionId={setDrafts}
        submittingAppealForSanctionId={submittingId}
        onSubmitAppeal={submitAppeal}
        appeals={appeals}
      />
    </div>
  );
}
