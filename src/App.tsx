import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense, useEffect, useState } from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { PageSecondaryNavProvider } from "@/contexts/PageSecondaryNavContext";
import { ThemeStorageSync } from "@/components/app/ThemeStorageSync";
import { AppCrashBoundary } from "@/components/app/AppCrashBoundary";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PublicCiviHost } from "@/components/public/PublicCiviHost";
import { permissionListHas } from "@/lib/access-control";
import { resolveAuthReturnPath } from "@/lib/auth-return-path";
import { lazyWithChunkReload } from "@/lib/lazy-with-chunk-reload";
import { happinessAppRoutes } from "@/pages/happiness/happiness-app-routes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

// Pages (lazy-loaded to keep bundle sizes small). lazyWithChunkReload auto-recovers
// when a deploy removes hashed chunks the open tab still references.
const AppUpdatePrompt = lazyWithChunkReload(() => import('@/components/app/AppUpdatePrompt').then((module) => ({ default: module.AppUpdatePrompt })));
const BuildOverlay = lazyWithChunkReload(() => import('@/components/layout/BuildOverlay').then((module) => ({ default: module.BuildOverlay })));
const Onboarding = lazyWithChunkReload(() => import('@/pages/Onboarding'));
const Login = lazyWithChunkReload(() => import('@/pages/auth/Login'));
const SignUp = lazyWithChunkReload(() => import('@/pages/auth/SignUp'));
const ForgotPassword = lazyWithChunkReload(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazyWithChunkReload(() => import('@/pages/auth/ResetPassword'));
const Contribute = lazyWithChunkReload(() => import('@/pages/Contribute'));
const ContributeLane = lazyWithChunkReload(() => import('@/pages/ContributeLane'));
const ProfessionalOpportunities = lazyWithChunkReload(
  () => import('@/pages/contribute/ProfessionalOpportunities'),
);
const OpportunityDetail = lazyWithChunkReload(() => import('@/pages/contribute/OpportunityDetail'));
const OpportunityForm = lazyWithChunkReload(() => import('@/pages/contribute/OpportunityForm'));
const CommunityChallenges = lazyWithChunkReload(() => import('@/pages/contribute/CommunityChallenges'));
const ChallengeForm = lazyWithChunkReload(() => import('@/pages/contribute/ChallengeForm'));
const ChallengeDetail = lazyWithChunkReload(() => import('@/pages/contribute/ChallengeDetail'));
const KnowledgeSpaces = lazyWithChunkReload(() => import('@/pages/contribute/KnowledgeSpaces'));
const KnowledgeSpaceForm = lazyWithChunkReload(() => import('@/pages/contribute/KnowledgeSpaceForm'));
const KnowledgeSpaceDetail = lazyWithChunkReload(() => import('@/pages/contribute/KnowledgeSpaceDetail'));
const KnowledgeResourceForm = lazyWithChunkReload(() => import('@/pages/contribute/KnowledgeResourceForm'));
const KnowledgeResourceDetail = lazyWithChunkReload(() => import('@/pages/contribute/KnowledgeResourceDetail'));
const ContributeImpact = lazyWithChunkReload(() => import('@/pages/contribute/ContributeImpact'));
const Matters = lazyWithChunkReload(() => import('@/pages/contribute/Matters'));
const MatterForm = lazyWithChunkReload(() => import('@/pages/contribute/MatterForm'));
const MatterDetail = lazyWithChunkReload(() => import('@/pages/contribute/MatterDetail'));
const Messaging = lazyWithChunkReload(() => import('@/pages/Messaging'));
const DownloadPage = lazyWithChunkReload(() => import('@/pages/Download'));
const WhyThisExists = lazyWithChunkReload(() => import('@/pages/WhyThisExists'));
const Areas = lazyWithChunkReload(() => import('@/pages/Areas'));
const AreaDetail = lazyWithChunkReload(() => import('@/pages/AreaDetail'));
const FundHub = lazyWithChunkReload(() => import('@/pages/fund/FundHub'));
const FundSupport = lazyWithChunkReload(() => import('@/pages/fund/FundSupport'));
const FundInvest = lazyWithChunkReload(() => import('@/pages/fund/FundInvest'));
const FundInstitutional = lazyWithChunkReload(() => import('@/pages/fund/FundInstitutional'));
const FundContribute = lazyWithChunkReload(() => import('@/pages/fund/FundContribute'));
const FundTransparency = lazyWithChunkReload(() => import('@/pages/fund/FundTransparency'));
const FundProjectFinance = lazyWithChunkReload(() => import('@/pages/fund/FundProjectFinance'));
const PublicDocumentsIndex = lazyWithChunkReload(() => import('@/pages/institutional/PublicDocumentsIndex'));
const InstitutionalDocRoute = lazyWithChunkReload(() => import('@/pages/institutional/InstitutionalDocRoute'));
const Features = lazyWithChunkReload(() => import('@/pages/Features'));
const StudyLayout = lazyWithChunkReload(() => import('@/pages/StudyLayout'));
const StudyCivicLearning = lazyWithChunkReload(() => import('@/pages/study/StudyCivicLearning'));
const StudySpecialists = lazyWithChunkReload(() => import('@/pages/study/StudySpecialists'));
const StudyCourses = lazyWithChunkReload(() => import('@/pages/study/StudyCourses'));
const StudySchedules = lazyWithChunkReload(() => import('@/pages/study/StudySchedules'));
const StudyMaterials = lazyWithChunkReload(() => import('@/pages/study/StudyMaterials'));
const StudyTests = lazyWithChunkReload(() => import('@/pages/study/StudyTests'));
const Governance = lazyWithChunkReload(() => import('@/pages/Governance'));
const PublicGovernanceLanding = lazyWithChunkReload(() => import('@/pages/governance/PublicGovernanceLanding'));
const CivicVotingHub = lazyWithChunkReload(() => import('@/pages/governance/CivicVotingHub'));
const CivicVotingProposal = lazyWithChunkReload(() => import('@/pages/governance/CivicVotingProposal'));
const CivicVotingElection = lazyWithChunkReload(() => import('@/pages/governance/CivicVotingElection'));
const CivicVotingObserver = lazyWithChunkReload(() => import('@/pages/governance/CivicVotingObserver'));
const SolutionsHub = lazyWithChunkReload(() => import('@/pages/governance/SolutionsHub'));
const SolutionProblemDetail = lazyWithChunkReload(() => import('@/pages/governance/SolutionProblemDetail'));
const Home = lazyWithChunkReload(() => import('@/pages/Home'));
const Law = lazyWithChunkReload(() => import('@/pages/Law'));
const Market = lazyWithChunkReload(() => import('@/pages/Market'));
const MarketTaxonomy = lazyWithChunkReload(() => import('@/pages/MarketTaxonomy'));
const Agreements = lazyWithChunkReload(() => import('@/pages/Agreements'));
const AgreementCreate = lazyWithChunkReload(() => import('@/pages/AgreementCreate'));
const AgreementDetail = lazyWithChunkReload(() => import('@/pages/AgreementDetail'));
const Earnings = lazyWithChunkReload(() => import('@/pages/Earnings'));
const TermsOfUse = lazyWithChunkReload(() => import('@/pages/TermsOfUse'));
const Search = lazyWithChunkReload(() => import('@/pages/Search'));
const Profile = lazyWithChunkReload(() => import('@/pages/Profile'));
const ContributionsLedger = lazyWithChunkReload(() => import('@/pages/profile/ContributionsLedger'));
const UserProfile = lazyWithChunkReload(() => import('@/pages/UserProfile'));
const EndorseFlow = lazyWithChunkReload(() => import('@/pages/EndorseFlow'));
const Settings = lazyWithChunkReload(() => import('@/pages/Settings'));
const EditProfile = lazyWithChunkReload(() => import('@/pages/settings/EditProfile'));
const Pillars = lazyWithChunkReload(() => import('@/pages/settings/Pillars'));
const Professions = lazyWithChunkReload(() => import('@/pages/settings/Professions'));
const RolesAdmin = lazyWithChunkReload(() => import('@/pages/settings/RolesAdmin'));
const UsersAdmin = lazyWithChunkReload(() => import('@/pages/settings/UsersAdmin'));
const PermissionsAdmin = lazyWithChunkReload(() => import('@/pages/settings/PermissionsAdmin'));
const GovernanceAdmin = lazyWithChunkReload(() => import('@/pages/settings/GovernanceAdmin'));
const LumaCreditsAdmin = lazyWithChunkReload(() => import('@/pages/settings/LumaCreditsAdmin'));
const FundingAdmin = lazyWithChunkReload(() => import('@/pages/settings/FundingAdmin'));
const DevEconomicsVisual = import.meta.env.DEV
  ? lazyWithChunkReload(() => import('@/pages/dev/DevEconomicsVisual'))
  : null;
const WalletPage = lazyWithChunkReload(() => import('@/pages/settings/PrototypeCredits'));
const TaxonomySettings = lazyWithChunkReload(() => import('@/pages/settings/Taxonomy'));
const MessagingSettingsPage = lazyWithChunkReload(() => import('@/pages/settings/MessagingSettings'));
const MessagingSecurity = lazyWithChunkReload(() => import('@/pages/settings/MessagingSecurity'));
const PrivacySettings = lazyWithChunkReload(() => import('@/pages/settings/PrivacySettings'));
const AiAgentSettings = lazyWithChunkReload(() => import('@/pages/settings/AiAgentSettings'));
const SocialAccountsSettings = lazyWithChunkReload(() => import('@/pages/settings/SocialAccountsSettings'));
const NotFound = lazyWithChunkReload(() => import('@/pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});
const BUILD_OVERLAY_STORAGE_KEY = 'civizen-build-overlay-enabled-v1';

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={resolveAuthReturnPath(location.state)} replace />;
  }

  return <>{children}</>;
}

function RouteFallback() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse-soft text-muted-foreground">{t('common.loading')}</div>
    </div>
  );
}

function scheduleAfterIdle(callback: () => void, fallbackDelay = 1200) {
  if (typeof window === 'undefined') return () => undefined;

  if ('requestIdleCallback' in window) {
    const idleId = window.requestIdleCallback(callback, { timeout: fallbackDelay });
    return () => window.cancelIdleCallback(idleId);
  }

  const timeoutId = window.setTimeout(callback, fallbackDelay);
  return () => window.clearTimeout(timeoutId);
}

function DeferredAppUpdatePrompt() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => scheduleAfterIdle(() => setShouldLoad(true), 1500), []);

  if (!shouldLoad) return null;

  return (
    <Suspense fallback={null}>
      <AppUpdatePrompt />
    </Suspense>
  );
}

function DeferredGlobalFeedback() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => scheduleAfterIdle(() => setShouldLoad(true), 900), []);

  if (!shouldLoad) return null;

  // Toaster/Sonner are part of the main graph (not lazy chunks) so a post-deploy
  // open tab cannot fail solely on a missing toaster-*.js hash at first paint.
  return (
    <>
      <Toaster />
      <Sonner />
    </>
  );
}

function BuildOverlayLoader() {
  const { profile } = useAuth();
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const canUseBuildOverlay = permissionListHas(profile?.effective_permissions || [], 'build.use');
    if (!canUseBuildOverlay) return;

    const params = new URLSearchParams(window.location.search);
    const buildModeRequested = params.get('build') === '1';
    const persistedMode = window.localStorage.getItem(BUILD_OVERLAY_STORAGE_KEY) === '1';

    if (buildModeRequested || persistedMode) {
      setShouldLoad(true);
      if (buildModeRequested) {
        window.localStorage.setItem(BUILD_OVERLAY_STORAGE_KEY, '1');
      }
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.shiftKey && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b')) {
        return;
      }

      event.preventDefault();
      window.localStorage.setItem(BUILD_OVERLAY_STORAGE_KEY, '1');
      setShouldLoad(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profile?.effective_permissions]);

  if (!shouldLoad) return null;

  return (
    <Suspense fallback={null}>
      <BuildOverlay />
    </Suspense>
  );
}

const App = () => (
  <AppCrashBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="civizen-theme-v1">
        <ThemeStorageSync />
        <TooltipProvider>
          <AuthProvider>
            <LanguageProvider>
              <DeferredGlobalFeedback />
              <DeferredAppUpdatePrompt />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <PageSecondaryNavProvider>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                  {/* Public routes */}
                  <Route path="/onboarding" element={<AuthRedirect><Onboarding /></AuthRedirect>} />
                  <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
                  <Route path="/signup" element={<AuthRedirect><SignUp /></AuthRedirect>} />
                  <Route path="/download" element={<DownloadPage />} />
                  <Route path="/jobs" element={<Navigate to="/market?section=jobs" replace />} />
                  <Route path="/why-this-exists" element={<WhyThisExists />} />
                  <Route path="/areas" element={<Areas />} />
                  <Route path="/areas/:slug" element={<AreaDetail />} />
                  <Route path="/fund" element={<FundHub />} />
                  <Route path="/fund/support" element={<FundSupport />} />
                  <Route path="/fund/invest" element={<FundInvest />} />
                  <Route path="/fund/institutional" element={<FundInstitutional />} />
                  <Route path="/fund/contribute" element={<FundContribute />} />
                  <Route path="/fund/transparency" element={<FundTransparency />} />
                  <Route path="/fund/project-finance" element={<FundProjectFinance />} />
                  <Route path="/terms" element={<TermsOfUse />} />
                  <Route path="/documents" element={<PublicDocumentsIndex />} />
                  <Route path="/documents/:docSlug" element={<InstitutionalDocRoute />} />
                  <Route path="/about" element={<InstitutionalDocRoute />} />
                  <Route path="/about/legal-status" element={<InstitutionalDocRoute />} />
                  <Route path="/about/mission" element={<InstitutionalDocRoute />} />
                  <Route path="/about/open-source" element={<InstitutionalDocRoute />} />
                  <Route path="/about/ai" element={<InstitutionalDocRoute />} />
                  <Route path="/about/world-citizenship" element={<InstitutionalDocRoute />} />
                  <Route path="/about/planetary-citizenship-pathway" element={<InstitutionalDocRoute />} />
                  <Route path="/governance/about" element={<InstitutionalDocRoute />} />
                  <Route path="/governance/charter" element={<InstitutionalDocRoute />} />
                  <Route path="/governance" element={<PublicGovernanceLanding />} />
                  <Route path="/governance/voting" element={<CivicVotingHub />} />
                  <Route path="/governance/voting/proposals/:proposalId" element={<CivicVotingProposal />} />
                  <Route path="/governance/voting/:electionId" element={<CivicVotingElection />} />
                  <Route path="/governance/voting/:electionId/observe" element={<CivicVotingObserver />} />
                  <Route path="/transparency" element={<InstitutionalDocRoute />} />
                  <Route path="/partners" element={<InstitutionalDocRoute />} />
                  <Route path="/contribute/policy" element={<InstitutionalDocRoute />} />
                  <Route path="/forgot-password" element={<AuthRedirect><ForgotPassword /></AuthRedirect>} />
                  {/* Do NOT wrap recovery route with AuthRedirect (recovery link may create a session) */}
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* Protected routes */}
                  <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                  <Route path="/contribute" element={<ProtectedRoute><Contribute /></ProtectedRoute>} />
                  <Route
                    path="/contribute/professional"
                    element={<ProtectedRoute><ProfessionalOpportunities /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/professional/new"
                    element={<ProtectedRoute><OpportunityForm /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/professional/:opportunityId/edit"
                    element={<ProtectedRoute><OpportunityForm /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/professional/:opportunityId"
                    element={<ProtectedRoute><OpportunityDetail /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/challenges"
                    element={<ProtectedRoute><CommunityChallenges /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/challenges/new"
                    element={<ProtectedRoute><ChallengeForm /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/challenges/:challengeId/edit"
                    element={<ProtectedRoute><ChallengeForm /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/challenges/:challengeId"
                    element={<ProtectedRoute><ChallengeDetail /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/knowledge"
                    element={<ProtectedRoute><KnowledgeSpaces /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/knowledge/new"
                    element={<ProtectedRoute><KnowledgeSpaceForm /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/knowledge/:spaceId/edit"
                    element={<ProtectedRoute><KnowledgeSpaceForm /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/knowledge/:spaceId/resources/new"
                    element={<ProtectedRoute><KnowledgeResourceForm /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/knowledge/:spaceId/resources/:resourceId/edit"
                    element={<ProtectedRoute><KnowledgeResourceForm /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/knowledge/:spaceId/resources/:resourceId"
                    element={<ProtectedRoute><KnowledgeResourceDetail /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/knowledge/:spaceId"
                    element={<ProtectedRoute><KnowledgeSpaceDetail /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/impact"
                    element={<ProtectedRoute><ContributeImpact /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/improvements"
                    element={<ProtectedRoute><Navigate to="/contribute/matters/new?intent=improvement" replace /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/matters"
                    element={<ProtectedRoute><Matters /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/matters/new"
                    element={<ProtectedRoute><MatterForm /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/matters/:matterId"
                    element={<ProtectedRoute><MatterDetail /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/tasks"
                    element={<ProtectedRoute><Navigate to="/contribute/professional" replace /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/projects"
                    element={<ProtectedRoute><Navigate to="/contribute/challenges" replace /></ProtectedRoute>}
                  />
                  <Route
                    path="/contribute/:laneId"
                    element={<ProtectedRoute><ContributeLane /></ProtectedRoute>}
                  />
                  <Route path="/messaging/:conversationId" element={<ProtectedRoute><Messaging /></ProtectedRoute>} />
                  <Route path="/messaging" element={<ProtectedRoute><Messaging /></ProtectedRoute>} />
                  <Route path="/messagin" element={<ProtectedRoute><Navigate to="/messaging" replace /></ProtectedRoute>} />
                  <Route path="/study" element={<ProtectedRoute><StudyLayout /></ProtectedRoute>}>
                    <Route index element={<StudyCivicLearning />} />
                    <Route path="specialists" element={<StudySpecialists />} />
                    <Route path="courses" element={<StudyCourses />} />
                    <Route path="schedules" element={<StudySchedules />} />
                    <Route path="materials" element={<StudyMaterials />} />
                    <Route path="tests" element={<StudyTests />} />
                  </Route>
                  <Route path="/governance/workspace" element={<ProtectedRoute><Governance /></ProtectedRoute>} />
                  <Route path="/governance/solutions" element={<ProtectedRoute><SolutionsHub /></ProtectedRoute>} />
                  <Route path="/governance/solutions/:problemId" element={<ProtectedRoute><SolutionProblemDetail /></ProtectedRoute>} />
                  <Route path="/features" element={<ProtectedRoute><Navigate to="/study" replace /></ProtectedRoute>} />
                  <Route
                    path="/law"
                    element={
                      <ProtectedRoute requiredPermissions={['law.read']}>
                        <Law />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/search"
                    element={
                      <ProtectedRoute requiredPermissions={['profile.read']}>
                        <Search />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/market" element={<Market />} />
                  <Route path="/market/taxonomy" element={<ProtectedRoute><MarketTaxonomy /></ProtectedRoute>} />
                  <Route path="/agreements/new" element={<ProtectedRoute><AgreementCreate /></ProtectedRoute>} />
                  <Route path="/agreements/:agreementId" element={<ProtectedRoute><AgreementDetail /></ProtectedRoute>} />
                  <Route path="/agreements" element={<ProtectedRoute><Agreements /></ProtectedRoute>} />
                  <Route path="/earnings" element={<ProtectedRoute><Earnings /></ProtectedRoute>} />
                  {happinessAppRoutes}
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute requiredPermissions={['profile.read']}>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile/contributions"
                    element={
                      <ProtectedRoute requiredPermissions={['profile.read']}>
                        <ContributionsLedger />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/user/:userId"
                    element={
                      <ProtectedRoute requiredPermissions={['profile.read']}>
                        <UserProfile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/user/:userId/contributions"
                    element={
                      <ProtectedRoute requiredPermissions={['profile.read']}>
                        <ContributionsLedger />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/endorse"
                    element={
                      <ProtectedRoute requiredPermissions={['endorsement.create']}>
                        <Navigate to="/search?tab=people" replace />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/endorse/:userId"
                    element={
                      <ProtectedRoute requiredPermissions={['endorsement.create']}>
                        <EndorseFlow />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/settings/privacy" element={<ProtectedRoute><PrivacySettings /></ProtectedRoute>} />
                  <Route
                    path="/settings/ai-agent"
                    element={
                      <ProtectedRoute requiredPermissions={['settings.manage']}>
                        <AiAgentSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/settings/social-accounts" element={<ProtectedRoute><SocialAccountsSettings /></ProtectedRoute>} />
                  <Route path="/settings/prototype-credits" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
                  <Route path="/settings/wallet" element={<ProtectedRoute><Navigate to="/settings/prototype-credits" replace /></ProtectedRoute>} />
                  <Route path="/settings/taxonomy" element={<ProtectedRoute><TaxonomySettings /></ProtectedRoute>} />
                  <Route path="/settings/luma-wallet" element={<ProtectedRoute><Navigate to="/settings/prototype-credits" replace /></ProtectedRoute>} />
                  <Route
                    path="/settings/messaging"
                    element={
                      <ProtectedRoute requiredPermissions={['message.create']}>
                        <MessagingSettingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/messaging-security"
                    element={
                      <ProtectedRoute requiredPermissions={['message.create']}>
                        <MessagingSecurity />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/settings/legal" element={<ProtectedRoute><TermsOfUse /></ProtectedRoute>} />
                  <Route
                    path="/settings/profile"
                    element={
                      <ProtectedRoute requiredPermissions={['profile.update_self']}>
                        <EditProfile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/professions"
                    element={
                      <ProtectedRoute>
                        <Professions />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/pillars"
                    element={
                      <ProtectedRoute requiredPermissions={['profile.update_self']}>
                        <Pillars />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/admin/roles"
                    element={
                      <ProtectedRoute requiredPermissions={['role.assign', 'settings.manage']}>
                        <RolesAdmin />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/admin/users"
                    element={
                      <ProtectedRoute requiredPermissions={['role.assign', 'settings.manage']}>
                        <UsersAdmin />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/admin/governance"
                    element={
                      <ProtectedRoute requiredPermissions={['role.assign', 'settings.manage']}>
                        <GovernanceAdmin />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/admin/modules"
                    element={
                      <ProtectedRoute requiredPermissions={['role.assign', 'settings.manage']}>
                        <Features />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/admin/permissions"
                    element={
                      <ProtectedRoute requiredPermissions={['role.assign', 'settings.manage']}>
                        <PermissionsAdmin />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/admin/funding"
                    element={
                      <ProtectedRoute
                        requiredPermissions={[
                          'finance.view',
                          'finance.edit',
                          'finance.approve',
                          'finance.publish',
                          'finance.admin',
                          'role.assign',
                          'settings.manage',
                        ]}
                      >
                        <FundingAdmin />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/admin/funding-interest"
                    element={<Navigate to="/settings/admin/funding?section=interest" replace />}
                  />
                  <Route
                    path="/settings/admin/funding-ledger"
                    element={<Navigate to="/settings/admin/funding?section=ledger&legacy=1" replace />}
                  />
                  <Route
                    path="/settings/admin/funding-audit"
                    element={<Navigate to="/settings/admin/funding?section=audit&legacy=1" replace />}
                  />
                  <Route
                    path="/settings/admin/funding-compliance"
                    element={<Navigate to="/settings/admin/funding?section=compliance&legacy=1" replace />}
                  />
                  <Route
                    path="/settings/admin/funding-contributors"
                    element={<Navigate to="/settings/admin/funding?section=contributors&legacy=1" replace />}
                  />
                  <Route
                    path="/settings/market/luma-credits"
                    element={
                      <ProtectedRoute requiredPermissions={['market.manage']}>
                        <LumaCreditsAdmin />
                      </ProtectedRoute>
                    }
                  />

                  {DevEconomicsVisual ? (
                    <Route path="/dev/economics-visual" element={<DevEconomicsVisual />} />
                  ) : null}

                  {/* Fallback */}
                  <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <PublicCiviHost />
                <BuildOverlayLoader />
                </PageSecondaryNavProvider>
              </BrowserRouter>
            </LanguageProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </AppCrashBoundary>
);

export default App;
