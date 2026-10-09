import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PILLARS, type PillarId } from '@/lib/constants';
import { calculateCivizenScore, type Endorsement, formatScore } from '@/lib/scoring';
import {
  SCORE_CATEGORIES,
  SCORE_CATEGORY_ORDER,
  buildScoreFromProfileActivity,
  formatScoreValue,
  type CategoryScoreInput,
  type CivizenScoreResponse,
  type ScoreCategoryId,
} from '@/lib/civizen-score';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  BadgeCheck,
  Briefcase,
  Camera,
  CheckCircle,
  GraduationCap,
  Info,
  Loader2,
  LucideIcon,
  Pencil,
  Sparkles,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { uploadProfileAvatar } from '@/lib/profile-avatar';
import { countSkillsFromEntry, declaredSkillNamesFromEntry } from '@/lib/profile-skills';
import { countTrainingsFromEntry } from '@/lib/profile-trainings';
import { parseExperienceEntries, cumulativeExperienceMonths } from '@/lib/profile-experience';
import {
  demonstratedProjectsFromContributionEvents,
  demonstratedSkillsFromContributionEvents,
  loadContributionEventsThenSync,
  scoreContributionsFromEvents,
  type ContributionEvent,
} from '@/lib/civizen-contributions';
import {
  buildPerformanceActivities,
  loadPerformanceRatings,
  scorePerformanceFromActivities,
  type PerformanceActivity,
} from '@/lib/civizen-performance';
import { EducationDetailsDialog } from '@/components/profile/EducationDetailsDialog';
import { TrainingDetailsDialog } from '@/components/profile/TrainingDetailsDialog';
import { SkillsDetailsDialog } from '@/components/profile/SkillsDetailsDialog';
import { ExperienceDetailsDialog } from '@/components/profile/ExperienceDetailsDialog';
import { ContributionsDetailsPanel } from '@/components/profile/ContributionsDetailsPanel';
import { PerformanceDetailsPanel } from '@/components/profile/PerformanceDetailsPanel';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  ActivityByDomainSection,
  ScoreCategoryCards,
  ScoreEvidenceValidation,
  ScoreHistorySection,
  ScoreMetricBreakdown,
  ScoreNextSteps,
  ScoreOverview,
  TierProgressSection,
} from '@/components/score/ScorePageSections';
import { getTierColorHex, TIER_RING_SEPARATORS } from '@/lib/civizen-score-tiers';
import { ownProfileRingDisplay } from '@/lib/civizen-score-ring-display';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
const iconMap: Record<string, LucideIcon> = {
  GraduationCap,
  Sparkles,
  BadgeCheck,
  Users,
  Briefcase,
};

const SEGMENT_COUNT = SCORE_CATEGORIES.length;
const SEGMENT_STEP_DEG = 360 / SEGMENT_COUNT;

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [educationCount, setEducationCount] = useState(0);
  const [verifiedEducationCount, setVerifiedEducationCount] = useState(0);
  const [educationLevels, setEducationLevels] = useState<string[]>([]);
  const [trainingCount, setTrainingCount] = useState(0);
  const [skillCount, setSkillCount] = useState(0);
  const [declaredSkillNames, setDeclaredSkillNames] = useState<string[]>([]);
  const [experienceCount, setExperienceCount] = useState(0);
  const [experienceMonths, setExperienceMonths] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<ScoreCategoryId | null>(null);
  const [educationPanelOpen, setEducationPanelOpen] = useState(false);
  const [trainingPanelOpen, setTrainingPanelOpen] = useState(false);
  const [skillsPanelOpen, setSkillsPanelOpen] = useState(false);
  const [contributionsPanelOpen, setContributionsPanelOpen] = useState(false);
  const [contributionEvents, setContributionEvents] = useState<ContributionEvent[]>([]);
  const [contributionInput, setContributionInput] = useState<CategoryScoreInput | null>(null);
  const [contributionsSyncing, setContributionsSyncing] = useState(false);
  const [performancePanelOpen, setPerformancePanelOpen] = useState(false);
  const [performanceActivities, setPerformanceActivities] = useState<PerformanceActivity[]>([]);
  const [performanceInput, setPerformanceInput] = useState<CategoryScoreInput | null>(null);
  const [experiencePanelOpen, setExperiencePanelOpen] = useState(false);
  const [bioDraft, setBioDraft] = useState(profile?.bio || '');
  const [bioEditing, setBioEditing] = useState(false);
  const [bioSaving, setBioSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bioTextareaRef = useRef<HTMLTextAreaElement>(null);
  const dialRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startPointerAngle: number;
    startRotation: number;
    moved: boolean;
  } | null>(null);
  const suppressNextClickRef = useRef(false);

  useEffect(() => {
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [profile?.avatar_url]);

  useEffect(() => {
    if (!bioEditing) setBioDraft(profile?.bio || '');
  }, [profile?.bio, bioEditing]);

  useEffect(() => {
    if (bioEditing) {
      bioTextareaRef.current?.focus();
      bioTextareaRef.current?.select();
    }
  }, [bioEditing]);

  useEffect(() => {
    if (profile?.id) {
      void fetchScoreInputs();
      // Keep dial photo in sync — auth snapshots can lag behind storage updates.
      void refreshProfile();
    }
  }, [profile?.id]);

  const fetchScoreInputs = async () => {
    if (!profile?.id) return;

    const [
      { data: endorsementData },
      { data: educationData },
      { data: trainingData },
      { data: skillsData },
      { data: experienceData },
      { data: avatarRow },
    ] =
      await Promise.all([
      supabase
        .from('endorsements')
        .select(`
          id,
          endorser_id,
          endorsed_id,
          pillar,
          stars,
          comment,
          created_at
        `)
        .eq('endorsed_id', profile.id)
        .eq('is_hidden', false),
      supabase
        .from('profile_education_entries')
        .select('id, education_level, verification_status')
        .eq('profile_id', profile.id),
      supabase
        .from('profile_training_entries')
        .select('training_names')
        .eq('profile_id', profile.id)
        .maybeSingle(),
      supabase
        .from('profile_skills_entries')
        .select('hard_skill_names, soft_skill_names, skill_names')
        .eq('profile_id', profile.id)
        .maybeSingle(),
      supabase
        .from('profile_experience_entries')
        .select('experiences')
        .eq('profile_id', profile.id)
        .maybeSingle(),
      supabase.from('profiles').select('avatar_url').eq('id', profile.id).maybeSingle(),
    ]);

    if (endorsementData) {
      setEndorsements(
        endorsementData.map((e) => ({
          ...e,
          pillar: e.pillar as PillarId,
        })),
      );
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

    if (avatarRow?.avatar_url) {
      setAvatarUrl(avatarRow.avatar_url);
    }

    // Paint dial/categories from profile activity; contributions fill from ledger + background sync.
    setLoading(false);

    setContributionsSyncing(true);
    try {
      const events = await loadContributionEventsThenSync(
        profile.id,
        profile.user_id,
        supabase,
        (synced) => {
          setContributionEvents(synced);
          setContributionInput(scoreContributionsFromEvents(synced));
          void loadPerformanceRatings(profile.id).then((ratings) => {
            const activities = buildPerformanceActivities(synced, ratings, profile.id);
            setPerformanceActivities(activities);
            setPerformanceInput(scorePerformanceFromActivities(activities));
          });
        },
      );
      setContributionEvents(events);
      setContributionInput(scoreContributionsFromEvents(events));
      const ratings = await loadPerformanceRatings(profile.id);
      const activities = buildPerformanceActivities(events, ratings, profile.id);
      setPerformanceActivities(activities);
      setPerformanceInput(scorePerformanceFromActivities(activities));
    } catch (error) {
      console.error('Contribution sync failed', error);
    } finally {
      setContributionsSyncing(false);
    }
  };

  const pillarScore = useMemo(() => calculateCivizenScore(endorsements), [endorsements]);

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
        demonstratedSkills: demonstratedSkillsFromContributionEvents(contributionEvents),
        demonstratedProjects: demonstratedProjectsFromContributionEvents(contributionEvents),
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
      contributionEvents,
      experienceCount,
      experienceMonths,
      endorsements.length,
      contributionInput,
      performanceInput,
    ],
  );

  const selectedCategory = useMemo(
    () => score.categories.find((c) => c.id === selectedCategoryId) ?? null,
    [score.categories, selectedCategoryId],
  );

  const handleAvatarUploadClick = () => {
    avatarInputRef.current?.click();
  };

  const startBioEdit = () => {
    setBioDraft(profile?.bio || '');
    setBioEditing(true);
  };

  const saveBio = async () => {
    if (!profile?.id || bioSaving) return;
    const next = bioDraft.trim().slice(0, 300);
    const current = (profile.bio || '').trim();
    if (next === current) {
      setBioEditing(false);
      setBioDraft(profile.bio || '');
      return;
    }

    setBioSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bio: next || null })
        .eq('id', profile.id);
      if (error) throw error;
      await refreshProfile();
      setBioEditing(false);
      toast.success(t('profile.bioSaved'));
    } catch (error) {
      console.error(error);
      toast.error(t('profile.bioSaveFailed'));
    } finally {
      setBioSaving(false);
    }
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !profile?.id || !profile.user_id) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('common.photoUploadInvalidType'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('common.photoUploadTooLarge'));
      return;
    }

    setUploadingAvatar(true);

    try {
      const { publicUrl } = await uploadProfileAvatar(file, profile.user_id);
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (error) {
        throw error;
      }

      await refreshProfile();
      toast.success(t('common.photoUpdated'));
      // fetchScoreInputs will refresh avatarUrl from the profiles row
      if (profile?.id) {
        const { data: avatarRow } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', profile.id)
          .maybeSingle();
        if (avatarRow?.avatar_url) setAvatarUrl(avatarRow.avatar_url);
      }
    } catch (error) {
      console.error('Error uploading profile avatar:', error);
      toast.error(t('common.photoUploadFailed'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const DIAL_CX = 250;
  const DIAL_CY = 250;
  /** Tight viewBox pad so the ring uses most of the square; page px-4 + max-w-lg keep side margin. */
  const VIEW_MIN = 58;
  const VIEW_SIZE = 384;
  /** Raised slightly to grow the photo/progress core; factor band stays mostly intact. */
  const RING_INNER = 118;
  const RING_OUTER = 186;
  const CORNER_INSET = 14;
  const CORNER_RADIUS = RING_OUTER - CORNER_INSET;
  const NAME_RADIUS = CORNER_RADIUS;
  const SEGMENT_GAP_DEG = 3;
  const CORNER_POCKET_DEG = (CORNER_INSET / CORNER_RADIUS) * (180 / Math.PI) + 5;

  const getCategoryNameFontSize = (name: string) => {
    if (name.length > 12) return 13.5;
    if (name.length > 9) return 14;
    return 15;
  };

  // Seat inside the bottom-left ring bounding corner (toward dial center), not outside it.
  const HINT_CORNER_INSET = 16;
  const hintLeftPct =
    ((DIAL_CX - RING_OUTER + HINT_CORNER_INSET - VIEW_MIN) / VIEW_SIZE) * 100;
  const hintTopPct =
    ((DIAL_CY + RING_OUTER - HINT_CORNER_INSET - VIEW_MIN) / VIEW_SIZE) * 100;

  const getCategoryAngle = (index: number, total: number) =>
    index * (360 / total) - 90 + rotationDeg;

  const getSegmentAngles = (index: number, total: number) => {
    const segmentAngle = 360 / total;
    const centerAngle = getCategoryAngle(index, total);
    const halfSegment = (segmentAngle - SEGMENT_GAP_DEG) / 2;
    return {
      centerAngle,
      startAngle: centerAngle - halfSegment,
      endAngle: centerAngle + halfSegment,
    };
  };

  const createArcPath = (index: number, total: number, innerRadius: number, outerRadius: number) => {
    const { startAngle, endAngle } = getSegmentAngles(index, total);
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = DIAL_CX + innerRadius * Math.cos(startRad);
    const y1 = DIAL_CY + innerRadius * Math.sin(startRad);
    const x2 = DIAL_CX + outerRadius * Math.cos(startRad);
    const y2 = DIAL_CY + outerRadius * Math.sin(startRad);
    const x3 = DIAL_CX + outerRadius * Math.cos(endRad);
    const y3 = DIAL_CY + outerRadius * Math.sin(endRad);
    const x4 = DIAL_CX + innerRadius * Math.cos(endRad);
    const y4 = DIAL_CY + innerRadius * Math.sin(endRad);

    return `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1}`;
  };

  const isBottomSegment = (centerAngle: number) => {
    const normalized = ((centerAngle % 360) + 360) % 360;
    return normalized > 20 && normalized < 160;
  };

  const viewPct = (value: number) => ((value - VIEW_MIN) / VIEW_SIZE) * 100;

  const getRingPoint = (angleDeg: number, radius: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: DIAL_CX + radius * Math.cos(rad),
      y: DIAL_CY + radius * Math.sin(rad),
    };
  };

  const getCornerSeat = (index: number, side: 'start' | 'end') => {
    const { startAngle, endAngle, centerAngle } = getSegmentAngles(index, SCORE_CATEGORIES.length);
    const angleInsetDeg = (CORNER_INSET / CORNER_RADIUS) * (180 / Math.PI);
    const angle = side === 'start' ? startAngle + angleInsetDeg : endAngle - angleInsetDeg;
    return {
      ...getRingPoint(angle, CORNER_RADIUS),
      angle,
      centerAngle,
    };
  };

  const pointerAngleFromEvent = useCallback((clientX: number, clientY: number) => {
    const el = dialRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  }, []);

  const snapRotation = (deg: number) => Math.round(deg / SEGMENT_STEP_DEG) * SEGMENT_STEP_DEG;

  const onDialPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-dial-avatar]')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startPointerAngle: pointerAngleFromEvent(event.clientX, event.clientY),
      startRotation: rotationDeg,
      moved: false,
    };
  };

  const onDialPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const angle = pointerAngleFromEvent(event.clientX, event.clientY);
    let delta = angle - drag.startPointerAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    if (Math.abs(delta) > 2) drag.moved = true;
    setRotationDeg(drag.startRotation + delta);
  };

  const resolveCategoryAtPointer = (clientX: number, clientY: number): ScoreCategoryId | null => {
    const pointerAngle = pointerAngleFromEvent(clientX, clientY);
    let bestId: ScoreCategoryId | null = null;
    let bestDist = Infinity;
    SCORE_CATEGORIES.forEach((category, index) => {
      const { centerAngle } = getSegmentAngles(index, SCORE_CATEGORIES.length);
      let dist = ((pointerAngle - centerAngle) % 360 + 360) % 360;
      if (dist > 180) dist = 360 - dist;
      if (dist < bestDist) {
        bestDist = dist;
        bestId = category.id;
      }
    });
    if (bestId == null || bestDist > SEGMENT_STEP_DEG / 2) return null;
    return bestId;
  };

  const activateCategory = (categoryId: ScoreCategoryId) => {
    setSelectedCategoryId(categoryId);
    setEducationPanelOpen(categoryId === 'learning');
    setTrainingPanelOpen(categoryId === 'learning');
    setSkillsPanelOpen(categoryId === 'skills');
    setContributionsPanelOpen(categoryId === 'contributions');
    setPerformancePanelOpen(categoryId === 'performance');
    setExperiencePanelOpen(categoryId === 'experience');
    requestAnimationFrame(() => {
      const targetId =
        categoryId === 'contributions'
          ? 'contributions-ledger-panel'
          : categoryId === 'performance'
            ? 'performance-ledger-panel'
            : categoryId === 'learning'
              ? 'learning-education-panel'
              : `score-category-card-${categoryId}`;
      document.getElementById(targetId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  };

  const toggleCategoryCard = (categoryId: ScoreCategoryId) => {
    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(null);
      setEducationPanelOpen(false);
      setTrainingPanelOpen(false);
      setSkillsPanelOpen(false);
      setContributionsPanelOpen(false);
      setPerformancePanelOpen(false);
      setExperiencePanelOpen(false);
      return;
    }
    activateCategory(categoryId);
  };

  const finishDialPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    const wasTap = !drag.moved;
    const { clientX, clientY } = event;
    setRotationDeg((current) => snapRotation(current));
    dragRef.current = null;

    if (wasTap) {
      const categoryId = resolveCategoryAtPointer(clientX, clientY);
      if (categoryId) {
        suppressNextClickRef.current = true;
        activateCategory(categoryId);
      }
    } else {
      suppressNextClickRef.current = true;
    }
  };

  const onCategoryActivate = (categoryId: ScoreCategoryId) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    activateCategory(categoryId);
  };

  const renderArcGlyphs = (
    text: string,
    index: number,
    radius: number,
    options: {
      fontSize: number;
      className: string;
      letterSpacingEm?: number;
      align?: 'center' | 'end';
      halo?: boolean;
    },
  ) => {
    const { centerAngle, startAngle, endAngle } = getSegmentAngles(index, SCORE_CATEGORIES.length);
    const flip = isBottomSegment(centerAngle);
    const chars = Array.from(text);
    if (chars.length === 0) return null;

    const letterSpacingEm = options.letterSpacingEm ?? (text.length > 10 ? 0.02 : 0.04);
    const advanceEm = 0.56 + letterSpacingEm;
    const edgePadDeg = text.length > 10 ? 2 : 3;
    const align = options.align ?? 'center';
    const segmentSpan = endAngle - startAngle;

    let fontSize = options.fontSize;
    let totalAngleDeg = ((chars.length * fontSize * advanceEm) / radius) * (180 / Math.PI);
    if (align === 'center') {
      const maxSpan = Math.max(20, segmentSpan - CORNER_POCKET_DEG * 2 - edgePadDeg * 2);
      if (totalAngleDeg > maxSpan) {
        fontSize = Math.max(
          12,
          (maxSpan * radius * Math.PI) / (180 * chars.length * advanceEm),
        );
        totalAngleDeg = ((chars.length * fontSize * advanceEm) / radius) * (180 / Math.PI);
      }
    }

    const step = totalAngleDeg / chars.length;
    let midAngle = centerAngle;
    if (align === 'end') {
      midAngle = getCornerSeat(index, 'end').angle;
    }

    return chars.map((char, charIndex) => {
      const angle = flip
        ? midAngle + totalAngleDeg / 2 - (charIndex + 0.5) * step
        : midAngle - totalAngleDeg / 2 + (charIndex + 0.5) * step;
      const { x, y } = getRingPoint(angle, radius);
      const rotation = flip ? angle - 90 : angle + 90;

      return (
        <text
          key={`${index}-${radius}-${align}-${charIndex}-${char}`}
          x={x}
          y={y}
          transform={`rotate(${rotation} ${x} ${y})`}
          textAnchor="middle"
          dominantBaseline="central"
          className={options.className}
          style={{
            fontSize,
            fontWeight: align === 'end' ? 700 : 650,
            ...(options.halo
              ? {
                  paintOrder: 'stroke fill' as const,
                  stroke: 'hsl(var(--background))',
                  strokeWidth: 3.5,
                  strokeLinejoin: 'round' as const,
                }
              : null),
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </text>
      );
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-pulse-soft text-muted-foreground">{t('profile.loading')}</div>
        </div>
      </AppLayout>
    );
  }

  const ring = ownProfileRingDisplay(score);
  const overallRingProgress = ring.progress;
  const overallPercentLabel = ring.centerLabel;
  /** Outer frame for the photo progress ring (px). ~11% larger; factor band loses little height. */
  const dialRingSize = 176;
  const dialRingStroke = 19;
  const dialRingCx = dialRingSize / 2;
  const dialRingCy = dialRingSize / 2;
  const dialRingRadius = (dialRingSize - dialRingStroke) / 2 - 1;
  const dialRingCircumference = 2 * Math.PI * dialRingRadius;
  /**
   * Percent sits at the tip of the filled arc (full 360°).
   * From 45°–275° clockwise from top, keep text upright for reading;
   * on the top wedge, follow the arc tangent.
   */
  const tipProgress = Math.min(1, Math.max(overallRingProgress, overallRingProgress > 0 ? 0.01 : 0));
  const percentArcAngle = -Math.PI / 2 + tipProgress * 2 * Math.PI;
  const percentLabelX = dialRingCx + dialRingRadius * Math.cos(percentArcAngle);
  const percentLabelY = dialRingCy + dialRingRadius * Math.sin(percentArcAngle);
  const clockwiseFromTopDeg = (tipProgress * 360) % 360;
  const percentUpright = clockwiseFromTopDeg >= 45 && clockwiseFromTopDeg <= 275;
  const percentLabelRotateDeg = percentUpright
    ? 0
    : (percentArcAngle * 180) / Math.PI + 90;
  const percentFontSize = Math.round(dialRingStroke * 0.58);
  const tierColor = getTierColorHex(score.tier.finalTier ?? 'explorer');
  const percentFill = tierColor.toUpperCase() === '#D9A441' ? '#1C1917' : '#FFFFFF';

  return (
    <AppLayout>
      <div className="flex min-h-[calc(100vh-80px)] flex-col items-center px-4 py-6">
        <ScoreOverview score={score} />

        <motion.div
          ref={dialRef}
          className="relative mt-4 flex aspect-square w-full max-w-lg touch-none select-none items-center justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          onPointerDown={onDialPointerDown}
          onPointerMove={onDialPointerMove}
          onPointerUp={finishDialPointer}
          onPointerCancel={finishDialPointer}
          role="group"
          aria-label={t('score.categoriesHeading')}
        >
          <svg
            className="absolute inset-0 z-0 h-full w-full"
            viewBox={`${VIEW_MIN} ${VIEW_MIN} ${VIEW_SIZE} ${VIEW_SIZE}`}
            aria-hidden
          >
            {SCORE_CATEGORIES.map((category, index) => {
              const selected = selectedCategoryId === category.id;
              return (
                <motion.path
                  key={category.id}
                  d={createArcPath(index, SCORE_CATEGORIES.length, RING_INNER, RING_OUTER)}
                  className={`cursor-grab stroke-border/50 transition-colors active:cursor-grabbing ${
                    selected ? 'fill-primary/20' : 'fill-muted/30 hover:fill-muted/45'
                  }`}
                  strokeWidth="1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.08, duration: 0.4 }}
                  onClick={() => onCategoryActivate(category.id)}
                />
              );
            })}
            <circle
              cx={DIAL_CX}
              cy={DIAL_CY}
              r={RING_OUTER}
              fill="none"
              strokeWidth="1"
              className="pointer-events-none stroke-border/30"
            />
          </svg>

          {SCORE_CATEGORIES.map((category, index) => {
            const seat = getCornerSeat(index, 'start');
            const Icon = iconMap[category.icon];
            const name = category.shortLabel;
            const nameSize = getCategoryNameFontSize(name);
            const iconGlyphPct = ((nameSize * 1.2) / VIEW_SIZE) * 100;
            const iconButtonPct = ((nameSize * 2.15) / VIEW_SIZE) * 100;
            const categoryScore = score.categories.find((c) => c.id === category.id);

            return (
              <button
                key={`bg-icon-${category.id}`}
                type="button"
                className="absolute z-1 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  left: `${viewPct(seat.x)}%`,
                  top: `${viewPct(seat.y)}%`,
                  width: `${iconButtonPct}%`,
                  height: `${iconButtonPct}%`,
                  backgroundColor: `hsl(var(--${category.colorClass}) / 0.22)`,
                }}
                onClick={() => onCategoryActivate(category.id)}
                aria-label={t('score.categoryAria', {
                  name,
                  score:
                    categoryScore?.score == null
                      ? t('score.notYetScored')
                      : `${formatScoreValue(categoryScore.score)} out of 100`,
                  confidence: t(`score.confidence.${categoryScore?.confidence ?? 'insufficient'}`),
                })}
                aria-pressed={selectedCategoryId === category.id}
              >
                <Icon
                  style={{
                    width: `${(iconGlyphPct / iconButtonPct) * 100}%`,
                    height: `${(iconGlyphPct / iconButtonPct) * 100}%`,
                    color: `hsl(var(--${category.colorClass}) / 0.6)`,
                  }}
                  strokeWidth={2}
                />
              </button>
            );
          })}

          <svg
            className="pointer-events-none absolute inset-0 z-2 h-full w-full"
            viewBox={`${VIEW_MIN} ${VIEW_MIN} ${VIEW_SIZE} ${VIEW_SIZE}`}
            aria-hidden
          >
            {SCORE_CATEGORIES.map((category, index) => {
              const categoryScore = score.categories.find((c) => c.id === category.id);
              const scoreText =
                categoryScore?.score != null ? formatScore(categoryScore.score) : '—';
              const name = category.shortLabel;
              const nameSize = getCategoryNameFontSize(name);

              return (
                <motion.g
                  key={`label-${category.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.08, duration: 0.35 }}
                >
                  {renderArcGlyphs(name, index, NAME_RADIUS, {
                    fontSize: nameSize,
                    className: 'fill-foreground',
                    letterSpacingEm: 0.02,
                    align: 'center',
                    halo: true,
                  })}
                  {renderArcGlyphs(scoreText, index, CORNER_RADIUS, {
                    fontSize: Math.max(10, nameSize - 2),
                    className: 'fill-muted-foreground',
                    letterSpacingEm: 0.05,
                    align: 'end',
                    halo: true,
                  })}
                </motion.g>
              );
            })}
          </svg>

          <div
            data-dial-avatar
            className="pointer-events-none absolute inset-0 z-3 flex items-center justify-center"
          >
            <div
              className="group/avatar relative pointer-events-auto"
              style={{ width: dialRingSize, height: dialRingSize }}
            >
              <svg
                className="absolute inset-0"
                width={dialRingSize}
                height={dialRingSize}
                viewBox={`0 0 ${dialRingSize} ${dialRingSize}`}
                aria-hidden
              >
                <circle
                  cx={dialRingCx}
                  cy={dialRingCy}
                  r={dialRingRadius}
                  fill="none"
                  strokeWidth={dialRingStroke + 4}
                  className="stroke-background"
                />
                {/* Uniform track — tier sections are marked by separators only (not colored band fills). */}
                <circle
                  cx={dialRingCx}
                  cy={dialRingCy}
                  r={dialRingRadius}
                  fill="none"
                  strokeWidth={dialRingStroke}
                  className="stroke-muted/45"
                />
                <g transform={`rotate(-90 ${dialRingCx} ${dialRingCy})`}>
                  <motion.circle
                    cx={dialRingCx}
                    cy={dialRingCy}
                    r={dialRingRadius}
                    fill="none"
                    stroke={ring.presentation === 'provisional' ? 'hsl(var(--muted-foreground) / 0.55)' : tierColor}
                    strokeWidth={dialRingStroke}
                    strokeLinecap="butt"
                    style={{ strokeDasharray: dialRingCircumference }}
                    initial={{ strokeDashoffset: dialRingCircumference }}
                    animate={{
                      strokeDashoffset:
                        dialRingCircumference - overallRingProgress * dialRingCircumference,
                    }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                  />
                </g>
                {/* Slim tier separators (30/60/75/85) — knockout + tier color */}
                {TIER_RING_SEPARATORS.map((mark) => {
                  const angle = -Math.PI / 2 + (mark.atPercent / 100) * 2 * Math.PI;
                  const half = dialRingStroke / 2 + 0.5;
                  const cos = Math.cos(angle);
                  const sin = Math.sin(angle);
                  const x1 = dialRingCx + (dialRingRadius - half) * cos;
                  const y1 = dialRingCy + (dialRingRadius - half) * sin;
                  const x2 = dialRingCx + (dialRingRadius + half) * cos;
                  const y2 = dialRingCy + (dialRingRadius + half) * sin;
                  return (
                    <g key={`sep-${mark.tier}`}>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        className="stroke-background"
                        strokeWidth={3.25}
                        strokeLinecap="round"
                      />
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={getTierColorHex(mark.tier)}
                        strokeWidth={1.75}
                        strokeLinecap="round"
                      />
                    </g>
                  );
                })}
                <text
                  x={percentLabelX}
                  y={percentLabelY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(${percentLabelRotateDeg} ${percentLabelX} ${percentLabelY})`}
                  fill={ring.presentation === 'provisional' ? 'hsl(var(--muted-foreground))' : percentFill}
                  style={{
                    fontSize: percentFontSize,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {overallPercentLabel}
                </text>
              </svg>

              <button
                type="button"
                onClick={handleAvatarUploadClick}
                className="absolute left-1/2 top-1/2 z-4 h-34 w-34 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={uploadingAvatar}
                aria-label={t('common.changePhoto')}
              >
                {avatarUrl ? (
                  <img
                    key={avatarUrl}
                    src={avatarUrl}
                    alt={profile?.full_name || t('common.anonymousUser')}
                    className="h-full w-full rounded-full border-4 border-background object-cover shadow-elevated"
                    referrerPolicy="no-referrer"
                    decoding="async"
                  />
                ) : (
                  <Avatar className="h-full w-full border-4 border-background shadow-elevated">
                    <AvatarFallback className="bg-primary/10 font-display text-2xl text-primary">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span
                  className={`absolute inset-0 flex items-center justify-center rounded-full bg-background/70 transition-opacity ${
                    uploadingAvatar
                      ? 'opacity-100'
                      : 'opacity-0 group-hover/avatar:opacity-100 group-focus-within/avatar:opacity-100'
                  }`}
                  aria-hidden
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  ) : (
                    <Camera className="h-7 w-7 text-primary" strokeWidth={2} />
                  )}
                </span>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />

              <span className="sr-only">
                {ring.presentation === 'provisional'
                  ? `${t('score.estimateLabel')} ${ring.centerLabel}`
                  : overallPercentLabel}
              </span>
              {ring.presentation === 'provisional' ? (
                <span className="pointer-events-none absolute bottom-1 left-1/2 z-5 -translate-x-1/2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('score.estimateLabel')}
                </span>
              ) : null}
            </div>
          </div>

          <HoverCard openDelay={180} closeDelay={120}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                className="absolute z-20 inline-flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-card/80 text-primary shadow-soft transition-colors hover:bg-muted/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ left: `${hintLeftPct}%`, top: `${hintTopPct}%` }}
                aria-label={t('profile.dialRotateHint')}
                title={t('profile.dialRotateHint')}
                onClick={(event) => {
                  event.stopPropagation();
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
              >
                <Info className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
              </button>
            </HoverCardTrigger>
            <HoverCardContent
              align="start"
              side="top"
              className="w-64 p-3 text-left text-xs leading-relaxed text-muted-foreground"
            >
              {t('profile.dialRotateHint')}
            </HoverCardContent>
          </HoverCard>
        </motion.div>

        <div className="mt-6 flex w-full max-w-xs flex-col items-center gap-3">
          {bioEditing ? (
            <div className="w-full space-y-2">
              <Textarea
                ref={bioTextareaRef}
                value={bioDraft}
                onChange={(event) => setBioDraft(event.target.value.slice(0, 300))}
                onBlur={() => {
                  void saveBio();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setBioDraft(profile?.bio || '');
                    setBioEditing(false);
                  }
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    event.preventDefault();
                    void saveBio();
                  }
                }}
                rows={3}
                maxLength={300}
                disabled={bioSaving}
                placeholder={t('editProfile.bioPlaceholder')}
                aria-label={t('editProfile.bio')}
                className="resize-none text-center text-sm"
              />
              <p className="text-center text-xs text-muted-foreground">
                {bioDraft.length}/300
                {bioSaving ? ` · ${t('common.saving')}` : null}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={startBioEdit}
              className={cn(
                'group/bio relative w-full rounded-lg px-2 py-1.5 text-center text-sm transition-colors',
                'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                profile?.bio ? 'text-muted-foreground' : 'text-muted-foreground/70 italic',
              )}
              aria-label={profile?.bio ? t('profile.editBio') : t('profile.addBio')}
            >
              <span className="pr-5">
                {profile?.bio?.trim() ? profile.bio : t('profile.addBio')}
              </span>
              <Pencil
                className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover/bio:opacity-100 group-focus-visible/bio:opacity-100"
                aria-hidden
              />
            </button>
          )}

          <div className="flex items-center justify-center gap-1.5 text-center">
            <p className="text-sm text-muted-foreground">
              {profile?.full_name || t('common.anonymousUser')}
              {profile?.username ? ` · @${profile.username}` : ''}
            </p>
            {profile?.is_verified ? (
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                title={t('profile.verifiedMember')}
                aria-label={t('profile.verifiedMember')}
              >
                <CheckCircle className="h-3.5 w-3.5" aria-hidden />
              </span>
            ) : null}
          </div>
        </div>

        {profile?.id ? (
          <motion.div
            className={`mt-6 w-full max-w-md overflow-visible ${educationPanelOpen ? '' : 'hidden'}`}
            initial={false}
            animate={
              educationPanelOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }
            }
            transition={{ duration: 0.25 }}
          >
            <EducationDetailsDialog
              open={educationPanelOpen}
              onOpenChange={setEducationPanelOpen}
              onSaved={() => {
                void fetchScoreInputs();
              }}
              profileId={profile.id}
              defaults={{
                countryCode: profile.country_code,
                regionCode: profile.region_code,
                city: profile.city,
              }}
            />
          </motion.div>
        ) : null}

        {profile?.id ? (
          <motion.div
            className={`mt-3 w-full max-w-md overflow-visible ${trainingPanelOpen ? '' : 'hidden'}`}
            initial={false}
            animate={
              trainingPanelOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }
            }
            transition={{ duration: 0.25 }}
          >
            <TrainingDetailsDialog
              open={trainingPanelOpen}
              onOpenChange={setTrainingPanelOpen}
              onSaved={() => {
                void fetchScoreInputs();
              }}
              profileId={profile.id}
            />
          </motion.div>
        ) : null}

        {profile?.id ? (
          <motion.div
            className={`mt-6 w-full max-w-md overflow-visible ${skillsPanelOpen ? '' : 'hidden'}`}
            initial={false}
            animate={
              skillsPanelOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }
            }
            transition={{ duration: 0.25 }}
          >
            <SkillsDetailsDialog
              open={skillsPanelOpen}
              onOpenChange={setSkillsPanelOpen}
              onSaved={() => {
                void fetchScoreInputs();
              }}
              profileId={profile.id}
            />
          </motion.div>
        ) : null}

        {profile?.id ? (
          <motion.div
            className={`mt-6 w-full max-w-md overflow-visible ${experiencePanelOpen ? '' : 'hidden'}`}
            initial={false}
            animate={
              experiencePanelOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }
            }
            transition={{ duration: 0.25 }}
          >
            <ExperienceDetailsDialog
              open={experiencePanelOpen}
              onOpenChange={setExperiencePanelOpen}
              onSaved={() => {
                void fetchScoreInputs();
              }}
              profileId={profile.id}
            />
          </motion.div>
        ) : null}

        {profile?.id ? (
          <motion.div
            className={`mt-6 w-full max-w-md overflow-visible ${contributionsPanelOpen ? '' : 'hidden'}`}
            initial={false}
            animate={
              contributionsPanelOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }
            }
            transition={{ duration: 0.25 }}
          >
            <ContributionsDetailsPanel
              open={contributionsPanelOpen}
              onOpenChange={(next) => {
                setContributionsPanelOpen(next);
                if (!next && selectedCategoryId === 'contributions') {
                  setSelectedCategoryId(null);
                }
              }}
              events={contributionEvents}
              categoryInput={contributionInput}
              syncing={contributionsSyncing}
              ledgerHref="/profile/contributions"
            />
          </motion.div>
        ) : null}

        {profile?.id ? (
          <motion.div
            className={`mt-6 w-full max-w-md overflow-visible ${performancePanelOpen ? '' : 'hidden'}`}
            initial={false}
            animate={
              performancePanelOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }
            }
            transition={{ duration: 0.25 }}
          >
            <PerformanceDetailsPanel
              open={performancePanelOpen}
              onOpenChange={(next) => {
                setPerformancePanelOpen(next);
                if (!next && selectedCategoryId === 'performance') {
                  setSelectedCategoryId(null);
                }
              }}
              activities={performanceActivities}
              categoryInput={performanceInput}
              subjectProfileId={profile.id}
              viewerProfileId={profile.id}
              allowRating={false}
              syncing={contributionsSyncing}
            />
          </motion.div>
        ) : null}

        <div className="mt-10 flex w-full max-w-lg flex-col items-stretch gap-8 pb-10 lg:max-w-5xl lg:grid lg:grid-cols-2 lg:gap-8">
          <div className="space-y-8 lg:col-span-2">
            <ScoreCategoryCards
              categories={score.categories}
              selectedId={selectedCategoryId}
              onSelect={toggleCategoryCard}
            />
          </div>
          <ScoreMetricBreakdown category={selectedCategory} />
          <ScoreEvidenceValidation score={score} />
          <ScoreHistorySection items={score.history} />
          <ScoreNextSteps score={score} />
          <div className="lg:col-span-2">
            <ActivityByDomainSection pillarScores={pillarScore.pillars} />
          </div>
          <div className="space-y-8 lg:col-span-2">
            <TierProgressSection score={score} />
          </div>
        </div>

        {/* Keep category order reference for screen readers */}
        <ol className="sr-only">
          {SCORE_CATEGORY_ORDER.map((id) => (
            <li key={id}>{SCORE_CATEGORIES.find((c) => c.id === id)?.shortLabel}</li>
          ))}
        </ol>
        {/* Domains remain available for endorsement flow */}
        <div className="sr-only">
          {PILLARS.map((pillar) => (
            <span key={pillar.id}>{pillar.name}</span>
          ))}
        </div>
        <Button className="sr-only" onClick={() => navigate('/search?tab=people')}>
          {t('score.requestEndorsement')}
        </Button>
      </div>
    </AppLayout>
  );
}
