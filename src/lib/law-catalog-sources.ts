/** Official text of each catalog instrument, so the Law library always links to the source (Phase 5 step 5.3). */
export const LAW_SOURCE_URLS: Record<string, string> = {
  udhr: 'https://www.un.org/en/about-us/universal-declaration-of-human-rights',
  iccpr: 'https://www.ohchr.org/en/instruments-mechanisms/instruments/international-covenant-civil-and-political-rights',
  'rome-statute': 'https://www.icc-cpi.int/resource-library',
  'genocide-convention': 'https://www.ohchr.org/en/instruments-mechanisms/instruments/convention-prevention-and-punishment-crime-genocide',
  icescr: 'https://www.ohchr.org/en/instruments-mechanisms/instruments/international-covenant-economic-social-and-cultural-rights',
  cedaw: 'https://www.ohchr.org/en/instruments-mechanisms/instruments/convention-elimination-all-forms-discrimination-against-women',
  crc: 'https://www.ohchr.org/en/instruments-mechanisms/instruments/convention-rights-child',
  cat: 'https://www.ohchr.org/en/instruments-mechanisms/instruments/convention-against-torture-and-other-cruel-inhuman-or-degrading',
  cerd: 'https://www.ohchr.org/en/instruments-mechanisms/instruments/international-convention-elimination-all-forms-racial',
  crpd: 'https://www.ohchr.org/en/instruments-mechanisms/instruments/convention-rights-persons-disabilities',
  icpped: 'https://www.ohchr.org/en/instruments-mechanisms/instruments/international-convention-protection-all-persons-enforced',
  'refugee-convention': 'https://www.unhcr.org/about-unhcr/overview/1951-refugee-convention',
};

export function lawSourceUrl(idOrSlug: string | null | undefined): string | null {
  return idOrSlug ? LAW_SOURCE_URLS[idOrSlug] ?? null : null;
}
