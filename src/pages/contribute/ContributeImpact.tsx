import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  listMyParticipations,
  listOpportunitiesByIds,
  listOwnedLinkedProfileIds,
} from '@/lib/opportunities-api';
import {
  participantNextAction,
  type ContributionOpportunity,
  type OpportunityParticipation,
} from '@/lib/opportunities';
import { RelatedAgreementsCard } from '@/components/agreements/RelatedAgreementsCard';
import { ImpactMattersAndProposals } from '@/pages/contribute/impact/ImpactMattersAndProposals';

export default function ContributeImpact() {
  const { t } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;
  const { profile } = useAuth();
  const profileId = profile?.id ?? '';

  const [mine, setMine] = useState<OpportunityParticipation[]>([]);
  const [opportunities, setOpportunities] = useState<ContributionOpportunity[]>([]);
  const [ownedLinkedIds, setOwnedLinkedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const linked = profileId ? await listOwnedLinkedProfileIds(profileId) : [];
      setOwnedLinkedIds(linked);
      const participations = profileId ? await listMyParticipations(profileId) : [];
      setMine(participations);
      const ids = [...new Set(participations.map((row) => row.opportunityId))];
      setOpportunities(ids.length > 0 ? await listOpportunitiesByIds(ids) : []);
    } catch {
      setError(tRef.current('contribute.impact.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const byId = new Map(opportunities.map((row) => [row.id, row]));
    return mine.flatMap((participation) => {
      const opportunity = byId.get(participation.opportunityId);
      return opportunity ? [{ participation, opportunity }] : [];
    });
  }, [mine, opportunities]);

  return (
    <AppLayout>
      <div className="space-y-6 px-4 py-6">
        <AppPageHeader
          title={t('contribute.lanes.impact.title')}
          subtitle={t('contribute.impact.subtitle')}
          fallbackPath="/contribute"
          leading={
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <TrendingUp className="h-7 w-7 text-accent" />
            </div>
          }
        />

        {profileId ? (
          <RelatedAgreementsCard
            entityType="contribution"
            entityId={profileId}
            entityTitle={t('contribute.lanes.impact.title')}
            launch={{ source: 'contribution', agreementType: 'service_contribution' }}
          />
        ) : null}

        {loading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!loading && rows.length === 0 ? (
          <Card className="space-y-3 border-border/70 bg-card/95 p-5">
            <p className="text-sm text-muted-foreground">{t('contribute.impact.empty')}</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/contribute/professional">{t('contribute.lanes.professional.title')}</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/contribute/challenges">{t('contribute.lanes.challenges.title')}</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/contribute/knowledge">{t('contribute.lanes.knowledge.title')}</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/profile">{t('contribute.related.score')}</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3">
            {rows.map(({ opportunity, participation }) => {
              const next = participantNextAction({
                opportunity,
                currentProfileId: profileId,
                ownedLinkedProfileIds: ownedLinkedIds,
                participation,
              });
              return (
                <Link key={participation.id} to={`/contribute/professional/${opportunity.id}`}>
                  <Card className="border-border/70 bg-card/95 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold wrap-break-word text-foreground">{opportunity.title}</h3>
                      <Badge variant="outline" className="shrink-0 rounded-full">
                        {t(`contribute.opportunities.participationStatus.${participation.status}`)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{opportunity.summary}</p>
                    {participation.verificationStatus !== 'not_submitted' ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t(`contribute.opportunities.verification.${participation.verificationStatus}`)}
                      </p>
                    ) : null}
                    {next !== 'none' ? (
                      <p className="mt-3 text-sm font-medium text-primary">
                        {t(`contribute.opportunities.nextAction.${next}`)}
                      </p>
                    ) : null}
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {profileId ? <ImpactMattersAndProposals profileId={profileId} /> : null}
      </div>
    </AppLayout>
  );
}
