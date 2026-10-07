/**
 * Language handling for Civi.
 *
 * The knowledge pack is written in English. Armenian and Russian questions are understood by
 * mapping their word stems to the English concepts the pack uses, so retrieval, scope checks,
 * and topic classification work in all three languages. Answers come from hand-written
 * localized FAQ text when it exists, otherwise the model renders the English evidence in the
 * language of the question.
 */
export type AssistantLanguage = 'en' | 'hy' | 'ru';

export const ASSISTANT_LANGUAGE_NAMES: Record<AssistantLanguage, string> = {
  en: 'English',
  hy: 'Armenian',
  ru: 'Russian',
};

const ARMENIAN_RE = /[԰-֏]/g;
const CYRILLIC_RE = /[Ѐ-ӿ]/g;

export function detectAssistantLanguage(text: string): AssistantLanguage {
  const armenian = (text.match(ARMENIAN_RE) ?? []).length;
  const cyrillic = (text.match(CYRILLIC_RE) ?? []).length;
  if (armenian < 2 && cyrillic < 2) return 'en';
  return armenian >= cyrillic ? 'hy' : 'ru';
}

type LexiconEntry = { match: RegExp; terms: string };

/** Eastern Armenian stems → English concepts used by the knowledge pack. */
const ARMENIAN_LEXICON: LexiconEntry[] = [
  { match: /քվեարկ/i, terms: 'vote voting' },
  { match: /ձայն/i, terms: 'vote' },
  { match: /քվեաթերթիկ/i, terms: 'ballot' },
  { match: /անդորրագ/i, terms: 'receipt' },
  { match: /հաշվվ|հաշվել|հաշված|հաշվարկ/i, terms: 'counted count' },
  { match: /առաջարկ/i, terms: 'proposal' },
  { match: /ներկայաց/i, terms: 'submit create' },
  { match: /ծանուց/i, terms: 'notifications' },
  { match: /զանգ/i, terms: 'bell' },
  { match: /օգնութ/i, terms: 'help and support' },
  { match: /աջակց/i, terms: 'support' },
  { match: /կառավար/i, terms: 'governance' },
  { match: /խորհրդակց/i, terms: 'consultation' },
  { match: /արդյունք/i, terms: 'result outcome' },
  { match: /փակվ|փակել/i, terms: 'closes closed' },
  { match: /փոխել|փոխ/i, terms: 'change' },
  { match: /հետ վերցն/i, terms: 'withdraw' },
  { match: /տեսն/i, terms: 'see' },
  { match: /գաղտն/i, terms: 'secret' },
  { match: /\bո՞?վ\b/i, terms: 'who' },
  { match: /ինչու/i, terms: 'why' },
  { match: /չեմ կարող/i, terms: "can't" },
  { match: /կարո՞?ղ եմ/i, terms: 'can i' },
  { match: /ինչպե՞?ս/i, terms: 'how' },
  { match: /որտե՞?ղ/i, terms: 'where' },
  { match: /ի՞?նչ է/i, terms: 'what is' },
  { match: /քվորում/i, terms: 'quorum' },
  { match: /դասակարգ|դասավոր|հերթական/i, terms: 'ranked ranking rank order of preference' },
  { match: /հավանութ/i, terms: 'approval approve several options' },
  { match: /տարբերակ/i, terms: 'option options' },
  { match: /նախապատվ/i, terms: 'preference' },
  { match: /շեմ/i, terms: 'threshold' },
  { match: /հաստատ/i, terms: 'verified verification' },
  { match: /հաշիվ/i, terms: 'account' },
  { match: /մուտք/i, terms: 'sign in' },
  { match: /գրանց/i, terms: 'sign up register' },
  { match: /աշխատանք/i, terms: 'job jobs work' },
  { match: /համաձայնագ/i, terms: 'agreement' },
  { match: /ներդրում/i, terms: 'contribute contribution' },
  { match: /ուսում|սովոր/i, terms: 'study learn' },
  { match: /էջ/i, terms: 'page' },
  { match: /պարտադիր/i, terms: 'binding' },
  { match: /շուկա/i, terms: 'market' },
  { match: /նամակ|հաղորդագր/i, terms: 'messaging message' },
  { match: /պրոֆիլ/i, terms: 'profile' },
  { match: /կարգավորում/i, terms: 'settings' },
  { match: /դիտորդ/i, terms: 'observer' },
  { match: /ընտրութ/i, terms: 'election' },
  { match: /անդամ/i, terms: 'member' },
  { match: /սիվիզեն/i, terms: 'civizen' },
];

/** Russian stems → English concepts used by the knowledge pack. */
const RUSSIAN_LEXICON: LexiconEntry[] = [
  { match: /голос/i, terms: 'vote voting' },
  { match: /бюллетен/i, terms: 'ballot' },
  { match: /квитанц/i, terms: 'receipt' },
  { match: /учт[её]н|учтен|учитыва|посчит|подсч[её]т/i, terms: 'counted count' },
  { match: /предложен/i, terms: 'proposal' },
  { match: /подать|создать|внести|выдвин/i, terms: 'submit create' },
  { match: /уведомлен/i, terms: 'notifications' },
  { match: /колокол/i, terms: 'bell' },
  { match: /помощ/i, terms: 'help and support' },
  { match: /поддержк/i, terms: 'support' },
  { match: /управлен/i, terms: 'governance' },
  { match: /консультац/i, terms: 'consultation' },
  { match: /результат|итог/i, terms: 'result outcome' },
  { match: /закрыва|закрыт|закро/i, terms: 'closes closed' },
  { match: /измени|поменя/i, terms: 'change' },
  { match: /отозв|отзыв/i, terms: 'withdraw' },
  { match: /видит|видеть|увид/i, terms: 'see' },
  { match: /тайн|секрет|аноним/i, terms: 'secret' },
  { match: /\bкто\b/i, terms: 'who' },
  { match: /почему/i, terms: 'why' },
  { match: /не могу/i, terms: "can't" },
  { match: /могу ли/i, terms: 'can i' },
  { match: /\bкак\b/i, terms: 'how' },
  { match: /\bгде\b/i, terms: 'where' },
  { match: /что такое/i, terms: 'what is' },
  { match: /кворум/i, terms: 'quorum' },
  { match: /ранжир|упорядоч|по порядку|рейтингов/i, terms: 'ranked ranking rank order of preference' },
  { match: /одобрен|одобр/i, terms: 'approval approve several options' },
  { match: /вариант/i, terms: 'option options' },
  { match: /предпочтен/i, terms: 'preference' },
  { match: /порог/i, terms: 'threshold' },
  { match: /верифиц|подтвержд/i, terms: 'verified verification' },
  { match: /аккаунт|уч[её]тн/i, terms: 'account' },
  { match: /войти|вход/i, terms: 'sign in' },
  { match: /регистр/i, terms: 'sign up register' },
  { match: /работ|ваканс/i, terms: 'job jobs work' },
  { match: /соглашен|договор/i, terms: 'agreement' },
  { match: /вклад|участв/i, terms: 'contribute contribution' },
  { match: /учеб|учить|изуч|обучен/i, terms: 'study learn' },
  { match: /страниц/i, terms: 'page' },
  { match: /обязательн/i, terms: 'binding' },
  { match: /рынок|маркет/i, terms: 'market' },
  { match: /сообщен/i, terms: 'messaging message' },
  { match: /профил/i, terms: 'profile' },
  { match: /настройк/i, terms: 'settings' },
  { match: /наблюдат/i, terms: 'observer' },
  { match: /выбор/i, terms: 'election' },
  { match: /участник|член/i, terms: 'member' },
  { match: /сивизен/i, terms: 'civizen' },
];

/** Whole-question forms → the English FAQ wording, so exact-alias boosts apply across languages. */
const ARMENIAN_QUESTIONS: LexiconEntry[] = [
  { match: /ինչպե՞?ս (եմ |կարող եմ )?քվեարկ/i, terms: 'how do I vote' },
  { match: /ինչպե՞?ս իմանալ.*հաշվ/i, terms: 'how do I know my vote was counted' },
  { match: /ի՞?նչ է անդորրագ/i, terms: 'what is a receipt' },
  { match: /ինչու՞? չեմ կարող քվեարկ/i, terms: "why can't I vote" },
  { match: /կարո՞?ղ եմ փոխել.*ձայն/i, terms: 'can I change my vote' },
  { match: /ո՞?վ կարող է տեսնել.*քվեարկ/i, terms: 'who can see how I voted' },
  { match: /որտե՞?ղ են իմ ծանուցում/i, terms: 'where are my notifications' },
  { match: /ի՞?նչ է civizen/i, terms: 'what is civizen' },
  { match: /ինչպե՞?ս .*առաջարկ ներկայաց/i, terms: 'how do I submit a proposal' },
  { match: /ի՞?նչ է լինում.*փակվ/i, terms: 'what happens when a vote closes' },
  { match: /որտե՞?ղ (է )?օգնութ/i, terms: 'where is help and support' },
  { match: /ո՞?վ (է )?կարող է քվեարկ/i, terms: 'who can vote' },
  { match: /որտե՞?ղ է կառավար/i, terms: 'where is the governance page' },
  { match: /պարտադի՞?ր/i, terms: 'is voting binding' },
];

const RUSSIAN_QUESTIONS: LexiconEntry[] = [
  { match: /как (мне )?(про)?голосовать/i, terms: 'how do I vote' },
  { match: /как узнать,? что мой голос учт/i, terms: 'how do I know my vote was counted' },
  { match: /что такое квитанц/i, terms: 'what is a receipt' },
  { match: /почему я не могу (про)?голосовать/i, terms: "why can't I vote" },
  { match: /могу ли я изменить (свой )?голос/i, terms: 'can I change my vote' },
  { match: /кто (может )?(видит|увидит|видеть),? как я (про)?голосовал/i, terms: 'who can see how I voted' },
  { match: /где мои уведомлен/i, terms: 'where are my notifications' },
  { match: /что такое civizen/i, terms: 'what is civizen' },
  { match: /как подать предложен/i, terms: 'how do I submit a proposal' },
  { match: /что происходит,? когда голосование закрыва/i, terms: 'what happens when a vote closes' },
  { match: /где (страница )?помощ/i, terms: 'where is help and support' },
  { match: /кто может (про)?голосовать/i, terms: 'who can vote' },
  { match: /где страница управлен/i, terms: 'where is the governance page' },
  { match: /обязательн|обязывающ|юридическ(ую|ой) сил/i, terms: 'is voting binding' },
];

/** Canned replies in the member's language (English versions live in the orchestrator). */
export const LOCALIZED_REPLIES: Record<Exclude<AssistantLanguage, 'en'>, { scopeRefusal: string; greeting: string; greetingGuest: string; unverified: string }> = {
  hy: {
    scopeRefusal:
      'Ես կարող եմ օգնել Civizen-ի հարցերում՝ ինչ է այն, ինչու է գոյություն ունենում, ինչպես են մարդիկ մասնակցում և ինչպես օգտվել այս հավելվածից։ Խնդրում եմ, հարց տվեք Civizen-ի մասին։',
    greeting:
      'Բարև։ Ես կարող եմ օգնել հասկանալ, թե ինչ է Civizen-ը և ինչու է այն գոյություն ունենում, ինչպես նաև Ներդրում, Համաձայնագրեր, Կառավարում, Ուսում, Շուկա և հաշվի կարգավորումների հարցերում։ Ինչ կուզենայիք անել։',
    greetingGuest:
      'Բարև։ Ես Civi-ն եմ՝ ձեր AI օգնականը։ Կարող եմ պատասխանել Civizen-ի մասին հարցերին՝ ինչ է այն, ինչու է գոյություն ունենում, ինչպես են մարդիկ մասնակցում և ինչպես սկսել։',
    unverified: 'Civizen-ի ընթացիկ նախագծային տեղեկություններում դա հաստատել չկարողացա։',
  },
  ru: {
    scopeRefusal:
      'Я могу помочь с вопросами о Civizen: что это, зачем он существует, как люди участвуют и как пользоваться этим приложением. Пожалуйста, задайте вопрос о Civizen.',
    greeting:
      'Здравствуйте! Я могу помочь разобраться, что такое Civizen и зачем он существует, а также с разделами Вклад, Соглашения, Управление, Обучение, Рынок и настройками аккаунта. Что вы хотите сделать?',
    greetingGuest:
      'Здравствуйте. Я Civi, ваш AI-помощник. Я отвечаю на вопросы о Civizen: что это, зачем он существует, как люди участвуют и с чего начать.',
    unverified: 'Я не смог подтвердить это по текущей информации о проекте Civizen.',
  },
};

function lexiconFor(language: AssistantLanguage): LexiconEntry[] {
  if (language === 'hy') return [...ARMENIAN_QUESTIONS, ...ARMENIAN_LEXICON];
  if (language === 'ru') return [...RUSSIAN_QUESTIONS, ...RUSSIAN_LEXICON];
  return [];
}

/** English wording found in an Armenian or Russian text: question forms first, then concept terms. */
export function englishConceptTerms(text: string, language = detectAssistantLanguage(text)): string[] {
  const terms: string[] = [];
  for (const entry of lexiconFor(language)) {
    if (entry.match.test(text) && !terms.includes(entry.terms)) terms.push(entry.terms);
  }
  return terms;
}

/**
 * What retrieval should search for. English questions search as written; Armenian and Russian
 * questions search only by their English wording, because non-Latin tokens never match the
 * English pack and would otherwise drag every overlap ratio down.
 */
export function retrievalQueryFor(text: string, language = detectAssistantLanguage(text)): string {
  if (language === 'en') return text;
  const terms = englishConceptTerms(text, language);
  return terms.length ? terms.join(' ') : text;
}

/** The question plus its English concept terms, so English retrieval and scope rules apply. */
export function expandAssistantQuery(text: string, language = detectAssistantLanguage(text)): string {
  if (language === 'en') return text;
  const terms = englishConceptTerms(text, language);
  return terms.length ? `${text} ${terms.join(' ')}` : text;
}
