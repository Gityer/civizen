import type { LawEntry } from './law-catalog';

/** The law library entries; the types and facet helpers live in `law-catalog.ts`. */
export const lawCatalog: LawEntry[] = [
  {
    id: 'udhr',
    track: 'civil',
    domain: 'Human rights',
    jurisdiction: 'United Nations',
    instrument: 'Universal Declaration of Human Rights',
    title: 'Universal Declaration of Human Rights',
    summary:
      'A foundational human-rights instrument organizing civil, political, social, and cultural rights into article-level principles.',
    sections: [
      {
        id: 'udhr-foundation',
        title: 'Foundational dignity and equality',
        summary: 'Core principles that frame rights as universal, equal, and grounded in human dignity.',
        articles: [
          { id: 'udhr-art-1', label: 'Article 1', summary: 'Affirms freedom, dignity, and equality for all people.' },
          { id: 'udhr-art-2', label: 'Article 2', summary: 'Protects equal enjoyment of rights without discrimination.' },
        ],
      },
      {
        id: 'udhr-liberties',
        title: 'Civil and political liberties',
        summary: 'Rights relating to life, liberty, security, participation, and legal protection.',
        articles: [
          { id: 'udhr-art-3', label: 'Article 3', summary: 'Recognizes the right to life, liberty, and security of person.' },
          { id: 'udhr-art-10', label: 'Article 10', summary: 'Guarantees a fair and public hearing by an independent tribunal.' },
          { id: 'udhr-art-21', label: 'Article 21', summary: 'Protects participation in government and equal access to public service.' },
        ],
      },
    ],
  },
  {
    id: 'iccpr',
    track: 'civil',
    domain: 'Civil and political rights',
    jurisdiction: 'United Nations',
    instrument: 'International Covenant on Civil and Political Rights',
    title: 'International Covenant on Civil and Political Rights',
    summary:
      'A binding international covenant detailing civil and political protections, state duties, and limits on interference.',
    sections: [
      {
        id: 'iccpr-obligations',
        title: 'State obligations',
        summary: 'Articles describing how states must respect and ensure protected rights.',
        articles: [
          { id: 'iccpr-art-2', label: 'Article 2', summary: 'Requires states to respect and ensure covenant rights and provide remedies.' },
          { id: 'iccpr-art-4', label: 'Article 4', summary: 'Defines the limits of derogation during emergencies.' },
        ],
      },
      {
        id: 'iccpr-remedies',
        title: 'Liberties and remedies',
        summary: 'Articles dealing with liberty, due process, expression, and effective remedies.',
        articles: [
          { id: 'iccpr-art-9', label: 'Article 9', summary: 'Protects liberty and security of person and guards against arbitrary detention.' },
          { id: 'iccpr-art-14', label: 'Article 14', summary: 'Sets out fair-trial rights in criminal and civil proceedings.' },
          { id: 'iccpr-art-19', label: 'Article 19', summary: 'Protects freedom of expression with narrowly framed limits.' },
        ],
      },
    ],
  },
  {
    id: 'rome-statute',
    track: 'criminal',
    domain: 'International criminal justice',
    jurisdiction: 'International Criminal Court',
    instrument: 'Rome Statute of the International Criminal Court',
    title: 'Rome Statute of the International Criminal Court',
    summary:
      'The core statute governing the ICC, including jurisdiction, crimes, procedure, and responsibilities of participants.',
    sections: [
      {
        id: 'rome-jurisdiction',
        title: 'Jurisdiction and admissibility',
        summary: 'Rules defining the Court’s reach and the cases it may hear.',
        articles: [
          { id: 'rome-art-5', label: 'Article 5', summary: 'Lists the crimes within the jurisdiction of the Court.' },
          { id: 'rome-art-12', label: 'Article 12', summary: 'Explains preconditions to the Court’s exercise of jurisdiction.' },
          { id: 'rome-art-17', label: 'Article 17', summary: 'Defines admissibility and the complementarity principle.' },
        ],
      },
      {
        id: 'rome-crimes',
        title: 'Core international crimes',
        summary: 'Definitions and scope of genocide, crimes against humanity, war crimes, and aggression.',
        articles: [
          { id: 'rome-art-6', label: 'Article 6', summary: 'Defines genocide.' },
          { id: 'rome-art-7', label: 'Article 7', summary: 'Defines crimes against humanity.' },
          { id: 'rome-art-8', label: 'Article 8', summary: 'Defines war crimes.' },
        ],
      },
    ],
  },
  {
    id: 'genocide-convention',
    track: 'criminal',
    domain: 'Mass atrocity crimes',
    jurisdiction: 'United Nations',
    instrument: 'Convention on the Prevention and Punishment of the Crime of Genocide',
    title: 'Genocide Convention',
    summary:
      'A treaty defining genocide and establishing state obligations to prevent and punish the crime.',
    sections: [
      {
        id: 'genocide-definition',
        title: 'Definition and punishable acts',
        summary: 'Core treaty provisions describing genocide and related punishable conduct.',
        articles: [
          { id: 'genocide-art-2', label: 'Article II', summary: 'Defines genocide through protected groups and prohibited acts.' },
          { id: 'genocide-art-3', label: 'Article III', summary: 'Lists genocide, conspiracy, incitement, attempt, and complicity as punishable.' },
        ],
      },
      {
        id: 'genocide-enforcement',
        title: 'Prevention and enforcement',
        summary: 'Treaty provisions dealing with domestic action, prosecution, and international responsibility.',
        articles: [
          { id: 'genocide-art-5', label: 'Article V', summary: 'Requires states to enact legislation and provide penalties.' },
          { id: 'genocide-art-6', label: 'Article VI', summary: 'Addresses prosecution before competent tribunals.' },
        ],
      },
    ],
  },
  {
    id: 'icescr',
    track: 'civil',
    domain: 'Economic, social and cultural rights',
    jurisdiction: 'United Nations',
    instrument: 'International Covenant on Economic, Social and Cultural Rights',
    title: 'International Covenant on Economic, Social and Cultural Rights',
    summary:
      'A core human-rights covenant covering work, social protection, health, education, culture, and progressive realization duties.',
    sections: [
      {
        id: 'icescr-progressive-realization',
        title: 'Progressive realization and core duties',
        summary: 'Foundational duties requiring states to take steps, avoid discrimination, and advance rights over time.',
        articles: [
          { id: 'icescr-art-2', label: 'Article 2', summary: 'Requires steps toward realizing covenant rights and guarantees non-discrimination.' },
          { id: 'icescr-art-3', label: 'Article 3', summary: 'Requires equal rights of men and women to enjoy covenant protections.' },
        ],
      },
      {
        id: 'icescr-livelihood-wellbeing-culture',
        title: 'Livelihood, wellbeing, and culture',
        summary: 'Substantive protections for work, living standards, health, education, and cultural participation.',
        articles: [
          { id: 'icescr-art-6', label: 'Article 6', summary: 'Recognizes the right to work and steps supporting full employment.' },
          { id: 'icescr-art-11', label: 'Article 11', summary: 'Recognizes an adequate standard of living, including food, clothing, and housing.' },
          { id: 'icescr-art-12', label: 'Article 12', summary: 'Recognizes the right to the highest attainable standard of physical and mental health.' },
        ],
      },
    ],
  },
  {
    id: 'cedaw',
    track: 'civil',
    domain: 'Equality and non-discrimination',
    jurisdiction: 'United Nations',
    instrument: 'Convention on the Elimination of All Forms of Discrimination against Women',
    title: 'Convention on the Elimination of All Forms of Discrimination against Women',
    summary:
      'A central women’s-rights convention defining discrimination and setting state duties across public, social, and family life.',
    sections: [
      {
        id: 'cedaw-definitions-state-measures',
        title: 'Definitions and state measures',
        summary: 'Core provisions defining discrimination and requiring active state measures for equality.',
        articles: [
          { id: 'cedaw-art-1', label: 'Article 1', summary: 'Defines discrimination against women for the purposes of the convention.' },
          { id: 'cedaw-art-2', label: 'Article 2', summary: 'Requires states to condemn discrimination and pursue policy and legal measures against it.' },
          { id: 'cedaw-art-3', label: 'Article 3', summary: 'Requires measures ensuring women’s full development and advancement.' },
        ],
      },
      {
        id: 'cedaw-public-social-family-equality',
        title: 'Public, social, and family equality',
        summary: 'Provisions on participation, education, employment, health, legal equality, and family life.',
        articles: [
          { id: 'cedaw-art-7', label: 'Article 7', summary: 'Protects women’s rights to political and public participation.' },
          { id: 'cedaw-art-10', label: 'Article 10', summary: 'Protects equality in education.' },
          { id: 'cedaw-art-16', label: 'Article 16', summary: 'Protects equality in marriage and family relations.' },
        ],
      },
    ],
  },
  {
    id: 'crc',
    track: 'civil',
    domain: "Children's rights",
    jurisdiction: 'United Nations',
    instrument: 'Convention on the Rights of the Child',
    title: 'Convention on the Rights of the Child',
    summary:
      'A core children’s-rights convention organizing protection, development, participation, and best-interest principles.',
    sections: [
      {
        id: 'crc-general-principles',
        title: 'General principles',
        summary: 'Foundational articles on non-discrimination, best interests, survival, development, and participation.',
        articles: [
          { id: 'crc-art-2', label: 'Article 2', summary: 'Requires non-discrimination in the enjoyment of children’s rights.' },
          { id: 'crc-art-3', label: 'Article 3', summary: 'Establishes the best interests of the child as a primary consideration.' },
          { id: 'crc-art-12', label: 'Article 12', summary: 'Protects the child’s right to be heard in matters affecting them.' },
        ],
      },
      {
        id: 'crc-protection-development-participation',
        title: 'Protection, development, and participation',
        summary: 'Protections against harm together with rights to health, education, and cultural life.',
        articles: [
          { id: 'crc-art-19', label: 'Article 19', summary: 'Requires protection from abuse, neglect, and violence.' },
          { id: 'crc-art-24', label: 'Article 24', summary: 'Recognizes the child’s right to health and health services.' },
          { id: 'crc-art-28', label: 'Article 28', summary: 'Recognizes the child’s right to education.' },
        ],
      },
    ],
  },
  {
    id: 'cat',
    track: 'criminal',
    domain: 'Torture prohibition and accountability',
    jurisdiction: 'United Nations',
    instrument: 'Convention against Torture and Other Cruel, Inhuman or Degrading Treatment or Punishment',
    title: 'Convention against Torture and Other Cruel, Inhuman or Degrading Treatment or Punishment',
    summary:
      'A treaty prohibiting torture and requiring prevention, investigation, prosecution, and remedies.',
    sections: [
      {
        id: 'cat-definition-and-prevention',
        title: 'Definition and prevention',
        summary: 'Core provisions defining torture and requiring prevention through law and administration.',
        articles: [
          { id: 'cat-art-1', label: 'Article 1', summary: 'Defines torture for the purposes of the convention.' },
          { id: 'cat-art-2', label: 'Article 2', summary: 'Requires effective legislative, administrative, judicial, and other measures to prevent torture.' },
          { id: 'cat-art-4', label: 'Article 4', summary: 'Requires torture offenses to be criminalized under domestic law.' },
        ],
      },
      {
        id: 'cat-investigation-remedy-accountability',
        title: 'Investigation, remedy, and accountability',
        summary: 'Provisions covering investigation, complaints, redress, and exclusion of tainted evidence.',
        articles: [
          { id: 'cat-art-12', label: 'Article 12', summary: 'Requires prompt and impartial investigation where torture is reasonably suspected.' },
          { id: 'cat-art-14', label: 'Article 14', summary: 'Requires redress and enforceable compensation for victims of torture.' },
          { id: 'cat-art-15', label: 'Article 15', summary: 'Excludes statements made through torture from evidence, except against a person accused of torture.' },
        ],
      },
    ],
  },
  {
    id: 'cerd',
    track: 'civil',
    domain: 'Equality and racial non-discrimination',
    jurisdiction: 'United Nations',
    instrument: 'International Convention on the Elimination of All Forms of Racial Discrimination',
    title: 'International Convention on the Elimination of All Forms of Racial Discrimination',
    summary:
      'A core anti-discrimination treaty requiring states to eliminate racial discrimination and promote equality before the law.',
    sections: [
      {
        id: 'cerd-definitions-equality-obligations',
        title: 'Definitions, equality, and obligations',
        summary: 'Foundational provisions defining discrimination and requiring anti-discrimination action.',
        articles: [
          { id: 'cerd-art-1', label: 'Article 1', summary: 'Defines racial discrimination for the purposes of the convention.' },
          { id: 'cerd-art-2', label: 'Article 2', summary: 'Requires states to condemn and eliminate racial discrimination through policy and law.' },
        ],
      },
      {
        id: 'cerd-rights-remedies-hate-prohibition',
        title: 'Rights, remedies, and hate prohibition',
        summary: 'Protections for equality before the law together with action against racist propaganda and organizations.',
        articles: [
          { id: 'cerd-art-5', label: 'Article 5', summary: 'Protects equality before the law across civil, political, economic, social, and cultural rights.' },
          { id: 'cerd-art-4', label: 'Article 4', summary: 'Requires action against racist propaganda and organizations.' },
        ],
      },
    ],
  },
  {
    id: 'crpd',
    track: 'civil',
    domain: 'Disability rights',
    jurisdiction: 'United Nations',
    instrument: 'Convention on the Rights of Persons with Disabilities',
    title: 'Convention on the Rights of Persons with Disabilities',
    summary:
      'A disability-rights convention clarifying equality, accessibility, legal capacity, inclusion, and participation duties.',
    sections: [
      {
        id: 'crpd-general-principles-equality',
        title: 'General principles and equality',
        summary: 'Foundational provisions on equality, non-discrimination, and disability-inclusive interpretation.',
        articles: [
          { id: 'crpd-art-1', label: 'Article 1', summary: 'States the convention’s purpose of promoting equal enjoyment of rights by persons with disabilities.' },
          { id: 'crpd-art-3', label: 'Article 3', summary: 'Sets out the convention’s general principles, including dignity, autonomy, and participation.' },
          { id: 'crpd-art-5', label: 'Article 5', summary: 'Protects equality and non-discrimination on the basis of disability.' },
        ],
      },
      {
        id: 'crpd-capacity-accessibility-participation',
        title: 'Capacity, accessibility, and participation',
        summary: 'Core protections for legal capacity, accessibility, independent living, and public participation.',
        articles: [
          { id: 'crpd-art-9', label: 'Article 9', summary: 'Requires accessibility across the physical environment, transportation, information, and services.' },
          { id: 'crpd-art-12', label: 'Article 12', summary: 'Recognizes equal legal capacity for persons with disabilities.' },
          { id: 'crpd-art-19', label: 'Article 19', summary: 'Protects independent living and inclusion in the community.' },
        ],
      },
    ],
  },
  {
    id: 'icpped',
    track: 'criminal',
    domain: 'Enforced disappearance accountability',
    jurisdiction: 'United Nations',
    instrument: 'International Convention for the Protection of All Persons from Enforced Disappearance',
    title: 'International Convention for the Protection of All Persons from Enforced Disappearance',
    summary:
      'A treaty prohibiting enforced disappearance and requiring prevention, investigation, victim protection, and truth-related obligations.',
    sections: [
      {
        id: 'icpped-prohibition-and-definition',
        title: 'Prohibition and definition',
        summary: 'Core provisions prohibiting enforced disappearance and defining the conduct.',
        articles: [
          { id: 'icpped-art-1', label: 'Article 1', summary: 'Absolutely prohibits enforced disappearance.' },
          { id: 'icpped-art-2', label: 'Article 2', summary: 'Defines enforced disappearance for the purposes of the convention.' },
        ],
      },
      {
        id: 'icpped-search-truth-remedy',
        title: 'Search, truth, and remedy',
        summary: 'Provisions on investigation, locating disappeared persons, victim rights, and redress.',
        articles: [
          { id: 'icpped-art-24', label: 'Article 24', summary: 'Defines victims and protects rights to truth, reparation, and organization.' },
          { id: 'icpped-art-25', label: 'Article 25', summary: 'Addresses the wrongful removal of children linked to enforced disappearance.' },
        ],
      },
    ],
  },
  {
    id: 'refugee-convention',
    track: 'civil',
    domain: 'Refugee protection',
    jurisdiction: 'United Nations',
    instrument: 'Convention relating to the Status of Refugees',
    title: 'Convention relating to the Status of Refugees',
    summary:
      'A foundational refugee-protection treaty defining refugee status and key civil, social, and non-refoulement protections.',
    sections: [
      {
        id: 'refugee-status-definition-non-refoulement',
        title: 'Status, definition, and non-refoulement',
        summary: 'Core provisions defining refugee status and protection against return to persecution.',
        articles: [
          { id: 'refugee-art-1', label: 'Article 1', summary: 'Defines who qualifies as a refugee under the convention.' },
          { id: 'refugee-art-33', label: 'Article 33', summary: 'Protects against expulsion or return to territories where life or freedom would be threatened.' },
        ],
      },
      {
        id: 'refugee-rights-work-courts-welfare',
        title: 'Rights to work, courts, and welfare',
        summary: 'Key protections for legal standing, employment, public relief, and education.',
        articles: [
          { id: 'refugee-art-16', label: 'Article 16', summary: 'Protects access to courts.' },
          { id: 'refugee-art-17', label: 'Article 17', summary: 'Protects wage-earning employment rights under the convention framework.' },
          { id: 'refugee-art-22', label: 'Article 22', summary: 'Protects access to public education.' },
        ],
      },
    ],
  },
];
