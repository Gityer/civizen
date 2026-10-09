import { useCallback, useEffect, useMemo, useState } from 'react';

import { listAccessibleAgreements, type AgreementListItem } from '@/lib/agreements-api';
import { isMissingAgreementsBackend } from '@/lib/agreements-backend';
import { filterEarningsRows, summarizeEarnings, type EarningsFilter, type EarningsSummary } from '@/lib/provider-earnings';

/** Earnings on top of collaboration agreements: every agreement the member is a party to (Phase 6 step 6.1). */
export function useProviderEarnings(profileId: string | undefined) {
  const [rows, setRows] = useState<AgreementListItem[]>([]);
  const [loading, setLoading] = useState(Boolean(profileId));
  const [error, setError] = useState<string | null>(null);
  const [backendMissing, setBackendMissing] = useState(false);
  const [filter, setFilter] = useState<EarningsFilter>('all');

  const refetch = useCallback(async () => {
    if (!profileId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await listAccessibleAgreements();
      setRows(list.filter((row) => row.parties.some((party) => party.profileId === profileId)));
      setBackendMissing(false);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'request_failed';
      if (isMissingAgreementsBackend({ message })) setBackendMissing(true);
      else setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const summary: EarningsSummary = useMemo(() => summarizeEarnings(rows, profileId ?? ''), [rows, profileId]);
  const filteredRows = useMemo(() => filterEarningsRows(rows, filter, profileId ?? ''), [rows, filter, profileId]);

  return { rows, filteredRows, summary, filter, setFilter, loading, error, backendMissing, refetch };
}
