import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isRecordablePostId } from '@/lib/post-views';
import { buildHomeFeedItems, type PostPreview } from '@/lib/post-reposts';
import { type AppPermission } from '@/lib/access-control';
import { editPublishedPost } from '@/lib/edit-published-post';
import { canDeletePublishedPost, canEditPublishedPost } from '@/lib/post-edit-policy';
import { postHtmlIsEmpty, serializePostContent } from '@/lib/posts-html';
import { type Post } from '@/pages/home/home-shared';
import type { useHomeCore } from '@/pages/home/useHomeCore';
import type { useHomeFeed } from '@/pages/home/useHomeFeed';

export function useHomePostActions({ posts, setPosts, postLikes, setPostLikes, postContent, setPostContent, likingPostId, setLikingPostId, feedBackendUnavailable, setFeedBackendUnavailable, optimisticLikeStates, setOptimisticLikeStates, setIsComposerFocused, editingPost, setEditingPost, isSavingEdit, setIsSavingEdit, postReposts, profile, t, composeDraftBackupRef, postEditorRef, isMissingTableError, getFeedStorageKey, readStoredValue, mergePostsById, persistLocalPosts, persistLocalLikes }: ReturnType<typeof useHomeCore> & ReturnType<typeof useHomeFeed>) {
  const viewerPermissions = (profile?.effective_permissions || []) as AppPermission[];

  const beginEditPost = (post: Post) => {
    if (
      !canEditPublishedPost({
        postAuthorId: post.author_id,
        viewerProfileId: profile?.id,
        permissions: viewerPermissions,
      })
    ) {
      toast.error(t('home.couldNotUpdatePost'));
      return;
    }
    composeDraftBackupRef.current = postHtmlIsEmpty(postContent) ? '' : postContent;
    setEditingPost(post);
    setPostContent(post.content);
    setIsComposerFocused(false);
  };

  const cancelEditPost = () => {
    const backup = composeDraftBackupRef.current;
    setEditingPost(null);
    composeDraftBackupRef.current = '';
    setPostContent(backup);
  };

  const saveEditedPost = async () => {
    if (!editingPost || !profile?.id || isSavingEdit) return;
    const content = serializePostContent(postEditorRef.current?.innerHTML || postContent);
    if (!content) return;

    if (
      !canEditPublishedPost({
        postAuthorId: editingPost.author_id,
        viewerProfileId: profile.id,
        permissions: viewerPermissions,
      })
    ) {
      toast.error(t('home.couldNotUpdatePost'));
      return;
    }

    if (content === serializePostContent(editingPost.content)) {
      cancelEditPost();
      return;
    }

    setIsSavingEdit(true);
    try {
      if (feedBackendUnavailable || !isRecordablePostId(editingPost.id)) {
        const edited: Post = {
          ...editingPost,
          content,
          is_edited: true,
          edited_at: new Date().toISOString(),
        };
        setPosts((prev) => mergePostsById(prev, [edited]));
        persistLocalPosts(mergePostsById(readStoredValue<Post[]>(getFeedStorageKey('posts'), []), [edited]));
        toast.success(t('home.postUpdated'));
        cancelEditPost();
        return;
      }

      const row = await editPublishedPost({ postId: editingPost.id, html: content });
      setPosts((prev) =>
        mergePostsById(prev, [
          {
            ...editingPost,
            content: row.content,
            created_at: row.created_at,
            author_id: row.author_id,
            is_edited: row.is_edited,
            edited_at: row.edited_at,
          },
        ]),
      );
      toast.success(t('home.postUpdated'));
      cancelEditPost();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(t('home.couldNotUpdatePost'), {
        description: message || t('common.tryAgainMoment'),
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const deleteOwnPost = async (post: Post) => {
    if (
      !canDeletePublishedPost({
        postAuthorId: post.author_id,
        viewerProfileId: profile?.id,
        permissions: viewerPermissions,
      })
    ) {
      return;
    }
    const confirmed = window.confirm(t('home.confirmDeletePost'));
    if (!confirmed) return;

    if (feedBackendUnavailable || !isRecordablePostId(post.id)) {
      setPosts((prev) => prev.filter((row) => row.id !== post.id));
      persistLocalPosts(
        readStoredValue<Post[]>(getFeedStorageKey('posts'), []).filter((row) => row.id !== post.id),
      );
      toast.success(t('home.postDeleted'));
      if (editingPost?.id === post.id) cancelEditPost();
      return;
    }

    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (error) {
      toast.error(t('home.couldNotDeletePost'), {
        description: t('common.tryAgainMoment'),
      });
      return;
    }
    setPosts((prev) => prev.filter((row) => row.id !== post.id));
    toast.success(t('home.postDeleted'));
    if (editingPost?.id === post.id) cancelEditPost();
  };

  const toggleLike = async (postId: string) => {
    if (!profile?.id || likingPostId === postId) return;

    const likedByUsers = postLikes[postId] || [];
    const serverHasLiked = likedByUsers.includes(profile.id);
    const hasLiked = optimisticLikeStates[postId] ?? serverHasLiked;
    const updatedLikes = hasLiked
      ? likedByUsers.filter((userId) => userId !== profile.id)
      : [...likedByUsers, profile.id];
    const nextHasLiked = !hasLiked;

    setLikingPostId(postId);
    setOptimisticLikeStates((prev) => ({ ...prev, [postId]: nextHasLiked }));
    setPostLikes((prev) => {
      const next = { ...prev, [postId]: updatedLikes };
      if (feedBackendUnavailable) {
        persistLocalLikes(next);
      }
      return next;
    });

    if (feedBackendUnavailable) {
      setLikingPostId(null);
      return;
    }

    const query = supabase.from('post_likes');
    const { error } = hasLiked
      ? await query.delete().eq('post_id', postId).eq('user_id', profile.id)
      : await query.insert({
          post_id: postId,
          user_id: profile.id,
        });

    if (error) {
      console.error('Error toggling like:', error);
      if (error.code === '23505' || /duplicate key/i.test(error.message || '')) {
        setOptimisticLikeStates((prev) => ({
          ...prev,
          [postId]: true,
        }));
        setLikingPostId(null);
        return;
      }

      if (isMissingTableError(error)) {
        setFeedBackendUnavailable(true);
        const fallbackLikes = { ...postLikes, [postId]: updatedLikes };
        setOptimisticLikeStates((prev) => ({
          ...prev,
          [postId]: nextHasLiked,
        }));
        setPostLikes(fallbackLikes);
        persistLocalLikes(fallbackLikes);
        toast.message(t('home.savedLocallyPost'), {
          description: t('home.savedLocallyLikeDescription'),
        });
      } else {
        // Roll back optimistic UI when the server rejected the like.
        setOptimisticLikeStates((prev) => ({
          ...prev,
          [postId]: hasLiked,
        }));
        setPostLikes((prev) => ({
          ...prev,
          [postId]: likedByUsers,
        }));
        toast.error(t('home.couldNotSaveLike'), {
          description: t('common.tryAgainMoment'),
        });
      }
    } else {
      setOptimisticLikeStates((prev) => ({
        ...prev,
        [postId]: nextHasLiked,
      }));
    }

    setLikingPostId(null);
  };

  const activeIdentityLabel =
    profile?.full_name?.trim() ||
    (profile?.username ? `@${profile.username}` : '') ||
    t('home.someone');

  const feedItems = useMemo(
    () => buildHomeFeedItems(posts as PostPreview[], postReposts),
    [posts, postReposts],
  );

  return {
    viewerPermissions, beginEditPost, cancelEditPost, saveEditedPost, deleteOwnPost, toggleLike,
    activeIdentityLabel, feedItems,
  };
}
