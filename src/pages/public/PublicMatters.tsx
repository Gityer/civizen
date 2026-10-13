import { useEffect, useState } from 'react';
import { MessageSquare, Search } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

import { PublicPageShell } from '@/components/public/PublicPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { listPublicMatterCards, type PublicMatterCard } from '@/lib/public-matters';

const TYPES = ['', 'issue', 'question', 'suggestion'] as const;

/** Public Matters for visitors (v2 step B3); members use the full Matters workspace. */
export default function PublicMatters() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState<(typeof TYPES)[number]>('');
  const [rows, setRows] = useState<PublicMatterCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  usePageMeta({ title: t('publicMatters.metaTitle'), description: t('publicMatters.metaDescription') });

  useEffect(() => {
    let active = true;
    setLoading(true);
    listPublicMatterCards({ search: query, matterType: type })
      .then((next) => {
        if (!active) return;
        setRows(next);
        setHasMore(next.length === 30);
      })
      .catch(() => active && setRows([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [query, type]);

  if (user) return <Navigate to="/contribute/matters" replace />;

  const loadMore = async () => {
    const next = await listPublicMatterCards({ search: query, matterType: type, offset: rows.length }).catch(() => []);
    setRows((current) => [...current, ...next]);
    setHasMore(next.length === 30);
  };

  return (
    <PublicPageShell contentClassName="px-4 pb-16 pt-2 sm:px-6" layout="directory" showFooter sectionTrail={[{ label: t('publicMatters.title') }]}>
      <div className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold text-foreground">{t('publicMatters.title')}</h1>
          <p className="text-sm text-muted-foreground sm:text-base">{t('publicMatters.subtitle')}</p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(search);
          }}
        >
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('publicMatters.searchPlaceholder')} aria-label={t('publicMatters.searchPlaceholder')} />
          <Button type="submit" size="icon" variant="outline" aria-label={t('publicMatters.searchPlaceholder')}>
            <Search className="h-4 w-4" />
          </Button>
        </form>
        <div className="flex flex-wrap gap-2" role="tablist">
          {TYPES.map((value) => (
            <Button key={value || 'all'} type="button" size="sm" variant={type === value ? 'default' : 'outline'} className="rounded-full"
              role="tab" aria-selected={type === value} onClick={() => setType(value)}>
              {value ? t(`contribute.matters.types.${value}`) : t('publicMatters.all')}
            </Button>
          ))}
        </div>
        {loading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
        {!loading && rows.length === 0 ? <p className="text-sm text-muted-foreground">{t('publicMatters.empty')}</p> : null}
        <ul className="grid gap-3">
          {rows.map((matter) => (
            <li key={matter.id}>
              <Card className="rounded-2xl border-border/60 p-4 shadow-sm">
                <Link to={`/matters/${matter.id}`} className="block space-y-2" data-testid={`public-matter-${matter.id}`}>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline" className="rounded-full">{t(`contribute.matters.types.${matter.matterType}`)}</Badge>
                    <span className="text-muted-foreground">
                      {matter.lifecycleStatus === 'closed' ? t('contribute.matters.status.closed') : t('publicMatters.open')}
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                      {matter.commentCount}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-foreground">{matter.title}</h2>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{matter.description}</p>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
        {hasMore ? (
          <Button type="button" variant="outline" onClick={() => void loadMore()}>{t('publicMatters.more')}</Button>
        ) : null}
      </div>
    </PublicPageShell>
  );
}
