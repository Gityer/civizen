import { supabase, supabaseUntyped } from '@/integrations/supabase/untyped';
import { countSkillsFromEntry, declaredSkillNamesFromEntry } from '@/lib/profile-skills';
import { countTrainingsFromEntry } from '@/lib/profile-trainings';
import { parseExperienceEntries, cumulativeExperienceMonths } from '@/lib/profile-experience';
import { demonstratedProjectsFromContributionEvents, demonstratedSkillsFromContributionEvents, loadContributionEventsThenSync, scoreContributionsFromEvents, type ContributionEvent } from '@/lib/civizen-contributions';
import { loadPerformanceRatings, scorePerformanceFromEvents } from '@/lib/civizen-performance';
import { type PillarId } from '@/lib/constants';
import { fetchPostViewStats } from '@/lib/post-views';
import { fetchRecentPostReposts, fetchRepostCounts, fetchViewerRepostMap } from '@/lib/post-reposts';
import { type FeedQueryError, type Post, type PostComment, type RecentEndorsement } from '@/pages/home/home-shared';
import type { useHomeCore } from '@/pages/home/useHomeCore';

export function useHomeFeed({ endorsements, setEndorsements, setEducationCount, setVerifiedEducationCount, setEducationLevels, setTrainingCount, setSkillCount, setDeclaredSkillNames, setDemonstratedSkills, setDemonstratedProjects, setExperienceCount, setExperienceMonths, setContributionInput, setPerformanceInput, setRecentEndorsements, posts, setPosts, setPostLikes, setPostComments, setPostViewStats, setLoading, setFeedBackendUnavailable, setPostReposts, setRepostCounts, setViewerRepostByOriginal, profile, normalizePost, isMissingTableError, getFeedStorageKey, readStoredValue, writeStoredValue }: ReturnType<typeof useHomeCore>) {
  const mergePostsById = (existingPosts: Post[], incomingPosts: Post[]) => {
    const merged = new Map<string, Post>();

    existingPosts.forEach((post) => {
      merged.set(post.id, post);
    });

    incomingPosts.forEach((post) => {
      merged.set(post.id, post);
    });

    return Array.from(merged.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  const hydrateLocalFallbackData = () => {
    const localPosts = readStoredValue<Post[]>(getFeedStorageKey('posts'), []);
    const localLikes = readStoredValue<Record<string, string[]>>(getFeedStorageKey('likes'), {});
    const localComments = readStoredValue<Record<string, PostComment[]>>(getFeedStorageKey('comments'), {});

    if (localPosts.length > 0) {
      setPosts((prev) => mergePostsById(prev, localPosts));
    }

    if (Object.keys(localLikes).length > 0) {
      setPostLikes((prev) => ({ ...prev, ...localLikes }));
    }

    if (Object.keys(localComments).length > 0) {
      setPostComments((prev) => ({ ...prev, ...localComments }));
    }
  };

  const persistLocalPosts = (nextPosts: Post[]) => {
    const localPosts = nextPosts.filter((post) => post.syncStatus === 'local');
    writeStoredValue(getFeedStorageKey('posts'), localPosts);
  };

  const persistLocalLikes = (nextLikes: Record<string, string[]>) => {
    writeStoredValue(getFeedStorageKey('likes'), nextLikes);
  };

  const persistLocalComments = (nextComments: Record<string, PostComment[]>) => {
    writeStoredValue(getFeedStorageKey('comments'), nextComments);
  };

  const mergeFetchedLikeState = (
    current: Record<string, string[]>,
    fetched: Record<string, string[]>
  ) => {
    const next = { ...current };

    Object.entries(fetched).forEach(([postId, userIds]) => {
      if (!(postId in next)) {
        next[postId] = userIds;
      }
    });

    return next;
  };

  const mergeFetchedCommentState = (
    current: Record<string, PostComment[]>,
    fetched: Record<string, PostComment[]>
  ) => {
    const next = { ...current };

    Object.entries(fetched).forEach(([postId, comments]) => {
      if (!(postId in next)) {
        next[postId] = comments;
      }
    });

    return next;
  };

  const fetchPostInteractions = async (postIds: string[]) => {
    if (postIds.length === 0) {
      setPostLikes({});
      setPostComments({});
      setPostViewStats({});
      return false;
    }

    const [{ data: likesData, error: likesError }, { data: commentsData, error: commentsError }] =
      await Promise.all([
        supabase
          .from('post_likes')
          .select('post_id, user_id')
          .in('post_id', postIds),
        supabase
          .from('post_comments')
          .select(`
            id,
            post_id,
            content,
            created_at,
            author_id,
            author:profiles!post_comments_author_id_fkey(id, username, full_name, avatar_url)
          `)
          .in('post_id', postIds)
          .order('created_at', { ascending: true }),
      ]);

    let backendUnavailable = false;

    if (likesError) {
      console.error('Error fetching post likes:', likesError);
      if (isMissingTableError(likesError)) {
        backendUnavailable = true;
      }
    } else {
      const nextLikes: Record<string, string[]> = {};
      (likesData || []).forEach((like) => {
        if (!nextLikes[like.post_id]) {
          nextLikes[like.post_id] = [];
        }
        nextLikes[like.post_id].push(like.user_id);
      });
      setPostLikes((prev) => mergeFetchedLikeState(prev, nextLikes));
    }

    if (commentsError) {
      console.error('Error fetching post comments:', commentsError);
      if (isMissingTableError(commentsError)) {
        backendUnavailable = true;
      }
    } else {
      const nextComments: Record<string, PostComment[]> = {};
      (commentsData || []).forEach((comment) => {
        if (!nextComments[comment.post_id]) {
          nextComments[comment.post_id] = [];
        }
        nextComments[comment.post_id].push({
          ...comment,
          author: comment.author as PostComment['author'],
        });
      });
      setPostComments((prev) => mergeFetchedCommentState(prev, nextComments));
    }

    try {
      const nextViewStats = await fetchPostViewStats(postIds);
      setPostViewStats((prev) => {
        const merged = { ...prev };
        Object.entries(nextViewStats).forEach(([postId, stats]) => {
          if (!(postId in merged)) {
            merged[postId] = stats;
          } else {
            merged[postId] = {
              uniqueVisitors: Math.max(merged[postId].uniqueVisitors, stats.uniqueVisitors),
              totalViews: Math.max(merged[postId].totalViews, stats.totalViews),
            };
          }
        });
        return merged;
      });
    } catch (viewError) {
      console.error('Error fetching post views:', viewError);
      if (isMissingTableError(viewError as FeedQueryError)) {
        backendUnavailable = true;
      }
    }

    return backendUnavailable;
  };

  const fetchData = async () => {
    if (!profile?.id) return;
    setFeedBackendUnavailable(false);

    try {
      const applyContributionEvents = (events: ContributionEvent[]) => {
        setContributionInput(scoreContributionsFromEvents(events));
        setDemonstratedSkills(demonstratedSkillsFromContributionEvents(events));
        setDemonstratedProjects(demonstratedProjectsFromContributionEvents(events));
        void loadPerformanceRatings(profile.id).then((ratings) => {
          setPerformanceInput(scorePerformanceFromEvents(events, ratings, profile.id));
        });
      };

      const [
        { data: endorsementData },
        { data: educationData },
        { data: trainingData },
        { data: skillsData },
        { data: experienceData },
        contributionEvents,
        { data: recentData },
        postsResult,
      ] = await Promise.all([
        supabase
          .from('endorsements')
          .select('*')
          .eq('endorsed_id', profile.id)
          .eq('is_hidden', false),
        supabaseUntyped
          .from('profile_education_entries')
          .select('id, education_level, verification_status')
          .eq('profile_id', profile.id),
        supabaseUntyped
          .from('profile_training_entries')
          .select('training_names')
          .eq('profile_id', profile.id)
          .maybeSingle(),
        supabaseUntyped
          .from('profile_skills_entries')
          .select('hard_skill_names, soft_skill_names, skill_names')
          .eq('profile_id', profile.id)
          .maybeSingle(),
        supabaseUntyped
          .from('profile_experience_entries')
          .select('experiences')
          .eq('profile_id', profile.id)
          .maybeSingle(),
        loadContributionEventsThenSync(profile.id, profile.user_id, supabase, applyContributionEvents),
        supabase
          .from('endorsements')
          .select(`
            id,
            stars,
            pillar,
            comment,
            created_at,
            endorser:profiles!endorsements_endorser_id_fkey(id, username, full_name, avatar_url)
          `)
          .eq('endorsed_id', profile.id)
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(5),
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
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (endorsementData) {
        setEndorsements(endorsementData.map(e => ({
          ...e,
          pillar: e.pillar as PillarId,
        })));
      }

      if (educationData) {
        setEducationCount(educationData.length);
        setVerifiedEducationCount(
          educationData.filter(
            (row: { verification_status?: string }) =>
              row.verification_status === 'verified' ||
              row.verification_status === 'certificate_provided',
          ).length,
        );
        setEducationLevels(
          educationData
            .map((row: { education_level?: string | null }) =>
              typeof row.education_level === 'string' ? row.education_level : '',
            )
            .filter((level: string) => level.trim().length > 0),
        );
      } else {
        setEducationCount(0);
        setVerifiedEducationCount(0);
        setEducationLevels([]);
      }

      setTrainingCount(countTrainingsFromEntry(trainingData));
      setSkillCount(countSkillsFromEntry(skillsData));
      setDeclaredSkillNames(declaredSkillNamesFromEntry(skillsData));
      const experienceEntries = parseExperienceEntries(experienceData?.experiences);
      setExperienceCount(experienceEntries.length);
      setExperienceMonths(cumulativeExperienceMonths(experienceEntries));
      applyContributionEvents(contributionEvents);

      if (recentData) {
        setRecentEndorsements(recentData.map(e => ({
          ...e,
          pillar: e.pillar as PillarId,
          endorser: e.endorser as unknown as RecentEndorsement['endorser'],
        })));
      }

      const { data: postsData, error: postsError } = postsResult;

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        if (isMissingTableError(postsError)) {
          setFeedBackendUnavailable(true);
          hydrateLocalFallbackData();
        }
      } else {
        const normalizedPosts = (postsData || []).map(normalizePost);
        setPosts((prev) => mergePostsById(prev, normalizedPosts));
        // Paint shell + posts first; interactions fill in without blocking.
        void fetchPostInteractions(normalizedPosts.map((post) => post.id)).then((interactionsUnavailable) => {
          if (!interactionsUnavailable) {
            setFeedBackendUnavailable(false);
          }
        });
        void (async () => {
          try {
            const [reposts, counts, viewerMap] = await Promise.all([
              fetchRecentPostReposts(50),
              fetchRepostCounts(normalizedPosts.map((post) => post.id)),
              profile?.id
                ? fetchViewerRepostMap(
                    profile.id,
                    normalizedPosts.map((post) => post.id),
                  )
                : Promise.resolve({} as Record<string, string>),
            ]);
            setPostReposts(reposts);
            setRepostCounts(counts);
            setViewerRepostByOriginal(viewerMap);
            const extraIds = [
              ...reposts.map((row) => row.commentary_post_id),
              ...reposts.map((row) => row.original_post_id),
            ].filter((id): id is string => Boolean(id));
            if (extraIds.length > 0) {
              void fetchPostInteractions(Array.from(new Set(extraIds)));
            }
          } catch (error) {
            console.error('Error fetching post reposts:', error);
          }
        })();
        hydrateLocalFallbackData();
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    mergePostsById, persistLocalPosts, persistLocalLikes, persistLocalComments, fetchData,
  };
}
