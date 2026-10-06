import {
  looksLikePostHtml,
  POST_LIST_CLASS,
  postHtmlIsEmpty,
  sanitizePostHtml,
} from '@/lib/posts-html';
import { cn } from '@/lib/utils';

type PostFormattedBodyProps = {
  content: string;
  className?: string;
};

export function PostFormattedBody({ content, className }: PostFormattedBodyProps) {
  if (postHtmlIsEmpty(content)) return null;
  if (looksLikePostHtml(content) && /<[a-z][\s\S]*>/i.test(content)) {
    return (
      <div
        className={cn('wrap-break-word text-sm leading-relaxed text-foreground', POST_LIST_CLASS, className)}
        dangerouslySetInnerHTML={{ __html: sanitizePostHtml(content) }}
      />
    );
  }
  return (
    <p className={cn('whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-foreground', className)}>
      {content}
    </p>
  );
}
