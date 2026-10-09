import { isPersonalHardshipAsk } from './hardship';
import { isPeaceCooperationAsk } from './peace';
import { classifyAssistantTopic } from './identity';
import { searchFaq, tokenize } from './retrieval';
import type { AssistantFaqItem, CiviLearnedMemory, CiviLearnedMemoryKind, CiviTurnPrep, RequestKind } from './types';

export const CIVI_LEARNED_MEMORY_LIMIT = 200;
export const CIVI_LEARNED_MEMORY_CAP = 400;
export const CIVI_LEARNED_ANSWER_MIN = 40;
export const CIVI_LEARNED_ANSWER_MAX = 2000;

export type { CiviLearnedMemory, CiviLearnedMemoryKind };

export type LearnDecision =
  | { action: 'skip'; reason: string }
  | {
      action: 'learn';
      kind: CiviLearnedMemoryKind;
      questionKey: string;
      question: string;
      answer: string;
    };

const ONE_OFF_RE =
  /\b(help me (draft|write|improve|plan|revise)|brainstorm|make this (better|stronger)|critique)\b/i;
const CIVIZEN_FEATURE_CLAIM_RE =
  /\b(civizen (now )?(has|supports|offers|includes|lets you|allows you)|you can (create|sign|open|use|post|vote) .{0,80}(in|on|through|with) civizen)\b/i;
const UNVERIFIED_RE = /couldn['’]t verify|could not verify/i;

export function memoryQuestionKey(question: string): string {
  return tokenize(question).join(' ').slice(0, 180);
}

export function memoryToFaq(memory: CiviLearnedMemory): AssistantFaqItem {
  return {
    id: `learned:${memory.questionKey}`,
    question: memory.question,
    answer: memory.answer,
    aliases: [memory.questionKey],
    capabilityIds: [],
    sourceRefs: ['civi-learned-memory'],
  };
}

function overlapRatio(query: string, text: string): number {
  const generic = new Set(['civizen', 'nela', 'civi', 'app', 'feature', 'platform']);
  const qTerms = tokenize(query).filter((term) => !generic.has(term));
  if (!qTerms.length) return 1;
  const hay = new Set(tokenize(text));
  return qTerms.filter((term) => hay.has(term)).length / qTerms.length;
}

export function pickLearnedMemory(
  query: string,
  memories: CiviLearnedMemory[] | undefined,
  options?: { catalogFaqScore?: number; topic?: ReturnType<typeof classifyAssistantTopic> },
): CiviLearnedMemory | null {
  if (!memories?.length) return null;
  const topic = options?.topic ?? classifyAssistantTopic(query);
  if (topic === 'identity' || topic === 'current_capability') return null;

  const hits = searchFaq(query, memories.map(memoryToFaq), 2);
  const hit = hits[0];
  if (!hit || hit.score < 1.5) return null;
  const memory = memories.find((item) => `learned:${item.questionKey}` === hit.item.id);
  if (!memory) return null;
  if (overlapRatio(query, `${memory.question} ${memory.answer}`) < 0.28) return null;
  if (memory.kind === 'grounded' && (options?.catalogFaqScore ?? 0) >= hit.score) return null;
  return memory;
}

function evidenceText(prep: Pick<CiviTurnPrep, 'groundedAnswer' | 'retrievedContext'>): string {
  return `${prep.groundedAnswer}\n${prep.retrievedContext}`;
}

function looksLikeInventedCivizenFact(answer: string, evidence: string): boolean {
  if (!CIVIZEN_FEATURE_CLAIM_RE.test(answer)) return false;
  return overlapRatio(answer, evidence) < 0.28;
}

export function reviewLlmAnswerForLearning(args: {
  question: string;
  llmAnswer: string;
  prep: Pick<
    CiviTurnPrep,
    'inScope' | 'isGreeting' | 'isVerification' | 'skipLlm' | 'groundedAnswer' | 'retrievedContext' | 'resourcePlan' | 'diagnostics'
  >;
}): LearnDecision {
  const { question, llmAnswer, prep } = args;
  const answer = llmAnswer.trim();
  const questionKey = memoryQuestionKey(question);

  if (prep.skipLlm) return { action: 'skip', reason: 'already answered without the model' };
  if (isPersonalHardshipAsk(question)) return { action: 'skip', reason: 'personal hardship is not stored' };
  if (isPeaceCooperationAsk(question)) return { action: 'skip', reason: 'peace guidance is canonical, not learned' };
  if (prep.diagnostics.usedLearnedMemoryKey) return { action: 'skip', reason: 'already answered from Civi memory' };
  if (prep.isGreeting || prep.isVerification) return { action: 'skip', reason: 'not a reusable question' };
  const kinds: RequestKind[] = prep.resourcePlan.kinds;
  const general = kinds.includes('general_reasoning') || kinds.includes('external_world');
  if (!prep.inScope && !general) return { action: 'skip', reason: 'not a reusable question' };
  if (!questionKey) return { action: 'skip', reason: 'question too thin to remember' };
  if (answer.length < CIVI_LEARNED_ANSWER_MIN || answer.length > CIVI_LEARNED_ANSWER_MAX) {
    return { action: 'skip', reason: 'answer length is not reusable' };
  }
  if (UNVERIFIED_RE.test(answer) && answer.length < 180) return { action: 'skip', reason: 'unverified placeholder' };
  if (classifyAssistantTopic(question) !== 'other') return { action: 'skip', reason: 'canonical Civizen topic' };
  if (prep.resourcePlan.internalResolution === 'requires_runtime_data') {
    return { action: 'skip', reason: 'personal records are not stored in Civi memory' };
  }
  if (ONE_OFF_RE.test(question)) return { action: 'skip', reason: 'one-off drafting request' };

  const product = kinds.includes('civizen_product');
  const evidence = evidenceText(prep);

  if (product && prep.resourcePlan.internalResolution === 'insufficient' && !kinds.includes('external_world')) {
    return { action: 'skip', reason: 'unverified Civizen facts are not learned from the model' };
  }
  if (looksLikeInventedCivizenFact(answer, evidence)) {
    return { action: 'skip', reason: 'model invented a Civizen capability' };
  }

  if (product && overlapRatio(answer, prep.groundedAnswer) >= 0.3 && !UNVERIFIED_RE.test(prep.groundedAnswer)) {
    return {
      action: 'learn',
      kind: 'grounded',
      questionKey,
      question: question.trim(),
      answer,
    };
  }

  if (general && !product) {
    return {
      action: 'learn',
      kind: 'general',
      questionKey,
      question: question.trim(),
      answer,
    };
  }

  if (general && product && !looksLikeInventedCivizenFact(answer, evidence)) {
    return {
      action: 'learn',
      kind: 'general',
      questionKey,
      question: question.trim(),
      answer,
    };
  }

  return { action: 'skip', reason: 'answer is not a reusable Civi memory' };
}

export function learnedMemoryFromRow(row: {
  question_key?: string;
  question?: string;
  answer?: string;
  kind?: string;
}): CiviLearnedMemory | null {
  const questionKey = typeof row.question_key === 'string' ? row.question_key.trim() : '';
  const question = typeof row.question === 'string' ? row.question.trim() : '';
  const answer = typeof row.answer === 'string' ? row.answer.trim() : '';
  const kind = row.kind === 'grounded' ? 'grounded' : row.kind === 'general' ? 'general' : null;
  if (!questionKey || !question || !answer || !kind) return null;
  return { questionKey, question, answer, kind };
}
