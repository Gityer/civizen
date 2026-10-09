import { lawCatalog } from './law-catalog-data';

export type LawTrack = 'civil' | 'criminal';
export type LawContributionType = 'source' | 'structure' | 'summary';

export type LawArticle = {
  id: string;
  label: string;
  summary: string;
};

export type LawSection = {
  id: string;
  title: string;
  summary: string;
  articles: LawArticle[];
};

export type LawEntry = {
  id: string;
  track: LawTrack;
  domain: string;
  jurisdiction: string;
  instrument: string;
  title: string;
  summary: string;
  sections: LawSection[];
};


export function getLawCatalogFacets() {
  return {
    tracks: ['all', 'civil', 'criminal'] as const,
    jurisdictions: ['all', ...Array.from(new Set(lawCatalog.map((entry) => entry.jurisdiction))).sort()] as const,
    domains: ['all', ...Array.from(new Set(lawCatalog.map((entry) => entry.domain))).sort()] as const,
    instruments: ['all', ...Array.from(new Set(lawCatalog.map((entry) => entry.instrument))).sort()] as const,
  };
}

export { lawCatalog };
