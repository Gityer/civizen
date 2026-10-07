import { describe, expect, it } from 'vitest';

import { ASSISTANT_FAQ } from '@/lib/assistant/catalog';
import { KNOWLEDGE_PACK } from '@/lib/assistant/generated/knowledge-pack';
import {
  detectAssistantLanguage,
  englishConceptTerms,
  expandAssistantQuery,
  retrievalQueryFor,
} from '@/lib/assistant/language';
import { prepareNelaTurn, SCOPE_REFUSAL, UNVERIFIED } from '@/lib/assistant/orchestrator';
import type { HistoryTurn } from '@/lib/assistant/types';
import { NELA_PAGE_LINKS } from '@/lib/nela-nav-paths';

function ask(text: string, audience: 'member' | 'guest' = 'member') {
  const history: HistoryTurn[] = [{ role: 'user', content: text }];
  return prepareNelaTurn(history, { audience });
}

/**
 * Realistic member questions about the voting, proposal, notification and help features shipped
 * in October 2026. Each row: question → FAQ id that must answer it → wording the answer must contain.
 */
const ENGLISH_CASES: Array<[string, string, RegExp]> = [
  ['How do I vote?', 'how_do_i_vote', /Civic voting/],
  ['How do I know my vote was counted?', 'how_do_i_know_my_vote_was_counted', /Check that my receipt is counted/],
  ['What is a receipt?', 'what_is_a_voting_receipt', /random code/],
  ['Where do I check my receipt?', 'how_do_i_know_my_vote_was_counted', /public list of counted receipts/],
  ["Why can't I vote?", 'why_cant_i_vote', /reason is shown under the voting buttons/],
  ['Do I need to be verified to vote?', 'do_i_need_verification_to_vote', /^No/],
  ['Can I vote without an account?', 'can_i_vote_without_account', /^No\./],
  ['Can I change my vote?', 'can_i_change_my_vote', /^Yes, while voting is open/],
  ['Can I withdraw my ballot?', 'can_i_change_my_vote', /Withdraw ballot/],
  ['Who can see how I voted?', 'who_can_see_how_i_voted', /^No one\./],
  ['Is my vote secret?', 'who_can_see_how_i_voted', /sealed/],
  ['Can admins see my vote?', 'who_can_see_how_i_voted', /only totals/],
  ['What happens when a vote closes?', 'what_happens_when_a_vote_closes', /closes by itself/],
  ['How is the result of a consultation decided?', 'what_happens_when_a_vote_closes', /pass threshold/],
  ['Does Civizen count ballots automatically?', 'what_happens_when_a_vote_closes', /final tally/],
  ['What is quorum?', 'what_are_quorum_and_pass_threshold', /minimum number of countable ballots/],
  ['Is voting binding?', 'is_voting_binding', /nonbinding/],
  ['Who can vote?', 'who_can_vote', /free account/],
  ['How do I submit a proposal?', 'how_do_i_submit_a_proposal', /Create voting proposal/],
  ['How do I create a consultation?', 'how_do_i_submit_a_proposal', /Open for support/],
  ['When can I publish my proposal?', 'how_do_i_submit_a_proposal', /threshold is reached/],
  ['How does member support for a proposal work?', 'how_does_proposal_support_work', /Support this proposal/],
  ['Can a proposal have custom options?', 'can_a_proposal_have_custom_options', /2 to 12 options/],
  ['Can I rank the options?', 'can_a_proposal_have_custom_options', /instant run-off/],
  ['What is ranked voting?', 'can_a_proposal_have_custom_options', /order of preference/],
  ['Is there approval voting?', 'can_a_proposal_have_custom_options', /approval voting/],
  ['Where are my notifications?', 'where_are_my_notifications', /bell/],
  ['What is the bell icon?', 'where_are_my_notifications', /Settings > Notifications/],
  ['How do I get notified when a vote result is published?', 'where_are_my_notifications', /result/],
  ['Where is help and support?', 'where_is_help_and_support', /Settings > Help and support/],
  ['Where is the Governance page?', 'where_is_the_governance_page', /\/governance\/workspace/],
  ['What are the Votes, Proposals and Tools tabs?', 'where_is_the_governance_page', /Votes/],
  ['Who can see the Tools tab?', 'where_is_the_governance_page', /office holders/],
  ['What is the Governance workspace?', 'where_is_the_governance_page', /Member workspace/],
  ['What is the Observer console?', 'what_is_the_observer_console', /no voter identities/],
  ['Where can I see open votes in Study?', 'where_are_open_votes_in_study', /Open votes card/],
  ['Where do I look for a job?', 'where_are_jobs', /Market > Jobs/],
];

const ARMENIAN_CASES: Array<[string, string, RegExp]> = [
  ['Կարո՞ղ եմ տարբերակները դասակարգել', 'can_a_proposal_have_custom_options', /փուլային հաշվարկով/],
  ['Ինչպե՞ս քվեարկել։', 'how_do_i_vote', /Քաղաքացիական քվեարկություն/],
  ['Ինչպե՞ս իմանալ, որ իմ ձայնը հաշվվել է։', 'how_do_i_know_my_vote_was_counted', /Ստուգել, որ իմ անդորրագիրը հաշվված է/],
  ['Ի՞նչ է անդորրագիրը։', 'what_is_a_voting_receipt', /պատահական կոդ/],
  ['Ինչու՞ չեմ կարող քվեարկել։', 'why_cant_i_vote', /պատճառը նշված է/],
  ['Կարո՞ղ եմ փոխել իմ ձայնը։', 'can_i_change_my_vote', /^Այո/],
  ['Ո՞վ կարող է տեսնել, թե ինչպես եմ քվեարկել։', 'who_can_see_how_i_voted', /^Ոչ ոք/],
  ['Ո՞վ կարող է քվեարկել։', 'who_can_vote', /անվճար հաշիվ/],
  ['Ի՞նչ է քվորումը։', 'what_are_quorum_and_pass_threshold', /Քվորումը/],
  ['Ինչպես առաջարկ ներկայացնել?', 'how_do_i_submit_a_proposal', /Ստեղծել քվեարկության առաջարկ/],
  ['Որտե՞ղ են իմ ծանուցումները։', 'where_are_my_notifications', /Կարգավորումներ > Ծանուցումներ/],
  ['Որտե՞ղ է Կառավարում էջը։', 'where_is_the_governance_page', /Քվեարկություններ/],
  ['Ի՞նչ է Civizen-ը։', 'what_is_civizen', /^Civizen-ը բաց մասնակցային համակարգ է/],
];

const RUSSIAN_CASES: Array<[string, string, RegExp]> = [
  ['Можно ли ранжировать варианты?', 'can_a_proposal_have_custom_options', /мгновенным вторым туром/],
  ['Как проголосовать?', 'how_do_i_vote', /Гражданское голосование/],
  ['Как узнать, что мой голос учтён?', 'how_do_i_know_my_vote_was_counted', /Проверить, что моя квитанция учтена/],
  ['Что такое квитанция?', 'what_is_a_voting_receipt', /случайный код/],
  ['Почему я не могу голосовать?', 'why_cant_i_vote', /причина показана/],
  ['Могу ли я изменить свой голос?', 'can_i_change_my_vote', /^Да, пока голосование открыто/],
  ['Кто видит, как я проголосовал?', 'who_can_see_how_i_voted', /^Никто\./],
  ['Кто может голосовать?', 'who_can_vote', /бесплатным аккаунтом/],
  ['Что происходит, когда голосование закрывается?', 'what_happens_when_a_vote_closes', /закрывается сама/],
  ['Что такое кворум?', 'what_are_quorum_and_pass_threshold', /Кворум/],
  ['Обязательно ли голосование?', 'is_voting_binding', /не имеют обязательной силы/],
  ['Как подать предложение?', 'how_do_i_submit_a_proposal', /Создать предложение для голосования/],
  ['Где мои уведомления?', 'where_are_my_notifications', /Настройки > Уведомления/],
  ['Где страница помощи?', 'where_is_help_and_support', /Помощь и поддержка/],
  ['Где страница Управление?', 'where_is_the_governance_page', /Голосования/],
  ['Что такое Civizen?', 'what_is_civizen', /^Civizen — это открытая система участия/],
];

describe('Civi answers the October 2026 voting and governance questions', () => {
  it.each(ENGLISH_CASES)('EN: %s', (question, faqId, expected) => {
    const prep = ask(question);
    expect(prep.inScope).toBe(true);
    expect(prep.diagnostics.matchedFaqId).toBe(faqId);
    expect(prep.groundedAnswer).toMatch(expected);
    expect(prep.groundedAnswer).not.toContain(UNVERIFIED);
    expect(prep.diagnostics.language).toBe('en');
  });

  it.each(ARMENIAN_CASES)('HY: %s', (question, faqId, expected) => {
    const prep = ask(question);
    expect(prep.inScope).toBe(true);
    expect(prep.diagnostics.language).toBe('hy');
    expect(prep.diagnostics.matchedFaqId).toBe(faqId);
    expect(prep.groundedAnswer).toMatch(expected);
    // A hand-written Armenian answer needs no model call.
    expect(prep.skipLlm || prep.diagnostics.confidence === 'medium').toBe(true);
  });

  it.each(RUSSIAN_CASES)('RU: %s', (question, faqId, expected) => {
    const prep = ask(question);
    expect(prep.inScope).toBe(true);
    expect(prep.diagnostics.language).toBe('ru');
    expect(prep.diagnostics.matchedFaqId).toBe(faqId);
    expect(prep.groundedAnswer).toMatch(expected);
  });

  it('keeps every voting FAQ answer free of routes Civi cannot link', () => {
    const declared = new Set(NELA_PAGE_LINKS.map((page) => page.href));
    const votingFaq = ASSISTANT_FAQ.filter((item) => ENGLISH_CASES.some(([, id]) => id === item.id));
    expect(votingFaq.length).toBeGreaterThan(15);
    for (const item of votingFaq) {
      for (const path of item.answer.match(/(?<![\w/])\/[a-z][a-z/-]+/g) ?? []) {
        expect(declared.has(path) || path === '/observe', `${item.id} mentions ${path}`).toBe(true);
      }
    }
  });

  it('uses the Governance capability card, not the Civic voting blurb, for tab questions', () => {
    const prep = ask('What are the Votes, Proposals and Tools tabs?');
    expect(prep.groundedAnswer).not.toMatch(/A Single World Citizenship/);
  });
});

describe('Civi language handling', () => {
  it('detects Armenian, Russian and English', () => {
    expect(detectAssistantLanguage('Ինչպե՞ս քվեարկել։')).toBe('hy');
    expect(detectAssistantLanguage('Где мои уведомления?')).toBe('ru');
    expect(detectAssistantLanguage('How do I vote?')).toBe('en');
    expect(detectAssistantLanguage('Civizen?')).toBe('en');
  });

  it('maps Armenian and Russian stems to the English wording the pack uses', () => {
    expect(englishConceptTerms('Ի՞նչ է անդորրագիրը։')).toContain('receipt');
    expect(englishConceptTerms('Где мои уведомления?')).toContain('notifications');
    expect(retrievalQueryFor('Как проголосовать?')).toMatch(/how do I vote/i);
    expect(retrievalQueryFor('Как проголосовать?')).not.toMatch(/[Ѐ-ӿ]/);
    expect(expandAssistantQuery('How do I vote?')).toBe('How do I vote?');
  });

  it('greets and refuses in the language of the message', () => {
    expect(ask('Բարև').groundedAnswer).toMatch(/^Բարև/);
    expect(ask('Привет', 'guest').groundedAnswer).toMatch(/Я Civi/);
    const offTopic = ask('Как испечь торт?');
    expect(offTopic.inScope).toBe(false);
    expect(offTopic.groundedAnswer).toMatch(/Civizen/);
    expect(offTopic.groundedAnswer).not.toBe(SCOPE_REFUSAL);
    expect(offTopic.skipLlm).toBe(true);
  });

  it('sends a non-English question without a hand-written answer to the model with English evidence', () => {
    const prep = ask('Ի՞նչ է Ուսումը։');
    expect(prep.diagnostics.language).toBe('hy');
    expect(prep.diagnostics.matchedFaqId).toBe('what_is_study');
    expect(prep.skipLlm).toBe(false);
    expect(prep.systemPrompt).toMatch(/Reply in natural, grammatically correct Armenian/);
  });

  it('skips the model when the Armenian answer is hand-written and confidence is high', () => {
    const prep = ask('Ինչու՞ չեմ կարող քվեարկել։');
    expect(prep.skipLlm).toBe(true);
  });

  it('keeps hand-written answers in the generated pack for every language', () => {
    const packItem = KNOWLEDGE_PACK.faq.find((item) => item.id === 'who_can_see_how_i_voted');
    expect(packItem?.localizedAnswers?.hy).toMatch(/Ոչ ոք/);
    expect(packItem?.localizedAnswers?.ru).toMatch(/Никто/);
  });
});
