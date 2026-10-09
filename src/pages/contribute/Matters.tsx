import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquareWarning, Plus } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { listCurrentAreas } from '@/lib/classification';
import { getCountryName } from '@/lib/countries';
import { listGeoCountryCodes } from '@/lib/geo-locations';
import {
  MATTER_QUEUES,
  actionContextHeadline,
  actionContextKind,
  workProgressLine,
  type MatterListRow,
  type MatterQueue,
} from '@/lib/matters';
import { listMatters, listPublicMatters } from '@/lib/matters-api';
import { listOwnedLinkedProfileIds } from '@/lib/opportunities-api';
import { PublicMattersFilters } from '@/pages/contribute/matters/PublicMattersFilters';
import {
  EMPTY_PUBLIC_MATTERS_FILTER,
  isEmptyPublicMattersFilter,
  type PublicMattersFilterValue,
} from '@/pages/contribute/matters/public-matters-filter';

const QUEUE_PARAM: Record<string, MatterQueue> = {
  public: 'public',
  needs_action: 'needs_action',
  mine: 'mine',
  participating: 'participating',
  organization: 'organization',
};

/** Browsing public Matters is the landing view; `?view=` opens one of the member's own queues. */
const DEFAULT_QUEUE: MatterQueue = 'public';

function scopeLine(row: MatterListRow, areaName: string | null, language: string, t: (key: string) => string): string {
  const { matter } = row;
  const parts: string[] = [];
  if (matter.scopeKind === 'global') parts.push(t('contribute.matters.scope.global'));
  else if (matter.scopeCountryCode) {
    parts.push(
      [getCountryName(matter.scopeCountryCode, language), matter.scopeRegionCode, matter.scopeLocalityCode]
        .filter(Boolean)
        .join(' · '),
    );
  }
  if (areaName) parts.push(areaName);
  return parts.join(' · ');
}

function MatterCard({
  row,
  typeLabel,
  statusLabel,
  taskLabel,
  scopeText,
  t,
}: {
  row: MatterListRow;
  typeLabel: string;
  statusLabel: string;
  taskLabel: string;
  scopeText?: string;
  t: (key: string) => string;
}) {
  const progress = workProgressLine(row.workSummary);
  const taskTitle = row.currentAction?.taskTitle;
  const contextKind = actionContextKind(row.currentAction);
  const contextHeadline = row.currentAction ? actionContextHeadline(row.currentAction) : null;
  return (
    <Card className="border-border/70 bg-card/95 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-foreground">{row.matter.title}</h3>
        <Badge variant="outline" className="shrink-0 rounded-full">
          {statusLabel}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{scopeText ? `${typeLabel} · ${scopeText}` : typeLabel}</p>
      {row.currentAction ? (
        <div className="mt-2">
          <Badge variant="secondary" className="rounded-full text-xs uppercase tracking-wide">
            {t(`contribute.matters.actionContext.${contextKind}`)}
          </Badge>
          <p className="mt-1 text-sm font-medium text-foreground">{contextHeadline}</p>
        </div>
      ) : null}
      {taskTitle ? (
        <p className="mt-1 text-sm text-foreground">
          {taskLabel}: {taskTitle}
        </p>
      ) : null}
      {progress ? <p className="mt-1 text-sm text-muted-foreground">{progress}</p> : null}
      {row.ball ? (
        <div className="mt-3 rounded-lg bg-primary/5 px-3 py-2">
          <p className="text-sm font-medium text-foreground">{row.ball.headline}</p>
          <p className="text-sm text-muted-foreground">{row.ball.detail}</p>
          {row.ball.dueLine ? (
            <p className="mt-1 text-xs text-muted-foreground">{row.ball.dueLine}</p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

export default function Matters() {
  const { t, language } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const profileId = profile?.id ?? '';
  const queue = QUEUE_PARAM[searchParams.get('view') || ''] ?? DEFAULT_QUEUE;
  const areas = useMemo(() => listCurrentAreas(), []);
  const countryOptions = useMemo(() => listGeoCountryCodes(language), [language]);
  const areaName = useCallback(
    (areaNodeId: string | null) => areas.find((area) => area.id === areaNodeId)?.displayName ?? null,
    [areas],
  );

  const [rows, setRows] = useState<MatterListRow[]>([]);
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PublicMattersFilterValue>(EMPTY_PUBLIC_MATTERS_FILTER);
  // The search box filters as the member types; wait a moment before asking the server again.
  const [appliedFilter, setAppliedFilter] = useState<PublicMattersFilterValue>(EMPTY_PUBLIC_MATTERS_FILTER);

  useEffect(() => {
    const handle = window.setTimeout(() => setAppliedFilter(filter), 250);
    return () => window.clearTimeout(handle);
  }, [filter]);

  const queues = useMemo(() => {
    const items: MatterQueue[] = ['public', 'needs_action', 'mine', 'participating'];
    if (linkedIds.length > 0) items.push('organization');
    return items;
  }, [linkedIds.length]);

  const load = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const linked = await listOwnedLinkedProfileIds(profileId);
      setLinkedIds(linked);
      const list = queue === 'public'
        ? await listPublicMatters(appliedFilter, profileId, linked)
        : await listMatters(queue, profileId, linked);
      setRows(list);
    } catch {
      setError(tRef.current('contribute.matters.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [appliedFilter, profileId, queue]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppLayout>
      <div className="space-y-6 px-4 py-6">
        <AppPageHeader
          title={t('contribute.lanes.matters.title')}
          subtitle={t('contribute.lanes.matters.description')}
          fallbackPath="/contribute"
          leading={
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <MessageSquareWarning className="h-7 w-7 text-primary" />
            </div>
          }
          titleAccessory={
            profileId ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-full"
                aria-label={t('contribute.matters.create')}
                onClick={() => navigate('/contribute/matters/new')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            ) : null
          }
        />

        <div className="flex flex-wrap gap-2">
          {queues.filter((item) => MATTER_QUEUES.includes(item)).map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={queue === item ? 'default' : 'outline'}
              onClick={() => setSearchParams(item === DEFAULT_QUEUE ? {} : { view: item })}
            >
              {t(`contribute.matters.queues.${item}`)}
            </Button>
          ))}
        </div>

        {queue === 'public' ? (
          <PublicMattersFilters
            value={filter}
            onChange={setFilter}
            areas={areas}
            countryOptions={countryOptions}
            language={language}
            t={t}
          />
        ) : null}

        {loading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!loading && rows.length === 0 ? (
          <Card className="border-border/70 bg-card/95 p-5 text-sm text-muted-foreground">
            {queue === 'public' && !isEmptyPublicMattersFilter(appliedFilter)
              ? t('contribute.matters.empty.publicFiltered')
              : t(`contribute.matters.empty.${queue}`)}
          </Card>
        ) : (
          <div className="grid gap-3">
            {rows.map((row) => (
              <Link key={row.matter.id} to={`/contribute/matters/${row.matter.id}`}>
                <MatterCard
                  row={row}
                  typeLabel={t(`contribute.matters.types.${row.matter.matterType}`)}
                  statusLabel={t(`contribute.matters.status.${row.derivedStatus}`)}
                  taskLabel={t('contribute.matters.work.taskLabel')}
                  scopeText={queue === 'public' ? scopeLine(row, areaName(row.matter.areaNodeId), language, t) : undefined}
                  t={t}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
