import { useCallback, useEffect, useState } from 'react';
import { Download, HandCoins } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { downloadTextFile, fundingInterestRowsToCsv } from '@/lib/funding/interest-csv';
import {
  convertFundingInterestToCommitment,
  interestNeedsAmount,
  mapInterestLaneToLedgerLane,
} from '@/lib/funding/transparency';
import { supabase } from '@/integrations/supabase/client';
import type { FundingInterestRow } from '@/lib/funding/types';

const STATUSES = ['new', 'reviewing', 'contacted', 'closed', 'spam'] as const;

type FundingInterestAdminProps = {
  /** @deprecated Panels always render embedded under FundingAdmin. Kept for call-site compatibility. */
  embedded?: boolean;
};

export default function FundingInterestAdmin(_props: FundingInterestAdminProps = {}) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<FundingInterestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [amountOverrides, setAmountOverrides] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('funding_interest_inquiries' as never)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (queryError) {
      setError(queryError.message);
      setRows([]);
    } else {
      setRows((data as FundingInterestRow[] | null) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    setError(null);
    const { error: updateError } = await supabase
      .from('funding_interest_inquiries' as never)
      .update({ status, updated_at: new Date().toISOString() } as never)
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
    }
    setUpdatingId(null);
  };

  const convertToLedger = async (row: FundingInterestRow) => {
    setConvertingId(row.id);
    setError(null);
    setSuccess(null);

    const overrideRaw = amountOverrides[row.id];
    const overrideAmount =
      overrideRaw != null && overrideRaw.trim() !== '' ? Number(overrideRaw) : undefined;

    const result = await convertFundingInterestToCommitment({
      inquiryId: row.id,
      amountUsd: overrideAmount,
      status: 'pledged',
    });

    setConvertingId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSuccess(t('fund.admin.convertSuccess'));
    await load();
  };

  const exportCsv = () => {
    const csv = fundingInterestRowsToCsv(rows);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`civizen-funding-interest-${stamp}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <HandCoins className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">{t('fund.admin.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('fund.admin.description')}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={exportCsv}
          disabled={rows.length === 0}
        >
          <Download className="h-4 w-4" />
          {t('fund.admin.exportCsv')}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-primary">{success}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}

      {!loading && rows.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">{t('fund.admin.empty')}</Card>
      ) : null}

      <div className="space-y-3">
        {rows.map((row) => {
          const converted = Boolean(row.converted_commitment_id);
          const needsAmount = interestNeedsAmount(row);
          return (
            <Card key={row.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{row.full_name}</p>
                  <p className="text-sm text-muted-foreground">{row.email}</p>
                  {row.organization ? (
                    <p className="text-sm text-muted-foreground">{row.organization}</p>
                  ) : null}
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium capitalize text-foreground">{row.lane}</p>
                  <p className="text-muted-foreground">{new Date(row.created_at).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('fund.admin.mapsToLane')}: {mapInterestLaneToLedgerLane(row.lane)}
                  </p>
                </div>
              </div>

              {row.indicated_amount_usd != null ? (
                <p className="text-sm text-muted-foreground">
                  {t('fund.admin.indicatedAmount')}: {row.indicated_amount_usd} {row.currency || 'USD'}
                </p>
              ) : null}

              {row.message ? (
                <p className="rounded-xl bg-muted/40 p-3 text-sm text-foreground/90">{row.message}</p>
              ) : null}

              {converted ? (
                <p className="text-sm text-primary">{t('fund.admin.alreadyConverted')}</p>
              ) : null}

              {!converted && needsAmount ? (
                <div className="space-y-2">
                  <Label htmlFor={`amount-${row.id}`}>{t('fund.admin.convertAmount')}</Label>
                  <Input
                    id={`amount-${row.id}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={amountOverrides[row.id] ?? ''}
                    onChange={(e) =>
                      setAmountOverrides((prev) => ({ ...prev, [row.id]: e.target.value }))
                    }
                    placeholder={t('fund.admin.convertAmountPlaceholder')}
                  />
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground">{t('fund.admin.status')}</span>
                <Select
                  value={row.status}
                  onValueChange={(value) => void updateStatus(row.id, value)}
                  disabled={updatingId === row.id}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`fund.admin.statuses.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="secondary"
                  disabled={converted || convertingId === row.id || row.status === 'spam'}
                  onClick={() => void convertToLedger(row)}
                >
                  {convertingId === row.id
                    ? t('fund.admin.converting')
                    : t('fund.admin.convertToLedger')}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
