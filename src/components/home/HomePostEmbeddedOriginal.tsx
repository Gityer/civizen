import { ExternalLink } from 'lucide-react';

import { PostFormattedBody } from '@/components/posts/PostFormattedBody';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { previewPostContent, type PostPreview } from '@/lib/post-reposts';
import { cn } from '@/lib/utils';

type HomePostEmbeddedOriginalProps = {
  original: PostPreview | null;
  unavailableLabel: string;
  originalBadgeLabel: string;
  seeFullLabel: string;
  onOpenFull: () => void;
  className?: string;
};

function initials(name: string | null | undefined) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function HomePostEmbeddedOriginal({
  original,
  unavailableLabel,
  originalBadgeLabel,
  seeFullLabel,
  onOpenFull,
  className,
}: HomePostEmbeddedOriginalProps) {
  if (!original) {
    return (
      <div
        className={cn(
          'border-l-2 border-dashed border-border/60 pl-3 py-1 text-sm text-muted-foreground',
          className,
        )}
      >
        {unavailableLabel}
      </div>
    );
  }

  const authorName = original.author?.full_name || original.author?.username || 'Someone';
  const preview = previewPostContent(original.content);
  const published = new Date(original.created_at);
  const dateLabel = Number.isNaN(published.getTime())
    ? ''
    : published.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

  return (
    <button
      type="button"
      onClick={onOpenFull}
      className={cn(
        'w-full border-l-2 border-primary/25 pl-3 py-1 text-left transition hover:border-primary/45',
        className,
      )}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarImage src={original.author?.avatar_url || undefined} alt="" />
          <AvatarFallback className="bg-secondary text-[10px] text-secondary-foreground">
            {initials(authorName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{authorName}</p>
          <p className="text-[11px] text-muted-foreground">
            {originalBadgeLabel}
            {dateLabel ? ` · ${dateLabel}` : ''}
          </p>
        </div>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </div>
      <PostFormattedBody
        content={original.content}
        className="text-foreground/85 leading-snug line-clamp-4"
      />
      {preview.truncated ? (
        <span className="mt-1.5 inline-flex text-xs font-medium text-primary">{seeFullLabel}</span>
      ) : null}
    </button>
  );
}

type HomeFullOriginalDialogBodyProps = {
  original: PostPreview;
};

export function HomeFullOriginalBody({ original }: HomeFullOriginalDialogBodyProps) {
  const authorName = original.author?.full_name || original.author?.username || 'Someone';
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={original.author?.avatar_url || undefined} alt="" />
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            {initials(authorName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{authorName}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(original.created_at).toLocaleString()}
          </p>
        </div>
      </div>
      <PostFormattedBody content={original.content} />
    </div>
  );
}

export function HomeEmbeddedOpenHint({ label }: { label: string }) {
  return (
    <Button type="button" variant="link" className="h-auto p-0 text-xs">
      {label}
    </Button>
  );
}
