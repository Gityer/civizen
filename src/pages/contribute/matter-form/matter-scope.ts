import type { MatterScopeKind } from '@/lib/matters';

export type MatterScopeValue = {
  scopeKind: MatterScopeKind;
  scopeCountryCode: string;
  scopeRegionCode: string;
  scopeLocalityCode: string;
};

export const EMPTY_MATTER_SCOPE: MatterScopeValue = {
  scopeKind: 'global',
  scopeCountryCode: '',
  scopeRegionCode: '',
  scopeLocalityCode: '',
};

/** Which scope field is still missing before a Matter can be submitted (i18n key), or null. */
export function matterScopeMissingKey(value: MatterScopeValue): string | null {
  if (value.scopeKind === 'global') return null;
  if (!value.scopeCountryCode.trim()) return 'contribute.matters.scopeCountryRequired';
  if ((value.scopeKind === 'region' || value.scopeKind === 'locality') && !value.scopeRegionCode.trim()) {
    return 'contribute.matters.scopeRegionRequired';
  }
  if (value.scopeKind === 'locality' && !value.scopeLocalityCode.trim()) return 'contribute.matters.scopeLocalityRequired';
  return null;
}

/** What the server stores for a scope: codes only for the levels the kind needs. */
export function matterScopeForSubmit(value: MatterScopeValue): {
  scopeKind: MatterScopeKind;
  scopeCountryCode: string | null;
  scopeRegionCode: string | null;
  scopeLocalityCode: string | null;
} {
  const regional = value.scopeKind === 'region' || value.scopeKind === 'locality';
  return {
    scopeKind: value.scopeKind,
    scopeCountryCode: value.scopeKind === 'global' ? null : value.scopeCountryCode.trim().toUpperCase() || null,
    scopeRegionCode: regional ? value.scopeRegionCode.trim() || null : null,
    scopeLocalityCode: value.scopeKind === 'locality' ? value.scopeLocalityCode.trim() || null : null,
  };
}
