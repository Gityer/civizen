import { useEffect, useMemo } from 'react';
import { usePageSecondaryNav } from '@/hooks/usePageSecondaryNav';
import { supabase } from '@/integrations/supabase/client';
import { buildScoreFromProfileActivity, type CivizenScoreResponse } from '@/lib/civizen-score';
import { ownProfileRingDisplay } from '@/lib/civizen-score-ring-display';
import { scoreProgressCaption } from '@/lib/civizen-score-caption';
import { type PillarId } from '@/lib/constants';
import { toast } from 'sonner';
import { serializePostContent } from '@/lib/posts-html';
import { buildCuratedStoryList, type CuratedStoryListItem } from '@/lib/development-story-curation';
import { type Post } from '@/pages/home/home-shared';
import type { useHomeCore } from '@/pages/home/useHomeCore';
import type { useHomeFeed } from '@/pages/home/useHomeFeed';
import type { useHomePostActions } from '@/pages/home/useHomePostActions';

export function useHomeContent({ endorsements, educationCount, verifiedEducationCount, educationLevels, trainingCount, skillCount, declaredSkillNames, demonstratedSkills, demonstratedProjects, experienceCount, experienceMonths, contributionInput, performanceInput, posts, setPosts, setPostLikes, setPostComments, postContent, isPosting, setIsPosting, feedBackendUnavailable, setFeedBackendUnavailable, setOptimisticLikeStates, editingPost, homeTab, setHomeTab, storyGroupTab, storySectionFilter, storyAreaFilter, selectedStoryId, setSelectedStoryId, profile, t, developmentStories, navigate, postEditorRef, normalizePost, isMissingTableError, getFeedStorageKey, readStoredValue, clearPostComposerDraft, mergePostsById, persistLocalPosts, fetchData, saveEditedPost }: ReturnType<typeof useHomeCore> & ReturnType<typeof useHomeFeed> & ReturnType<typeof useHomePostActions>) {
  useEffect(() => {
    if (profile?.id) {
      setOptimisticLikeStates({});
      fetchData();
      const cleanup = subscribeToPosts();
      return cleanup;
    }
  }, [profile?.id]);


  const score: CivizenScoreResponse = useMemo(
    () =>
      buildScoreFromProfileActivity({
        userId: profile?.id,
        educationCount,
        verifiedEducationCount,
        educationLevels,
        trainingCount,
        skillCount,
        declaredSkillNames,
        demonstratedSkills,
        demonstratedProjects,
        experienceCount,
        experienceMonths,
        endorsementCount: endorsements.length,
        contributions: contributionInput,
        performance: performanceInput,
      }),
    [
      profile?.id,
      educationCount,
      verifiedEducationCount,
      educationLevels,
      trainingCount,
      skillCount,
      declaredSkillNames,
      demonstratedSkills,
      demonstratedProjects,
      experienceCount,
      experienceMonths,
      endorsements.length,
      contributionInput,
      performanceInput,
    ],
  );

  const homeSecondaryNav = useMemo(
    () => ({
      defaultValue: 'all',
      items: [
        { id: 'all', label: t('home.tabAll') },
        {
          id: 'stories',
          label: t('home.tabDevelopmentLog'),
          title: t('home.tabDevelopmentLogTitle'),
        },
      ],
      value: homeTab,
      onChange: (value: string) => {
        if (value === 'all' || value === 'stories') {
          setHomeTab(value);
        }
      },
      fab:
        homeTab === 'stories' && storyGroupTab === 'suggestions'
          ? {
              label: t('home.addSuggestion'),
              ariaLabel: t('home.addSuggestionAria'),
              onClick: () => navigate('/contribute/matters/new?intent=improvement'),
            }
          : null,
    }),
    [homeTab, storyGroupTab, navigate, t],
  );
  usePageSecondaryNav(homeSecondaryNav);

  const showHomeGovernanceHub = Boolean(profile);
  const showScoreCard = homeTab === 'all';
  const showComposer = homeTab === 'all';
  const showQuickActions = homeTab === 'all';
  const showPostsFeed = homeTab === 'all';
  const showRecentEndorsements = homeTab === 'all';
  const showDevelopmentStories = homeTab === 'stories';
  const homeScoreTierId = score.tier.finalTier ?? 'explorer';
  const homeScoreTierLabel = t(`score.tier.${homeScoreTierId}`);
  const homePointsToNextLabel = scoreProgressCaption(score, t) || null;
  const homeRing = ownProfileRingDisplay(score);
  const curatedStories = useMemo<CuratedStoryListItem[]>(
    () => buildCuratedStoryList(developmentStories),
    [developmentStories],
  );
  const sectionFilters = useMemo(() => Array.from(new Set(curatedStories.map((story) => story.section))), [curatedStories]);
  const areaFilters = useMemo(() => Array.from(new Set(curatedStories.map((story) => story.area))), [curatedStories]);
  const filteredStories = useMemo(() => {
    return curatedStories.filter((story) => {
      const matchesSection = storySectionFilter === 'all' || story.section === storySectionFilter;
      const matchesArea = storyAreaFilter === 'all' || story.area === storyAreaFilter;
      return matchesSection && matchesArea;
    });
  }, [curatedStories, storyAreaFilter, storySectionFilter]);
  const storyKindTab = storyGroupTab === 'suggestions' ? 'suggestion' : 'development';
  const visibleStories = useMemo(
    () => filteredStories.filter((story) => (story.storyKind ?? 'development') === storyKindTab),
    [filteredStories, storyKindTab],
  );
  useEffect(() => {
    if (visibleStories.length === 0) {
      setSelectedStoryId(null);
      return;
    }

    if (selectedStoryId && !visibleStories.some((story) => story.id === selectedStoryId)) {
      setSelectedStoryId(null);
    }
  }, [selectedStoryId, visibleStories]);

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPillarName = (id: PillarId) => {
    switch (id) {
      case 'education_skills':
        return t('pillars.educationShort');
      case 'culture_ethics':
        return t('pillars.cultureShort');
      case 'responsibility_reliability':
        return t('pillars.responsibilityShort');
      case 'environment_community':
        return t('pillars.communityShort');
      case 'economy_contribution':
        return t('pillars.economyShort');
      default:
        return id;
    }
  };

  const getDisplayName = (person?: { full_name?: string; username?: string }) => {
    return person?.full_name || person?.username || t('common.anonymousUser');
  };

  const formatRelativeTime = (createdAt: string) => {
    const now = Date.now();
    const date = new Date(createdAt).getTime();
    const diffMs = now - date;

    if (diffMs < 60_000) return t('home.justNow');
    if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m`;
    if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h`;
    if (diffMs < 604_800_000) return `${Math.floor(diffMs / 86_400_000)}d`;

    return new Date(createdAt).toLocaleDateString();
  };

  const subscribeToPosts = () => {
    if (feedBackendUnavailable) {
      return () => undefined;
    }

    const channel = supabase
      .channel('home-posts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id?: string } | null)?.id;
            if (deletedId) {
              setPosts((prev) => prev.filter((post) => post.id !== deletedId));
            }
            return;
          }
          supabase
            .from('posts')
            .select(`
              id,
              content,
              created_at,
              author_id,
              is_edited,
              edited_at,
              author:profiles!posts_author_id_fkey(id, username, full_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single()
            .then(({ data, error }) => {
              if (error || !data) return;
              const normalized = normalizePost(data);
              setPosts((prev) => {
                return mergePostsById(prev, [normalized]);
              });
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createPost = async () => {
    if (editingPost) {
      await saveEditedPost();
      return;
    }
    const content = serializePostContent(postEditorRef.current?.innerHTML || postContent);
    if (!content || !profile?.id || isPosting) return;
    setIsPosting(true);
    const localPost: Post = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content,
      created_at: new Date().toISOString(),
      author_id: profile.id,
      is_edited: false,
      edited_at: null,
      syncStatus: 'local',
      author: {
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      },
    };

    try {
      if (feedBackendUnavailable) {
        setPosts((prev) => mergePostsById(prev, [localPost]));
        setPostLikes((prev) => ({ ...prev, [localPost.id]: [] }));
        setPostComments((prev) => ({ ...prev, [localPost.id]: [] }));
        persistLocalPosts(mergePostsById(readStoredValue<Post[]>(getFeedStorageKey('posts'), []), [localPost]));
        toast.message(t('home.savedLocallyPost'), {
          description: t('home.savedLocallyPostDescription'),
        });
        clearPostComposerDraft();
        return;
      }

      const { data, error } = await supabase
        .from('posts')
        .insert({
          author_id: profile.id,
          content,
        })
        .select(`
          id,
          content,
          created_at,
          author_id,
          is_edited,
          edited_at,
          author:profiles!posts_author_id_fkey(id, username, full_name, avatar_url)
        `)
        .single();

      if (error) {
        console.error('Error creating post:', error);
        if (isMissingTableError(error)) {
          setFeedBackendUnavailable(true);
          setPosts((prev) => mergePostsById(prev, [localPost]));
          setPostLikes((prev) => ({ ...prev, [localPost.id]: [] }));
          setPostComments((prev) => ({ ...prev, [localPost.id]: [] }));
          persistLocalPosts(mergePostsById(readStoredValue<Post[]>(getFeedStorageKey('posts'), []), [localPost]));
          toast.message(t('home.savedLocallyPost'), {
            description: t('home.savedLocallyPostDescription'),
          });
          clearPostComposerDraft();
        } else {
          toast.error(t('home.couldNotCreatePost'), {
            description: t('common.tryAgainMoment'),
          });
        }
        return;
      }

      if (data) {
        const normalized = normalizePost(data);
        setPosts((prev) => mergePostsById(prev, [normalized]));
        setPostLikes(prev => ({ ...prev, [normalized.id]: [] }));
        setPostComments(prev => ({ ...prev, [normalized.id]: [] }));
        clearPostComposerDraft();
        toast.success(t('home.postedToFeed'));
      }
    } catch (err) {
      console.error('Error creating post:', err);
      setPosts((prev) => mergePostsById(prev, [localPost]));
      setPostLikes((prev) => ({ ...prev, [localPost.id]: [] }));
      setPostComments((prev) => ({ ...prev, [localPost.id]: [] }));
      persistLocalPosts(mergePostsById(readStoredValue<Post[]>(getFeedStorageKey('posts'), []), [localPost]));
      toast.message(t('home.savedLocallyPost'), {
        description: t('home.savedLocallyPostDescription'),
      });
      clearPostComposerDraft();
    } finally {
      setIsPosting(false);
    }
  };

  return {
    score, showHomeGovernanceHub, showScoreCard, showComposer, showQuickActions, showPostsFeed,
    showRecentEndorsements, showDevelopmentStories, homeScoreTierId, homeScoreTierLabel,
    homePointsToNextLabel, homeRing, sectionFilters, areaFilters, visibleStories, getInitials,
    getPillarName, getDisplayName, formatRelativeTime, createPost,
  };
}
