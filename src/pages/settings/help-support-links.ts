import { BookOpen, FileText, Lock, MessageCircle, Scale, ScrollText } from 'lucide-react';

/** Destinations listed on Settings > Help and support. */
export const HELP_SUPPORT_LINKS = [
  { icon: MessageCircle, labelKey: 'settings.helpCivi', descriptionKey: 'settings.helpCiviDescription', path: '/messaging' },
  { icon: FileText, labelKey: 'settings.helpDocuments', descriptionKey: 'settings.helpDocumentsDescription', path: '/documents' },
  { icon: BookOpen, labelKey: 'settings.helpWhy', descriptionKey: 'settings.helpWhyDescription', path: '/why-this-exists' },
  { icon: Scale, labelKey: 'settings.helpLegal', descriptionKey: 'settings.helpLegalDescription', path: '/about/legal-status' },
  { icon: ScrollText, labelKey: 'settings.helpTerms', descriptionKey: 'settings.helpTermsDescription', path: '/terms' },
  { icon: Lock, labelKey: 'settings.helpPrivacy', descriptionKey: 'settings.helpPrivacyDescription', path: '/privacy' },
] as const;
