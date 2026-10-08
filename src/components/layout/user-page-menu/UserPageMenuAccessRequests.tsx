import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X } from 'lucide-react';
import type { PendingBusinessAccessRequest } from '@/lib/linked-business-accounts';
import { getInitials } from '@/components/layout/user-page-menu/user-page-menu-shared';
import type { AccessRequestDecision } from '@/components/layout/user-page-menu/useBusinessAccessRequests';

export function UserPageMenuAccessRequests({ requests, reviewingId, onReview, t }: {
  requests: readonly PendingBusinessAccessRequest[];
  reviewingId: string | null;
  onReview: (requestId: string, decision: AccessRequestDecision) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  if (requests.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-2" data-testid="user-page-menu-access-requests">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {t('home.accountSwitchAccessRequestsTitle')}
      </p>
      <ul className="mt-2 space-y-2">
        {requests.map((request) => {
          const requester = request.requesterName || request.requesterUsername || t('common.anonymousUser');
          const business = request.businessName || t('home.accountSwitchBusiness');
          const busy = reviewingId === request.id;
          return (
            <li key={request.id} className="flex items-center gap-2" data-testid={`access-request-${request.id}`}>
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={request.requesterAvatarUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                  {getInitials(request.requesterName, request.requesterUsername)}
                </AvatarFallback>
              </Avatar>
              <p className="min-w-0 flex-1 text-xs text-foreground">
                {t('home.accountSwitchAccessRequestLine', { name: requester, business })}
              </p>
              <button
                type="button"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                aria-label={t('home.accountSwitchApprove')}
                title={t('home.accountSwitchApprove')}
                disabled={Boolean(reviewingId)}
                data-testid={`access-request-approve-${request.id}`}
                onClick={() => onReview(request.id, 'approved')}
              >
                <Check className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
                aria-label={t('home.accountSwitchDecline')}
                title={t('home.accountSwitchDecline')}
                disabled={Boolean(reviewingId)}
                data-testid={`access-request-decline-${request.id}`}
                onClick={() => onReview(request.id, 'rejected')}
              >
                <X className={busy ? 'h-4 w-4 animate-pulse' : 'h-4 w-4'} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
