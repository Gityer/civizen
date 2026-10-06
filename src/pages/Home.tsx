import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { BadgeCheck, BadgeX, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getPreparedRepostDraft } from '@/lib/prepared-repost-drafts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HomeFullOriginalBody } from '@/components/home/HomePostEmbeddedOriginal';
import { HomeRepostThoughtsDialog } from '@/components/home/HomeRepostThoughtsDialog';
import { cn } from '@/lib/utils';
import { type Post } from '@/pages/home/home-shared';
import { useHome } from '@/pages/home/useHome';
import { HomeScoreCard } from '@/pages/home/HomeScoreCard';
import { HomeComposer } from '@/pages/home/HomeComposer';
import { HomeFeedItem } from '@/pages/home/HomeFeedItem';
import { HomeStories } from '@/pages/home/HomeStories';
import { HomeEndorsements } from '@/pages/home/HomeEndorsements';

export default function Home() {
  const model = useHome();
  const {
    loading, feedBackendUnavailable, thoughtsOriginal, setThoughtsOriginal, fullOriginal,
    setFullOriginal, profile, t, navigate, showHomeGovernanceHub, showQuickActions, showPostsFeed,
    activeIdentityLabel, feedItems, handleRepostWithThoughts,
  } = model;

  if (!profile?.id) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-pulse-soft text-muted-foreground">{t('common.loading')}</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between gap-4 pr-[5.75rem]"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {t('home.welcomeUser', { name: profile?.full_name?.split(' ')[0] || t('home.friend') })}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-lg text-muted-foreground">
              <span>{t('home.worldCitizen')}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        'inline-flex h-5 w-5 items-center justify-center rounded-full',
                        profile?.is_verified
                          ? 'bg-sky-500/10 text-sky-600 dark:text-sky-300'
                          : 'bg-muted text-muted-foreground',
                      )}
                      aria-label={profile?.is_verified ? t('home.verifiedBadge') : t('home.unverifiedBadge')}
                    >
                      {profile?.is_verified ? <BadgeCheck className="h-3.5 w-3.5" /> : <BadgeX className="h-3.5 w-3.5" />}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {profile?.is_verified ? t('home.userIsVerified') : t('home.userIsUnverified')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </motion.div>

        {/* Score Card */}
        <HomeScoreCard model={model} />

        {/* Quick Actions */}
        {showHomeGovernanceHub && showQuickActions ? (
          <motion.div
            className={cn('grid gap-3', 'grid-cols-1')}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card
              className="cursor-pointer border-border/70 bg-card/95 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md sm:p-4"
              onClick={() => navigate('/governance')}
            >
              <div className="flex items-center gap-3">
                <Landmark className="h-8 w-8 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground">{t('home.governanceHub')}</h3>
                  <p className="text-xs text-muted-foreground">{t('home.governanceHubDescription')}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : null}

        {/* Create Post / Share an idea block */}
        <HomeComposer model={model} />

        {/* User Posts Feed */}
        {showPostsFeed ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
          {feedBackendUnavailable && (
            <Card className="mb-4 border-amber-500/25 bg-amber-500/5 p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">{t('home.localFeedModeTitle')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('home.localFeedModeDescription')}
              </p>
            </Card>
          )}

          {feedItems.length === 0 ? (
            <Card className="mb-4 border-2 border-dashed border-border/70 bg-card/70 p-6 shadow-sm">
              {loading ? (
                <div className="space-y-3" aria-busy="true" aria-label={t('common.loading')}>
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted/50" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted/40" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-muted/40" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('home.noPostsYet')}
                </p>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {feedItems.map((item, index) => {
                return <HomeFeedItem key={item.key} model={model} item={item} index={index} />;
              })}
            </div>
          )}
          </motion.div>
        ) : null}

        <HomeStories model={model} />

        {/* Recent Endorsements */}
        <HomeEndorsements model={model} />
      </div>

      <HomeRepostThoughtsDialog
        open={Boolean(thoughtsOriginal)}
        onOpenChange={(open) => {
          if (!open) setThoughtsOriginal(null);
        }}
        activeName={activeIdentityLabel}
        activeAvatarUrl={profile?.avatar_url}
        postingAsLabel={t('home.postingAs')}
        title={t('home.repostWithThoughts')}
        placeholder={t('home.repostThoughtsPlaceholder')}
        cancelLabel={t('common.cancel')}
        postLabel={t('home.post')}
        postingLabel={t('home.posting')}
        originalBadgeLabel={t('home.originalPost')}
        unavailableLabel={t('home.originalPostUnavailable')}
        seeFullLabel={t('home.seeFullPost')}
        original={thoughtsOriginal}
        initialDraft={getPreparedRepostDraft({
          activeProfileId: profile?.id,
          originalPostId: thoughtsOriginal?.id,
        })}
        onSubmit={async (commentary) => {
          try {
            await handleRepostWithThoughts(commentary);
          } catch (error) {
            console.error('Error creating repost with thoughts:', error);
            toast.error(t('home.couldNotRepost'), {
              description: t('common.tryAgainMoment'),
            });
            throw error;
          }
        }}
        onOpenOriginal={() => {
          if (thoughtsOriginal) setFullOriginal(thoughtsOriginal);
        }}
      />

      <Dialog
        open={Boolean(fullOriginal)}
        onOpenChange={(open) => {
          if (!open) setFullOriginal(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('home.originalPost')}</DialogTitle>
          </DialogHeader>
          {fullOriginal ? <HomeFullOriginalBody original={fullOriginal} /> : null}
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
