import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { hasAreaActivity, type AreaActivity } from '@/lib/areas/area-activity';

type MemberLink = (to: string) => { to: string; state?: unknown };

function ActivityList<T extends { id: string; title: string }>({
  title,
  items,
  hrefFor,
  badgeFor,
  memberLink,
}: {
  title: string;
  items: T[];
  hrefFor: (item: T) => string;
  badgeFor: (item: T) => string;
  memberLink: MemberLink;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <ul className="grid gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link {...memberLink(hrefFor(item))} className="block">
              <Card className="flex items-center justify-between gap-3 rounded-2xl border-border/60 p-3 shadow-sm transition-colors hover:border-border">
                <span className="min-w-0 truncate text-sm font-medium text-foreground">{item.title}</span>
                <Badge variant="outline" className="shrink-0 rounded-full text-xs">{badgeFor(item)}</Badge>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Real activity tagged with the Area (step 4.4): programs, challenges and public Matters. Guests sign in first. */
export function AreaActivitySection({ activity, memberLink }: { activity: AreaActivity; memberLink: MemberLink }) {
  const { t } = useLanguage();
  if (!hasAreaActivity(activity)) return null;
  return (
    <div className="space-y-4" data-testid="area-activity">
      <ActivityList
        title={t('areas.activityPrograms')}
        items={activity.programs}
        hrefFor={(item) => `/contribute/challenges?program=${item.id}`}
        badgeFor={(item) => t(`areas.activityStatus.${item.status}`)}
        memberLink={memberLink}
      />
      <ActivityList
        title={t('areas.activityChallenges')}
        items={activity.challenges}
        hrefFor={(item) => `/contribute/challenges/${item.id}`}
        badgeFor={(item) => t(`areas.activityStatus.${item.status}`)}
        memberLink={memberLink}
      />
      <ActivityList
        title={t('areas.activityMatters')}
        items={activity.matters}
        hrefFor={(item) => `/contribute/matters/${item.id}`}
        badgeFor={(item) => t(`contribute.matters.types.${item.matterType}`)}
        memberLink={memberLink}
      />
    </div>
  );
}
