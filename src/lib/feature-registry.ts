import type { LucideIcon } from 'lucide-react';
import {
  Award,
  BookOpen,
  Coins,
  Compass,
  Fingerprint,
  Download,
  BadgeCheck,
  Edit3,
  FileSignature,
  FileText,
  Globe,
  GraduationCap,
  Heart,
  Home,
  LogIn,
  ArrowLeftRight,
  Search,
  Scale,
  Landmark,
  LayoutGrid,
  MessageCircle,
  Hammer,
  PiggyBank,
  PlusCircle,
  CircleDollarSign,
  Settings2,
  Shield,
  KeyRound,
  ShoppingBag,
  Store,
  Tag,
  ThumbsUp,
  TrendingUp,
  Upload,
  UserRound,
  Users,
  UserPlus,
} from 'lucide-react';

/**
 * Canonical feature registry.
 *
 * Rule: whenever a new feature, workflow, page behavior, or notable asset behavior is added,
 * update this registry and the matching keys in `src/lib/i18n.base.ts`.
 *
 * The admin-facing System Modules page renders from this file so both humans and AI agents can
 * refer to the same source of truth for sections, pages, workflows, and detailed functionality.
 */

export type SectionId =
  | 'administration'
  | 'home'
  | 'discovery'
  | 'knowledge'
  | 'contribution'
  | 'identity'
  | 'marketplace'
  | 'preferences';

export type PageId =
  | 'contribute'
  | 'home'
  | 'study'
  | 'features'
  | 'downloads'
  | 'law'
  | 'terms'
  | 'search'
  | 'endorse'
  | 'market'
  | 'agreements'
  | 'earnings'
  | 'happiness'
  | 'profile'
  | 'editProfile'
  | 'settings'
  | 'pillars'
  | 'messaging'
  | 'login'
  | 'admin'
  | 'adminRoles'
  | 'adminUsers'
  | 'adminPermissions'
  | 'signUp'
  | 'adminGovernance'
  | 'adminModules';

export type FeatureId =
  | 'studyNestedHub'
  | 'studyCoursesLearnerTracks'
  | 'accessControl'
  | 'adminUsers'
  | 'adminRoles'
  | 'adminPermissions'
  | 'autosaveDefaults'
  | 'countryAutoSave'
  | 'cardLayoutEditor'
  | 'contributionHub'
  | 'homeAppDownload'
  | 'trustFeed'
  | 'messaging'
  | 'scoreSnapshot'
  | 'happinessFoundation'
  | 'workFulfillment'
  | 'fulfillmentPlans'
  | 'wellbeingAggregatePrivacy'
  | 'directorySearch'
  | 'publicProfiles'
  | 'endorsements'
  | 'featureExplorer'
  | 'generatedIdentity'
  | 'identifierLogin'
  | 'mobileDownloads'
  | 'lawLibrary'
  | 'digitalAgreements'
  | 'phoneFirstSignup'
  | 'profileEditing'
  | 'profilePageMenu'
  | 'photoUpload'
  | 'languageTheme'
  | 'pillarCustomization'
  | 'userVerification'
  | 'termsUse'
  | 'studyLearningCenter'
  | 'specialistGuidanceHub'
  | 'governancePolicies'
  | 'adminSystemModules';

export type RegistryEntry<T extends string> = {
  id: T;
  icon: LucideIcon;
  labelKey: string;
};

export type FeatureEntry = {
  id: FeatureId;
  icon: LucideIcon;
  titleKey: string;
  summaryKey: string;
  workflowKey: string;
  detailsKey: string;
  section: SectionId;
  page: PageId;
};

export const sectionRegistry: Record<SectionId, RegistryEntry<SectionId>> = {
  administration: { id: 'administration', icon: Shield, labelKey: 'features.sections.administration' },
  home: { id: 'home', icon: Home, labelKey: 'features.sections.home' },
  discovery: { id: 'discovery', icon: Compass, labelKey: 'features.sections.discovery' },
  knowledge: { id: 'knowledge', icon: BookOpen, labelKey: 'features.sections.knowledge' },
  contribution: { id: 'contribution', icon: PlusCircle, labelKey: 'features.sections.contribution' },
  identity: { id: 'identity', icon: UserRound, labelKey: 'features.sections.identity' },
  marketplace: { id: 'marketplace', icon: ShoppingBag, labelKey: 'features.sections.marketplace' },
  preferences: { id: 'preferences', icon: Settings2, labelKey: 'features.sections.preferences' },
};

export const pageRegistry: Record<PageId, RegistryEntry<PageId>> = {
  contribute: { id: 'contribute', icon: PlusCircle, labelKey: 'features.pages.contribute' },
  home: { id: 'home', icon: Home, labelKey: 'features.pages.home' },
  study: { id: 'study', icon: BookOpen, labelKey: 'features.pages.study' },
  features: { id: 'features', icon: BookOpen, labelKey: 'features.pages.features' },
  downloads: { id: 'downloads', icon: Download, labelKey: 'features.pages.downloads' },
  law: { id: 'law', icon: Scale, labelKey: 'features.pages.law' },
  terms: { id: 'terms', icon: FileText, labelKey: 'features.pages.terms' },
  search: { id: 'search', icon: Search, labelKey: 'features.pages.search' },
  endorse: { id: 'endorse', icon: ThumbsUp, labelKey: 'features.pages.endorse' },
  market: { id: 'market', icon: Store, labelKey: 'features.pages.market' },
  agreements: { id: 'agreements', icon: FileSignature, labelKey: 'features.pages.agreements' },
  earnings: { id: 'earnings', icon: CircleDollarSign, labelKey: 'features.pages.earnings' },
  happiness: { id: 'happiness', icon: Heart, labelKey: 'features.pages.happiness' },
  profile: { id: 'profile', icon: UserRound, labelKey: 'features.pages.profile' },
  editProfile: { id: 'editProfile', icon: Edit3, labelKey: 'features.pages.editProfile' },
  settings: { id: 'settings', icon: Settings2, labelKey: 'features.pages.settings' },
  pillars: { id: 'pillars', icon: TrendingUp, labelKey: 'features.pages.pillars' },
  messaging: { id: 'messaging', icon: MessageCircle, labelKey: 'features.pages.messaging' },
  login: { id: 'login', icon: LogIn, labelKey: 'features.pages.login' },
  admin: { id: 'admin', icon: Shield, labelKey: 'features.pages.admin' },
  adminRoles: { id: 'adminRoles', icon: Fingerprint, labelKey: 'features.pages.adminRoles' },
  adminUsers: { id: 'adminUsers', icon: Users, labelKey: 'features.pages.adminUsers' },
  adminPermissions: { id: 'adminPermissions', icon: KeyRound, labelKey: 'features.pages.adminPermissions' },
  signUp: { id: 'signUp', icon: UserPlus, labelKey: 'features.pages.signUp' },
  adminGovernance: { id: 'adminGovernance', icon: Landmark, labelKey: 'features.pages.adminGovernance' },
  adminModules: { id: 'adminModules', icon: LayoutGrid, labelKey: 'features.pages.adminModules' },
};

export const featureRegistry: FeatureEntry[] = [
  {
    id: 'studyNestedHub',
    icon: BookOpen,
    titleKey: 'features.catalog.studyNestedHub.title',
    summaryKey: 'features.catalog.studyNestedHub.summary',
    workflowKey: 'features.catalog.studyNestedHub.workflow',
    detailsKey: 'features.catalog.studyNestedHub.details',
    section: 'knowledge',
    page: 'study',
  },
  {
    id: 'studyCoursesLearnerTracks',
    icon: GraduationCap,
    titleKey: 'features.catalog.studyCoursesLearnerTracks.title',
    summaryKey: 'features.catalog.studyCoursesLearnerTracks.summary',
    workflowKey: 'features.catalog.studyCoursesLearnerTracks.workflow',
    detailsKey: 'features.catalog.studyCoursesLearnerTracks.details',
    section: 'knowledge',
    page: 'study',
  },
  {
    id: 'accessControl',
    icon: Shield,
    titleKey: 'features.catalog.accessControl.title',
    summaryKey: 'features.catalog.accessControl.summary',
    workflowKey: 'features.catalog.accessControl.workflow',
    detailsKey: 'features.catalog.accessControl.details',
    section: 'preferences',
    page: 'settings',
  },
  {
    id: 'adminRoles',
    icon: Fingerprint,
    titleKey: 'features.catalog.adminRoles.title',
    summaryKey: 'features.catalog.adminRoles.summary',
    workflowKey: 'features.catalog.adminRoles.workflow',
    detailsKey: 'features.catalog.adminRoles.details',
    section: 'administration',
    page: 'adminRoles',
  },
  {
    id: 'adminUsers',
    icon: Users,
    titleKey: 'features.catalog.adminUsers.title',
    summaryKey: 'features.catalog.adminUsers.summary',
    workflowKey: 'features.catalog.adminUsers.workflow',
    detailsKey: 'features.catalog.adminUsers.details',
    section: 'administration',
    page: 'adminUsers',
  },
  {
    id: 'adminPermissions',
    icon: KeyRound,
    titleKey: 'features.catalog.adminPermissions.title',
    summaryKey: 'features.catalog.adminPermissions.summary',
    workflowKey: 'features.catalog.adminPermissions.workflow',
    detailsKey: 'features.catalog.adminPermissions.details',
    section: 'administration',
    page: 'adminPermissions',
  },
  {
    id: 'autosaveDefaults',
    icon: Edit3,
    titleKey: 'features.catalog.autosaveDefaults.title',
    summaryKey: 'features.catalog.autosaveDefaults.summary',
    workflowKey: 'features.catalog.autosaveDefaults.workflow',
    detailsKey: 'features.catalog.autosaveDefaults.details',
    section: 'preferences',
    page: 'settings',
  },
  {
    id: 'cardLayoutEditor',
    icon: Hammer,
    titleKey: 'features.catalog.cardLayoutEditor.title',
    summaryKey: 'features.catalog.cardLayoutEditor.summary',
    workflowKey: 'features.catalog.cardLayoutEditor.workflow',
    detailsKey: 'features.catalog.cardLayoutEditor.details',
    section: 'identity',
    page: 'editProfile',
  },
  {
    id: 'contributionHub',
    icon: PlusCircle,
    titleKey: 'features.catalog.contributionHub.title',
    summaryKey: 'features.catalog.contributionHub.summary',
    workflowKey: 'features.catalog.contributionHub.workflow',
    detailsKey: 'features.catalog.contributionHub.details',
    section: 'contribution',
    page: 'contribute',
  },
  {
    id: 'homeAppDownload',
    icon: Download,
    titleKey: 'features.catalog.homeAppDownload.title',
    summaryKey: 'features.catalog.homeAppDownload.summary',
    workflowKey: 'features.catalog.homeAppDownload.workflow',
    detailsKey: 'features.catalog.homeAppDownload.details',
    section: 'home',
    page: 'home',
  },
  {
    id: 'trustFeed',
    icon: LayoutGrid,
    titleKey: 'features.catalog.trustFeed.title',
    summaryKey: 'features.catalog.trustFeed.summary',
    workflowKey: 'features.catalog.trustFeed.workflow',
    detailsKey: 'features.catalog.trustFeed.details',
    section: 'home',
    page: 'home',
  },
  {
    id: 'messaging',
    icon: MessageCircle,
    titleKey: 'features.catalog.messaging.title',
    summaryKey: 'features.catalog.messaging.summary',
    workflowKey: 'features.catalog.messaging.workflow',
    detailsKey: 'features.catalog.messaging.details',
    section: 'home',
    page: 'messaging',
  },
  {
    id: 'profilePageMenu',
    icon: Compass,
    titleKey: 'features.catalog.profilePageMenu.title',
    summaryKey: 'features.catalog.profilePageMenu.summary',
    workflowKey: 'features.catalog.profilePageMenu.workflow',
    detailsKey: 'features.catalog.profilePageMenu.details',
    section: 'identity',
    page: 'home',
  },
  {
    id: 'scoreSnapshot',
    icon: TrendingUp,
    titleKey: 'features.catalog.scoreSnapshot.title',
    summaryKey: 'features.catalog.scoreSnapshot.summary',
    workflowKey: 'features.catalog.scoreSnapshot.workflow',
    detailsKey: 'features.catalog.scoreSnapshot.details',
    section: 'identity',
    page: 'profile',
  },
  {
    id: 'happinessFoundation',
    icon: Heart,
    titleKey: 'features.catalog.happinessFoundation.title',
    summaryKey: 'features.catalog.happinessFoundation.summary',
    workflowKey: 'features.catalog.happinessFoundation.workflow',
    detailsKey: 'features.catalog.happinessFoundation.details',
    section: 'identity',
    page: 'happiness',
  },
  {
    id: 'workFulfillment',
    icon: Heart,
    titleKey: 'features.catalog.workFulfillment.title',
    summaryKey: 'features.catalog.workFulfillment.summary',
    workflowKey: 'features.catalog.workFulfillment.workflow',
    detailsKey: 'features.catalog.workFulfillment.details',
    section: 'identity',
    page: 'happiness',
  },
  {
    id: 'fulfillmentPlans',
    icon: Heart,
    titleKey: 'features.catalog.fulfillmentPlans.title',
    summaryKey: 'features.catalog.fulfillmentPlans.summary',
    workflowKey: 'features.catalog.fulfillmentPlans.workflow',
    detailsKey: 'features.catalog.fulfillmentPlans.details',
    section: 'identity',
    page: 'happiness',
  },
  {
    id: 'wellbeingAggregatePrivacy',
    icon: Shield,
    titleKey: 'features.catalog.wellbeingAggregatePrivacy.title',
    summaryKey: 'features.catalog.wellbeingAggregatePrivacy.summary',
    workflowKey: 'features.catalog.wellbeingAggregatePrivacy.workflow',
    detailsKey: 'features.catalog.wellbeingAggregatePrivacy.details',
    section: 'identity',
    page: 'happiness',
  },
  {
    id: 'directorySearch',
    icon: Users,
    titleKey: 'features.catalog.directorySearch.title',
    summaryKey: 'features.catalog.directorySearch.summary',
    workflowKey: 'features.catalog.directorySearch.workflow',
    detailsKey: 'features.catalog.directorySearch.details',
    section: 'discovery',
    page: 'search',
  },
  {
    id: 'publicProfiles',
    icon: Shield,
    titleKey: 'features.catalog.publicProfiles.title',
    summaryKey: 'features.catalog.publicProfiles.summary',
    workflowKey: 'features.catalog.publicProfiles.workflow',
    detailsKey: 'features.catalog.publicProfiles.details',
    section: 'discovery',
    page: 'profile',
  },
  {
    id: 'endorsements',
    icon: ThumbsUp,
    titleKey: 'features.catalog.endorsements.title',
    summaryKey: 'features.catalog.endorsements.summary',
    workflowKey: 'features.catalog.endorsements.workflow',
    detailsKey: 'features.catalog.endorsements.details',
    section: 'contribution',
    page: 'endorse',
  },
  {
    id: 'featureExplorer',
    icon: Compass,
    titleKey: 'features.catalog.featureExplorer.title',
    summaryKey: 'features.catalog.featureExplorer.summary',
    workflowKey: 'features.catalog.featureExplorer.workflow',
    detailsKey: 'features.catalog.featureExplorer.details',
    section: 'discovery',
    page: 'features',
  },
  {
    id: 'studyLearningCenter',
    icon: BookOpen,
    titleKey: 'features.catalog.studyLearningCenter.title',
    summaryKey: 'features.catalog.studyLearningCenter.summary',
    workflowKey: 'features.catalog.studyLearningCenter.workflow',
    detailsKey: 'features.catalog.studyLearningCenter.details',
    section: 'knowledge',
    page: 'study',
  },
  {
    id: 'specialistGuidanceHub',
    icon: GraduationCap,
    titleKey: 'features.catalog.specialistGuidanceHub.title',
    summaryKey: 'features.catalog.specialistGuidanceHub.summary',
    workflowKey: 'features.catalog.specialistGuidanceHub.workflow',
    detailsKey: 'features.catalog.specialistGuidanceHub.details',
    section: 'knowledge',
    page: 'study',
  },
  {
    id: 'identifierLogin',
    icon: LogIn,
    titleKey: 'features.catalog.identifierLogin.title',
    summaryKey: 'features.catalog.identifierLogin.summary',
    workflowKey: 'features.catalog.identifierLogin.workflow',
    detailsKey: 'features.catalog.identifierLogin.details',
    section: 'identity',
    page: 'login',
  },
  {
    id: 'generatedIdentity',
    icon: Shield,
    titleKey: 'features.catalog.generatedIdentity.title',
    summaryKey: 'features.catalog.generatedIdentity.summary',
    workflowKey: 'features.catalog.generatedIdentity.workflow',
    detailsKey: 'features.catalog.generatedIdentity.details',
    section: 'identity',
    page: 'profile',
  },
  {
    id: 'userVerification',
    icon: BadgeCheck,
    titleKey: 'features.catalog.userVerification.title',
    summaryKey: 'features.catalog.userVerification.summary',
    workflowKey: 'features.catalog.userVerification.workflow',
    detailsKey: 'features.catalog.userVerification.details',
    section: 'administration',
    page: 'adminUsers',
  },
  {
    id: 'mobileDownloads',
    icon: Download,
    titleKey: 'features.catalog.mobileDownloads.title',
    summaryKey: 'features.catalog.mobileDownloads.summary',
    workflowKey: 'features.catalog.mobileDownloads.workflow',
    detailsKey: 'features.catalog.mobileDownloads.details',
    section: 'discovery',
    page: 'downloads',
  },
  {
    id: 'lawLibrary',
    icon: Scale,
    titleKey: 'features.catalog.lawLibrary.title',
    summaryKey: 'features.catalog.lawLibrary.summary',
    workflowKey: 'features.catalog.lawLibrary.workflow',
    detailsKey: 'features.catalog.lawLibrary.details',
    section: 'knowledge',
    page: 'law',
  },
  {
    id: 'termsUse',
    icon: FileText,
    titleKey: 'features.catalog.termsUse.title',
    summaryKey: 'features.catalog.termsUse.summary',
    workflowKey: 'features.catalog.termsUse.workflow',
    detailsKey: 'features.catalog.termsUse.details',
    section: 'preferences',
    page: 'terms',
  },
  {
    id: 'digitalAgreements',
    icon: FileSignature,
    titleKey: 'features.catalog.digitalAgreements.title',
    summaryKey: 'features.catalog.digitalAgreements.summary',
    workflowKey: 'features.catalog.digitalAgreements.workflow',
    detailsKey: 'features.catalog.digitalAgreements.details',
    section: 'marketplace',
    page: 'agreements',
  },
  {
    id: 'governancePolicies',
    icon: Landmark,
    titleKey: 'features.catalog.governancePolicies.title',
    summaryKey: 'features.catalog.governancePolicies.summary',
    workflowKey: 'features.catalog.governancePolicies.workflow',
    detailsKey: 'features.catalog.governancePolicies.details',
    section: 'administration',
    page: 'adminGovernance',
  },
  {
    id: 'adminSystemModules',
    icon: LayoutGrid,
    titleKey: 'features.catalog.adminSystemModules.title',
    summaryKey: 'features.catalog.adminSystemModules.summary',
    workflowKey: 'features.catalog.adminSystemModules.workflow',
    detailsKey: 'features.catalog.adminSystemModules.details',
    section: 'administration',
    page: 'adminModules',
  },
  {
    id: 'phoneFirstSignup',
    icon: UserPlus,
    titleKey: 'features.catalog.phoneFirstSignup.title',
    summaryKey: 'features.catalog.phoneFirstSignup.summary',
    workflowKey: 'features.catalog.phoneFirstSignup.workflow',
    detailsKey: 'features.catalog.phoneFirstSignup.details',
    section: 'identity',
    page: 'signUp',
  },
  {
    id: 'profileEditing',
    icon: Edit3,
    titleKey: 'features.catalog.profileEditing.title',
    summaryKey: 'features.catalog.profileEditing.summary',
    workflowKey: 'features.catalog.profileEditing.workflow',
    detailsKey: 'features.catalog.profileEditing.details',
    section: 'identity',
    page: 'editProfile',
  },
  {
    id: 'countryAutoSave',
    icon: Globe,
    titleKey: 'features.catalog.countryAutoSave.title',
    summaryKey: 'features.catalog.countryAutoSave.summary',
    workflowKey: 'features.catalog.countryAutoSave.workflow',
    detailsKey: 'features.catalog.countryAutoSave.details',
    section: 'identity',
    page: 'editProfile',
  },
  {
    id: 'photoUpload',
    icon: Upload,
    titleKey: 'features.catalog.photoUpload.title',
    summaryKey: 'features.catalog.photoUpload.summary',
    workflowKey: 'features.catalog.photoUpload.workflow',
    detailsKey: 'features.catalog.photoUpload.details',
    section: 'identity',
    page: 'editProfile',
  },
  {
    id: 'languageTheme',
    icon: Globe,
    titleKey: 'features.catalog.languageTheme.title',
    summaryKey: 'features.catalog.languageTheme.summary',
    workflowKey: 'features.catalog.languageTheme.workflow',
    detailsKey: 'features.catalog.languageTheme.details',
    section: 'preferences',
    page: 'settings',
  },
  {
    id: 'pillarCustomization',
    icon: GraduationCap,
    titleKey: 'features.catalog.pillarCustomization.title',
    summaryKey: 'features.catalog.pillarCustomization.summary',
    workflowKey: 'features.catalog.pillarCustomization.workflow',
    detailsKey: 'features.catalog.pillarCustomization.details',
    section: 'preferences',
    page: 'pillars',
  },
];
