import { Link } from 'react-router-dom';

import { splitChatPageLinks } from '@/lib/chat-page-links';
import { cn } from '@/lib/utils';

/**
 * WhatsApp-style tail: top outer corner, top edge flush with the bubble,
 * inner edge curves down to the side. Incoming = top-left, outgoing = top-right.
 */
export function CiviChatTail({ side }: { side: 'user' | 'assistant' }) {
  const outgoing = side === 'user';
  return (
    <svg
      data-testid={outgoing ? 'civi-chat-tail-user' : 'civi-chat-tail-assistant'}
      className={cn(
        'pointer-events-none absolute top-0 h-[13px] w-2 overflow-visible',
        outgoing ? '-right-2 fill-primary' : '-left-2 fill-muted',
      )}
      viewBox="0 0 8 13"
      width="8"
      height="13"
      aria-hidden
    >
      <path
        d={
          outgoing
            ? 'M0 0h8C7 3 4 8 0 13V0z'
            : 'M8 0H0c1 3 4 8 8 13V0z'
        }
      />
    </svg>
  );
}

export function CiviLinkedText({ text, includeChoices = true }: { text: string; includeChoices?: boolean }) {
  return splitChatPageLinks(text, { includeChoices }).map((part, index) =>
    part.type === 'page' ? (
      <Link
        key={`${part.href}-${index}`}
        to={part.href}
        className={cn('text-primary underline underline-offset-2', part.value.includes(' / ') && 'whitespace-nowrap')}
      >
        {part.value}
      </Link>
    ) : (
      <span key={`text-${index}`}>{part.value}</span>
    ),
  );
}
