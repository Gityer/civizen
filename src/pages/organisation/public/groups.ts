import type { PublicFunction } from '@/lib/public-functions';

/** i18n keys for the divisions of the model (the 10 UN COFOG divisions, Civizen itself, and "not sure"). */
export const DIVISION_KEYS: Record<string, string> = {
  '01': 'organisation.public.divisions.d01',
  '02': 'organisation.public.divisions.d02',
  '03': 'organisation.public.divisions.d03',
  '04': 'organisation.public.divisions.d04',
  '05': 'organisation.public.divisions.d05',
  '06': 'organisation.public.divisions.d06',
  '07': 'organisation.public.divisions.d07',
  '08': 'organisation.public.divisions.d08',
  '09': 'organisation.public.divisions.d09',
  '10': 'organisation.public.divisions.d10',
  civizen: 'organisation.public.divisions.civizen',
  unsure: 'organisation.public.divisions.unsure',
};

/** Functions grouped by division, in catalogue order. */
export function byDivision(functions: readonly PublicFunction[]): Array<{ code: string; name: string; functions: PublicFunction[] }> {
  const groups: Array<{ code: string; name: string; functions: PublicFunction[] }> = [];
  for (const fn of functions) {
    let group = groups.find((item) => item.code === fn.divisionCode);
    if (!group) {
      group = { code: fn.divisionCode, name: fn.divisionName, functions: [] };
      groups.push(group);
    }
    group.functions.push(fn);
  }
  return groups;
}
