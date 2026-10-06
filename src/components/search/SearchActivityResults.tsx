import { Landmark, MessageSquareText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SearchActivity, SearchCivicKind } from '@/lib/search-posts';

const CIVIC_KIND_LABEL_KEYS: Record<SearchCivicKind, string> = {
  proposal: 'search.kindProposal',
  election: 'search.kindElection',
  problem: 'search.kindProblem',
  matter: 'search.kindMatter',
};

function SectionHeading({ icon: Icon, label }: { icon: typeof Landmark; label: string }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold text-foreground">{label}</h2>
    </div>
  );
}

/** Civic items and posts in Search. A civic item opens its page; a post opens its author's page. */
export function SearchActivityResults({ activity }: { activity: SearchActivity }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { posts, civicItems } = activity;
  if (posts.length === 0 && civicItems.length === 0) return null;

  const openOnEnter = (path: string) => (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') navigate(path);
  };

  return (
    <div className="space-y-6">
      {civicItems.length > 0 ? (
        <div className="space-y-2" data-testid="search-civic-results">
          <SectionHeading icon={Landmark} label={t('search.civicHeading')} />
          {civicItems.map((item) => (
            <Card
              key={`${item.kind}:${item.id}`}
              role="button"
              tabIndex={0}
              className="cursor-pointer p-4 transition-colors hover:bg-muted/40"
              onClick={() => navigate(item.path)}
              onKeyDown={openOnEnter(item.path)}
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline">{t(CIVIC_KIND_LABEL_KEYS[item.kind])}</Badge>
                <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
              </div>
              {item.summary ? <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.summary}</p> : null}
            </Card>
          ))}
        </div>
      ) : null}

      {posts.length > 0 ? (
        <div className="space-y-2" data-testid="search-post-results">
          <SectionHeading icon={MessageSquareText} label={t('search.postsHeading')} />
          {posts.map((post) => (
            <Card
              key={post.id}
              role="button"
              tabIndex={0}
              className="cursor-pointer p-4 transition-colors hover:bg-muted/40"
              onClick={() => navigate(`/user/${post.authorId}`)}
              onKeyDown={openOnEnter(`/user/${post.authorId}`)}
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={post.authorAvatarUrl ?? undefined} />
                  <AvatarFallback className="text-[10px]">{post.authorName.slice(0, 1).toUpperCase() || '?'}</AvatarFallback>
                </Avatar>
                <span className="truncate text-xs font-medium text-foreground">{post.authorName || t('home.someone')}</span>
                <span className="text-xs text-muted-foreground">· {new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="mt-2 text-sm text-foreground line-clamp-3">{post.excerpt}</p>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
