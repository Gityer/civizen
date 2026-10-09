import type { MatterType } from '@/lib/matters';

export type PublicMattersFilterValue = {
  search: string;
  areaNodeId: string;
  scopeCountryCode: string;
  matterType: '' | MatterType;
};

export const EMPTY_PUBLIC_MATTERS_FILTER: PublicMattersFilterValue = {
  search: '',
  areaNodeId: '',
  scopeCountryCode: '',
  matterType: '',
};

export function isEmptyPublicMattersFilter(value: PublicMattersFilterValue): boolean {
  return !value.search.trim() && !value.areaNodeId && !value.scopeCountryCode && !value.matterType;
}
