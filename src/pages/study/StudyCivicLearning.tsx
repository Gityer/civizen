import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Bookmark, BookmarkCheck, BookOpen, Check, ChevronDown, ChevronRight, ChevronUp, Coins, Clock3, FileText, Gavel, Landmark, Scale, X } from 'lucide-react';
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { ConstitutionReader } from '@/components/study/ConstitutionReader';
import { StudyMarkdownReader } from '@/components/study/StudyMarkdownReader';
import { StudyOpenVotesCard } from '@/components/study/StudyOpenVotesCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import type { StudyLayoutOutletContext } from '@/pages/StudyLayout';
import { permissionListHasAny } from '@/lib/access-control';
import { CONSTITUTION_ARTICLE_BOOKMARK_PREFIX, CONSTITUTION_STUDY_SECTIONS, OPEN_ARTICLE_STORAGE_KEY } from '@/lib/constitution-study';
import { buildStudyAiExplanation, getFoundationMaterialsForDomain, FOUNDATION_STUDY_DOCUMENT_KEYS, filterStudyDocumentsByQuery, getFoundationCompletionMetrics, isMissingStudyBackend, STUDY_DOCUMENTS, type StudyCertificationStatus, type StudyDocument, type StudyMaterial, type StudyMaterialType } from '@/lib/study';
import { getStudyMaterialContentByKey } from '@/lib/study-material-content';
import { cn } from '@/lib/utils';
import { type StudyDomain, studyDomains } from '@/pages/study/study-domains';



const STUDY_PROGRESS_KEY = 'civizen-study-progress-v2';
const STUDY_BOOKMARKS_KEY = 'civizen-study-bookmarks-v1';
const STUDY_CERTIFICATION_KEY = 'civizen-study-certification-v1';
const FOUNDATION_CERTIFICATION_ID = 'civic_foundations';
const DOMAIN_PROGRESS_RING_RADIUS = 11;
const DOMAIN_PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * DOMAIN_PROGRESS_RING_RADIUS;
const CONSTITUTION_ARTICLE_HEADING_PATTERN = /^##\s+(.+)$/;

const materialTypeIcons: Record<StudyMaterialType, ComponentType<{ className?: string }>> = {
  constitution: Landmark,
  summary: BookOpen,
  legalText: Scale,
  guide: FileText,
};

type BookmarkTarget = {
  key: string;
  title: string;
};

type SearchArticleHit = {
  id: string;
  title: string;
  domainId: 'constitution' | 'economy';
  materialKey?: string;
  sentences: string[];
};

function constitutionArticleHeading(markdown: string) {
  const line = markdown
    .replace(/\r\n/g, '\n')
    .split('\n')
    .find((candidate) => CONSTITUTION_ARTICLE_HEADING_PATTERN.test(candidate.trim()));
  if (!line) return 'Constitution Article';
  const match = line.trim().match(CONSTITUTION_ARTICLE_HEADING_PATTERN);
  return match?.[1]?.trim() || 'Constitution Article';
}

function stripMarkdownForSearch(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitIntoSearchSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function escapeRegExpForSearch(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readLocalProgress() {
  if (typeof window === 'undefined') return {} as Record<string, number>;
  try {
    const raw = window.localStorage.getItem(STUDY_PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function readLocalBookmarks() {
  if (typeof window === 'undefined') return [] as string[];
  try {
    const raw = window.localStorage.getItem(STUDY_BOOKMARKS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function readLocalCertificationStatus() {
  if (typeof window === 'undefined') return 'pending' as StudyCertificationStatus;
  try {
    const raw = window.localStorage.getItem(STUDY_CERTIFICATION_KEY);
    return (raw as StudyCertificationStatus) || 'pending';
  } catch {
    return 'pending';
  }
}

function persistLocalState(args: {
  progressByKey: Record<string, number>;
  bookmarks: Set<string>;
  certificationStatus: StudyCertificationStatus;
}) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STUDY_PROGRESS_KEY, JSON.stringify(args.progressByKey));
    window.localStorage.setItem(STUDY_BOOKMARKS_KEY, JSON.stringify(Array.from(args.bookmarks)));
    window.localStorage.setItem(STUDY_CERTIFICATION_KEY, args.certificationStatus);
  } catch {
    // Ignore local persistence errors and keep the in-memory state.
  }
}

export default function StudyCivicLearning() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSearchOpen } = useOutletContext<StudyLayoutOutletContext>();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const canReadLaw = permissionListHasAny(profile?.effective_permissions || [], ['law.read']);
  const [progressByKey, setProgressByKey] = useState<Record<string, number>>({});
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [certificationStatus, setCertificationStatus] = useState<StudyCertificationStatus>('pending');
  const [studyBackendUnavailable, setStudyBackendUnavailable] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedMaterialKey, setSelectedMaterialKey] = useState<string>('');
  const [openEconomyMaterialKey, setOpenEconomyMaterialKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [explainDocument, setExplainDocument] = useState<StudyDocument | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedDomain = params.get('domain');
    const requestedMaterial = params.get('material');

    if (!requestedDomain || !studyDomains.some((domain) => domain.id === requestedDomain)) {
      setSelectedDomain('');
      setSelectedMaterialKey('');
      return;
    }

    setSelectedDomain(requestedDomain);
    setSelectedMaterialKey(requestedMaterial || '');
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;

    const loadStudyState = async () => {
      if (!profile?.id) {
        if (cancelled) return;
        const localProgress = readLocalProgress();
        const localBookmarks = new Set(readLocalBookmarks());
        const localCertification = readLocalCertificationStatus();
        setProgressByKey(localProgress);
        setBookmarks(localBookmarks);
        setCertificationStatus(localCertification);
        return;
      }

      const progressQuery = supabase
        .from('study_progress')
        .select('*')
        .eq('profile_id', profile.id);
      const bookmarksQuery = supabase
        .from('study_bookmarks')
        .select('*')
        .eq('profile_id', profile.id);
      const certificationQuery = supabase
        .from('study_certifications')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('certification_key', FOUNDATION_CERTIFICATION_ID)
        .maybeSingle();

      const [progressResponse, bookmarksResponse, certificationResponse] = await Promise.all([
        progressQuery,
        bookmarksQuery,
        certificationQuery,
      ]);

      if (cancelled) return;

      if (
        isMissingStudyBackend(progressResponse.error)
        || isMissingStudyBackend(bookmarksResponse.error)
        || isMissingStudyBackend(certificationResponse.error)
      ) {
        setStudyBackendUnavailable(true);
        setProgressByKey(readLocalProgress());
        setBookmarks(new Set(readLocalBookmarks()));
        setCertificationStatus(readLocalCertificationStatus());
        return;
      }

      if (progressResponse.error || bookmarksResponse.error || certificationResponse.error) {
        console.error('Failed to load study state:', {
          progressError: progressResponse.error,
          bookmarksError: bookmarksResponse.error,
          certificationError: certificationResponse.error,
        });
        toast.error(t('study.errors.loadFailed'));
        setProgressByKey(readLocalProgress());
        setBookmarks(new Set(readLocalBookmarks()));
        setCertificationStatus(readLocalCertificationStatus());
        return;
      }

      const nextProgress = (progressResponse.data ?? []).reduce<Record<string, number>>(
        (accumulator, row) => {
          accumulator[row.document_key] = row.progress_percent;
          return accumulator;
        },
        {},
      );
      const nextBookmarks = new Set((bookmarksResponse.data ?? []).map((row) => row.document_key));
      const nextCertification = (certificationResponse.data?.status ?? 'pending') as StudyCertificationStatus;

      setProgressByKey(nextProgress);
      setBookmarks(nextBookmarks);
      setCertificationStatus(nextCertification);
    };

    void loadStudyState();

    return () => {
      cancelled = true;
    };
  }, [profile?.id, t]);

  const toggleBookmark = async (target: BookmarkTarget) => {
    const nextBookmarks = new Set(bookmarks);
    const isBookmarked = nextBookmarks.has(target.key);

    if (isBookmarked) {
      nextBookmarks.delete(target.key);
    } else {
      nextBookmarks.add(target.key);
    }

    setBookmarks(nextBookmarks);
    persistLocalState({
      progressByKey,
      bookmarks: nextBookmarks,
      certificationStatus,
    });

    if (!profile?.id || studyBackendUnavailable) return;

    if (isBookmarked) {
      const { error } = await supabase
        .from('study_bookmarks')
        .delete()
        .eq('profile_id', profile.id)
        .eq('document_key', target.key);

      if (error) {
        console.error('Failed to remove bookmark:', error);
        toast.error(t('study.errors.bookmarkSaveFailed'));
      }
      return;
    }

    const { error } = await supabase
      .from('study_bookmarks')
      .insert({
        profile_id: profile.id,
        document_key: target.key,
        title: target.title,
      });

    if (error) {
      console.error('Failed to save bookmark:', error);
      toast.error(t('study.errors.bookmarkSaveFailed'));
    }
  };

  const handleOpenDomain = (domain: StudyDomain) => {
    if (!domain.availableNow) return;
    if (domain.id === 'laws' && !canReadLaw) return;

    if (selectedDomain === domain.id) {
      setSelectedDomain('');
      navigate('/study', { replace: true });
      return;
    }

    if (domain.id === 'constitution') {
      setSelectedDomain('constitution');
      navigate('/study?domain=constitution', { replace: true });
      return;
    }

    setSelectedDomain(domain.id);
  };

  const handleOpenMaterial = (material: StudyMaterial, isDisabled: boolean) => {
    if (isDisabled || !material.availableNow) return;

    if (material.domainId !== 'constitution') {
      navigate(material.route);
      return;
    }

    setSelectedDomain('constitution');
    navigate('/study?domain=constitution', { replace: true });
  };

  const completionMetrics = getFoundationCompletionMetrics(progressByKey);
  const foundationProgressPercent = completionMetrics.percent;
  const completedFoundationCount = completionMetrics.completed;
  const certificationLabelKey =
    certificationStatus === 'earned'
      ? 'study.progress.badgeEarned'
      : certificationStatus === 'eligible'
        ? 'study.progress.badgeEligible'
        : 'study.progress.badgePending';

  const recommendedNextDocumentKey =
    FOUNDATION_STUDY_DOCUMENT_KEYS.find((key) => (progressByKey[key] ?? 0) < 100) || 'constitution';

  const filteredDocuments = useMemo(
    () =>
      filterStudyDocumentsByQuery(
        STUDY_DOCUMENTS,
        searchQuery,
        (document) => t(document.titleKey),
        (document) => t(document.summaryKey),
      ),
    [searchQuery, t],
  );
  const hasSearchQuery = searchQuery.trim().length > 0;

  const constitutionArticleBookmarks = useMemo(
    () =>
      CONSTITUTION_STUDY_SECTIONS
        .filter((section) => section.kind === 'article')
        .map((section) => ({
          id: section.id,
          key: `${CONSTITUTION_ARTICLE_BOOKMARK_PREFIX}${section.id}`,
          title: constitutionArticleHeading(section.markdown),
        })),
    [],
  );
  const bookmarkedDocuments = STUDY_DOCUMENTS.filter((document) => bookmarks.has(document.key));
  const bookmarkedConstitutionArticles = constitutionArticleBookmarks.filter((article) => bookmarks.has(article.key));
  const selectedDomainData = studyDomains.find((domain) => domain.id === selectedDomain);
  const studyDomainIconMap = useMemo(
    () =>
      studyDomains.reduce<Record<string, ComponentType<{ className?: string }>>>((accumulator, domain) => {
        accumulator[domain.id] = domain.icon;
        return accumulator;
      }, {}),
    [],
  );
  const RecommendedIcon = studyDomainIconMap[recommendedNextDocumentKey] || BookOpen;
  const selectedFoundationMaterials = useMemo(() => {
    if (
      selectedDomain !== 'laws'
      && selectedDomain !== 'citizenship'
      && selectedDomain !== 'economy'
    ) {
      return [];
    }

    return getFoundationMaterialsForDomain(selectedDomain);
  }, [selectedDomain]);
  const economyFoundationMaterials = useMemo(
    () => getFoundationMaterialsForDomain('economy'),
    [],
  );
  const economyArticleItems = useMemo(
    () =>
      economyFoundationMaterials.map((material) => {
        const content = getStudyMaterialContentByKey(material.key);
        return {
          key: material.key,
          title: t(material.titleKey),
          summary: t(material.summaryKey),
          badgeLabel: content?.badgeLabel || t(`study.materialType.${material.materialType}`),
          markdown: content?.markdown || null,
        };
      }),
    [economyFoundationMaterials, t],
  );
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredDomains = useMemo(() => {
    if (!normalizedSearchQuery) return [];

    return studyDomains.filter((domain) => {
      const title = t(domain.titleKey).toLowerCase();
      const description = t(domain.descriptionKey).toLowerCase();
      return title.includes(normalizedSearchQuery) || description.includes(normalizedSearchQuery);
    });
  }, [normalizedSearchQuery, t]);
  const filteredArticleHits = useMemo<SearchArticleHit[]>(() => {
    if (!normalizedSearchQuery) return [];

    const constitutionHits: SearchArticleHit[] = CONSTITUTION_STUDY_SECTIONS
      .filter((section) => section.kind === 'article')
      .map((section) => {
        const sentences = splitIntoSearchSentences(stripMarkdownForSearch(section.markdown))
          .filter((sentence) => sentence.toLowerCase().includes(normalizedSearchQuery))
          .slice(0, 3);

        return {
          id: section.id,
          title: constitutionArticleHeading(section.markdown),
          domainId: 'constitution' as const,
          sentences,
        };
      })
      .filter((hit) => hit.sentences.length > 0);

    const economyHits: SearchArticleHit[] = economyArticleItems
      .filter((item) => Boolean(item.markdown))
      .map((item) => {
        const sentences = splitIntoSearchSentences(stripMarkdownForSearch(item.markdown || ''))
          .filter((sentence) => sentence.toLowerCase().includes(normalizedSearchQuery))
          .slice(0, 3);

        return {
          id: item.key,
          title: item.title,
          domainId: 'economy' as const,
          materialKey: item.key,
          sentences,
        };
      })
      .filter((hit) => hit.sentences.length > 0);

    return [...constitutionHits, ...economyHits];
  }, [economyArticleItems, normalizedSearchQuery]);

  const renderHighlightedSentence = (sentence: string) => {
    if (!normalizedSearchQuery) return sentence;
    const parts = sentence.split(new RegExp(`(${escapeRegExpForSearch(normalizedSearchQuery)})`, 'gi'));
    return parts.map((part, index) => {
      if (part.toLowerCase() === normalizedSearchQuery) {
        return (
          <mark key={`${part}-${index}`} className="rounded bg-primary/20 px-1 text-foreground">
            {part}
          </mark>
        );
      }
      return <span key={`${part}-${index}`}>{part}</span>;
    });
  };

  useEffect(() => {
    if (selectedDomain !== 'economy') {
      setOpenEconomyMaterialKey(null);
      return;
    }

    if (selectedMaterialKey && economyArticleItems.some((item) => item.key === selectedMaterialKey)) {
      setOpenEconomyMaterialKey(selectedMaterialKey);
      return;
    }

    // Opening the domain should not auto-expand an article.
    setOpenEconomyMaterialKey(null);
  }, [selectedDomain, selectedMaterialKey, economyArticleItems]);
  return (
    <>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {studyBackendUnavailable && (
            <p className="text-xs text-muted-foreground">{t('study.localMode')}</p>
          )}
        </motion.div>

        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
          >
            <Card className="border-border/70 bg-card/95 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {t('study.searchTitle')}
                </h2>
              </div>
              <Input
                className="mt-3"
                placeholder={t('study.searchPlaceholder')}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />

              <div className="mt-4 space-y-3">
                {!hasSearchQuery
                  ? null
                  : filteredDocuments.length === 0 && filteredDomains.length === 0 && filteredArticleHits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('study.noSearchResults')}</p>
                ) : (
                  <>
                    {filteredDomains.map((domain) => {
                      const DomainIcon = domain.icon;
                      return (
                        <Card
                          key={`domain-${domain.id}`}
                          className="cursor-pointer border-border/70 bg-background/60 p-4 hover:border-border hover:shadow-sm"
                          onClick={() => handleOpenDomain(domain)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              handleOpenDomain(domain);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <DomainIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{t(domain.titleKey)}</h3>
                              <p className="mt-1 text-sm text-muted-foreground">{t(domain.descriptionKey)}</p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}

                    {filteredDocuments.map((document) => {
                      const DocumentIcon = studyDomainIconMap[document.domainId] || BookOpen;
                      const isBookmarked = bookmarks.has(document.key);
                      const isCompleted = (progressByKey[document.key] ?? 0) >= 100;
                      const isDisabled = document.key === 'laws' && !canReadLaw;
                      const canOpenDocument = Boolean(document.route) && document.availableNow && !isDisabled;
                      return (
                        <Card
                          key={document.key}
                          className={cn(
                            'border-border/70 bg-background/60 p-4',
                            canOpenDocument && 'cursor-pointer hover:border-border hover:shadow-sm',
                          )}
                          onClick={() => canOpenDocument && document.route && navigate(document.route)}
                          onKeyDown={(event) => {
                            if (canOpenDocument && (event.key === 'Enter' || event.key === ' ')) {
                              event.preventDefault();
                              navigate(document.route!);
                            }
                          }}
                          role={canOpenDocument ? 'button' : undefined}
                          tabIndex={canOpenDocument ? 0 : undefined}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <DocumentIcon className="h-4 w-4" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground">{t(document.titleKey)}</h3>
                                <p className="mt-1 text-sm text-muted-foreground">{t(document.summaryKey)}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant={document.availableNow ? 'secondary' : 'outline'} className="rounded-full">
                                {document.availableNow ? t('study.availableNow') : t('study.comingSoon')}
                              </Badge>
                              <Badge variant="outline" className="rounded-full">
                                {t('study.estimatedMinutes', { minutes: document.estimatedMinutes })}
                              </Badge>
                              {isCompleted && <Badge className="rounded-full">{t('study.markedComplete')}</Badge>}
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                void toggleBookmark({ key: document.key, title: t(document.titleKey) });
                              }}
                              className="gap-2"
                            >
                              {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                              {isBookmarked ? t('study.removeBookmark') : t('study.bookmark')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                setExplainDocument(document);
                              }}
                            >
                              {t('study.aiExplain')}
                            </Button>
                          </div>
                        </Card>
                      );
                    })}

                    {filteredArticleHits.map((hit) => (
                      <Card
                        key={`article-${hit.domainId}-${hit.id}`}
                        className="cursor-pointer border-border/70 bg-background/60 p-4 hover:border-border hover:shadow-sm"
                        onClick={() => {
                          if (hit.domainId === 'constitution') {
                            try {
                              window.localStorage.setItem(OPEN_ARTICLE_STORAGE_KEY, hit.id);
                            } catch {
                              // Ignore local storage failures.
                            }
                            setSelectedDomain('constitution');
                            navigate('/study?domain=constitution', { replace: true });
                            return;
                          }

                          if (hit.materialKey) {
                            setSelectedDomain('economy');
                            setSelectedMaterialKey(hit.materialKey);
                            setOpenEconomyMaterialKey(hit.materialKey);
                            navigate(`/study?domain=economy&material=${hit.materialKey}`, { replace: true });
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            if (hit.domainId === 'constitution') {
                              try {
                                window.localStorage.setItem(OPEN_ARTICLE_STORAGE_KEY, hit.id);
                              } catch {
                                // Ignore local storage failures.
                              }
                              setSelectedDomain('constitution');
                              navigate('/study?domain=constitution', { replace: true });
                              return;
                            }

                            if (hit.materialKey) {
                              setSelectedDomain('economy');
                              setSelectedMaterialKey(hit.materialKey);
                              setOpenEconomyMaterialKey(hit.materialKey);
                              navigate(`/study?domain=economy&material=${hit.materialKey}`, { replace: true });
                            }
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Landmark className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{hit.title}</h3>
                            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                              {hit.domainId === 'constitution' ? 'Constitution article' : 'Economy article'}
                            </p>
                          </div>
                        </div>
                        <ul className="mt-3 space-y-2">
                          {hit.sentences.map((sentence) => (
                            <li key={`${hit.id}-${sentence}`} className="text-sm text-muted-foreground">
                              {renderHighlightedSentence(sentence)}
                            </li>
                          ))}
                        </ul>
                      </Card>
                    ))}

                  </>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="grid gap-3 md:grid-cols-2"
        >
          {studyDomains.map((domain, index) => {
            const Icon = domain.icon;
            const isFoundational = FOUNDATION_STUDY_DOCUMENT_KEYS.includes(
              domain.id as (typeof FOUNDATION_STUDY_DOCUMENT_KEYS)[number],
            );
            const domainProgressPercent = Math.max(0, Math.min(100, progressByKey[domain.id] ?? 0));
            const isDisabled = domain.id === 'laws' && !canReadLaw;
            const canOpenDomain = domain.availableNow && !isDisabled;
            const domainTitle = t(domain.titleKey);
            const domainDescription = t(domain.descriptionKey);
            const isDomainExpanded = selectedDomain === domain.id;

            return (
              <motion.div
                key={domain.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.02 }}
                className="space-y-3"
              >
                <Card
                  className={cn(
                    'group border-border/70 p-3 shadow-sm transition-all',
                    canOpenDomain
                      ? 'cursor-pointer bg-card/95 hover:border-border hover:shadow-md'
                      : 'bg-muted/20',
                    selectedDomain === domain.id && 'border-primary/40 bg-primary/5',
                    isDisabled && 'cursor-not-allowed opacity-80',
                  )}
                  onClick={() => canOpenDomain && handleOpenDomain(domain)}
                  onKeyDown={(event) => {
                    if (canOpenDomain && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      handleOpenDomain(domain);
                    }
                  }}
                  role={canOpenDomain ? 'button' : undefined}
                  tabIndex={canOpenDomain ? 0 : undefined}
                >
                  <div className={cn('flex min-w-0 gap-3', isDomainExpanded ? 'items-start' : 'items-center')}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 w-0 flex-1">
                      <span
                        className={cn(
                          'block truncate text-sm font-semibold text-muted-foreground transition-colors',
                          canOpenDomain && 'group-hover:text-foreground',
                          isDomainExpanded && 'text-foreground',
                        )}
                      >
                        {domainTitle}
                      </span>
                      <span
                        className={cn(
                          'mt-1 block text-sm text-muted-foreground',
                          isDomainExpanded
                            ? 'whitespace-normal wrap-break-word'
                            : 'line-clamp-2 wrap-break-word',
                        )}
                        title={domainDescription}
                      >
                        {domainDescription}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {isFoundational && (
                        <span
                          className="relative inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-background/80"
                          title={
                            domainProgressPercent >= 100
                              ? t('study.progress.completedVerified')
                              : t('study.progress.readProgress', { percent: domainProgressPercent })
                          }
                        >
                          <svg
                            viewBox="0 0 28 28"
                            className="h-5 w-5"
                            aria-hidden="true"
                          >
                            <circle
                              cx="14"
                              cy="14"
                              r={DOMAIN_PROGRESS_RING_RADIUS}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="text-muted-foreground/30"
                            />
                            <circle
                              cx="14"
                              cy="14"
                              r={DOMAIN_PROGRESS_RING_RADIUS}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              className="text-primary"
                              strokeDasharray={DOMAIN_PROGRESS_RING_CIRCUMFERENCE}
                              strokeDashoffset={
                                DOMAIN_PROGRESS_RING_CIRCUMFERENCE
                                - (domainProgressPercent / 100) * DOMAIN_PROGRESS_RING_CIRCUMFERENCE
                              }
                              transform="rotate(-90 14 14)"
                            />
                          </svg>
                          {domainProgressPercent >= 100 && (
                            <Check className="absolute h-3 w-3 text-primary" />
                          )}
                        </span>
                      )}

                      {!domain.availableNow && (
                        <span
                          className="inline-flex h-7 items-center gap-1 rounded-full border border-border/70 bg-background/80 px-2 text-xs text-muted-foreground"
                          title={t('study.comingSoon')}
                        >
                          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                          {t('study.comingSoon')}
                        </span>
                      )}

                      {canOpenDomain && (
                        selectedDomain === domain.id
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {isDisabled && (
                    <p className="mt-1 pl-12 text-xs text-muted-foreground">{t('study.lawAccessRequired')}</p>
                  )}
                </Card>

                {domain.id === 'constitution' && selectedDomain === 'constitution' && (
                  <>
                  <p className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground" data-testid="constitution-status">
                    {t('study.constitutionStatus')}{' '}
                    <Link to="/governance/charter" className="font-medium text-primary underline-offset-2 hover:underline">{t('study.constitutionCharterLink')}</Link>
                  </p>
                  <ConstitutionReader
                    mode="articles"
                    searchQuery={searchQuery}
                    bookmarkedKeys={bookmarks}
                    onToggleArticleBookmark={(articleId, articleHeading) => {
                      void toggleBookmark({
                        key: `${CONSTITUTION_ARTICLE_BOOKMARK_PREFIX}${articleId}`,
                        title: articleHeading,
                      });
                    }}
                  />
                  </>
                )}

                {domain.id === 'economy' && selectedDomain === 'economy' && (
                  <Card className="border-border/70 bg-card/95 p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {t('study.foundationLibraryTitle')}
                      </h3>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('study.foundationLibraryDescription')}
                    </p>
                    <div className="mt-4 space-y-2">
                      {economyArticleItems.map((material) => {
                        const isOpen = openEconomyMaterialKey === material.key;
                        return (
                          <section key={material.key} className="rounded-xl border border-border/70 bg-background/40">
                            <div
                              role="button"
                              tabIndex={0}
                              className="group w-full px-4 py-3 text-left"
                              onClick={() => setOpenEconomyMaterialKey(isOpen ? null : material.key)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  setOpenEconomyMaterialKey(isOpen ? null : material.key);
                                }
                              }}
                              aria-expanded={isOpen}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
                                  {material.title}
                                </span>
                                {isOpen ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>

                            {isOpen && (
                              <div className="border-t border-border/70 px-4 py-3">
                                {material.markdown ? (
                                  <StudyMarkdownReader
                                    title={material.title}
                                    badgeLabel={material.badgeLabel}
                                    markdown={material.markdown}
                                    embedded
                                    showHeader={false}
                                  />
                                ) : (
                                  <div className="space-y-2">
                                    <Badge variant="secondary" className="rounded-full">
                                      {material.badgeLabel}
                                    </Badge>
                                    <p className="text-sm leading-6 text-foreground/95">{material.summary}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </section>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {selectedDomain !== 'constitution' && selectedDomain !== 'economy' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
          >
            <Card className="border-border/70 bg-card/95 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {t('study.foundationLibraryTitle')}
              </h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t('study.foundationLibraryDescription')}</p>

            {selectedFoundationMaterials.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t('study.comingSoon')}</p>
            ) : (
              <div className="mt-4 grid gap-3">
                {selectedFoundationMaterials.map((material) => {
                  const MaterialIcon = materialTypeIcons[material.materialType] || BookOpen;
                  const isDisabled = material.domainId === 'laws' && !canReadLaw;
                  return (
                    <Card key={material.key} className="border-border/70 bg-background/50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <MaterialIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{t(material.titleKey)}</h4>
                            <p className="mt-1 text-sm text-muted-foreground">{t(material.summaryKey)}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="rounded-full">
                          {t(`study.materialType.${material.materialType}`)}
                        </Badge>
                      </div>
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          disabled={isDisabled || !material.availableNow}
                          onClick={() => handleOpenMaterial(material, isDisabled)}
                        >
                          {isDisabled ? t('study.lawAccessRequired') : t('study.openMaterial')}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <Card className="border-border/70 bg-card/95 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {t('study.bookmarksTitle')}
              </h3>
            </div>
            {bookmarkedDocuments.length === 0 && bookmarkedConstitutionArticles.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{t('study.noBookmarks')}</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {bookmarkedDocuments.map((document) => {
                  const DocumentIcon = studyDomainIconMap[document.domainId] || BookOpen;
                  return (
                  <li key={document.key} className="group flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 transition-colors group-hover:text-foreground">
                      <DocumentIcon className="h-4 w-4 text-primary" />
                      {t(document.titleKey)}
                    </span>
                    <Button
                      variant="ghost"
                      className="group relative h-7 w-7 p-0 text-primary hover:bg-transparent hover:text-primary"
                      onClick={() => void toggleBookmark({ key: document.key, title: t(document.titleKey) })}
                      aria-label={t('study.removeBookmark')}
                    >
                      <span className="relative inline-flex h-4 w-4 items-center justify-center">
                        <Bookmark className="h-4 w-4" />
                        <X className="absolute h-2.5 w-2.5 text-red-400" />
                      </span>
                      <span className="pointer-events-none absolute right-full mr-2 whitespace-nowrap rounded-md border border-border/70 bg-background/95 px-2 py-1 text-[11px] text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        {t('study.removeBookmark')}
                      </span>
                    </Button>
                  </li>
                  );
                })}
                {bookmarkedConstitutionArticles.map((article) => (
                  <li key={article.key} className="group flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 transition-colors group-hover:text-foreground">
                      <Landmark className="h-4 w-4 text-primary" />
                      {article.title}
                    </span>
                    <Button
                      variant="ghost"
                      className="group relative h-7 w-7 p-0 text-primary hover:bg-transparent hover:text-primary"
                      onClick={() => void toggleBookmark({ key: article.key, title: article.title })}
                      aria-label={t('study.removeBookmark')}
                    >
                      <span className="relative inline-flex h-4 w-4 items-center justify-center">
                        <Bookmark className="h-4 w-4" />
                        <X className="absolute h-2.5 w-2.5 text-red-400" />
                      </span>
                      <span className="pointer-events-none absolute right-full mr-2 whitespace-nowrap rounded-md border border-border/70 bg-background/95 px-2 py-1 text-[11px] text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        {t('study.removeBookmark')}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/70 bg-card/95 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              {t('study.continueLearning')}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <RecommendedIcon className="h-4 w-4 text-primary" />
              <p className="text-base font-semibold text-foreground">
                {t(`study.domains.${recommendedNextDocumentKey}.title`)}
              </p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(`study.domains.${recommendedNextDocumentKey}.description`)}
            </p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="grid gap-3 lg:grid-cols-2"
        >
          <Card className="border-border/70 bg-card/95 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {t('study.recentlyUpdated')}
              </h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-foreground">
              <li className="inline-flex items-center gap-2">
                <Landmark className="h-4 w-4 text-primary" />
                {t('study.updates.constitutionCore')}
              </li>
              <li className="inline-flex items-center gap-2">
                <Gavel className="h-4 w-4 text-primary" />
                {t('study.updates.lawLibrary')}
              </li>
              <li className="inline-flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" />
                {t('study.updates.lumaMonetary')}
              </li>
            </ul>
          </Card>

          <StudyOpenVotesCard />
        </motion.div>

        {selectedDomainData?.id === 'economy' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
          >
            <Card className="border-border/70 bg-linear-to-br from-emerald-500/10 via-card to-primary/5 p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">{t('study.economyBriefingTitle')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t('study.economyBriefingDescription')}</p>
              <ul className="mt-4 space-y-2 text-sm text-foreground/90">
                <li>{t('study.economyBriefingPoints.supply')}</li>
                <li>{t('study.economyBriefingPoints.guardrails')}</li>
                <li>{t('study.economyBriefingPoints.approval')}</li>
                <li>{t('study.economyBriefingPoints.audit')}</li>
              </ul>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
        >
          <Card className="border-border/70 bg-linear-to-br from-primary/5 via-card to-accent/5 p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {t('study.progress.constitutionProgress')}
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{foundationProgressPercent}%</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {t('study.progress.completedModules')}
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {completedFoundationCount}/{FOUNDATION_STUDY_DOCUMENT_KEYS.length}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {t('study.progress.knowledgeBadge')}
                </p>
                <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <BadgeCheck
                    className={cn(
                      'h-4 w-4',
                      certificationStatus !== 'pending' ? 'text-primary' : 'text-muted-foreground',
                    )}
                  />
                  {t(certificationLabelKey)}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <Dialog open={Boolean(explainDocument)} onOpenChange={(open) => !open && setExplainDocument(null)}>
        <DialogContent>
          {explainDocument && (
            <>
              <DialogHeader>
                <DialogTitle>{t('study.aiExplainTitle')}</DialogTitle>
                <DialogDescription>{t(explainDocument.titleKey)}</DialogDescription>
              </DialogHeader>
              <p className="text-sm text-foreground/90">
                {buildStudyAiExplanation({
                  title: t(explainDocument.titleKey),
                  summary: t(explainDocument.summaryKey),
                  domainLabel: t(`study.domains.${explainDocument.domainId}.title`),
                  estimatedMinutes: explainDocument.estimatedMinutes,
                })}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
