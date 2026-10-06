import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { type Endorsement } from '@/lib/scoring';
import { type CategoryScoreInput } from '@/lib/civizen-score';
import { demonstratedProjectsFromContributionEvents, demonstratedSkillsFromContributionEvents } from '@/lib/civizen-contributions';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { isOfficialCivizenOrgProfile } from '@/lib/civizen-org-account';
import { fetchSocialConnectionStatuses, fetchSocialCrosspostsForPosts, type SocialConnectionStatus, type SocialCrosspostStatus } from '@/lib/social-accounts';
import { isRecordablePostId, recordPostView, type PostViewStats } from '@/lib/post-views';
import { type PostPreview, type PostRepostRow } from '@/lib/post-reposts';
import { postContentForEditor, postHtmlIsEmpty, postHtmlToPlainText } from '@/lib/posts-html';
import { useDevelopmentStories } from '@/lib/use-development-stories';
import { type FeedQueryError, type Post, type PostComment, type RawPostRecord, type RecentEndorsement } from '@/pages/home/home-shared';

export function useHomeCore() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [educationCount, setEducationCount] = useState(0);
  const [verifiedEducationCount, setVerifiedEducationCount] = useState(0);
  const [educationLevels, setEducationLevels] = useState<string[]>([]);
  const [trainingCount, setTrainingCount] = useState(0);
  const [skillCount, setSkillCount] = useState(0);
  const [declaredSkillNames, setDeclaredSkillNames] = useState<string[]>([]);
  const [demonstratedSkills, setDemonstratedSkills] = useState<
    ReturnType<typeof demonstratedSkillsFromContributionEvents>
  >([]);
  const [demonstratedProjects, setDemonstratedProjects] = useState<
    ReturnType<typeof demonstratedProjectsFromContributionEvents>
  >([]);
  const [experienceCount, setExperienceCount] = useState(0);
  const [experienceMonths, setExperienceMonths] = useState(0);
  const [contributionInput, setContributionInput] = useState<CategoryScoreInput | null>(null);
  const [performanceInput, setPerformanceInput] = useState<CategoryScoreInput | null>(null);
  const [recentEndorsements, setRecentEndorsements] = useState<RecentEndorsement[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postLikes, setPostLikes] = useState<Record<string, string[]>>({});
  const [postComments, setPostComments] = useState<Record<string, PostComment[]>>({});
  const [postViewStats, setPostViewStats] = useState<Record<string, PostViewStats>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [likingPostId, setLikingPostId] = useState<string | null>(null);
  const [submittingCommentPostId, setSubmittingCommentPostId] = useState<string | null>(null);
  const [feedBackendUnavailable, setFeedBackendUnavailable] = useState(false);
  const [optimisticLikeStates, setOptimisticLikeStates] = useState<Record<string, boolean>>({});
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const composeDraftBackupRef = useRef('');
  const [isCivizenOrgAccount, setIsCivizenOrgAccount] = useState(false);
  const [socialConnections, setSocialConnections] = useState<SocialConnectionStatus[]>([]);
  const [socialCrossposts, setSocialCrossposts] = useState<Record<string, SocialCrosspostStatus[]>>({});
  const [publishingKey, setPublishingKey] = useState<string | null>(null);
  const [postReposts, setPostReposts] = useState<PostRepostRow[]>([]);
  const [repostCounts, setRepostCounts] = useState<Record<string, number>>({});
  const [viewerRepostByOriginal, setViewerRepostByOriginal] = useState<Record<string, string>>({});
  const [repostBusyPostId, setRepostBusyPostId] = useState<string | null>(null);
  const [thoughtsOriginal, setThoughtsOriginal] = useState<PostPreview | null>(null);
  const [fullOriginal, setFullOriginal] = useState<PostPreview | null>(null);
  const [homeTab, setHomeTab] = useState<'all' | 'favourite' | 'stories'>('all');
  const [storyGroupTab, setStoryGroupTab] = useState<'development' | 'suggestions'>('development');
  const [storySectionFilter, setStorySectionFilter] = useState<string>('all');
  const [storyAreaFilter, setStoryAreaFilter] = useState<string>('all');
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const { stories: developmentStories, loading: storiesLoading } = useDevelopmentStories({
    enabled: homeTab === 'stories',
  });
  const postEditorRef = useRef<HTMLDivElement | null>(null);
  const postDraftHydratedRef = useRef(false);
  const postContentRef = useRef(postContent);
  const recordedPostViewsRef = useRef<Set<string>>(new Set());
  const composerPlain = postHtmlToPlainText(postContent);
  const canPost = composerPlain.trim().length > 0;
  const composerPlaceholder = t('home.whatsOnYourMind');
  postContentRef.current = postContent;


  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await isOfficialCivizenOrgProfile(profile?.id, { username: profile?.username });
      if (cancelled) return;
      setIsCivizenOrgAccount(ok);
      if (!ok) {
        setSocialConnections([]);
        return;
      }
      try {
        const statuses = await fetchSocialConnectionStatuses();
        if (!cancelled) setSocialConnections(statuses);
      } catch {
        if (!cancelled) setSocialConnections([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, profile?.username]);

  useEffect(() => {
    if (!isCivizenOrgAccount || posts.length === 0) {
      setSocialCrossposts({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const ownPostIds = posts.filter((post) => post.author_id === profile?.id).map((post) => post.id);
      const map = await fetchSocialCrosspostsForPosts(ownPostIds);
      if (!cancelled) setSocialCrossposts(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [isCivizenOrgAccount, posts, profile?.id]);

  useEffect(() => {
    if (!profile?.id || posts.length === 0 || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-home-post-id]'));
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const postId = entry.target.getAttribute('data-home-post-id');
          if (!postId || !isRecordablePostId(postId) || recordedPostViewsRef.current.has(postId)) {
            return;
          }
          recordedPostViewsRef.current.add(postId);
          void recordPostView(postId)
            .then((stats) => {
              if (!stats) return;
              setPostViewStats((prev) => ({
                ...prev,
                [postId]: {
                  uniqueVisitors: Math.max(prev[postId]?.uniqueVisitors || 0, stats.uniqueVisitors),
                  totalViews: Math.max(prev[postId]?.totalViews || 0, stats.totalViews),
                },
              }));
            })
            .catch((error) => {
              recordedPostViewsRef.current.delete(postId);
              if (!isMissingTableError(error as FeedQueryError)) {
                console.error('Error recording post view:', error);
              }
            });
        });
      },
      { threshold: 0.45 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [posts, profile?.id]);

  const syncPostEditorDom = (value: string) => {
    const el = postEditorRef.current;
    if (!el) return;
    const next = postContentForEditor(value);
    if (el.innerHTML === next) return;
    el.innerHTML = next;
  };

  useLayoutEffect(() => {
    if (editingPost) {
      syncPostEditorDom(editingPost.content);
      const node = postEditorRef.current;
      node?.focus();
      node?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    syncPostEditorDom(postContentRef.current);
  }, [editingPost?.id]);

  const emitPostEditor = (el: HTMLDivElement) => {
    setPostContent(el.innerHTML || '');
  };

  const normalizePost = (raw: RawPostRecord): Post => ({
    id: raw.id,
    content: raw.content,
    created_at: raw.created_at,
    author_id: raw.author_id,
    is_edited: raw.is_edited,
    edited_at: raw.edited_at,
    syncStatus: raw.syncStatus ?? 'remote',
    author: raw.author as Post['author'],
  });

  const isMissingTableError = (error: FeedQueryError) => {
    return error?.code === 'PGRST205' || /could not find the table|schema cache/i.test(error?.message || '');
  };

  const getFeedStorageKey = (kind: 'posts' | 'likes' | 'comments') => {
    return profile?.id ? `civizen-home-${kind}:${profile.id}` : `civizen-home-${kind}:anonymous`;
  };

  const getPostDraftStorageKey = () => {
    return profile?.id ? `civizen-home-post-draft:${profile.id}` : 'civizen-home-post-draft:anonymous';
  };

  const readStoredValue = <T,>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback;

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  const writeStoredValue = (key: string, value: unknown) => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage quota and serialization errors.
    }
  };

  const removeStoredValue = (key: string) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage errors.
    }
  };

  const persistPostDraft = (content: string) => {
    if (editingPost) return;
    const key = getPostDraftStorageKey();
    if (postHtmlIsEmpty(content)) {
      removeStoredValue(key);
      return;
    }
    writeStoredValue(key, content);
  };

  const clearPostComposerDraft = () => {
    setEditingPost(null);
    composeDraftBackupRef.current = '';
    setPostContent('');
    removeStoredValue(getPostDraftStorageKey());
    syncPostEditorDom('');
  };

  useEffect(() => {
    postDraftHydratedRef.current = false;
    if (!profile?.id) {
      setPostContent('');
      syncPostEditorDom('');
      return;
    }
    const stored = readStoredValue<string>(getPostDraftStorageKey(), '');
    const next = typeof stored === 'string' ? stored : '';
    setPostContent(next);
    // Wait a frame so the editor node exists after mount/tab show.
    window.requestAnimationFrame(() => {
      syncPostEditorDom(next);
      postDraftHydratedRef.current = true;
    });
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id || !postDraftHydratedRef.current) return;
    const timer = window.setTimeout(() => {
      persistPostDraft(postContent);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [postContent, profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    const flushDraft = () => {
      persistPostDraft(postContentRef.current);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushDraft();
    };

    window.addEventListener('pagehide', flushDraft);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flushDraft);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [profile?.id]);

  return {
    endorsements, setEndorsements, educationCount, setEducationCount, verifiedEducationCount,
    setVerifiedEducationCount, educationLevels, setEducationLevels, trainingCount, setTrainingCount,
    skillCount, setSkillCount, declaredSkillNames, setDeclaredSkillNames, demonstratedSkills,
    setDemonstratedSkills, demonstratedProjects, setDemonstratedProjects, experienceCount,
    setExperienceCount, experienceMonths, setExperienceMonths, contributionInput,
    setContributionInput, performanceInput, setPerformanceInput, recentEndorsements,
    setRecentEndorsements, posts, setPosts, postLikes, setPostLikes, postComments, setPostComments,
    postViewStats, setPostViewStats, expandedComments, setExpandedComments, commentDrafts,
    setCommentDrafts, loading, setLoading, postContent, setPostContent, isPosting, setIsPosting,
    likingPostId, setLikingPostId, submittingCommentPostId, setSubmittingCommentPostId,
    feedBackendUnavailable, setFeedBackendUnavailable, optimisticLikeStates,
    setOptimisticLikeStates, isComposerFocused, setIsComposerFocused, editingPost, setEditingPost,
    isSavingEdit, setIsSavingEdit, isCivizenOrgAccount, socialConnections, socialCrossposts,
    setSocialCrossposts, publishingKey, setPublishingKey, postReposts, setPostReposts, repostCounts,
    setRepostCounts, viewerRepostByOriginal, setViewerRepostByOriginal, repostBusyPostId,
    setRepostBusyPostId, thoughtsOriginal, setThoughtsOriginal, fullOriginal, setFullOriginal,
    homeTab, setHomeTab, storyGroupTab, setStoryGroupTab, storySectionFilter, setStorySectionFilter,
    storyAreaFilter, setStoryAreaFilter, selectedStoryId, setSelectedStoryId, profile, t,
    developmentStories, storiesLoading, navigate, composeDraftBackupRef, postEditorRef,
    postContentRef, composerPlain, canPost, composerPlaceholder, emitPostEditor, normalizePost,
    isMissingTableError, getFeedStorageKey, readStoredValue, writeStoredValue, persistPostDraft,
    clearPostComposerDraft,
  };
}
