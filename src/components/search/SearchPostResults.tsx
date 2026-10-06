import { MessageSquareText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SearchPostHit } from '@/lib/search-posts';

/** Posts section of Search; each result opens the author's page. */
export function SearchPostResults({ posts }: { posts: SearchPostHit[] }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  if (posts.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="search-post-results">
      <div className="flex items-center gap-2 px-1">
        <MessageSquareText className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">{t('search.postsHeading')}</h2>
      </div>
      {posts.map((post) => (
        <Card
          key={post.id}
          role="button"
          tabIndex={0}
          className="cursor-pointer p-4 transition-colors hover:bg-muted/40"
          onClick={() => navigate(`/user/${post.authorId}`)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') navigate(`/user/${post.authorId}`);
          }}
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
  );
}
