import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, ExternalLink, Link2, Loader2, Scale, Search, Send, ShieldCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { permissionListHasAny } from '@/lib/access-control';
import { lawCatalog } from '@/lib/law-catalog';
import { toast } from 'sonner';

type LawTrack = Database['public']['Enums']['law_track'];
type LawContributionType = Database['public']['Enums']['law_contribution_type'];
type LawContributionStatus = Database['public']['Enums']['law_contribution_status'];
type LawSourceRow = Database['public']['Tables']['law_sources']['Row'];
type LawSectionRow = Database['public']['Tables']['law_sections']['Row'];
type LawArticleRow = Database['public']['Tables']['law_articles']['Row'];
type LawContributionRow = Database['public']['Tables']['law_contributions']['Row'];

type LawEntry = {
  id: string;
  track: LawTrack;
  domain: string;
  jurisdiction: string;
  instrument: string;
  title: string;
  summary: string;
  sourceUrl: string | null;
  sections: Array<{
    id: string;
    title: string;
    summary: string;
    articles: Array<{
      id: string;
      label: string;
      summary: string;
      body: string | null;
    }>;
  }>;
};

type ContributionDraft = {
  track: LawTrack;
  type: LawContributionType;
  title: string;
  source: string;
  note: string;
};

type ContributionListItem = LawContributionRow;

const DRAFT_STORAGE_KEY = 'civizen-law-contribution-draft:v2';
const LOCAL_SUBMISSION_STORAGE_KEY = 'civizen-law-contribution-submissions:v2';

const emptyDraft: ContributionDraft = {
  track: 'civil',
  type: 'source',
  title: '',
  source: '',
  note: '',
};

function toFallbackEntries(): LawEntry[] {
  return lawCatalog.map((entry) => ({
    id: entry.id,
    track: entry.track,
    domain: entry.domain,
    jurisdiction: entry.jurisdiction,
    instrument: entry.instrument,
    title: entry.title,
    summary: entry.summary,
    sourceUrl: null,
    sections: entry.sections.map((section) => ({
      id: section.id,
      title: section.title,
      summary: section.summary,
      articles: section.articles.map((article) => ({
        id: article.id,
        label: article.label,
        summary: article.summary,
        body: null,
      })),
    })),
  }));
}

function buildLawEntries(
  sources: LawSourceRow[],
  sections: LawSectionRow[],
  articles: LawArticleRow[],
): LawEntry[] {
  const sectionsBySource = new Map<string, LawSectionRow[]>();
  const articlesBySection = new Map<string, LawArticleRow[]>();

  for (const section of sections) {
    const bucket = sectionsBySource.get(section.source_id) || [];
    bucket.push(section);
    sectionsBySource.set(section.source_id, bucket);
  }

  for (const article of articles) {
    const bucket = articlesBySection.get(article.section_id) || [];
    bucket.push(article);
    articlesBySection.set(article.section_id, bucket);
  }

  return [...sources]
    .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title))
    .map((source) => ({
      id: source.id,
      track: source.track,
      domain: source.domain,
      jurisdiction: source.jurisdiction,
      instrument: source.instrument,
      title: source.title,
      summary: source.summary,
      sourceUrl: source.source_url,
      sections: [...(sectionsBySource.get(source.id) || [])]
        .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title))
        .map((section) => ({
          id: section.id,
          title: section.title,
          summary: section.summary,
          articles: [...(articlesBySection.get(section.id) || [])]
            .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label))
            .map((article) => ({
              id: article.id,
              label: article.label,
              summary: article.summary,
              body: article.body,
            })),
        })),
    }));
}

function getLawFacets(entries: LawEntry[]) {
  return {
    tracks: ['all', 'civil', 'criminal'] as const,
    jurisdictions: ['all', ...Array.from(new Set(entries.map((entry) => entry.jurisdiction))).sort()] as const,
    domains: ['all', ...Array.from(new Set(entries.map((entry) => entry.domain))).sort()] as const,
    instruments: ['all', ...Array.from(new Set(entries.map((entry) => entry.instrument))).sort()] as const,
  };
}

function isLawSchemaMissing(error: { code?: string | null; message?: string | null; details?: string | null } | null) {
  if (!error) return false;
  const message = `${error.code || ''} ${error.message || ''} ${error.details || ''}`.toLowerCase();
  return error.code === '42P01' || error.code === 'PGRST205' || message.includes('law_');
}

function readLocalContributionQueue() {
  if (typeof window === 'undefined') return [] as Array<ContributionListItem & { local_only?: boolean }>;
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_SUBMISSION_STORAGE_KEY) || '[]') as Array<
      ContributionListItem & { local_only?: boolean }
    >;
  } catch {
    return [];
  }
}

function formatTimestamp(value: string, locale: string) {
  try {
    return new Date(value).toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export default function Law() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const canContribute = permissionListHasAny(profile?.effective_permissions || [], ['law.contribute']);
  const canReview = permissionListHasAny(profile?.effective_permissions || [], ['law.review']);
  const [entries, setEntries] = useState<LawEntry[]>(toFallbackEntries());
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [query, setQuery] = useState('');
  const [track, setTrack] = useState<'all' | LawTrack>('all');
  const [jurisdiction, setJurisdiction] = useState<string>('all');
  const [domain, setDomain] = useState<string>('all');
  const [instrument, setInstrument] = useState<string>('all');
  const [selectedEntryId, setSelectedEntryId] = useState<string>('');
  const [draft, setDraft] = useState<ContributionDraft>(emptyDraft);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [draftReady, setDraftReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contributionsLoading, setContributionsLoading] = useState(false);
  const [myContributions, setMyContributions] = useState<Array<ContributionListItem & { local_only?: boolean }>>([]);
  const [reviewQueue, setReviewQueue] = useState<ContributionListItem[]>([]);
  const [reviewHistory, setReviewHistory] = useState<ContributionListItem[]>([]);
  const [reviewSavingId, setReviewSavingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [copiedArticleId, setCopiedArticleId] = useState<string | null>(null);
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'all' | LawContributionStatus>('pending');
  const [reviewTypeFilter, setReviewTypeFilter] = useState<'all' | LawContributionType>('all');
  const [reviewTrackFilter, setReviewTrackFilter] = useState<'all' | LawTrack>('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<Exclude<LawContributionStatus, 'pending'> | 'all'>('all');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | LawContributionType>('all');
  const [historyTrackFilter, setHistoryTrackFilter] = useState<'all' | LawTrack>('all');

  const lawFacets = useMemo(() => getLawFacets(entries), [entries]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesTrack = track === 'all' || entry.track === track;
      const matchesJurisdiction = jurisdiction === 'all' || entry.jurisdiction === jurisdiction;
      const matchesDomain = domain === 'all' || entry.domain === domain;
      const matchesInstrument = instrument === 'all' || entry.instrument === instrument;
      const matchesQuery =
        !normalizedQuery ||
        [
          entry.title,
          entry.summary,
          entry.jurisdiction,
          entry.domain,
          entry.instrument,
          ...entry.sections.map((section) => section.title),
          ...entry.sections.flatMap((section) => section.articles.map((article) => article.label)),
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesTrack && matchesJurisdiction && matchesDomain && matchesInstrument && matchesQuery;
    });
  }, [domain, entries, instrument, jurisdiction, query, track]);

  useEffect(() => {
    if (!filteredEntries.some((entry) => entry.id === selectedEntryId)) {
      setSelectedEntryId(filteredEntries[0]?.id ?? '');
    }
  }, [filteredEntries, selectedEntryId]);

  useEffect(() => {
    const sourceParam = searchParams.get('source');
    const articleParam = searchParams.get('article');
    if (!entries.length) return;

    if (sourceParam && entries.some((entry) => entry.id === sourceParam)) {
      setSelectedEntryId(sourceParam);
      return;
    }

    if (articleParam) {
      const sourceWithArticle = entries.find((entry) =>
        entry.sections.some((section) => section.articles.some((article) => article.id === articleParam)),
      );
      if (sourceWithArticle) {
        setSelectedEntryId(sourceWithArticle.id);
      }
    }
  }, [entries, searchParams]);

  const selectedEntry = filteredEntries.find((entry) => entry.id === selectedEntryId) ?? filteredEntries[0] ?? null;
  const activeArticleId = searchParams.get('article');
  const sourceTitleById = useMemo(
    () => Object.fromEntries(entries.map((entry) => [entry.id, entry.title])) as Record<string, string>,
    [entries],
  );

  useEffect(() => {
    if (!selectedEntry) return;

    const nextParams = new URLSearchParams(searchParams);
    if (selectedEntry.id) {
      nextParams.set('source', selectedEntry.id);
    }

    const articleParam = nextParams.get('article');
    if (articleParam) {
      const articleExistsInSelectedEntry = selectedEntry.sections.some((section) =>
        section.articles.some((article) => article.id === articleParam),
      );
      if (!articleExistsInSelectedEntry) {
        nextParams.delete('article');
      }
    }

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, selectedEntry, setSearchParams]);

  useEffect(() => {
    if (!activeArticleId) return;
    const timeout = window.setTimeout(() => {
      const element = document.getElementById(`law-article-${activeArticleId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [activeArticleId, selectedEntryId]);

  const loadLawLibrary = useCallback(async () => {
    setLibraryLoading(true);

    const [sourcesResult, sectionsResult, articlesResult] = await Promise.all([
      supabase.from('law_sources').select('*').order('sort_order', { ascending: true }),
      supabase.from('law_sections').select('*').order('sort_order', { ascending: true }),
      supabase.from('law_articles').select('*').order('sort_order', { ascending: true }),
    ]);

    const firstError = sourcesResult.error || sectionsResult.error || articlesResult.error;

    if (firstError) {
      if (isLawSchemaMissing(firstError)) {
        setBackendUnavailable(true);
        setEntries(toFallbackEntries());
      } else {
        console.error('Error loading law library:', firstError);
        toast.error(t('law.loadFailed'));
        setEntries(toFallbackEntries());
      }
      setLibraryLoading(false);
      return;
    }

    const nextEntries = buildLawEntries(
      sourcesResult.data ?? [],
      sectionsResult.data ?? [],
      articlesResult.data ?? [],
    );

    setEntries(nextEntries.length ? nextEntries : toFallbackEntries());
    setBackendUnavailable(false);
    setLibraryLoading(false);
  }, [t]);

  const loadContributionState = useCallback(async () => {
    if (!profile) {
      setMyContributions([]);
      setReviewQueue([]);
      setReviewHistory([]);
      return;
    }

    if (backendUnavailable) {
      setMyContributions(readLocalContributionQueue());
      setReviewQueue([]);
      setReviewHistory([]);
      return;
    }

    setContributionsLoading(true);

    const contributionQuery = supabase
      .from('law_contributions')
      .select('*')
      .eq('author_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const reviewQuery = canReview
      ? supabase
          .from('law_contributions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [], error: null });

    const [contributionsResult, reviewResult] = await Promise.all([contributionQuery, reviewQuery]);

    const firstError = contributionsResult.error || reviewResult.error;
    if (firstError) {
      if (isLawSchemaMissing(firstError)) {
        setBackendUnavailable(true);
        setMyContributions(readLocalContributionQueue());
        setReviewQueue([]);
        setReviewHistory([]);
      } else {
        console.error('Error loading law contributions:', firstError);
        toast.error(t('law.contributionsLoadFailed'));
      }
      setContributionsLoading(false);
      return;
    }

    setMyContributions(contributionsResult.data ?? []);
    const reviewerItems = reviewResult.data ?? [];
    setReviewQueue(reviewerItems.filter((item) => item.status === 'pending'));
    setReviewHistory(reviewerItems.filter((item) => item.status !== 'pending'));
    setContributionsLoading(false);
  }, [backendUnavailable, canReview, profile, t]);

  const filteredReviewQueue = useMemo(() => {
    return reviewQueue.filter((item) => {
      const matchesStatus = reviewStatusFilter === 'all' || item.status === reviewStatusFilter;
      const matchesType = reviewTypeFilter === 'all' || item.contribution_type === reviewTypeFilter;
      const matchesTrack = reviewTrackFilter === 'all' || item.track === reviewTrackFilter;
      return matchesStatus && matchesType && matchesTrack;
    });
  }, [reviewQueue, reviewStatusFilter, reviewTrackFilter, reviewTypeFilter]);

  const filteredReviewHistory = useMemo(() => {
    return reviewHistory.filter((item) => {
      const matchesStatus = historyStatusFilter === 'all' || item.status === historyStatusFilter;
      const matchesType = historyTypeFilter === 'all' || item.contribution_type === historyTypeFilter;
      const matchesTrack = historyTrackFilter === 'all' || item.track === historyTrackFilter;
      return matchesStatus && matchesType && matchesTrack;
    });
  }, [historyStatusFilter, historyTrackFilter, historyTypeFilter, reviewHistory]);

  useEffect(() => {
    void loadLawLibrary();
  }, [loadLawLibrary]);

  useEffect(() => {
    void loadContributionState();
  }, [loadContributionState]);

  useEffect(() => {
    setReviewNotes((current) => {
      const next = { ...current };
      for (const item of reviewQueue) {
        if (!(item.id in next)) {
          next[item.id] = item.reviewer_notes || '';
        }
      }
      return next;
    });
  }, [reviewQueue]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!storedDraft) {
      setDraftReady(true);
      return;
    }

    try {
      const parsed = JSON.parse(storedDraft) as Partial<ContributionDraft>;
      setDraft({ ...emptyDraft, ...parsed });
      setDraftStatus('saved');
    } catch {
      setDraftStatus('idle');
    }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady || typeof window === 'undefined') return;

    const timer = window.setTimeout(() => {
      try {
        setDraftStatus('saving');
        window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        setDraftStatus('saved');
      } catch (error) {
        console.error('Could not auto-save law contribution draft:', error);
        setDraftStatus('error');
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [draft, draftReady]);

  const handleRetryDraftSave = () => {
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setDraftStatus('saved');
      toast.success(t('law.draftSaved'));
    } catch (error) {
      console.error('Could not retry saving law draft:', error);
      setDraftStatus('error');
      toast.error(t('law.draftSaveFailed'));
    }
  };

  const handleSubmitContribution = async () => {
    if (!draft.title.trim() || !draft.note.trim()) return;

    const payload = {
      author_id: profile?.id,
      source_id: selectedEntry?.id ?? null,
      track: draft.track,
      contribution_type: draft.type,
      title: draft.title.trim(),
      source_reference: draft.source.trim() || null,
      note: draft.note.trim(),
    };

    if (!profile || backendUnavailable) {
      try {
        const currentSubmissions = readLocalContributionQueue();
        const localPayload = {
          ...payload,
          id: crypto.randomUUID(),
          author_id: profile?.id || '',
          status: 'pending' as LawContributionStatus,
          reviewer_id: null,
          reviewer_notes: null,
          reviewed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          local_only: true,
        };

        window.localStorage.setItem(
          LOCAL_SUBMISSION_STORAGE_KEY,
          JSON.stringify([localPayload, ...currentSubmissions]),
        );
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
        setDraft(emptyDraft);
        setDraftStatus('idle');
        setMyContributions([localPayload, ...currentSubmissions]);
        toast.success(t('law.contributionSavedLocally'));
      } catch (error) {
        console.error('Could not save law contribution locally:', error);
        toast.error(t('law.contributionSubmitFailed'));
      }
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('law_contributions').insert(payload);
    setSubmitting(false);

    if (error) {
      if (isLawSchemaMissing(error)) {
        setBackendUnavailable(true);
        toast.error(t('law.backendUnavailableDescription'));
      } else {
        console.error('Could not submit law contribution:', error);
        toast.error(t('law.contributionSubmitFailed'));
      }
      return;
    }

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    }

    setDraft(emptyDraft);
    setDraftStatus('idle');
    toast.success(t('law.contributionSubmitted'));
    await loadContributionState();
  };

  const handleReviewContribution = async (contributionId: string, status: Exclude<LawContributionStatus, 'pending'>) => {
    if (!profile) return;
    const reviewerNote = (reviewNotes[contributionId] || '').trim();

    if ((status === 'changes_requested' || status === 'rejected') && !reviewerNote) {
      toast.error(t('law.reviewNoteRequired'));
      return;
    }

    setReviewSavingId(contributionId);
    const { error } = await supabase
      .from('law_contributions')
      .update({
        status,
        reviewer_id: profile.id,
        reviewer_notes: reviewerNote || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', contributionId);

    setReviewSavingId(null);

    if (error) {
      console.error('Could not review law contribution:', error);
      toast.error(t('law.reviewUpdateFailed'));
      return;
    }

    toast.success(t('law.reviewUpdated'));
    await loadContributionState();
  };

  const handleSelectEntry = (entryId: string) => {
    setSelectedEntryId(entryId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('source', entryId);
    nextParams.delete('article');
    setSearchParams(nextParams, { replace: true });
  };

  const handleCopyArticleLink = async (sourceId: string, articleId: string) => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('source', sourceId);
      url.searchParams.set('article', articleId);
      await navigator.clipboard.writeText(url.toString());
      setCopiedArticleId(articleId);
      window.setTimeout(() => setCopiedArticleId((current) => (current === articleId ? null : current)), 1800);
      toast.success(t('law.articleLinkCopied'));
    } catch (error) {
      console.error('Could not copy article link:', error);
      toast.error(t('law.articleLinkCopyFailed'));
    }
  };

  const activeCount = filteredEntries.length;

  return (
    <AppLayout>
      <div className="space-y-6 px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AppPageHeader
            title={t('law.title')}
            subtitle={t('law.subtitle')}
            leading={
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Scale className="h-7 w-7" />
              </div>
            }
            actions={
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9"
                onClick={() => navigate('/search')}
                aria-label={t('common.search')}
              >
                <Search className="h-4 w-4" />
              </Button>
            }
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <Card className="rounded-3xl border-border/70 bg-linear-to-br from-primary/5 via-card to-accent/5 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-primary">{t('law.libraryBadge')}</p>
                <h2 className="text-xl font-semibold text-foreground">{t('law.libraryTitle')}</h2>
                <p className="max-w-3xl text-sm text-muted-foreground">{t('law.libraryDescription')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button className="gap-2" onClick={() => navigate('/contribute')}>
                  {t('law.actions.suggestContribution')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => navigate('/terms')}>
                  {t('law.actions.openTerms')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {backendUnavailable && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="rounded-3xl border-amber-500/30 bg-amber-500/5 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">{t('law.backendUnavailableTitle')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('law.backendUnavailableDescription')}</p>
            </Card>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className="rounded-3xl border-border/70 bg-card/95 p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,0.7fr))]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('law.searchPlaceholder')}
                  className="pl-9"
                />
              </div>

              <Select value={track} onValueChange={(value) => setTrack(value as 'all' | LawTrack)}>
                <SelectTrigger><SelectValue placeholder={t('law.filters.track')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('law.allTracks')}</SelectItem>
                  <SelectItem value="civil">{t('law.tracks.civil.title')}</SelectItem>
                  <SelectItem value="criminal">{t('law.tracks.criminal.title')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={jurisdiction} onValueChange={setJurisdiction}>
                <SelectTrigger><SelectValue placeholder={t('law.filters.jurisdiction')} /></SelectTrigger>
                <SelectContent>
                  {lawFacets.jurisdictions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === 'all' ? t('law.allJurisdictions') : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={domain} onValueChange={setDomain}>
                <SelectTrigger><SelectValue placeholder={t('law.filters.domain')} /></SelectTrigger>
                <SelectContent>
                  {lawFacets.domains.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === 'all' ? t('law.allDomains') : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={instrument} onValueChange={setInstrument}>
                <SelectTrigger><SelectValue placeholder={t('law.filters.instrument')} /></SelectTrigger>
                <SelectContent>
                  {lawFacets.instruments.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === 'all' ? t('law.allInstruments') : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-3 text-sm text-muted-foreground">
              {t('law.matchingSources', { count: activeCount })}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="grid gap-4 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.45fr)]"
        >
          <Card className="rounded-3xl border-border/70 bg-card/95 p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">{t('law.sourcesTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('law.sourcesDescription')}</p>

            <div className="mt-4 space-y-3">
              {libraryLoading ? (
                <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('common.loading')}
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
                  {t('law.noResults')}
                </div>
              ) : (
                filteredEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => handleSelectEntry(entry.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                      selectedEntry?.id === entry.id
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-border/60 bg-background/70 hover:border-border'
                    }`}
                  >
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        {entry.track === 'civil' ? t('law.tracks.civil.title') : t('law.tracks.criminal.title')}
                      </span>
                      <span className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground">
                        {entry.jurisdiction}
                      </span>
                    </div>
                    <h3 className="mt-3 font-semibold text-foreground">{entry.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{entry.summary}</p>
                    <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      {entry.domain} · {entry.instrument}
                    </p>
                  </button>
                ))
              )}
            </div>
          </Card>

          <div className="space-y-4">
            {selectedEntry ? (
              <Card className="rounded-3xl border-border/70 bg-card/95 p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    {selectedEntry.track === 'civil' ? t('law.tracks.civil.title') : t('law.tracks.criminal.title')}
                  </span>
                  <span className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground">
                    {selectedEntry.jurisdiction}
                  </span>
                  <span className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground">
                    {selectedEntry.domain}
                  </span>
                </div>

                <h2 className="mt-4 text-xl font-semibold text-foreground">{selectedEntry.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{selectedEntry.summary}</p>

                <div className="mt-5 rounded-2xl border border-border/60 bg-background/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {t('law.instrumentLabel')}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{selectedEntry.instrument}</p>
                    {selectedEntry.sourceUrl ? (
                      <Button variant="outline" size="sm" asChild className="gap-2">
                        <a href={selectedEntry.sourceUrl} target="_blank" rel="noreferrer">
                          {t('law.openSource')}
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {selectedEntry.sections.map((section) => (
                    <div key={section.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <h3 className="font-semibold text-foreground">{section.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{section.summary}</p>

                      <div className="mt-4 space-y-3">
                        {section.articles.map((article) => (
                          <div
                            key={article.id}
                            id={`law-article-${article.id}`}
                            className={`rounded-2xl border bg-card/90 p-3 transition-colors ${
                              activeArticleId === article.id
                                ? 'border-primary/40 bg-primary/5'
                                : 'border-border/50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-foreground">{article.label}</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 rounded-full px-2 text-muted-foreground hover:text-foreground"
                                onClick={() => void handleCopyArticleLink(selectedEntry.id, article.id)}
                              >
                                {copiedArticleId === article.id ? (
                                  <>
                                    <Check className="h-4 w-4" />
                                    <span className="sr-only">{t('law.articleLinkCopied')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Link2 className="h-4 w-4" />
                                    <span className="sr-only">{t('law.copyArticleLink')}</span>
                                  </>
                                )}
                              </Button>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{article.summary}</p>
                            {article.body ? (
                              <p className="mt-2 text-sm leading-6 text-foreground/90">{article.body}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            <Card className="rounded-3xl border-border/70 bg-card/95 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{t('law.contributionTitle')}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{t('law.contributionDescription')}</p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Send className="h-5 w-5" />
                </div>
              </div>

              {!canContribute ? (
                <div className="mt-5 rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
                  {t('law.contributePermissionRequired')}
                </div>
              ) : (
                <>
                  <div className="mt-5 grid gap-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="law-track">{t('law.contributionFields.track')}</Label>
                        <Select value={draft.track} onValueChange={(value) => setDraft((current) => ({ ...current, track: value as LawTrack }))}>
                          <SelectTrigger id="law-track"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="civil">{t('law.tracks.civil.title')}</SelectItem>
                            <SelectItem value="criminal">{t('law.tracks.criminal.title')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="law-type">{t('law.contributionFields.type')}</Label>
                        <Select
                          value={draft.type}
                          onValueChange={(value) => setDraft((current) => ({ ...current, type: value as LawContributionType }))}
                        >
                          <SelectTrigger id="law-type"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="source">{t('law.contributionTypes.source')}</SelectItem>
                            <SelectItem value="structure">{t('law.contributionTypes.structure')}</SelectItem>
                            <SelectItem value="summary">{t('law.contributionTypes.summary')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="law-title">{t('law.contributionFields.title')}</Label>
                      <Input
                        id="law-title"
                        value={draft.title}
                        onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                        placeholder={t('law.contributionPlaceholders.title')}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="law-source">{t('law.contributionFields.source')}</Label>
                      <Input
                        id="law-source"
                        value={draft.source}
                        onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value }))}
                        placeholder={t('law.contributionPlaceholders.source')}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="law-note">{t('law.contributionFields.note')}</Label>
                      <Textarea
                        id="law-note"
                        value={draft.note}
                        onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
                        placeholder={t('law.contributionPlaceholders.note')}
                        className="min-h-[128px]"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      {draftStatus === 'saving'
                        ? t('law.autoSaving')
                        : draftStatus === 'error'
                          ? t('law.autoSaveFailed')
                          : t('law.autoSaveActive')}
                    </p>

                    <div className="flex gap-2">
                      {draftStatus === 'error' && (
                        <Button variant="outline" onClick={handleRetryDraftSave}>
                          {t('law.retrySave')}
                        </Button>
                      )}
                      <Button
                        className="gap-2"
                        onClick={() => void handleSubmitContribution()}
                        disabled={submitting || !draft.title.trim() || !draft.note.trim()}
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {t('law.submitContribution')}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>

            <Card className="rounded-3xl border-border/70 bg-card/95 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{t('law.myContributionsTitle')}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{t('law.myContributionsDescription')}</p>
                </div>
                <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">
                  {t('law.contributionCount', { count: myContributions.length })}
                </Badge>
              </div>

              <div className="mt-4 space-y-3">
                {contributionsLoading ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </div>
                ) : myContributions.length === 0 ? (
                  <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
                    {t('law.noContributionsYet')}
                  </div>
                ) : (
                  myContributions.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{item.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {sourceTitleById[item.source_id || ''] || item.source_reference || t('law.generalContribution')}
                          </p>
                        </div>
                        <Badge variant="secondary" className="rounded-full bg-muted text-muted-foreground hover:bg-muted">
                          {item.local_only ? t('law.localStatus') : t(`law.statuses.${item.status}`)}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{t(`law.contributionTypes.${item.contribution_type}`)}</span>
                        <span>•</span>
                        <span>{formatTimestamp(item.created_at, language)}</span>
                      </div>
                      <p className="mt-3 text-sm text-foreground/90">{item.note}</p>
                      {item.reviewer_notes ? (
                        <div className="mt-3 rounded-2xl border border-border/50 bg-card/90 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            {t('law.reviewerNotesLabel')}
                          </p>
                          <p className="mt-2 text-sm text-foreground/90">{item.reviewer_notes}</p>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </Card>

            {canReview && !backendUnavailable ? (
              <>
                <Card className="rounded-3xl border-border/70 bg-card/95 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{t('law.reviewQueueTitle')}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{t('law.reviewQueueDescription')}</p>
                    </div>
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <Select value={reviewStatusFilter} onValueChange={(value) => setReviewStatusFilter(value as 'all' | LawContributionStatus)}>
                      <SelectTrigger><SelectValue placeholder={t('law.reviewFilters.status')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('law.reviewFilters.allStatuses')}</SelectItem>
                        <SelectItem value="pending">{t('law.statuses.pending')}</SelectItem>
                        <SelectItem value="approved">{t('law.statuses.approved')}</SelectItem>
                        <SelectItem value="changes_requested">{t('law.statuses.changes_requested')}</SelectItem>
                        <SelectItem value="rejected">{t('law.statuses.rejected')}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={reviewTypeFilter} onValueChange={(value) => setReviewTypeFilter(value as 'all' | LawContributionType)}>
                      <SelectTrigger><SelectValue placeholder={t('law.reviewFilters.type')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('law.reviewFilters.allTypes')}</SelectItem>
                        <SelectItem value="source">{t('law.contributionTypes.source')}</SelectItem>
                        <SelectItem value="structure">{t('law.contributionTypes.structure')}</SelectItem>
                        <SelectItem value="summary">{t('law.contributionTypes.summary')}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={reviewTrackFilter} onValueChange={(value) => setReviewTrackFilter(value as 'all' | LawTrack)}>
                      <SelectTrigger><SelectValue placeholder={t('law.reviewFilters.track')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('law.reviewFilters.allTracks')}</SelectItem>
                        <SelectItem value="civil">{t('law.tracks.civil.title')}</SelectItem>
                        <SelectItem value="criminal">{t('law.tracks.criminal.title')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="mt-3 text-sm text-muted-foreground">
                    {t('law.reviewFilters.matchingCount', { count: filteredReviewQueue.length })}
                  </div>

                  <div className="mt-4 space-y-3">
                    {contributionsLoading ? (
                      <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('common.loading')}
                      </div>
                    ) : filteredReviewQueue.length === 0 ? (
                      <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
                        {t('law.noFilteredReviewItems')}
                      </div>
                    ) : (
                      filteredReviewQueue.map((item) => {
                        const isSaving = reviewSavingId === item.id;
                        return (
                          <div key={item.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-foreground">{item.title}</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {sourceTitleById[item.source_id || ''] || item.source_reference || t('law.generalContribution')}
                                </p>
                              </div>
                              <Badge variant="secondary" className="rounded-full bg-muted text-muted-foreground hover:bg-muted">
                                {t(`law.contributionTypes.${item.contribution_type}`)}
                              </Badge>
                            </div>
                            <p className="mt-3 text-sm text-foreground/90">{item.note}</p>
                            <div className="mt-4 grid gap-2">
                              <Label htmlFor={`review-note-${item.id}`}>{t('law.reviewNoteLabel')}</Label>
                              <Textarea
                                id={`review-note-${item.id}`}
                                value={reviewNotes[item.id] || ''}
                                onChange={(event) =>
                                  setReviewNotes((current) => ({
                                    ...current,
                                    [item.id]: event.target.value,
                                  }))
                                }
                                placeholder={t('law.reviewNotePlaceholder')}
                                className="min-h-[100px]"
                              />
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button size="sm" onClick={() => void handleReviewContribution(item.id, 'approved')} disabled={isSaving}>
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {t('law.reviewActions.approve')}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => void handleReviewContribution(item.id, 'changes_requested')} disabled={isSaving}>
                                {t('law.reviewActions.requestChanges')}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => void handleReviewContribution(item.id, 'rejected')} disabled={isSaving}>
                                {t('law.reviewActions.reject')}
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </Card>

                <Card className="rounded-3xl border-border/70 bg-card/95 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{t('law.reviewHistoryTitle')}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{t('law.reviewHistoryDescription')}</p>
                    </div>
                    <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">
                      {t('law.reviewHistoryCount', { count: filteredReviewHistory.length })}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <Select value={historyStatusFilter} onValueChange={(value) => setHistoryStatusFilter(value as Exclude<LawContributionStatus, 'pending'> | 'all')}>
                      <SelectTrigger><SelectValue placeholder={t('law.reviewFilters.status')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('law.reviewFilters.allStatuses')}</SelectItem>
                        <SelectItem value="approved">{t('law.statuses.approved')}</SelectItem>
                        <SelectItem value="changes_requested">{t('law.statuses.changes_requested')}</SelectItem>
                        <SelectItem value="rejected">{t('law.statuses.rejected')}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={historyTypeFilter} onValueChange={(value) => setHistoryTypeFilter(value as 'all' | LawContributionType)}>
                      <SelectTrigger><SelectValue placeholder={t('law.reviewFilters.type')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('law.reviewFilters.allTypes')}</SelectItem>
                        <SelectItem value="source">{t('law.contributionTypes.source')}</SelectItem>
                        <SelectItem value="structure">{t('law.contributionTypes.structure')}</SelectItem>
                        <SelectItem value="summary">{t('law.contributionTypes.summary')}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={historyTrackFilter} onValueChange={(value) => setHistoryTrackFilter(value as 'all' | LawTrack)}>
                      <SelectTrigger><SelectValue placeholder={t('law.reviewFilters.track')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('law.reviewFilters.allTracks')}</SelectItem>
                        <SelectItem value="civil">{t('law.tracks.civil.title')}</SelectItem>
                        <SelectItem value="criminal">{t('law.tracks.criminal.title')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="mt-3 text-sm text-muted-foreground">
                    {t('law.reviewFilters.matchingHistoryCount', { count: filteredReviewHistory.length })}
                  </div>

                  <div className="mt-4 space-y-3">
                    {contributionsLoading ? (
                      <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('common.loading')}
                      </div>
                    ) : filteredReviewHistory.length === 0 ? (
                      <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
                        {t('law.noReviewHistoryItems')}
                      </div>
                    ) : (
                      filteredReviewHistory.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-foreground">{item.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {sourceTitleById[item.source_id || ''] || item.source_reference || t('law.generalContribution')}
                              </p>
                            </div>
                            <Badge variant="secondary" className="rounded-full bg-muted text-muted-foreground hover:bg-muted">
                              {t(`law.statuses.${item.status}`)}
                            </Badge>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>{t(`law.contributionTypes.${item.contribution_type}`)}</span>
                            <span>•</span>
                            <span>{item.track === 'civil' ? t('law.tracks.civil.title') : t('law.tracks.criminal.title')}</span>
                            <span>•</span>
                            <span>{formatTimestamp(item.reviewed_at || item.updated_at, language)}</span>
                          </div>
                          <p className="mt-3 text-sm text-foreground/90">{item.note}</p>
                          {item.reviewer_notes ? (
                            <div className="mt-3 rounded-2xl border border-border/50 bg-card/90 p-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                {t('law.reviewerNotesLabel')}
                              </p>
                              <p className="mt-2 text-sm text-foreground/90">{item.reviewer_notes}</p>
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
