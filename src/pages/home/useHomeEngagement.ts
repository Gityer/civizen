import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { type SocialProvider } from '@/lib/civizen-org-account';
import { providerDisplayName, publishPostToSocial } from '@/lib/social-accounts';
import { isRecordablePostId } from '@/lib/post-views';
import { createPlainRepost, createRepostWithThoughts, deleteRepost, fetchRecentPostReposts, fetchRepostCounts, fetchViewerRepostMap } from '@/lib/post-reposts';
import { type Post, type PostComment } from '@/pages/home/home-shared';
import type { useHomeCore } from '@/pages/home/useHomeCore';
import type { useHomeFeed } from '@/pages/home/useHomeFeed';

export function useHomeEngagement({ posts, setPosts, setPostComments, setExpandedComments, commentDrafts, setCommentDrafts, submittingCommentPostId, setSubmittingCommentPostId, feedBackendUnavailable, setFeedBackendUnavailable, setSocialCrossposts, publishingKey, setPublishingKey, setPostReposts, setRepostCounts, viewerRepostByOriginal, setViewerRepostByOriginal, setRepostBusyPostId, thoughtsOriginal, profile, t, isMissingTableError, mergePostsById, persistLocalComments }: ReturnType<typeof useHomeCore> & ReturnType<typeof useHomeFeed>) {
  const refreshRepostState = async (postIds: string[]) => {
    if (!profile?.id) return;
    try {
      const [reposts, counts, viewerMap] = await Promise.all([
        fetchRecentPostReposts(50),
        fetchRepostCounts(postIds),
        fetchViewerRepostMap(profile.id, postIds),
      ]);
      setPostReposts(reposts);
      setRepostCounts(counts);
      setViewerRepostByOriginal(viewerMap);
    } catch (error) {
      console.error('Error refreshing reposts:', error);
    }
  };

  const handlePlainRepost = async (original: Post) => {
    if (!profile?.id || feedBackendUnavailable || !isRecordablePostId(original.id)) {
      toast.error(t('home.couldNotRepost'));
      return;
    }
    if (viewerRepostByOriginal[original.id]) {
      toast.message(t('home.alreadyReposted'));
      return;
    }
    setRepostBusyPostId(original.id);
    try {
      await createPlainRepost({
        originalPostId: original.id,
        reposterProfileId: profile.id,
      });
      toast.success(t('home.repostedToFeed'));
      await refreshRepostState([
        original.id,
        ...posts.map((post) => post.id),
      ]);
    } catch (error) {
      console.error('Error creating plain repost:', error);
      toast.error(t('home.couldNotRepost'), {
        description: t('common.tryAgainMoment'),
      });
    } finally {
      setRepostBusyPostId(null);
    }
  };

  const handleRepostWithThoughts = async (commentary: string) => {
    if (!profile?.id || !thoughtsOriginal?.id) return;
    const result = await createRepostWithThoughts({
      originalPostId: thoughtsOriginal.id,
      reposterProfileId: profile.id,
      commentary,
    });
    const commentaryAsPost: Post = {
      id: result.commentaryPost.id,
      content: result.commentaryPost.content,
      created_at: result.commentaryPost.created_at,
      author_id: result.commentaryPost.author_id,
      is_edited: false,
      edited_at: null,
      syncStatus: 'remote',
      author: {
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      },
    };
    setPosts((prev) => mergePostsById(prev, [commentaryAsPost]));
    toast.success(t('home.repostedWithThoughts'));
    await refreshRepostState([
      thoughtsOriginal.id,
      commentaryAsPost.id,
      ...posts.map((post) => post.id),
    ]);
  };

  const handleUndoRepost = async (originalPostId: string) => {
    const repostId = viewerRepostByOriginal[originalPostId];
    if (!repostId) return;
    setRepostBusyPostId(originalPostId);
    try {
      await deleteRepost(repostId);
      toast.message(t('home.repostRemoved'));
      await refreshRepostState([originalPostId, ...posts.map((post) => post.id)]);
    } catch (error) {
      console.error('Error removing repost:', error);
      toast.error(t('home.couldNotRemoveRepost'), {
        description: t('common.tryAgainMoment'),
      });
    } finally {
      setRepostBusyPostId(null);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handlePublishToSocial = async (postId: string, provider: SocialProvider) => {
    const key = `${postId}:${provider}`;
    if (publishingKey === key) return;
    setPublishingKey(key);
    try {
      await publishPostToSocial({ postId, provider });
      setSocialCrossposts((prev) => {
        const existing = (prev[postId] || []).filter((row) => row.provider !== provider);
        return {
          ...prev,
          [postId]: [...existing, { provider, status: 'published', externalPostId: null }],
        };
      });
      toast.success(t('home.publishToSuccess', { network: providerDisplayName(provider) }));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('home.publishToFailed', { network: providerDisplayName(provider) }),
      );
    } finally {
      setPublishingKey(null);
    }
  };

  const submitComment = async (postId: string) => {
    if (!profile?.id || submittingCommentPostId === postId) return;
    const content = commentDrafts[postId]?.trim();
    if (!content) return;

    setSubmittingCommentPostId(postId);
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          author_id: profile.id,
          content,
        })
        .select(`
          id,
          post_id,
          content,
          created_at,
          author_id,
          author:profiles!post_comments_author_id_fkey(id, username, full_name, avatar_url)
        `)
        .single();

      if (error) {
        console.error('Error creating comment:', error);
        if (isMissingTableError(error)) {
          setFeedBackendUnavailable(true);
          const localComment: PostComment = {
            id: `local-comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            post_id: postId,
            content,
            created_at: new Date().toISOString(),
            author_id: profile.id,
            author: {
              id: profile.id,
              username: profile.username,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            },
          };

          setPostComments((prev) => {
            const updated = {
              ...prev,
              [postId]: [...(prev[postId] || []), localComment],
            };
            persistLocalComments(updated);
            return updated;
          });
          setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
          setExpandedComments((prev) => ({ ...prev, [postId]: true }));
          toast.message(t('home.savedLocallyPost'), {
            description: t('home.savedLocallyCommentDescription'),
          });
        }
        return;
      }

      if (data) {
        setPostComments((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), {
            ...data,
            author: data.author as PostComment['author'],
          }],
        }));
        setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
        setExpandedComments((prev) => ({ ...prev, [postId]: true }));
      }
    } catch (err) {
      console.error('Error creating comment:', err);
    } finally {
      setSubmittingCommentPostId(null);
    }
  };

  return {
    handlePlainRepost, handleRepostWithThoughts, handleUndoRepost, toggleComments,
    handlePublishToSocial, submitComment,
  };
}
