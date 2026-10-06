import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Check, Eye, Loader2, MessageCircle, Share2, ThumbsUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { canShowPublishToSocial, SOCIAL_PROVIDERS } from '@/lib/civizen-org-account';
import { isRecordablePostId } from '@/lib/post-views';
import { type PostPreview } from '@/lib/post-reposts';
import { HomePostOverflowMenu } from '@/components/posts/HomePostOverflowMenu';
import { HomePostInlineEditor } from '@/components/posts/HomePostInlineEditor';
import { PostFormattedBody } from '@/components/posts/PostFormattedBody';
import { canDeletePublishedPost, canEditPublishedPost, postShowsEditedIndicator } from '@/lib/post-edit-policy';
import { HomePostEmbeddedOriginal } from '@/components/home/HomePostEmbeddedOriginal';
import { HomeRepostMenu } from '@/components/home/HomeRepostMenu';
import { cn } from '@/lib/utils';
import { type Post } from '@/pages/home/home-shared';
import type { useHome } from '@/pages/home/useHome';

type HomeModel = ReturnType<typeof useHome>;

export function HomeFeedItem({ model, item, index }: { model: HomeModel; item: HomeModel['feedItems'][number]; index: number }) {
  const {
    postLikes, postComments, postViewStats, expandedComments, commentDrafts, setCommentDrafts,
    setPostContent, likingPostId, submittingCommentPostId, feedBackendUnavailable,
    optimisticLikeStates, editingPost, isSavingEdit, isCivizenOrgAccount, socialConnections,
    socialCrossposts, publishingKey, repostCounts, viewerRepostByOriginal, repostBusyPostId,
    setThoughtsOriginal, setFullOriginal, profile, t, navigate, postEditorRef, canPost, getInitials,
    getDisplayName, formatRelativeTime, viewerPermissions, beginEditPost, cancelEditPost,
    saveEditedPost, deleteOwnPost, toggleLike, activeIdentityLabel, handlePlainRepost,
    handleUndoRepost, toggleComments, handlePublishToSocial, submitComment,
  } = model;

  const post = item.post as Post;
  const interactionPostId = item.interactionPostId;
  const repostTargetPostId = item.repostTargetPostId;
  const likes = postLikes[interactionPostId] || [];
  const comments = postComments[interactionPostId] || [];
  const viewStats = postViewStats[interactionPostId] || { uniqueVisitors: 0, totalViews: 0 };
  const serverHasLiked = profile?.id ? likes.includes(profile.id) : false;
  const hasLiked = optimisticLikeStates[interactionPostId] ?? serverHasLiked;
  const likeCountDelta = hasLiked === serverHasLiked ? 0 : hasLiked ? 1 : -1;
  const likeCount = Math.max(0, likes.length + likeCountDelta);
  const isCommentsOpen = !!expandedComments[interactionPostId];
  const draftComment = commentDrafts[interactionPostId] || '';
  const isSubmittingComment = submittingCommentPostId === interactionPostId;
  const repostCount = repostCounts[repostTargetPostId] || 0;
  const alreadyReposted = Boolean(viewerRepostByOriginal[repostTargetPostId]);
  const showPublish = canShowPublishToSocial({
    isOfficialOrg: isCivizenOrgAccount,
    viewerProfileId: profile?.id,
    postAuthorId: post.author_id,
  });

  return (
    <motion.div
      key={item.key}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.04 }}
    >
      <Card
        data-home-post-id={interactionPostId}
        data-home-post-editing={editingPost?.id === post.id ? 'true' : 'false'}
        className={cn(
          'border-border/70 bg-card/95 p-4 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md',
          editingPost?.id === post.id && 'border-primary/40 shadow-md shadow-primary/10',
        )}
      >
        <div className="min-w-0 space-y-2">
          {item.kind === 'plain_repost' ? (
            <p className="text-xs font-medium text-muted-foreground">
              {t('home.repostedThis', {
                person:
                  item.repost?.reposter?.full_name ||
                  item.repost?.reposter?.username ||
                  activeIdentityLabel,
              })}
            </p>
          ) : null}

          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={post.author?.avatar_url || undefined} />
              <AvatarFallback className="bg-secondary text-sm text-secondary-foreground">
                {getInitials(post.author?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {getDisplayName(post.author)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(item.sortAt)}
                {postShowsEditedIndicator(post) ? ` · ${t('home.edited')}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <HomePostOverflowMenu
                moreLabel={t('home.postActions')}
                editLabel={t('home.editPost')}
                deleteLabel={t('home.deletePost')}
                canEdit={canEditPublishedPost({
                  postAuthorId: post.author_id,
                  viewerProfileId: profile?.id,
                  permissions: viewerPermissions,
                })}
                canDelete={canDeletePublishedPost({
                  postAuthorId: post.author_id,
                  viewerProfileId: profile?.id,
                  permissions: viewerPermissions,
                })}
                onEdit={() => beginEditPost(post)}
                onDelete={() => void deleteOwnPost(post)}
              />
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center justify-center rounded-md p-1 text-muted-foreground outline-none transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={t('home.views')}
                >
                  <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="space-y-0.5 text-xs">
                <p>
                  {t('home.viewsUniqueLabel', {
                    count: String(viewStats.uniqueVisitors),
                  })}
                </p>
                <p>
                  {t('home.viewsTotalLabel', {
                    count: String(Math.max(viewStats.totalViews, viewStats.uniqueVisitors)),
                  })}
                </p>
              </TooltipContent>
            </Tooltip>
            </div>
          </div>

          {item.kind === 'plain_repost' ? null : editingPost?.id === post.id ? (
            <HomePostInlineEditor
              editorRef={postEditorRef}
              disabled={isSavingEdit}
              ariaLabel={t('home.editPost')}
              cancelLabel={t('common.cancel')}
              saveLabel={t('home.saveChanges')}
              savingLabel={t('home.savingChanges')}
              saving={isSavingEdit}
              canSave={canPost}
              onLiveChange={setPostContent}
              onCancel={cancelEditPost}
              onSave={() => void saveEditedPost()}
            />
          ) : (
            <PostFormattedBody content={post.content} />
          )}

          {item.kind === 'quote_repost' ? (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('home.repostedFrom')}
              </p>
              <HomePostEmbeddedOriginal
                original={item.embeddedOriginal}
                unavailableLabel={t('home.originalPostUnavailable')}
                originalBadgeLabel={t('home.originalPost')}
                seeFullLabel={t('home.seeFullPost')}
                onOpenFull={() =>
                  setFullOriginal(item.embeddedOriginal as PostPreview | null)
                }
              />
            </div>
          ) : null}

          {item.kind === 'plain_repost' ? (
            <HomePostEmbeddedOriginal
              original={item.embeddedOriginal}
              unavailableLabel={t('home.originalPostUnavailable')}
              originalBadgeLabel={t('home.originalPost')}
              seeFullLabel={t('home.seeFullPost')}
              onOpenFull={() =>
                setFullOriginal(item.embeddedOriginal as PostPreview | null)
              }
            />
          ) : null}

          <div className="border-t border-border/60 pt-2.5">
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <Button
                size="sm"
                variant="ghost"
                className={`gap-1.5 rounded-xl px-2.5 sm:gap-2 sm:px-3 ${hasLiked ? 'bg-primary/10 text-primary hover:bg-primary/15' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'}`}
                onClick={() => toggleLike(interactionPostId)}
                disabled={likingPostId === interactionPostId}
              >
                <ThumbsUp className={`h-4 w-4 ${hasLiked ? 'fill-primary' : ''}`} />
                {hasLiked ? t('home.liked') : t('home.like')}
                {likeCount > 0 ? ` (${likeCount})` : ''}
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 rounded-xl px-2.5 text-muted-foreground hover:bg-muted/70 hover:text-foreground sm:gap-2 sm:px-3"
                onClick={() => toggleComments(interactionPostId)}
              >
                <MessageCircle className="h-4 w-4" />
                {t('home.comment')}
                {comments.length > 0 ? ` (${comments.length})` : ''}
              </Button>

              <HomeRepostMenu
                activeIdentityLabel={activeIdentityLabel}
                repostLabel={t('home.repost')}
                repostWithThoughtsLabel={t('home.repostWithThoughts')}
                plainRepostDescription={t('home.repostPlainDescription')}
                thoughtsDescription={t('home.repostThoughtsDescription')}
                postingAsLabel={t('home.postingAs')}
                alreadyRepostedLabel={t('home.alreadyReposted')}
                undoRepostLabel={t('home.undoRepost')}
                count={repostCount}
                alreadyReposted={alreadyReposted}
                busy={repostBusyPostId === repostTargetPostId}
                disabled={feedBackendUnavailable || !isRecordablePostId(repostTargetPostId)}
                onPlainRepost={() => {
                  const target =
                    item.kind === 'plain_repost'
                      ? item.embeddedOriginal
                      : item.kind === 'quote_repost'
                        ? item.embeddedOriginal
                        : post;
                  if (target) void handlePlainRepost(target as Post);
                }}
                onRepostWithThoughts={() => {
                  const target =
                    item.kind === 'original'
                      ? post
                      : item.embeddedOriginal;
                  if (target) setThoughtsOriginal(target);
                }}
                onUndoRepost={() => void handleUndoRepost(repostTargetPostId)}
              />

              {showPublish ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 rounded-xl px-2.5 text-muted-foreground hover:bg-muted/70 hover:text-foreground sm:gap-2 sm:px-3"
                    >
                      <Share2 className="h-4 w-4" />
                      {t('home.publishTo')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-52 p-2">
                    <div className="space-y-1">
                      {SOCIAL_PROVIDERS.map((provider) => {
                        const connection = socialConnections.find((row) => row.provider === provider);
                        const published = (socialCrossposts[interactionPostId] || []).some(
                          (row) => row.provider === provider && row.status === 'published',
                        );
                        const busy = publishingKey === `${interactionPostId}:${provider}`;
                        const labelKey =
                          provider === 'linkedin'
                            ? 'home.publishToLinkedIn'
                            : provider === 'facebook'
                              ? 'home.publishToFacebook'
                              : 'home.publishToX';

                        if (published) {
                          return (
                            <Button
                              key={provider}
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start gap-2"
                              disabled
                            >
                              <Check className="h-4 w-4 text-primary" />
                              {t(labelKey)} · {t('home.publishToAlready')}
                            </Button>
                          );
                        }

                        if (!connection?.connected) {
                          return (
                            <Button
                              key={provider}
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start gap-2 text-muted-foreground"
                              onClick={() => navigate('/settings/social-accounts')}
                            >
                              <Share2 className="h-4 w-4" />
                              {t(labelKey)} · {t('home.publishToConnect')}
                            </Button>
                          );
                        }

                        return (
                          <Button
                            key={provider}
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2"
                            disabled={busy}
                            onClick={() => void handlePublishToSocial(interactionPostId, provider)}
                          >
                            {busy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Share2 className="h-4 w-4" />
                            )}
                            {busy ? t('home.publishToPublishing') : t(labelKey)}
                          </Button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : null}
            </div>
          </div>

          {isCommentsOpen && (
            <div className="space-y-3 pt-1">
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t('home.noCommentsYet')}
                </p>
              ) : (
                <div className="space-y-2">
                  {comments.map((comment) => (
                    <div key={comment.id} className="rounded-2xl border border-border/50 bg-muted/35 p-3 shadow-sm">
                      <p className="text-xs font-medium text-foreground">
                        {getDisplayName(comment.author)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                        {comment.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <textarea
                  className="min-h-[68px] w-full resize-none rounded-2xl border border-border/70 bg-background/90 p-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  placeholder={t('home.writeComment')}
                  value={draftComment}
                  onChange={(event) =>
                    setCommentDrafts((prev) => ({
                      ...prev,
                      [interactionPostId]: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="rounded-xl px-4"
                  onClick={() => submitComment(interactionPostId)}
                  disabled={isSubmittingComment || !draftComment.trim()}
                >
                  {isSubmittingComment ? t('home.posting') : t('home.postComment')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
