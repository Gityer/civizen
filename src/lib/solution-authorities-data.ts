import type { SolutionAuthority } from './solution-authorities';

/** The authority catalog behind Solutions routing; the types and lookups live in `solution-authorities.ts`. */
export const SOLUTION_AUTHORITIES: readonly SolutionAuthority[] = [
  {
    id: 'executive_office',
    name: 'Executive / Head of Government Office',
    tier: 'executive',
    responsibilities:
      'Whole-of-government coordination, cabinet priorities, cross-ministry crises, and matters that do not fit a single department.',
    keywords: ['president', 'prime minister', 'cabinet', 'executive', 'government-wide', 'cross-ministry'],
    relatedProfessionIds: ['governance'],
    sortOrder: 10,
  },
  {
    id: 'interior',
    name: 'Interior / Home Affairs',
    tier: 'national',
    responsibilities:
      'Domestic administration, civil registry, internal security policy, policing oversight (where applicable), and public order frameworks.',
    keywords: ['interior', 'home affairs', 'civil registry', 'id card', 'passport office', 'police oversight', 'public order'],
    relatedProfessionIds: ['governance', 'law'],
    sortOrder: 20,
  },
  {
    id: 'foreign_affairs',
    name: 'Foreign Affairs / Diplomacy',
    tier: 'national',
    responsibilities:
      'International relations, embassies, treaties, consular assistance abroad, and diplomatic coordination.',
    keywords: ['foreign', 'diplomacy', 'embassy', 'consular', 'treaty', 'visa abroad', 'international relations'],
    relatedProfessionIds: ['governance', 'law'],
    sortOrder: 30,
  },
  {
    id: 'defense',
    name: 'Defense / National Security',
    tier: 'national',
    responsibilities:
      'Armed forces, national defense policy, and high-level security coordination (not routine local policing).',
    keywords: ['defense', 'defence', 'military', 'armed forces', 'national security', 'veterans combat'],
    relatedProfessionIds: ['governance'],
    sortOrder: 40,
  },
  {
    id: 'justice',
    name: 'Justice / Attorney General',
    tier: 'national',
    responsibilities:
      'Criminal and civil justice policy, prosecutions (where executive), legal reform, and access-to-justice programs.',
    keywords: ['justice', 'attorney general', 'prosecutor', 'criminal', 'lawsuit', 'legal reform', 'courts policy'],
    relatedProfessionIds: ['law'],
    sortOrder: 50,
  },
  {
    id: 'judiciary',
    name: 'Judiciary / Courts',
    tier: 'independent',
    responsibilities:
      'Independent courts, case administration, judicial procedure, and court access (separate from political ministries).',
    keywords: ['court', 'judge', 'judiciary', 'hearing', 'trial', 'bailiff', 'court clerk'],
    relatedProfessionIds: ['law'],
    sortOrder: 55,
  },
  {
    id: 'finance',
    name: 'Finance / Treasury',
    tier: 'national',
    responsibilities:
      'Public budget, debt, fiscal policy, and financial management of the state.',
    keywords: ['treasury', 'budget', 'fiscal', 'public debt', 'finance ministry', 'appropriations'],
    relatedProfessionIds: ['finance', 'governance'],
    sortOrder: 60,
  },
  {
    id: 'taxation',
    name: 'Taxation / Revenue Authority',
    tier: 'national',
    responsibilities:
      'Tax collection, tax compliance, customs duties (where combined), and taxpayer services.',
    keywords: ['tax', 'taxation', 'irs', 'revenue', 'vat', 'customs duty', 'taxpayer'],
    relatedProfessionIds: ['finance', 'law'],
    sortOrder: 65,
  },
  {
    id: 'economy',
    name: 'Economy / Commerce / Trade',
    tier: 'national',
    responsibilities:
      'Business regulation, trade policy, competition, small business support, and commercial standards.',
    keywords: ['commerce', 'trade', 'business license', 'competition', 'market regulation', 'export', 'import'],
    relatedProfessionIds: ['finance', 'governance'],
    sortOrder: 70,
  },
  {
    id: 'labor',
    name: 'Labor / Employment',
    tier: 'national',
    responsibilities:
      'Workplace standards, unemployment support, labor disputes frameworks, and workforce programs.',
    keywords: ['labor', 'labour', 'employment', 'wage', 'workplace', 'unemployment', 'union', 'worker rights'],
    relatedProfessionIds: ['law', 'governance'],
    sortOrder: 80,
  },
  {
    id: 'health',
    name: 'Health / Public Health',
    tier: 'national',
    responsibilities:
      'Hospitals policy, public health, epidemics, medical licensing frameworks, and health coverage programs.',
    keywords: ['health', 'hospital', 'clinic', 'doctor', 'epidemic', 'vaccine', 'public health', 'mental health'],
    relatedProfessionIds: ['medicine'],
    sortOrder: 90,
  },
  {
    id: 'education',
    name: 'Education',
    tier: 'national',
    responsibilities:
      'Primary and secondary schools, curricula standards, teachers, and student services policy.',
    keywords: ['school', 'education', 'teacher', 'curriculum', 'student', 'kindergarten', 'high school'],
    relatedProfessionIds: ['education'],
    sortOrder: 100,
  },
  {
    id: 'higher_education',
    name: 'Higher Education / Science / Research',
    tier: 'national',
    responsibilities:
      'Universities, research funding, scientific policy, and advanced skills programs.',
    keywords: ['university', 'college', 'research', 'science ministry', 'scholarship', 'phd'],
    relatedProfessionIds: ['education'],
    sortOrder: 105,
  },
  {
    id: 'transport',
    name: 'Transportation / Roads / Transit',
    tier: 'national',
    responsibilities:
      'Roads, rail, aviation policy, public transit, traffic safety, and transport licensing.',
    keywords: ['road', 'highway', 'transit', 'bus', 'train', 'airport', 'traffic', 'dmv', 'driving license'],
    relatedProfessionIds: ['governance'],
    sortOrder: 110,
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure / Public Works',
    tier: 'national',
    responsibilities:
      'Major public works, bridges, ports, and capital infrastructure programs.',
    keywords: ['infrastructure', 'bridge', 'public works', 'construction project', 'port', 'capital project'],
    relatedProfessionIds: ['governance'],
    sortOrder: 115,
  },
  {
    id: 'housing',
    name: 'Housing / Urban Development',
    tier: 'national',
    responsibilities:
      'Housing policy, affordable housing, urban renewal, and building standards at national level.',
    keywords: ['housing', 'apartment', 'rent', 'homeless', 'urban development', 'building code national'],
    relatedProfessionIds: ['governance', 'law'],
    sortOrder: 120,
  },
  {
    id: 'environment',
    name: 'Environment / Climate',
    tier: 'national',
    responsibilities:
      'Environmental protection, pollution control, climate policy, and conservation.',
    keywords: ['environment', 'pollution', 'climate', 'emissions', 'conservation', 'wildlife', 'recycling'],
    relatedProfessionIds: ['governance'],
    sortOrder: 130,
  },
  {
    id: 'energy',
    name: 'Energy',
    tier: 'national',
    responsibilities:
      'Electricity, fuel, energy markets, grid reliability, and renewable energy policy.',
    keywords: ['energy', 'electricity', 'power outage', 'grid', 'fuel', 'renewable', 'oil gas'],
    relatedProfessionIds: ['governance'],
    sortOrder: 135,
  },
  {
    id: 'agriculture',
    name: 'Agriculture / Food',
    tier: 'national',
    responsibilities:
      'Farming policy, food safety standards, rural development, and agricultural markets.',
    keywords: ['agriculture', 'farm', 'food safety', 'crop', 'livestock', 'rural'],
    relatedProfessionIds: ['governance'],
    sortOrder: 140,
  },
  {
    id: 'water',
    name: 'Water Resources',
    tier: 'national',
    responsibilities:
      'Drinking water policy, irrigation, watersheds, and water quality standards.',
    keywords: ['water', 'drought', 'irrigation', 'reservoir', 'drinking water', 'watershed'],
    relatedProfessionIds: ['governance'],
    sortOrder: 145,
  },
  {
    id: 'social_welfare',
    name: 'Social Welfare / Social Services',
    tier: 'national',
    responsibilities:
      'Social assistance, disability support, family benefits, and social protection programs.',
    keywords: ['welfare', 'social services', 'benefits', 'disability', 'poverty', 'food stamps', 'social assistance'],
    relatedProfessionIds: ['governance', 'medicine'],
    sortOrder: 150,
  },
  {
    id: 'culture',
    name: 'Culture / Heritage',
    tier: 'national',
    responsibilities:
      'Cultural institutions, heritage protection, museums, and arts policy.',
    keywords: ['culture', 'heritage', 'museum', 'arts', 'monument', 'language policy'],
    relatedProfessionIds: ['education', 'governance'],
    sortOrder: 160,
  },
  {
    id: 'communications',
    name: 'Communications / Digital / Media',
    tier: 'national',
    responsibilities:
      'Telecom regulation, internet policy, broadcasting, and digital public services.',
    keywords: ['telecom', 'internet', 'broadband', 'broadcast', 'media regulator', 'digital government'],
    relatedProfessionIds: ['governance'],
    sortOrder: 170,
  },
  {
    id: 'immigration',
    name: 'Immigration / Citizenship Affairs',
    tier: 'national',
    responsibilities:
      'Immigration status, residence permits, naturalization procedures, and border entry policy.',
    keywords: ['immigration', 'visa', 'asylum', 'citizenship application', 'residence permit', 'border'],
    relatedProfessionIds: ['law', 'governance'],
    sortOrder: 180,
  },
  {
    id: 'emergency',
    name: 'Emergency Management / Civil Protection',
    tier: 'national',
    responsibilities:
      'Disaster response, civil protection, emergency preparedness, and crisis coordination.',
    keywords: ['emergency', 'disaster', 'earthquake', 'flood response', 'civil protection', 'evacuation'],
    relatedProfessionIds: ['governance', 'medicine'],
    sortOrder: 190,
  },
  {
    id: 'consumer',
    name: 'Consumer Protection',
    tier: 'national',
    responsibilities:
      'Consumer rights, product safety, unfair commercial practices, and complaint handling.',
    keywords: ['consumer', 'scam', 'fraud purchase', 'product safety', 'refund', 'warranty'],
    relatedProfessionIds: ['law', 'finance'],
    sortOrder: 200,
  },
  {
    id: 'planning',
    name: 'Planning / Land Use',
    tier: 'regional',
    responsibilities:
      'Zoning, land-use permits, regional planning, and development approvals.',
    keywords: ['zoning', 'land use', 'planning permit', 'development approval', 'master plan'],
    relatedProfessionIds: ['governance', 'law'],
    sortOrder: 210,
  },
  {
    id: 'municipal',
    name: 'Municipal / Local Government',
    tier: 'local',
    responsibilities:
      'City and local services: local roads, waste, local permits, neighborhood amenities, and municipal bylaws.',
    keywords: ['city hall', 'mayor', 'municipal', 'local council', 'neighborhood', 'trash', 'streetlight', 'park local'],
    relatedProfessionIds: ['governance'],
    sortOrder: 220,
  },
  {
    id: 'police',
    name: 'Police / Law Enforcement',
    tier: 'local',
    responsibilities:
      'Local law enforcement operations, crime reports, community policing, and public safety response.',
    keywords: ['police', 'crime', 'theft', 'assault report', '911', 'law enforcement', 'patrol'],
    relatedProfessionIds: ['law', 'governance'],
    sortOrder: 230,
  },
  {
    id: 'utilities',
    name: 'Utilities / Public Services',
    tier: 'local',
    responsibilities:
      'Water/sewer/electric utility service quality, billing disputes with public utilities, and service outages.',
    keywords: ['utility', 'sewer', 'water bill', 'power company', 'outage', 'meter'],
    relatedProfessionIds: ['governance'],
    sortOrder: 240,
  },
  {
    id: 'elections',
    name: 'Elections / Electoral Commission',
    tier: 'independent',
    responsibilities:
      'Election administration, voter registration, ballots, and electoral integrity processes.',
    keywords: ['election', 'voting', 'ballot', 'voter registration', 'electoral commission', 'polling'],
    relatedProfessionIds: ['governance', 'law'],
    sortOrder: 250,
  },
  {
    id: 'ombudsman',
    name: 'Ombudsman / Anti-Corruption / Oversight',
    tier: 'independent',
    responsibilities:
      'Complaint review against public bodies, integrity investigations, and citizen oversight channels.',
    keywords: ['ombudsman', 'corruption', 'bribery', 'integrity', 'whistleblower', 'maladministration'],
    relatedProfessionIds: ['law', 'governance'],
    sortOrder: 260,
  },
  {
    id: 'veterans',
    name: 'Veterans Affairs',
    tier: 'national',
    responsibilities:
      'Veterans benefits, rehabilitation, and support services for former service members.',
    keywords: ['veteran', 'veterans affairs', 'military pension', 'service member support'],
    relatedProfessionIds: ['medicine', 'governance'],
    sortOrder: 270,
  },
  {
    id: 'family_youth',
    name: 'Family / Youth / Gender Equality',
    tier: 'national',
    responsibilities:
      'Family policy, youth programs, gender equality frameworks, and related social inclusion.',
    keywords: ['family policy', 'youth', 'gender equality', 'child protection', 'domestic violence support'],
    relatedProfessionIds: ['governance', 'medicine', 'law'],
    sortOrder: 280,
  },
  {
    id: 'tourism_sport',
    name: 'Tourism / Sport',
    tier: 'national',
    responsibilities:
      'Tourism promotion, hospitality standards, and national sports policy.',
    keywords: ['tourism', 'hotel', 'visitor', 'sport', 'stadium', 'athletics'],
    relatedProfessionIds: ['governance'],
    sortOrder: 290,
  },
  {
    id: 'natural_resources',
    name: 'Natural Resources / Mining / Oceans',
    tier: 'national',
    responsibilities:
      'Mining, forestry, fisheries, oceans, and extractive-resource licensing.',
    keywords: ['mining', 'forestry', 'fisheries', 'oceans', 'natural resources', 'extractive'],
    relatedProfessionIds: ['governance'],
    sortOrder: 300,
  },
  {
    id: 'civizen_network',
    name: 'Civizen Network Stewardship',
    tier: 'civizen',
    responsibilities:
      'Issues about the Civizen platform, member credentials, community charter processes, and voluntary network governance — not a state ministry.',
    keywords: ['civizen', 'platform bug', 'member id', 'world citizen card', 'nela', 'civizen app'],
    relatedProfessionIds: ['governance'],
    sortOrder: 900,
  },
] as const;
