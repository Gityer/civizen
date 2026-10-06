import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Badge } from '@/components/ui/badge';
import { actorLabel } from '@/lib/matters';
import { formatWhen } from '@/pages/contribute/matter-detail/matter-detail-shared';
import { useMatterDetail } from '@/pages/contribute/matter-detail/useMatterDetail';
import { MatterDetailBall } from '@/pages/contribute/matter-detail/MatterDetailBall';
import { MatterDetailActions } from '@/pages/contribute/matter-detail/MatterDetailActions';
import { MatterDetailOverview } from '@/pages/contribute/matter-detail/MatterDetailOverview';
import { MatterDetailSections } from '@/pages/contribute/matter-detail/MatterDetailSections';

export default function MatterDetail() {
  const model = useMatterDetail();
  const { loading, t, matter, derived, areaName } = model;

  if (loading) {
    return (
      <AppLayout>
        <div className="px-4 py-6 text-sm text-muted-foreground">{t('common.loading')}</div>
      </AppLayout>
    );
  }

  if (!matter) {
    return (
      <AppLayout>
        <div className="space-y-3 px-4 py-6">
          <AppPageHeader title={t('contribute.matters.missingTitle')} fallbackPath="/contribute/matters" />
          <p className="text-sm text-muted-foreground">{t('contribute.matters.missingBody')}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5 px-4 py-6">
        <AppPageHeader
          title={matter.title}
          subtitle={t(`contribute.matters.types.${matter.matterType}`)}
          fallbackPath="/contribute/matters"
        />

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-full">
            {t(`contribute.matters.status.${derived}`)}
          </Badge>
          <Badge variant="outline" className="rounded-full">
            {t(`contribute.matters.visibility.${matter.visibility}`)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('contribute.matters.fromLabel')} {actorLabel(matter.initiator)} · {t('contribute.matters.toLabel')}{' '}
          {actorLabel(matter.responsible)} · {formatWhen(matter.createdAt)}
          {matter.scopeKind === 'global'
            ? ` · ${t('contribute.matters.scope.global')}`
            : matter.scopeCountryCode
              ? ` · ${matter.scopeCountryCode}`
              : ''}
          {areaName ? ` · ${areaName}` : ''}
        </p>

        <MatterDetailBall model={model} />
        <MatterDetailActions model={model} />
        <MatterDetailOverview model={model} />
        <MatterDetailSections model={model} />
      </div>
    </AppLayout>
  );
}
