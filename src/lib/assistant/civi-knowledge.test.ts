import { describe, expect, it } from 'vitest';

import { APP_VERSION } from '@/lib/app-release';
import { ASSISTANT_CAPABILITIES, ASSISTANT_FAQ } from '@/lib/assistant/catalog';
import { KNOWLEDGE_PACK } from '@/lib/assistant/generated/knowledge-pack';
import { prepareCiviTurn, SCOPE_REFUSAL, UNVERIFIED } from '@/lib/assistant/orchestrator';
import { resolveConversationalQuery } from '@/lib/assistant/query-rewrite';
import { retrieveKnowledge } from '@/lib/assistant/retrieval';
import { classifyRequest } from '@/lib/assistant/routing';
import type { ExternalResourceAdapter, HistoryTurn, KnowledgePack } from '@/lib/assistant/types';
import { validateAssistantCatalog } from '@/lib/assistant/validate';

const trackingAdapter = (calls: string[]): ExternalResourceAdapter => ({
  search: (query) => {
    calls.push(query);
    return 'external-hit';
  },
});

function turn(text: string, history: HistoryTurn[] = []): HistoryTurn[] {
  return [...history, { role: 'user', content: text }];
}

describe('assistant catalog validation', () => {
  it('rejects duplicates, missing sources, and invalid statuses', () => {
    const issues = validateAssistantCatalog(KNOWLEDGE_PACK);
    expect(issues).toEqual([]);
  });

  it('keeps generated knowledge aligned with this app version', () => {
    expect(KNOWLEDGE_PACK.meta.appVersion).toBe(APP_VERSION);
    expect(KNOWLEDGE_PACK.meta.sourceFingerprint).not.toBe('stale');
    expect(KNOWLEDGE_PACK.faq).toHaveLength(ASSISTANT_FAQ.length);
    expect(KNOWLEDGE_PACK.capabilities).toHaveLength(ASSISTANT_CAPABILITIES.length);
    expect(KNOWLEDGE_PACK.chunks.length).toBeGreaterThan(20);
  });
});

describe('Civi canonical identity', () => {
  it('answers a one-sentence identity question from the canonical definition', () => {
    const prep = prepareCiviTurn(turn("What's Civizen in one sentence?"));
    expect(prep.diagnostics.matchedFaqId).toBe('what_is_civizen');
    expect(prep.groundedAnswer).toContain(
      'open participatory system for organizing how humanity learns, contributes, collaborates, governs, shares resources, solves common challenges',
    );
    expect(prep.diagnostics.matchedCapabilityIds).toHaveLength(0);
    expect(prep.groundedAnswer).not.toMatch(/mainly a (challenge|project)/i);
  });

  it('explains that Civi is available without an account', () => {
    const prep = prepareCiviTurn(turn('Who is Civi?'));
    expect(prep.diagnostics.matchedFaqId).toBe('who_is_civi');
    expect(prep.groundedAnswer).toMatch(/without creating an account/i);
  });

  it('answers current capability from implemented surfaces, not the identity sentence alone', () => {
    const prep = prepareCiviTurn(turn('What can I do in Civizen right now?'));
    expect(prep.diagnostics.matchedFaqId).toBe('what_can_i_do_in_civizen_now');
    expect(prep.groundedAnswer).toMatch(/Home/i);
    expect(prep.groundedAnswer).toMatch(/Contribute/i);
    expect(prep.groundedAnswer).not.toBe(
      'Civizen is an open participatory system for organizing how humanity learns, contributes, collaborates, governs, shares resources, solves common challenges, and continuously improves the systems we live and work within.',
    );
  });

  it('does not reduce Civizen to a project collaboration platform', () => {
    const prep = prepareCiviTurn(turn('Is Civizen basically a project collaboration platform?'));
    expect(prep.diagnostics.matchedFaqId).toBe('is_civizen_a_project_collaboration_platform');
    expect(prep.groundedAnswer).toMatch(/^No\./);
    expect(prep.groundedAnswer).toMatch(/one component/i);
    expect(prep.groundedAnswer).toMatch(/broader system/i);
  });
});

describe('Civi knowledge regression', () => {
  it('A — known FAQ for Community Challenges', () => {
    const calls: string[] = [];
    const prep = prepareCiviTurn(turn('What are Community Challenges?'), {
      externalAdapter: trackingAdapter(calls),
    });
    expect(prep.diagnostics.matchedFaqId).toBe('what_are_community_challenges');
    expect(prep.groundedAnswer).toMatch(/Community Challenges/i);
    expect(prep.groundedAnswer).toMatch(/Contribute > Community Challenges/);
    expect(prep.groundedAnswer).not.toMatch(/proposed model/);
    expect(prep.resourcePlan.internalResolution).toBe('sufficient');
    expect(prep.resourcePlan.allowExternalResources).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('B — current capability workflow for Opportunities', () => {
    const prep = prepareCiviTurn(turn('How do I use Opportunities?'));
    expect(prep.diagnostics.matchedCapabilityIds).toContain('opportunities');
    expect(prep.groundedAnswer).toMatch(/Contribute > Opportunities/);
    expect(prep.diagnostics.capabilityStatuses.some((s) => s.id === 'opportunities' && s.status === 'implemented')).toBe(
      true,
    );
  });

  it('C — proposed functionality is not described as live', () => {
    const prep = prepareCiviTurn(turn('What is the Institutional Blueprint in Civizen?'));
    expect(prep.diagnostics.matchedCapabilityIds).toContain('institutional_blueprint');
    expect(prep.groundedAnswer).toMatch(/proposed/i);
    expect(prep.groundedAnswer).not.toMatch(/open Institutional Blueprint from the bottom navigation/i);
  });

  it('D — unknown capability is not invented', () => {
    const calls: string[] = [];
    const prep = prepareCiviTurn(turn('Can Civizen teleport members between cities?'), {
      externalAdapter: trackingAdapter(calls),
    });
    expect(prep.groundedAnswer).toMatch(/couldn['’]t verify/i);
    expect(prep.groundedAnswer).not.toMatch(/yes,? civizen can teleport/i);
    expect(prep.resourcePlan.internalResolution).toBe('insufficient');
    expect(calls).toHaveLength(0);
  });

  it('E — agreement signing uses the current implementation', () => {
    const prep = prepareCiviTurn(turn('How can I sign an agreement with anyone through Civizen?'));
    expect(prep.diagnostics.matchedFaqId).toBe('can_users_make_agreements');
    expect(prep.groundedAnswer).toMatch(/^Open Market > Agreements/);
    expect(prep.groundedAnswer).not.toMatch(/^Yes\./);
    expect(prep.groundedAnswer).toMatch(/Market > Agreements/);
    expect(prep.groundedAnswer).toMatch(/\+/);
    expect(prep.groundedAnswer).toMatch(/sign/i);
    expect(prep.diagnostics.matchedCapabilityIds).toContain('agreements');
  });

  it('E2 — a can-question starts with Yes, then the path', () => {
    const prep = prepareCiviTurn(turn('Can I sign an agreement with anyone through Civizen?'));
    expect(prep.diagnostics.matchedFaqId).toBe('can_users_make_agreements');
    expect(prep.groundedAnswer).toMatch(/^Yes\. Open Market > Agreements/);
  });

  it('F — “Are you sure?” verifies the previous Civizen answer', () => {
    const history: HistoryTurn[] = [
      { role: 'user', content: 'How can I sign an agreement with anyone through Civizen?' },
      { role: 'assistant', content: 'Open Market > Agreements and use + to create and sign.' },
    ];
    const prep = prepareCiviTurn(turn('Are you sure?', history));
    expect(prep.inScope).toBe(true);
    expect(prep.isVerification).toBe(true);
    expect(prep.groundedAnswer).not.toBe(SCOPE_REFUSAL);
    expect(prep.resolvedQuery.toLowerCase()).toMatch(/verify/);
    expect(prep.resolvedQuery.toLowerCase()).toMatch(/agreement/);
    expect(prep.groundedAnswer).toMatch(/re-checked/i);
    expect(prep.groundedAnswer).toMatch(/agreement/i);
  });

  it('F2 — “Positive?” after an off-topic refusal still verifies the original agreements question', () => {
    const history: HistoryTurn[] = [
      { role: 'user', content: 'How can I sign an agreement with anyone through Civizen?' },
      {
        role: 'assistant',
        content:
          'Civizen is not designed for individual legal agreements but rather for collective civic action.',
      },
      { role: 'user', content: 'Are you sure?' },
      {
        role: 'assistant',
        content:
          'I can only help with Civizen-related topics such as governance, messaging, safety, marketplace, profile/account settings, and how to use features in this app. Please ask a Civizen-specific question.',
      },
    ];
    const prep = prepareCiviTurn(turn('Positive?', history));
    expect(prep.inScope).toBe(true);
    expect(prep.isVerification).toBe(true);
    expect(prep.groundedAnswer).not.toBe(SCOPE_REFUSAL);
    expect(prep.resolvedQuery.toLowerCase()).toMatch(/agreement/);
    expect(prep.groundedAnswer).toMatch(/Market > Agreements/);
    expect(prep.groundedAnswer).toMatch(/correct/i);
    expect(prep.groundedAnswer).not.toMatch(/same answer still holds/);
  });

  it('G — constitutional tokenomics retrieves the current/historical distinction', () => {
    const prep = prepareCiviTurn(turn('Civizen Constitutional Tokenomics + Governance Model'));
    expect(prep.groundedAnswer).toMatch(/historical|not adopted/i);
    expect(prep.groundedAnswer).toMatch(/Funding and Financial Integrity/i);
    expect(prep.diagnostics.matchedFaqId).toBe('constitutional_tokenomics');
    const paths = prep.diagnostics.retrievedPaths.join(' ');
    expect(
      paths.includes('civizen-constitutional-tokenomics-governance.md') ||
        prep.diagnostics.matchedCapabilityIds.includes('tokenomics_governance'),
    ).toBe(true);
  });

  it('H — current capability wins over a conflicting older document', () => {
    const conflicting: KnowledgePack = {
      ...KNOWLEDGE_PACK,
      chunks: [
        {
          id: 'old',
          title: 'Old note',
          path: 'docs/archive/old-agreements.md',
          text: 'Civizen does not have agreements. Users cannot sign anything.',
          status: 'historical',
          priority: 7,
          kind: 'doc',
        },
        ...KNOWLEDGE_PACK.chunks,
      ],
    };
    const prep = prepareCiviTurn(turn('Can I create an agreement in Civizen?'), { pack: conflicting });
    expect(prep.groundedAnswer).toMatch(/Market > Agreements/);
    expect(prep.groundedAnswer).not.toMatch(/does not have agreements/i);
    expect(prep.diagnostics.matchedCapabilityIds).toContain('agreements');
  });

  it('I — old terminology is understood, current name is used', () => {
    const prep = prepareCiviTurn(turn('What are professional listings?'));
    expect(prep.resolvedQuery.toLowerCase()).toMatch(/opportunit/);
    expect(prep.groundedAnswer).toMatch(/Opportunit/);
    expect(prep.groundedAnswer).not.toMatch(/professional listings are the current name/i);
  });

  it('J — no evidence stays unverified instead of hallucinating', () => {
    const empty: KnowledgePack = {
      ...KNOWLEDGE_PACK,
      faq: [],
      capabilities: [],
      chunks: [],
    };
    const prep = prepareCiviTurn(turn('Does Civizen support quantum voting tallies?'), { pack: empty });
    expect(prep.groundedAnswer).toContain(UNVERIFIED);
  });
});

describe('Civi resource routing', () => {
  it('uses internal evidence first and does not escalate when a feature is implemented', () => {
    const calls: string[] = [];
    const prep = prepareCiviTurn(turn('Can I create an agreement in Civizen?'), {
      externalAdapter: trackingAdapter(calls),
    });
    expect(prep.resourcePlan.internalResolution).toBe('sufficient');
    expect(prep.resourcePlan.allowExternalResources).toBe(false);
    expect(prep.diagnostics.externalResourcesInvoked).toEqual([]);
    expect(calls).toHaveLength(0);
    expect(prep.groundedAnswer).toMatch(/Market > Agreements/);
  });

  it('searches the project index when FAQ is not the main hit', () => {
    const prep = prepareCiviTurn(turn('What does /contribute/tasks redirect to in Civizen?'));
    expect(prep.diagnostics.matchedFaqId).not.toBe('what_are_community_challenges');
    expect(prep.retrievedContext.length + prep.groundedAnswer.length).toBeGreaterThan(20);
    expect(prep.groundedAnswer.toLowerCase()).toMatch(/opportunit/);
    expect(prep.resourcePlan.allowExternalResources).toBe(false);
  });

  it('treats member-specific questions as runtime data, not static knowledge', () => {
    const prep = prepareCiviTurn(turn('What Opportunities have I applied to?'));
    expect(prep.resourcePlan.kinds).toContain('civizen_user_data');
    expect(prep.resourcePlan.internalResolution).toBe('requires_runtime_data');
    expect(prep.diagnostics.usedRuntimeData).toBe(false);
    expect(prep.groundedAnswer).toMatch(/signed in|My Contributions|personal/i);

    const withData = prepareCiviTurn(turn('What Opportunities have I applied to?'), {
      runtimeData: { summary: 'You have 2 open applications.', source: 'authenticated_runtime' },
    });
    expect(withData.diagnostics.usedRuntimeData).toBe(true);
    expect(withData.groundedAnswer).toMatch(/2 open applications/);
  });

  it('greets public visitors as Civi without requiring an account', () => {
    const prep = prepareCiviTurn(turn('hello'), { audience: 'guest' });
    expect(prep.isGreeting).toBe(true);
    expect(prep.groundedAnswer).toMatch(/Civi, your AI assistant/i);
  });

  it('tells guests that personal records need an account', () => {
    const prep = prepareCiviTurn(turn('What Opportunities have I applied to?'), { audience: 'guest' });
    expect(prep.resourcePlan.internalResolution).toBe('requires_runtime_data');
    expect(prep.groundedAnswer).toMatch(/Sign up|account/i);
  });

  it('retrieves Civizen context before allowing AI reasoning on a generative request', () => {
    const prep = prepareCiviTurn(turn('Help me draft a partnership proposal to a university.'));
    expect(prep.resourcePlan.allowLlmReasoning).toBe(true);
    expect(prep.resourcePlan.kinds).toContain('general_reasoning');
    expect(prep.skipLlm).toBe(false);
  });

  it('invokes an external adapter only for the external portion of a request', () => {
    const calls: string[] = [];
    const prep = prepareCiviTurn(turn('What is participatory budgeting?'), {
      externalAdapter: trackingAdapter(calls),
    });
    expect(prep.resourcePlan.kinds).toContain('external_world');
    expect(prep.resourcePlan.allowExternalResources).toBe(true);
    expect(calls.length).toBeGreaterThan(0);
    expect(prep.groundedAnswer).not.toMatch(/Civizen currently includes participatory budgeting as a live feature/i);
  });

  it('does not use external knowledge to manufacture a missing Civizen fact', () => {
    const calls: string[] = [];
    const prep = prepareCiviTurn(turn('Does Civizen support legally binding PKI notary stamps?'), {
      externalAdapter: trackingAdapter(calls),
    });
    expect(calls).toHaveLength(0);
    expect(prep.groundedAnswer).toMatch(/couldn['’]t verify|not a certified PKI|electronic signing/i);
  });

  it('verification follow-ups broaden internal evidence instead of asking the model to remember', () => {
    const history: HistoryTurn[] = [
      { role: 'user', content: 'Can Civizen do Community Challenges?' },
      { role: 'assistant', content: 'I am not sure Civizen has that.' },
    ];
    const calls: string[] = [];
    const prep = prepareCiviTurn(turn('Are you sure?', history), { externalAdapter: trackingAdapter(calls) });
    expect(prep.isVerification).toBe(true);
    expect(prep.inScope).toBe(true);
    expect(prep.groundedAnswer).toMatch(/Challenge/i);
    expect(
      prep.diagnostics.matchedCapabilityIds.includes('community_challenges') || /challenge/i.test(prep.groundedAnswer),
    ).toBe(true);
    expect(calls).toHaveLength(0);
    expect(prep.groundedAnswer).toMatch(/re-checked|correct/i);
  });
});

describe('conversation query rewrite', () => {
  it('expands a pronoun follow-up using the previous Civizen topic', () => {
    const resolved = resolveConversationalQuery([
      { role: 'user', content: 'Tell me about Community Challenges.' },
      { role: 'assistant', content: 'They are a Contribute lane for local problems.' },
      { role: 'user', content: 'Who can create one?' },
    ]);
    expect(resolved.isVerification).toBe(false);
    expect(resolved.resolvedQuery.toLowerCase()).toMatch(/community challenge/);
    expect(resolved.resolvedQuery.toLowerCase()).toMatch(/who can create/);
  });
});

describe('request classification', () => {
  it('marks mixed governance comparison as product plus external', () => {
    const kinds = classifyRequest(
      "Compare Civizen's governance model with Switzerland's current referendum system",
      "Compare Civizen's governance model with Switzerland's current referendum system",
      KNOWLEDGE_PACK,
    );
    expect(kinds).toContain('civizen_product');
    expect(kinds).toContain('external_world');
  });
});

describe('index retrieval', () => {
  it('finds the cheat sheet redirect for /contribute/tasks', () => {
    const result = retrieveKnowledge('What does /contribute/tasks redirect to', KNOWLEDGE_PACK);
    const blob = [...result.documents.map((d) => d.chunk.text), ...result.faq.map((f) => f.item.answer)].join(' ');
    expect(blob.toLowerCase()).toMatch(/opportunit/);
  });
});
