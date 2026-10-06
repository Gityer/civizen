import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { INSTITUTIONAL_DOCS, getInstitutionalDocByPath } from '@/lib/institutional-docs';
import { baseTranslations } from '@/lib/i18n.base';

const repoRoot = path.resolve(__dirname, '../..');

function readRepo(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('purpose-alignment correction v0.5', () => {
  const worldCitizenship = getInstitutionalDocByPath('/about/world-citizenship');
  const pathway = getInstitutionalDocByPath('/about/planetary-citizenship-pathway');
  const communityCharter = getInstitutionalDocByPath('/governance/charter');

  it('registers world-citizenship with present-status and long-term-aim sections', () => {
    expect(worldCitizenship).toBeTruthy();
    expect(worldCitizenship!.markdown).toMatch(/World Citizenship Today/i);
    expect(worldCitizenship!.markdown).toMatch(/Long-Term Aim/i);
    expect(worldCitizenship!.markdown).toMatch(/recognized(?: form of)? planetary citizenship/i);
    expect(worldCitizenship!.markdown).not.toMatch(/community activation/i);
  });

  it('lists the planetary citizenship pathway in the documents index and at its public route', () => {
    expect(pathway).toBeTruthy();
    expect(pathway!.path).toBe('/about/planetary-citizenship-pathway');
    expect(INSTITUTIONAL_DOCS.some((doc) => doc.id === 'planetary-citizenship-pathway')).toBe(true);
    expect(pathway!.markdown).toMatch(/From Voluntary World Citizenship to Recognized Planetary Citizenship/);
    expect(pathway!.markdown).toMatch(/Stage 6/i);
  });

  it('keeps onboarding copy with current status and long-term destination', () => {
    const onboarding = baseTranslations.onboarding;
    expect(onboarding.longTermTitle).toMatch(/Where this is intended to lead/i);
    expect(onboarding.longTermDescription).toMatch(/recognized planetary citizenship/i);
    expect(onboarding.pillarCitizenshipDescription).toMatch(/today/i);
    expect(onboarding.pillarCitizenshipDescription).toMatch(/pathway toward/i);
    expect(onboarding.faqGovernmentAnswer).toMatch(/currently a voluntary civic network/i);
    expect(onboarding.faqGovernmentAnswer).toMatch(/long-term mission/i);
    expect(onboarding.faqRecognitionQuestion).toMatch(/officially recognized/i);
    expect(onboarding.faqRecognitionAnswer).toMatch(/lawful public or international processes/i);
  });

  it('uses temporal wording in reusable citizenship notices', () => {
    const notice = baseTranslations.worldCitizenshipNotice;
    expect(notice.credential).toMatch(/currently/i);
    expect(notice.readiness).toMatch(/does not by itself/i);
    expect(notice.short).toMatch(/currently/i);
    expect(notice.short).toMatch(/planetary citizenship/i);
  });

  it('updates civic voting notice for current-stage voluntary network processes', () => {
    expect(baseTranslations.civicVoting.institutionalNotice).toMatch(/currently operate as voluntary network processes/i);
    expect(baseTranslations.civicVoting.institutionalNotice).toMatch(/do not by themselves/i);
  });

  it('includes Future Institutional Evolution in the Community Governance Charter', () => {
    expect(communityCharter).toBeTruthy();
    expect(communityCharter!.markdown).toMatch(/## Future Institutional Evolution/);
  });

  it('rejects permanent-sounding prohibited phrases in active user-facing sources', () => {
    const sources = [
      readRepo('README.md'),
      ...readdirSync(path.join(repoRoot, 'src/lib/i18n/base')).map((file) => readRepo('src/lib/i18n/base/' + file)),
      worldCitizenship!.markdown,
      pathway!.markdown,
      communityCharter!.markdown,
      readRepo('docs/00-foundation/the-civizen-charter.md'),
      readRepo('docs/02-policies/citizenship-and-verification/citizenship-and-verification-policy-v0.1.md'),
    ].join('\n');

    expect(sources).not.toMatch(/Citizenship is an internal platform status only\./);
    expect(sources).not.toMatch(/Civizen is not a nationality system(?![\s\S]{0,120}currently)/i);
  });
});
