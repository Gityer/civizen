import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { listAccessibleAgreements, type AgreementListItem } from '@/lib/agreements-api';
import { listMyKnowledgeResources, type MyKnowledgeResource } from '@/lib/impact-api';

/** Knowledge a member shared and the agreements they are party to, with the way to the contributions ledger (step 4.2). */
export function ImpactKnowledgeAndAgreements({ profileId }: { profileId: string }) {
  const { t } = useLanguage();
  const [resources, setResources] = useState<MyKnowledgeResource[]>([]);
  const [agreements, setAgreements] = useState<AgreementListItem[]>([]);

  useEffect(() => {
    if (!profileId) return;
    let active = true;
    void Promise.all([
      listMyKnowledgeResources(profileId).catch(() => [] as MyKnowledgeResource[]),
      listAccessibleAgreements().catch(() => [] as AgreementListItem[]),
    ]).then(([rows, items]) => {
      if (!active) return;
      setResources(rows);
      setAgreements(items.slice(0, 12));
    });
    return () => {
      active = false;
    };
  }, [profileId]);

  return (
    <div className="space-y-4" data-testid="impact-knowledge-agreements">
      {resources.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('contribute.impact.knowledgeTitle')}</h2>
          <div className="grid gap-2">
            {resources.map((resource) => (
              <Link key={resource.id} to={`/contribute/knowledge/${resource.spaceId}`}>
                <Card className="flex items-center justify-between gap-3 border-border/70 bg-card/95 p-3">
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">{resource.title}</span>
                  <Badge variant="outline" className="shrink-0 rounded-full text-xs">
                    {resource.proposed && resource.status !== 'published' ? t('contribute.impact.knowledgeProposed') : t(`contribute.knowledge.resourceStatus.${resource.status}`)}
                  </Badge>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {agreements.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('contribute.impact.agreementsTitle')}</h2>
          <div className="grid gap-2">
            {agreements.map((agreement) => (
              <Link key={agreement.id} to={`/agreements/${agreement.id}`}>
                <Card className="flex items-center justify-between gap-3 border-border/70 bg-card/95 p-3">
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">{agreement.title}</span>
                  <Badge variant="outline" className="shrink-0 rounded-full text-xs">{agreement.status}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <Button asChild size="sm" variant="outline">
        <Link to="/profile/contributions">{t('contribute.impact.ledgerLink')}</Link>
      </Button>
    </div>
  );
}
