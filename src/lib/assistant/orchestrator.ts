import { shapeAnswerToQuestion } from './answer-shape';
import { isPersonalHardshipAsk, PERSONAL_HARDSHIP_FAQ_ID, PERSONAL_HARDSHIP_REPLY } from './hardship';
import { IDENTITY_FAQ_IDS, classifyAssistantTopic } from './identity';
import {
  detectAssistantLanguage,
  expandAssistantQuery,
  LOCALIZED_REPLIES,
  retrievalQueryFor,
  type AssistantLanguage,
} from './language';
import { isPeaceCooperationAsk, PEACE_COOPERATION_FAQ_ID, PEACE_COOPERATION_REPLY } from './peace';
import { pickLearnedMemory } from './learned-memory';
import { buildCiviSystemPrompt, formatRetrievedContext, shouldSkipLlm } from './prompt';
import { resolveConversationalQuery } from './query-rewrite';
import { preferCurrentEvidence, retrieveKnowledge, tokenize } from './retrieval';
import { classifyRequest, planResources, retrievalConfidence, shouldInvokeExternalSearch } from './routing';
import { isGreetingOnly, isRelevantToCivizen } from './scope';
import type {
  AssistantCapabilityStatus,
  AssistantFaqItem,
  ExternalResourceKind,
  HistoryTurn,
  KnowledgePack,
  CiviTurnPrep,
  PrepareCiviTurnOptions,
  RetrievalResult,
} from './types';
import { KNOWLEDGE_PACK as GENERATED_PACK } from './generated/knowledge-pack';

const UNVERIFIED =
  "I couldn't verify that from Civizen's current project information.";
const SCOPE_REFUSAL =
  'I can help with Civizen — what it is, why it exists, how people participate, and how to use this app. Please ask a question about Civizen.';
const GREETING =
  'Hi! I can help with what Civizen is, why it exists, Contribute, Agreements, governance, Study, Market, and account settings. What would you like to do?';
const GREETING_GUEST =
  'Hi. I am Civi, your AI assistant. I can answer questions about Civizen — what it is, why it exists, how people participate, and how to get started.';

function statusPrefix(status: AssistantCapabilityStatus): string {
  switch (status) {
    case 'implemented':
      return '';
    case 'experimental':
      return 'This is experimental in the current app. ';
    case 'in_development':
      return 'This is in development and not fully available yet. ';
    case 'proposed':
      return "This is part of Civizen's proposed model, but it is not currently implemented in the app. ";
    case 'deprecated':
      return 'This is no longer available as a current capability. ';
    case 'historical':
      return 'This is historical / not adopted current policy. ';
    default:
      return '';
  }
}

function distinctiveEnough(query: string, text: string): boolean {
  const generic = new Set([
    'civizen',
    'nela',
    'app',
    'feature',
    'platform',
    'member',
    'members',
    'can',
    'between',
    'among',
    'through',
    'using',
    'about',
    'into',
    'verify',
    'previous',
    'original',
    'question',
    'answer',
    'follow-up',
    'follow',
    'sure',
    'help',
    'need',
    'please',
  ]);
  const allTerms = tokenize(query);
  const qTerms = allTerms.filter((t) => !generic.has(t));
  if (!qTerms.length) {
    // Weak-only asks such as "can you help me" must not match every FAQ.
    return !allTerms.some((t) => t === 'help' || t === 'need' || t === 'please');
  }
  const hay = new Set(tokenize(text));
  const hits = qTerms.filter((t) => hay.has(t)).length;
  if (hits >= 2) return true;
  return hits >= 1 && hits / qTerms.length >= 0.28;
}

/** Hand-written answer in the member's language when the FAQ has one; English otherwise. */
export function faqAnswerFor(item: AssistantFaqItem, language: AssistantLanguage): string {
  const localized = language === 'en' ? undefined : item.localizedAnswers?.[language];
  return (localized ?? item.answer).trim();
}

function composeFromRetrieval(
  retrieval: RetrievalResult,
  query: string,
  topic: ReturnType<typeof classifyAssistantTopic>,
  language: AssistantLanguage = 'en',
): string {
  const faq = retrieval.faq[0];
  const cap = retrieval.capabilities[0];
  if (topic === 'identity') {
    const identityFaq =
      retrieval.faq.find((hit) => IDENTITY_FAQ_IDS.has(hit.item.id)) ?? faq;
    if (identityFaq) return faqAnswerFor(identityFaq.item, language);
  }
  if (topic === 'current_capability') {
    const nowFaq = retrieval.faq.find((hit) => hit.item.id === 'what_can_i_do_in_civizen_now') ?? faq;
    if (nowFaq) return faqAnswerFor(nowFaq.item, language);
  }
  const faqRelated = faq
    ? distinctiveEnough(query, `${faq.item.question} ${faq.item.aliases.join(' ')} ${faq.item.answer}`)
    : false;
  // A hand-written answer in the member's language beats a capability card in English.
  if (faq && faqRelated && language !== 'en' && faq.item.localizedAnswers?.[language]) {
    return faqAnswerFor(faq.item, language);
  }
  const capRelated = cap ? distinctiveEnough(query, `${cap.item.name} ${cap.item.description}`) : false;
  if (topic !== 'current_capability' && faq && faqRelated && (!cap || !capRelated || retrieval.faq[0].score >= (cap.score ?? 0) * 0.7)) {
    const related = cap && faq.item.capabilityIds.includes(cap.item.id) ? cap.item : null;
    const prefix = related && capRelated ? statusPrefix(related.status) : '';
    return `${prefix}${faqAnswerFor(faq.item, language)}`.trim();
  }
  if (cap && capRelated) {
    const prefix = statusPrefix(cap.item.status);
    const how = cap.item.howTo ? ` ${cap.item.howTo}` : '';
    return `${prefix}${cap.item.description}${how}`.trim();
  }
  if (faq && faqRelated) return faqAnswerFor(faq.item, language);
  const docs = preferCurrentEvidence(retrieval.documents).filter((d) =>
    distinctiveEnough(query, `${d.chunk.title} ${d.chunk.text}`),
  );
  const current = docs.find((d) => d.chunk.status === 'implemented' || d.chunk.priority <= 5);
  if (current) {
    const text = current.chunk.text.replace(/\s+/g, ' ').trim();
    return text.length > 420 ? `${text.slice(0, 400).trim()}…` : text;
  }
  if (docs[0]) {
    return `${statusPrefix(docs[0].chunk.status)}${docs[0].chunk.text.replace(/\s+/g, ' ').trim().slice(0, 400)}`.trim();
  }
  return UNVERIFIED;
}

function priorClaimConflicts(prior: string, now: string): boolean {
  const denial =
    /not designed for|does not (have|support|offer)|cannot (sign|create)|isn['’]t (a |an |designed)|is not designed|i can only help with civizen-related topics/;
  const affirmation = /\/agreements|market > agreements|\byou can\b|\bopen\b|\bcreate\b|\bsign\b|\bimplemented\b/;
  return denial.test(prior) && affirmation.test(now);
}

function composeVerification(previousClaim: string | null, answer: string): string {
  const core = answer.trim();
  if (!previousClaim) return `I re-checked Civizen's current project information. ${core}`;
  const prior = previousClaim.toLowerCase();
  const now = core.toLowerCase();
  if (priorClaimConflicts(prior, now)) {
    return `I re-checked against current Civizen sources and need to correct that. ${core}`;
  }
  const agrees =
    prior.slice(0, 80) === now.slice(0, 80) ||
    (prior.length > 40 && now.includes(prior.slice(0, 40))) ||
    (prior.includes('/agreements') && now.includes('/agreements'));
  if (agrees) {
    return `Yes. I re-checked the current Civizen project information and the same answer still holds. ${core}`;
  }
  return `I re-checked against current Civizen sources and need to correct that. ${core}`;
}

export function prepareCiviTurn(messages: HistoryTurn[], options: PrepareCiviTurnOptions = {}): CiviTurnPrep {
  const pack = options.pack ?? GENERATED_PACK;
  const latest = [...messages].reverse().find((m) => m.role === 'user');
  const latestText = latest?.content.trim() ?? '';
  const language = detectAssistantLanguage(latestText);
  const rewritten = resolveConversationalQuery(messages, pack.aliases);
  const resolvedQuery = expandAssistantQuery(rewritten.resolvedQuery);
  const searchQuery = retrievalQueryFor(
    rewritten.isVerification && rewritten.previousUserQuestion
      ? rewritten.previousUserQuestion
      : rewritten.resolvedQuery,
    language,
  );
  const canned = language === 'en' ? null : LOCALIZED_REPLIES[language];
  const greeting = isGreetingOnly(latestText);
  const hardship = isPersonalHardshipAsk(latestText);
  const peace = !hardship && isPeaceCooperationAsk(latestText);
  const cannedTopic = hardship || peace;
  const inScope = greeting || cannedTopic || isRelevantToCivizen(resolvedQuery, messages);
  const topic = classifyAssistantTopic(searchQuery);

  const rawRetrieval = inScope
    ? retrieveKnowledge(searchQuery, pack, { broaden: rewritten.isVerification, topic })
    : { faq: [], capabilities: [], documents: [] };
  const retrieval = {
    faq:
      topic === 'identity' || topic === 'current_capability'
        ? rawRetrieval.faq
        : rawRetrieval.faq.filter((h) =>
            distinctiveEnough(searchQuery, `${h.item.question} ${h.item.aliases.join(' ')} ${h.item.answer}`),
          ),
    capabilities: rawRetrieval.capabilities.filter((h) =>
      distinctiveEnough(searchQuery, `${h.item.name} ${h.item.aliases.join(' ')} ${h.item.description}`),
    ),
    documents: rawRetrieval.documents.filter((h) => distinctiveEnough(searchQuery, `${h.chunk.title} ${h.chunk.text}`)),
  };

  const confidence = retrievalConfidence(retrieval);
  const kinds = classifyRequest(resolvedQuery, latestText, pack);
  const resourcePlan = planResources({
    kinds,
    retrieval,
    confidence,
    isVerification: rewritten.isVerification,
    runtimeData: options.runtimeData,
  });

  if (rewritten.isVerification && kinds.includes('civizen_product')) {
    const priorKinds = classifyRequest(searchQuery, searchQuery, pack);
    for (const kind of priorKinds) {
      if (!resourcePlan.kinds.includes(kind)) resourcePlan.kinds.push(kind);
    }
  }

  let usedLearnedMemoryKey: string | null = null;
  const learnedHit =
    !greeting && !cannedTopic && !rewritten.isVerification
      ? pickLearnedMemory(searchQuery, options.learnedMemories, {
          catalogFaqScore: retrieval.faq[0]?.score,
          topic,
        })
      : null;

  const externalResourcesInvoked: ExternalResourceKind[] = [];
  const invokeKind = shouldInvokeExternalSearch(resourcePlan, latestText);
  if (invokeKind && !cannedTopic && !learnedHit && options.externalAdapter?.search) {
    void options.externalAdapter.search(resolvedQuery);
    externalResourcesInvoked.push(invokeKind);
  }

  let groundedAnswer: string;
  if (hardship) {
    groundedAnswer = PERSONAL_HARDSHIP_REPLY;
  } else if (peace) {
    groundedAnswer = PEACE_COOPERATION_REPLY;
  } else if (!inScope) {
    groundedAnswer = canned?.scopeRefusal ?? SCOPE_REFUSAL;
  } else if (greeting) {
    groundedAnswer = options.audience === 'guest' ? (canned?.greetingGuest ?? GREETING_GUEST) : (canned?.greeting ?? GREETING);
  } else if (resourcePlan.internalResolution === 'requires_runtime_data' && !options.runtimeData) {
    const need = resourcePlan.runtimeDataNeed;
    groundedAnswer =
      options.audience === 'guest'
        ? 'That needs a Civizen account. You can create one from Sign up, then open the relevant page.'
        : `I don't have your personal Civizen records in project knowledge. ${need?.hint ?? 'Open the relevant page while signed in.'}`;
  } else if (resourcePlan.internalResolution === 'insufficient' && kinds.includes('civizen_product') && !kinds.includes('external_world')) {
    groundedAnswer = retrieval.faq.length || retrieval.capabilities.length || retrieval.documents.length
      ? composeFromRetrieval(retrieval, searchQuery, topic, language)
      : canned?.unverified ?? `${UNVERIFIED} I can help with related current features if you name one.`;
  } else {
    groundedAnswer = composeFromRetrieval(retrieval, searchQuery, topic, language);
    if (groundedAnswer === UNVERIFIED && kinds.includes('external_world')) {
      groundedAnswer = 'I do not have a Civizen-specific fact for that. I can explain the general topic, separate from current Civizen features.';
    }
  }

  if (
    learnedHit &&
    resourcePlan.internalResolution !== 'requires_runtime_data'
  ) {
    groundedAnswer = learnedHit.answer;
    usedLearnedMemoryKey = learnedHit.questionKey;
  }

  if (inScope && !greeting && language === 'en') {
    const shapeQuery = rewritten.isVerification
      ? (rewritten.previousUserQuestion ?? latestText)
      : latestText;
    groundedAnswer = shapeAnswerToQuestion(shapeQuery, groundedAnswer);
  }

  if (rewritten.isVerification && inScope && !greeting && !cannedTopic) {
    groundedAnswer = composeVerification(rewritten.previousAssistantClaim, groundedAnswer);
  }

  if (options.runtimeData?.summary && !cannedTopic && resourcePlan.internalResolution !== 'insufficient') {
    groundedAnswer = `${groundedAnswer}\n\nFor your account: ${options.runtimeData.summary}`.trim();
  }

  const retrievedContext = formatRetrievedContext(retrieval, options.runtimeData?.summary);
  const systemPrompt = buildCiviSystemPrompt({
    pack,
    resolvedQuery,
    retrievedContext,
    groundedAnswer,
    resourcePlan,
    isVerification: rewritten.isVerification,
    audience: options.audience,
    language,
  });

  const prep: CiviTurnPrep = {
    resolvedQuery,
    inScope,
    isGreeting: greeting,
    isVerification: rewritten.isVerification,
    skipLlm: false,
    groundedAnswer,
    systemPrompt,
    retrievedContext,
    resourcePlan,
    diagnostics: {
      resolvedQuery,
      language,
      isVerification: rewritten.isVerification,
      previousUserQuestion: rewritten.previousUserQuestion,
      matchedFaqId: hardship
        ? PERSONAL_HARDSHIP_FAQ_ID
        : peace
          ? PEACE_COOPERATION_FAQ_ID
          : usedLearnedMemoryKey
            ? `learned:${usedLearnedMemoryKey}`
            : retrieval.faq[0]?.item.id ?? null,
      matchedCapabilityIds: retrieval.capabilities.map((h) => h.item.id),
      retrievedPaths: retrieval.documents.map((h) => h.chunk.path),
      capabilityStatuses: retrieval.capabilities.map((h) => ({ id: h.item.id, status: h.item.status })),
      sourcePriorities: retrieval.documents.map((h) => h.chunk.priority),
      confidence,
      requestKinds: resourcePlan.kinds,
      internalResolution: resourcePlan.internalResolution,
      allowExternalResources: resourcePlan.allowExternalResources,
      externalResourceKind: resourcePlan.externalResourceKind,
      externalResourcesInvoked,
      usedRuntimeData: Boolean(options.runtimeData?.summary),
      usedLearnedMemoryKey,
      knowledge: {
        appVersion: pack.meta.appVersion,
        appReleaseId: pack.meta.appReleaseId,
        gitSha: pack.meta.gitSha,
        generatedAt: pack.meta.generatedAt,
        sourceFingerprint: pack.meta.sourceFingerprint,
      },
    },
  };
  prep.skipLlm = cannedTopic || shouldSkipLlm(prep, { answerIsLocalized: answerIsLocalized(prep, language) });
  return prep;
}

/** English evidence for a non-English question needs the model unless a hand-written answer was used. */
function answerIsLocalized(prep: CiviTurnPrep, language: AssistantLanguage): boolean {
  if (language === 'en') return true;
  if (!prep.inScope || prep.isGreeting) return true;
  const faqId = prep.diagnostics.matchedFaqId;
  const item = faqId ? ASSISTANT_FAQ_BY_ID.get(faqId) : undefined;
  const localized = item?.localizedAnswers?.[language];
  return Boolean(localized && prep.groundedAnswer.includes(localized.trim()));
}

const ASSISTANT_FAQ_BY_ID = new Map(GENERATED_PACK.faq.map((item) => [item.id, item]));

export { UNVERIFIED, SCOPE_REFUSAL, GREETING, GREETING_GUEST };
