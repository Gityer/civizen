import { Navigate, Route } from 'react-router-dom';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AuthRedirect } from '@/app-routes/AuthRedirect';
import { happinessAppRoutes } from '@/pages/happiness/happiness-app-routes';
import {
  AgreementCreate,
  AgreementDetail,
  Agreements,
  AiAgentSettings,
  AreaDetail,
  Areas,
  ChallengeDetail,
  ChallengeForm,
  CivicVotingElection,
  CivicVotingHub,
  CivicVotingObserver,
  CivicVotingProposal,
  CommunityChallenges,
  Contribute,
  ContributeImpact,
  ContributionsLedger,
  DownloadPage,
  Earnings,
  EditProfile,
  EndorseFlow,
  ForgotPassword,
  FundContribute,
  FundHub,
  FundInstitutional,
  FundInvest,
  FundProjectFinance,
  FundSupport,
  FundTransparency,
  Governance,
  GovernanceNew,
  Home,
  InstitutionalDocRoute,
  KnowledgeResourceDetail,
  KnowledgeResourceForm,
  KnowledgeSpaceDetail,
  KnowledgeSpaceForm,
  KnowledgeSpaces,
  Law,
  Login,
  Market,
  MarketTaxonomy,
  MatterDetail,
  MatterForm,
  Matters,
  Messaging,
  MessagingSecurity,
  MessagingSettingsPage,
  Onboarding,
  GovernanceMember,
  HelpSupport,
  Notifications,
  OpportunityDetail,
  OpportunityForm,
  Pillars,
  PrivacySettings,
  ProfessionalOpportunities,
  Professions,
  Profile,
  PublicDocumentsIndex,
  PublicGovernanceLanding,
  ResetPassword,
  RolesAdmin,
  Search,
  Settings,
  SignUp,
  SocialAccountsSettings,
  SolutionProblemDetail,
  SolutionsHub,
  StudyCivicLearning,
  StudyCourses,
  StudyLayout,
  StudyMaterials,
  StudySchedules,
  StudySpecialists,
  StudyTests,
  TaxonomySettings,
  TermsOfUse,
  UserProfile,
  UsersAdmin,
  WalletPage,
  WhyThisExists,
} from '@/app-routes/lazy-pages';

export const appRoutes1 = (
  <>
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
      <Route path="/governance/workspace" element={<ProtectedRoute><GovernanceMember /></ProtectedRoute>} />
      <Route path="/governance/tools" element={<ProtectedRoute><Governance /></ProtectedRoute>} />
      <Route path="/governance/tools/steward" element={<ProtectedRoute><GovernanceNew /></ProtectedRoute>} />
      <Route path="/governance/new" element={<ProtectedRoute><Navigate to="/governance/tools/steward" replace /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
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
      <Route path="/settings/help" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
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
  </>
);
