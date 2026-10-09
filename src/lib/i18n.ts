/** Barrel kept for existing imports; the implementation lives in i18n.runtime, i18n.base and i18n.languages (Phase 11). */
export { baseTranslations } from './i18n.base';
export type { BaseTranslations } from './i18n.base';
export { detectCountryCode, detectLocalePreferences, translateMessage } from './i18n.runtime';
export type { LanguageCode, LanguageOption } from './i18n.languages';
