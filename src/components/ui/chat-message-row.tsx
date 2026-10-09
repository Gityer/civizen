import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CiviAvatar } from '@/components/ui/civi-avatar';
import { splitChatPageLinks } from '@/lib/chat-page-links';
import { CIVI_ASSISTANT_PROFILE_ID, resolveMessagingAvatarUrl } from '@/lib/messaging-constants';
import { splitAssistantMessageBlocks } from '@/lib/split-assistant-message';
import { cn } from '@/lib/utils';

export type ChatMessageRowData = {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  is_edited: boolean | null;
  sender: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
};

export type ChatMessageRowProps = {
  message: ChatMessageRowData;
  selectionMode: boolean;
  selected: boolean;
  highlighted?: boolean;
  starred?: boolean;
  senderInitials: string;
  formattedTime: string;
  labels: {
    openProfile: string;
    anonymous: string;
    edited: string;
    retry: string;
  };
  onSelect: (messageId: string) => void;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>, messageId: string) => void;
  onPointerUp?: () => void;
  onPointerCancel?: () => void;
  onPointerLeave?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onOpenProfile?: (senderId: string) => void;
  onRetry?: (messageId: string) => void;
  registerRef?: (messageId: string, node: HTMLDivElement | null) => void;
};

function ChatLinkedText({
  text,
  includeChoices = true,
}: {
  text: string;
  includeChoices?: boolean;
}) {
  return splitChatPageLinks(text, { includeChoices }).map((part, index) =>
    part.type === 'page' ? (
      <Link
        key={`${part.href}-${index}`}
        to={part.href}
        className={cn(
          'text-primary underline underline-offset-2',
          part.value.includes(' / ') && 'whitespace-nowrap',
        )}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {part.value}
      </Link>
    ) : (
      <span key={`text-${index}`}>{part.value}</span>
    ),
  );
}

export function ChatMessageRow({
  message,
  selectionMode,
  selected,
  highlighted = false,
  starred = false,
  senderInitials,
  formattedTime,
  labels,
  onSelect,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  onOpenProfile,
  onRetry,
  registerRef,
}: ChatMessageRowProps) {
  const pending = message.id.startsWith('local-') || message.id.startsWith('failed-');
  const selectable = !pending;
  const isCivi = message.sender_id === CIVI_ASSISTANT_PROFILE_ID;
  const blocks = isCivi
    ? splitAssistantMessageBlocks(message.content)
    : { primary: message.content, details: [] as string[] };

  return (
    <div
      ref={(node) => registerRef?.(message.id, node)}
      role={selectionMode ? 'option' : undefined}
      aria-selected={selectionMode ? selected : undefined}
      data-testid="chat-message-row"
      data-selected={selected ? 'true' : 'false'}
      className={cn(
        'flex gap-2 rounded-md p-1 -m-1 transition-colors',
        selectable && 'cursor-pointer hover:bg-muted/40',
        selectionMode && 'cursor-pointer',
        selectionMode && selected && 'bg-primary/10 ring-1 ring-primary/25',
        highlighted && 'bg-primary/20 ring-1 ring-primary/50',
        message.id.startsWith('failed-') ? 'opacity-60' : message.id.startsWith('local-') ? 'opacity-80' : '',
      )}
      onClick={() => {
        if (!selectable) return;
        onSelect(message.id);
      }}
      onPointerDown={(event) => onPointerDown?.(event, message.id)}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
    >
      {message.sender_id === CIVI_ASSISTANT_PROFILE_ID ? (
        <CiviAvatar className="h-8 w-8" />
      ) : (
        <button
          type="button"
          className="h-8 w-8 shrink-0 rounded-full"
          disabled={selectionMode}
          onClick={(event) => {
            event.stopPropagation();
            if (!message.sender_id) return;
            onOpenProfile?.(message.sender_id);
          }}
          aria-label={labels.openProfile}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={resolveMessagingAvatarUrl(message.sender_id, message.sender?.avatar_url ?? null)} />
            <AvatarFallback className="bg-primary/10 text-xs text-primary">{senderInitials}</AvatarFallback>
          </Avatar>
        </button>
      )}

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-sm font-medium text-foreground">{message.sender?.full_name || labels.anonymous}</span>
          <span className="text-xs text-muted-foreground">{formattedTime}</span>
          {starred ? <Star className="h-3 w-3 fill-primary text-primary" /> : null}
          {message.is_edited ? (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80">{labels.edited}</span>
          ) : null}
        </div>

        <div data-testid="chat-message-body" className="space-y-1.5">
          <p
            data-testid="chat-message-primary"
            className="whitespace-pre-wrap wrap-break-word text-pretty text-sm text-foreground wrap-break-word [word-break:normal]"
          >
            <ChatLinkedText text={blocks.primary} />
            {message.id.startsWith('failed-') && onRetry ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRetry(message.id);
                }}
                className="ml-2 text-xs text-destructive underline hover:text-destructive/80"
              >
                {labels.retry}
              </button>
            ) : null}
          </p>
          {blocks.details.map((detail, index) => (
            <p
              key={`detail-${index}`}
              data-testid="chat-message-detail"
              className="whitespace-pre-wrap wrap-break-word text-pretty text-xs leading-5 text-muted-foreground wrap-break-word [word-break:normal]"
            >
              <ChatLinkedText text={detail} includeChoices={false} />
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
