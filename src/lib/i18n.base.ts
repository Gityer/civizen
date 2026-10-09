import { m_messages_01 } from './i18n/base/messages-01';
import { m_messages_02 } from './i18n/base/messages-02';
import { m_messages_settings_01 } from './i18n/base/messages-settings-01';
import { m_messages_settings_02 } from './i18n/base/messages-settings-02';
import { m_messages_settings_03 } from './i18n/base/messages-settings-03';
import { m_messages_03 } from './i18n/base/messages-03';
import { m_messages_04 } from './i18n/base/messages-04';
import { m_messages_05 } from './i18n/base/messages-05';
import { m_messages_happiness_01 } from './i18n/base/messages-happiness-01';
import { m_messages_happiness_02 } from './i18n/base/messages-happiness-02';
import { m_messages_happiness_03 } from './i18n/base/messages-happiness-03';
import { m_messages_06 } from './i18n/base/messages-06';
import { m_messages_07 } from './i18n/base/messages-07';
import { m_messages_08 } from './i18n/base/messages-08';
import { m_messages_contribute_01 } from './i18n/base/messages-contribute-01';
import { m_messages_contribute_02 } from './i18n/base/messages-contribute-02';
import { m_messages_contribute_03 } from './i18n/base/messages-contribute-03';
import { m_messages_contribute_04 } from './i18n/base/messages-contribute-04';
import { m_messages_features_01 } from './i18n/base/messages-features-01';
import { m_messages_features_catalog_01 } from './i18n/base/messages-features-catalog-01';
import { m_messages_features_catalog_02 } from './i18n/base/messages-features-catalog-02';
import { m_messages_09 } from './i18n/base/messages-09';
import { m_messages_10 } from './i18n/base/messages-10';
import { m_messages_profile_01 } from './i18n/base/messages-profile-01';
import { m_messages_profile_02 } from './i18n/base/messages-profile-02';
import { m_messages_11 } from './i18n/base/messages-11';
import { m_messages_12 } from './i18n/base/messages-12';
import { m_messages_13 } from './i18n/base/messages-13';
import { m_messages_fund_01 } from './i18n/base/messages-fund-01';
import { m_messages_fund_02 } from './i18n/base/messages-fund-02';
import { m_messages_14 } from './i18n/base/messages-14';
import { m_messages_15 } from './i18n/base/messages-15';
import { m_messages_16 } from './i18n/base/messages-16';

export const baseTranslations = {
  ...m_messages_01,
  ...m_messages_02,
  "settings": { ...m_messages_settings_01, ...m_messages_settings_02, ...m_messages_settings_03, },
  ...m_messages_03,
  ...m_messages_04,
  ...m_messages_05,
  "happiness": { ...m_messages_happiness_01, ...m_messages_happiness_02, ...m_messages_happiness_03, },
  ...m_messages_06,
  ...m_messages_07,
  ...m_messages_08,
  "contribute": { ...m_messages_contribute_01, ...m_messages_contribute_02, ...m_messages_contribute_03, ...m_messages_contribute_04, },
  "features": { ...m_messages_features_01, "catalog": { ...m_messages_features_catalog_01, ...m_messages_features_catalog_02, }, },
  ...m_messages_09,
  ...m_messages_10,
  "profile": { ...m_messages_profile_01, ...m_messages_profile_02, },
  ...m_messages_11,
  ...m_messages_12,
  ...m_messages_13,
  "fund": { ...m_messages_fund_01, ...m_messages_fund_02, },
  ...m_messages_14,
  ...m_messages_15,
  ...m_messages_16,
} as const;

export type BaseTranslations = typeof baseTranslations;
