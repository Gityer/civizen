import { useLanguage } from '@/contexts/LanguageContext';

export const MAIN_CONTENT_ID = 'main-content';

/** Keyboard users jump past the chrome; visible only while focused. */
export function SkipToContentLink() {
  const { t } = useLanguage();
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-60 focus:rounded-lg focus:border focus:border-border focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:text-foreground focus:shadow-lg"
    >
      {t('common.skipToContent')}
    </a>
  );
}
