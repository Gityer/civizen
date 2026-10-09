import { type AppPermission } from '@/lib/access-control';
import { User, Bell, HelpCircle, FileText, Lock, Settings as SettingsIcon, Award, MessageCircle, Share2, KeyRound } from 'lucide-react';

export type SettingsNavItem = {
  icon: typeof User;
  labelKey: string;
  descriptionKey: string;
  path: string;
  requiredPermissions?: AppPermission[];
};

/** Primary settings rows — English alphabetical by default label; UI also sorts by translated title. */
export const settingsItems: SettingsNavItem[] = [
  {
    icon: User,
    labelKey: 'settings.editProfile',
    descriptionKey: 'settings.editProfileDescription',
    path: '/settings/profile',
    requiredPermissions: ['profile.update_self'],
  },
  {
    icon: HelpCircle,
    labelKey: 'settings.helpSupport',
    descriptionKey: 'settings.helpSupportDescription',
    path: '/settings/help',
  },
  {
    icon: MessageCircle,
    labelKey: 'settings.messaging',
    descriptionKey: 'settings.messagingDescription',
    path: '/settings/messaging',
    requiredPermissions: ['message.create'],
  },
  {
    icon: Bell,
    labelKey: 'settings.notifications',
    descriptionKey: 'settings.notificationsDescription',
    path: '/notifications',
  },
  {
    icon: SettingsIcon,
    labelKey: 'settings.pillars',
    descriptionKey: 'settings.pillarsDescription',
    path: '/settings/pillars',
    requiredPermissions: ['profile.update_self'],
  },
  {
    icon: Lock,
    labelKey: 'settings.privacy',
    descriptionKey: 'settings.privacyDescription',
    path: '/settings/privacy',
  },
  {
    icon: KeyRound,
    labelKey: 'settings.accountTitle',
    descriptionKey: 'settings.accountDescription',
    path: '/settings/account',
  },
  {
    icon: Share2,
    labelKey: 'settings.socialAccounts',
    descriptionKey: 'settings.socialAccountsDescription',
    path: '/settings/social-accounts',
  },
  {
    icon: Award,
    labelKey: 'settings.professions',
    descriptionKey: 'settings.professionsDescription',
    path: '/settings/professions',
  },
  {
    icon: FileText,
    labelKey: 'settings.termsPrivacy',
    descriptionKey: 'settings.termsPrivacyDescription',
    path: '/settings/legal',
  },
];
