import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { CivizenScore } from '@/components/ui/CivizenScore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { type PillarId } from '@/lib/constants';
import { calculateCivizenScore, type Endorsement } from '@/lib/scoring';
import { buildScoreFromProfileActivity, formatScoreValue, type CategoryScoreInput } from '@/lib/civizen-score';
import { scorePublicSubtitle } from '@/lib/civizen-score-caption';
import { ownProfileRingDisplay } from '@/lib/civizen-score-ring-display';
import { countSkillsFromEntry, declaredSkillNamesFromEntry } from '@/lib/profile-skills';
import { countTrainingsFromEntry } from '@/lib/profile-trainings';
import { parseExperienceEntries, cumulativeExperienceMonths } from '@/lib/profile-experience';
import {
  demonstratedProjectsFromContributionEvents,
  demonstratedSkillsFromContributionEvents,
  loadContributionEvents,
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
import { PerformanceDetailsPanel } from '@/components/profile/PerformanceDetailsPanel';
import { UserProfileActions } from '@/components/profile/UserProfileActions';
import { useAuth } from '@/contexts/AuthContext';
import { EndorsementPillarGrid } from '@/pages/user-profile/EndorsementPillarGrid';
import { StudyCompletionBadges } from '@/pages/user-profile/StudyCompletionBadges';
import { usePublicProfileVisibility } from '@/pages/user-profile/public-profile-visibility';
import { CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { profile: currentProfile } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [educationCount, setEducationCount] = useState(0);
  const [verifiedEducationCount, setVerifiedEducationCount] = useState(0);
  const [educationLevels, setEducationLevels] = useState<string[]>([]);
  const [trainingCount, setTrainingCount] = useState(0);
  const [skillCount, setSkillCount] = useState(0);
  const [declaredSkillNames, setDeclaredSkillNames] = useState<string[]>([]);
  const [experienceCount, setExperienceCount] = useState(0);
  const [experienceMonths, setExperienceMonths] = useState(0);
  const [contributionInput, setContributionInput] = useState<CategoryScoreInput | null>(null);
  const [performanceInput, setPerformanceInput] = useState<CategoryScoreInput | null>(null);
  const [performanceActivities, setPerformanceActivities] = useState<PerformanceActivity[]>([]);
  const [contributionEvents, setContributionEvents] = useState<ContributionEvent[]>([]);
  const [performancePanelOpen, setPerformancePanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      void fetchProfile();
    }
  }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profileError && profileData) {
      setProfile(profileData);
    }

    const [{ data: endorsementData }, { data: educationData }, { data: trainingData }, { data: skillsData }, { data: experienceData }] =
      await Promise.all([
      supabase
        .from('endorsements')
        .select('*')
        .eq('endorsed_id', userId)
        .eq('is_hidden', false),
      supabase
        .from('profile_education_entries')
        .select('id, education_level, verification_status')
        .eq('profile_id', userId),
      supabase
        .from('profile_training_entries')
        .select('training_names')
        .eq('profile_id', userId)
        .maybeSingle(),
      supabase
        .from('profile_skills_entries')
        .select('hard_skill_names, soft_skill_names, skill_names')
        .eq('profile_id', userId)
        .maybeSingle(),
      supabase
        .from('profile_experience_entries')
        .select('experiences')
        .eq('profile_id', userId)
        .maybeSingle(),
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

    try {
      const isOwn = currentProfile?.id === userId;
      const applyEvents = (events: ContributionEvent[]) => {
        setContributionEvents(events);
        setContributionInput(scoreContributionsFromEvents(events));
        void loadPerformanceRatings(userId).then((ratings) => {
          const activities = buildPerformanceActivities(events, ratings, currentProfile?.id);
          setPerformanceActivities(activities);
          setPerformanceInput(scorePerformanceFromActivities(activities));
        });
      };

      const events = isOwn
        ? await loadContributionEventsThenSync(
            userId,
            currentProfile?.user_id ?? profileData?.user_id,
            supabase,
            applyEvents,
          )
        : await loadContributionEvents(userId);
      setContributionEvents(events);
      setContributionInput(scoreContributionsFromEvents(events));
      const ratings = await loadPerformanceRatings(userId);
      const activities = buildPerformanceActivities(events, ratings, currentProfile?.id);
      setPerformanceActivities(activities);
      setPerformanceInput(scorePerformanceFromActivities(activities));
    } catch (error) {
      console.error('Contribution load failed', error);
    }

    setLoading(false);
  };

  const refreshPerformance = async () => {
    if (!userId) return;
    const ratings = await loadPerformanceRatings(userId);
    const activities = buildPerformanceActivities(contributionEvents, ratings, currentProfile?.id);
    setPerformanceActivities(activities);
    setPerformanceInput(scorePerformanceFromActivities(activities));
  };

  const pillarScore = useMemo(() => calculateCivizenScore(endorsements), [endorsements]);
  const score = useMemo(
    () =>
      buildScoreFromProfileActivity({
        userId,
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
      userId,
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
  const visibility = usePublicProfileVisibility({ userId, isOwn: currentProfile?.id === userId, score, ready: !loading });
  const displayScore = visibility.score ?? score;

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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

  if (!profile) {
    return (
      <AppLayout>
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <p className="mb-4 text-muted-foreground">{t('userProfile.userNotFound')}</p>
          <Button onClick={() => navigate(-1)}>{t('userProfile.back')}</Button>
        </div>
      </AppLayout>
    );
  }

  const ownRing = currentProfile?.id === profile.id ? ownProfileRingDisplay(displayScore) : null;

  return (
    <AppLayout>
      <div className="space-y-6 px-4 py-6">
        <AppPageHeader
          title={profile.full_name || t('common.anonymousUser')}
          fallbackPath="/search"
        />

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="relative mb-4 inline-block">
            <Avatar className="h-24 w-24 border-4 border-background shadow-elevated">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 font-display text-2xl text-primary">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            {profile.is_verified && (
              <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-background bg-primary">
                <CheckCircle className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>

          {profile.username && <p className="text-muted-foreground">@{profile.username}</p>}
          {profile.bio && (
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{profile.bio}</p>
          )}

          {currentProfile && currentProfile.id !== profile.id && (
            <UserProfileActions
              viewerProfileId={currentProfile.id}
              profileId={profile.id}
              profileName={profile.full_name || profile.username || ''}
            />
          )}
        </motion.div>

        {visibility.showScore ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center"
        >
          <Card className="border-border/50 bg-card p-6 shadow-soft">
            <CivizenScore
              score={ownRing ? ownRing.value : displayScore.overall.score}
              size="lg"
              tier={displayScore.tier.finalTier}
              emptyLabel="—"
              presentation={ownRing?.presentation === 'provisional' ? 'provisional' : 'established'}
              centerCaption={ownRing?.presentation === 'provisional' ? t('score.estimateLabel') : null}
            />
            {displayScore.tier.finalTier ? (
              <p className="mt-2 text-center text-sm font-semibold uppercase tracking-wide text-primary">
                {t(`displayScore.tier.${displayScore.tier.finalTier}`)}
              </p>
            ) : null}
            <p className="mt-2 text-center text-sm text-muted-foreground">{scorePublicSubtitle(displayScore, t)}</p>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {displayScore.validation.verifiedEvidenceCount > 0
                ? t('userProfile.basedOnVerified', {
                    count: displayScore.validation.verifiedEvidenceCount,
                  })
                : t('score.addActivityHint')}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              {displayScore.categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className="flex justify-between gap-2 rounded-md bg-muted/30 px-2 py-1 text-left transition-colors hover:bg-muted/50"
                  onClick={() => {
                    if (category.id === 'performance') {
                      setPerformancePanelOpen(true);
                    }
                    if (category.id === 'contributions' && profile?.id) {
                      navigate(`/user/${profile.id}/contributions`);
                    }
                  }}
                >
                  <span className="text-muted-foreground">{category.shortLabel}</span>
                  <span className="font-medium">{formatScoreValue(category.score)}</span>
                </button>
              ))}
            </div>
          </Card>
        </motion.div>
        ) : null}

        {profile && visibility.showScore ? (
          <PerformanceDetailsPanel
            open={performancePanelOpen}
            onOpenChange={setPerformancePanelOpen}
            activities={performanceActivities}
            categoryInput={performanceInput}
            subjectProfileId={profile.id}
            viewerProfileId={currentProfile?.id}
            allowRating={Boolean(currentProfile && currentProfile.id !== profile.id)}
            onRated={() => {
              void refreshPerformance();
            }}
          />
        ) : null}

        {visibility.showEndorsements ? <EndorsementPillarGrid title={t('userProfile.domains')} pillarScore={pillarScore} /> : null}
        <StudyCompletionBadges profileId={profile.id} />
      </div>
    </AppLayout>
  );
}
