import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { OutlinedField } from '@/components/ui/outlined-field';
import { businessConnectDisplayName } from '@/lib/linked-business-accounts';
import { cn } from '@/lib/utils';
import { Briefcase, Link2 } from 'lucide-react';
import { getInitials } from '@/components/layout/user-page-menu/user-page-menu-shared';
import type { useUserPageMenu } from '@/components/layout/user-page-menu/useUserPageMenu';

type UserPageMenuModel = ReturnType<typeof useUserPageMenu>;

export function UserPageMenuBusinessDialog({ model }: { model: UserPageMenuModel }) {
  const {
    open, createBusinessOpen, setCreateBusinessOpen, businessName, setBusinessName, businessEmail,
    setBusinessEmail, businessPassword, setBusinessPassword, creatingBusiness, businessError,
    setBusinessError, businessMatches, setBusinessMatches, selectedBusinessMatch,
    setSelectedBusinessMatch, lookingUpBusiness, t, connectingExisting, connectNeedsPassword,
    connectNeedsAccessRequest, handleCreateBusinessAccount,
  } = model;
  return (
    <>
    <Dialog
      open={createBusinessOpen}
      onOpenChange={(nextOpen) => {
        setCreateBusinessOpen(nextOpen);
        if (!nextOpen) {
          setBusinessMatches([]);
          setSelectedBusinessMatch(null);
          setBusinessError(null);
        }
      }}
    >
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>{t('home.accountSwitchCreateTitle')}</DialogTitle>
          <DialogDescription>{t('home.accountSwitchCreateSubtitle')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <OutlinedField label={t('home.accountSwitchBusinessNameLabel')} htmlFor="add-business-name">
            <Input
              id="add-business-name"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder={t('home.accountSwitchBusinessNamePlaceholder')}
              autoComplete="organization"
            />
          </OutlinedField>

          {businessMatches.length > 0 && (
            <div className="space-y-2" data-testid="add-business-matches">
              {businessMatches.map((match) => {
                const selected = selectedBusinessMatch?.profileId === match.profileId;
                return (
                  <button
                    key={match.profileId}
                    type="button"
                    data-testid={`add-business-match-${match.profileId}`}
                    onClick={() => setSelectedBusinessMatch(match)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors',
                      selected ? 'border-primary bg-primary/10' : 'border-border/60 hover:bg-accent/60',
                    )}
                  >
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarImage src={match.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {getInitials(businessConnectDisplayName(match, businessName), match.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {businessConnectDisplayName(match, businessName)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {match.alreadyLinkedToRequester
                          ? t('home.accountSwitchAlreadyLinkedHint')
                          : match.ownerFullName
                            ? t('home.accountSwitchOwnedBy', { name: match.ownerFullName })
                            : t('home.accountSwitchExistingCompany')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {lookingUpBusiness && businessMatches.length === 0 && (
            <p className="text-[11px] text-muted-foreground">{t('home.accountSwitchLookingUp')}</p>
          )}

          {(!connectingExisting || connectNeedsPassword) && (
            <>
              <OutlinedField label={t('common.email')} htmlFor="add-business-email">
                <Input
                  id="add-business-email"
                  type="email"
                  value={businessEmail}
                  onChange={(event) => setBusinessEmail(event.target.value)}
                  placeholder={t('home.accountSwitchBusinessEmailPlaceholder')}
                  autoComplete="username"
                />
              </OutlinedField>
              <OutlinedField label={t('common.password')} htmlFor="add-business-password">
                <Input
                  id="add-business-password"
                  type="password"
                  value={businessPassword}
                  onChange={(event) => setBusinessPassword(event.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  autoComplete="new-password"
                />
              </OutlinedField>
            </>
          )}

          {connectingExisting && connectNeedsPassword && (
            <p className="text-xs text-muted-foreground">{t('home.accountSwitchConnectHint')}</p>
          )}
          {connectNeedsAccessRequest && (
            <p className="text-xs text-muted-foreground">{t('home.accountSwitchRequestAccessHint')}</p>
          )}
        </div>

        {businessError && (
          <p className="text-sm text-destructive">{businessError}</p>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => setCreateBusinessOpen(false)} disabled={creatingBusiness}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            className="gap-2"
            onClick={handleCreateBusinessAccount}
            disabled={creatingBusiness || selectedBusinessMatch?.alreadyLinkedToRequester}
            data-testid="add-business-submit"
          >
            {connectingExisting ? <Link2 className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
            {creatingBusiness
              ? t(connectingExisting ? 'home.accountSwitchConnecting' : 'home.accountSwitchCreating')
              : t(connectingExisting ? 'home.accountSwitchConnectAction' : 'home.accountSwitchCreateAction')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
