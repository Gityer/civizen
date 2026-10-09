import type { AssistantLanguage } from './language';

export const ASSISTANT_CAPABILITY_STATUSES = [
  'implemented',
  'experimental',
  'in_development',
  'proposed',
  'deprecated',
  'historical',
] as const;

export type AssistantCapabilityStatus = (typeof ASSISTANT_CAPABILITY_STATUSES)[number];

export type AssistantSourcePriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type HistoryTurn = { role: 'user' | 'assistant'; content: string };

export type CiviLearnedMemoryKind = 'general' | 'grounded';

export type CiviLearnedMemory = {
  questionKey: string;
  question: string;
  answer: string;
  kind: CiviLearnedMemoryKind;
};

export type AssistantCapability = {
  id: string;
  name: string;
  status: AssistantCapabilityStatus;
  description: string;
  howTo?: string;
  routes: string[];
  roles: string[];
  relatedCapabilities: string[];
  aliases: string[];
  sourceRefs: string[];
};

export type AssistantFaqItem = {
  id: string;
  question: string;
  answer: string;
  /** Hand-written answers for non-English questions; the English answer stays canonical. */
  localizedAnswers?: Partial<Record<Exclude<AssistantLanguage, 'en'>, string>>;
  aliases: string[];
  capabilityIds: string[];
  sourceRefs: string[];
};

export type TerminologyAlias = {
  current: string;
  aliases: string[];
};

export type KnowledgeChunk = {
  id: string;
  title: string;
  path: string;
  text: string;
  status: AssistantCapabilityStatus;
  priority: AssistantSourcePriority;
  kind: 'identity' | 'cheatsheet' | 'faq' | 'capability' | 'doc' | 'registry';
};

export type KnowledgePackMeta = {
  appVersion: string;
  appReleaseId: string;
  androidVersionCode: number;
  gitSha: string;
  generatedAt: string;
  sourceFingerprint: string;
  knowledgeFormat: number;
  sourceCount: number;
  chunkCount: number;
};

export type KnowledgePack = {
  meta: KnowledgePackMeta;
  capabilities: AssistantCapability[];
  faq: AssistantFaqItem[];
  aliases: TerminologyAlias[];
  chunks: KnowledgeChunk[];
};

export type RetrievedFaqHit = {
  item: AssistantFaqItem;
  score: number;
};

export type RetrievedCapabilityHit = {
  item: AssistantCapability;
  score: number;
};

export type RetrievedChunkHit = {
  chunk: KnowledgeChunk;
  score: number;
};

export type RetrievalResult = {
  faq: RetrievedFaqHit[];
  capabilities: RetrievedCapabilityHit[];
  documents: RetrievedChunkHit[];
};

export const REQUEST_KINDS = [
  'civizen_product',
  'civizen_user_data',
  'general_reasoning',
  'external_world',
  'external_action',
] as const;

export type RequestKind = (typeof REQUEST_KINDS)[number];

export const INTERNAL_RESOLUTIONS = [
  'sufficient',
  'insufficient',
  'requires_runtime_data',
  'requires_external_information',
  'requires_external_action',
] as const;

export type InternalResolution = (typeof INTERNAL_RESOLUTIONS)[number];

export type ExternalResourceKind = 'none' | 'model_general_knowledge' | 'external_search' | 'external_action';

export type RuntimeDataNeed = {
  topic: string;
  hint: string;
  routes: string[];
};

export type RuntimeUserContext = {
  summary: string;
  source: 'authenticated_runtime';
};

export type ResourcePlan = {
  kinds: RequestKind[];
  internalResolution: InternalResolution;
  allowLlmReasoning: boolean;
  allowExternalResources: boolean;
  externalResourceKind: ExternalResourceKind;
  runtimeDataNeed: RuntimeDataNeed | null;
  reason: string;
};

export type ExternalResourceAdapter = {
  search?: (query: string) => Promise<string | null> | string | null;
};

export type CiviDiagnostics = {
  resolvedQuery: string;
  language: AssistantLanguage;
  isVerification: boolean;
  previousUserQuestion: string | null;
  matchedFaqId: string | null;
  matchedCapabilityIds: string[];
  retrievedPaths: string[];
  capabilityStatuses: Array<{ id: string; status: AssistantCapabilityStatus }>;
  sourcePriorities: AssistantSourcePriority[];
  confidence: 'high' | 'medium' | 'low' | 'none';
  requestKinds: RequestKind[];
  internalResolution: InternalResolution;
  allowExternalResources: boolean;
  externalResourceKind: ExternalResourceKind;
  externalResourcesInvoked: ExternalResourceKind[];
  usedRuntimeData: boolean;
  usedLearnedMemoryKey: string | null;
  knowledge: {
    appVersion: string;
    appReleaseId: string;
    gitSha: string;
    generatedAt: string;
    sourceFingerprint: string;
  };
};

export type CiviTurnPrep = {
  resolvedQuery: string;
  inScope: boolean;
  isGreeting: boolean;
  isVerification: boolean;
  skipLlm: boolean;
  groundedAnswer: string;
  systemPrompt: string;
  retrievedContext: string;
  resourcePlan: ResourcePlan;
  diagnostics: CiviDiagnostics;
};

export type PrepareCiviTurnOptions = {
  pack?: KnowledgePack;
  runtimeData?: RuntimeUserContext | null;
  externalAdapter?: ExternalResourceAdapter | null;
  debug?: boolean;
  audience?: 'member' | 'guest';
  learnedMemories?: CiviLearnedMemory[];
};
