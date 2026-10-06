import { AnimatePresence, motion } from 'framer-motion';
import { AccountSwitcherTrack } from '@/components/layout/AccountSwitcherTrack';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Pencil, Plus, RefreshCcw } from 'lucide-react';
import type { useUserPageMenu } from '@/components/layout/user-page-menu/useUserPageMenu';

type UserPageMenuModel = ReturnType<typeof useUserPageMenu>;

export function UserPageMenuPanel({ model }: { model: UserPageMenuModel }) {
  const {
    open, setOpen, linkedLoading, linkedError, setCreateBusinessOpen, switchingAccountId, profile,
    t, navigate, location, currentAccountCardRef, pageLinks, canEditProfile,
    accountSessionByProfileId, directlyLinkedProfileIds, accountOptions, orderedAccountOptions,
    handleSwitchAccount,
  } = model;
  return (
    <>
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="page-list"
          data-testid="user-page-menu-panel"
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(320px,calc(100vw-1.5rem))] max-h-[calc(100dvh-6.5rem)] overflow-x-hidden overflow-y-auto overscroll-contain rounded-3xl border border-border/70 bg-card/95 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/92 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="space-y-2 p-2 pt-2">
            <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-2">
              <div className="space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {t('home.accountSwitchTitle')}
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label={t('home.accountSwitchAddBusiness')}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setCreateBusinessOpen(true);
                        }}
                        data-testid="user-page-menu-add-business"
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      {t('home.accountSwitchAddBusiness')}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">{t('home.accountSwitchSubtitle')}</p>
              </div>

              <div className="mt-3 space-y-2">
                {linkedError ? (
                  <p className="text-xs text-destructive">{linkedError}</p>
                ) : (
                  <>
                    <AccountSwitcherTrack className="-mx-1 px-1 pb-0.5">
                      {orderedAccountOptions.map((account) => {
                        const session = accountSessionByProfileId.get(account.profileId);
                        const isCurrent = account.profileId === profile?.id;
                        const canSwitch = Boolean(
                          session?.userId || directlyLinkedProfileIds.has(account.profileId),
                        );
                        const switchTargetKey = session?.userId || account.profileId;
                        const isSwitching = switchingAccountId === switchTargetKey;
                        const displayName = account.fullName || t('common.anonymousUser');
                        const cardClassName = cn(
                          'relative flex snap-center flex-col rounded-2xl border px-3 py-2.5 text-left',
                          orderedAccountOptions.length > 1 ? 'w-[62%] min-w-[62%] shrink-0' : 'w-full',
                          isCurrent
                            ? 'border-primary/40 bg-primary/10'
                            : 'border-border/60 bg-background/80',
                          !isCurrent && canSwitch && 'transition-colors hover:bg-accent/70',
                          isSwitching && 'opacity-80',
                        );
                        const cardBody = (
                          <>
                            <div className="flex items-start justify-between gap-1">
                              {isCurrent ? (
                                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                                  {t('home.accountSwitchCurrent')}
                                </span>
                              ) : isSwitching ? (
                                <RefreshCcw className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
                              ) : (
                                <span className="h-4" />
                              )}
                              {isCurrent &&
                                canEditProfile &&
                                (account.accountType === 'personal' || account.accountType === 'business') && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex">
                                        <button
                                          type="button"
                                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                          aria-label={t('features.pages.editProfile')}
                                          data-account-switcher-no-drag=""
                                          data-testid={`user-page-menu-edit-profile-${account.profileId}`}
                                          onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            navigate('/settings/profile');
                                            setOpen(false);
                                          }}
                                        >
                                          <Pencil className="h-4 w-4" aria-hidden />
                                        </button>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                      {t('features.pages.editProfile')}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                            </div>
                            <p className="mt-1 truncate text-sm font-medium text-foreground">{displayName}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {account.username ? `@${account.username}` : t('home.profileMenuNoUsername')}
                            </p>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              {account.label}
                            </p>
                          </>
                        );

                        if (isCurrent) {
                          return (
                            <div
                              key={account.profileId}
                              ref={(node) => {
                                currentAccountCardRef.current = node;
                              }}
                              data-testid={`account-switcher-card-${account.profileId}`}
                              data-current="true"
                              aria-current="true"
                              className={cardClassName}
                            >
                              {cardBody}
                            </div>
                          );
                        }

                        return (
                          <button
                            key={account.profileId}
                            type="button"
                            data-testid={`account-switcher-card-${account.profileId}`}
                            data-current="false"
                            aria-label={t('home.accountSwitchTo', { name: displayName })}
                            className={cardClassName}
                            disabled={Boolean(switchingAccountId)}
                            onClick={() => handleSwitchAccount(account)}
                          >
                            {cardBody}
                          </button>
                        );
                      })}
                    </AccountSwitcherTrack>
                    {linkedLoading && (
                      <p className="text-[11px] text-muted-foreground">Syncing linked accounts...</p>
                    )}
                    {accountOptions.length === 0 && !linkedLoading && (
                      <p className="text-xs text-muted-foreground">
                        {t('home.accountSwitchNoLinked')}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2 touch-pan-y">
            {pageLinks.map((page) => {
              const Icon = page.icon;
              const isCurrent = location.pathname === page.path;

              return (
                <button
                  key={page.path}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-accent/70',
                    isCurrent && 'bg-primary/10 text-primary hover:bg-primary/10',
                  )}
                  onClick={() => {
                    navigate(page.path);
                    setOpen(false);
                  }}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-background/80',
                      isCurrent && 'border-primary/20 bg-primary/10 text-primary',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium">{t(page.labelKey)}</span>
                    {isCurrent && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                        {t('home.currentPage')}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
