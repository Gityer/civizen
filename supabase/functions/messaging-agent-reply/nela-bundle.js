// src/lib/assistant/answer-shape.ts
function detectQuestionShape(query) {
  const text = query.trim().replace(/^[^A-Za-z0-9]+/, "");
  if (!text) return "other";
  if (/^(how|where)\b/i.test(text)) return "how";
  if (/^(what is the (way|path|process)|walk me through|show me how)\b/i.test(text)) return "how";
  if (/^(can|could|does|do|is|are|will|would|should|may|might)\b/i.test(text)) return "yesno";
  if (/\bis it possible\b/i.test(text)) return "yesno";
  return "other";
}
function shapeAnswerToQuestion(query, answer) {
  const trimmed = answer.trim();
  if (!trimmed) return trimmed;
  const shape = detectQuestionShape(query);
  if (shape === "how") return trimmed.replace(/^Yes\.\s+/i, "");
  if (shape === "yesno" && /^Open\s/i.test(trimmed) && !/^(yes|no)\b/i.test(trimmed)) {
    return `Yes. ${trimmed}`;
  }
  return trimmed;
}

// src/lib/assistant/hardship.ts
var HARDSHIP_RE = /\b(homeless|houseless|unhoused|no( |-)?where to (sleep|stay|live)|no place to (sleep|stay|live)|need (a )?(shelter|place to stay)|looking for shelter|sleeping (outside|rough|on the street|in (my|a) car)|i('m| am) (hungry|starving)|need food|food (insecure|insecurity)|evicted|facing eviction|i need housing|house me)\b/i;
var OFFERING_HELP_RE = /\b(how (can|do) i (contribute|help|volunteer)|want to help (others|people|the community)|ways to contribute)\b/i;
var PERSONAL_HARDSHIP_FAQ_ID = "if_i_need_housing_or_emergency_help";
var PERSONAL_HARDSHIP_REPLY = "I'm sorry you're going through this. Civizen is not a shelter, housing office, or emergency service, and I cannot arrange a place to stay or send money.\n\nIf you need a safe place tonight, contact local emergency services or a local homelessness helpline. In many regions, 211 can connect you to nearby help.\n\nIf you want work, Jobs is open without an account. Open Market > Jobs. Community Challenges is for local problems over time \u2014 not emergency housing.";
function isPersonalHardshipAsk(content) {
  const text = content.trim();
  if (!text) return false;
  if (OFFERING_HELP_RE.test(text)) return false;
  return HARDSHIP_RE.test(text);
}

// src/lib/assistant/identity.ts
var IDENTITY_SOURCE_PATH = "docs/assistant/civizen-identity.md";
var IDENTITY_FAQ_IDS = /* @__PURE__ */ new Set([
  "what_is_civizen",
  "what_civizen_trying_to_accomplish",
  "is_civizen_a_social_network",
  "is_civizen_a_project_collaboration_platform"
]);
var CAPABILITY_NOW_RE = /\b(what can i (currently )?do|what (can|does) (?:i|civizen) (currently )?(do|support|offer|include)|right now|current(ly)? (features|capabilities|functionality)|what works (today|now)|what(?:'s| is) (?:implemented|available) (?:now|today|in this (?:app|build)))\b/i;
var IDENTITY_RE = /\b(what(?:'s| is|s) civizen|describe civizen|define civizen|civizen in one sentence|what kind of (system|platform|app) is civizen|what is the purpose of civizen|civizen(?:'s)? (overall )?(identity|purpose|mission|scope)|why (does )?civizen exist)\b/i;
var NARROW_REDEFINITION_RE = /\b(basically|just|mainly|merely|only|simply)\b.{0,40}\b(project|projects|challenge|collaboration|marketplace|social|learning|governance app|pm |jira|asana)\b/i;
function classifyAssistantTopic(query) {
  const text = query.trim();
  if (!text) return "other";
  if (CAPABILITY_NOW_RE.test(text)) return "current_capability";
  if (NARROW_REDEFINITION_RE.test(text) || IDENTITY_RE.test(text)) return "identity";
  return "other";
}
function isIdentitySourcePath(path) {
  return path === IDENTITY_SOURCE_PATH || path.endsWith("/civizen-identity.md");
}
function isFoundationIdentityPath(path) {
  return path.startsWith("docs/00-foundation/") || path === "docs/02-policies/governance/civizen-community-governance-charter.md";
}

// src/lib/assistant/peace.ts
var PEACE_RE = /\b(stop(ping)? (the )?wars?|end(ing)? (the )?wars?|prevent(ing)? wars?|world peace|(achieve|create|build|make|keep|protect) (world |lasting |global )?peace|live in peace|peaceful coexistence|unite humanity|end (the )?fighting|stop (the )?fighting|how (can|do|should) (we|humanity|people) .{0,48}(peace|war|wars|unite))\b/i;
var PEACE_COOPERATION_FAQ_ID = "how_can_we_stop_wars";
var PEACE_COOPERATION_REPLY = "Civizen exists to help people unite around shared human responsibility. Peace needs more than speeches, slogans, or treaties. It needs practical systems people can join, examine, improve, and hold accountable.\n\nUnity does not require uniformity \u2014 nations and cultures stay, while a complementary world citizenship adds a shared layer of responsibility. Civizen is not a government. It is the work through which wars should become unnecessary, because people have practical tools to create and protect peace instead of only hoping for it.\n\nStart by signing up, then make a contribution. You can take part through Community Challenges, Opportunities, Study, and Governance.";
function isPeaceCooperationAsk(content) {
  const text = content.trim();
  if (!text) return false;
  return PEACE_RE.test(text);
}

// src/lib/assistant/retrieval.ts
var STOP = /* @__PURE__ */ new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "for",
  "is",
  "are",
  "was",
  "be",
  "this",
  "that",
  "with",
  "from",
  "as",
  "at",
  "by",
  "it",
  "its",
  "you",
  "your",
  "we",
  "can",
  "how",
  "what",
  "who",
  "where",
  "when",
  "do",
  "does",
  "did",
  "i",
  "me",
  "my"
]);
var PRIORITY_WEIGHT = {
  1: 1.22,
  2: 1.15,
  3: 1.08,
  4: 1.04,
  5: 1.1,
  6: 1,
  7: 0.72,
  8: 0.42
};
function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9+/.-]+/g, " ").split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t));
}
function termFreq(tokens) {
  const map = /* @__PURE__ */ new Map();
  for (const t of tokens) map.set(t, (map.get(t) ?? 0) + 1);
  return map;
}
function bm25Score(queryTokens, docTokens, avgLen) {
  if (!queryTokens.length || !docTokens.length) return 0;
  const tf = termFreq(docTokens);
  const k1 = 1.2;
  const b = 0.75;
  const len = docTokens.length;
  let score = 0;
  const unique = [...new Set(queryTokens)];
  for (const term of unique) {
    const f = tf.get(term) ?? 0;
    if (!f) continue;
    const idf = 1.4;
    score += idf * (f * (k1 + 1) / (f + k1 * (1 - b + b * (len / Math.max(avgLen, 1)))));
  }
  return score;
}
function faqHaystack(item) {
  return `${item.question} ${item.aliases.join(" ")} ${item.answer}`;
}
function capabilityHaystack(item) {
  return `${item.name} ${item.aliases.join(" ")} ${item.description} ${item.howTo ?? ""} ${item.routes.join(" ")}`;
}
function distinctiveOverlap(query, text) {
  const generic = /* @__PURE__ */ new Set(["civizen", "nela", "app", "feature", "platform", "member", "members", "help", "need", "please"]);
  const allTerms = tokenize(query);
  const qTerms = allTerms.filter((t) => !generic.has(t));
  if (!qTerms.length) {
    return allTerms.some((t) => t === "help" || t === "need" || t === "please") ? 0 : 1;
  }
  const hay = new Set(tokenize(text));
  return qTerms.filter((t) => hay.has(t)).length / qTerms.length;
}
function searchFaq(query, faq, limit = 3) {
  const q = query.toLowerCase();
  const qTokens = tokenize(query);
  const avg = faq.reduce((s, item) => s + tokenize(faqHaystack(item)).length, 0) / Math.max(faq.length, 1);
  return faq.map((item) => {
    const hay = faqHaystack(item).toLowerCase();
    let score = bm25Score(qTokens, tokenize(hay), avg);
    if (item.question.toLowerCase() === q || q.includes(item.question.toLowerCase())) score += 8;
    for (const alias of [item.question, ...item.aliases]) {
      if (alias && q.includes(alias.toLowerCase()) && alias.length > 8) score += 6;
    }
    const overlap = distinctiveOverlap(query, hay);
    if (overlap < 0.2) score *= 0.15;
    else score *= 0.6 + overlap;
    return { item, score };
  }).filter((h) => h.score > 1.2).sort((a, b) => b.score - a.score).slice(0, limit);
}
function searchCapabilities(query, capabilities, limit = 4) {
  const q = query.toLowerCase();
  const qTokens = tokenize(query);
  const avg = capabilities.reduce((s, item) => s + tokenize(capabilityHaystack(item)).length, 0) / Math.max(capabilities.length, 1);
  return capabilities.map((item) => {
    const hay = capabilityHaystack(item).toLowerCase();
    let score = bm25Score(qTokens, tokenize(hay), avg);
    if (q.includes(item.name.toLowerCase()) || hay.includes(q)) score += 5;
    for (const alias of item.aliases) {
      if (alias && q.includes(alias.toLowerCase())) score += 4;
    }
    if (item.routes.some((route) => q.includes(route))) score += 3;
    return { item, score };
  }).filter((h) => h.score > 0.7).sort((a, b) => b.score - a.score).slice(0, limit);
}
function searchChunks(query, chunks, options) {
  const limit = options?.limit ?? (options?.broaden ? 8 : 4);
  const q = query.toLowerCase();
  const qTokens = tokenize(query);
  const avg = chunks.reduce((s, c) => s + tokenize(c.text).length, 0) / Math.max(chunks.length, 1);
  const minScore = options?.broaden ? 0.35 : 0.55;
  return chunks.map((chunk) => {
    const hay = `${chunk.title} ${chunk.path} ${chunk.text}`.toLowerCase();
    let score = bm25Score(qTokens, tokenize(hay), avg) * (PRIORITY_WEIGHT[chunk.priority] ?? 1);
    if (hay.includes(q.slice(0, 80))) score += 2;
    if (chunk.title && q.includes(chunk.title.toLowerCase())) score += 3;
    if (chunk.path && q.includes(chunk.path.toLowerCase())) score += 2;
    return { chunk, score };
  }).filter((h) => h.score > minScore).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.chunk.priority - b.chunk.priority;
  }).slice(0, limit);
}
function retrieveKnowledge(query, pack, options) {
  const topic = options?.topic ?? classifyAssistantTopic(query);
  if (topic === "identity") {
    const identityFaq = pack.faq.filter((item) => IDENTITY_FAQ_IDS.has(item.id));
    const identityChunks = pack.chunks.filter(
      (chunk) => chunk.kind === "identity" || isIdentitySourcePath(chunk.path) || isFoundationIdentityPath(chunk.path)
    );
    return {
      faq: searchFaq(query, identityFaq.length ? identityFaq : pack.faq, options?.broaden ? 5 : 3),
      capabilities: [],
      documents: searchChunks(query, identityChunks.length ? identityChunks : pack.chunks, {
        broaden: options?.broaden
      })
    };
  }
  if (topic === "current_capability") {
    const capabilityFaq = pack.faq.filter((item) => !IDENTITY_FAQ_IDS.has(item.id));
    const capabilityChunks = pack.chunks.filter(
      (chunk) => chunk.kind !== "identity" && !isIdentitySourcePath(chunk.path)
    );
    return {
      faq: searchFaq(query, capabilityFaq, options?.broaden ? 5 : 3),
      capabilities: searchCapabilities(query, pack.capabilities, options?.broaden ? 6 : 4),
      documents: searchChunks(query, capabilityChunks, { broaden: options?.broaden })
    };
  }
  return {
    faq: searchFaq(query, pack.faq, options?.broaden ? 5 : 3),
    capabilities: searchCapabilities(query, pack.capabilities, options?.broaden ? 6 : 4),
    documents: searchChunks(query, pack.chunks, { broaden: options?.broaden })
  };
}
function preferCurrentEvidence(hits) {
  return [...hits].sort((a, b) => {
    const aHist = a.chunk.status === "historical" || a.chunk.status === "deprecated" ? 1 : 0;
    const bHist = b.chunk.status === "historical" || b.chunk.status === "deprecated" ? 1 : 0;
    if (aHist !== bHist) return aHist - bHist;
    if (a.chunk.priority !== b.chunk.priority) return a.chunk.priority - b.chunk.priority;
    return b.score - a.score;
  });
}

// src/lib/assistant/learned-memory.ts
var CIVI_LEARNED_ANSWER_MIN = 40;
var CIVI_LEARNED_ANSWER_MAX = 2e3;
var ONE_OFF_RE = /\b(help me (draft|write|improve|plan|revise)|brainstorm|make this (better|stronger)|critique)\b/i;
var CIVIZEN_FEATURE_CLAIM_RE = /\b(civizen (now )?(has|supports|offers|includes|lets you|allows you)|you can (create|sign|open|use|post|vote) .{0,80}(in|on|through|with) civizen)\b/i;
var UNVERIFIED_RE = /couldn['’]t verify|could not verify/i;
function memoryQuestionKey(question) {
  return tokenize(question).join(" ").slice(0, 180);
}
function memoryToFaq(memory) {
  return {
    id: `learned:${memory.questionKey}`,
    question: memory.question,
    answer: memory.answer,
    aliases: [memory.questionKey],
    capabilityIds: [],
    sourceRefs: ["civi-learned-memory"]
  };
}
function overlapRatio(query, text) {
  const generic = /* @__PURE__ */ new Set(["civizen", "nela", "civi", "app", "feature", "platform"]);
  const qTerms = tokenize(query).filter((term) => !generic.has(term));
  if (!qTerms.length) return 1;
  const hay = new Set(tokenize(text));
  return qTerms.filter((term) => hay.has(term)).length / qTerms.length;
}
function pickLearnedMemory(query, memories, options) {
  if (!memories?.length) return null;
  const topic = options?.topic ?? classifyAssistantTopic(query);
  if (topic === "identity" || topic === "current_capability") return null;
  const hits = searchFaq(query, memories.map(memoryToFaq), 2);
  const hit = hits[0];
  if (!hit || hit.score < 1.5) return null;
  const memory = memories.find((item) => `learned:${item.questionKey}` === hit.item.id);
  if (!memory) return null;
  if (overlapRatio(query, `${memory.question} ${memory.answer}`) < 0.28) return null;
  if (memory.kind === "grounded" && (options?.catalogFaqScore ?? 0) >= hit.score) return null;
  return memory;
}
function evidenceText(prep) {
  return `${prep.groundedAnswer}
${prep.retrievedContext}`;
}
function looksLikeInventedCivizenFact(answer, evidence) {
  if (!CIVIZEN_FEATURE_CLAIM_RE.test(answer)) return false;
  return overlapRatio(answer, evidence) < 0.28;
}
function reviewLlmAnswerForLearning(args) {
  const { question, llmAnswer, prep } = args;
  const answer = llmAnswer.trim();
  const questionKey = memoryQuestionKey(question);
  if (prep.skipLlm) return { action: "skip", reason: "already answered without the model" };
  if (isPersonalHardshipAsk(question)) return { action: "skip", reason: "personal hardship is not stored" };
  if (isPeaceCooperationAsk(question)) return { action: "skip", reason: "peace guidance is canonical, not learned" };
  if (prep.diagnostics.usedLearnedMemoryKey) return { action: "skip", reason: "already answered from Civi memory" };
  if (prep.isGreeting || prep.isVerification) return { action: "skip", reason: "not a reusable question" };
  const kinds = prep.resourcePlan.kinds;
  const general = kinds.includes("general_reasoning") || kinds.includes("external_world");
  if (!prep.inScope && !general) return { action: "skip", reason: "not a reusable question" };
  if (!questionKey) return { action: "skip", reason: "question too thin to remember" };
  if (answer.length < CIVI_LEARNED_ANSWER_MIN || answer.length > CIVI_LEARNED_ANSWER_MAX) {
    return { action: "skip", reason: "answer length is not reusable" };
  }
  if (UNVERIFIED_RE.test(answer) && answer.length < 180) return { action: "skip", reason: "unverified placeholder" };
  if (classifyAssistantTopic(question) !== "other") return { action: "skip", reason: "canonical Civizen topic" };
  if (prep.resourcePlan.internalResolution === "requires_runtime_data") {
    return { action: "skip", reason: "personal records are not stored in Civi memory" };
  }
  if (ONE_OFF_RE.test(question)) return { action: "skip", reason: "one-off drafting request" };
  const product = kinds.includes("civizen_product");
  const evidence = evidenceText(prep);
  if (product && prep.resourcePlan.internalResolution === "insufficient" && !kinds.includes("external_world")) {
    return { action: "skip", reason: "unverified Civizen facts are not learned from the model" };
  }
  if (looksLikeInventedCivizenFact(answer, evidence)) {
    return { action: "skip", reason: "model invented a Civizen capability" };
  }
  if (product && overlapRatio(answer, prep.groundedAnswer) >= 0.3 && !UNVERIFIED_RE.test(prep.groundedAnswer)) {
    return {
      action: "learn",
      kind: "grounded",
      questionKey,
      question: question.trim(),
      answer
    };
  }
  if (general && !product) {
    return {
      action: "learn",
      kind: "general",
      questionKey,
      question: question.trim(),
      answer
    };
  }
  if (general && product && !looksLikeInventedCivizenFact(answer, evidence)) {
    return {
      action: "learn",
      kind: "general",
      questionKey,
      question: question.trim(),
      answer
    };
  }
  return { action: "skip", reason: "answer is not a reusable Civi memory" };
}
function learnedMemoryFromRow(row) {
  const questionKey = typeof row.question_key === "string" ? row.question_key.trim() : "";
  const question = typeof row.question === "string" ? row.question.trim() : "";
  const answer = typeof row.answer === "string" ? row.answer.trim() : "";
  const kind = row.kind === "grounded" ? "grounded" : row.kind === "general" ? "general" : null;
  if (!questionKey || !question || !answer || !kind) return null;
  return { questionKey, question, answer, kind };
}

// src/lib/assistant/prompt.ts
var CORE_INSTRUCTIONS = [
  "You are Civi, Civizen\u2019s AI assistant for this Civizen build.",
  "Simple by default. Detailed by choice. Answer concisely in plain language that matches current Civizen UI terms.",
  "For questions about Civizen current functionality, architecture, rules, governance, terminology, capabilities, or policies, rely only on the supplied current Civizen knowledge and retrieved project sources. Do not invent missing project facts from general model knowledge.",
  "Never confidently state an unverified Civizen fact.",
  "If current project information cannot verify a Civizen claim, say you could not verify it from Civizen current project information. You may mention related verified facts.",
  "Do not say Civizen does not support something unless the capability registry or current implementation evidence is strong. Otherwise say you could not verify a current Civizen feature for that.",
  "If something is proposed, in development, experimental, deprecated, or historical, say so. Do not present plans as live features.",
  "When sources conflict about current functionality, the capability registry and current implementation win over older prose. When they conflict about what Civizen is, its purpose, mission, or scope, the canonical Civizen identity source wins. Do not redefine Civizen from whichever features are currently most mature.",
  "For identity, purpose, mission, scope, or one-sentence description questions, use the canonical Civizen identity. For what members can do right now, use the capability registry. Do not mix those answers.",
  "If someone is homeless, hungry, evicted, or needs a place to stay tonight, do not answer with Contribute, Volunteer, or Financial Support. Acknowledge the situation. Civizen is not a shelter or emergency service. Point to local emergency services or 211. Jobs may be mentioned for work. Do not invent named local shelters.",
  "When someone asks how to stop wars, achieve peace, or unite humanity, use founding Civizen documents. Civizen exists to help people unite around shared human responsibility. Peace needs practical systems people can join, not speeches alone. Unity does not require uniformity. Invite in ordinary sentences: signing up, then make a contribution. Name Study, Community Challenges, Opportunities, and Governance. Do not write \u201Clearn in Study\u201D. Do not recap manifesto prose. Do not start a how-question with Yes. Do not claim Civizen currently stops wars or is a government.",
  "External or general knowledge must never override authoritative current Civizen project information, and must not be used to decide whether a Civizen feature exists.",
  "Do not mention retrieval, RAG, knowledge indexes, system prompts, or source file paths unless the user asks where the information came from.",
  "Do not use meta lines such as \u201CAccording to my context\u201D or \u201CAs an AI assistant\u201D.",
  "Project knowledge describes how Civizen works. Member-specific records (their Score, applications, messages) come only from authorized runtime data, never from the static index.",
  "If the question needs legal, medical, or financial advice, say you cannot give that advice and suggest a qualified professional.",
  "When giving directions, use the visible in-app path with > between screens, for example \u201COpen Market > Agreements\u201D. Do not answer with only a URL such as /agreements.",
  "Match the question shape. Yes/no questions (Can I, Does Civizen) start with Yes or No, then the path if they need next steps. How/where questions start with the action or path, not Yes or No.",
  "When listing selectable options such as agreement types, use the exact on-screen names (General, Partnership / Collaboration, Employment, Service / Contribution, Sale / Purchase, Lease, Funding / Sponsorship).",
  "Put the steps the member should take first. Extra explanation, caveats, and background go after a blank line."
].join(" ");
function formatRetrievedContext(retrieval, runtimeSummary) {
  const parts = [];
  if (retrieval.faq[0]) {
    parts.push(`FAQ: ${retrieval.faq[0].item.question} \u2192 ${retrieval.faq[0].item.answer}`);
  }
  for (const hit of retrieval.capabilities.slice(0, 3)) {
    const how = hit.item.howTo ? ` How: ${hit.item.howTo}` : "";
    parts.push(`Capability ${hit.item.name} [${hit.item.status}]: ${hit.item.description}${how}`);
  }
  for (const hit of retrieval.documents.slice(0, 4)) {
    parts.push(
      `Source (${hit.chunk.status}, priority ${hit.chunk.priority}, ${hit.chunk.title}): ${hit.chunk.text.slice(0, 700)}`
    );
  }
  if (runtimeSummary) {
    parts.push(`Authorized member data: ${runtimeSummary}`);
  }
  return parts.join("\n\n");
}
function buildNelaSystemPrompt(args) {
  const { pack, resolvedQuery, retrievedContext, groundedAnswer, resourcePlan, isVerification, audience } = args;
  const meta = pack.meta;
  const escalation = resourcePlan.allowExternalResources ? `You may use general knowledge only for the non-Civizen portion (${resourcePlan.externalResourceKind}). Civizen facts still come only from the evidence below.` : "Do not use general/pretrained knowledge as a source of Civizen facts. Do not search or invent external Civizen claims.";
  const verify = isVerification ? "This is a verification follow-up. Re-check the previous claim against higher-authority Civizen evidence. Correct yourself if needed and briefly say what you verified." : "";
  const guest = audience === "guest" ? "This visitor is not signed in. Answer from public project knowledge. Do not claim access to personal records. If a step needs an account, say they can create one from Sign up. Public pages such as Areas, Governance, documents, About, and Market Jobs can be used without registering. For peace, war, or cooperation questions, lead with what they can do next in Civizen, then invite Sign up. Do not leave them with only a philosophical paragraph." : "";
  return [
    CORE_INSTRUCTIONS,
    guest,
    `Knowledge build: app ${meta.appVersion} (${meta.appReleaseId}).`,
    `Resolved question: ${resolvedQuery}`,
    `Internal resolution: ${resourcePlan.internalResolution}. ${escalation}`,
    verify,
    "Preferred grounded answer to stay consistent with:",
    groundedAnswer,
    "Evidence:",
    retrievedContext || "(no additional passages)"
  ].filter(Boolean).join("\n\n");
}
function shouldSkipLlm(prep) {
  if (prep.diagnostics.usedLearnedMemoryKey) return true;
  if (prep.diagnostics.matchedFaqId === "if_i_need_housing_or_emergency_help" || prep.diagnostics.matchedFaqId === "how_can_we_stop_wars") {
    return true;
  }
  if (!prep.inScope) return true;
  if (prep.isGreeting) return true;
  if (prep.resourcePlan.internalResolution === "requires_runtime_data" && !prep.resourcePlan.allowLlmReasoning) {
    return true;
  }
  if (prep.resourcePlan.allowLlmReasoning) return false;
  if (prep.resourcePlan.allowExternalResources) return false;
  return prep.diagnostics.confidence === "high" && prep.resourcePlan.internalResolution === "sufficient";
}

// src/lib/assistant/query-rewrite.ts
var VERIFICATION_PATTERNS = [
  /^\s*are you sure\b/i,
  /^\s*check again\b/i,
  /^\s*where did you get that\b/i,
  /^\s*is that (true|correct|right|accurate)\b/i,
  /^\s*really\??\s*$/i,
  /^\s*verify( that)?\b/i,
  /^\s*didn['’]?t we implement\b/i,
  /^\s*i think we have that\b/i,
  /^\s*what about the feature we added\b/i,
  /^\s*can you (double[- ]?check|confirm|verify)\b/i,
  /^\s*positive\??\s*$/i,
  /^\s*(are you )?positive\??\s*$/i,
  /^\s*you sure\??\s*$/i,
  /^\s*confirm\??\s*$/i,
  /^\s*certain\??\s*$/i,
  /^\s*definitely\??\s*$/i,
  /^\s*absolutely\??\s*$/i
];
var SHORT_FOLLOWUP_MAX = 90;
function isVerificationFollowUp(content) {
  const c = content.trim();
  if (!c) return false;
  return VERIFICATION_PATTERNS.some((re) => re.test(c));
}
function isScopeRefusal(content) {
  const c = content.trim().toLowerCase();
  return c.includes("i can only help with civizen-related topics");
}
function lastTurn(messages, role) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === role && messages[i].content.trim()) return messages[i];
  }
  return null;
}
function lastSubstantiveUserMessage(messages) {
  const latest = messages.filter((m) => m.role === "user" && m.content.trim());
  for (let i = latest.length - 1; i >= 0; i -= 1) {
    const text = latest[i].content.trim();
    if (isVerificationFollowUp(text)) continue;
    if (text.length <= 1) continue;
    return latest[i];
  }
  return latest[latest.length - 1] ?? null;
}
function lastSubstantiveAssistantMessage(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const text = m.content.trim();
    if (!text) continue;
    if (isScopeRefusal(text)) continue;
    if (text.toLowerCase().includes("could not generate a reply")) continue;
    return m;
  }
  return null;
}
function applyAliases(query, aliases) {
  let next = query;
  for (const entry of aliases) {
    for (const alias of entry.aliases) {
      const re = new RegExp(`\\b${escapeRegExp(alias)}\\b`, "ig");
      if (re.test(next) && !next.toLowerCase().includes(entry.current.toLowerCase())) {
        next = `${next} ${entry.current}`;
      }
    }
  }
  return next;
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function resolveConversationalQuery(messages, aliases = []) {
  const latest = lastTurn(messages, "user");
  const latestText = latest?.content.trim() ?? "";
  const previousUser = lastSubstantiveUserMessage(messages.filter((m) => m !== latest));
  const previousAssistant = lastSubstantiveAssistantMessage(messages);
  const previousUserQuestion = previousUser?.content.trim() ?? null;
  const previousAssistantClaim = previousAssistant?.content.trim() ?? null;
  if (!latestText) {
    return {
      resolvedQuery: previousUserQuestion ?? "",
      isVerification: false,
      previousUserQuestion,
      previousAssistantClaim
    };
  }
  const verification = isVerificationFollowUp(latestText);
  if (verification) {
    const original = previousUserQuestion || "the previous Civizen question";
    const claim = previousAssistantClaim || "the previous answer";
    const resolvedQuery = applyAliases(
      `Verify the previous Civizen answer. Original question: ${original} Previous answer: ${claim} Follow-up: ${latestText}`,
      aliases
    );
    return { resolvedQuery, isVerification: true, previousUserQuestion, previousAssistantClaim };
  }
  const shortFollowUp = latestText.length <= SHORT_FOLLOWUP_MAX && Boolean(previousUserQuestion) && /\b(it|one|that|this|they|them|those|there)\b/i.test(latestText);
  const combined = shortFollowUp ? `${latestText} (about: ${previousUserQuestion})` : latestText;
  return {
    resolvedQuery: applyAliases(combined, aliases),
    isVerification: false,
    previousUserQuestion,
    previousAssistantClaim
  };
}

// src/lib/assistant/scope.ts
var GREETINGS = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"];
var CIVIZEN_TERMS = [
  "civizen",
  "nela",
  "civi",
  "agreement",
  "agreements",
  "contract",
  "sign",
  "contribute",
  "contribution",
  "opportunity",
  "opportunities",
  "challenge",
  "challenges",
  "knowledge space",
  "knowledge gap",
  "learning commons",
  "solution record",
  "program",
  "study",
  "market",
  "marketplace",
  "governance",
  "constitution",
  "charter",
  "tokenomics",
  "vote",
  "voting",
  "election",
  "proposal",
  "profile",
  "score",
  "messaging",
  "message",
  "chat",
  "partner",
  "partnership",
  "area",
  "areas",
  "initiative",
  "pilot",
  "funding",
  "luma",
  "credit",
  "wallet",
  "account",
  "settings",
  "home",
  "how to",
  "how do i",
  "how can i",
  "how can we",
  "how do we",
  "where is",
  "feature",
  "app",
  "peace",
  "war",
  "wars",
  "humanity",
  "citizenship",
  "cooperate",
  "cooperation",
  "coexistence"
];
function isGreetingOnly(content) {
  const c = content.trim().toLowerCase();
  if (!c) return false;
  return GREETINGS.some((g) => c === g);
}
function textLooksCivizenRelated(content) {
  const c = content.trim().toLowerCase();
  if (!c) return false;
  if (isGreetingOnly(c)) return true;
  return CIVIZEN_TERMS.some((t) => c.includes(t));
}
function isRelevantToCivizen(resolvedQuery, messages) {
  if (textLooksCivizenRelated(resolvedQuery)) return true;
  const latest = [...messages].reverse().find((m) => m.role === "user");
  const latestText = latest?.content.trim() ?? "";
  if (isGreetingOnly(latestText)) return true;
  if (isVerificationFollowUp(latestText) || isScopeRefusal(latestText) || latestText.length <= 90) {
    const prior = lastSubstantiveUserMessage(messages.filter((m) => m !== latest));
    if (prior && textLooksCivizenRelated(prior.content)) return true;
    const recent = messages.slice(-8);
    if (recent.some((m) => textLooksCivizenRelated(m.content))) return true;
  }
  return false;
}

// src/lib/assistant/routing.ts
var USER_DATA_RE = /\b(my|mine|i have|have i|i've|i applied|applied to|show my|what(?:'s| is) my|my current)\b/i;
var USER_DATA_TOPICS = /\b(score|contributions?|applications?|messages?|inbox|opportunit(?:y|ies)?|profile|agreements?)\b/i;
var GENERAL_REASONING_RE = /\b(help me (draft|write|improve|plan|revise|compare)|explain why|brainstorm|make this (better|stronger)|critique)\b/i;
var EXTERNAL_WORLD_RE = /\b(california|switzerland|united nations|\bun\b|sdg|sustainable development|nonprofit (law|requirements)|incorporation|referendum system|current (law|requirements|news))\b/i;
var EXTERNAL_ACTION_RE = /\b(search the web|look (it )?up online|send (an )?email|browse the internet|fetch from the web)\b/i;
var WHAT_IS_GENERIC_RE = /^\s*what is (?!civizen\b)(.{2,80})\??\s*$/i;
function uniqueKinds(kinds) {
  return [...new Set(kinds)];
}
function classifyRequest(resolvedQuery, latestUserText, pack) {
  const kinds = [];
  const q = `${resolvedQuery} ${latestUserText}`.toLowerCase();
  const catalogHit = pack.capabilities.some((c) => {
    if (q.includes(c.name.toLowerCase())) return true;
    return c.aliases.some((alias) => alias && q.includes(alias.toLowerCase()));
  }) || pack.faq.some((f) => q.includes(f.question.toLowerCase()) || f.aliases.some((a) => q.includes(a.toLowerCase())));
  if (textLooksCivizenRelated(resolvedQuery) || catalogHit || /\bcivizen\b/.test(q) || /\b(does|can|how).*(app|platform|feature)\b/.test(q)) {
    kinds.push("civizen_product");
  }
  if (USER_DATA_RE.test(q) && USER_DATA_TOPICS.test(q)) {
    kinds.push("civizen_user_data");
  }
  if (GENERAL_REASONING_RE.test(q)) {
    kinds.push("general_reasoning");
  }
  if (EXTERNAL_ACTION_RE.test(q)) {
    kinds.push("external_action");
  }
  const whatIs = WHAT_IS_GENERIC_RE.exec(latestUserText.trim());
  if (EXTERNAL_WORLD_RE.test(q) || whatIs && !catalogHit && !textLooksCivizenRelated(whatIs[1] ?? "")) {
    kinds.push("external_world");
  }
  if (!kinds.length) {
    kinds.push(textLooksCivizenRelated(resolvedQuery) ? "civizen_product" : "general_reasoning");
  }
  return uniqueKinds(kinds);
}
function runtimeNeedFromQuery(query) {
  const q = query.toLowerCase();
  if (q.includes("score")) {
    return { topic: "score", hint: "Open Profile or the Home Score card while signed in.", routes: ["/profile"] };
  }
  if (q.includes("message") || q.includes("inbox")) {
    return { topic: "messages", hint: "Open Messaging to see your conversations.", routes: ["/messaging"] };
  }
  if (q.includes("agreement")) {
    return { topic: "agreements", hint: "Open Market > Agreements to see your records.", routes: ["/agreements"] };
  }
  return {
    topic: "contributions",
    hint: "Open My Contributions or your Profile Contributions ledger while signed in.",
    routes: ["/contribute/impact", "/profile/contributions"]
  };
}
function planResources(args) {
  const { kinds, retrieval, confidence, isVerification, runtimeData } = args;
  const hasInternal = retrieval.faq.length > 0 || retrieval.capabilities.length > 0 || retrieval.documents.length > 0;
  const product = kinds.includes("civizen_product");
  const userData = kinds.includes("civizen_user_data");
  const general = kinds.includes("general_reasoning");
  const externalWorld = kinds.includes("external_world");
  const externalAction = kinds.includes("external_action");
  if (userData && !runtimeData) {
    return {
      kinds,
      internalResolution: "requires_runtime_data",
      allowLlmReasoning: general || externalWorld,
      allowExternalResources: false,
      externalResourceKind: "none",
      runtimeDataNeed: runtimeNeedFromQuery(
        retrieval.faq[0]?.item.question ?? retrieval.capabilities[0]?.item.name ?? "my account"
      ),
      reason: "Personal Civizen records require authorized runtime data, not the static project index."
    };
  }
  if (product && (confidence === "high" || confidence === "medium") && hasInternal) {
    return {
      kinds,
      internalResolution: "sufficient",
      allowLlmReasoning: general || isVerification,
      allowExternalResources: externalWorld || externalAction,
      externalResourceKind: externalAction ? "external_action" : externalWorld ? "model_general_knowledge" : "none",
      runtimeDataNeed: null,
      reason: "Authoritative Civizen evidence already answers the product question."
    };
  }
  if (product && !hasInternal) {
    return {
      kinds,
      internalResolution: "insufficient",
      allowLlmReasoning: general || externalWorld,
      allowExternalResources: externalWorld || externalAction,
      externalResourceKind: externalWorld || externalAction ? externalAction ? "external_action" : "model_general_knowledge" : "none",
      runtimeDataNeed: null,
      reason: "Civizen product facts were not verified internally. External resources must not invent a Civizen capability."
    };
  }
  if (externalAction) {
    return {
      kinds,
      internalResolution: "requires_external_action",
      allowLlmReasoning: true,
      allowExternalResources: true,
      externalResourceKind: "external_action",
      runtimeDataNeed: null,
      reason: "The request asks for an external action beyond Civizen project knowledge."
    };
  }
  if (externalWorld) {
    return {
      kinds,
      internalResolution: "requires_external_information",
      allowLlmReasoning: true,
      allowExternalResources: true,
      externalResourceKind: "model_general_knowledge",
      runtimeDataNeed: null,
      reason: "The non-Civizen portion may use general or current external information."
    };
  }
  if (general) {
    return {
      kinds,
      internalResolution: hasInternal ? "sufficient" : "insufficient",
      allowLlmReasoning: true,
      allowExternalResources: false,
      externalResourceKind: "none",
      runtimeDataNeed: null,
      reason: "Generative assistance can use AI reasoning after any relevant Civizen context is attached."
    };
  }
  return {
    kinds,
    internalResolution: hasInternal ? "sufficient" : "insufficient",
    allowLlmReasoning: confidence !== "high",
    allowExternalResources: false,
    externalResourceKind: "none",
    runtimeDataNeed: null,
    reason: hasInternal ? "Internal Civizen evidence is enough." : "No internal evidence matched."
  };
}
function shouldInvokeExternalSearch(plan, latestUserText) {
  if (!plan.allowExternalResources) return null;
  if (plan.internalResolution === "insufficient" && plan.kinds.includes("civizen_product") && !plan.kinds.includes("external_world")) {
    return null;
  }
  if (isGreetingOnly(latestUserText) || isVerificationFollowUp(latestUserText)) {
    if (plan.kinds.includes("civizen_product") && !plan.kinds.includes("external_world")) return null;
  }
  if (plan.externalResourceKind === "none") return null;
  return plan.externalResourceKind;
}
function retrievalConfidence(retrieval) {
  const faq = retrieval.faq[0]?.score ?? 0;
  const cap = retrieval.capabilities[0]?.score ?? 0;
  const doc = retrieval.documents[0]?.score ?? 0;
  if (faq >= 6 || cap >= 7) return "high";
  if (faq >= 2.5 || cap >= 3 || doc >= 2.2) return "medium";
  if (faq > 0 || cap > 0 || doc > 0) return "low";
  return "none";
}

// src/lib/assistant/generated/knowledge-pack.ts
var KNOWLEDGE_PACK = {
  "meta": {
    "appVersion": "0.1.198",
    "appReleaseId": "20261005-v0.1.198",
    "androidVersionCode": 200,
    "gitSha": "05d487d34dde717af1b7d82faaefb0b8a3440d56",
    "generatedAt": "2026-10-06T05:56:44.377Z",
    "sourceFingerprint": "d63fd70ff44652577f6329658258aee698332039b350015eaf1c676a0e45388b",
    "knowledgeFormat": 1,
    "sourceCount": 28,
    "chunkCount": 370
  },
  "capabilities": [
    {
      "id": "home",
      "name": "Home",
      "status": "implemented",
      "description": "Signed-in home feed with Score snapshot, Governance shortcut, post composer with formatting (including line spacing), Edit post for the author, and post actions Like \xB7 Comment \xB7 Repost \xB7 Publish to\u2026.",
      "howTo": "Open Home from the bottom nav. Share a post from the composer; Bold, Italic, Underline, lists, and line spacing are available while the composer is focused. On any post: Like, Comment (discussion under the post), Repost (plain or with thoughts into your own feed), or Publish to\u2026 (external networks when you are the author on the official Civizen org account). The author (or the organization account that published it) can Edit post at any time; Edited appears next to the time after a change. Repost keeps a link to the original \u2014 it does not copy the text.",
      "routes": [
        "/"
      ],
      "roles": [
        "member",
        "citizen",
        "verified_member",
        "certified",
        "moderator",
        "admin",
        "founder"
      ],
      "relatedCapabilities": [
        "score",
        "governance",
        "messaging"
      ],
      "aliases": [
        "feed",
        "timeline"
      ],
      "sourceRefs": [
        "src/pages/Home.tsx",
        "src/lib/main-nav.ts"
      ]
    },
    {
      "id": "study",
      "name": "Study",
      "status": "implemented",
      "description": "Learning hub for civic materials such as the Community Governance Charter, laws, and related study domains. Distinct from Learning Commons.",
      "howTo": "Open Study from the bottom navigation.",
      "routes": [
        "/study",
        "/law"
      ],
      "roles": [
        "guest",
        "member"
      ],
      "relatedCapabilities": [
        "governance_charter",
        "knowledge_spaces"
      ],
      "aliases": [
        "learning hub",
        "courses"
      ],
      "sourceRefs": [
        "src/lib/study.ts",
        "src/lib/main-nav.ts",
        "docs/assistant/civizen-assistant-cheatsheet.md"
      ]
    },
    {
      "id": "contribute_hub",
      "name": "Contribute",
      "status": "implemented",
      "description": "Participation gateway asking how you would like to contribute today. Ways, Community, Knowledge, and Your Impact.",
      "howTo": "Open Contribute from the bottom navigation.",
      "routes": [
        "/contribute"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "opportunities",
        "community_challenges",
        "knowledge_spaces",
        "my_contributions",
        "matters"
      ],
      "aliases": [
        "contribution hub",
        "how can I contribute"
      ],
      "sourceRefs": [
        "src/lib/contribute-lanes.ts",
        "docs/04-operations/dev/contribute-page.md",
        "docs/assistant/civizen-assistant-cheatsheet.md"
      ]
    },
    {
      "id": "opportunities",
      "name": "Opportunities",
      "status": "implemented",
      "description": "Short verifiable pieces of work. Education-to-Contribution lives under Contribute > Opportunities. Apply, complete work, submit evidence, and get it verified.",
      "howTo": "Open Contribute > Opportunities. Open an opportunity, apply, do the work, then submit evidence for verification.",
      "routes": [
        "/contribute/professional",
        "/contribute/professional/new"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "my_contributions",
        "score",
        "community_challenges",
        "knowledge_gaps"
      ],
      "aliases": [
        "professional listings",
        "open tasks",
        "professional skills",
        "tasks"
      ],
      "sourceRefs": [
        "src/lib/contribute-lanes.ts",
        "src/pages/contribute/ProfessionalOpportunities.tsx",
        "docs/04-operations/dev/contribute-page.md"
      ]
    },
    {
      "id": "community_challenges",
      "name": "Community Challenges",
      "status": "implemented",
      "description": "Name a local problem, collect proposals, choose one solution, implement it through a Project, and keep a Solution Record. Distinct from Governance Solutions.",
      "howTo": "Open Contribute > Community Challenges. Use Create to start a challenge. Others can submit proposals; the coordinator selects one and runs implementation work as Opportunities.",
      "routes": [
        "/contribute/challenges",
        "/contribute/challenges/new"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "projects",
        "solution_records",
        "opportunities",
        "programs"
      ],
      "aliases": [
        "challenges",
        "community problem-solving",
        "problem solving lab"
      ],
      "sourceRefs": [
        "src/lib/challenges.ts",
        "src/pages/contribute/CommunityChallenges.tsx",
        "docs/04-operations/dev/contribute-page.md",
        "docs/04-operations/dev/phase-1-pilot-operating-model.md"
      ]
    },
    {
      "id": "matters",
      "name": "Questions, Issues & Ideas",
      "status": "implemented",
      "description": "Generic Matter collaboration under Contribute. Ask a question, raise an issue, suggest an improvement, or work with others toward an outcome. Every active Matter shows who must act next, what is expected, when it is due, and what happens if nobody acts. Comments are not formal actions. When work is needed, the responsible party can start collaborative work, assign Tasks, record Decisions, and return to the same resolution confirmation flow. Completing a Task does not resolve the Matter. Ordinary collaborative-work completion requires required Tasks to be Completed or Cancelled; inviting someone to collaborate is not the same as asking them to accept shared responsibility. Authorized leads can add AI assistance, including a Coding Agent that uses a live model to inspect and edit authorized files through a trusted isolated worktree runner for human review \u2014 it does not commit, push, or deploy.",
      "howTo": "Open Contribute > Questions, Issues & Ideas. Create a Matter, choose the intended person or organization, then follow the Current Action panel. For work that needs several people, use Start collaborative work. Needs Your Action also lists assigned Tasks.",
      "routes": [
        "/contribute/matters",
        "/contribute/matters/new"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "contribute_hub"
      ],
      "aliases": [
        "matters",
        "questions",
        "issues",
        "ideas",
        "suggestions",
        "requests",
        "discussions"
      ],
      "sourceRefs": [
        "src/lib/matters.ts",
        "src/pages/contribute/Matters.tsx",
        "src/pages/contribute/MatterWorkPanel.tsx",
        "src/pages/contribute/MatterAgentPanel.tsx",
        "docs/04-operations/dev/matter-collaboration.md",
        "docs/04-operations/dev/contribute-page.md"
      ]
    },
    {
      "id": "projects",
      "name": "Projects",
      "status": "implemented",
      "description": "Implementation records inside Community Challenges. There is no separate community-projects board. Contribute > Projects redirects to Challenges.",
      "routes": [
        "/contribute/challenges"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "community_challenges",
        "opportunities"
      ],
      "aliases": [
        "implementation project",
        "community projects"
      ],
      "sourceRefs": [
        "docs/04-operations/dev/contribute-page.md",
        "docs/04-operations/dev/phase-1-pilot-operating-model.md"
      ]
    },
    {
      "id": "knowledge_spaces",
      "name": "Knowledge Spaces",
      "status": "implemented",
      "description": "Learning Commons collections of practical resources. Distinct from Study and Governance Solutions.",
      "howTo": "Open Contribute > Learning Commons.",
      "routes": [
        "/contribute/knowledge",
        "/contribute/knowledge/new"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "knowledge_gaps",
        "solution_records",
        "study"
      ],
      "aliases": [
        "learning commons",
        "shared knowledge"
      ],
      "sourceRefs": [
        "src/lib/knowledge.ts",
        "src/pages/contribute/KnowledgeSpaces.tsx",
        "docs/04-operations/dev/contribute-page.md"
      ]
    },
    {
      "id": "knowledge_gaps",
      "name": "Knowledge Gaps",
      "status": "implemented",
      "description": "Named gaps in a Knowledge Space. Coordinators can turn an actionable gap into an Opportunity or a Community Challenge.",
      "routes": [
        "/contribute/knowledge"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "knowledge_spaces",
        "opportunities",
        "community_challenges"
      ],
      "aliases": [
        "gaps"
      ],
      "sourceRefs": [
        "src/lib/knowledge.ts",
        "docs/04-operations/dev/contribute-page.md"
      ]
    },
    {
      "id": "solution_records",
      "name": "Solution Records",
      "status": "implemented",
      "description": "Outcome record created when a Community Challenge completes. May link a Human Outcome Review and a public-safe lesson. Negative or unclear human outcomes are preserved. Not a Happiness ranking and not Governance Solutions.",
      "routes": [
        "/contribute/challenges"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "community_challenges",
        "knowledge_spaces",
        "governance_solutions"
      ],
      "aliases": [
        "challenge solution record"
      ],
      "sourceRefs": [
        "src/lib/challenges.ts",
        "docs/04-operations/dev/contribute-page.md"
      ]
    },
    {
      "id": "programs",
      "name": "Programs",
      "status": "implemented",
      "description": "Containers for contribution work (education_to_contribution, community_problem_solving, shared_knowledge). Published by a profile.",
      "routes": [
        "/contribute"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "opportunities",
        "community_challenges",
        "knowledge_spaces"
      ],
      "aliases": [
        "contribution programs"
      ],
      "sourceRefs": [
        "src/lib/challenges.ts",
        "docs/04-operations/dev/phase-1-pilot-operating-model.md"
      ]
    },
    {
      "id": "my_contributions",
      "name": "My Contributions",
      "status": "implemented",
      "description": "Your applications, completed work, and verified participations across opportunity kinds.",
      "howTo": "Open Contribute > My Contributions. Profile also shows the Contributions ledger.",
      "routes": [
        "/contribute/impact",
        "/profile/contributions"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "opportunities",
        "score"
      ],
      "aliases": [
        "impact",
        "contribution ledger"
      ],
      "sourceRefs": [
        "src/pages/contribute/ContributeImpact.tsx",
        "src/lib/contribute-lanes.ts"
      ]
    },
    {
      "id": "contribute_improvements",
      "name": "Suggest Improvements",
      "status": "implemented",
      "description": "Shortcut into Matter create as a Suggestion addressed to Civizen. Not a separate suggestion backend, and not a second place for Opportunities, Challenges, or shared knowledge.",
      "howTo": "Open Contribute > Suggest Improvements. It opens a new Matter already set as a Suggestion to Civizen. You can edit the type, recipient, and Area before submitting.",
      "routes": [
        "/contribute/improvements",
        "/contribute/matters/new"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "contribute_hub",
        "matters"
      ],
      "aliases": [
        "product suggestions"
      ],
      "sourceRefs": [
        "src/lib/contribute-lanes.ts",
        "docs/04-operations/dev/contribute-page.md",
        "docs/04-operations/dev/matter-collaboration.md"
      ]
    },
    {
      "id": "market",
      "name": "Market",
      "status": "implemented",
      "description": "Public Jobs board plus marketplace listings, products, and services. Anyone can look for work or post a job without an account. Contact details stay locked until sign-in. Start agreement or Contact for member listings. Ordinary orders use Marketplace terms.",
      "howTo": "Open Jobs from the public website, or Market > Jobs. The page title is Marketplace / Jobs. The sentence fills place from your location and shows a guide pay for the job type. Employers look for a person, not a job. Guests can browse and post there. Signed-in members can unfold More for work days, hours, languages, and notes.",
      "routes": [
        "/jobs",
        "/market"
      ],
      "roles": [
        "guest",
        "member"
      ],
      "relatedCapabilities": [
        "agreements",
        "prototype_credits"
      ],
      "aliases": [
        "marketplace",
        "listings"
      ],
      "sourceRefs": [
        "src/pages/Market.tsx",
        "src/lib/main-nav.ts",
        "docs/04-operations/dev/agreements.md",
        "docs/04-operations/dev/market-jobs-public.md"
      ]
    },
    {
      "id": "agreements",
      "name": "Agreements",
      "status": "implemented",
      "description": "Platform workspace to create, review, sign, and keep agreements with people and organizations. Supported types open purpose-built documents (including Employment and Lease). Native electronic signing uses typed name plus explicit consent. Paper or external execution can be recorded. Not a certified PKI digital signature and not a claim of legal enforceability.",
      "howTo": "Open Market > Agreements. Tap + beside the title, choose a type (Employment and Lease are in the common list; Lease includes Car, Vehicle, Residential, Commercial, Equipment, Office, and Property rental), edit the agreement document, create it, then propose and sign.",
      "routes": [
        "/agreements",
        "/agreements/new"
      ],
      "roles": [
        "member",
        "citizen",
        "verified_member",
        "certified",
        "moderator",
        "admin",
        "founder"
      ],
      "relatedCapabilities": [
        "market",
        "partnerships",
        "opportunities"
      ],
      "aliases": [
        "contracts",
        "sign agreement",
        "e-sign",
        "digital signature",
        "collaboration agreement",
        "employment agreement",
        "lease",
        "car lease",
        "equipment lease",
        "rental agreement"
      ],
      "sourceRefs": [
        "docs/04-operations/dev/agreements.md",
        "src/lib/agreements-model.ts",
        "src/lib/agreements-api.ts",
        "src/pages/Agreements.tsx",
        "src/lib/feature-registry.ts"
      ]
    },
    {
      "id": "messaging",
      "name": "Messaging",
      "status": "implemented",
      "description": "Private conversations, including a pinned chat with Civi. Person-to-person chats can be hidden from your inbox (the other person keeps their copy). Disappearing messages is a shared thread setting both people see, applying to new messages. You can edit or unsend your own message for one minute. Civi chats can be cleared entirely. Searching for people can use phone contacts with permission; people not on Civizen can be invited. Optional device-based E2EE for person-to-person chat.",
      "routes": [
        "/messaging"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "nela"
      ],
      "aliases": [
        "chat",
        "dm",
        "inbox"
      ],
      "sourceRefs": [
        "src/components/ui/chat-bar.tsx",
        "src/lib/main-nav.ts"
      ]
    },
    {
      "id": "nela",
      "name": "Civi",
      "status": "implemented",
      "description": "Civi is Civizen\u2019s AI assistant. Visitors can ask project questions without creating an account. Members also find Civi pinned in Messaging. Answers from current project knowledge for this build. When Civi does not already have a good answer and uses Gemini, it checks that reply and may remember it for similar questions later. Identity, the capability registry, and the cheat sheet still win. Personal records are not stored in Civi memory. During development, founders can review questions and replies at Settings > AI Agent.",
      "howTo": "Open the Civi button at the lower right, or Messaging after you sign in. Founders can review interaction history from Settings > AI Agent.",
      "routes": [
        "/onboarding",
        "/messaging",
        "/settings/ai-agent"
      ],
      "roles": [
        "guest",
        "member"
      ],
      "relatedCapabilities": [
        "messaging"
      ],
      "aliases": [
        "nela",
        "civi",
        "assistant",
        "in-app assistant",
        "ai assistant",
        "your ai assistant"
      ],
      "sourceRefs": [
        "supabase/functions/messaging-agent-reply/index.ts",
        "src/lib/messaging-constants.ts",
        "src/components/public/PublicCiviWidget.tsx",
        "src/lib/assistant/learned-memory.ts",
        "src/pages/settings/AiAgentSettings.tsx"
      ]
    },
    {
      "id": "why_civizen_exists",
      "name": "Why Civizen Exists",
      "status": "implemented",
      "description": "Public founding message: Civizen exists to help people unite around shared human responsibility, with practical systems for cooperation and peace. Unity does not require uniformity. Nations and cultures stay. Complementary world citizenship is a civic identity, not current legal nationality.",
      "howTo": "Open Why Civizen Exists from the public site, or ask Civi how we can stop wars or unite humanity.",
      "routes": [
        "/why-this-exists"
      ],
      "roles": [
        "guest",
        "member"
      ],
      "relatedCapabilities": [
        "study",
        "contribute_hub",
        "governance"
      ],
      "aliases": [
        "why this exists",
        "why civizen",
        "founding message",
        "unite humanity"
      ],
      "sourceRefs": [
        "docs/00-foundation/why-civizen-exists-page-brief.md",
        "docs/00-foundation/recognized-planetary-citizenship-pathway.md",
        "docs/00-foundation/the-civizen-charter.md",
        "src/lib/assistant/peace.ts"
      ]
    },
    {
      "id": "profile",
      "name": "Profiles",
      "status": "implemented",
      "description": "Member and linked business profiles with identity, education, experience, skills, endorsements, and Score. Optional Identity verification from Settings \u2192 Edit Profile uploads an ID photo and face photo for staff review when stronger trust is needed (not at signup; not a government ID).",
      "howTo": "Open Profile from the menu. To verify identity when needed: Open Settings > Edit Profile, then use Identity verification to upload an ID photo and a face photo and submit for review.",
      "routes": [
        "/profile",
        "/settings/profile"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "score",
        "my_contributions",
        "governance"
      ],
      "aliases": [
        "account",
        "edit profile",
        "identity verification",
        "verify identity"
      ],
      "sourceRefs": [
        "src/lib/feature-registry.ts",
        "src/lib/identity-verification.ts",
        "docs/04-operations/dev/identity-verification-manual.md",
        "docs/assistant/civizen-assistant-cheatsheet.md"
      ]
    },
    {
      "id": "score",
      "name": "Civizen Score",
      "status": "implemented",
      "description": "Score V2 with Learning, Experience, Skills, Performance, and Contributions. Public overall score is established activity. Tiers: Explorer, Builder, Contributor, Catalyst, Steward. Still in formation. Happiness data is not part of Score.",
      "howTo": "Open Profile or the Home Score card. Contributions detail is also under Profile > Contributions.",
      "routes": [
        "/profile",
        "/profile/contributions"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "my_contributions",
        "profile"
      ],
      "aliases": [
        "rating",
        "reputation",
        "civizen score v2"
      ],
      "sourceRefs": [
        "src/lib/civizen-score-model.ts",
        "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md"
      ]
    },
    {
      "id": "happiness",
      "name": "Happiness & Fulfillment",
      "status": "implemented",
      "description": "Private Happiness & Human Fulfillment. Five levels (Struggling, Unsettled, Balanced, Flourishing, Thriving) \u2014 not a numeric Happiness Score. Adaptive check-ins record today\u2019s feeling, multiple life areas, and specific supports or problems; weekly pulse, monthly review, Fulfillment Plans under Improve, causes, and small actions with follow-up. Private by default. Not used for Score, reputation, hiring, or governance power. Work issues open Work Fulfillment. Actual employment uses Marketplace Jobs. Optional privacy-protected group insights are off by default and never show individual Happiness to employers. Civi may receive a grounded Plan brief; it must not invent history or diagnose. Follow-up timing can be stored; notifications are not sent yet.",
      "howTo": "Open Happiness & Fulfillment from the Profile menu. Check in from Overview or the Check-ins tab, review wellbeing, or Improve to start a Fulfillment Plan.",
      "routes": [
        "/happiness",
        "/happiness/check-in",
        "/happiness/review",
        "/happiness/improve",
        "/happiness/privacy"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "work_fulfillment",
        "study",
        "opportunities",
        "contribute_hub",
        "market",
        "wellbeing_aggregate"
      ],
      "aliases": [
        "wellbeing",
        "happiness score",
        "how am I doing",
        "fulfillment"
      ],
      "sourceRefs": [
        "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md",
        "src/pages/happiness/Happiness.tsx",
        "src/lib/happiness/model.ts"
      ]
    },
    {
      "id": "work_fulfillment",
      "name": "Work Fulfillment",
      "status": "implemented",
      "description": "Distinct Work Fulfillment & Occupational Fit subunit inside Happiness. Current work, Work Joy Monitor, Fit profile, improve-current-work first. Contribute is for trying work (Contribution Fit). Marketplace Jobs is for actual employment (Job Fit). Study for learning/reskill. Low work fulfillment does not automatically recommend a new career. No public Work Fulfillment or Job Fit score. Approved shareable preferences may prefill Jobs; private Joy, diagnoses, and notes never transfer.",
      "howTo": "Open Happiness & Fulfillment, then Work Fulfillment. For a job, open Market > Jobs.",
      "routes": [
        "/happiness/work",
        "/market"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "happiness",
        "study",
        "opportunities",
        "contribute_hub",
        "market"
      ],
      "aliases": [
        "occupational fit",
        "work joy",
        "career fit"
      ],
      "sourceRefs": [
        "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md",
        "src/lib/work-fulfillment/types.ts",
        "src/pages/happiness/HappinessWork.tsx"
      ]
    },
    {
      "id": "wellbeing_aggregate",
      "name": "Wellbeing Insights",
      "status": "implemented",
      "description": "Authorized viewers can open Wellbeing Insights and Human Outcome Reviews for privacy-protected group patterns. Individual Happiness stays private. Published lessons are Civizen-member readable after an intentional publish step, not anonymous internet access. There is no Happiness impact score, ranking, or causal claim from before-and-after observation.",
      "howTo": "Open Happiness & Fulfillment > Privacy, or Wellbeing Insights. After a linked Challenge, Project, or Governance action, use Human Outcome Review. Participation is off by default.",
      "routes": [
        "/happiness/privacy",
        "/wellbeing-insights",
        "/wellbeing-insights/outcome"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "happiness"
      ],
      "aliases": [
        "anonymous happiness",
        "employer wellbeing dashboard",
        "organization happiness score",
        "human outcome review"
      ],
      "sourceRefs": [
        "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md",
        "src/pages/wellbeing/WellbeingInsights.tsx"
      ]
    },
    {
      "id": "governance",
      "name": "Governance",
      "status": "implemented",
      "description": "Public governance landing, civic voting, and one member Governance page with three tabs: Votes (open consultations with your own ballot status, scheduled ones, and published results), Proposals (drafts open for member support with a support threshold, your drafts, published and closed proposals), and Tools (steward console and legacy workspace tools, shown only to office holders, founders, admins, or members who can assign roles). A consultation starts as a Matter; its author opens the draft for member support, sets scope (global or one country) and opening/closing times, and can publish once the support threshold is reached; founders and admins can publish at any time. Ordinary consultations need only a free account; the server enforces sanctions, minimum age, verification and country scope when an election declares them. Every voter gets a receipt they can check against the public list of counted ballots; choices stay sealed. Members are notified when a consultation they follow is published and when its result is published. Current public community instrument is the Community Governance Charter.",
      "howTo": "Open Home > Governance for the landing, Home > Governance > Civic voting for the public election catalog, and Settings > Member workspace (or /governance/workspace) for the member Governance page with the Votes, Proposals and Tools tabs. Start a consultation from a Matter (Contribute > Questions, Issues & Ideas > Create voting proposal), then open it for member support on the proposal page. Tap the bell in the top chrome or Settings > Notifications for notifications. The steward console is at /governance/tools/steward and the legacy workspace tools at /governance/tools (Tools tab).",
      "routes": [
        "/governance",
        "/governance/workspace",
        "/governance/tools",
        "/governance/tools/steward",
        "/governance/voting",
        "/notifications"
      ],
      "roles": [
        "guest",
        "member"
      ],
      "relatedCapabilities": [
        "governance_charter",
        "civic_voting",
        "governance_solutions"
      ],
      "aliases": [
        "civic governance",
        "proposals"
      ],
      "sourceRefs": [
        "src/pages/governance/PublicGovernanceLanding.tsx",
        "docs/02-policies/governance/civizen-community-governance-charter.md"
      ]
    },
    {
      "id": "civic_voting",
      "name": "Civic voting",
      "status": "implemented",
      "description": "Elections catalog and election detail/observe at /governance/voting. Public browsing is available. The first real public consultation is A Single World Citizenship: a global, nonbinding question on whether humanity should work toward a single world citizenship shared by all people regardless of nationality. Support, Oppose, and Abstain are equal. A Support vote does not create or grant citizenship. Token wealth does not create voting power.",
      "routes": [
        "/governance/voting"
      ],
      "roles": [
        "guest",
        "member"
      ],
      "relatedCapabilities": [
        "governance"
      ],
      "aliases": [
        "elections",
        "vote"
      ],
      "sourceRefs": [
        "src/pages/governance/CivicVotingHub.tsx",
        "docs/02-policies/governance/civizen-community-governance-charter.md"
      ]
    },
    {
      "id": "governance_solutions",
      "name": "Governance Solutions",
      "status": "implemented",
      "description": "Post a civic Problem and Discuss or Solve. AI council can participate in discussion. Distinct from Community Challenge Solution Records.",
      "routes": [
        "/governance/solutions"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "governance",
        "solution_records"
      ],
      "aliases": [
        "solutions hub",
        "problem council"
      ],
      "sourceRefs": [
        "src/pages/governance/SolutionsHub.tsx",
        "docs/04-operations/dev/solutions-council.md"
      ]
    },
    {
      "id": "governance_charter",
      "name": "Civizen Community Governance Charter",
      "status": "implemented",
      "description": "Current public community governance instrument (interim). Not a government constitution. Replaces Civizen Constitution v0.1.",
      "routes": [
        "/governance/charter"
      ],
      "roles": [
        "guest",
        "member"
      ],
      "relatedCapabilities": [
        "governance"
      ],
      "aliases": [
        "civizen constitution",
        "constitution",
        "charter"
      ],
      "sourceRefs": [
        "docs/02-policies/governance/civizen-community-governance-charter.md",
        "docs/01-governance/constitution/civizen-constitution-v0.1.md"
      ]
    },
    {
      "id": "areas",
      "name": "Areas",
      "status": "implemented",
      "description": "Read-only public Areas V1: Health, Education, Culture, Responsibility, Environment. Shows where help is needed.",
      "howTo": "Open Areas from Contribute, Home > Governance, or the public footer.",
      "routes": [
        "/areas"
      ],
      "roles": [
        "guest",
        "member"
      ],
      "relatedCapabilities": [
        "partnerships",
        "contribute_hub"
      ],
      "aliases": [
        "foundational areas",
        "where help is needed"
      ],
      "sourceRefs": [
        "src/lib/areas/public-areas.ts",
        "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md"
      ]
    },
    {
      "id": "partnerships",
      "name": "Partnerships",
      "status": "implemented",
      "description": "Public Partners notice for international partnerships and chapters. Institutional inquiries are under Contribute > Financial Support. Not a partner CRM.",
      "routes": [
        "/partners",
        "/fund/institutional"
      ],
      "roles": [
        "guest",
        "member"
      ],
      "relatedCapabilities": [
        "areas",
        "funding",
        "agreements"
      ],
      "aliases": [
        "organization partnership",
        "chapters",
        "institutions"
      ],
      "sourceRefs": [
        "docs/02-policies/institutional/international-partnerships-and-chapters.md",
        "src/lib/contribute-lanes.ts"
      ]
    },
    {
      "id": "funding",
      "name": "Funding",
      "status": "implemented",
      "description": "Public inquiry hub only. Does not process investments, issue securities, or create binding investment agreements. Current public policy is Funding and Financial Integrity.",
      "routes": [
        "/fund",
        "/fund/support",
        "/fund/invest",
        "/fund/transparency"
      ],
      "roles": [
        "guest",
        "member"
      ],
      "relatedCapabilities": [
        "partnerships",
        "tokenomics_governance"
      ],
      "aliases": [
        "donate",
        "invest",
        "support civizen"
      ],
      "sourceRefs": [
        "docs/02-policies/institutional/funding-and-financial-integrity.md",
        "src/pages/fund/FundHub.tsx"
      ]
    },
    {
      "id": "prototype_credits",
      "name": "Prototype credits",
      "status": "experimental",
      "description": "Luma is a non-transferable prototype credit for demonstration. Not money, not a wallet for settlement, no governance rights. Peer send is disabled.",
      "routes": [
        "/settings/prototype-credits"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "market",
        "tokenomics_governance"
      ],
      "aliases": [
        "luma",
        "luma wallet",
        "wallet",
        "lumens"
      ],
      "sourceRefs": [
        "src/lib/prototype-credits.ts",
        "src/lib/feature-registry.ts"
      ]
    },
    {
      "id": "luma_transfers",
      "name": "Luma transfers",
      "status": "deprecated",
      "description": "Peer Luma transfer and marketplace Luma checkout are disabled. Do not describe Luma as a working currency.",
      "routes": [
        "/settings/prototype-credits"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "prototype_credits"
      ],
      "aliases": [
        "peer send luma",
        "luma checkout"
      ],
      "sourceRefs": [
        "src/lib/prototype-credits.ts",
        "src/lib/luma-transfer.ts"
      ]
    },
    {
      "id": "tokenomics_governance",
      "name": "Constitutional Tokenomics + Governance Model",
      "status": "historical",
      "description": "Earlier planning document. Not adopted. Not current policy. Not an implemented monetary system. Current public funding policy is Funding and Financial Integrity.",
      "routes": [
        "/documents",
        "/fund"
      ],
      "roles": [
        "guest"
      ],
      "relatedCapabilities": [
        "funding",
        "governance_charter",
        "prototype_credits"
      ],
      "aliases": [
        "civizen constitutional tokenomics + governance model",
        "tokenomics",
        "funding constitution",
        "luma tokenomics"
      ],
      "sourceRefs": [
        "docs/01-governance/funding-and-monetary/civizen-constitutional-tokenomics-governance.md",
        "docs/02-policies/institutional/funding-and-financial-integrity.md"
      ]
    },
    {
      "id": "institutional_blueprint",
      "name": "Institutional Blueprint",
      "status": "proposed",
      "description": "Working institutional architecture (legal entities, funding allocation principles, authority). Project reference, not a live in-app government and not adopted public policy.",
      "routes": [],
      "roles": [
        "guest"
      ],
      "relatedCapabilities": [
        "governance"
      ],
      "aliases": [
        "institutional architecture"
      ],
      "sourceRefs": [
        "docs/institutional/institutional-blueprint.md"
      ]
    },
    {
      "id": "phase1_pilots",
      "name": "Phase 1 contribution pilots",
      "status": "implemented",
      "description": "Three live pilots: Education-to-Contribution, Community Problem-Solving Lab, and Shared Knowledge / Learning Commons.",
      "routes": [
        "/contribute/professional",
        "/contribute/challenges",
        "/contribute/knowledge"
      ],
      "roles": [
        "member"
      ],
      "relatedCapabilities": [
        "opportunities",
        "community_challenges",
        "knowledge_spaces"
      ],
      "aliases": [
        "pilots",
        "phase 1"
      ],
      "sourceRefs": [
        "docs/04-operations/dev/phase-1-pilot-operating-model.md"
      ]
    }
  ],
  "faq": [
    {
      "id": "what_is_civizen",
      "question": "What is Civizen?",
      "answer": "Civizen is an open participatory system for organizing how humanity learns, contributes, collaborates, governs, shares resources, solves common challenges, and continuously improves the systems we live and work within.",
      "aliases": [
        "what's civizen",
        "what's civizen in one sentence",
        "civizen in one sentence",
        "define civizen",
        "how would you describe civizen",
        "what kind of system is civizen",
        "what is the purpose of civizen",
        "civizen mission",
        "civizen identity"
      ],
      "capabilityIds": [],
      "sourceRefs": [
        "docs/assistant/civizen-identity.md"
      ]
    },
    {
      "id": "what_civizen_trying_to_accomplish",
      "question": "What is Civizen trying to accomplish?",
      "answer": "Civizen is an open participatory system for organizing how humanity learns, contributes, collaborates, governs, shares resources, solves common challenges, and continuously improves the systems we live and work within. Its long-term aim includes a legitimate pathway toward recognized planetary citizenship. That recognition is not current legal status.",
      "aliases": [
        "why civizen exists",
        "what is civizen trying to do"
      ],
      "capabilityIds": [],
      "sourceRefs": [
        "docs/assistant/civizen-identity.md",
        "docs/00-foundation/why-civizen-exists-page-brief.md",
        "docs/00-foundation/recognized-planetary-citizenship-pathway.md"
      ]
    },
    {
      "id": "is_civizen_a_social_network",
      "question": "Is Civizen a social network?",
      "answer": "No. Civizen has profiles, posts, and messaging, but those are components of a broader participatory system. Civizen is not merely a social network.",
      "aliases": [
        "is civizen social media"
      ],
      "capabilityIds": [],
      "sourceRefs": [
        "docs/assistant/civizen-identity.md"
      ]
    },
    {
      "id": "can_i_edit_a_post",
      "question": "Can I edit a post after I publish it?",
      "answer": "Yes. Open Home, then the post \u22EF menu, and choose Edit post. You can change the text and formatting whenever you like. After you save a change, the post shows Edited next to the time. Comments, likes, and reposts stay in place.",
      "aliases": [
        "edit post",
        "how do I edit a post",
        "can I change a post",
        "edit old post"
      ],
      "capabilityIds": [
        "home"
      ],
      "sourceRefs": [
        "src/pages/Home.tsx",
        "docs/04-operations/dev/home-post-formatting.md"
      ]
    },
    {
      "id": "is_civizen_a_government",
      "question": "Is Civizen a government?",
      "answer": "No. Civizen is not currently a government, nationality, or public-law citizenship. World citizenship in Civizen is a voluntary civic identity. The long-term pathway toward recognized planetary citizenship is described publicly and is not present legal status.",
      "aliases": [
        "is civizen a country",
        "is civizen citizenship legal"
      ],
      "capabilityIds": [
        "governance_charter"
      ],
      "sourceRefs": [
        "docs/00-foundation/recognized-planetary-citizenship-pathway.md",
        "docs/02-policies/institutional/current-legal-status-notice.md"
      ]
    },
    {
      "id": "is_civizen_a_project_collaboration_platform",
      "question": "Is Civizen basically a project collaboration platform?",
      "answer": "No. Project collaboration is one component. Civizen is an open participatory system for organizing how humanity learns, contributes, collaborates, governs, shares resources, solves common challenges, and continuously improves the systems we live and work within. Challenges, Projects, Market, Study, and similar surfaces are parts of that broader system, not the definition of it.",
      "aliases": [
        "is civizen a project platform",
        "is civizen mainly a challenge platform",
        "is civizen just a collaboration app"
      ],
      "capabilityIds": [],
      "sourceRefs": [
        "docs/assistant/civizen-identity.md"
      ]
    },
    {
      "id": "who_is_civi",
      "question": "Who is Civi?",
      "answer": "Civi is Civizen\u2019s AI assistant. Visitors can ask Civi about the project without creating an account \u2014 open the Civi button at the lower right. Members can also chat with Civi in Messaging.",
      "aliases": [
        "what is civi",
        "civi assistant",
        "talk to civi",
        "ask civi without registering",
        "civi without an account"
      ],
      "capabilityIds": [
        "nela"
      ],
      "sourceRefs": [
        "docs/assistant/civizen-assistant-cheatsheet.md",
        "src/components/public/PublicCiviWidget.tsx"
      ]
    },
    {
      "id": "what_can_i_do_in_civizen_now",
      "question": "What can I do in Civizen right now?",
      "answer": "In this build you can use Home, Study, Contribute (Opportunities, Community Challenges, Questions, Issues & Ideas, Suggest Improvements, Learning Commons, My Contributions), Market, Agreements, Messaging, Profile and Score, Happiness & Fulfillment, Areas, and Governance tools such as Civic voting and Governance Solutions. This is what is implemented today, not a full description of what Civizen is.",
      "aliases": [
        "what can I currently do in civizen",
        "what can I do in civizen",
        "what works in civizen today",
        "current civizen features"
      ],
      "capabilityIds": [
        "home",
        "study",
        "contribute_hub",
        "market",
        "messaging"
      ],
      "sourceRefs": [
        "docs/assistant/civizen-assistant-cheatsheet.md",
        "src/lib/main-nav.ts"
      ]
    },
    {
      "id": "how_can_i_contribute",
      "question": "How can I contribute?",
      "answer": "Open Contribute and choose how you want to help: Volunteer, Opportunities, Financial Support, Organization Partnership, Community Challenges, Questions, Issues & Ideas, Suggest Improvements, Learning Commons, or My Contributions.",
      "aliases": [
        "how do I contribute",
        "ways to contribute",
        "how can I volunteer"
      ],
      "capabilityIds": [
        "contribute_hub"
      ],
      "sourceRefs": [
        "src/lib/contribute-lanes.ts",
        "docs/04-operations/dev/contribute-page.md"
      ]
    },
    {
      "id": "how_do_i_raise_a_question_or_issue",
      "question": "How do I ask a question or raise an issue?",
      "answer": "Open Contribute > Questions, Issues & Ideas. Create a Matter, choose the person or organization it is for, and submit. The Current Action panel shows who must respond and when. Comments are discussion only; only Provide final answer starts the review timer. If the Matter needs actual work, the responsible party can start collaborative work and assign Tasks. Completing a Task does not close the Matter. Ordinary work completion waits until required Tasks are Completed or Cancelled. Suggest Improvements opens a Suggestion to Civizen.",
      "aliases": [
        "how do I raise an issue",
        "how do I ask a question in civizen",
        "questions issues and ideas",
        "where do I send a suggestion"
      ],
      "capabilityIds": [
        "matters",
        "contribute_hub"
      ],
      "sourceRefs": [
        "docs/04-operations/dev/matter-collaboration.md",
        "src/lib/contribute-lanes.ts"
      ]
    },
    {
      "id": "if_i_need_housing_or_emergency_help",
      "question": "I am homeless. Can Civizen help me?",
      "answer": "I'm sorry you're going through this. Civizen is not a shelter, housing office, or emergency service, and I cannot arrange a place to stay or send money.\n\nIf you need a safe place tonight, contact local emergency services or a local homelessness helpline. In many regions, 211 can connect you to nearby help.\n\nIf you want work, Jobs is open without an account. Open Market > Jobs. Community Challenges is for local problems over time \u2014 not emergency housing.",
      "aliases": [
        "I'm homeless, can you help me?",
        "I need shelter",
        "I have nowhere to stay",
        "can Civizen house me"
      ],
      "capabilityIds": [
        "market",
        "community_challenges"
      ],
      "sourceRefs": [
        "src/lib/assistant/hardship.ts",
        "docs/assistant/civizen-assistant-cheatsheet.md"
      ]
    },
    {
      "id": "how_can_we_stop_wars",
      "question": "How can we stop wars?",
      "answer": "Civizen exists to help people unite around shared human responsibility. Peace needs more than speeches, slogans, or treaties. It needs practical systems people can join, examine, improve, and hold accountable.\n\nUnity does not require uniformity \u2014 nations and cultures stay, while a complementary world citizenship adds a shared layer of responsibility. Civizen is not a government. It is the work through which wars should become unnecessary, because people have practical tools to create and protect peace instead of only hoping for it.\n\nStart by signing up, then make a contribution. You can take part through Community Challenges, Opportunities, Study, and Governance.",
      "aliases": [
        "how do we achieve peace",
        "how can humanity live in peace",
        "how can we unite humanity",
        "how do we end war"
      ],
      "capabilityIds": [
        "study",
        "contribute_hub",
        "community_challenges",
        "opportunities",
        "governance"
      ],
      "sourceRefs": [
        "src/lib/assistant/peace.ts",
        "docs/assistant/civizen-assistant-cheatsheet.md",
        "docs/00-foundation/why-civizen-exists-page-brief.md",
        "docs/00-foundation/recognized-planetary-citizenship-pathway.md"
      ]
    },
    {
      "id": "what_are_opportunities",
      "question": "What are Opportunities?",
      "answer": "Opportunities are short, verifiable pieces of work. Find them under Contribute > Opportunities. You apply, complete the work, submit evidence, and an evaluator verifies it. Older names like professional listings or open tasks mean Opportunities.",
      "aliases": [
        "what are professional listings",
        "what are open tasks",
        "what are tasks"
      ],
      "capabilityIds": [
        "opportunities"
      ],
      "sourceRefs": [
        "src/lib/contribute-lanes.ts",
        "docs/04-operations/dev/contribute-page.md"
      ]
    },
    {
      "id": "what_are_community_challenges",
      "question": "What are Community Challenges?",
      "answer": "Community Challenges are a live Contribute lane for real local problems. The flow is Challenge \u2192 Proposal \u2192 coordinator selection \u2192 Implementation Project \u2192 work Opportunities \u2192 outcome \u2192 Solution Record. Open Contribute > Community Challenges. This is not Governance Solutions.",
      "aliases": [
        "what is a community challenge",
        "what are challenges"
      ],
      "capabilityIds": [
        "community_challenges"
      ],
      "sourceRefs": [
        "src/pages/contribute/CommunityChallenges.tsx",
        "docs/04-operations/dev/contribute-page.md",
        "docs/04-operations/dev/phase-1-pilot-operating-model.md"
      ]
    },
    {
      "id": "who_can_create_a_community_challenge",
      "question": "Who can create a Community Challenge?",
      "answer": "Signed-in members can create a challenge from Create on Contribute > Community Challenges. The publisher (your profile or a linked organization account) becomes the coordinator for that challenge. Proposal selection is done by the coordinator, not by public voting.",
      "aliases": [
        "who can create one",
        "who creates challenges"
      ],
      "capabilityIds": [
        "community_challenges"
      ],
      "sourceRefs": [
        "src/pages/contribute/CommunityChallenges.tsx",
        "src/pages/contribute/ChallengeForm.tsx"
      ]
    },
    {
      "id": "what_are_projects",
      "question": "What are Projects?",
      "answer": "Projects are implementation records inside Community Challenges. There is no separate projects board. Contribute > Projects sends you to Community Challenges.",
      "aliases": [
        "community projects",
        "implementation projects"
      ],
      "capabilityIds": [
        "projects"
      ],
      "sourceRefs": [
        "docs/04-operations/dev/contribute-page.md"
      ]
    },
    {
      "id": "what_is_my_contributions",
      "question": "What is My Contributions?",
      "answer": "My Contributions (Contribute > My Contributions) shows work you applied for, completed, or had verified. Your Profile Contributions ledger shows the inspectable record that feeds Score.",
      "aliases": [
        "where are my contributions"
      ],
      "capabilityIds": [
        "my_contributions"
      ],
      "sourceRefs": [
        "src/lib/contribute-lanes.ts",
        "src/pages/contribute/ContributeImpact.tsx"
      ]
    },
    {
      "id": "what_is_study",
      "question": "What is Study?",
      "answer": "Study is the learning hub in the bottom navigation. It holds civic learning materials such as charter/constitution study and links to the Law library. It is not the same as Learning Commons, where people share practical contribution knowledge.",
      "aliases": [
        "what is the study tab"
      ],
      "capabilityIds": [
        "study"
      ],
      "sourceRefs": [
        "src/lib/study.ts",
        "docs/assistant/civizen-assistant-cheatsheet.md"
      ]
    },
    {
      "id": "what_are_knowledge_spaces",
      "question": "What are Knowledge Spaces?",
      "answer": "Knowledge Spaces are shared collections in Contribute > Learning Commons. Each space holds resources, can name Knowledge Gaps, and can link resulting work back as improved knowledge.",
      "aliases": [
        "what is learning commons",
        "what is a knowledge space"
      ],
      "capabilityIds": [
        "knowledge_spaces"
      ],
      "sourceRefs": [
        "src/lib/knowledge.ts",
        "docs/04-operations/dev/contribute-page.md"
      ]
    },
    {
      "id": "what_are_knowledge_gaps",
      "question": "What are Knowledge Gaps?",
      "answer": "Knowledge Gaps name what is missing, weak, outdated, or still needs practical development inside a Knowledge Space. A coordinator can turn a gap into an Opportunity or a Community Challenge.",
      "aliases": [
        "what is a knowledge gap"
      ],
      "capabilityIds": [
        "knowledge_gaps"
      ],
      "sourceRefs": [
        "docs/04-operations/dev/contribute-page.md"
      ]
    },
    {
      "id": "what_are_solution_records",
      "question": "What are Solution Records?",
      "answer": "A Solution Record is the outcome kept after a Community Challenge is actually implemented. It is not the Governance Solutions page. Coordinators can share a Solution Record into a Knowledge Space.",
      "aliases": [
        "what is a solution record"
      ],
      "capabilityIds": [
        "solution_records"
      ],
      "sourceRefs": [
        "docs/04-operations/dev/contribute-page.md"
      ]
    },
    {
      "id": "how_does_governance_work",
      "question": "How does governance work?",
      "answer": "Civizen currently has a public Governance landing, civic voting/elections, a member proposal workspace, and Governance Solutions. Community participation is described by the Community Governance Charter. Civizen is not a government. Working institutional frameworks exist as project design, not as live public-law authority.",
      "aliases": [
        "civizen governance"
      ],
      "capabilityIds": [
        "governance",
        "governance_charter"
      ],
      "sourceRefs": [
        "docs/02-policies/governance/civizen-community-governance-charter.md",
        "docs/assistant/civizen-assistant-cheatsheet.md"
      ]
    },
    {
      "id": "who_can_create_proposals",
      "question": "Who can create proposals?",
      "answer": "Eligible signed-in participants can submit proposals in Home > Governance workspace under the Community Governance Charter. Community Challenge proposals are a different flow inside a Challenge, selected by that challenge\u2019s coordinator.",
      "aliases": [
        "who can propose"
      ],
      "capabilityIds": [
        "governance",
        "community_challenges"
      ],
      "sourceRefs": [
        "docs/02-policies/governance/civizen-community-governance-charter.md",
        "src/pages/GovernanceNew.tsx"
      ]
    },
    {
      "id": "who_can_vote",
      "question": "Who can vote?",
      "answer": "Civic elections are at Home > Governance > Civic voting. Community votes follow published eligibility in the Charter and platform rules. Token ownership, financial support, or wealth alone does not create voting authority.",
      "aliases": [
        "voting rights",
        "who votes"
      ],
      "capabilityIds": [
        "civic_voting"
      ],
      "sourceRefs": [
        "docs/02-policies/governance/civizen-community-governance-charter.md"
      ]
    },
    {
      "id": "what_is_governance_solutions",
      "question": "What is Governance Solutions?",
      "answer": "Governance Solutions (Home > Governance > Governance Solutions) lets members post a civic Problem and Discuss or Solve it, including AI-assisted discussion. It is not the Solution Record produced by a Community Challenge.",
      "aliases": [
        "solutions hub"
      ],
      "capabilityIds": [
        "governance_solutions"
      ],
      "sourceRefs": [
        "src/pages/governance/SolutionsHub.tsx"
      ]
    },
    {
      "id": "what_is_the_civizen_constitution",
      "question": "What is the Civizen Constitution?",
      "answer": "The current public community instrument is the Civizen Community Governance Charter (Home > Governance > Community Governance Charter). It is not the legal constitution of a government. The earlier Civizen Constitution v0.1 is superseded by that Charter.",
      "aliases": [
        "civizen constitution",
        "constitution v0.1"
      ],
      "capabilityIds": [
        "governance_charter"
      ],
      "sourceRefs": [
        "docs/02-policies/governance/civizen-community-governance-charter.md",
        "docs/01-governance/constitution/civizen-constitution-v0.1.md"
      ]
    },
    {
      "id": "constitutional_tokenomics",
      "question": "What is the Civizen Constitutional Tokenomics + Governance Model?",
      "answer": "That document is historical and not adopted. It is not current policy and is not implemented as a monetary system. Current public funding policy is Funding and Financial Integrity. Luma is only a prototype credit. Current community governance text is the Community Governance Charter.",
      "aliases": [
        "civizen constitutional tokenomics + governance model",
        "tokenomics constitution",
        "funding constitution"
      ],
      "capabilityIds": [
        "tokenomics_governance",
        "funding",
        "governance_charter"
      ],
      "sourceRefs": [
        "docs/01-governance/funding-and-monetary/civizen-constitutional-tokenomics-governance.md",
        "docs/02-policies/institutional/funding-and-financial-integrity.md",
        "docs/02-policies/governance/civizen-community-governance-charter.md"
      ]
    },
    {
      "id": "how_can_an_organization_participate",
      "question": "How can an organization participate?",
      "answer": "Open Contribute > Organization Partnership, or send an institutional inquiry from Contribute > Financial Support. Organizations also appear as linked business accounts that can publish Opportunities, Challenges, or Knowledge Spaces. There is no full partner CRM in this build.",
      "aliases": [
        "organization partnership",
        "how can my company join"
      ],
      "capabilityIds": [
        "partnerships"
      ],
      "sourceRefs": [
        "src/lib/contribute-lanes.ts",
        "docs/02-policies/institutional/international-partnerships-and-chapters.md"
      ]
    },
    {
      "id": "what_can_coordinators_do",
      "question": "What can coordinators do?",
      "answer": "A coordinator is the publisher profile for a Program, Opportunity, Challenge, or Knowledge Space. They create and manage that work, review applicants or proposals, verify evidence, and (for Challenges) select a proposal and record the outcome.",
      "aliases": [
        "publisher",
        "organizer"
      ],
      "capabilityIds": [
        "programs",
        "community_challenges",
        "opportunities"
      ],
      "sourceRefs": [
        "docs/04-operations/dev/phase-1-pilot-operating-model.md",
        "docs/04-operations/dev/contribute-page.md"
      ]
    },
    {
      "id": "what_is_a_linked_organization",
      "question": "What is a publisher or linked organization account?",
      "answer": "Phase 1 has no separate organizations table. A publisher is a profile. Business or organization coordination uses linked accounts on that profile. A member may link more than one business account from the profile menu Accounts +. Those organizations stay listed while you are signed into any of them. Swipe or scroll the account cards and tap one to switch. If the company already exists, Add business offers Connect instead of Register.",
      "aliases": [
        "linked accounts",
        "business account",
        "publisher"
      ],
      "capabilityIds": [
        "profile",
        "programs"
      ],
      "sourceRefs": [
        "docs/04-operations/dev/phase-1-pilot-operating-model.md"
      ]
    },
    {
      "id": "how_can_an_institution_partner",
      "question": "How can an institution partner with Civizen?",
      "answer": "Open Contribute > Organization Partnership and send an inquiry through Contribute > Financial Support. You can also create agreements from Market > Agreements (for example Partnership / Collaboration). A full Stakeholder Map and partner CRM are proposed institutional design, not a current app workspace.",
      "aliases": [
        "institutional partnership"
      ],
      "capabilityIds": [
        "partnerships",
        "agreements",
        "institutional_blueprint"
      ],
      "sourceRefs": [
        "docs/02-policies/institutional/international-partnerships-and-chapters.md",
        "docs/institutional/stakeholder-partnership-framework.md"
      ]
    },
    {
      "id": "what_are_areas",
      "question": "What are Areas?",
      "answer": "Areas are where help is needed. The current foundational Areas are Health, Education, Culture, Responsibility, and Environment. Browse them from Contribute, Home > Governance, or the public footer. They are not the same as product pillars.",
      "aliases": [
        "foundational areas"
      ],
      "capabilityIds": [
        "areas"
      ],
      "sourceRefs": [
        "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md",
        "src/lib/areas/public-areas.ts"
      ]
    },
    {
      "id": "what_are_initiatives",
      "question": "What are initiatives?",
      "answer": "On public Area pages, initiatives are curated organized work toward an outcome, listed beside related systems. There is no full initiative workspace or matching engine in this build.",
      "aliases": [
        "public initiatives"
      ],
      "capabilityIds": [
        "areas"
      ],
      "sourceRefs": [
        "src/lib/areas/public-areas-content.ts",
        "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md"
      ]
    },
    {
      "id": "can_users_make_agreements",
      "question": "Can users make agreements through Civizen?",
      "answer": "Open Market > Agreements and tap + beside the title. Choose a type such as General, Partnership / Collaboration, Employment, Service / Contribution, Sale / Purchase, Lease, or Funding / Sponsorship. Propose it, then sign in Civizen or record a paper/external signing.\n\nSupported types open a readable agreement document. You can start from a listing, Jobs, or another related activity. Ordinary Marketplace purchases stay as orders and do not automatically create a Sale / Purchase Agreement. Lease heading kinds include Residential, Commercial, Car, Vehicle, Equipment, Office, and Property rental.",
      "aliases": [
        "how can I sign an agreement with anyone through civizen",
        "how can I sign an agreement",
        "can I create a contract",
        "agreements workspace",
        "car lease",
        "equipment lease",
        "rental agreement"
      ],
      "capabilityIds": [
        "agreements"
      ],
      "sourceRefs": [
        "docs/04-operations/dev/agreements.md",
        "src/pages/Agreements.tsx",
        "src/lib/agreements-api.ts",
        "src/lib/feature-registry.ts"
      ]
    },
    {
      "id": "can_civizen_digitally_sign_contracts",
      "question": "Can Civizen digitally sign contracts?",
      "answer": "Civizen supports native electronic signing in the Agreements workspace: a typed name plus explicit consent, which is stored on the signed version. Paper or an external e-sign service can be recorded separately. This is not a certified PKI digital signature and is not a claim that the record is legally certified or enforceable.",
      "aliases": [
        "digital signatures",
        "e-sign",
        "pki signature"
      ],
      "capabilityIds": [
        "agreements"
      ],
      "sourceRefs": [
        "docs/04-operations/dev/agreements.md",
        "src/lib/agreements-api.ts",
        "src/lib/agreements-model.ts"
      ]
    },
    {
      "id": "what_acceptance_records_exist",
      "question": "What kinds of acceptance or participation records currently exist?",
      "answer": "Current records include Agreement versions and signatures, Terms acceptance, Opportunity applications and participations, Challenge proposals, and contribution evidence. These are platform records, not a general-purpose public notary.",
      "aliases": [
        "participation records",
        "terms acceptance"
      ],
      "capabilityIds": [
        "agreements",
        "opportunities",
        "community_challenges"
      ],
      "sourceRefs": [
        "docs/04-operations/dev/agreements.md",
        "src/lib/terms-version.ts",
        "src/lib/opportunities.ts"
      ]
    },
    {
      "id": "does_civizen_have_happiness",
      "question": "Does Civizen have a Happiness Score?",
      "answer": "No. Civizen does not show a numeric Happiness Score. Open Happiness & Fulfillment from the Profile menu. You see five levels \u2014 Struggling, Unsettled, Balanced, Flourishing, and Thriving \u2014 as states, not identities. Check-ins and reviews are private and are not used for Civizen Score, reputation, hiring, or voting power.",
      "aliases": [
        "happiness score",
        "wellbeing score",
        "mental health score",
        "how am I doing"
      ],
      "capabilityIds": [
        "happiness",
        "score"
      ],
      "sourceRefs": [
        "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md",
        "src/lib/happiness/levels.ts",
        "src/pages/happiness/Happiness.tsx"
      ]
    },
    {
      "id": "where_is_happiness",
      "question": "Where is Happiness & Fulfillment?",
      "answer": "Open Happiness & Fulfillment from the Profile menu. Check in, review wellbeing, open Improve for Fulfillment Plans, or open Work Fulfillment. Privacy is under Happiness & Fulfillment > Privacy. Authorized viewers use Wellbeing Insights and Human Outcome Review.",
      "aliases": [
        "happiness page",
        "wellbeing",
        "fulfillment",
        "fulfillment plan"
      ],
      "capabilityIds": [
        "happiness",
        "work_fulfillment"
      ],
      "sourceRefs": [
        "src/lib/app-pages.ts",
        "src/pages/happiness/Happiness.tsx"
      ]
    },
    {
      "id": "where_are_jobs",
      "question": "Where do I look for a job?",
      "answer": "Open Jobs from the public website, or Market > Jobs. Anyone can look for work or post a job without signing up. Signed-in members can unfold More for work days, hours, languages, and notes. Contact details stay locked until you sign in. Work Fulfillment helps you understand fit and improve current work. Contribute Opportunities are for trying activities, not job matching. Happiness and Work Joy stay private and are not sent to employers.",
      "aliases": [
        "job search",
        "employment",
        "hiring",
        "job fit",
        "post a job",
        "look for work without account"
      ],
      "capabilityIds": [
        "market",
        "work_fulfillment",
        "happiness"
      ],
      "sourceRefs": [
        "src/pages/Market.tsx",
        "src/components/market/MarketJobsInterestForm.tsx",
        "docs/04-operations/dev/market-jobs-public.md",
        "src/lib/happiness/fulfillment/jobs-bridge.ts"
      ]
    },
    {
      "id": "can_post_job_without_account",
      "question": "Can I look for a job without signing up?",
      "answer": "Yes. Open Jobs from the public website, or Market > Jobs. Anyone can browse Available work, look for workers, or post an opening without an account. Contact details stay locked until you sign in. There is no paid unlock.",
      "aliases": [
        "public jobs",
        "post job without account",
        "guest job board"
      ],
      "capabilityIds": [
        "market"
      ],
      "sourceRefs": [
        "docs/04-operations/dev/market-jobs-public.md",
        "src/pages/Market.tsx",
        "src/components/market/MarketJobsBoard.tsx"
      ]
    },
    {
      "id": "can_employer_see_happiness",
      "question": "Can my employer see my Happiness?",
      "answer": "No. Individual Happiness & Fulfillment stays private. If you turn on privacy-protected group insights in Happiness Privacy, qualifying information may contribute to group insights only when enough people are included. Authorized viewers may open Wellbeing Insights. That is not employer access to your Happiness, and it is separate from Job Fit sharing.",
      "aliases": [
        "employer wellbeing",
        "organization happiness",
        "anonymous happiness",
        "group insights"
      ],
      "capabilityIds": [
        "happiness",
        "wellbeing_aggregate"
      ],
      "sourceRefs": [
        "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md",
        "src/pages/happiness/HappinessPrivacy.tsx",
        "src/pages/wellbeing/WellbeingInsights.tsx"
      ]
    }
  ],
  "aliases": [
    {
      "current": "Opportunities",
      "aliases": [
        "professional listings",
        "open tasks",
        "tasks"
      ]
    },
    {
      "current": "Community Challenges",
      "aliases": [
        "challenges",
        "community problem-solving lab"
      ]
    },
    {
      "current": "Learning Commons",
      "aliases": [
        "shared knowledge",
        "knowledge commons"
      ]
    },
    {
      "current": "Prototype credits",
      "aliases": [
        "luma",
        "luma wallet",
        "wallet"
      ]
    },
    {
      "current": "Community Governance Charter",
      "aliases": [
        "civizen constitution",
        "constitution v0.1"
      ]
    },
    {
      "current": "Agreements",
      "aliases": [
        "contracts",
        "collaboration agreement"
      ]
    },
    {
      "current": "Happiness & Fulfillment",
      "aliases": [
        "happiness score",
        "wellbeing",
        "mental health score"
      ]
    },
    {
      "current": "Work Fulfillment",
      "aliases": [
        "occupational fit",
        "work joy"
      ]
    },
    {
      "current": "Wellbeing Insights",
      "aliases": [
        "group insights",
        "organization happiness"
      ]
    },
    {
      "current": "Human Outcome Review",
      "aliases": [
        "outcome review",
        "happiness impact"
      ]
    },
    {
      "current": "My Contributions",
      "aliases": [
        "impact ledger"
      ]
    },
    {
      "current": "Civizen",
      "aliases": [
        "levela"
      ]
    }
  ],
  "chunks": [
    {
      "id": "capability:home",
      "title": "Home",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Home status=implemented. Signed-in home feed with Score snapshot, Governance shortcut, post composer with formatting (including line spacing), Edit post for the author, and post actions Like \xB7 Comment \xB7 Repost \xB7 Publish to\u2026. Open Home from the bottom nav. Share a post from the composer; Bold, Italic, Underline, lists, and line spacing are available while the composer is focused. On any post: Like, Comment (discussion under the post), Repost (plain or with thoughts into your own feed), or Publish to\u2026 (external networks when you are the author on the official Civizen org account). The author (or the organization account that published it) can Edit post at any time; Edited appears next to the time after a change. Repost keeps a link to the original \u2014 it does not copy the text. Routes: /.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:study",
      "title": "Study",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Study status=implemented. Learning hub for civic materials such as the Community Governance Charter, laws, and related study domains. Distinct from Learning Commons. Open Study from the bottom navigation. Routes: /study, /law.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:contribute_hub",
      "title": "Contribute",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Contribute status=implemented. Participation gateway asking how you would like to contribute today. Ways, Community, Knowledge, and Your Impact. Open Contribute from the bottom navigation. Routes: /contribute.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:opportunities",
      "title": "Opportunities",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Opportunities status=implemented. Short verifiable pieces of work. Education-to-Contribution lives under Contribute > Opportunities. Apply, complete work, submit evidence, and get it verified. Open Contribute > Opportunities. Open an opportunity, apply, do the work, then submit evidence for verification. Routes: /contribute/professional, /contribute/professional/new.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:community_challenges",
      "title": "Community Challenges",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Community Challenges status=implemented. Name a local problem, collect proposals, choose one solution, implement it through a Project, and keep a Solution Record. Distinct from Governance Solutions. Open Contribute > Community Challenges. Use Create to start a challenge. Others can submit proposals; the coordinator selects one and runs implementation work as Opportunities. Routes: /contribute/challenges, /contribute/challenges/new.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:matters",
      "title": "Questions, Issues & Ideas",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Questions, Issues & Ideas status=implemented. Generic Matter collaboration under Contribute. Ask a question, raise an issue, suggest an improvement, or work with others toward an outcome. Every active Matter shows who must act next, what is expected, when it is due, and what happens if nobody acts. Comments are not formal actions. When work is needed, the responsible party can start collaborative work, assign Tasks, record Decisions, and return to the same resolution confirmation flow. Completing a Task does not resolve the Matter. Ordinary collaborative-work completion requires required Tasks to be Completed or Cancelled; inviting someone to collaborate is not the same as asking them to accept shared responsibility. Authorized leads can add AI assistance, including a Coding Agent that uses a live model to inspect and edit authorized files through a trusted isolated worktree runner for human review \u2014 it does not commit, push, or deploy. Open Contribute > Questions, Issues & Ideas. Create a Matter, choose the intended person or organization, then follow the Current Action panel. For work that needs several people, use Start collaborative work. Needs Your Action also lists assigned Tasks. Routes: /contribute/matters, /contribute/matters/new.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:projects",
      "title": "Projects",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Projects status=implemented. Implementation records inside Community Challenges. There is no separate community-projects board. Contribute > Projects redirects to Challenges.  Routes: /contribute/challenges.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:knowledge_spaces",
      "title": "Knowledge Spaces",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Knowledge Spaces status=implemented. Learning Commons collections of practical resources. Distinct from Study and Governance Solutions. Open Contribute > Learning Commons. Routes: /contribute/knowledge, /contribute/knowledge/new.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:knowledge_gaps",
      "title": "Knowledge Gaps",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Knowledge Gaps status=implemented. Named gaps in a Knowledge Space. Coordinators can turn an actionable gap into an Opportunity or a Community Challenge.  Routes: /contribute/knowledge.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:solution_records",
      "title": "Solution Records",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Solution Records status=implemented. Outcome record created when a Community Challenge completes. May link a Human Outcome Review and a public-safe lesson. Negative or unclear human outcomes are preserved. Not a Happiness ranking and not Governance Solutions.  Routes: /contribute/challenges.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:programs",
      "title": "Programs",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Programs status=implemented. Containers for contribution work (education_to_contribution, community_problem_solving, shared_knowledge). Published by a profile.  Routes: /contribute.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:my_contributions",
      "title": "My Contributions",
      "path": "src/lib/assistant/catalog.ts",
      "text": "My Contributions status=implemented. Your applications, completed work, and verified participations across opportunity kinds. Open Contribute > My Contributions. Profile also shows the Contributions ledger. Routes: /contribute/impact, /profile/contributions.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:contribute_improvements",
      "title": "Suggest Improvements",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Suggest Improvements status=implemented. Shortcut into Matter create as a Suggestion addressed to Civizen. Not a separate suggestion backend, and not a second place for Opportunities, Challenges, or shared knowledge. Open Contribute > Suggest Improvements. It opens a new Matter already set as a Suggestion to Civizen. You can edit the type, recipient, and Area before submitting. Routes: /contribute/improvements, /contribute/matters/new.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:market",
      "title": "Market",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Market status=implemented. Public Jobs board plus marketplace listings, products, and services. Anyone can look for work or post a job without an account. Contact details stay locked until sign-in. Start agreement or Contact for member listings. Ordinary orders use Marketplace terms. Open Jobs from the public website, or Market > Jobs. The page title is Marketplace / Jobs. The sentence fills place from your location and shows a guide pay for the job type. Employers look for a person, not a job. Guests can browse and post there. Signed-in members can unfold More for work days, hours, languages, and notes. Routes: /jobs, /market.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:agreements",
      "title": "Agreements",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Agreements status=implemented. Platform workspace to create, review, sign, and keep agreements with people and organizations. Supported types open purpose-built documents (including Employment and Lease). Native electronic signing uses typed name plus explicit consent. Paper or external execution can be recorded. Not a certified PKI digital signature and not a claim of legal enforceability. Open Market > Agreements. Tap + beside the title, choose a type (Employment and Lease are in the common list; Lease includes Car, Vehicle, Residential, Commercial, Equipment, Office, and Property rental), edit the agreement document, create it, then propose and sign. Routes: /agreements, /agreements/new.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:messaging",
      "title": "Messaging",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Messaging status=implemented. Private conversations, including a pinned chat with Civi. Person-to-person chats can be hidden from your inbox (the other person keeps their copy). Disappearing messages is a shared thread setting both people see, applying to new messages. You can edit or unsend your own message for one minute. Civi chats can be cleared entirely. Searching for people can use phone contacts with permission; people not on Civizen can be invited. Optional device-based E2EE for person-to-person chat.  Routes: /messaging.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:nela",
      "title": "Civi",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Civi status=implemented. Civi is Civizen\u2019s AI assistant. Visitors can ask project questions without creating an account. Members also find Civi pinned in Messaging. Answers from current project knowledge for this build. When Civi does not already have a good answer and uses Gemini, it checks that reply and may remember it for similar questions later. Identity, the capability registry, and the cheat sheet still win. Personal records are not stored in Civi memory. During development, founders can review questions and replies at Settings > AI Agent. Open the Civi button at the lower right, or Messaging after you sign in. Founders can review interaction history from Settings > AI Agent. Routes: /onboarding, /messaging, /settings/ai-agent.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:why_civizen_exists",
      "title": "Why Civizen Exists",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Why Civizen Exists status=implemented. Public founding message: Civizen exists to help people unite around shared human responsibility, with practical systems for cooperation and peace. Unity does not require uniformity. Nations and cultures stay. Complementary world citizenship is a civic identity, not current legal nationality. Open Why Civizen Exists from the public site, or ask Civi how we can stop wars or unite humanity. Routes: /why-this-exists.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:profile",
      "title": "Profiles",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Profiles status=implemented. Member and linked business profiles with identity, education, experience, skills, endorsements, and Score. Optional Identity verification from Settings \u2192 Edit Profile uploads an ID photo and face photo for staff review when stronger trust is needed (not at signup; not a government ID). Open Profile from the menu. To verify identity when needed: Open Settings > Edit Profile, then use Identity verification to upload an ID photo and a face photo and submit for review. Routes: /profile, /settings/profile.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:score",
      "title": "Civizen Score",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Civizen Score status=implemented. Score V2 with Learning, Experience, Skills, Performance, and Contributions. Public overall score is established activity. Tiers: Explorer, Builder, Contributor, Catalyst, Steward. Still in formation. Happiness data is not part of Score. Open Profile or the Home Score card. Contributions detail is also under Profile > Contributions. Routes: /profile, /profile/contributions.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:happiness",
      "title": "Happiness & Fulfillment",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Happiness & Fulfillment status=implemented. Private Happiness & Human Fulfillment. Five levels (Struggling, Unsettled, Balanced, Flourishing, Thriving) \u2014 not a numeric Happiness Score. Adaptive check-ins record today\u2019s feeling, multiple life areas, and specific supports or problems; weekly pulse, monthly review, Fulfillment Plans under Improve, causes, and small actions with follow-up. Private by default. Not used for Score, reputation, hiring, or governance power. Work issues open Work Fulfillment. Actual employment uses Marketplace Jobs. Optional privacy-protected group insights are off by default and never show individual Happiness to employers. Civi may receive a grounded Plan brief; it must not invent history or diagnose. Follow-up timing can be stored; notifications are not sent yet. Open Happiness & Fulfillment from the Profile menu. Check in from Overview or the Check-ins tab, review wellbeing, or Improve to start a Fulfillment Plan. Routes: /happiness, /happiness/check-in, /happiness/review, /happiness/improve, /happiness/privacy.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:work_fulfillment",
      "title": "Work Fulfillment",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Work Fulfillment status=implemented. Distinct Work Fulfillment & Occupational Fit subunit inside Happiness. Current work, Work Joy Monitor, Fit profile, improve-current-work first. Contribute is for trying work (Contribution Fit). Marketplace Jobs is for actual employment (Job Fit). Study for learning/reskill. Low work fulfillment does not automatically recommend a new career. No public Work Fulfillment or Job Fit score. Approved shareable preferences may prefill Jobs; private Joy, diagnoses, and notes never transfer. Open Happiness & Fulfillment, then Work Fulfillment. For a job, open Market > Jobs. Routes: /happiness/work, /market.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:wellbeing_aggregate",
      "title": "Wellbeing Insights",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Wellbeing Insights status=implemented. Authorized viewers can open Wellbeing Insights and Human Outcome Reviews for privacy-protected group patterns. Individual Happiness stays private. Published lessons are Civizen-member readable after an intentional publish step, not anonymous internet access. There is no Happiness impact score, ranking, or causal claim from before-and-after observation. Open Happiness & Fulfillment > Privacy, or Wellbeing Insights. After a linked Challenge, Project, or Governance action, use Human Outcome Review. Participation is off by default. Routes: /happiness/privacy, /wellbeing-insights, /wellbeing-insights/outcome.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:governance",
      "title": "Governance",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Governance status=implemented. Public governance landing, civic voting, and one member Governance page with three tabs: Votes (open consultations with your own ballot status, scheduled ones, and published results), Proposals (drafts open for member support with a support threshold, your drafts, published and closed proposals), and Tools (steward console and legacy workspace tools, shown only to office holders, founders, admins, or members who can assign roles). A consultation starts as a Matter; its author opens the draft for member support, sets scope (global or one country) and opening/closing times, and can publish once the support threshold is reached; founders and admins can publish at any time. Ordinary consultations need only a free account; the server enforces sanctions, minimum age, verification and country scope when an election declares them. Every voter gets a receipt they can check against the public list of counted ballots; choices stay sealed. Members are notified when a consultation they follow is published and when its result is published. Current public community instrument is the Community Governance Charter. Open Home > Governance for the landing, Home > Governance > Civic voting for the public election catalog, and Settings > Member workspace (or /governance/workspace) for the member Governance page with the Votes, Proposals and Tools tabs. Start a consultation from a Matter (Contribute > Questions, Issues & Ideas > Create voting proposal), then open it for member support on the proposal page. Tap the bell in the top chrome or Settings > Notifications for notifications. The steward console is at /governance/tools/steward and the legacy workspace tools at /governance/tools (Tools tab). Routes: /governance, /governance/workspace, /governance/tools, /governance/tools/steward, /governance/voting, /notifications.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:civic_voting",
      "title": "Civic voting",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Civic voting status=implemented. Elections catalog and election detail/observe at /governance/voting. Public browsing is available. The first real public consultation is A Single World Citizenship: a global, nonbinding question on whether humanity should work toward a single world citizenship shared by all people regardless of nationality. Support, Oppose, and Abstain are equal. A Support vote does not create or grant citizenship. Token wealth does not create voting power.  Routes: /governance/voting.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:governance_solutions",
      "title": "Governance Solutions",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Governance Solutions status=implemented. Post a civic Problem and Discuss or Solve. AI council can participate in discussion. Distinct from Community Challenge Solution Records.  Routes: /governance/solutions.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:governance_charter",
      "title": "Civizen Community Governance Charter",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Civizen Community Governance Charter status=implemented. Current public community governance instrument (interim). Not a government constitution. Replaces Civizen Constitution v0.1.  Routes: /governance/charter.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:areas",
      "title": "Areas",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Areas status=implemented. Read-only public Areas V1: Health, Education, Culture, Responsibility, Environment. Shows where help is needed. Open Areas from Contribute, Home > Governance, or the public footer. Routes: /areas.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:partnerships",
      "title": "Partnerships",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Partnerships status=implemented. Public Partners notice for international partnerships and chapters. Institutional inquiries are under Contribute > Financial Support. Not a partner CRM.  Routes: /partners, /fund/institutional.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:funding",
      "title": "Funding",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Funding status=implemented. Public inquiry hub only. Does not process investments, issue securities, or create binding investment agreements. Current public policy is Funding and Financial Integrity.  Routes: /fund, /fund/support, /fund/invest, /fund/transparency.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:prototype_credits",
      "title": "Prototype credits",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Prototype credits status=experimental. Luma is a non-transferable prototype credit for demonstration. Not money, not a wallet for settlement, no governance rights. Peer send is disabled.  Routes: /settings/prototype-credits.",
      "status": "experimental",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:luma_transfers",
      "title": "Luma transfers",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Luma transfers status=deprecated. Peer Luma transfer and marketplace Luma checkout are disabled. Do not describe Luma as a working currency.  Routes: /settings/prototype-credits.",
      "status": "deprecated",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:tokenomics_governance",
      "title": "Constitutional Tokenomics + Governance Model",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Constitutional Tokenomics + Governance Model status=historical. Earlier planning document. Not adopted. Not current policy. Not an implemented monetary system. Current public funding policy is Funding and Financial Integrity.  Routes: /documents, /fund.",
      "status": "historical",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:institutional_blueprint",
      "title": "Institutional Blueprint",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Institutional Blueprint status=proposed. Working institutional architecture (legal entities, funding allocation principles, authority). Project reference, not a live in-app government and not adopted public policy.  Routes: .",
      "status": "proposed",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "capability:phase1_pilots",
      "title": "Phase 1 contribution pilots",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Phase 1 contribution pilots status=implemented. Three live pilots: Education-to-Contribution, Community Problem-Solving Lab, and Shared Knowledge / Learning Commons.  Routes: /contribute/professional, /contribute/challenges, /contribute/knowledge.",
      "status": "implemented",
      "priority": 3,
      "kind": "capability"
    },
    {
      "id": "faq:what_is_civizen",
      "title": "What is Civizen?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: What is Civizen? A: Civizen is an open participatory system for organizing how humanity learns, contributes, collaborates, governs, shares resources, solves common challenges, and continuously improves the systems we live and work within.",
      "status": "implemented",
      "priority": 1,
      "kind": "faq"
    },
    {
      "id": "faq:what_civizen_trying_to_accomplish",
      "title": "What is Civizen trying to accomplish?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: What is Civizen trying to accomplish? A: Civizen is an open participatory system for organizing how humanity learns, contributes, collaborates, governs, shares resources, solves common challenges, and continuously improves the systems we live and work within. Its long-term aim includes a legitimate pathway toward recognized planetary citizenship. That recognition is not current legal status.",
      "status": "implemented",
      "priority": 1,
      "kind": "faq"
    },
    {
      "id": "faq:is_civizen_a_social_network",
      "title": "Is Civizen a social network?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: Is Civizen a social network? A: No. Civizen has profiles, posts, and messaging, but those are components of a broader participatory system. Civizen is not merely a social network.",
      "status": "implemented",
      "priority": 1,
      "kind": "faq"
    },
    {
      "id": "faq:can_i_edit_a_post",
      "title": "Can I edit a post after I publish it?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: Can I edit a post after I publish it? A: Yes. Open Home, then the post \u22EF menu, and choose Edit post. You can change the text and formatting whenever you like. After you save a change, the post shows Edited next to the time. Comments, likes, and reposts stay in place.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:is_civizen_a_government",
      "title": "Is Civizen a government?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: Is Civizen a government? A: No. Civizen is not currently a government, nationality, or public-law citizenship. World citizenship in Civizen is a voluntary civic identity. The long-term pathway toward recognized planetary citizenship is described publicly and is not present legal status.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:is_civizen_a_project_collaboration_platform",
      "title": "Is Civizen basically a project collaboration platform?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: Is Civizen basically a project collaboration platform? A: No. Project collaboration is one component. Civizen is an open participatory system for organizing how humanity learns, contributes, collaborates, governs, shares resources, solves common challenges, and continuously improves the systems we live and work within. Challenges, Projects, Market, Study, and similar surfaces are parts of that broader system, not the definition of it.",
      "status": "implemented",
      "priority": 1,
      "kind": "faq"
    },
    {
      "id": "faq:who_is_civi",
      "title": "Who is Civi?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: Who is Civi? A: Civi is Civizen\u2019s AI assistant. Visitors can ask Civi about the project without creating an account \u2014 open the Civi button at the lower right. Members can also chat with Civi in Messaging.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:what_can_i_do_in_civizen_now",
      "title": "What can I do in Civizen right now?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: What can I do in Civizen right now? A: In this build you can use Home, Study, Contribute (Opportunities, Community Challenges, Questions, Issues & Ideas, Suggest Improvements, Learning Commons, My Contributions), Market, Agreements, Messaging, Profile and Score, Happiness & Fulfillment, Areas, and Governance tools such as Civic voting and Governance Solutions. This is what is implemented today, not a full description of what Civizen is.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:how_can_i_contribute",
      "title": "How can I contribute?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: How can I contribute? A: Open Contribute and choose how you want to help: Volunteer, Opportunities, Financial Support, Organization Partnership, Community Challenges, Questions, Issues & Ideas, Suggest Improvements, Learning Commons, or My Contributions.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:how_do_i_raise_a_question_or_issue",
      "title": "How do I ask a question or raise an issue?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: How do I ask a question or raise an issue? A: Open Contribute > Questions, Issues & Ideas. Create a Matter, choose the person or organization it is for, and submit. The Current Action panel shows who must respond and when. Comments are discussion only; only Provide final answer starts the review timer. If the Matter needs actual work, the responsible party can start collaborative work and assign Tasks. Completing a Task does not close the Matter. Ordinary work completion waits until required Tasks are Completed or Cancelled. Suggest Improvements opens a Suggestion to Civizen.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:if_i_need_housing_or_emergency_help",
      "title": "I am homeless. Can Civizen help me?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: I am homeless. Can Civizen help me? A: I'm sorry you're going through this. Civizen is not a shelter, housing office, or emergency service, and I cannot arrange a place to stay or send money.\n\nIf you need a safe place tonight, contact local emergency services or a local homelessness helpline. In many regions, 211 can connect you to nearby help.\n\nIf you want work, Jobs is open without an account. Open Market > Jobs. Community Challenges is for local problems over time \u2014 not emergency housing.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:how_can_we_stop_wars",
      "title": "How can we stop wars?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: How can we stop wars? A: Civizen exists to help people unite around shared human responsibility. Peace needs more than speeches, slogans, or treaties. It needs practical systems people can join, examine, improve, and hold accountable.\n\nUnity does not require uniformity \u2014 nations and cultures stay, while a complementary world citizenship adds a shared layer of responsibility. Civizen is not a government. It is the work through which wars should become unnecessary, because people have practical tools to create and protect peace instead of only hoping for it.\n\nStart by signing up, then make a contribution. You can take part through Community Challenges, Opportunities, Study, and Governance.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:what_are_opportunities",
      "title": "What are Opportunities?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: What are Opportunities? A: Opportunities are short, verifiable pieces of work. Find them under Contribute > Opportunities. You apply, complete the work, submit evidence, and an evaluator verifies it. Older names like professional listings or open tasks mean Opportunities.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:what_are_community_challenges",
      "title": "What are Community Challenges?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: What are Community Challenges? A: Community Challenges are a live Contribute lane for real local problems. The flow is Challenge \u2192 Proposal \u2192 coordinator selection \u2192 Implementation Project \u2192 work Opportunities \u2192 outcome \u2192 Solution Record. Open Contribute > Community Challenges. This is not Governance Solutions.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:who_can_create_a_community_challenge",
      "title": "Who can create a Community Challenge?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: Who can create a Community Challenge? A: Signed-in members can create a challenge from Create on Contribute > Community Challenges. The publisher (your profile or a linked organization account) becomes the coordinator for that challenge. Proposal selection is done by the coordinator, not by public voting.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:what_are_projects",
      "title": "What are Projects?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: What are Projects? A: Projects are implementation records inside Community Challenges. There is no separate projects board. Contribute > Projects sends you to Community Challenges.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:what_is_my_contributions",
      "title": "What is My Contributions?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: What is My Contributions? A: My Contributions (Contribute > My Contributions) shows work you applied for, completed, or had verified. Your Profile Contributions ledger shows the inspectable record that feeds Score.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:what_is_study",
      "title": "What is Study?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: What is Study? A: Study is the learning hub in the bottom navigation. It holds civic learning materials such as charter/constitution study and links to the Law library. It is not the same as Learning Commons, where people share practical contribution knowledge.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:what_are_knowledge_spaces",
      "title": "What are Knowledge Spaces?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: What are Knowledge Spaces? A: Knowledge Spaces are shared collections in Contribute > Learning Commons. Each space holds resources, can name Knowledge Gaps, and can link resulting work back as improved knowledge.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:what_are_knowledge_gaps",
      "title": "What are Knowledge Gaps?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: What are Knowledge Gaps? A: Knowledge Gaps name what is missing, weak, outdated, or still needs practical development inside a Knowledge Space. A coordinator can turn a gap into an Opportunity or a Community Challenge.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:what_are_solution_records",
      "title": "What are Solution Records?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: What are Solution Records? A: A Solution Record is the outcome kept after a Community Challenge is actually implemented. It is not the Governance Solutions page. Coordinators can share a Solution Record into a Knowledge Space.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:how_does_governance_work",
      "title": "How does governance work?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: How does governance work? A: Civizen currently has a public Governance landing, civic voting/elections, a member proposal workspace, and Governance Solutions. Community participation is described by the Community Governance Charter. Civizen is not a government. Working institutional frameworks exist as project design, not as live public-law authority.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:who_can_create_proposals",
      "title": "Who can create proposals?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: Who can create proposals? A: Eligible signed-in participants can submit proposals in Home > Governance workspace under the Community Governance Charter. Community Challenge proposals are a different flow inside a Challenge, selected by that challenge\u2019s coordinator.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:who_can_vote",
      "title": "Who can vote?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: Who can vote? A: Civic elections are at Home > Governance > Civic voting. Community votes follow published eligibility in the Charter and platform rules. Token ownership, financial support, or wealth alone does not create voting authority.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:what_is_governance_solutions",
      "title": "What is Governance Solutions?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: What is Governance Solutions? A: Governance Solutions (Home > Governance > Governance Solutions) lets members post a civic Problem and Discuss or Solve it, including AI-assisted discussion. It is not the Solution Record produced by a Community Challenge.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:what_is_the_civizen_constitution",
      "title": "What is the Civizen Constitution?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: What is the Civizen Constitution? A: The current public community instrument is the Civizen Community Governance Charter (Home > Governance > Community Governance Charter). It is not the legal constitution of a government. The earlier Civizen Constitution v0.1 is superseded by that Charter.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:constitutional_tokenomics",
      "title": "What is the Civizen Constitutional Tokenomics + Governance Model?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: What is the Civizen Constitutional Tokenomics + Governance Model? A: That document is historical and not adopted. It is not current policy and is not implemented as a monetary system. Current public funding policy is Funding and Financial Integrity. Luma is only a prototype credit. Current community governance text is the Community Governance Charter.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:how_can_an_organization_participate",
      "title": "How can an organization participate?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: How can an organization participate? A: Open Contribute > Organization Partnership, or send an institutional inquiry from Contribute > Financial Support. Organizations also appear as linked business accounts that can publish Opportunities, Challenges, or Knowledge Spaces. There is no full partner CRM in this build.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:what_can_coordinators_do",
      "title": "What can coordinators do?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: What can coordinators do? A: A coordinator is the publisher profile for a Program, Opportunity, Challenge, or Knowledge Space. They create and manage that work, review applicants or proposals, verify evidence, and (for Challenges) select a proposal and record the outcome.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:what_is_a_linked_organization",
      "title": "What is a publisher or linked organization account?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: What is a publisher or linked organization account? A: Phase 1 has no separate organizations table. A publisher is a profile. Business or organization coordination uses linked accounts on that profile. A member may link more than one business account from the profile menu Accounts +. Those organizations stay listed while you are signed into any of them. Swipe or scroll the account cards and tap one to switch. If the company already exists, Add business offers Connect instead of Register.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:how_can_an_institution_partner",
      "title": "How can an institution partner with Civizen?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: How can an institution partner with Civizen? A: Open Contribute > Organization Partnership and send an inquiry through Contribute > Financial Support. You can also create agreements from Market > Agreements (for example Partnership / Collaboration). A full Stakeholder Map and partner CRM are proposed institutional design, not a current app workspace.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:what_are_areas",
      "title": "What are Areas?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: What are Areas? A: Areas are where help is needed. The current foundational Areas are Health, Education, Culture, Responsibility, and Environment. Browse them from Contribute, Home > Governance, or the public footer. They are not the same as product pillars.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:what_are_initiatives",
      "title": "What are initiatives?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: What are initiatives? A: On public Area pages, initiatives are curated organized work toward an outcome, listed beside related systems. There is no full initiative workspace or matching engine in this build.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:can_users_make_agreements",
      "title": "Can users make agreements through Civizen?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: Can users make agreements through Civizen? A: Open Market > Agreements and tap + beside the title. Choose a type such as General, Partnership / Collaboration, Employment, Service / Contribution, Sale / Purchase, Lease, or Funding / Sponsorship. Propose it, then sign in Civizen or record a paper/external signing.\n\nSupported types open a readable agreement document. You can start from a listing, Jobs, or another related activity. Ordinary Marketplace purchases stay as orders and do not automatically create a Sale / Purchase Agreement. Lease heading kinds include Residential, Commercial, Car, Vehicle, Equipment, Office, and Property rental.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:can_civizen_digitally_sign_contracts",
      "title": "Can Civizen digitally sign contracts?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: Can Civizen digitally sign contracts? A: Civizen supports native electronic signing in the Agreements workspace: a typed name plus explicit consent, which is stored on the signed version. Paper or an external e-sign service can be recorded separately. This is not a certified PKI digital signature and is not a claim that the record is legally certified or enforceable.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:what_acceptance_records_exist",
      "title": "What kinds of acceptance or participation records currently exist?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: What kinds of acceptance or participation records currently exist? A: Current records include Agreement versions and signatures, Terms acceptance, Opportunity applications and participations, Challenge proposals, and contribution evidence. These are platform records, not a general-purpose public notary.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:does_civizen_have_happiness",
      "title": "Does Civizen have a Happiness Score?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: Does Civizen have a Happiness Score? A: No. Civizen does not show a numeric Happiness Score. Open Happiness & Fulfillment from the Profile menu. You see five levels \u2014 Struggling, Unsettled, Balanced, Flourishing, and Thriving \u2014 as states, not identities. Check-ins and reviews are private and are not used for Civizen Score, reputation, hiring, or voting power.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:where_is_happiness",
      "title": "Where is Happiness & Fulfillment?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: Where is Happiness & Fulfillment? A: Open Happiness & Fulfillment from the Profile menu. Check in, review wellbeing, open Improve for Fulfillment Plans, or open Work Fulfillment. Privacy is under Happiness & Fulfillment > Privacy. Authorized viewers use Wellbeing Insights and Human Outcome Review.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:where_are_jobs",
      "title": "Where do I look for a job?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: Where do I look for a job? A: Open Jobs from the public website, or Market > Jobs. Anyone can look for work or post a job without signing up. Signed-in members can unfold More for work days, hours, languages, and notes. Contact details stay locked until you sign in. Work Fulfillment helps you understand fit and improve current work. Contribute Opportunities are for trying activities, not job matching. Happiness and Work Joy stay private and are not sent to employers.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:can_post_job_without_account",
      "title": "Can I look for a job without signing up?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: Can I look for a job without signing up? A: Yes. Open Jobs from the public website, or Market > Jobs. Anyone can browse Available work, look for workers, or post an opening without an account. Contact details stay locked until you sign in. There is no paid unlock.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "faq:can_employer_see_happiness",
      "title": "Can my employer see my Happiness?",
      "path": "src/lib/assistant/catalog.ts",
      "text": "Q: Can my employer see my Happiness? A: No. Individual Happiness & Fulfillment stays private. If you turn on privacy-protected group insights in Happiness Privacy, qualifying information may contribute to group insights only when enough people are included. Authorized viewers may open Wellbeing Insights. That is not employer access to your Happiness, and it is separate from Job Fit sharing.",
      "status": "implemented",
      "priority": 5,
      "kind": "faq"
    },
    {
      "id": "registry:nav",
      "title": "Primary navigation",
      "path": "src/lib/main-nav.ts",
      "text": "Current bottom navigation paths: /, /study, /contribute, /market, /messaging.",
      "status": "implemented",
      "priority": 2,
      "kind": "registry"
    },
    {
      "id": "registry:civi-pages",
      "title": "Pages Civi can open",
      "path": "src/lib/nela-nav-paths.ts",
      "text": "Civi can link these live pages in answers: Why Civizen Exists (/why-this-exists); Community Governance Charter (/governance/charter); Organization Partnership (/partners); Governance Solutions (/governance/solutions); Community Challenges (/contribute/challenges); make a contribution (/contribute); Questions, Issues & Ideas (/contribute/matters); Suggest Improvements (/contribute/improvements); Learning Commons (/contribute/knowledge); My Contributions (/contribute/impact); Financial Support (/fund); Prototype credits (/settings/prototype-credits); Governance workspace (/governance/workspace); Civic voting (/governance/voting); Opportunities (/contribute/professional); Agreements (/agreements); Contribute (/contribute); Messaging (/messaging); Governance (/governance); Documents (/documents); Partners (/partners); Settings (/settings); Profile (/profile); Jobs (/jobs); Market (/market); Study (/study); signing up (/signup); Sign up (/signup); Areas (/areas); Home (/).",
      "status": "implemented",
      "priority": 2,
      "kind": "registry"
    },
    {
      "id": "registry:roles",
      "title": "App roles",
      "path": "src/lib/access-control.ts",
      "text": "Current app roles: guest, member, citizen, verified_member, certified, moderator, market_manager, admin, founder, system. Members have agreements.create.",
      "status": "implemented",
      "priority": 4,
      "kind": "registry"
    },
    {
      "id": "registry:contribute-lanes",
      "title": "Contribute lanes",
      "path": "src/lib/contribute-lanes.ts",
      "text": "Contribute lanes: volunteer \u2192 /fund/contribute; professional \u2192 /contribute/professional; financial \u2192 /fund; organization \u2192 /partners; challenges \u2192 /contribute/challenges; matters \u2192 /contribute/matters; knowledge \u2192 /contribute/knowledge; improvements \u2192 /contribute/improvements; impact \u2192 /contribute/impact.",
      "status": "implemented",
      "priority": 3,
      "kind": "registry"
    },
    {
      "id": "registry:areas",
      "title": "Foundational Areas",
      "path": "src/lib/classification/registry.ts",
      "text": "Current foundational Areas: Health, Education, Culture, Responsibility, Environment.",
      "status": "implemented",
      "priority": 2,
      "kind": "registry"
    },
    {
      "id": "registry:agreement-types",
      "title": "Agreement types",
      "path": "src/lib/agreements-model.ts",
      "text": "Implemented agreement types: general, mou, partnership, pilot, program, funding, employment, service_contribution, sale_purchase, lease, data_research, nda, amendment, other, custom, market_core, market_product, market_service. Native electronic signing and paper/external execution are supported.",
      "status": "implemented",
      "priority": 2,
      "kind": "registry"
    },
    {
      "id": "registry:luma",
      "title": "Prototype credits",
      "path": "src/lib/prototype-credits.ts",
      "text": "Luma is a prototype feature used for demonstration and internal product testing. It is not money, a security, a deposit, a stablecoin, a claim on assets, or a promise of financial value. It cannot be purchased, withdrawn, redeemed, converted, or transferred between participants. It has no cash value and does not provide governance rights.",
      "status": "experimental",
      "priority": 3,
      "kind": "registry"
    },
    {
      "id": "docs/assistant/civizen-identity.md#0",
      "title": "Canonical Civizen Identity",
      "path": "docs/assistant/civizen-identity.md",
      "text": "# Canonical Civizen Identity This is the authoritative source for what Civizen **is**. It outranks feature documentation, capability lists, and implementation notes for identity, purpose, mission, scope, and one-sentence description questions. Do not reconstruct Civizen\u2019s identity from whichever product surfaces are currently most mature.",
      "status": "implemented",
      "priority": 1,
      "kind": "identity"
    },
    {
      "id": "docs/assistant/civizen-identity.md#1",
      "title": "Canonical short definition",
      "path": "docs/assistant/civizen-identity.md",
      "text": "## Canonical short definition Civizen is an open participatory system for organizing how humanity learns, contributes, collaborates, governs, shares resources, solves common challenges, and continuously improves the systems we live and work within. Use this sentence for questions such as: What is Civizen? What\u2019s Civizen in one sentence? How would you describe Civizen? What kind of system is Civizen? What is the purpose of Civizen?",
      "status": "implemented",
      "priority": 1,
      "kind": "identity"
    },
    {
      "id": "docs/assistant/civizen-identity.md#2",
      "title": "Expanded definition",
      "path": "docs/assistant/civizen-identity.md",
      "text": "## Expanded definition Civizen is a shared system in which people participate as members of humanity rather than as users of a single-purpose app. People learn, record contribution, hold and share knowledge, and collaborate on work that matters. They practice governance, allocate and steward shared resources, name common problems, and carry solutions through projects into implemented outcomes. Organizations and institutions can take part without becoming the definition of the system. The aim is continuous improvement of the systems we live and work within \u2014 not a finished product catalog.",
      "status": "implemented",
      "priority": 1,
      "kind": "identity"
    },
    {
      "id": "docs/assistant/civizen-identity.md#3",
      "title": "Purpose",
      "path": "docs/assistant/civizen-identity.md",
      "text": "## Purpose Civizen is not merely a project-management platform, a social network, a governance app, a marketplace, or a learning platform. Those may be components of the broader system. The purpose is to organize how humanity learns, contributes, collaborates, governs, shares resources, solves common challenges, and improves shared systems. Civizen exists to help people unite around shared human responsibility. Founding documents describe this as giving people practical tools to create and protect peace, not merely to hope for it. Unity does not require uniformity.",
      "status": "implemented",
      "priority": 1,
      "kind": "identity"
    },
    {
      "id": "docs/assistant/civizen-identity.md#4",
      "title": "Identity vs implementation",
      "path": "docs/assistant/civizen-identity.md",
      "text": "## Identity vs implementation **What Civizen is** is the broader participatory system and purpose above. **What Civizen currently implements** is the live product: the screens, workflows, and capabilities in this build. A narrow current implementation must not redefine the identity. Community Challenges, Projects, Market, Study, Agreements, and similar surfaces can be mature without making Civizen \u201Cmainly\u201D a challenge, project, marketplace, or learning product.",
      "status": "implemented",
      "priority": 1,
      "kind": "identity"
    },
    {
      "id": "docs/assistant/civizen-identity.md#5",
      "title": "Routing",
      "path": "docs/assistant/civizen-identity.md",
      "text": "## Routing - Identity, purpose, mission, scope, or one-sentence description \u2192 this document first, then foundational/constitutional Civizen documents if more depth is needed. - What members can do **right now** \u2192 the capability registry and current project knowledge. Do not answer with the identity sentence alone. - How a specific function such as governance works \u2192 that domain\u2019s knowledge plus current implementation status. Do not mix these categories in one undifferentiated answer.",
      "status": "implemented",
      "priority": 1,
      "kind": "identity"
    },
    {
      "id": "docs/assistant/civizen-assistant-cheatsheet.md#0",
      "title": "Civizen Assistant Cheat Sheet",
      "path": "docs/assistant/civizen-assistant-cheatsheet.md",
      "text": "# Civizen Assistant Cheat Sheet Compact high-confidence facts for Civi. Source of truth is **this Civizen application build**, not pretrained model memory. Civi is internal-first: conversation context \u2192 canonical identity (what Civizen is) \u2192 FAQ / this cheat sheet \u2192 capability registry (what works now) \u2192 project knowledge search \u2192 authorized member data \u2192 checked Civi memory \u2192 AI reasoning over that evidence \u2192 broader API resources only when the request is actually about the outside world. External resources must never override current Civizen project information. Product principle: **Simple by default. Detailed by choice.**",
      "status": "implemented",
      "priority": 5,
      "kind": "cheatsheet"
    },
    {
      "id": "docs/assistant/civizen-assistant-cheatsheet.md#1",
      "title": "Civizen Assistant Cheat Sheet",
      "path": "docs/assistant/civizen-assistant-cheatsheet.md",
      "text": "When telling a member or visitor how to open a page, match the question. **Can I / Does Civizen** starts with Yes or No, then the path. **How / Where** starts with the path, for example **Open Market > Agreements**. Do not answer with only a URL such as `/agreements`. Put extra explanation after a blank line. Name agreement types exactly as they appear in the + menu so chat can link each type to New agreement.",
      "status": "implemented",
      "priority": 5,
      "kind": "cheatsheet"
    },
    {
      "id": "docs/assistant/civizen-assistant-cheatsheet.md#2",
      "title": "What Civizen is",
      "path": "docs/assistant/civizen-assistant-cheatsheet.md",
      "text": "## What Civizen is Civizen is an open participatory system for organizing how humanity learns, contributes, collaborates, governs, shares resources, solves common challenges, and continuously improves the systems we live and work within. Authoritative identity source: `docs/assistant/civizen-identity.md`. Do not reconstruct this from feature documentation. Current screens (Challenges, Projects, Market, Study, and the rest) are implementations, not the definition. Slogan: **For a Mature Humanity**. Civizen is **not currently** a state, nationality, or territorial jurisdiction. Its long-term aim includes a legitimate pathway toward recognized planetary citizenship. Distinguish \u201Cnot currently\u201D from \u201Cnever.\u201D",
      "status": "implemented",
      "priority": 5,
      "kind": "cheatsheet"
    },
    {
      "id": "docs/assistant/civizen-assistant-cheatsheet.md#3",
      "title": "Immediate need (housing, food, safety)",
      "path": "docs/assistant/civizen-assistant-cheatsheet.md",
      "text": "## Immediate need (housing, food, safety) If someone says they are homeless, unhoused, hungry, evicted, or need a place to stay tonight, do **not** answer with Contribute, Volunteer, Financial Support, or \u201Chow you want to help.\u201D Acknowledge the situation. Be honest: Civizen is not a shelter, housing office, or emergency service, and Civi cannot arrange housing or send money. Point them to local emergency services or a local homelessness helpline; in many regions, **211** can connect them to nearby help. Do not invent named local shelters. If they want work, Jobs is open without an account (`Open Market > Jobs`). Community Challenges is for local problems over time \u2014 not emergency housing. Answer from this fact; do not send the question to the model.",
      "status": "implemented",
      "priority": 5,
      "kind": "cheatsheet"
    },
    {
      "id": "docs/assistant/civizen-assistant-cheatsheet.md#4",
      "title": "Peace, war, and cooperation",
      "path": "docs/assistant/civizen-assistant-cheatsheet.md",
      "text": "## Peace, war, and cooperation If someone asks how to stop wars, achieve peace, or unite humanity, answer from founding Civizen documents (why Civizen exists, the Charter, world citizenship). Lead with uniting around shared human responsibility. Peace needs practical systems people can join and hold accountable \u2014 not speeches alone. Unity does not require uniformity. Do **not** recap manifesto prose (\u201CHumanity often unites only when disaster\u2026\u201D). Do **not** start a how-question with Yes. Do not invent a new slogan. Invite in ordinary sentences: start by **signing up**, then **make a contribution**. Name **Study**, **Community Challenges**, **Opportunities**, and **Governance** as the places to take part \u2014 do not write \u201Clearn in Study\u201D. Do not dump Volunteer / Financial Support lanes.",
      "status": "implemented",
      "priority": 5,
      "kind": "cheatsheet"
    },
    {
      "id": "docs/assistant/civizen-assistant-cheatsheet.md#5",
      "title": "Core purpose",
      "path": "docs/assistant/civizen-assistant-cheatsheet.md",
      "text": "## Core purpose Civizen is not merely a project-management platform, social network, governance app, marketplace, or learning platform. Those may be components. The purpose is the participatory system named above.",
      "status": "implemented",
      "priority": 5,
      "kind": "cheatsheet"
    },
    {
      "id": "docs/assistant/civizen-assistant-cheatsheet.md#6",
      "title": "Current product structure",
      "path": "docs/assistant/civizen-assistant-cheatsheet.md",
      "text": "## Current product structure Primary navigation (signed-in): **Home \xB7 Study \xB7 Contribute \xB7 Market \xB7 Messaging** \u2014 bottom bar on phones; left side rail on large screens. Public website header on large screens also shows **Why this exists \xB7 Areas \xB7 Jobs \xB7 Documents \xB7 Governance**, plus Sign in / Join for guests. Settings, Profile, Search, Agreements, Governance, Score, Downloads, and admin tools live outside the primary nav (Profile menu, page chrome, or public routes). Public discovery includes `/areas`, `/partners`, `/fund`, `/documents`, `/governance`, `/about/*`, and `/contribute/policy`.",
      "status": "implemented",
      "priority": 5,
      "kind": "cheatsheet"
    },
    {
      "id": "docs/assistant/civizen-assistant-cheatsheet.md#7",
      "title": "Current navigation / systems",
      "path": "docs/assistant/civizen-assistant-cheatsheet.md",
      "text": "| Surface | Open | Status | | --- | --- | --- | | Home | Home | implemented (composer formatting including line spacing; author can Edit post; feed actions: Like \xB7 Comment \xB7 Repost \xB7 Publish to\u2026; Repost keeps a link to the original) | | Study | Study | implemented | | Contribute hub | Contribute | implemented | | Opportunities | Contribute > Opportunities | implemented | | Community Challenges | Contribute > Community Challenges | implemented | | Questions, Issues & Ideas | Contribute > Questions, Issues & Ideas | implemented | | Learning Commons | Contribute > Learning Commons | implemented | | My Contributions | Contribute > My Contributions | implemented | | Suggest Improvements | Contribute > Suggest Improvements | implemented (shortcut: Suggestion Matter to Civizen) | | Market | Market | implemented | | Agreements | Market > Agreements | implemented | | Messaging | Messaging | implemented | | Profile / Score | Profile | implemented | | Happiness & Fulfillment | Profile menu, or the Happiness icon on the Home Score card | implemented (private; five levels, not a numeric score; Fulfillment Plans under Improve; optional group insights off by default) | | Work Fulfillment | Happin",
      "status": "implemented",
      "priority": 5,
      "kind": "cheatsheet"
    },
    {
      "id": "docs/assistant/civizen-assistant-cheatsheet.md#8",
      "title": "Current navigation / systems",
      "path": "docs/assistant/civizen-assistant-cheatsheet.md",
      "text": "`/contribute/tasks` redirects to Opportunities. `/contribute/projects` redirects to Community Challenges.",
      "status": "implemented",
      "priority": 5,
      "kind": "cheatsheet"
    },
    {
      "id": "docs/assistant/civizen-assistant-cheatsheet.md#9",
      "title": "Areas",
      "path": "docs/assistant/civizen-assistant-cheatsheet.md",
      "text": "## Areas Current foundational Areas (evolvable): **Health \xB7 Education \xB7 Culture \xB7 Responsibility \xB7 Environment**. Public `/areas` and `/areas/:slug` are read-only. Areas answer *where help is needed*. Contribute answers *how I want to help*. Partners answers *how an organization can work with Civizen*. Product pillars (`PILLARS`) are a separate live product taxonomy. Do not treat them as the Area model.",
      "status": "implemented",
      "priority": 5,
      "kind": "cheatsheet"
    },
    {
      "id": "docs/assistant/civizen-assistant-cheatsheet.md#10",
      "title": "Initiatives",
      "path": "docs/assistant/civizen-assistant-cheatsheet.md",
      "text": "## Initiatives Public Area pages list curated related **systems** (existing product surfaces) and genuine **initiatives** (organized work toward an outcome). There is no full initiative schema or matching engine in this build. A future Areas & Pilots Catalog is recorded in institutional docs and is **not built**.",
      "status": "implemented",
      "priority": 5,
      "kind": "cheatsheet"
    },
    {
      "id": "docs/assistant/civizen-assistant-cheatsheet.md#11",
      "title": "Contribution model",
      "path": "docs/assistant/civizen-assistant-cheatsheet.md",
      "text": "## Contribution model `/contribute` asks: **How would you like to contribute today?** Ways: Volunteer (`/fund/contribute`) \xB7 Opportunities \xB7 Financial Support (`/fund`) \xB7 Organization Partnership (`/partners`). Community: Community Challenges. Knowledge: Learning Commons \xB7 Suggest Improvements (opens a Suggestion to Civizen). Your Impact: My Contributions. A **Program** (`contribution_programs`) is the container. Publisher is a profile (personal or linked business account). There is no separate organizations table in this phase. An **Opportunity** is the work primitive. A **Contribution** is a participation (`opportunity_participations`). Score events are derived. Phase 1 pilots (live): Education-to-Contribution, Community Problem-Solving Lab, Shared Knowledge / Learning Commons.",
      "status": "implemented",
      "priority": 5,
      "kind": "cheatsheet"
    },
    {
      "id": "docs/assistant/civizen-assistant-cheatsheet.md#12",
      "title": "Opportunities",
      "path": "docs/assistant/civizen-assistant-cheatsheet.md",
      "text": "## Opportunities Live under **Contribute > Opportunities**. Education-to-Contribution Program. Flow: discover \u2192 apply \u2192 organizer accept/decline \u2192 do the work \u2192 submit evidence \u2192 evaluator verifies \u2192 optional evaluation \u2192 completed contribution. Opportunity kinds: `education_to_contribution` (professional lane), `community_implementation` (inside a Challenge Project), `knowledge_gap` (from a Knowledge Gap). Older names such as \u201Cprofessional listings\u201D or \u201Copen tasks\u201D mean Opportunities.",
      "status": "implemented",
      "priority": 5,
      "kind": "cheatsheet"
    },
    {
      "id": "docs/assistant/civizen-assistant-cheatsheet.md#13",
      "title": "Community Challenges",
      "path": "docs/assistant/civizen-assistant-cheatsheet.md",
      "text": "## Community Challenges Live under **Contribute > Community Challenges**. Distinct from Governance Solutions. Flow: Challenge \u2192 Proposal \u2192 coordinator selection (not public voting) \u2192 Implementation Project \u2192 Contribution Opportunities \u2192 outcome \u2192 Solution Record. Signed-in members can create a challenge from **Create** on Contribute > Community Challenges. Coordinators manage the challenge they publish. Completing requires implementation outcome, not merely a selected proposal.",
      "status": "implemented",
      "priority": 5,
      "kind": "cheatsheet"
    },
    {
      "id": "docs/assistant/README.md#0",
      "title": "Civizen Assistant Knowledge",
      "path": "docs/assistant/README.md",
      "text": "# Civizen Assistant Knowledge Civi answers from **this Civizen build**, not from general model memory. Visitors can ask Civi about the project without creating an account. Members also find Civi in Messaging.",
      "status": "implemented",
      "priority": 5,
      "kind": "doc"
    },
    {
      "id": "docs/assistant/README.md#1",
      "title": "Layout",
      "path": "docs/assistant/README.md",
      "text": "## Layout | Path | Role | | --- | --- | | [`civizen-identity.md`](./civizen-identity.md) | Canonical identity, purpose, and one-sentence definition | | [`civizen-assistant-cheatsheet.md`](./civizen-assistant-cheatsheet.md) | Compact canonical facts for frequent questions | | `src/lib/assistant/catalog.ts` | Machine-readable capabilities, FAQ, and terminology aliases | | `src/lib/assistant/learned-memory.ts` | Checked Gemini-answer memory (does not override identity or capabilities) | | `src/pages/settings/AiAgentSettings.tsx` | Founder development review of Civi questions and replies | | `src/lib/assistant/generated/knowledge-pack.ts` | Generated searchable index (do not edit by hand) | | `supabase/functions/messaging-agent-reply/nela-bundle.js` | Bundled retrieval runtime for the Civi edge function |",
      "status": "implemented",
      "priority": 5,
      "kind": "doc"
    },
    {
      "id": "docs/assistant/README.md#2",
      "title": "Refresh",
      "path": "docs/assistant/README.md",
      "text": "## Refresh After changing product behavior, registries, public pages, flows, or assistant-authoritative docs, update the cheat sheet and/or `src/lib/assistant/catalog.ts` in the same session, then: ```bash npm run assistant:knowledge ``` Knowledge regen also indexes live bottom nav, Contribute lanes, and the pages Civi can link (`NELA_PAGE_LINKS`). When Civi gives directions, it should match the question: **Can I** starts with Yes or No, then the path; **How** starts with `Open Market > Agreements`. Chat turns those page names into links. Type names in the main answer (General, Partnership / Collaboration, and the rest) also link to New agreement for that type. CI and `verify:agent-context` fail if the generated pack is stale relative to its sources.",
      "status": "implemented",
      "priority": 5,
      "kind": "doc"
    },
    {
      "id": "docs/assistant/README.md#3",
      "title": "Internal-first routing",
      "path": "docs/assistant/README.md",
      "text": "## Internal-first routing Civi uses the closest authoritative resource first: 1. Conversation context 2. Canonical identity (`civizen-identity.md`) for what Civizen is, its purpose, mission, scope, or one-sentence description 3. FAQ / this cheat sheet 4. Capability registry for what is implemented **now** 5. Project knowledge index 6. Authorized runtime / member data 7. Civi memory of **checked** previous model answers (similar questions only; never overrides 2\u20135) 8. AI reasoning over collected evidence 9. Broader API-agent resources only when the request needs the outside world Identity questions must not be answered by reconstructing Civizen from feature docs. Capability questions must not be answered with the identity sentence alone.",
      "status": "implemented",
      "priority": 5,
      "kind": "doc"
    },
    {
      "id": "docs/assistant/README.md#4",
      "title": "Internal-first routing",
      "path": "docs/assistant/README.md",
      "text": "Someone asking for housing, food, or a safe place tonight is not a Contribute question. Civi acknowledges the situation, says Civizen is not emergency housing, points to local emergency services / 211, and may mention Jobs \u2014 not Volunteer lanes. Peace, war, and \u201Chow do we unite humanity\u201D questions are in scope. Answer from founding documents, including the need to unite around shared human responsibility. Unity does not require uniformity. Invite signing up and making a contribution; name Study, Community Challenges, Opportunities, and Governance in ordinary sentences. Do not write \u201Clearn in Study\u201D. Do not recap manifesto prose. How-questions do not start with Yes. Do not claim Civizen currently stops wars or is a government.",
      "status": "implemented",
      "priority": 5,
      "kind": "doc"
    },
    {
      "id": "docs/assistant/README.md#5",
      "title": "Internal-first routing",
      "path": "docs/assistant/README.md",
      "text": "Civizen product facts stay internal even after escalation. Missing internal evidence does not authorize a generic web/model guess about Civizen. Gemini (or another model) may fill a gap for a general or mixed question; Civi then **checks** that reply before storing it. Invented Civizen capabilities, personal records, and one-off drafts are not remembered.",
      "status": "implemented",
      "priority": 5,
      "kind": "doc"
    },
    {
      "id": "docs/assistant/README.md#6",
      "title": "Status vocabulary",
      "path": "docs/assistant/README.md",
      "text": "## Status vocabulary Capabilities use: `implemented` \xB7 `experimental` \xB7 `in_development` \xB7 `proposed` \xB7 `deprecated` \xB7 `historical`. \u201CCivizen supports X\u201D means X is **implemented** in this build.",
      "status": "implemented",
      "priority": 5,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/agreements.md#0",
      "title": "Civizen Agreements",
      "path": "docs/04-operations/dev/agreements.md",
      "text": "# Civizen Agreements Platform-level capability for creating, reviewing, signing, and retaining agreements between Civizen parties. **Simple by default. Advanced by need. Always.** (Agent policy: [`AGENTS.md`](./AGENTS.md).)",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/agreements.md#1",
      "title": "Information architecture",
      "path": "docs/04-operations/dev/agreements.md",
      "text": "## Information architecture ```text Marketplace / relevant Civizen activity \u2192 Agreement \u2192 /agreements workspace ``` - Marketplace remains an important entry point (`Start agreement` on listings, Jobs, header shortcut). - Agreements is **not** a Marketplace-only feature. - `/agreements` is the canonical working area. - Contextual starts (opportunity, challenge/pilot, implementation project, knowledge space, contribution, funding, jobs, public initiative, `/partners`) open `/agreements/new` with known parties and related activity prefilled.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/agreements.md#2",
      "title": "Workspace",
      "path": "docs/04-operations/dev/agreements.md",
      "text": "## Workspace `/agreements` is **simple by default**. Mobile default: Needs action \xB7 Active \xB7 All Additional lifecycle filters (Draft, In review, Awaiting signatures, Completed, Terminated, Declined/withdrawn) stay behind **Filter** on All. Search appears on All once records exist. Empty first-use is compact: **No agreements yet**, short purpose copy, and no extra Create button. A compact `+` sits immediately beside the Agreements title in every state (accessible name **Create agreement**). Hover or click/tap opens a type menu with search. **More agreement types\u2026** is the last item in that same menu and reveals specialized types there. Unmatched search offers **+ Create \u201C{name}\u201D** for a custom type. Selecting a supported type opens that type\u2019s actual Agreement template. Amendments are created from an executed agreement, not from this menu.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/agreements.md#3",
      "title": "New agreement",
      "path": "docs/04-operations/dev/agreements.md",
      "text": "## New agreement Supported types open as readable purpose-built Agreement documents (Employment, Sale / Purchase, Service / Contribution, Partnership, and the other governed types each have their own wording). Required facts are inline placeholders \u2014 parties, dates, position, price, and similar values are edited inside the document. Visible placeholders name the action needed (**Select or enter party**, **Describe the service or contribution**, **Select start date**) and use the fill-in color (teal) until a value is entered. Structured data is stored underneath for search, lifecycle, signatures, and related activity.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/agreements.md#4",
      "title": "New agreement",
      "path": "docs/04-operations/dev/agreements.md",
      "text": "The page header is **Agreement on**. Hover or click/tap that wording to open the same type menu as the Agreements `+` (search, common types, **More agreement types\u2026**). Choosing a type switches this draft. The document heading names the kind (for example **Employment**, **Sale / Purchase**, **Lease**, or **Service Provision**) and sits on the left of that line. An optional user/organization reference sits on the right of the same line, muted and editable (**Your reference**). It defaults to the service provider\u2019s initials or the organization\u2019s abbreviation (for example **AR** or **CRU**) when that name is known, and parties can change it or leave it blank \u2014 **USC-2026-04** and **PO-1187** are valid custom numbers. It is not the Civizen Agreement ID. A Civizen reference (**AGR-2026-0001**) is assigned when the first party signature arrives (native or recorded external execution). It is immutable and appears in small type in the lower-right corner of the agreement \u2014 not on the creation screen. That heading looks like ordinary title text. Hover shows only the other relevant wordings (not the current one). Click or tap the heading to rename it in place \u2014 there is no **Rename** row. On ",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/agreements.md#5",
      "title": "New agreement",
      "path": "docs/04-operations/dev/agreements.md",
      "text": "The opening sentence names who is which party. A service relationship defaults to **Client** and **Service Provider**. A contribution relationship (including launches from an opportunity) defaults to **Organization / Project** and **Contributor**. Role labels such as *the Client* or *the Service Provider* are italic in the Agreement prose so the party name stays visually primary. Hover shows the other roles that belong in that agreement, including **Service Provider** on the Client side. Click or tap renames the role in place; italics stay after editing. Choosing **Service Provider** for yourself sets the other party to **Client** when that role was still the paired default. Switching Service Provision to Contribution updates default roles to Organization / Project / Contributor when those roles were still the defaults.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/agreements.md#6",
      "title": "Domain",
      "path": "docs/04-operations/dev/agreements.md",
      "text": "## Domain Identity and lifecycle live on the existing `agreements` table (including Market listing agreements as types `market_*`). Versions, parties, signatories, signatures, attachments, relationships, and audit events are child tables. Native electronic signing requires explicit consent and a typed name. Paper / external execution is recorded separately and is not silently treated as a native signature. Do not describe fingerprints as PKI digital signatures. Do not claim legal certification or enforceability.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/agreements.md#7",
      "title": "Related specs",
      "path": "docs/04-operations/dev/agreements.md",
      "text": "## Related specs - Contribute hub: [`contribute-page.md`](./contribute-page.md) - Phase 1 pilots: [`phase-1-pilot-operating-model.md`](./phase-1-pilot-operating-model.md) - Partnerships (institutional): [`../../institutional/stakeholder-partnership-framework.md`](../../institutional/stakeholder-partnership-framework.md) - Pilots (institutional): [`../../institutional/pilot-framework.md`](../../institutional/pilot-framework.md)",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/contribute-page.md#0",
      "title": "Contribute Page",
      "path": "docs/04-operations/dev/contribute-page.md",
      "text": "# Contribute Page **Project:** Civizen **Route:** `/contribute` **Version:** 2.6 **Status:** Phase 1 hub live. Three pilots: Education-to-Contribution, Community Challenges, Learning Commons. Operating model: [`phase-1-pilot-operating-model.md`](./phase-1-pilot-operating-model.md) Canonical product/UX note for agents. Source draft: `docs/tmp/contribute_page`.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/contribute-page.md#1",
      "title": "Objective",
      "path": "docs/04-operations/dev/contribute-page.md",
      "text": '## Objective `/contribute` is the primary hub where individuals and organizations contribute to Civizen and the Mature Humanity mission. It answers: > **"How would you like to contribute today?"** A future **Areas & Initiatives** surface answers a different question \u2014 **where** Civizen needs help \u2014 and should connect here rather than replace this hub. Spec: [`docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md`](../../03-platform/areas-and-initiatives/public-areas-initiatives-v1.md). Public UX follows **Simple by default. Detailed by choice.** ([IA standards](../../03-platform/product-design/information-architecture-and-content-standards.md) \xA72). Minimal public `/areas` V1 is implemented (read-only). Do not redesign `/contribute` from the Areas spec.',
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/contribute-page.md#2",
      "title": "Objective",
      "path": "docs/04-operations/dev/contribute-page.md",
      "text": "It is a gateway \u2014 not a duplicate of Profile, Messaging, Score, or endorsement flows. Endorsement stays on Search people results and user profiles.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/contribute-page.md#3",
      "title": "Phase 1 layout",
      "path": "docs/04-operations/dev/contribute-page.md",
      "text": "## Phase 1 layout ### Ways to Contribute | Lane | Destination | |------|-------------| | Volunteer | `/fund/contribute` | | Professional Skills / Opportunities | `/contribute/professional` (Education-to-Contribution) | | Financial Support | `/fund` (inquiry hub only) | | Organization Partnership | `/partners` |",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/contribute-page.md#4",
      "title": "Phase 1 layout",
      "path": "docs/04-operations/dev/contribute-page.md",
      "text": "Organization Partnership currently opens the public **International Partnerships and Chapters** notice. The working institutional parent for partnerships is [`docs/institutional/stakeholder-partnership-framework.md`](../../institutional/stakeholder-partnership-framework.md). Concrete programs and experiments sit under the [`Pilot Framework`](../../institutional/pilot-framework.md). Contribution Record *design* is the [`Contributor Framework`](../../institutional/contributor-framework.md); public `/contribute/policy` remains adopted contributor policy. Shared Area/Domain taxonomy is the [`Areas, Domains & Participation Framework`](../../institutional/areas-domains-participation-framework.md). A future public **Areas & Initiatives** experience is specified in [`public-areas-initiatives-v1.md`](../../03-platform/areas-and-initiatives/public-areas-initiatives-v1.md) (minimal `/areas` V1 is read-only; not `/documents`). How those models may later evolve: [`Shared Classification & Model Evolution Architecture`](../../03-platform/model-evolution/shared-classification-and-model-evolution-architecture.md). A future **Areas & Pilots Catalog** is recorded under the Pilot Framework (Pilot Port",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/contribute-page.md#5",
      "title": "Phase 1 layout",
      "path": "docs/04-operations/dev/contribute-page.md",
      "text": "### Community | Lane | Destination | |------|-------------| | Community Challenges | `/contribute/challenges` | | Questions, Issues & Ideas | `/contribute/matters` | Implementation **Projects** live inside Challenges. There is no separate community-projects or tasks board. `/contribute/projects` redirects here. `/contribute/tasks` redirects to Opportunities. When a Challenge is linked from a wellbeing pattern, coordinators may open a **Human Outcome Review** after implementation. Operational delivery and later privacy-safe human-outcome evidence stay separate; causality is not inferred. ### Knowledge | Lane | Destination | |------|-------------| | Learning Commons | `/contribute/knowledge` | | Suggest Improvements | `/contribute/improvements` \u2192 Matter create as a Suggestion to Civizen | ### Your Impact",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/contribute-page.md#6",
      "title": "Implementation map",
      "path": "docs/04-operations/dev/contribute-page.md",
      "text": "- Hub: `src/pages/Contribute.tsx` - Lane registry: `src/lib/contribute-lanes.ts` - Slice 1 Education-to-Contribution: `src/pages/contribute/ProfessionalOpportunities.tsx`, `OpportunityDetail.tsx`, `OpportunityForm.tsx` - Slice 3 Community Challenges: `src/pages/contribute/CommunityChallenges.tsx`, `ChallengeDetail.tsx`, `ChallengeForm.tsx` - Slice 4 Learning Commons: `src/pages/contribute/KnowledgeSpaces.tsx`, `KnowledgeSpaceDetail.tsx`, `KnowledgeSpaceForm.tsx`, `KnowledgeResourceDetail.tsx`, `KnowledgeResourceForm.tsx` - Matter Collaboration (Questions, Issues & Ideas): `src/pages/contribute/Matters.tsx`, `MatterForm.tsx`, `MatterDetail.tsx`, `MatterWorkPanel.tsx` \xB7 spec: [`matter-collaboration.md`](./matter-collaboration.md) - My Contributions: `src/pages/contribute/ContributeImpact.tsx` - Domain + RPC wrappers: `src/lib/opportunities.ts`, `src/lib/opportunities-api.ts`, `src/lib/challenges.ts`, `src/lib/challenges-api.ts`, `src/lib/knowledge.ts`, `src/lib/knowledge-api.ts`, `src/lib/matters.ts`, `src/lib/matters-api.ts`, `src/lib/matters-workflow.ts`, `src/lib/matters-work.ts` - Schema: `supabase/migrations/20260813010000_education_to_contribution_opportunities.sql`, `202608130",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/contribute-page.md#7",
      "title": "Slice 1 (Education-to-Contribution)",
      "path": "docs/04-operations/dev/contribute-page.md",
      "text": "## Slice 1 (Education-to-Contribution) Live at `/contribute/professional`. Flow: discover open opportunity \u2192 essential details \u2192 apply \u2192 organizer accept/decline \u2192 participant works \u2192 submit evidence (description + URL/reference) \u2192 evaluator reviews \u2192 completed + verified \u2192 derived `profile_contribution_events` row (`source_table = opportunity_participations`). Publisher is a `profiles` row (personal or business via `linked_accounts`). No organizations table, payments, file upload, LMS, or Pilot Portfolio. Progressive disclosure: cards show title, short purpose, a few skills, effort/location, and status or next action. Requirements, criteria, evidence detail, and administration stay behind detail views.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/contribute-page.md#8",
      "title": "Slice 1 (Education-to-Contribution)",
      "path": "docs/04-operations/dev/contribute-page.md",
      "text": "Verified work may appear as skill evidence and demonstrated experience. It does not overwrite declared skills, education, credentials, or employment history. Development-story journal rows (including Cursor/chat and git backfill) are provenance. They are not independent contribution roots. Historical coherent outcomes are reconstructed by `reconstructHistoricalDevelopmentOutcomes` (`docs/04-operations/dev/historical-development-reconstruction.md`) and then verified through `evaluateDevelopmentContributionEvidence`. Live capture of a completed work unit is `recordDevelopmentOutcome` (`src/lib/civizen-development-capture.ts`): stable `outcomeRootId`, real features, commit/PR, `testsPassed`, roles. The collector reevaluates and Score V2 recomputes on read. See the Score page spec.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/contribute-page.md#9",
      "title": "Slice 1 (Education-to-Contribution)",
      "path": "docs/04-operations/dev/contribute-page.md",
      "text": "Organizer review shows each applicant\u2019s existing profile identity (`full_name`, `username`, avatar, link to `/user/:profileId`) through RPC `list_opportunity_applicant_identities`. Identity is not copied onto participation rows, and `profiles` RLS is unchanged. **Authorization verification:** Automated RLS tests against a local Supabase database are in `src/lib/opportunities-auth.integration.test.ts`. They stay skipped unless `CIVIZEN_OPPORTUNITY_AUTH_TEST=1` and loopback `CIVIZEN_LOCAL_SUPABASE_*` credentials are set. This environment has no Civizen local Supabase (app URL is remote; another project occupies local 54321). Manual SQL for the same cases: `scripts/db/local-dev-only/verify-education-to-contribution-auth.sql` (transaction + `ROLLBACK`; not for the remote application database).",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/contribute-page.md#10",
      "title": "Slice 2 (Contribution Evaluation)",
      "path": "docs/04-operations/dev/contribute-page.md",
      "text": "## Slice 2 (Contribution Evaluation) Optional quality layer after verification. Verification still confirms the work happened and who did it (`evaluate_opportunity_work`). Evaluation records how well it was done (`record_opportunity_work_assessment`) and is not required to complete a contribution. The coordinator chooses which dimensions apply on the opportunity (Completion, Quality, Reliability / Timeliness, Collaboration, Outcome, Impact) without a nested configuration UI. Empty selection means the opportunity does not use evaluation. Participants see a summary first; dimension scores and notes stay behind More details.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/contribute-page.md#11",
      "title": "Slice 2 (Contribution Evaluation)",
      "path": "docs/04-operations/dev/contribute-page.md",
      "text": "`opportunity_participations` remains the authoritative record. Score/Performance events stay a derived projection. Only Quality, Impact, and Collaboration may update contribution-event estimates used by Performance. Completion, Reliability / Timeliness, and Outcome are stored and shown, not auto-fed into the overall score. Peer ratings (`profile_performance_ratings`) are unchanged. Slice 1 `opportunity_evaluations.quality_score` / `impact_score` remain deprecated compatibility columns. Do not remove them. Do not use them for new evaluations.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/contribute-page.md#12",
      "title": "Slice 3 (Community Problem-Solving Lab)",
      "path": "docs/04-operations/dev/contribute-page.md",
      "text": "## Slice 3 (Community Problem-Solving Lab) Live at `/contribute/challenges`. Distinct from Governance Solutions (`solution_problems` / `solution_proposals`). Flow: Challenge \u2192 Proposal \u2192 Selection (coordinator, no public voting) \u2192 Implementation Project \u2192 Contribution Opportunities \u2192 Implementation \u2192 Outcome \u2192 Solution Record. Challenges belong to a `contribution_programs` row (kind `community_problem_solving`), not a separate pilot container. Implementation work reuses Slice 1/2: Opportunity \u2192 Participation \u2192 Evidence \u2192 Verification \u2192 optional Evaluation \u2192 Completed Contribution. Community implementation opportunities use `opportunity_kind = community_implementation` and do not appear on the professional lane.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/contribute-page.md#13",
      "title": "Slice 3 (Community Problem-Solving Lab)",
      "path": "docs/04-operations/dev/contribute-page.md",
      "text": "Participant-facing stages: Draft \u2192 Active \u2192 Proposal review \u2192 Implementation \u2192 Completed. Completing requires a selected proposal, an implementation project, and a recorded outcome \u2014 selection alone is not completion. Completing creates a `solution_records` row. A coordinator can share that record into a Knowledge Space (`publish_solution_record_as_resource`), which creates a Knowledge Resource and preserves Challenge/Project provenance. Do not merge this lane with Governance Solutions. Cards stay concise: title, one-line problem, stage, primary action. Evidence, constraints, proposal administration, and success criteria stay off the default card.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/matter-collaboration.md#0",
      "title": "Matter Collaboration System",
      "path": "docs/04-operations/dev/matter-collaboration.md",
      "text": "# Matter Collaboration System **Project:** Civizen **Routes:** `/contribute/matters`, `/contribute/matters/new`, `/contribute/matters/:matterId` **Status:** Phase 1 + Phase 2 + Phase 3 + Phase 4A (Human\u2013AI collaboration) + Phase 4B1 (controlled Coding Agent) shipped **Version:** 4.0 Canonical product/UX note for agents. Contribute hub: [`contribute-page.md`](./contribute-page.md). A **Matter** is something one Civizen actor brings to one or more other actors for attention, response, discussion, consideration, or action. It is a generic collaboration object, not an Issues module and not limited to government/citizen interactions. User-facing Contribute label: **Questions, Issues & Ideas**. Internal model remains `Matter`.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/matter-collaboration.md#1",
      "title": "Principle",
      "path": "docs/04-operations/dev/matter-collaboration.md",
      "text": "## Principle Every **active** Matter must make clear: 1. who is expected to act next, 2. what action is expected, 3. when it is due, 4. what happens if no action is taken. Operational state lives on **Matter Action Requirements**, not on one oversized Matter status enum.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/matter-collaboration.md#2",
      "title": "Lifecycle vs action state",
      "path": "docs/04-operations/dev/matter-collaboration.md",
      "text": "## Lifecycle vs action state Matter lifecycle: `draft` \xB7 `submitted` \xB7 `active` \xB7 `closed`. User-facing status is **derived** (waiting for response, clarification needed, waiting for initiator, response overdue, addressed, automatically closed, reopened, \u2026).",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/matter-collaboration.md#3",
      "title": "Actors",
      "path": "docs/04-operations/dev/matter-collaboration.md",
      "text": "## Actors Initiator and recipient are polymorphic: - person (`profiles`) - organization (business-linked `profiles` via `linked_accounts`) - group (reserved; no groups table in this phase) Do not model only `user_id`. Organization representatives use `current_profile_manages_publisher`.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/matter-collaboration.md#4",
      "title": "Invariants",
      "path": "docs/04-operations/dev/matter-collaboration.md",
      "text": "## Invariants 1. A comment is not a formal action. 2. Disputing responsibility does not close or hide the Matter. 3. Auto-close is not initiator confirmation. Silence uses: *Closed automatically after no response from the initiator within the resolution-review period.* 4. Reopening is append-only; prior closure stays on the ledger. 5. Active Matters have a current action requirement, one or more pending actions, or an explicit waiting condition. 6. Deadline and history changes are attributable (human vs system). 7. Simple Matters stay simple: contextual formal actions only. Collaborative work is opt-in. 8. Completing a Task never marks the Matter resolved.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/matter-collaboration.md#5",
      "title": "Timing",
      "path": "docs/04-operations/dev/matter-collaboration.md",
      "text": "## Timing Reusable `matter_timing_policies` (calendar days now; business days/hours reserved). Defaults for testing only: | Policy | Period | |--------|--------| | Question response | 3 calendar days | | Responsibility response | 2 calendar days | | Clarification response | 5 calendar days | | Resolution confirmation | 3 calendar days | | Task acceptance | 1 calendar day | | Task execution | 5 calendar days | | Task review | 2 calendar days | | Decision confirmation | 2 calendar days | | Final work response | 3 calendar days |",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/matter-collaboration.md#6",
      "title": "Timing",
      "path": "docs/04-operations/dev/matter-collaboration.md",
      "text": "Timeout behaviors are catalogued. Phase 1 **runs** `remind` and `auto_close` (initiator confirmation). Phase 3 **also runs** configurable escalation steps (`matter_escalation_steps`) for overdue `respond` / `responsibility_response` actions, marks actors unresponsive, notifies Responsible Lead, and can require manual review. Other catalogued types remain for later policy wiring. `list_matters` is read-only. Timeouts, reminders, and auto-close run only in `process_matter_action_timeouts`, serialized by a transaction advisory lock and `FOR UPDATE SKIP LOCKED`. Production invocation:",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/matter-collaboration.md#7",
      "title": "Timing",
      "path": "docs/04-operations/dev/matter-collaboration.md",
      "text": "1. **pg_cron** job `matter_action_timeout_tick` at minute 15 of every hour, when the `pg_cron` extension is installed. 2. Otherwise (or to run immediately): `scripts/db/run-matter-timeout-tick.sh`, which executes the same function as `postgres` over the remote database SSH path. Page and list reads may **display** overdue from `due_at` without mutating workflow state.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/matter-collaboration.md#8",
      "title": "Question workflow",
      "path": "docs/04-operations/dev/matter-collaboration.md",
      "text": "## Question workflow Comments and other ordinary discussion never start the initiator confirmation timer. Only **Provide final answer** (`respond`) does. The initiator can mark **Answered / satisfied** from discussion, ask for more information after a final answer, or record that the Question revealed an Issue without converting Matter type.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/matter-collaboration.md#9",
      "title": "Suggest Improvements",
      "path": "docs/04-operations/dev/matter-collaboration.md",
      "text": "## Suggest Improvements The Contribute card stays. `/contribute/improvements` is a shortcut into Matter create (`type=Suggestion`, intended recipient = official Civizen org). Area is left unset unless a future mapping is safe.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/matter-collaboration.md#10",
      "title": "Phase 1 surfaces",
      "path": "docs/04-operations/dev/matter-collaboration.md",
      "text": "## Phase 1 surfaces - Contribute lane **Questions, Issues & Ideas** - Queues: Needs Your Action \xB7 My Matters \xB7 Participating \xB7 Organization - Matter create, detail (current action, description, conversation, formal actions, activity) - Formal actions, comments with replies, optional evidence URL/file - Reminders, overdue, auto-close, reopen - **Phase 2 Work:** optional **Start collaborative work**; Work / Decisions sections; Tasks with acceptance, execution, review, dependencies, subtasks; Decision records; Task comments and completion evidence; Contribute queue includes Task and Decision actions",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/matter-collaboration.md#11",
      "title": "Distinct objects (Phase 2)",
      "path": "docs/04-operations/dev/matter-collaboration.md",
      "text": "## Distinct objects (Phase 2) Keep these separate: **Matter** \xB7 **Matter Responsibility** \xB7 **Task** (`collaboration_tasks`) \xB7 **Task Assignment** \xB7 **Decision** \xB7 **Evidence** (matter attachments). `matter_action_requirements` remains the only action clock. Task and Decision actions use `context_kind` + `context_id` so several pending clocks can exist at once. Timeout still runs only in `process_matter_action_timeouts`. Task overdue reminds; it does not auto-close the Matter. Auto-close remains initiator `confirm_resolution` only. Responsible Lead is explicit (`matter_responsibilities`). A Task assignee is not automatically responsible for the Matter. Organizations can hold responsibility or Task assignment through the existing actor model. AI actors are reserved and not activated.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/matter-collaboration.md#12",
      "title": "Distinct objects (Phase 2)",
      "path": "docs/04-operations/dev/matter-collaboration.md",
      "text": "When work is finished, Responsible Lead calls **Review completed work and provide final response**, which assigns the existing Phase 1 `address` / `mark_addressed` flow, then initiator confirmation. No second resolution system. Ordinary completion is allowed only when every required Task is in a **terminal** state: **Completed** or **Cancelled**. These are unfinished and block ordinary completion: Proposed, Assigned, Awaiting Acceptance, Accepted, In Progress, Blocked, Waiting, Submitted, Under Review. **Declined is not silently terminal.** The Responsible Lead must reassign, cancel, replace, or waive that assignment before ordinary completion.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/matter-collaboration.md#13",
      "title": "Distinct objects (Phase 2)",
      "path": "docs/04-operations/dev/matter-collaboration.md",
      "text": "**Complete with outstanding work** is an explicit exceptional path. It requires a reason, identifies the outstanding Tasks, is attributed to the Responsible Lead, and writes `collaborative_work_completed_with_outstanding` (not `collaborative_work_completed`). Outstanding Task statuses are not changed to Completed. The Matter waiting condition and final-response copy must be able to say that some work remained outstanding. Reopening keeps completed Tasks, Decisions, and evidence. New work is additive; old Tasks are not silently reset. ### Shared responsibility vs participation Inviting a Contributor, Specialist, Contractor, Observer, or Evaluator is **participation**. It does not create an accepted Responsible Collaborator.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/phase-1-pilot-operating-model.md#0",
      "title": "Phase 1 Pilot Operating Model",
      "path": "docs/04-operations/dev/phase-1-pilot-operating-model.md",
      "text": "# Phase 1 Pilot Operating Model **Project:** Civizen **Status:** Implemented operating note **Version:** 1.0 **Related:** [`contribute-page.md`](./contribute-page.md) \xB7 [`pilot-framework.md`](../../institutional/pilot-framework.md) This is the concise developer/operator description of what Phase 1 actually runs. It is not a strategy document. Principle: **Simple by default. Detailed by choice.**",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/phase-1-pilot-operating-model.md#1",
      "title": "Three pilot models",
      "path": "docs/04-operations/dev/phase-1-pilot-operating-model.md",
      "text": "## Three pilot models | Model | Hub lane | Program kind | What a person does | |------|----------|--------------|--------------------| | Education-to-Contribution | `/contribute/professional` | `education_to_contribution` | Join a short Opportunity, submit evidence, get it verified, optionally evaluated | | Community Problem-Solving | `/contribute/challenges` | `community_problem_solving` | Name a local problem, propose, implement through a Project, record an outcome, keep a Solution Record | | Shared Knowledge / Learning Commons | `/contribute/knowledge` | `shared_knowledge` | Collect practical Resources, name Knowledge Gaps, turn gaps into work, return results as reusable knowledge | Study, Governance Solutions, Market Jobs, Score, and Questions, Issues & Ideas (Matter collaboration) remain separate systems.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/phase-1-pilot-operating-model.md#2",
      "title": "Shared Program architecture",
      "path": "docs/04-operations/dev/phase-1-pilot-operating-model.md",
      "text": "## Shared Program architecture A **Program** (`contribution_programs`) is the container. Challenges, Knowledge Spaces, and (where relevant) Opportunities belong to a Program. There is no second pilot container. Publisher is a `profiles` row. Business/organization coordination uses `linked_accounts` (a member may link more than one business account). There is no organizations table in this phase.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/phase-1-pilot-operating-model.md#3",
      "title": "Opportunities and Contributions",
      "path": "docs/04-operations/dev/phase-1-pilot-operating-model.md",
      "text": "## Opportunities and Contributions An **Opportunity** is the work primitive. Kinds: - `education_to_contribution` \u2014 professional lane - `community_implementation` \u2014 work inside a Challenge Project - `knowledge_gap` \u2014 work opened from a Knowledge Gap **Contribution** means a participation in an Opportunity (`opportunity_participations`). That row is authoritative. Score events are derived (`profile_contribution_events`, `source_table = opportunity_participations`). There is no separate Tasks system. `/contribute/tasks` redirects to Opportunities. Challenge **Projects** are implementation records inside Challenges, not a second community-projects board. `/contribute/projects` redirects to Challenges. Demo Programs (seeded, founder-published, ordinary members can join): Education-to-Contribution, Community Problem-Solving Lab, Shared Knowledge Challenge.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/phase-1-pilot-operating-model.md#4",
      "title": "Verification versus evaluation",
      "path": "docs/04-operations/dev/phase-1-pilot-operating-model.md",
      "text": "## Verification versus evaluation - **Verification** (`evaluate_opportunity_work`) confirms the work happened and who did it. Required to complete. - **Evaluation** (`record_opportunity_work_assessment`) is optional after verified completion. It does not block completion. - Only Quality, Impact, and Collaboration may update derived Performance estimates. - Slice 1 `opportunity_evaluations.quality_score` / `impact_score` are compatibility fields only.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/phase-1-pilot-operating-model.md#5",
      "title": "Community Challenges",
      "path": "docs/04-operations/dev/phase-1-pilot-operating-model.md",
      "text": "## Community Challenges Flow: Challenge \u2192 Proposal \u2192 coordinator selection \u2192 Project \u2192 Opportunities \u2192 Contributions \u2192 Outcome \u2192 Completion \u2192 Solution Record. When the Challenge came from a wellbeing pattern, a Human Outcome Review may later compare privacy-safe baseline and follow-up evidence. That review is not a Happiness impact score and does not change contributor reputation. Selecting a proposal is not completion. Completing requires a selected proposal, a Project, and a recorded outcome. Distinct from Governance Solutions (`solution_problems`).",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/phase-1-pilot-operating-model.md#6",
      "title": "Projects and Solution Records",
      "path": "docs/04-operations/dev/phase-1-pilot-operating-model.md",
      "text": "## Projects and Solution Records A **Project** carries out the selected proposal. A **Solution Record** is the reusable outcome of a completed Challenge. It can be shared into a Knowledge Space as a Resource without copying the body.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/phase-1-pilot-operating-model.md#7",
      "title": "Learning Commons",
      "path": "docs/04-operations/dev/phase-1-pilot-operating-model.md",
      "text": "## Learning Commons A **Knowledge Space** is a structured collection, not a social group. **Resources** are the useful items (guide, research, learning material, case study, framework, dataset, tool, solution record, other). Status is Draft / Shared / Reviewed. Optional `pathway_order` is only a suggested sequence \u2014 not an LMS.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/phase-1-pilot-operating-model.md#8",
      "title": "Knowledge Gaps",
      "path": "docs/04-operations/dev/phase-1-pilot-operating-model.md",
      "text": "## Knowledge Gaps A **Gap** names something missing, weak, outdated, unresolved, contradictory, or still needing practical development. Coordinators convert it into an existing Opportunity or Challenge. Resolving a gap requires linking a resulting Resource or Solution Record.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/phase-1-pilot-operating-model.md#9",
      "title": "How the systems connect",
      "path": "docs/04-operations/dev/phase-1-pilot-operating-model.md",
      "text": "## How the systems connect ```text Knowledge Space \u2192 Resource \u2192 Knowledge Gap \u2192 Opportunity or Challenge \u2192 Contribution / Project / Outcome \u2192 Resource or Solution Record \u2192 Gap updated ``` That is also the Civizen cycle: Knowledge \u2192 Learning/Capability \u2192 Contribution \u2192 Problem-solving \u2192 Outcome \u2192 Reusable Knowledge. My Contributions: `/contribute/impact` (participations) and Profile/Score (derived evidence).",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/dev/phase-1-pilot-operating-model.md#10",
      "title": "Intentional Phase 1 limitations",
      "path": "docs/04-operations/dev/phase-1-pilot-operating-model.md",
      "text": "## Intentional Phase 1 limitations - No LMS, quizzes, credentials, or peer-review journal - No contributor-share / IP accounting - No automated knowledge synthesis - No separate task board or community-projects board - Suggest Improvements opens Matter create as a Suggestion to Civizen (not a separate backend) - Financial contribution remains inquiry-only - Local RLS harness for opportunities stays skipped without loopback Supabase credentials",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md#0",
      "title": "Civizen Public Areas & Initiatives V1",
      "path": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md",
      "text": "# Civizen Public Areas & Initiatives V1 **Status: Working Product Specification** **Working Draft 0.1** This is a **platform product specification**. It is **not** institutional reading-path item 8 and is **not** published as a primary `/documents` page. A **minimal public read-only V1** now exists at `/areas` and `/areas/:slug`. It does **not** include an `/initiatives` catalog, partner matching, contribution matching, initiative schema, or taxonomy editors. Do not expand those from this document without a separate implementation task. Live `PILLARS` remain controlling. Do not migrate product pillars. See **Implementation note (V1)** at the end of this document.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md#1",
      "title": "Civizen Public Areas & Initiatives V1",
      "path": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md",
      "text": "**Related:** [Areas, Domains & Participation Framework](../../institutional/areas-domains-participation-framework.md) \xB7 [Pilot Framework](../../institutional/pilot-framework.md) \xB7 [Stakeholder & Partnership Framework](../../institutional/stakeholder-partnership-framework.md) \xB7 [Contributor Framework](../../institutional/contributor-framework.md) \xB7 [Model Evolution Architecture](../model-evolution/shared-classification-and-model-evolution-architecture.md) \xB7 [Classification Registry V1](../model-evolution/shared-classification-registry-v1.md) \xB7 [Contribute page](../../04-operations/dev/contribute-page.md) \xB7 [Information architecture and content standards](../product-design/information-architecture-and-content-standards.md) \xB7 public [`international-partnerships-and-chapters.md`](../../02-policies/institutional/international-partnerships-and-chapters.md) (`/partners`)",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md#2",
      "title": "Core Principle",
      "path": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md",
      "text": "## Core Principle > **Simple by default. Detailed by choice.** People should be able to understand what Civizen is working on, where help is needed, and how they can participate without first reading extensive institutional, governance, technical, or legal documentation. Detailed information should remain available for those who need or want it. --- # 1. Purpose The Areas & Initiatives experience should provide a simple public answer to four questions: 1. **What is Civizen working on?** 2. **Why does it matter?** 3. **What is already happening or being proposed?** 4. **How can I or my organization participate?** It should become one of Civizen's primary public participation and partnership entry points. --- # 2. Public Structure The first public structure should remain simple:",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md#3",
      "title": "Core Principle",
      "path": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md",
      "text": "**Areas** \u2192 **Initiatives / Pilots** \u2192 **What is needed** \u2192 **Partner or Contribute** Detailed methodology, governance, research, metrics, institutional architecture, and technical documentation should be available progressively rather than shown by default. --- # 3. Areas Landing Page Recommended route: `/areas` The page should provide: - a short explanation of Areas; - a list of current Areas; - visible active/proposed initiative counts where useful; - a simple way to enter each Area. The page should not contain extensive framework text. Example:",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md#4",
      "title": "Health",
      "path": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md",
      "text": "## Health Improving the systems that support human health and wellbeing. **3 initiatives** [Explore Health] ---",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md#5",
      "title": "Education",
      "path": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md",
      "text": "## Education Improving how people learn, develop skills, and share knowledge. **4 initiatives** [Explore Education] --- The exact Area model may evolve over time. The public page should therefore derive Areas from structured data rather than permanently hard-coding today's classifications where practical. --- # 4. Area Detail Page Recommended route pattern: `/areas/:area` An Area page should contain approximately: ### Area introduction One short paragraph describing the purpose of the Area. ### Current work Cards for relevant: - initiatives; - pilots; - programs; - projects where appropriate. ### What we need Simple summary of currently needed: - partners; - contributors; - expertise; - funding; - technology; - research; - implementation support. ### Participate Clear calls to action. Possible actions:",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md#6",
      "title": "Education",
      "path": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md",
      "text": "- **Partner with Civizen** - **Contribute** - **Explore initiatives** ### Learn More Optional links to deeper: - philosophy; - research; - governance; - institutional documentation; - pilot methodology. Deep reference material should not dominate the initial page. --- # 5. Initiative An **Initiative** should be the primary public-facing work object. It is broad enough to contain: - research; - projects; - pilots; - working groups; - development; - and eventual programs. The public does not need to understand the internal distinction between every project type before engaging. Where useful, the initiative can show whether a specific Pilot exists within it. --- # 6. Initiative Card Each public initiative card should be understandable in seconds. Recommended fields: ### Title Clear human-readable name. ### Short purpose",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md#7",
      "title": "Education",
      "path": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md",
      "text": "One or two sentences. ### Area Relevant Area or Areas. ### Status One simple current status. ### Needs A short list of what is currently required. ### Actions - **Explore** - **Partner** - **Contribute** Do not place extensive technical or governance information directly on the card. --- # 7. Initiative Status Keep the public status vocabulary small. Recommended V1 statuses: - **Proposed** - **In Development** - **Seeking Contributors** - **Seeking Partners** - **Seeking Funding** - **Pilot Ready** - **Active** - **Evaluation** - **Validated** - **Paused** - **Completed** An initiative may technically satisfy several conditions at once, but the public UI should emphasize the most useful current status. Additional needs can appear separately. --- # 8. Initiative Detail Page Recommended route pattern:",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md#8",
      "title": "Routes",
      "path": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md",
      "text": "## Routes | Route | Access | Page | | --- | --- | --- | | `/areas` | Public | `src/pages/Areas.tsx` | | `/areas/:slug` | Public | `src/pages/AreaDetail.tsx` | Slugs are Area `code` values from the current foundational registry: `health`, `education`, `culture`, `responsibility`, `environment`. Unknown slugs show a calm not-found state with a link back to `/areas`.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md#9",
      "title": "Area data source",
      "path": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md",
      "text": "## Area data source Current Area names, order, and slugs: `listCurrentAreas()` in `src/lib/classification/` (`foundational_areas.v1`). Not used as the Area list: live product `PILLARS` (`src/lib/constants.ts`) and `product_pillars.v1`.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md#10",
      "title": "Curated-content source",
      "path": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md",
      "text": "## Curated-content source Single file: `src/lib/areas/public-areas-content.ts` Join helpers: `src/lib/areas/public-areas.ts` Replace this later with a structured Initiative model. Do not scatter initiative definitions across components.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md#11",
      "title": "Status handling",
      "path": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md",
      "text": "## Status handling Human-readable labels via `areas.status.*` i18n. V1 uses **In Development** for Governance Solutions only. **Seeking Funding** is defined but unused \u2014 not approved for public funding outreach. Internal P0\u2013P6 codes are not shown.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md#12",
      "title": "Partner routing",
      "path": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md",
      "text": "## Partner routing **Partner with us** \u2192 `/fund/institutional?area=:slug` and, for an initiative, `&initiative=:id`. `FundingInterestForm` prefills the message when `lane === 'institutional'`. No new form or CRM.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md#13",
      "title": "Contribute routing",
      "path": "docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md",
      "text": "## Contribute routing **Contribute** \u2192 `/contribute` (existing hub; sign-in gated). No new contribution engine. No placeholder-lane deep links in V1.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md#0",
      "title": "Product Architecture and Implementation Specification",
      "path": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md",
      "text": "## Product Architecture and Implementation Specification **Status:** Implemented (Happiness Foundation through Human Outcome & System Learning Loop). **Scope:** Happiness & Human Fulfillment, including Work Fulfillment & Occupational Fit, privacy-safe aggregates, Wellbeing Insights, and Human Outcome Reviews. **Parent capability:** Happiness & Human Fulfillment **Distinct subunit:** Work Fulfillment & Occupational Fit **Out of scope here:** public city/country rankings, organization league tables, employee ranking, sensitive-demographic dashboards, automatic Challenges/Governance, causal effectiveness claims, Happiness impact scores. ---",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md#1",
      "title": "1. Purpose",
      "path": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md",
      "text": "## 1. Purpose Civizen should not treat happiness as a decorative metric or a public score. The purpose of the Happiness & Human Fulfillment capability is to help people understand how well their lives are going, identify the conditions that are increasing or reducing their wellbeing, and connect them with practical ways to improve those conditions. The system should answer four questions: 1. **How am I doing?** 2. **What is affecting how I am doing?** 3. **What can improve it?** 4. **Did the change actually help?** The system should be private by default, simple by default, and actionable rather than merely descriptive. ---",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md#2",
      "title": "2. Architectural Decision",
      "path": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md",
      "text": "## 2. Architectural Decision Create: ### Happiness & Human Fulfillment The parent unit responsible for: - personal happiness and wellbeing monitoring; - life-domain assessment; - trend detection; - root-cause identification; - personalized improvement support; - follow-up and outcome measurement; - privacy-protected population insights. Within it, create a distinct subunit: ### Work Fulfillment & Occupational Fit Responsible for: - current-work satisfaction; - task-level enjoyment and frustration; - occupational fit; - workplace/environment fit; - role redesign; - career exploration; - trial opportunities; - learning/reskilling pathways; - work-transition support; - post-transition follow-up. Work Fulfillment contributes to the broader Happiness Profile, but it must retain its own data model, assessments, recommendations, intervention workflows, and longitudinal outcomes. ---",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md#3",
      "title": "Implementation Status",
      "path": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md",
      "text": "## Implementation Status This document is the architecture of the **current implemented system**. Later numbered sections that mention Phase 1\u20135 are build history \u2014 how the capability was assembled \u2014 not a member-facing product roadmap. There is no Phase 6 and no next feature phase planned from this document. Future change should come from pilot evidence, privacy/security findings, research requirements, or integration needs. ### Implemented",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md#4",
      "title": "Implementation Status",
      "path": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md",
      "text": "- Happiness Foundation \u2014 Implemented (adaptive check-in: multiple areas, supports vs problems, specific causes; today\u2019s feeling stays distinct from Happiness & Fulfillment level) - Work Fulfillment & Occupational Fit \u2014 Implemented - Active Human Fulfillment Support \u2014 Implemented - Privacy-Safe Wellbeing Intelligence \u2014 Implemented - Institutional & Community Wellbeing Insights \u2014 Implemented - Human Outcome & System Learning Loop \u2014 Implemented ### Intentionally deferred",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md#5",
      "title": "Implementation Status",
      "path": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md",
      "text": "- formal scientific evaluation / experimental research design - live notification delivery (follow-up timing can be stored) - broad Fulfillment Plan sharing - provider marketplace - sensitive-demographic research breakdowns - population-informed personal recommendations - city/country or organization league tables - public Happiness profiles - causal effectiveness claims and Happiness impact scores Live aggregate thresholds are the versioned policy `wellbeing-aggregate-privacy-v1`. Compatibility tables and operator notes are in **\xA725**. ### Public-safe vs internet-public",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md#6",
      "title": "3. Do Not Use a Public Numeric Happiness Score",
      "path": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md",
      "text": "## 3. Do Not Use a Public Numeric Happiness Score Civizen should **not show people a 0\u2013100 happiness score**. Instead, expose a five-level model. ### Recommended five public levels 1. **Struggling** - Wellbeing appears substantially under pressure. - The interface should be supportive and practical, not alarming or judgmental. 2. **Unsettled** - Important parts of life are not working well or feel unstable. - The system should help identify the main sources. 3. **Balanced** - Overall life experience is mixed but reasonably stable. - Some areas are going well, while others may need attention. 4. **Flourishing** - Most important areas of life are going well. - The person reports generally positive wellbeing, meaning, and stability.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md#7",
      "title": "3. Do Not Use a Public Numeric Happiness Score",
      "path": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md",
      "text": "5. **Thriving** - Wellbeing is consistently strong across major areas of life. - The person reports high life satisfaction, positive functioning, and strong fulfillment. ### Important rule These are **states, not identities**. Never write: - \u201CYou are Struggling.\u201D - \u201CYou are a Thriving person.\u201D Prefer: - \u201CYour current happiness level is Struggling.\u201D - \u201CYour recent wellbeing appears to be Flourishing.\u201D - \u201CYour level has moved from Balanced to Flourishing.\u201D ### Internal measurement The system may retain higher-resolution internal values for: - aggregation; - trend detection; - confidence estimates; - change detection; - research; - threshold mapping. These internal values must not be presented as a person's public or reputational \u201Chappiness score.\u201D ---",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md#8",
      "title": "4. Happiness Profile",
      "path": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md",
      "text": "## 4. Happiness Profile The Happiness Profile should remain multidimensional even though the primary public result uses five levels. ### Core domains 1. **Life Satisfaction** 2. **Emotional Wellbeing** 3. **Meaning & Purpose** 4. **Relationships & Belonging** 5. **Health & Vitality** 6. **Autonomy & Freedom** 7. **Security & Stability** 8. **Time & Life Balance** 9. **Environment & Community** 10. **Work / Occupation Fulfillment** Each domain should also use human-readable levels rather than public numeric scoring where practical. Example: - Life Satisfaction \u2014 Flourishing - Relationships \u2014 Thriving - Health & Vitality \u2014 Balanced - Time & Life Balance \u2014 Unsettled - Work Fulfillment \u2014 Struggling This is more useful than a single composite number because Civizen can identify what is actually driving the person's experience. ---",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md#9",
      "title": "5. Happiness Level Derivation",
      "path": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md",
      "text": "## 5. Happiness Level Derivation Do not hard-code a simplistic arithmetic average and present it as scientific truth. Use a versioned calculation framework. The current working model is **`happiness-level-v1`**. It can be replaced by a later version. Historic snapshots store `model_version` so a later formula does not silently rewrite those records. Do not describe this model as scientifically final. ### Working derivation The system may internally normalize answers into a fine-grained scale and derive: - each domain state; - overall state; - recent direction; - confidence / data sufficiency. ### Overall level should consider",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md#10",
      "title": "5. Happiness Level Derivation",
      "path": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md",
      "text": "- life evaluation; - recent emotional experience; - meaning / purpose; - important life-domain satisfaction; - severity of strongly negative domains; - consistency across recent observations; - recency of observations. ### Important behavior One highly distressed domain should not always disappear inside a positive average. Example: - most domains Flourishing; - Work Fulfillment Struggling; - Time Balance Struggling. The system might still classify the overall person as Balanced or Flourishing depending on the evidence, but it must prominently identify the two high-priority areas. ### Versioning Store a `model_version` or equivalent so calculation changes do not silently reinterpret historic records. ---",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md#11",
      "title": "6. Trends Without Numeric Scores",
      "path": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md",
      "text": "## 6. Trends Without Numeric Scores Trend should be shown through: - **Improving** - **Stable** - **Declining** Optionally: - \u201CImproving for 3 weeks\u201D - \u201CRecently moved from Balanced to Flourishing\u201D - \u201CWork Fulfillment has declined recently\u201D Do not expose unnecessary decimal precision. ---",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md#12",
      "title": "7. Measurement System",
      "path": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md",
      "text": "## 7. Measurement System Use multiple levels of participation so the system does not create survey fatigue. ### 7.1 Quick Check-in Purpose: - very low-friction monitoring of **today\u2019s feeling**; - identify what is supporting or reducing happiness, not only one broad area; - collect specific, reusable causes so Improve, Work Fulfillment, and Plans can act. Today\u2019s feeling is **not** the member\u2019s Happiness & Fulfillment level. The five-level Happiness state continues to come from the versioned derivation (reviews, pulses, accumulated check-in evidence, Work Fulfillment). A check-in must not collapse to a label such as \u201CBalanced + Work.\u201D The flow is short by default. Today\u2019s feeling and optional life areas share the first screen. Deeper questions appear only after the member selects areas.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md#13",
      "title": "7. Measurement System",
      "path": "docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md",
      "text": "1. **How are you feeling today?** (required) and **What\u2019s affecting this today?** (optional, multi-select) on the first Check in page \u2014 Very difficult / Difficult / Okay / Good / Very good, then the existing life areas (Work, Health, Relationships, Money / security, Family, Time, Environment, Purpose, Something else). Members may choose more than one area, or save a feeling only. 2. **For each selected area:** is it mostly helping, making things harder, or both? 3. **Concise follow-up tags** only when needed \u2014 the existing cause-tag taxonomy for problems, and a small support-tag list in the same cause groups. Skip is always allowed. Environment and Something else stay area-level only. 4. **Optional note.** If Work is a problem, a compact link to Work Fulfillment is enough; do not run a second work assessment inside check-in.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md#0",
      "title": "Civizen Score Tiers: Complete Design and Implementation Specification",
      "path": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md",
      "text": "# Civizen Score Tiers: Complete Design and Implementation Specification",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md#1",
      "title": "1. Purpose",
      "path": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md",
      "text": "## 1. Purpose This document defines the complete tier system to be added to the Civizen Score experience. The tier system is intended to: - make progress easier to understand, - provide meaningful milestones, - encourage verified participation and contribution, - recognize sustained reliability and impact, - avoid reducing a person to a numerical score, - avoid turning Civizen into a popularity contest, loyalty program, or social caste system. The tier system must work together with the existing five Civizen Score categories: 1. Learning 2. Experience 3. Skills 4. Performance 5. Contributions",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md#2",
      "title": "1. Purpose",
      "path": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md",
      "text": "These five categories are the **current Score model** (see [`civizen-score-page-reorganization.md`](./civizen-score-page-reorganization.md)). They are not permanently immutable. Model evolution: [`../model-evolution/shared-classification-and-model-evolution-architecture.md`](../model-evolution/shared-classification-and-model-evolution-architecture.md). Do not change live score categories, weights, calculations, or tiers from this documentation task. The tier must be derived from the overall Civizen Score, but higher tiers must also require minimum supporting conditions so that a user cannot reach a high tier through education, experience, or self-declared information alone. ---",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md#3",
      "title": "2. Final Approved Tier Names",
      "path": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md",
      "text": "## 2. Final Approved Tier Names Use the following five tier names exactly: ```text Explorer Builder Contributor Catalyst Steward ``` The progression is: ```text Explore \u2192 Build \u2192 Contribute \u2192 Catalyze \u2192 Steward ``` Use these names consistently across: - the Home page, - the Civizen Score details page, - profile summaries, - badges, - achievement notifications, - tooltips, - accessibility labels, - score history, - API responses, - analytics, - future governance and eligibility rules. Do not use names such as Beginner, Bronze, Silver, Gold, Elite, Master, Legend, Authority, Influencer, Leader, World Citizen, or Citizen. Every person using Civizen is already a Civizen. The tier must not determine whether someone qualifies as a citizen of humanity. ---",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md#4",
      "title": "3. Final Score Thresholds",
      "path": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md",
      "text": "## 3. Final Score Thresholds Use the following score ranges: | Civizen Score | Tier | |---:|---| | 0.0\u201329.9 | Explorer | | 30.0\u201359.9 | Builder | | 60.0\u201374.9 | Contributor | | 75.0\u201384.9 | Catalyst | | 85.0\u2013100.0 | Steward | Use inclusive lower bounds and exclusive upper bounds, except for the final tier. Recommended implementation logic: ```ts function getBaseTier(score: number): CivizenTier { if (score >= 85) return 'steward'; if (score >= 75) return 'catalyst'; if (score >= 60) return 'contributor'; if (score >= 30) return 'builder'; return 'explorer'; } ``` ### Important `Not yet scored` is not a tier. It is a separate score state for users who do not yet have sufficient data to calculate a meaningful Civizen Score. ### Score thresholds are necessary but not sufficient (v1.1.0)",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md#5",
      "title": "3. Final Score Thresholds",
      "path": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md",
      "text": "`TIER_RULES_VERSION = '1.1.0'` in `src/lib/civizen-score-tiers.ts`. Named score ranges above still define the **base** tier from the numerical estimate. Advancement also requires independent verified evidence, category coverage, history/recurrence, and confidence gates. Constants live in `TIER_EVIDENCE_GATES` (`src/lib/civizen-score-model.ts`). Do not show \u201CN points to {next tier}\u201D unless the non-score readiness gates for that next tier are already met. Otherwise show **{tier} readiness** and the blocking gates. A sparse profile must not become Builder or Contributor merely because a small-sample estimate crossed a score threshold. When `overallStatus` is present and is not `established`, a provisional estimate cannot unlock any tier above Explorer. ---",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md#6",
      "title": "4.1 Explorer",
      "path": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md",
      "text": "## 4.1 Explorer ### Score range ```text 0.0\u201329.9 ``` ### Meaning The user is beginning the Civizen journey, establishing a profile, adding information, learning how the ecosystem works, and starting to participate. ### Typical characteristics - profile is incomplete or newly created, - some Learning, Experience, or Skills data may exist, - few or no verified assignments, - few or no verified contributions, - limited evidence, - low or insufficient score confidence. ### Suggested description > You are beginning your Civizen journey. Add verified learning, experience, skills, assignments, and contributions to build a stronger profile. ### Suggested actions - complete profile information, - add education or qualifications, - add experience, - add skills, - provide evidence, - complete an introductory activity, - record a first contribution, - request a contextual endorsement. ---",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md#7",
      "title": "4.2 Builder",
      "path": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md",
      "text": "## 4.2 Builder ### Score range ```text 30.0\u201359.9 ``` ### Meaning The user is actively building a credible record of learning, experience, skills, performance, and contribution. ### Typical characteristics - profile contains meaningful information, - at least one verified activity exists, - some category scores are established, - user is participating in assignments or contributions, - reliability history is beginning to form, - score confidence is still developing. ### Suggested description > You are building a demonstrated record of capability, reliability, and participation across Civizen. ### Suggested actions - verify qualifications, - complete more assignments, - add evidence for skills, - improve on-time completion, - record contribution outcomes, - request contextual ratings, - strengthen lower-scoring categories. ---",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md#8",
      "title": "4.3 Contributor",
      "path": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md",
      "text": "## 4.3 Contributor ### Score range ```text 60.0\u201374.9 ``` ### Meaning The user consistently creates meaningful, verified value and demonstrates reliable participation. ### Typical characteristics - strong profile completion, - meaningful verified contributions, - solid assignment performance, - demonstrated skills, - moderate or higher score confidence, - consistent activity, - contextual ratings or validation. ### Suggested description > You consistently create verified value and demonstrate reliable participation in the Civizen ecosystem. ### Additional qualification requirements Recommended initial requirements: ```text Overall score: 60.0\u201374.9 Performance score: at least 50 Contributions score: at least 50 Score confidence: Moderate or higher Verified activity: required ``` ---",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md#9",
      "title": "4.4 Catalyst",
      "path": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md",
      "text": "## 4.4 Catalyst ### Score range ```text 75.0\u201384.9 ``` ### Meaning The user produces broader impact, enables the progress of others, helps initiatives succeed, and demonstrates sustained reliability. ### Typical characteristics - strong Performance score, - strong Contributions score, - high-quality verified activity, - sustained participation over time, - positive effect beyond individual tasks, - mentoring, collaboration, initiative support, or measurable wider impact, - high score confidence. ### Suggested description > You help people and initiatives move forward through sustained contribution, collaboration, and measurable impact. ### Additional qualification requirements Recommended initial requirements:",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md#10",
      "title": "4.4 Catalyst",
      "path": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md",
      "text": "```text Overall score: 75.0\u201384.9 Performance score: at least 65 Contributions score: at least 65 Score confidence: High or higher Sustained verified activity: required No unresolved serious integrity issue ``` ---",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md#11",
      "title": "4.5 Steward",
      "path": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md",
      "text": "## 4.5 Steward ### Score range ```text 85.0\u2013100.0 ``` ### Meaning The user demonstrates exceptional and sustained contribution, reliability, judgment, responsibility, and care for the Civizen ecosystem and its public-interest mission. ### Typical characteristics - consistently high Performance, - consistently high Contributions, - substantial verified impact, - strong contextual ratings, - demonstrated judgment, - sustained activity, - high or very high score confidence, - no unresolved serious integrity concerns. ### Suggested description > You demonstrate sustained responsibility, trusted contribution, and exceptional care for the Civizen ecosystem and its mission. ### Additional qualification requirements Recommended initial requirements:",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md#12",
      "title": "4.5 Steward",
      "path": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md",
      "text": "```text Overall score: 85.0\u2013100.0 Performance score: at least 75 Contributions score: at least 75 Score confidence: High or Very High Substantial verified impact: required No unresolved serious integrity issue ``` ### Important restriction Steward tier must not automatically grant: - governance power, - moderation authority, - verification authority, - financial rewards, - employment, - leadership status, - control over other users. Steward tier may establish eligibility for such roles, but actual appointment must follow separate role-specific rules, suitability checks, consent, safeguards, and governance procedures. ---",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md#13",
      "title": "5. Tier Qualification Logic",
      "path": "docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md",
      "text": "## 5. Tier Qualification Logic The final tier must be determined in two stages. ### Stage 1: Base tier by overall score The overall score determines the highest possible tier. ### Stage 2: Qualification checks The system checks whether the user satisfies the additional requirements for that tier. If the user does not satisfy the requirements, assign the highest tier for which all requirements are met. Example: ```text Overall score: 78 Base tier by score: Catalyst Performance: 61 Contributions: 68 Confidence: High Final tier: Contributor Reason: Performance must reach 65 for Catalyst. ``` Recommended logic: ```ts function determineFinalTier(input: TierQualificationInput): TierResult { const baseTier = getBaseTier(input.overallScore);",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/governance/civizen-community-governance-charter.md#0",
      "title": "1. Scope",
      "path": "docs/02-policies/governance/civizen-community-governance-charter.md",
      "text": "## 1. Scope This Charter governs community participation, proposals, advisory voting, delegated platform decisions, protocol development, review, and internal civic status within Civizen. It is not the articles, bylaws, operating agreement, shareholder agreement, or legal constitution of an organization or government.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/governance/civizen-community-governance-charter.md#1",
      "title": "2. Authority Hierarchy",
      "path": "docs/02-policies/governance/civizen-community-governance-charter.md",
      "text": "## 2. Authority Hierarchy Where documents conflict, the following order applies: 1. Applicable law and binding legal obligations 2. Governing documents and lawful decisions of the relevant legal entity 3. Binding contracts and funding restrictions 4. Adopted institutional policies 5. This Community Governance Charter 6. Protocol and technical governance procedures 7. Community proposals, votes, customs, and advisory opinions 8. AI-generated analysis and recommendations No lower level may override a higher level.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/governance/civizen-community-governance-charter.md#2",
      "title": "3. Participation",
      "path": "docs/02-policies/governance/civizen-community-governance-charter.md",
      "text": "## 3. Participation Civizen may recognize participation statuses based on registration, verification, conduct, contribution, training, or other published requirements. Under this current Charter, status within Civizen does not by itself create government-recognized legal citizenship or public authority outside Civizen.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/governance/civizen-community-governance-charter.md#3",
      "title": "4. Proposal Rights",
      "path": "docs/02-policies/governance/civizen-community-governance-charter.md",
      "text": "## 4. Proposal Rights Eligible participants may submit proposals within the categories and procedures made available by the platform. A proposal must identify: - its purpose, - its scope, - the requested decision, - affected parties, - implementation responsibility, - financial or data implications, - conflicts, - and the authority required for implementation.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/governance/civizen-community-governance-charter.md#4",
      "title": "5. Voting",
      "path": "docs/02-policies/governance/civizen-community-governance-charter.md",
      "text": "## 5. Voting Voting may be advisory or binding only within a scope expressly delegated by authorized human governance. Token ownership, financial support, or wealth alone does not create community voting authority. Voting procedures must disclose: - eligibility, - quorum, - timing, - vote options, - weighting, if any, - conflicts, - finalization rules, - and implementation authority.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/governance/civizen-community-governance-charter.md#5",
      "title": "6. Founder Bootstrap Role",
      "path": "docs/02-policies/governance/civizen-community-governance-charter.md",
      "text": "## 6. Founder Bootstrap Role During the bootstrap stage, the founder may initiate, administer, and implement community and technical processes needed to establish the platform. Founder recognition is permanent as historical attribution. Founder operational authority is transitional and subject to law, adopted governance, conflicts, security, and continuity requirements.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/governance/civizen-community-governance-charter.md#6",
      "title": "7. Community Bodies",
      "path": "docs/02-policies/governance/civizen-community-governance-charter.md",
      "text": "## 7. Community Bodies Civizen may establish community assemblies, contributor councils, technical maintainers, specialist councils, ethics groups, review panels, and other participatory bodies. These bodies have only the authority expressly delegated to them.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/governance/civizen-community-governance-charter.md#7",
      "title": "8. Conflicts",
      "path": "docs/02-policies/governance/civizen-community-governance-charter.md",
      "text": "## 8. Conflicts Participants must disclose material financial, professional, organizational, family, political, or personal interests that could affect a governance decision. A conflicted participant may be required to abstain, recuse, or have their vote or decision reviewed.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/governance/civizen-community-governance-charter.md#8",
      "title": "9. Due Process",
      "path": "docs/02-policies/governance/civizen-community-governance-charter.md",
      "text": "## 9. Due Process Material restrictions, sanctions, verification decisions, or removal of delegated authority should include notice, reason, evidence, proportionality, and review or appeal where appropriate.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/governance/civizen-community-governance-charter.md#9",
      "title": "10. Emergency Action",
      "path": "docs/02-policies/governance/civizen-community-governance-charter.md",
      "text": "## 10. Emergency Action Emergency action must be: - necessary, - limited in scope, - time-bounded, - logged, - attributable to an authorized human, - reviewable, - and followed by a public or protected report appropriate to the incident. AI cannot authorize emergency action.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/governance/civizen-community-governance-charter.md#10",
      "title": "11. Technical Governance",
      "path": "docs/02-policies/governance/civizen-community-governance-charter.md",
      "text": "## 11. Technical Governance Protocol and software changes must use documented review, testing, security, release, rollback, and audit procedures. Technical decentralization does not remove legal responsibility for services operated by an identifiable entity.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/funding-and-financial-integrity.md#0",
      "title": "Purpose",
      "path": "docs/02-policies/institutional/funding-and-financial-integrity.md",
      "text": "## Purpose Mature Humanity and Civizen may be supported through lawful public-interest, institutional, philanthropic, earned-revenue, and commercial pathways. Every financial relationship must be identified, documented, classified, and used according to its actual legal and contractual character.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/funding-and-financial-integrity.md#1",
      "title": "Funding Classes",
      "path": "docs/02-policies/institutional/funding-and-financial-integrity.md",
      "text": "## Funding Classes ### Philanthropic Support Gifts and donations support the mission without creating ownership, repayment, profit participation, investment status, or control. No contribution is represented as tax-deductible unless it is received by an authorized tax-exempt entity or fiscal sponsor that issues the applicable receipt. ### Grants and Government Funding Grant and government funds are used only for authorized purposes, costs, deliverables, and reporting obligations. Restricted funds are not available for investor returns or unrelated private distributions. ### Institutional Partnerships and Sponsorships Partnership and sponsorship funds are governed by written agreements.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/funding-and-financial-integrity.md#2",
      "title": "Funding Classes",
      "path": "docs/02-policies/institutional/funding-and-financial-integrity.md",
      "text": "A sponsor does not acquire authority over research findings, community data, editorial positions, governance, or the mission unless a lawful and publicly disclosed relationship expressly provides a limited role. ### Earned Revenue Mission-related services, education, research, events, licensing, subscriptions, and other earned activities may support operations when properly authorized and recorded. ### Investment Capital Investment capital, if ever accepted, must be received only through a separately identified, legally authorized commercial entity or financing vehicle and under professionally prepared transaction documents. Investors do not acquire rights to donations, restricted grants, charitable assets, the Mature Humanity mission, community data, or the legal governance of a mission-stewarding organization.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/funding-and-financial-integrity.md#3",
      "title": "Funding Classes",
      "path": "docs/02-policies/institutional/funding-and-financial-integrity.md",
      "text": "### Contributor Compensation Employees, contractors, fellows, service providers, and approved contributors may be compensated under budgets, employment arrangements, contracts, grants, bounties, or other written programs. Participation in the platform does not create an automatic claim on revenue or a fixed share of proceeds.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/funding-and-financial-integrity.md#4",
      "title": "No Current Public Offering",
      "path": "docs/02-policies/institutional/funding-and-financial-integrity.md",
      "text": "## No Current Public Offering Civizen\u2019s public funding pages collect inquiries and expressions of interest only. They do not: - process investment payments, - issue securities, - reserve an allocation, - establish valuation, - state investment terms, - promise returns, - guarantee repayment, - create investor status, - or create a binding agreement.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/funding-and-financial-integrity.md#5",
      "title": "No Fixed Public Distribution Formula",
      "path": "docs/02-policies/institutional/funding-and-financial-integrity.md",
      "text": "## No Fixed Public Distribution Formula Civizen does not publish or promise a fixed percentage of all income, grants, donations, investment capital, or commercial revenue to investors, contributors, founders, or other private persons. Payments and distributions, if any, must arise from lawful written arrangements, approved budgets, applicable restrictions, and authoritative accounting records.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/funding-and-financial-integrity.md#6",
      "title": "Separation and Recordkeeping",
      "path": "docs/02-policies/institutional/funding-and-financial-integrity.md",
      "text": "## Separation and Recordkeeping Funds must be separately classified and tracked according to: - source, - legal recipient, - amount and currency, - date, - restrictions, - agreement, - intended use, - approval, - accounting treatment, - reporting requirements, - and disposition. The public application ledger is not a substitute for bank records, contracts, accounting books, tax filings, grant records, or an independent audit.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/funding-and-financial-integrity.md#7",
      "title": "Independence",
      "path": "docs/02-policies/institutional/funding-and-financial-integrity.md",
      "text": "## Independence No financial supporter may require Civizen to: - conceal a material conflict, - misstate research or impact, - provide improper access to user data, - discriminate unlawfully, - engage in partisan campaign activity, - evade sanctions or financial controls, - divert restricted funds, - or surrender the mission.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/funding-and-financial-integrity.md#8",
      "title": "Public Reporting",
      "path": "docs/02-policies/institutional/funding-and-financial-integrity.md",
      "text": "## Public Reporting When authoritative financial activity exists, public reporting may include: - funds received by class, - material restrictions, - program and operating uses, - major institutional funders where disclosure is lawful, - related-party transactions, - executive compensation process, - reserves, - independent review or audit status, - and corrections to prior reports. Personal, banking, wallet, tax, due diligence, and security information remains protected.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/current-legal-status-notice.md#0",
      "title": "Current Legal Status",
      "path": "docs/02-policies/institutional/current-legal-status-notice.md",
      "text": "# Current Legal Status Mature Humanity is the philosophy, body of work, and public-interest mission from which Civizen was developed. Civizen is the web and mobile platform being built to support that mission. At this stage, Mature Humanity and Civizen are founder-led initiatives and are not yet represented as being operated by a dedicated nonprofit organization, charitable foundation, public benefit corporation, or other project-specific legal entity. Until an authorized entity or fiscal sponsor is publicly identified:",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/current-legal-status-notice.md#1",
      "title": "Current Legal Status",
      "path": "docs/02-policies/institutional/current-legal-status-notice.md",
      "text": "- Civizen does not represent that financial support is tax-deductible. - Civizen does not offer securities or investment interests through the website or application. - Civizen does not accept investment payments through public interest forms. - Submission of a funding, partnership, or contributor inquiry does not create a contract, ownership right, repayment right, profit right, governance right, employment relationship, or entitlement to compensation. - At the current stage, participation in Civizen does not by itself create a government-recognized nationality, immigration status, government identification, or legal citizenship outside the platform. - Current community votes and proposals exercise only the authority presently delegated within Civizen. They do not by themselves exercise governmental authority or replace public-law processes.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/current-legal-status-notice.md#2",
      "title": "Current Legal Status",
      "path": "docs/02-policies/institutional/current-legal-status-notice.md",
      "text": "Any future legal entity, fiscal sponsor, charitable status, commercial company, or authorized funding vehicle will be identified by its full legal name, jurisdiction, registration details, role, and applicable terms before it receives funds or enters binding arrangements on behalf of the initiative.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/current-legal-status-notice.md#3",
      "title": "Long-Term Institutional Aim",
      "path": "docs/02-policies/institutional/current-legal-status-notice.md",
      "text": "## Long-Term Institutional Aim This present legal-status notice does not limit Civizen's long-term mission. Civizen seeks to build broad participation, trusted institutions, democratic legitimacy, and lawful pathways through which recognized planetary citizenship and shared human civic structures may later be considered and established by legitimately authorized participants and institutions. The most current status is published on this page.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/international-partnerships-and-chapters.md#0",
      "title": "International Partnerships and Chapters",
      "path": "docs/02-policies/institutional/international-partnerships-and-chapters.md",
      "text": "# International Partnerships and Chapters",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/international-partnerships-and-chapters.md#1",
      "title": "Purpose",
      "path": "docs/02-policies/institutional/international-partnerships-and-chapters.md",
      "text": "## Purpose Mature Humanity and Civizen may work internationally through universities, nonprofit organizations, research institutions, companies, public institutions, community groups, fiscal sponsors, and authorized local chapters or affiliates. Partnerships with governments and international institutions may support research and lawful development of future planetary-citizenship arrangements, without allowing any one partner to capture the mission.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/international-partnerships-and-chapters.md#2",
      "title": "Authorization",
      "path": "docs/02-policies/institutional/international-partnerships-and-chapters.md",
      "text": "## Authorization No person or group may represent itself as an official Civizen chapter, affiliate, office, representative, or agent without written authorization. Authorized relationships must identify: - the parties, - the territory or program, - the scope of authority, - brand permissions, - financial authority, - data responsibilities, - reporting, - duration, - termination, - and applicable law.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/international-partnerships-and-chapters.md#3",
      "title": "No Automatic Agency",
      "path": "docs/02-policies/institutional/international-partnerships-and-chapters.md",
      "text": "## No Automatic Agency A local chapter, volunteer group, partner, or contributor may not: - bind the initiative to a contract, - receive funds in its name, - issue tax receipts, - hire personnel on its behalf, - make political endorsements, - access private data, - or claim official authority, unless that power is expressly granted in writing.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/international-partnerships-and-chapters.md#4",
      "title": "Local Compliance",
      "path": "docs/02-policies/institutional/international-partnerships-and-chapters.md",
      "text": "## Local Compliance Partners and chapters must comply with applicable local requirements involving: - registration, - employment, - tax, - fundraising, - charitable solicitation, - grants, - sanctions, - anti-corruption, - data protection, - safeguarding, - consumer protection, - and financial activity.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/international-partnerships-and-chapters.md#5",
      "title": "Mission and Independence",
      "path": "docs/02-policies/institutional/international-partnerships-and-chapters.md",
      "text": "## Mission and Independence Partners and chapters must preserve: - human dignity, - non-discrimination, - political independence, - financial integrity, - privacy, - transparency, - open-source principles where applicable, - and Civizen's current non-governmental legal status, long-term public-interest mission, independence, and commitment to legitimate institutional development.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/international-partnerships-and-chapters.md#6",
      "title": "Brand Protection",
      "path": "docs/02-policies/institutional/international-partnerships-and-chapters.md",
      "text": "## Brand Protection Use of the Civizen or Mature Humanity names and marks is limited, revocable, and subject to quality and mission standards. Authorization may be suspended or terminated for fraud, abuse, mission misrepresentation, political capture, financial misconduct, data misuse, security failure, or material violation of an agreement.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/international-partnerships-and-chapters.md#7",
      "title": "Public Directory",
      "path": "docs/02-policies/institutional/international-partnerships-and-chapters.md",
      "text": "## Public Directory Official chapters and affiliates should appear in a public directory identifying: - legal name, - country, - relationship type, - authorization status, - public contact, - and current program scope. Absence from the official directory means that official status has not been publicly verified.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/world-citizenship-and-civic-status-notice.md#0",
      "title": "World Citizenship: Present Status and Long-Term Aim",
      "path": "docs/02-policies/institutional/world-citizenship-and-civic-status-notice.md",
      "text": "# World Citizenship: Present Status and Long-Term Aim",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/world-citizenship-and-civic-status-notice.md#1",
      "title": "World Citizenship Today",
      "path": "docs/02-policies/institutional/world-citizenship-and-civic-status-notice.md",
      "text": "## World Citizenship Today Today, World Citizenship in Civizen is a voluntary civic identity and form of participation. It is not yet a government-recognized nationality, immigration status, passport, public-law citizenship, or government-issued identity document. At this stage, current Civizen credentials do not presently create: - nationality, - immigration status, - residency, - passports or visas, - government identification, - public-election voting rights, - diplomatic status, - public benefits, - or legal rights automatically enforceable outside Civizen. A Civizen profile, card, QR code, identifier, verification result, credential, or status is not, by itself and without separate lawful recognition, a government document. Civizen verification currently confirms only the platform-level facts and checks expressly described in the applicable verification process.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/world-citizenship-and-civic-status-notice.md#2",
      "title": "Long-Term Aim",
      "path": "docs/02-policies/institutional/world-citizenship-and-civic-status-notice.md",
      "text": "## Long-Term Aim Civizen's long-term purpose is to unite people around their shared humanity and help develop the democratic, institutional, technological, cultural, and legal foundations through which a broadly adopted and legitimately recognized form of planetary citizenship may one day become possible. Such recognition would require more than a software label or founder declaration. It would need broad voluntary participation, public trust, representative processes, appropriate safeguards, and lawful recognition through participating institutions, governments, international arrangements, or other legitimately authorized structures. The intended future is a complementary citizenship of humanity. It need not require people to abandon their national citizenship, culture, language, religion, or local identity.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/world-citizenship-and-civic-status-notice.md#3",
      "title": "Current Credential Safety",
      "path": "docs/02-policies/institutional/world-citizenship-and-civic-status-notice.md",
      "text": "## Current Credential Safety Civizen must not label an internally generated identifier as: - SSN, - Social Security Number, - passport number, - national ID, - government ID, - or another protected governmental identifier.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/02-policies/institutional/world-citizenship-and-civic-status-notice.md#4",
      "title": "Readiness",
      "path": "docs/02-policies/institutional/world-citizenship-and-civic-status-notice.md",
      "text": "## Readiness Program readiness and availability currently measure participation, integrity, and operational capacity within Civizen. They do not by themselves create a territorial mandate, public election result, legal jurisdiction, or governmental recognition. Over time, responsibly measured participation may help demonstrate social readiness for broader public and institutional consideration, but any formal recognition must follow legitimate democratic and lawful processes.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/recognized-planetary-citizenship-pathway.md#0",
      "title": "From Voluntary World Citizenship to Recognized Planetary Citizenship",
      "path": "docs/00-foundation/recognized-planetary-citizenship-pathway.md",
      "text": "# From Voluntary World Citizenship to Recognized Planetary Citizenship",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/recognized-planetary-citizenship-pathway.md#1",
      "title": "The purpose",
      "path": "docs/00-foundation/recognized-planetary-citizenship-pathway.md",
      "text": "## The purpose Humanity shares one planet and a common future. Civizen exists to help people unite around shared human responsibility. World citizenship is not merely a product label; it expresses a civic identity and a longer civilizational aim.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/recognized-planetary-citizenship-pathway.md#2",
      "title": "What exists today",
      "path": "docs/00-foundation/recognized-planetary-citizenship-pathway.md",
      "text": "## What exists today Today, Civizen offers a voluntary civic identity together with profiles, learning, contribution, governance, verification, and cooperation. Civizen does not currently claim statehood, nationality, territorial jurisdiction, or public-law citizenship.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/recognized-planetary-citizenship-pathway.md#3",
      "title": "Why voluntary participation comes first",
      "path": "docs/00-foundation/recognized-planetary-citizenship-pathway.md",
      "text": "## Why voluntary participation comes first Legitimacy cannot be declared by the founder or software alone. Trust must be earned through transparency, participation, safeguards, useful outcomes, and broad inclusion.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/recognized-planetary-citizenship-pathway.md#4",
      "title": "A staged pathway",
      "path": "docs/00-foundation/recognized-planetary-citizenship-pathway.md",
      "text": "## A staged pathway 1. **Stage 1:** Voluntary civic identity and shared principles. 2. **Stage 2:** Broad participation and verified community institutions. 3. **Stage 3:** Local and international partnerships, research, pilots, and public consultation. 4. **Stage 4:** Representative and democratic constitutional development. 5. **Stage 5:** Lawful recognition by participating public institutions, governments, international agreements, or newly authorized bodies. 6. **Stage 6:** Recognized planetary citizenship that complements existing citizenships and protects diversity.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/recognized-planetary-citizenship-pathway.md#5",
      "title": "What mass adoption means",
      "path": "docs/00-foundation/recognized-planetary-citizenship-pathway.md",
      "text": "## What mass adoption means Mass adoption establishes social relevance and democratic weight. It does not automatically create legal nationality or jurisdiction. It gives humanity and lawful institutions a credible basis for considering formal recognition.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/recognized-planetary-citizenship-pathway.md#6",
      "title": "Unity without uniformity",
      "path": "docs/00-foundation/recognized-planetary-citizenship-pathway.md",
      "text": "## Unity without uniformity National, cultural, linguistic, religious, and local identities remain valuable. Planetary citizenship should add a shared layer of responsibility and belonging.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/recognized-planetary-citizenship-pathway.md#7",
      "title": "Safeguards",
      "path": "docs/00-foundation/recognized-planetary-citizenship-pathway.md",
      "text": "## Safeguards - No unilateral founder declaration. - No coercion. - No automatic transfer of sovereignty. - No false passport or government-document claims. - Transparent constitutional development. - Meaningful representation, review, rights, accountability, and public consent.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/recognized-planetary-citizenship-pathway.md#8",
      "title": "Invitation",
      "path": "docs/00-foundation/recognized-planetary-citizenship-pathway.md",
      "text": "## Invitation People are invited to help shape whether and how recognized planetary citizenship should develop.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/the-civizen-charter.md#0",
      "title": "Civizen Mission Charter",
      "path": "docs/00-foundation/the-civizen-charter.md",
      "text": "# Civizen Mission Charter A concise public statement of Civizen\u2019s purpose, character, and invitation to cooperate.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/the-civizen-charter.md#1",
      "title": "Mission",
      "path": "docs/00-foundation/the-civizen-charter.md",
      "text": "## Mission Civizen is a voluntary civic and public-interest initiative that helps people develop more peaceful, responsible, cooperative, transparent, and sustainable ways of living and working together. It supports human dignity, peaceful cooperation, responsible stewardship, access to knowledge and opportunity, accountable institutions, open public-interest technology, cultural understanding, non-discrimination, and long-term thinking.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/the-civizen-charter.md#2",
      "title": "What Civizen Is Today",
      "path": "docs/00-foundation/the-civizen-charter.md",
      "text": "## What Civizen Is Today Civizen is not a government, state, political party, or sovereign authority. It does not claim territory, jurisdiction, police power, taxation authority, diplomatic recognition, or the power to replace national or local law. Participation is voluntary. Community rules apply only within the scope of the Civizen platform and its programs.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/the-civizen-charter.md#3",
      "title": "What Civizen Seeks to Become",
      "path": "docs/00-foundation/the-civizen-charter.md",
      "text": "## What Civizen Seeks to Become Civizen seeks to become a trusted civic foundation through which people can cooperate as citizens of humanity and progressively develop shared institutions capable of addressing humanity-wide concerns. Its long-term goal includes a legitimate path toward recognized planetary citizenship. That goal must be pursued through broad participation, democratic legitimacy, institutional safeguards, lawful recognition, and respect for human diversity. Civizen does not claim that such recognition already exists.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/the-civizen-charter.md#4",
      "title": "Nations, Cultures, Religions, and Lawful Institutions",
      "path": "docs/00-foundation/the-civizen-charter.md",
      "text": "## Nations, Cultures, Religions, and Lawful Institutions Civizen does not erase nations, cultures, religions, or lawful institutions. It seeks cooperation across difference, not replacement of existing societies or faiths. Differences of opinion may be debated; deception, harassment, threats, coercion, exploitation, and dehumanization are not constructive participation.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/the-civizen-charter.md#5",
      "title": "Community Governance Within Delegated Scope",
      "path": "docs/00-foundation/the-civizen-charter.md",
      "text": "## Community Governance Within Delegated Scope Where Civizen offers community governance\u2014proposals, advisory votes, delegated platform decisions, review, and internal civic status\u2014that governance operates only within authority expressly delegated for Civizen\u2019s platform and programs. Current Civizen governance is not yet a public constitution or state election system, and it does not by itself transfer legal authority outside Civizen. Its processes may nevertheless help humanity research, test, and responsibly develop future representative institutions, subject to lawful authorization and democratic legitimacy.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/the-civizen-charter.md#6",
      "title": "Proportionate Transparency",
      "path": "docs/00-foundation/the-civizen-charter.md",
      "text": "## Proportionate Transparency Civizen favors public transparency in governance, funding relationships, policies, and material decisions that affect participants. Transparency is proportionate, not absolute. It does not require disclosure of personal information, private communications, security-sensitive material, confidential legal advice, protected donor information, employment records, unpublished negotiations, trade secrets, or information whose disclosure would create harm or violate law.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/the-civizen-charter.md#7",
      "title": "Moral Vision and Invitation",
      "path": "docs/00-foundation/the-civizen-charter.md",
      "text": "## Moral Vision and Invitation Civizen invites individuals, communities, educators, developers, researchers, and organizations to cooperate in building better shared systems\u2014through ideas, review, education, technology, and responsible participation. The future of humanity should be shaped consciously and collaboratively, with respect for dignity and for the lawful institutions people already inhabit.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/the-civizen-charter.md#8",
      "title": "Related Public Documents",
      "path": "docs/00-foundation/the-civizen-charter.md",
      "text": "## Related Public Documents - Mission and Independence Charter (`/about/mission`) - Community Governance Charter (`/governance/charter`) - World Citizenship and Civic Status Notice (`/about/world-citizenship`)",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/the-civizen-charter.md#9",
      "title": "Status",
      "path": "docs/00-foundation/the-civizen-charter.md",
      "text": "## Status This document is interim public foundation material and may evolve through review and documented institutional processes.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/philosophy-of-mature-humanity.md#0",
      "title": "docs/00-foundation/philosophy-of-mature-humanity.md",
      "path": "docs/00-foundation/philosophy-of-mature-humanity.md",
      "text": "> **Document role.** This is Civizen\u2019s living philosophical foundation \u2014 a design philosophy for civilization. > It is **not** Terms of Service, a legal constitution, a product specification, or a belief users must accept to use Civizen. > *Mature Humanity* is a foundational intellectual source and parent vision of Civizen, **not** an immutable software or institutional specification. Civizen may improve beyond individual structures proposed in the book. Future editions of the book may incorporate learning from Civizen implementation, research, pilots, institutional experience, governance, and contributors. # Philosophy of Mature Humanity > **A living design philosophy for civilization** > Version 1.0 \u2014 August 2026",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/philosophy-of-mature-humanity.md#1",
      "title": "docs/00-foundation/philosophy-of-mature-humanity.md",
      "path": "docs/00-foundation/philosophy-of-mature-humanity.md",
      "text": "Mature Humanity is not a political ideology, a religion, or a finished manifesto. It is a framework for understanding our shared reality and designing systems that help people, humanity, and the planet flourish together. Every major decision, institution, feature, governance model, and long-term strategy developed under Civizen should be traceable to the principles in this document. The document itself must remain open to evidence, experience, respectful criticism, and improvement. > **Reality comes first. Systems come second. When systems no longer reflect reality, they should evolve.**",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/philosophy-of-mature-humanity.md#2",
      "title": "Preface: continuing humanity's work",
      "path": "docs/00-foundation/philosophy-of-mature-humanity.md",
      "text": "## Preface: continuing humanity's work For thousands of years, humanity has continuously improved the way it lives. Each generation inherited the work of earlier generations, adapted it to new knowledge and circumstances, and passed it on. The purpose of Mature Humanity is not to condemn what previous generations built. Their systems brought us this far. Our responsibility is to continue their work\u2014preserving what serves life, improving what no longer does, and building what our present reality now makes possible. No doctrine, institution, law, tradition, or document should ever become more important than reality itself.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/philosophy-of-mature-humanity.md#3",
      "title": "Part I \u2014 The reality we share",
      "path": "docs/00-foundation/philosophy-of-mature-humanity.md",
      "text": "## Part I \u2014 The reality we share ### 1. One planet Earth is humanity's only home. Every person, community, nation, culture, institution, and generation depends upon the same living planet. National borders organize jurisdiction; they do not divide the atmosphere, oceans, climate, ecosystems, knowledge, or consequences of human action. Protecting our shared home is therefore not a secondary interest. It is a foundational responsibility of civilization. ### 2. One humanity Humanity is one species expressed through extraordinary diversity. We differ in language, culture, tradition, belief, profession, history, and nationality. These differences enrich civilization; they need not prevent cooperation.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/philosophy-of-mature-humanity.md#4",
      "title": "Part I \u2014 The reality we share",
      "path": "docs/00-foundation/philosophy-of-mature-humanity.md",
      "text": "We are not strangers by nature. Fear, misunderstanding, inherited divisions, and incompatible systems can make us behave like strangers on our own planet. What people created, people can examine and improve. ### 3. Interdependence No individual builds civilization alone. No profession, institution, economy, or nation flourishes in complete isolation. Humanity depends upon nature, people depend upon one another, and every generation depends upon both those who came before and those who will follow. Cooperation is not merely an ideal. It is already the operating reality of civilization. Our systems should acknowledge it. ### 4. Shared responsibility",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/philosophy-of-mature-humanity.md#5",
      "title": "Part I \u2014 The reality we share",
      "path": "docs/00-foundation/philosophy-of-mature-humanity.md",
      "text": "Because we share one home and one future, improving civilization is a shared responsibility. Responsibility should be proportional to knowledge, ability, authority, and impact, but no person is entirely outside it. The task is not to erase local loyalties. It is to add a planetary awareness capable of guiding them toward coexistence. ### 5. World Citizen Every person is born into multiple identities: a family, community, culture, profession, city, and nation. These identities remain meaningful.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/philosophy-of-mature-humanity.md#6",
      "title": "Part II \u2014 Unity without uniformity",
      "path": "docs/00-foundation/philosophy-of-mature-humanity.md",
      "text": "## Part II \u2014 Unity without uniformity ### 6. Cultural diversity is a human treasure Cultural diversity fills human life with languages, ideas, music, food, art, traditions, histories, and different ways of understanding existence. A mature civilization protects this diversity from forced uniformity and makes it possible for people to discover and enjoy it. The aim is not to make Tokyo, Yerevan, Cairo, Mexico City, or any other place feel the same. The aim is for every person to encounter different cultures without entering a human-made zone of hostility, exclusion, or fear. ### 7. Civilizational compatibility",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/philosophy-of-mature-humanity.md#7",
      "title": "Part II \u2014 Unity without uniformity",
      "path": "docs/00-foundation/philosophy-of-mature-humanity.md",
      "text": "Peaceful coexistence requires **civilizational compatibility**: different cultures and communities retaining their character while sharing a dependable foundation of dignity, safety, fairness, peaceful participation, and opportunity. Unity without uniformity means: - different cultures, shared human dignity; - different traditions, peaceful coexistence; - different communities, compatible civic foundations; - one planet, one interdependent humanity. World peace is an outcome. Civilizational compatibility is one of the mechanisms that can make it durable. ### 8. Diversity and examination No culture is inherently superior or inferior, and no human-created practice is beyond respectful examination. Cultural diversity is a strength; cultural immunity from examination is not.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/philosophy-of-mature-humanity.md#8",
      "title": "Part II \u2014 Unity without uniformity",
      "path": "docs/00-foundation/philosophy-of-mature-humanity.md",
      "text": "When rights, values, or practices come into tension, the response should not be fear, humiliation, or collective blame. It should be an open, evidence-informed process that: 1. defines the real context and the people affected; 2. hears affected communities and relevant expertise; 3. distinguishes assumptions from demonstrated harms and benefits; 4. considers freedom, dignity, safety, fairness, and proportionality together; 5. seeks the least restrictive workable solution; 6. tests outcomes and revises the decision when reality provides new evidence. If a practice helps people flourish and coexist, it deserves protection. If it causes avoidable harm or division, people should be able to improve it without treating its practitioners as lesser human beings. ### 9. No human-made hostile place",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/philosophy-of-mature-humanity.md#9",
      "title": "Part III \u2014 The purpose of civilization",
      "path": "docs/00-foundation/philosophy-of-mature-humanity.md",
      "text": "## Part III \u2014 The purpose of civilization ### 10. Human flourishing The purpose of civilization is to enable every person to live a healthy, meaningful, fulfilling, and contributive life while protecting the planet and future generations. Human flourishing includes health, safety, learning, purpose, opportunity, meaningful work, relationships, belonging, agency, contribution, leisure, creativity, and happiness. Happiness matters, but it is not the only measure. A life of passive comfort without purpose, growth, or connection is not the full aim. ### 11. Systems exist to serve life People should not exist to preserve systems. Systems exist to serve people, humanity, and the living world upon which they depend.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/philosophy-of-mature-humanity.md#10",
      "title": "Part III \u2014 The purpose of civilization",
      "path": "docs/00-foundation/philosophy-of-mature-humanity.md",
      "text": "Institutions earn legitimacy through the quality, fairness, transparency, and durability of the outcomes they produce\u2014not merely through age, authority, procedure, or declared intent. ### 12. Rights and responsibilities Human dignity requires rights that protect people from domination, deprivation, discrimination, and arbitrary power. Shared life also creates responsibilities: to avoid preventable harm, respect the equal dignity of others, care for common resources, contribute when able, and improve the systems entrusted to us. Rights without enforceable protection are fragile. Responsibilities without rights invite abuse. Mature systems uphold both. ### 13. Justice and restoration",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/philosophy-of-mature-humanity.md#11",
      "title": "Part III \u2014 The purpose of civilization",
      "path": "docs/00-foundation/philosophy-of-mature-humanity.md",
      "text": "Justice should protect people, establish accountability, repair harm where possible, and reduce the conditions that reproduce it. Punishment alone cannot be the measure of success. A mature justice system is impartial, evidence-based, proportionate, accessible, transparent, and committed to prevention, rehabilitation, restoration, and public safety. ### 14. Peace by design Humanity cannot rely on goodwill alone to prevent war. Conflict becomes likely when systems reward domination, hide consequences, concentrate unchecked power, exclude peaceful participation, or leave communities without fair ways to resolve disputes.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/philosophy-of-mature-humanity.md#12",
      "title": "Part IV \u2014 Human potential, work, and technology",
      "path": "docs/00-foundation/philosophy-of-mature-humanity.md",
      "text": "## Part IV \u2014 Human potential, work, and technology ### 15. Every person has potential Every person possesses a distinct combination of abilities, experiences, perspectives, needs, and potential. Civilization should help each person discover where they can grow, contribute, and live meaningfully. Human potential should not be wasted because poverty, prejudice, geography, poor education, inaccessible systems, or absent guidance prevented it from being recognized. ### 16. The purpose of education Education should help people understand reality, think critically, cooperate across differences, discover and develop their abilities, participate in shared decisions, and continue learning throughout life.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/philosophy-of-mature-humanity.md#13",
      "title": "Part IV \u2014 Human potential, work, and technology",
      "path": "docs/00-foundation/philosophy-of-mature-humanity.md",
      "text": "Learning is not merely preparation for employment, and it does not end with school. It is a lifelong capability of both the individual and civilization. ### 17. The purpose of work The purpose of work is not merely survival or economic output. Work can allow people to express ability, meet real needs, support themselves and those who depend on them, contribute to society, develop mastery, and find meaning. Civilization should reduce involuntary drudgery and help people find roles aligned with both their capacities and society's needs. Essential work should be respected, safe, and fairly rewarded, whether or not markets currently value it highly. ### 18. The purpose of the economy The economy is a system for coordinating resources, effort, exchange, risk, and value. It is a means, not civilization's final purpose.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/why-civizen-exists-page-brief.md#0",
      "title": "Purpose of This Document",
      "path": "docs/00-foundation/why-civizen-exists-page-brief.md",
      "text": "## Purpose of This Document Use this document to replace and expand the current content at: `https://civizen.world/why-this-exists` Keep the existing route: `/why-this-exists` The goal is to preserve the page\u2019s current strengths, including its concise manifesto structure, central question, decentralized governance message, and clear invitation to join, while adding: - a more human opening, - a clear founder voice, - a concrete definition of Civizen, - reassurance that Civizen does not erase nations or cultures, - a stronger explanation of shared world citizenship, - a connection to *Mature Humanity*, - clearer calls to action. The page should read as a public founding message, not as a technical specification, legal declaration, or conventional product landing page. --- # Final Web Page Copy",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/why-civizen-exists-page-brief.md#1",
      "title": "Why Civizen Exists",
      "path": "docs/00-foundation/why-civizen-exists-page-brief.md",
      "text": "## Why Civizen Exists ### A Message from the Founder",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/why-civizen-exists-page-brief.md#2",
      "title": "One Planet, One Shared Future",
      "path": "docs/00-foundation/why-civizen-exists-page-brief.md",
      "text": "## One Planet, One Shared Future We all live on the same planet. We breathe the same air, depend on the same natural systems, raise families with similar hopes, and want safety, dignity, opportunity, and a meaningful future for those we love. Our nations, cultures, religions, languages, and traditions developed over centuries. They are valuable parts of humanity\u2019s shared heritage. Yet we still organize much of human life as though nations are isolated worlds rather than members of one interconnected civilization. At the same time, humanity has developed technologies powerful enough to connect, heal, educate, and support people across the world. We can communicate instantly, explore space, develop artificial intelligence, cure diseases, and produce resources at a scale previous generations could not have imagined.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/why-civizen-exists-page-brief.md#3",
      "title": "One Planet, One Shared Future",
      "path": "docs/00-foundation/why-civizen-exists-page-brief.md",
      "text": "But we also continue creating and relying on tools capable of destroying one another. Nuclear weapons are the most obvious example. When one country develops them, others feel compelled to respond, compete, or seek another form of deterrence. This may create temporary balance, but it cannot guarantee permanent safety. One mistake, one technical failure, one miscalculation, or one irresponsible decision could create consequences from which humanity may never recover. > Where are we moving, and where should we be moving?",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/why-civizen-exists-page-brief.md#4",
      "title": "Even When We Win, Humanity Loses",
      "path": "docs/00-foundation/why-civizen-exists-page-brief.md",
      "text": "## Even When We Win, Humanity Loses Humanity still lives through systems that frequently place national, political, economic, religious, or institutional interests above our shared long-term safety. Because of this, we repeatedly find ourselves divided by borders, identities, beliefs, interests, fears, and conflicting incentives. Even when a country wins a war, humanity loses. We lose family members, friends, homes, knowledge, infrastructure, trust, natural resources, and years of work that could have been used to improve life. We call some of these outcomes victories, but people on every side pay the price.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/why-civizen-exists-page-brief.md#5",
      "title": "Even When We Win, Humanity Loses",
      "path": "docs/00-foundation/why-civizen-exists-page-brief.md",
      "text": "We work hard to build homes, raise children, develop communities, create institutions, and preserve the achievements of generations. Then we devote enormous human, scientific, and financial resources to systems capable of destroying what we have built. Is that the highest use of human intelligence? Should victory mean defeating another nation, weakening another community, or proving that one group is more powerful than another? Or should our greatest victory be the creation of a civilization in which no nation, culture, or community must be destroyed for another to succeed?",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/why-civizen-exists-page-brief.md#6",
      "title": "A More Mature Way to Live",
      "path": "docs/00-foundation/why-civizen-exists-page-brief.md",
      "text": "## A More Mature Way to Live Humanity often unites only when disaster forces us to. During wars, pandemics, natural catastrophes, and moments of existential danger, we remember that survival is more important than the labels that separate us. We cooperate because we understand that we are stronger together. But why should we wait for disaster to remember this? Why should we continue losing lives, resources, time, and trust before choosing to cooperate? Why should peace depend mainly on fear, deterrence, temporary agreements, or the hope that no one makes a catastrophic mistake? For me, this is also a moral and spiritual responsibility.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/why-civizen-exists-page-brief.md#7",
      "title": "A More Mature Way to Live",
      "path": "docs/00-foundation/why-civizen-exists-page-brief.md",
      "text": "Whatever our religion, philosophy, or worldview, we should be able to agree that human intelligence must be used to protect life, improve well-being, and build a better future, not to destroy one another. Humanity has reached extraordinary levels of technological development. Now we must develop the maturity, institutions, and shared responsibility needed to use those capabilities wisely. Peace requires more than speeches, slogans, treaties, or good intentions. It requires practical systems that people can participate in, examine, improve, trust, and hold accountable.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/why-civizen-exists-page-brief.md#8",
      "title": "What Civizen Proposes",
      "path": "docs/00-foundation/why-civizen-exists-page-brief.md",
      "text": "## What Civizen Proposes Civizen is an open, participatory, and decentralized civic framework through which people, communities, experts, organizations, and institutions can work together on matters affecting our common future. It is intended to help people: - develop shared standards, - propose and examine solutions, - contribute meaningful work, - evaluate evidence, - participate in transparent decisions, - build trust through verification and accountability, - coordinate across national and institutional boundaries. Civizen is not intended to be controlled by one person, one organization, one corporation, one political group, or one country. It is not intended to be imposed from above.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/why-civizen-exists-page-brief.md#9",
      "title": "What Civizen Proposes",
      "path": "docs/00-foundation/why-civizen-exists-page-brief.md",
      "text": "It should be created, reviewed, corrected, governed, and continuously improved through broad participation, open-source development, transparent procedures, independent auditing, and safeguards against manipulation or capture. Its purpose is to help humanity move toward a more cooperative civic environment, with shared human principles, meaningful rights, clear responsibilities, and practical ways to solve common problems.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/why-civizen-exists-page-brief.md#10",
      "title": "Unity Without Erasing Diversity",
      "path": "docs/00-foundation/why-civizen-exists-page-brief.md",
      "text": "## Unity Without Erasing Diversity Civizen is not intended to erase nations, cultures, religions, languages, traditions, or legitimate local governance. Human diversity is one of civilization\u2019s greatest strengths. Unity does not require uniformity. People should be able to preserve their national and cultural identities while also recognizing a shared responsibility toward every human being and the planet we all depend on. Civizen therefore proposes a complementary layer of world citizenship, not the immediate replacement of national or local citizenship. This shared civic layer should focus on areas where cooperation benefits everyone, including:",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/why-civizen-exists-page-brief.md#11",
      "title": "Unity Without Erasing Diversity",
      "path": "docs/00-foundation/why-civizen-exists-page-brief.md",
      "text": "- human dignity, - peaceful coexistence, - truthful and accountable participation, - environmental responsibility, - fair access to essential opportunities, - protection against corruption, fraud, discrimination, and abuse of power, - responsible use of natural and human resources. The goal is not to make every society identical. The goal is to create enough common ground for different societies to coexist, cooperate, and progress without threatening one another\u2019s survival.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/why-civizen-exists-page-brief.md#12",
      "title": "How Civizen Must Be Built",
      "path": "docs/00-foundation/why-civizen-exists-page-brief.md",
      "text": "## How Civizen Must Be Built The legitimacy of Civizen cannot come from the founder alone. It must come from genuine participation. I may have initiated this project, but I should not build it alone. No individual should define humanity\u2019s future alone. Civizen must be shaped through the knowledge, experience, concerns, creativity, and participation of people from different nations, professions, cultures, beliefs, and circumstances. Its strength must come from transparency. Its direction must come from shared human interests. Its governance must include meaningful safeguards against concentration of power. Its decisions should be supported by evidence, open participation, clear accountability, review, and appeal.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/00-foundation/why-civizen-exists-page-brief.md#13",
      "title": "How Civizen Must Be Built",
      "path": "docs/00-foundation/why-civizen-exists-page-brief.md",
      "text": "Its success should be measured by whether it improves real lives, protects human dignity, reduces harm, strengthens trust, and avoids leaving people behind. The system must also remain open to correction. A project that asks humanity to mature must itself be willing to learn, admit mistakes, improve its rules, and evolve responsibly.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/04-operations/contributor-processes/content-status-retrieval-rules.md#0",
      "title": "Content status rules for search and AI retrieval",
      "path": "docs/04-operations/contributor-processes/content-status-retrieval-rules.md",
      "text": "# Content status rules for search and AI retrieval Machine-readable policy for Study search, semantic indexes, Civi system context, and agent documentation retrieval. | status | default inclusion | |---|---| | current public policy | include | | interim public policy | include with interim status | | superseded | exclude by default | | archived | exclude by default | | internal | permission required | | restricted | permission required and need-to-know | Do not derive financial, legal, founder, investor, contributor, citizenship, or governance rights from superseded or restricted sources. Public institutional policy lives under `docs/02-policies/institutional/` and in-app `/documents`.",
      "status": "implemented",
      "priority": 6,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/governance-framework.md#0",
      "title": "Civizen Governance Framework",
      "path": "docs/institutional/governance-framework.md",
      "text": "# Civizen Governance Framework **Status: Working Governance Framework** **Working Draft 0.1** This document is a **working governance framework** and an authoritative project reference. It describes proposed rules for distributing and exercising authority. It does **not** assert that the named boards, councils, constitutions, reserved-matter procedures, or multi-body approval mechanisms already legally exist or are operational in production. Proposed bodies named here remain **proposed** until they are established through valid legal formation, governing documents, and applicable law.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/governance-framework.md#1",
      "title": "Relationship to the Institutional Blueprint",
      "path": "docs/institutional/governance-framework.md",
      "text": "## Relationship to the Institutional Blueprint This Governance Framework is **subordinate to** the [Civizen Institutional Blueprint](./institutional-blueprint.md). The two documents must not be merged. | Document | Role | | --- | --- | | [**Institutional Blueprint**](./institutional-blueprint.md) | Defines what Civizen's institutions, bodies, entities, and major relationships are. | | **Governance Framework** (this document) | Defines how authority is distributed and exercised among those institutions and participants. |",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/governance-framework.md#2",
      "title": "Relationship to the Institutional Blueprint",
      "path": "docs/institutional/governance-framework.md",
      "text": "The institutional reading path continues with the [Stakeholder & Partnership Framework](./stakeholder-partnership-framework.md) (who Civizen works with), the [Pilot Framework](./pilot-framework.md) (what is tested with those participants), the [Founder Transition & Succession Framework](./founder-transition-succession-framework.md) (how founder authority evolves), the [Contributor Framework](./contributor-framework.md) (Contribution Record design), and the [Areas, Domains & Participation Framework](./areas-domains-participation-framework.md) (shared classification). Do not merge these documents. Where this Framework refers to the Foundation, commercial entities, councils, citizens, contributors, or funding relationships, those structures are the ones described in the Blueprint.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/governance-framework.md#3",
      "title": "1. Purpose",
      "path": "docs/institutional/governance-framework.md",
      "text": "## 1. Purpose The Civizen Governance Framework defines how authority is distributed, exercised, constrained, reviewed, and progressively transferred throughout the Civizen system. The [Institutional Blueprint](./institutional-blueprint.md) defines the major institutional bodies and relationships within Civizen. This Governance Framework defines: - who may propose decisions; - who may advise; - who may deliberate; - who may vote; - who may approve; - who may implement; - who may review or audit; - who may appeal; - which decisions require specialized expertise; - which decisions require broad citizen participation; - which matters remain legally reserved to fiduciary bodies; - which powers no participant may exercise alone; - and how governance should evolve as Civizen matures.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/governance-framework.md#4",
      "title": "1. Purpose",
      "path": "docs/institutional/governance-framework.md",
      "text": "The goal is not to create a single centralized decision-making institution. The goal is to create a governance system in which authority follows **legitimate responsibility, competence, affected interests, contribution, accountability, and constitutional safeguards**. No individual, organization, government, investor, political movement, technology provider, or automated system should be capable of acquiring unilateral control over Civizen. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/governance-framework.md#5",
      "title": "2. Governance Principles",
      "path": "docs/institutional/governance-framework.md",
      "text": "## 2. Governance Principles ### 2.1 Authority Must Be Distributed Civizen should not concentrate governance authority in a single person or body. Different types of decisions should require different combinations of: - citizens; - contributors; - experts; - institutional partners; - governing boards; - affected communities; - implementation teams; - and independent reviewers. ### 2.2 Authority Follows the Decision There should not be one voting mechanism for every Civizen decision. Authority should depend on the nature of the matter being decided. A technical decision may require substantial expert authority. A constitutional decision may require broad system-wide participation. A legally regulated matter may require formal fiduciary approval.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/governance-framework.md#6",
      "title": "2. Governance Principles",
      "path": "docs/institutional/governance-framework.md",
      "text": "A local implementation decision may primarily belong to the affected community and implementation partners. ### 2.3 Participation Does Not Equal Unlimited Authority Participation in Civizen should create opportunities to contribute to governance, but participation alone should not create authority over every subject. Governance rights may depend on: - relevance; - expertise; - contribution; - demonstrated responsibility; - affected status; - role; - institutional mandate; - and the type of decision. ### 2.4 Money Does Not Purchase Mission Control Financial contribution should not automatically produce governance power over Civizen's mission. Investors, donors, governments, foundations, institutional partners, and other funders may receive rights appropriate to contracts, corporate structures, grants, or funded programs.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/governance-framework.md#7",
      "title": "2. Governance Principles",
      "path": "docs/institutional/governance-framework.md",
      "text": "Those rights must not automatically extend to control over Civizen's constitutional principles, shared mission, or system-wide governance. ### 2.5 Contribution Does Not Automatically Equal Governance Authority Civizen should record and recognize meaningful contribution. Contribution may affect: - reputation; - recognition; - contributor status; - eligibility for greater responsibility; - economic participation; - compensation; - or access to governance roles. However: **Contribution \u2260 automatic governance authority.** Likewise: **Capital contribution \u2260 work contribution \u2260 institutional contribution \u2260 expertise \u2260 governance authority.** Each can be recognized appropriately without treating them as interchangeable.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/governance-framework.md#8",
      "title": "3. Governance Participants",
      "path": "docs/institutional/governance-framework.md",
      "text": "## 3. Governance Participants Civizen governance may involve the following principal participants. ### 3.1 Founder The founder provides early institutional leadership, conceptual continuity, and initial stewardship. Founder authority should be substantial enough to protect the integrity of Civizen during formation, but explicitly transitional. ### 3.2 Civizen Foundation Board The Foundation Board exercises the fiduciary authority legally required of the mission-holding institution. It protects the mission, assets, institutional integrity, and lawful operation of the Foundation. ### 3.3 Citizens Citizens are participants in the Civizen system who may participate in deliberation and governance according to defined eligibility rules. ### 3.4 Contributors",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/governance-framework.md#9",
      "title": "3. Governance Participants",
      "path": "docs/institutional/governance-framework.md",
      "text": "Contributors are individuals or organizations whose meaningful work, knowledge, resources, implementation, research, infrastructure, or other contribution has been recorded by Civizen. Contributor status may qualify participants for additional governance responsibilities where relevant. ### 3.5 Expert Councils Expert Councils provide specialized knowledge, evaluation, standards development, review, certification, or recommendations within defined subject areas. ### 3.6 Institutional Partners Universities, governments, nonprofits, international organizations, companies, research institutions, communities, and other partners may participate in governance related to their legitimate institutional role. ### 3.7 Affected Communities",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/governance-framework.md#10",
      "title": "3. Governance Participants",
      "path": "docs/institutional/governance-framework.md",
      "text": "People substantially affected by a proposed decision should receive meaningful participation rights even when they are not otherwise highly active Civizen contributors. ### 3.8 Implementation Teams Teams responsible for delivering approved programs should receive reasonable operational authority within approved mandates. ### 3.9 Commercial Entities Commercial entities operating within the Civizen ecosystem may govern their lawful commercial affairs, but should not control Civizen's public-interest mission. ### 3.10 Investors Investors may receive economic and corporate rights appropriate to a commercial entity. Investment should not create authority over Civizen's constitutional mission. ### 3.11 Governments and Public Authorities Governments retain legitimate authority within their lawful jurisdictions.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/governance-framework.md#11",
      "title": "4. Distribution of Authority",
      "path": "docs/institutional/governance-framework.md",
      "text": "## 4. Distribution of Authority Civizen governance should distribute authority across several functions. The principal governance functions are: 1. **Propose** 2. **Advise** 3. **Deliberate** 4. **Vote** 5. **Approve** 6. **Implement** 7. **Review** 8. **Audit** 9. **Appeal** 10. **Suspend or intervene in exceptional circumstances** These functions should not normally belong to the same participant in major decisions. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/governance-framework.md#12",
      "title": "5. Preliminary Authority Matrix",
      "path": "docs/institutional/governance-framework.md",
      "text": "## 5. Preliminary Authority Matrix The following matrix establishes the general direction of authority. It is not intended to replace detailed decision-specific rules.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/governance-framework.md#13",
      "title": "5. Preliminary Authority Matrix",
      "path": "docs/institutional/governance-framework.md",
      "text": "| Participant | Propose | Advise | Vote | Approve | Implement | Review / Audit | Unilateral System Control | |---|---|---|---|---|---|---|---| | Founder | Yes | Yes | Transitional | Transitional / limited | Yes | No exclusive authority | No | | Foundation Board | Yes | Yes | Yes | Fiduciary and reserved matters | Through authorized teams | Oversight | No | | Citizens | Yes | Yes | Yes where eligible | Defined public matters | Participate | Transparency review | No | | Contributors | Yes | Yes | Yes where eligible | Defined contributor matters | Yes | Peer review | No | | Expert Councils | Yes | Strong | Specialized | Defined technical authority | Limited | Expert review | No | | Institutional Partners | Yes | Yes | Defined | Partnership-specific | Yes | Program review | No | | Affected Communities | Yes | Yes | Strong relevance | Defined local/social matters | Participate | Impact review | No | | Governments | Yes | Yes | Defined participation | Jurisdiction-specific | Yes | Public oversight | No Civizen-wide control | | Commercial Entity | Defined | Defined | Internal corporate matters | Commercial matters | Yes | Corporate audit | No mission control | | Investors | Limited | Yes ",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/institutional-blueprint.md#0",
      "title": "Civizen Institutional Blueprint",
      "path": "docs/institutional/institutional-blueprint.md",
      "text": "# Civizen Institutional Blueprint **Status: Working Institutional Blueprint** **Working Draft 0.1** **Institutional Architecture for the Civizen System** This document is a **working institutional blueprint** and an authoritative project reference. It describes a proposed long-term architecture. It does **not** assert that the named legal entities, boards, councils, constitutions, or funding instruments already legally exist, have been formed, or have been adopted as binding public policy.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/institutional-blueprint.md#1",
      "title": "Civizen Institutional Blueprint",
      "path": "docs/institutional/institutional-blueprint.md",
      "text": "Proposed structures in this Blueprint \u2014 including a Civizen Foundation, a commercial public-benefit company, fiduciary boards, councils, reserved-matter mechanisms, a future Funding Constitution, and a future Contributor Framework \u2014 remain **proposed** until they are actually established through valid legal formation, governing documents, and applicable law. Civizen is not owned by investors and is not controlled by any government. Legal entities that may later hold assets or operate programs would do so as instruments of Civizen's mission, not as conventional private owners of the civic system. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/institutional-blueprint.md#2",
      "title": "1. Purpose of This Blueprint",
      "path": "docs/institutional/institutional-blueprint.md",
      "text": "## 1. Purpose of This Blueprint Civizen is intended to transform the principles of *Mature Humanity* from a philosophical vision into a practical, participatory system that can operate across countries, institutions, communities, and eventually the world. *Mature Humanity* is a foundational intellectual source and parent vision. It is **not** an immutable software or institutional specification. Civizen should be able to improve beyond individual structures proposed in the book. Future editions of the book may incorporate learning produced through Civizen implementation, research, pilots, institutional experience, governance, and contributors. **Book \u2192 informs Civizen \u2192 Civizen tests and learns \u2192 models improve \u2192 future book editions may incorporate learning.** This does not weaken Civizen's overall purpose.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/institutional-blueprint.md#3",
      "title": "1. Purpose of This Blueprint",
      "path": "docs/institutional/institutional-blueprint.md",
      "text": "Achieving that purpose requires more than a technology platform. Civizen needs an institutional architecture capable of:",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/institutional-blueprint.md#4",
      "title": "1. Purpose of This Blueprint",
      "path": "docs/institutional/institutional-blueprint.md",
      "text": "- protecting its mission over generations; - preventing capture by any founder, corporation, government, political movement, investor, donor, or other interest group; - allowing meaningful participation by individuals and institutions; - receiving and responsibly deploying public, philanthropic, institutional, and potentially private investment; - developing and operating shared technological infrastructure; - protecting essential intellectual property while maintaining appropriate openness; - establishing legitimate and auditable governance; - enabling collaboration across jurisdictions; - developing and operating pilot programs; - supporting long-term international expansion; - creating mechanisms through which contributors can progressively assume responsibility for the system; - and ensuring institutional continuity beyond any individual leader.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/institutional-blueprint.md#5",
      "title": "2. Institutional Design Principles",
      "path": "docs/institutional/institutional-blueprint.md",
      "text": "## 2. Institutional Design Principles The institutional architecture of Civizen should be governed by the following principles. ### 2.1 Mission Before Ownership No individual or organization should be able to own Civizen in the conventional sense. Legal entities may hold assets, intellectual property, contracts, funds, and operational responsibilities, but these assets should ultimately be held and managed in service of Civizen's mission. ### 2.2 No Permanent Founder Control The founder may provide initial leadership, direction, intellectual foundations, and institutional continuity during the formative stages of Civizen. However, the institutional architecture must deliberately transition from founder-led development toward durable institutional governance.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/institutional-blueprint.md#6",
      "title": "2. Institutional Design Principles",
      "path": "docs/institutional/institutional-blueprint.md",
      "text": "The founder should remain an important guardian of the project's original purpose, but should not possess permanent unilateral authority over Civizen. ### 2.3 Protection Against Capture The system must be designed so that control cannot be acquired merely through: - capital; - political power; - nationality; - organizational size; - technical control; - number of users; - donations; - institutional status; - or temporary popularity. Major institutional safeguards should require distributed approval. ### 2.4 Separation of Functions Civizen should not attempt to place every activity inside one organization. Different institutional functions require different governance, financing, legal, and operational structures. At minimum, the architecture should distinguish between:",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/institutional-blueprint.md#7",
      "title": "2. Institutional Design Principles",
      "path": "docs/institutional/institutional-blueprint.md",
      "text": "1. **Mission Stewardship** 2. **Technology and Infrastructure** 3. **Participatory Governance** 4. **Programs and Pilots** 5. **Research and Standards** 6. **Commercial Activities** 7. **Funding and Investment** 8. **Institutional Partnerships** ### 2.5 Legal Governance and Participatory Governance Are Different Civizen's legal entities must have legally accountable governing bodies. The wider Civizen community should simultaneously develop participatory governance mechanisms through which contributors, experts, communities, institutions, and ultimately citizens can shape the system. These two systems should interact, but they should not be confused. A community vote cannot automatically eliminate the fiduciary responsibilities imposed on directors of a legal entity.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/institutional-blueprint.md#8",
      "title": "3. Proposed Institutional Architecture",
      "path": "docs/institutional/institutional-blueprint.md",
      "text": "## 3. Proposed Institutional Architecture Civizen should initially be built around a **mission-first institutional structure**, rather than creating multiple corporations before their functions are necessary. The proposed long-term architecture contains several layers. These layers are **proposed**. They have not yet been legally established. ### 3.1 Civizen Foundation #### Primary role The Civizen Foundation should become the principal steward of Civizen's public-interest mission. Its responsibilities may include:",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/institutional-blueprint.md#9",
      "title": "3. Proposed Institutional Architecture",
      "path": "docs/institutional/institutional-blueprint.md",
      "text": "- protecting the Civizen mission; - maintaining constitutional and institutional documents; - stewarding the Civizen name, identity, domains, and core mission-related intellectual property; - administering grants and philanthropic funding; - coordinating public-interest programs; - commissioning research; - developing shared standards; - supporting pilot programs; - maintaining institutional partnerships; - facilitating participatory governance; - protecting the project from capture; - and ensuring continuity across generations. #### Initial legal direction",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/institutional-blueprint.md#10",
      "title": "3. Proposed Institutional Architecture",
      "path": "docs/institutional/institutional-blueprint.md",
      "text": "The current working recommendation is to evaluate formation as a **California nonprofit public benefit corporation**, followed by an application for federal tax-exempt status under IRC \xA7501(c)(3), assuming the final purposes and activities are structured to satisfy the relevant requirements. California provides a specific nonprofit public benefit corporation form, while federal 501(c)(3) qualification requires an organization to be organized and operated for qualifying exempt purposes. The final legal structure should be established with qualified nonprofit and tax counsel before formation. #### Transitional option",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/institutional-blueprint.md#11",
      "title": "4. Civizen Technologies",
      "path": "docs/institutional/institutional-blueprint.md",
      "text": "## 4. Civizen Technologies Civizen should **not automatically create a commercial corporation simply because it operates technology**. The need for a separate commercial entity should arise from actual operational requirements. Potential triggers include: - raising equity investment; - commercial contracts incompatible with Foundation operations; - revenue-generating technology services; - commercial licensing; - substantial enterprise services; - employment or compensation structures better suited to a commercial entity; - acquisition of commercial businesses; - or other activities that should remain legally and financially separate from the charitable institution. When those triggers arise, a separate mission-locked commercial organization may be appropriate. The working model is:",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/institutional-blueprint.md#12",
      "title": "4. Civizen Technologies",
      "path": "docs/institutional/institutional-blueprint.md",
      "text": "**Civizen Technologies, Public Benefit Corporation** A Delaware Public Benefit Corporation is one possible form to evaluate. Delaware law expressly provides for public benefit corporations under its General Corporation Law. This commercial entity is **proposed**. It has not been formed by this Blueprint. The Foundation and the commercial company should not simply become parent and subsidiary by default. Their relationship must be deliberately designed to prevent either: - commercialization of the public-interest mission, or - inappropriate transfer of charitable assets for private benefit. The exact ownership, licensing, board appointment, governance, and economic relationship should therefore be determined with legal and tax counsel when the commercial entity becomes necessary.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/institutional-blueprint.md#13",
      "title": "4. Civizen Technologies",
      "path": "docs/institutional/institutional-blueprint.md",
      "text": "A commercial operating company, if later formed, would not own Civizen's civic mission, citizen identity, or participatory governance system. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/stakeholder-partnership-framework.md#0",
      "title": "Civizen Stakeholder & Partnership Framework",
      "path": "docs/institutional/stakeholder-partnership-framework.md",
      "text": "# Civizen Stakeholder & Partnership Framework **Status: Working Stakeholder & Partnership Framework** **Working Draft 0.1** This document is a **working stakeholder and partnership framework** and an authoritative project reference. It describes proposed partnership roles, modules, evaluation processes, and a future Stakeholder Map. It does **not** assert that named partnership titles, modules, agreements, Founding Institutional Partner designations, or the Stakeholder Map already exist as operational programs. Proposed partnership mechanisms remain **proposed** until they are established through valid agreements, governing documents, and applicable law.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/stakeholder-partnership-framework.md#1",
      "title": "Institutional hierarchy",
      "path": "docs/institutional/stakeholder-partnership-framework.md",
      "text": "## Institutional hierarchy This Framework is **subordinate to** the [Civizen Institutional Blueprint](./institutional-blueprint.md) and must operate consistently with the [Civizen Governance Framework](./governance-framework.md). The institutional family must not be merged.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/stakeholder-partnership-framework.md#2",
      "title": "Institutional hierarchy",
      "path": "docs/institutional/stakeholder-partnership-framework.md",
      "text": "| Document | Role | | --- | --- | | [**Institutional Blueprint**](./institutional-blueprint.md) | Defines Civizen's institutional architecture. | | [**Governance Framework**](./governance-framework.md) | Defines how authority is distributed. | | **Stakeholder & Partnership Framework** (this document) | Defines who Civizen engages, how partners are classified, what roles they may perform, how partnerships are structured, and how partnership contributions connect to pilots and Civizen's contribution system. | | [**Pilot Framework**](./pilot-framework.md) | What Civizen tests and implements with those participants, how pilots operate, and how evidence is evaluated. | | [**Founder Transition & Succession Framework**](./founder-transition-succession-framework.md) | How founder authority evolves (functional self-sufficiency; not automatic access removal). | | [**Contributor Framework**](./contributor-framework.md) | Contribution Record design. | | [**Areas, Domains & Participation Framework**](./areas-domains-participation-framework.md) | Shared Area / Domain / Initiative classification. |",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/stakeholder-partnership-framework.md#3",
      "title": "Institutional hierarchy",
      "path": "docs/institutional/stakeholder-partnership-framework.md",
      "text": "This Framework **consolidates** concepts previously discussed separately as Stakeholder Map, Partnership Strategy, Partnership Framework, and Partnership Packages. Those names should not become competing parent documents. The **Stakeholder Map** is the future living operational dataset derived from this Framework. Public operational partnership rules remain in [`international-partnerships-and-chapters.md`](../02-policies/institutional/international-partnerships-and-chapters.md) until expressly updated. That public notice is narrower than this Framework and stays controlling for `/partners` copy.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/stakeholder-partnership-framework.md#4",
      "title": "1. Purpose",
      "path": "docs/institutional/stakeholder-partnership-framework.md",
      "text": "## 1. Purpose The Civizen Stakeholder & Partnership Framework defines: - who Civizen's principal stakeholders are; - how potential partners should be identified and evaluated; - the different roles organizations and individuals may play; - what Civizen may ask of partners; - what Civizen may offer partners; - how partnerships should be structured; - how contributions should be recorded; - how conflicts and institutional influence should be managed; - and how partnerships should lead to concrete pilots, programs, research, infrastructure, or other measurable outcomes. This Framework sits beneath the: - [**Civizen Institutional Blueprint**](./institutional-blueprint.md), which defines the institutional architecture; - and the [**Civizen Governance Framework**](./governance-framework.md), which defines how authority is distributed.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/stakeholder-partnership-framework.md#5",
      "title": "1. Purpose",
      "path": "docs/institutional/stakeholder-partnership-framework.md",
      "text": "It should be read together with the [**Pilot Framework**](./pilot-framework.md), which defines what Civizen tests with those participants. This Framework does not grant governance control to partners. Participation, funding, institutional status, political authority, expertise, implementation capacity, and contribution may each produce legitimate rights or responsibilities, but they should not automatically produce identical authority. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/stakeholder-partnership-framework.md#6",
      "title": "2. Partnership Philosophy",
      "path": "docs/institutional/stakeholder-partnership-framework.md",
      "text": "## 2. Partnership Philosophy Civizen should not approach institutions merely as: - donors; - sponsors; - customers; - vendors; - or endorsers. The objective is to develop a network of institutions and individuals capable of collectively building, testing, improving, implementing, financing, studying, and sustaining Civizen. A partnership should therefore answer: > **What can this stakeholder meaningfully contribute to Civizen, what can Civizen meaningfully provide in return, and what shared outcome can we produce together?** Partnerships should be outcome-oriented rather than symbolic. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/stakeholder-partnership-framework.md#7",
      "title": "3. Stakeholders Are Multi-Dimensional",
      "path": "docs/institutional/stakeholder-partnership-framework.md",
      "text": "## 3. Stakeholders Are Multi-Dimensional Civizen should not classify organizations solely by institutional type. For example, a university may contribute: - education; - healthcare; - research; - AI; - public policy; - economics; - engineering; - culture; - environmental work; - governance research; - entrepreneurship; - or implementation infrastructure. Likewise, a government may contribute: - funding; - data; - legal authorization; - public infrastructure; - service delivery; - population access; - research; - regulation; - pilots; - procurement; - or implementation. A stakeholder therefore should be understood through several dimensions simultaneously. These include:",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/stakeholder-partnership-framework.md#8",
      "title": "3. Stakeholders Are Multi-Dimensional",
      "path": "docs/institutional/stakeholder-partnership-framework.md",
      "text": "1. **Institutional Type** 2. **Field or Domain** 3. **Geographic Scope** 4. **Capabilities** 5. **Resources** 6. **Potential Contribution** 7. **Strategic Relevance** 8. **Implementation Capacity** 9. **Funding Capacity** 10. **Influence and Network Reach** 11. **Research Capacity** 12. **Population or Community Access** 13. **Alignment with Civizen Principles** 14. **Risk** 15. **Potential Partnership Role** ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/stakeholder-partnership-framework.md#9",
      "title": "4. Primary Stakeholder Categories",
      "path": "docs/institutional/stakeholder-partnership-framework.md",
      "text": "## 4. Primary Stakeholder Categories Civizen's principal stakeholder categories may include: ### 4.1 Individuals Including: - citizens; - contributors; - professionals; - researchers; - developers; - educators; - healthcare professionals; - entrepreneurs; - community leaders; - public servants; - students; - volunteers; - and other participants. Individuals may participate independently or through institutional partnerships. --- ### 4.2 Universities and Academic Institutions Potential roles include: - research; - education; - pilot design; - evaluation; - technical development; - policy research; - student participation; - faculty expertise; - innovation laboratories; - data analysis; - multidisciplinary collaboration; - and independent validation.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/stakeholder-partnership-framework.md#10",
      "title": "4. Primary Stakeholder Categories",
      "path": "docs/institutional/stakeholder-partnership-framework.md",
      "text": "Universities should be evaluated by their actual capabilities rather than treated as one uniform category. --- ### 4.3 Research Institutions and Think Tanks Potential roles include: - independent research; - economic modeling; - governance research; - social analysis; - policy design; - technical standards; - impact evaluation; - scenario simulation; - and evidence review. --- ### 4.4 Governments and Public Institutions These may include: - municipal governments; - regional or state governments; - national governments; - public agencies; - public universities; - public health institutions; - educational authorities; - regulatory authorities; - and public development organizations. Potential roles include:",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/stakeholder-partnership-framework.md#11",
      "title": "4. Primary Stakeholder Categories",
      "path": "docs/institutional/stakeholder-partnership-framework.md",
      "text": "- pilot authorization; - funding; - public infrastructure; - implementation; - procurement; - service integration; - research; - standards development; - public data; - and scaling. Government partnership must not create government ownership or unilateral control of Civizen. --- ### 4.5 International and Multilateral Organizations Potential organizations may include institutions operating across: - development; - health; - education; - humanitarian work; - governance; - labor; - culture; - environment; - peace; - economic development; - technology; - and international cooperation. Potential roles include: - multinational pilots; - standards; - expertise; - research; - convening; - funding; - institutional legitimacy; - implementation networks; - and international expansion. --- ### 4.6 Nonprofit and Civil Society Organizations",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/stakeholder-partnership-framework.md#12",
      "title": "5. Domain Classification",
      "path": "docs/institutional/stakeholder-partnership-framework.md",
      "text": "## 5. Domain Classification Stakeholders should also be classified by the areas in which they can contribute. The classification may include: - Health - Education - Culture - Responsibility / Governance - Environment - Technology - Artificial Intelligence - Economics - Employment and Work - Finance - Research - Public Policy - Law - Infrastructure - Housing - Transportation - Food Systems - Energy - Security and Safety - Social Services - Humanitarian Assistance - Communications - Media - Community Development - International Cooperation This list should remain extensible. One stakeholder may have several domains. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/stakeholder-partnership-framework.md#13",
      "title": "6. Partnership Roles",
      "path": "docs/institutional/stakeholder-partnership-framework.md",
      "text": "## 6. Partnership Roles An organization should be able to assume one or several partnership roles. Potential roles include: ### Strategic Partner Works with Civizen across multiple programs or domains. ### Founding Institutional Partner Provides significant support during Civizen's formative institutional stage. This title should be used selectively and should not imply ownership. ### Pilot Partner Participates directly in designing or implementing a Civizen pilot. ### Implementation Partner Provides operational capacity necessary to execute a program. ### Research Partner Conducts or supports research relevant to Civizen. ### Academic Partner Provides faculty, students, educational programs, research, facilities, or academic validation. ### Government Partner Provides lawful public-sector collaboration.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/pilot-framework.md#0",
      "title": "Civizen Pilot Framework",
      "path": "docs/institutional/pilot-framework.md",
      "text": "# Civizen Pilot Framework **Status: Working Pilot Framework** **Working Draft 0.1** This document is a **working pilot framework** and an authoritative project reference. It describes proposed pilot types, maturity levels, permission ladders, workspaces, and a future Pilot Portfolio. It does **not** assert that those processes, maturity workflows, workspaces, or portfolio records already exist as operational product features. Proposed pilot mechanisms remain **proposed** until they are established through valid programs, agreements, and applicable law.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/pilot-framework.md#1",
      "title": "Institutional hierarchy",
      "path": "docs/institutional/pilot-framework.md",
      "text": "## Institutional hierarchy This Framework is **subordinate to** the [Civizen Institutional Blueprint](./institutional-blueprint.md). It must operate consistently with the [Civizen Governance Framework](./governance-framework.md) and the [Stakeholder & Partnership Framework](./stakeholder-partnership-framework.md). The institutional family must not be merged.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/pilot-framework.md#2",
      "title": "Institutional hierarchy",
      "path": "docs/institutional/pilot-framework.md",
      "text": "| Document | Role | | --- | --- | | [**Institutional Blueprint**](./institutional-blueprint.md) | What the Civizen institutional system is. | | [**Governance Framework**](./governance-framework.md) | How authority is distributed. | | [**Stakeholder & Partnership Framework**](./stakeholder-partnership-framework.md) | Who Civizen works with and how relationships are structured. | | **Pilot Framework** (this document) | What Civizen tests and implements with those participants, how pilots operate, and how evidence is evaluated. | | [**Founder Transition & Succession Framework**](./founder-transition-succession-framework.md) | How founder authority evolves (functional self-sufficiency; not automatic access removal). | | [**Contributor Framework**](./contributor-framework.md) | Contribution Record design. | | [**Areas, Domains & Participation Framework**](./areas-domains-participation-framework.md) | Shared Area / Domain / Initiative classification. |",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/pilot-framework.md#3",
      "title": "Participant model",
      "path": "docs/institutional/pilot-framework.md",
      "text": "## Participant model A Civizen participant may need to be understood through multiple dimensions: **Person \u2192 Field/Domain \u2192 Organization/Affiliation \u2192 Pilot \u2192 Role** The application should eventually be able to understand what fields a person works in, which organizations they are affiliated with, which pilots they participate in, which role they hold in each pilot, and what information and actions are relevant to those responsibilities. This chain is a **conceptual product model**. It is not implemented as a unified data model in the current application. Existing skills, experience/company fields, business-account linkage, score domains, and roles are related fragments, not a substitute for this chain.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/pilot-framework.md#4",
      "title": "1. Purpose",
      "path": "docs/institutional/pilot-framework.md",
      "text": "## 1. Purpose The Civizen Pilot Framework defines how Civizen should design, assemble, authorize, operate, evaluate, and scale pilot programs. It establishes: - what qualifies as a Civizen pilot; - how pilot opportunities are selected; - how partners are matched to pilots; - how participants are assigned; - how access to developing areas is controlled; - how contributions are recorded; - how evidence is collected; - how success and failure are evaluated; - how governance applies during pilots; - how funding and implementation responsibilities are structured; - and how a successful pilot may progress toward broader implementation. This Framework sits beneath:",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/pilot-framework.md#5",
      "title": "1. Purpose",
      "path": "docs/institutional/pilot-framework.md",
      "text": "1. the [**Institutional Blueprint**](./institutional-blueprint.md); 2. the [**Governance Framework**](./governance-framework.md); 3. the [**Stakeholder & Partnership Framework**](./stakeholder-partnership-framework.md). The Stakeholder & Partnership Framework defines **who Civizen may work with and how those relationships are structured**. The Pilot Framework defines **what Civizen tests with those partners and how the work should be conducted and evaluated**. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/pilot-framework.md#6",
      "title": "2. What Is a Civizen Pilot?",
      "path": "docs/institutional/pilot-framework.md",
      "text": "## 2. What Is a Civizen Pilot? A Civizen pilot is a limited, structured implementation designed to test one or more Civizen systems in a real or sufficiently realistic environment. A pilot should normally test a defined hypothesis, capability, process, institutional arrangement, technology, governance mechanism, service model, or combination of these. A pilot is not merely: - a presentation; - an endorsement; - an announcement; - a partnership memorandum; - a demonstration without evaluation; - or a general commitment to collaborate. A pilot should produce evidence. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/pilot-framework.md#7",
      "title": "3. Purpose of Piloting",
      "path": "docs/institutional/pilot-framework.md",
      "text": "## 3. Purpose of Piloting Civizen pilots should help answer questions such as: - Does the proposed system solve the intended problem? - Can people use it effectively? - Do institutions have sufficient capacity to operate it? - Does the governance model function as intended? - Does the technology work reliably? - Are incentives producing the desired behavior? - Are there unintended consequences? - Can the system operate lawfully? - Is the cost justified by the outcome? - Can the model be replicated or scaled? Pilots should reduce uncertainty before large-scale implementation. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/pilot-framework.md#8",
      "title": "4. Pilot Principles",
      "path": "docs/institutional/pilot-framework.md",
      "text": "## 4. Pilot Principles ### 4.1 Evidence Before Scale Civizen should avoid expanding systems simply because they are attractive conceptually. Major expansion should be supported by evidence. ### 4.2 Small Enough to Learn, Large Enough to Matter A pilot should be limited enough to manage and evaluate but substantial enough to produce meaningful evidence. ### 4.3 Real Participants Where Appropriate Where safe, lawful, and practical, Civizen should test systems with real participants rather than relying entirely on simulations. ### 4.4 No Universal Pilot Civizen should not assume that one pilot design can serve every partner or every domain. Different partners have different: - capabilities; - populations; - jurisdictions; - infrastructure; - funding; - research capacity; - and strategic interests.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/pilot-framework.md#9",
      "title": "4. Pilot Principles",
      "path": "docs/institutional/pilot-framework.md",
      "text": "Civizen should maintain multiple pilot models. ### 4.5 Multi-Stakeholder Collaboration Where useful, pilots should combine complementary institutions rather than depend on one organization to perform every role. ### 4.6 Transparent Learning A pilot should be allowed to fail. Failure should produce useful knowledge rather than pressure to conceal negative results. ### 4.7 Participant Protection No pilot should prioritize experimentation over participant safety, rights, privacy, or informed participation. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/pilot-framework.md#10",
      "title": "5. Pilot Categories",
      "path": "docs/institutional/pilot-framework.md",
      "text": "## 5. Pilot Categories Civizen pilots may operate in many domains. Initial categories may include: - Education - Health - Culture - Responsibility / Governance - Environment - Employment and Work - Skills and Professional Development - Contribution Systems - Community Coordination - Civic Participation - Voting and Elections - Identity and Trust - Artificial Intelligence - Technology Infrastructure - Economic Systems - Financial Systems - Public Services - Research - Institutional Collaboration - Local Community Systems - Environmental Management These categories should remain extensible. One pilot may span several domains. Domain/category classification and **pilot type** (\xA76) answer different questions and must not be collapsed into one field. Domain describes **what field** the pilot concerns. Type describes **what kind of experiment or implementation** it is. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/pilot-framework.md#11",
      "title": "6. Pilot Types",
      "path": "docs/institutional/pilot-framework.md",
      "text": "## 6. Pilot Types Pilots may also be classified by what they primarily test. This type field is independent of the domain/category field in \xA75. ### 6.1 Concept Validation Pilot Tests whether an idea is useful and understandable. ### 6.2 Product Pilot Tests an application feature or system. ### 6.3 Service Pilot Tests delivery of a Civizen-supported service. ### 6.4 Institutional Pilot Tests cooperation between Civizen and one or more institutions. ### 6.5 Governance Pilot Tests participation, proposal, voting, delegation, council, review, or other governance mechanisms.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/pilot-framework.md#12",
      "title": "6. Pilot Types",
      "path": "docs/institutional/pilot-framework.md",
      "text": "Current application civic voting (`/governance/voting`) and governance proposals (`/governance`) are **one possible Governance Pilot / governance mechanism**, not the entirety of Civizen governance. See [`civic-voting-system-design-v0.1.md`](../01-governance/participation/civic-voting-system-design-v0.1.md) and the [Governance Framework](./governance-framework.md). ### 6.6 Research Pilot Tests hypotheses or methodologies. ### 6.7 Community Pilot Tests Civizen systems in a defined local population. ### 6.8 Public-Sector Pilot Tests Civizen systems with government or public institutions. ### 6.9 Economic Pilot Tests incentives, compensation, exchange, funding, contribution, or economic mechanisms. ### 6.10 Infrastructure Pilot Tests technical or institutional infrastructure needed for wider deployment. ### 6.11 Integrated Pilot",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/pilot-framework.md#13",
      "title": "6. Pilot Types",
      "path": "docs/institutional/pilot-framework.md",
      "text": "Tests several Civizen systems together. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/contributor-framework.md#0",
      "title": "Civizen Contributor Framework",
      "path": "docs/institutional/contributor-framework.md",
      "text": "# Civizen Contributor Framework **Status: Working Contributor Framework** **Working Draft 0.1** This document is a **working institutional design** for how contribution is identified, recorded, evidenced, validated, recognized, and connected to responsibility and opportunity. It is **not** adopted public policy, not a compensation formula, and not a product score specification. Proposed recording, validation, and opportunity mechanisms remain **proposed** until they exist as operational product features or separately adopted rules. Compensation and economic participation, if any, remain governed by adopted public policy and separately adopted funding instruments.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/contributor-framework.md#1",
      "title": "Civizen Contributor Framework",
      "path": "docs/institutional/contributor-framework.md",
      "text": "This Framework is **not** published as a primary `/documents` page and does **not** replace [`contributor-participation-and-recognition.md`](../02-policies/institutional/contributor-participation-and-recognition.md) (`/contribute/policy`).",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/contributor-framework.md#2",
      "title": "Institutional hierarchy",
      "path": "docs/institutional/contributor-framework.md",
      "text": "## Institutional hierarchy This Framework is **subordinate to** the [Civizen Institutional Blueprint](./institutional-blueprint.md) (\xA713.2\u201313.3). It must operate consistently with the [Governance Framework](./governance-framework.md), [Stakeholder & Partnership Framework](./stakeholder-partnership-framework.md), [Pilot Framework](./pilot-framework.md), and [Founder Transition & Succession Framework](./founder-transition-succession-framework.md). These documents must not be merged.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/contributor-framework.md#3",
      "title": "Institutional hierarchy",
      "path": "docs/institutional/contributor-framework.md",
      "text": "| Document | Role | | --- | --- | | [**Institutional Blueprint**](./institutional-blueprint.md) | What the Civizen institutional system is. | | [**Governance Framework**](./governance-framework.md) | How authority is distributed. | | [**Stakeholder & Partnership Framework**](./stakeholder-partnership-framework.md) | Who Civizen works with. | | [**Pilot Framework**](./pilot-framework.md) | What Civizen tests with those participants. | | [**Founder Transition & Succession Framework**](./founder-transition-succession-framework.md) | How founder authority evolves. | | **Contributor Framework** (this document) | Institutional design for the Contribution Record, evidence, validation, recognition, responsibility, and opportunity. | Related instruments that must **not** be treated as this Framework:",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/contributor-framework.md#4",
      "title": "Institutional hierarchy",
      "path": "docs/institutional/contributor-framework.md",
      "text": "| Instrument | Role | | --- | --- | | [**Contributor Participation and Recognition Policy**](../02-policies/institutional/contributor-participation-and-recognition.md) | Controlling **adopted public/legal floor** (`/contribute/policy`). | | [`21-contributor-compensation-and-in-kind-framework-v0.1.md`](../04-operations/funding-and-budget/21-contributor-compensation-and-in-kind-framework-v0.1.md) | **Compensation planning** (unapproved). Not the canonical Contributor Framework. | | [`24-investor-return-and-contributor-waterfall-v0.1.md`](../04-operations/funding-and-budget/24-investor-return-and-contributor-waterfall-v0.1.md) \xB7 [`27-founder-investor-and-contributor-participation-policy-v0.1.md`](../04-operations/funding-and-budget/27-founder-investor-and-contributor-participation-policy-v0.1.md) | **Economic/funding planning** (unapproved). | | [Score page spec](../03-platform/scoring-and-reputation/civizen-score-page-reorganization.md) \xB7 [Score tiers](../03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md) | Numerical **product reputation/scoring** \u2014 **current Score model**, evolvable; distinct from the Contribution Record. See [Model Evolution Architecture](../",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/contributor-framework.md#5",
      "title": "1. Purpose",
      "path": "docs/institutional/contributor-framework.md",
      "text": "## 1. Purpose The Civizen Contributor Framework defines how meaningful contribution to Civizen should be: - identified; - recorded; - attributed; - evidenced; - validated; - evaluated; - recognized; - connected to responsibility; - connected to opportunities; - and, where appropriate under separately adopted rules, considered for compensation or economic participation. The Framework applies to contributions made by: - individuals; - organizations; - institutional partners; - professionals; - volunteers; - researchers; - developers; - educators; - public servants; - students; - community participants; - pilot participants; - businesses; - governments; - universities; - nonprofits; - and other contributors. Its purpose is not to convert every human action into a score.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/contributor-framework.md#6",
      "title": "1. Purpose",
      "path": "docs/institutional/contributor-framework.md",
      "text": "Its purpose is to preserve a credible record of who meaningfully helped build, operate, improve, validate, or expand Civizen and what resulted from that contribution. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/contributor-framework.md#7",
      "title": "2. Relationship to Other Institutional Documents",
      "path": "docs/institutional/contributor-framework.md",
      "text": "## 2. Relationship to Other Institutional Documents The Contributor Framework operates beneath the broader institutional architecture. It should be read together with: 1. the [**Institutional Blueprint**](./institutional-blueprint.md); 2. the [**Governance Framework**](./governance-framework.md); 3. the [**Stakeholder & Partnership Framework**](./stakeholder-partnership-framework.md); 4. the [**Pilot Framework**](./pilot-framework.md); 5. the [**Founder Transition & Succession Framework**](./founder-transition-succession-framework.md); 6. the [**Areas, Domains & Participation Framework**](./areas-domains-participation-framework.md). The Institutional Blueprint establishes that Civizen should recognize contribution. This Framework is the canonical detailed source for **Contribution Record design**.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/contributor-framework.md#8",
      "title": "2. Relationship to Other Institutional Documents",
      "path": "docs/institutional/contributor-framework.md",
      "text": "The Governance Framework establishes that contribution may support eligibility for responsibility but must not automatically purchase governance power. The Stakeholder & Partnership Framework establishes that both institutional and individual contributions within partnerships should be recorded. The Pilot Framework establishes that pilot activities should generate contribution evidence. The Areas, Domains & Participation Framework provides the Area/Domain context in which contribution occurred. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/contributor-framework.md#9",
      "title": "3. Core Principle",
      "path": "docs/institutional/contributor-framework.md",
      "text": "## 3. Core Principle Civizen should recognize meaningful contribution wherever it occurs. Contribution may come through: - paid professional work; - unpaid work; - volunteering; - research; - expertise; - institutional collaboration; - technology; - funding; - infrastructure; - knowledge; - implementation; - governance; - review; - community participation; - problem-solving; - innovation; - mentoring; - or other forms of meaningful effort. These forms of contribution are not identical. They should therefore be recorded distinctly rather than collapsed immediately into one universal number. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/contributor-framework.md#10",
      "title": "4. Contribution Is Not Human Worth",
      "path": "docs/institutional/contributor-framework.md",
      "text": "## 4. Contribution Is Not Human Worth Civizen must never imply that a person's contribution record represents their value as a human being. A Contribution Record measures relevant activity within a defined context. It does not measure: - dignity; - moral worth; - personal value; - rights; - human importance; - or entitlement to basic participation in society. A person may contribute little to Civizen and still possess exactly the same fundamental human dignity and rights as anyone else. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/contributor-framework.md#11",
      "title": "5. Contribution Record",
      "path": "docs/institutional/contributor-framework.md",
      "text": "## 5. Contribution Record Civizen should develop a persistent **Contribution Record**. The Contribution Record should preserve sufficient information to understand: - who contributed; - what they contributed; - where; - when; - through which project or institution; - under which role; - whether the activity was paid or unpaid; - what evidence exists; - who validated it; - what responsibility was assumed; - what outcome resulted; - and what impact can reasonably be attributed. The Contribution Record should become an institutional memory system rather than simply an activity counter. This Framework is the canonical detailed source for Contribution Record design. Other institutional documents should link here rather than repeating the full field list. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/contributor-framework.md#12",
      "title": "6. Contribution Record Structure",
      "path": "docs/institutional/contributor-framework.md",
      "text": "## 6. Contribution Record Structure A contribution entry may eventually include fields such as: - contributor; - contributor type; - field/domain; - organization or affiliation; - pilot/program/project; - role; - task or activity; - contribution category; - description; - start date; - end date; - duration; - paid/unpaid status; - contractual scope; - additional contribution beyond paid scope; - evidence; - validator; - validation status; - quality; - responsibility; - difficulty; - uniqueness; - measurable outcome; - impact; - beneficiaries; - dependencies; - collaborators; - attribution share; - conflicts; - recognition; - and later compensation status where applicable. Not every contribution requires every field. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/contributor-framework.md#13",
      "title": "7. Contributor Types",
      "path": "docs/institutional/contributor-framework.md",
      "text": "## 7. Contributor Types Civizen should distinguish at least between: ### Individual Contributors People contributing personally. ### Institutional Contributors Organizations contributing resources, infrastructure, funding, expertise, personnel, access, or implementation capacity. ### Team Contributors Groups whose work cannot reasonably be attributed only to individuals. ### Partner Contributors Individuals or institutions contributing through an established partnership. ### Independent Contributors People contributing without institutional affiliation. One contribution may involve several contributor types simultaneously. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/areas-domains-participation-framework.md#0",
      "title": "Civizen Areas, Domains & Participation Framework",
      "path": "docs/institutional/areas-domains-participation-framework.md",
      "text": "# Civizen Areas, Domains & Participation Framework **Status: Working Areas, Domains & Participation Framework** **Working Draft 0.1** This document is a **working institutional design** for Civizen's shared Area / Domain / Topic / Initiative / Role taxonomy. It does **not** assert that a unified database model, Areas & Pilots Catalog, or taxonomy-governance UI already exist. A minimal public `/areas` V1 landing is implemented separately and is not this Catalog. Do not collapse Area, Domain, Topic/Specialization, Initiative/Program/Pilot, and Role into one category field. Do not automatically elevate Technology, AI, Economics, Law, or Research into new foundational pillars.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/areas-domains-participation-framework.md#1",
      "title": "Civizen Areas, Domains & Participation Framework",
      "path": "docs/institutional/areas-domains-participation-framework.md",
      "text": "Health, Education, Culture, Responsibility, and Environment are Civizen's **current foundational Area model**, originating from the *Mature Humanity* framework. They are **not** permanently immutable. See [Shared Classification & Model Evolution Architecture](../03-platform/model-evolution/shared-classification-and-model-evolution-architecture.md). This Framework is **not** published as a primary `/documents` page. A future public Areas experience should be derived from it.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/areas-domains-participation-framework.md#2",
      "title": "Institutional hierarchy",
      "path": "docs/institutional/areas-domains-participation-framework.md",
      "text": "## Institutional hierarchy This Framework is **subordinate to** the [Civizen Institutional Blueprint](./institutional-blueprint.md). It provides semantic support for the [Pilot Framework](./pilot-framework.md), [Contributor Framework](./contributor-framework.md), [Stakeholder & Partnership Framework](./stakeholder-partnership-framework.md), and [Governance Framework](./governance-framework.md). These documents must not be merged.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/areas-domains-participation-framework.md#3",
      "title": "Institutional hierarchy",
      "path": "docs/institutional/areas-domains-participation-framework.md",
      "text": "| Document | Role | | --- | --- | | [**Institutional Blueprint**](./institutional-blueprint.md) | What the Civizen institutional system is. | | [**Governance Framework**](./governance-framework.md) | How authority is distributed. | | [**Stakeholder & Partnership Framework**](./stakeholder-partnership-framework.md) | Who Civizen works with. | | [**Pilot Framework**](./pilot-framework.md) | What Civizen tests with those participants. | | [**Founder Transition & Succession Framework**](./founder-transition-succession-framework.md) | How founder authority evolves. | | [**Contributor Framework**](./contributor-framework.md) | How contribution is recorded and recognized. | | **Areas, Domains & Participation Framework** (this document) | Shared classification for Areas, Domains, Topics, Initiatives, and Roles. |",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/areas-domains-participation-framework.md#4",
      "title": "Shared semantic model",
      "path": "docs/institutional/areas-domains-participation-framework.md",
      "text": "## Shared semantic model | Term | Meaning | | --- | --- | | **Area** | Broad sphere of human life / civilization-level concern. **Current Foundational Area Model:** Health, Education, Culture, Responsibility, Environment (evolvable; historical continuity required). | | **Domain** | Professional, scientific, technical, institutional, or functional field. Cross-cutting unless philosophy establishes otherwise. | | **Topic / Specialization** | Narrower subject. | | **Initiative / Program / Pilot** | Actual organized work. Initiative = broader undertaking; Program = ongoing organized body of work; Pilot = bounded test; Project = defined deliverable-based work. | | **Role** | What a participant does. | **Responsibility** is the foundational Area. It may be displayed as **Responsibility & Governance** where that improves understanding.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/areas-domains-participation-framework.md#5",
      "title": "1. Purpose",
      "path": "docs/institutional/areas-domains-participation-framework.md",
      "text": "## 1. Purpose The Civizen Areas, Domains & Participation Framework defines the shared classification system through which Civizen organizes: - areas of human activity; - professional and subject domains; - pilots and initiatives; - institutional capabilities; - user expertise and work interests; - contribution opportunities; - governance responsibilities; - working groups; - tasks; - research; - and personalized information access. Its purpose is to prevent each Civizen subsystem from inventing a separate and incompatible taxonomy. The same underlying Areas and Domains should progressively support: **People \u2192 Organizations \u2192 Pilots \u2192 Contributions \u2192 Opportunities \u2192 Governance \u2192 Knowledge** while allowing each subsystem to use the level of detail it actually needs. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/areas-domains-participation-framework.md#6",
      "title": "2. Why a Shared Model Is Necessary",
      "path": "docs/institutional/areas-domains-participation-framework.md",
      "text": "## 2. Why a Shared Model Is Necessary Civizen already contains or proposes multiple classification systems, including: - the five foundational Civizen pillars; - Study domains; - activity domains; - skills; - experience areas; - governance role domains; - pilot categories; - partnership domains; - contribution domains; - professional fields; - and future Areas & Pilots. These systems describe related concepts but are not necessarily identical. Without a shared model, Civizen risks creating situations where:",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/areas-domains-participation-framework.md#7",
      "title": "2. Why a Shared Model Is Necessary",
      "path": "docs/institutional/areas-domains-participation-framework.md",
      "text": "- a user identifies as working in Education but cannot discover Education pilots; - a university is classified as an Education partner but cannot be matched to Education opportunities; - contribution is recorded under one taxonomy while governance eligibility uses another; - Study content uses different categories from professional expertise; - or the same concept appears under multiple incompatible names. This Framework establishes the common semantic layer. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/areas-domains-participation-framework.md#8",
      "title": "3. Core Principle",
      "path": "docs/institutional/areas-domains-participation-framework.md",
      "text": "## 3. Core Principle Civizen should distinguish between: **Area** A broad sphere of human life, need, responsibility, or civilization-level activity. **Domain** A more specific professional, scientific, technical, institutional, or functional field within or across Areas. **Topic / Specialization** A narrower subject within a Domain. **Initiative / Program / Pilot** Actual work being undertaken within one or more Areas and Domains. **Role** What a person or institution does within that work. These concepts should not be collapsed into one universal category field. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/areas-domains-participation-framework.md#9",
      "title": "4. Current Foundational Area Model",
      "path": "docs/institutional/areas-domains-participation-framework.md",
      "text": "## 4. Current Foundational Area Model Civizen's **current foundational Area model**, originating from the *Mature Humanity* framework, is: 1. **Health** 2. **Education** 3. **Culture** 4. **Responsibility** 5. **Environment** These represent broad dimensions of a mature civilization and should remain recognizable across Civizen **until a better structure is legitimately adopted**. They are **not** a permanently immutable ontology and **not** permanently canonical. Civizen may later improve this top-level taxonomy when: - research; - pilots; - contributor experience; - institutional experience; - evidence; - better reasoning; - or legitimate governance demonstrates a better structure. Future evolution may include renaming, reordering, splitting, merging, adding, removing, or reclassifying Areas or Domains.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/areas-domains-participation-framework.md#10",
      "title": "4. Current Foundational Area Model",
      "path": "docs/institutional/areas-domains-participation-framework.md",
      "text": "Historical continuity must be preserved. Records should remain interpretable under the model that existed when they were created. See [Shared Classification & Model Evolution Architecture](../03-platform/model-evolution/shared-classification-and-model-evolution-architecture.md). Product `PILLARS`, score behavior, schemas, and stored values are **not** changed by this Framework.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/areas-domains-participation-framework.md#11",
      "title": "4. Current Foundational Area Model",
      "path": "docs/institutional/areas-domains-participation-framework.md",
      "text": "**Current product note (do not migrate in this documentation task):** `src/lib/constants.ts` `PILLARS` currently uses `education_skills`, `culture_ethics`, `responsibility_reliability`, `environment_community` (short name Community), and `economy_contribution`. That product set is **not** identical to this current foundational Area model (Health is absent; Economy is a pillar; Environment is labeled Community). Score categories (Learning, Experience, Skills, Performance, Contributions) are a third five-way split \u2014 the **current Score model**, also evolvable. Neither the Area model nor live `PILLARS` automatically wins; later architecture should be capable of evaluating and migrating **both**. Do not map Community \u2192 Environment or Economy \u2192 Health merely for compatibility.",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/areas-domains-participation-framework.md#12",
      "title": "5. Responsibility as an Area",
      "path": "docs/institutional/areas-domains-participation-framework.md",
      "text": "## 5. Responsibility as an Area The Responsibility Area includes systems through which individuals and institutions accept responsibility for shared life. It may encompass domains such as: - governance; - civic participation; - law; - justice; - ethics; - public administration; - accountability; - institutional design; - rights and responsibilities; - conflict resolution; - community coordination; - and public decision-making. Where user-facing clarity requires it, Civizen may display this Area as: **Responsibility & Governance** while preserving **Responsibility** as the foundational concept. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/institutional/areas-domains-participation-framework.md#13",
      "title": "6. Cross-Cutting Domains",
      "path": "docs/institutional/areas-domains-participation-framework.md",
      "text": "## 6. Cross-Cutting Domains Some fields do not belong exclusively to one foundational Area. Examples include: - Technology - Artificial Intelligence - Economics - Work and Employment - Finance - Law - Public Policy - Research - Data - Infrastructure - Communications - Design - Security - Logistics - Community Development These should normally function as **cross-cutting Domains** rather than requiring Civizen to create a separate foundational Area for every profession. For example: **Artificial Intelligence** may contribute to: - Health; - Education; - Culture; - Responsibility; - Environment. Likewise, Economics may affect every Area. ---",
      "status": "proposed",
      "priority": 7,
      "kind": "doc"
    },
    {
      "id": "docs/01-governance/funding-and-monetary/civizen-constitutional-tokenomics-governance.md#0",
      "title": "Superseded document",
      "path": "docs/01-governance/funding-and-monetary/civizen-constitutional-tokenomics-governance.md",
      "text": "# Superseded document **Status:** Conditional / Future \xB7 Historical / Superseded \u2014 tokenomics governance is **not adopted**. Activated only if a monetary or token mechanism is expressly chosen under counsel-approved governance. This earlier planning document is not current policy and is no longer published. Current public policy: [`funding-and-financial-integrity.md`](../../02-policies/institutional/funding-and-financial-integrity.md) \xB7 Civizen Public Documents index (`/documents`). See also conditional crypto notes: [`crypto-usdt-treasury-policy-v0.1.md`](./crypto-usdt-treasury-policy-v0.1.md) \xB7 strategy: [`funding-options.md`](./funding-options.md).",
      "status": "historical",
      "priority": 8,
      "kind": "doc"
    },
    {
      "id": "docs/01-governance/constitution/civizen-constitution-v0.1.md#0",
      "title": "Superseded: Civizen Constitution v0.1",
      "path": "docs/01-governance/constitution/civizen-constitution-v0.1.md",
      "text": "# Superseded: Civizen Constitution v0.1 This document has been retitled and replaced by the **Civizen Community Governance Charter**. See: [`docs/02-policies/governance/civizen-community-governance-charter.md`](../../02-policies/governance/civizen-community-governance-charter.md) It is not the articles, bylaws, or legal constitution of an organization or government.",
      "status": "historical",
      "priority": 8,
      "kind": "doc"
    }
  ]
};

// src/lib/assistant/orchestrator.ts
var UNVERIFIED = "I couldn't verify that from Civizen's current project information.";
var SCOPE_REFUSAL = "I can help with Civizen \u2014 what it is, why it exists, how people participate, and how to use this app. Please ask a question about Civizen.";
var GREETING = "Hi! I can help with what Civizen is, why it exists, Contribute, Agreements, governance, Study, Market, and account settings. What would you like to do?";
var GREETING_GUEST = "Hi. I am Civi, your AI assistant. I can answer questions about Civizen \u2014 what it is, why it exists, how people participate, and how to get started.";
function statusPrefix(status) {
  switch (status) {
    case "implemented":
      return "";
    case "experimental":
      return "This is experimental in the current app. ";
    case "in_development":
      return "This is in development and not fully available yet. ";
    case "proposed":
      return "This is part of Civizen's proposed model, but it is not currently implemented in the app. ";
    case "deprecated":
      return "This is no longer available as a current capability. ";
    case "historical":
      return "This is historical / not adopted current policy. ";
    default:
      return "";
  }
}
function distinctiveEnough(query, text) {
  const generic = /* @__PURE__ */ new Set([
    "civizen",
    "nela",
    "app",
    "feature",
    "platform",
    "member",
    "members",
    "can",
    "between",
    "among",
    "through",
    "using",
    "about",
    "into",
    "verify",
    "previous",
    "original",
    "question",
    "answer",
    "follow-up",
    "follow",
    "sure",
    "help",
    "need",
    "please"
  ]);
  const allTerms = tokenize(query);
  const qTerms = allTerms.filter((t) => !generic.has(t));
  if (!qTerms.length) {
    return !allTerms.some((t) => t === "help" || t === "need" || t === "please");
  }
  const hay = new Set(tokenize(text));
  const hits = qTerms.filter((t) => hay.has(t)).length;
  if (hits >= 2) return true;
  return hits >= 1 && hits / qTerms.length >= 0.28;
}
function composeFromRetrieval(retrieval, query, topic) {
  const faq = retrieval.faq[0];
  const cap = retrieval.capabilities[0];
  if (topic === "identity") {
    const identityFaq = retrieval.faq.find((hit) => IDENTITY_FAQ_IDS.has(hit.item.id)) ?? faq;
    if (identityFaq) return identityFaq.item.answer.trim();
  }
  if (topic === "current_capability") {
    const nowFaq = retrieval.faq.find((hit) => hit.item.id === "what_can_i_do_in_civizen_now") ?? faq;
    if (nowFaq) return nowFaq.item.answer.trim();
  }
  const faqRelated = faq ? distinctiveEnough(query, `${faq.item.question} ${faq.item.aliases.join(" ")} ${faq.item.answer}`) : false;
  const capRelated = cap ? distinctiveEnough(query, `${cap.item.name} ${cap.item.description}`) : false;
  if (topic !== "current_capability" && faq && faqRelated && (!cap || !capRelated || retrieval.faq[0].score >= (cap.score ?? 0) * 0.7)) {
    const related = cap && faq.item.capabilityIds.includes(cap.item.id) ? cap.item : null;
    const prefix = related && capRelated ? statusPrefix(related.status) : "";
    return `${prefix}${faq.item.answer}`.trim();
  }
  if (cap && capRelated) {
    const prefix = statusPrefix(cap.item.status);
    const how = cap.item.howTo ? ` ${cap.item.howTo}` : "";
    return `${prefix}${cap.item.description}${how}`.trim();
  }
  if (faq && faqRelated) return faq.item.answer.trim();
  const docs = preferCurrentEvidence(retrieval.documents).filter(
    (d) => distinctiveEnough(query, `${d.chunk.title} ${d.chunk.text}`)
  );
  const current = docs.find((d) => d.chunk.status === "implemented" || d.chunk.priority <= 5);
  if (current) {
    const text = current.chunk.text.replace(/\s+/g, " ").trim();
    return text.length > 420 ? `${text.slice(0, 400).trim()}\u2026` : text;
  }
  if (docs[0]) {
    return `${statusPrefix(docs[0].chunk.status)}${docs[0].chunk.text.replace(/\s+/g, " ").trim().slice(0, 400)}`.trim();
  }
  return UNVERIFIED;
}
function priorClaimConflicts(prior, now) {
  const denial = /not designed for|does not (have|support|offer)|cannot (sign|create)|isn['’]t (a |an |designed)|is not designed|i can only help with civizen-related topics/;
  const affirmation = /\/agreements|market > agreements|\byou can\b|\bopen\b|\bcreate\b|\bsign\b|\bimplemented\b/;
  return denial.test(prior) && affirmation.test(now);
}
function composeVerification(previousClaim, answer) {
  const core = answer.trim();
  if (!previousClaim) return `I re-checked Civizen's current project information. ${core}`;
  const prior = previousClaim.toLowerCase();
  const now = core.toLowerCase();
  if (priorClaimConflicts(prior, now)) {
    return `I re-checked against current Civizen sources and need to correct that. ${core}`;
  }
  const agrees = prior.slice(0, 80) === now.slice(0, 80) || prior.length > 40 && now.includes(prior.slice(0, 40)) || prior.includes("/agreements") && now.includes("/agreements");
  if (agrees) {
    return `Yes. I re-checked the current Civizen project information and the same answer still holds. ${core}`;
  }
  return `I re-checked against current Civizen sources and need to correct that. ${core}`;
}
function prepareNelaTurn(messages, options = {}) {
  const pack = options.pack ?? KNOWLEDGE_PACK;
  const latest = [...messages].reverse().find((m) => m.role === "user");
  const latestText = latest?.content.trim() ?? "";
  const rewritten = resolveConversationalQuery(messages, pack.aliases);
  const resolvedQuery = rewritten.resolvedQuery;
  const searchQuery = rewritten.isVerification && rewritten.previousUserQuestion ? rewritten.previousUserQuestion : resolvedQuery;
  const greeting = isGreetingOnly(latestText);
  const hardship = isPersonalHardshipAsk(latestText);
  const peace = !hardship && isPeaceCooperationAsk(latestText);
  const canned = hardship || peace;
  const inScope = greeting || canned || isRelevantToCivizen(resolvedQuery, messages);
  const topic = classifyAssistantTopic(searchQuery);
  const rawRetrieval = inScope ? retrieveKnowledge(searchQuery, pack, { broaden: rewritten.isVerification, topic }) : { faq: [], capabilities: [], documents: [] };
  const retrieval = {
    faq: topic === "identity" || topic === "current_capability" ? rawRetrieval.faq : rawRetrieval.faq.filter(
      (h) => distinctiveEnough(searchQuery, `${h.item.question} ${h.item.aliases.join(" ")} ${h.item.answer}`)
    ),
    capabilities: rawRetrieval.capabilities.filter(
      (h) => distinctiveEnough(searchQuery, `${h.item.name} ${h.item.aliases.join(" ")} ${h.item.description}`)
    ),
    documents: rawRetrieval.documents.filter((h) => distinctiveEnough(searchQuery, `${h.chunk.title} ${h.chunk.text}`))
  };
  const confidence = retrievalConfidence(retrieval);
  const kinds = classifyRequest(resolvedQuery, latestText, pack);
  const resourcePlan = planResources({
    kinds,
    retrieval,
    confidence,
    isVerification: rewritten.isVerification,
    runtimeData: options.runtimeData
  });
  if (rewritten.isVerification && kinds.includes("civizen_product")) {
    const priorKinds = classifyRequest(searchQuery, searchQuery, pack);
    for (const kind of priorKinds) {
      if (!resourcePlan.kinds.includes(kind)) resourcePlan.kinds.push(kind);
    }
  }
  let usedLearnedMemoryKey = null;
  const learnedHit = !greeting && !canned && !rewritten.isVerification ? pickLearnedMemory(searchQuery, options.learnedMemories, {
    catalogFaqScore: retrieval.faq[0]?.score,
    topic
  }) : null;
  const externalResourcesInvoked = [];
  const invokeKind = shouldInvokeExternalSearch(resourcePlan, latestText);
  if (invokeKind && !canned && !learnedHit && options.externalAdapter?.search) {
    void options.externalAdapter.search(resolvedQuery);
    externalResourcesInvoked.push(invokeKind);
  }
  let groundedAnswer;
  if (hardship) {
    groundedAnswer = PERSONAL_HARDSHIP_REPLY;
  } else if (peace) {
    groundedAnswer = PEACE_COOPERATION_REPLY;
  } else if (!inScope) {
    groundedAnswer = SCOPE_REFUSAL;
  } else if (greeting) {
    groundedAnswer = options.audience === "guest" ? GREETING_GUEST : GREETING;
  } else if (resourcePlan.internalResolution === "requires_runtime_data" && !options.runtimeData) {
    const need = resourcePlan.runtimeDataNeed;
    groundedAnswer = options.audience === "guest" ? "That needs a Civizen account. You can create one from Sign up, then open the relevant page." : `I don't have your personal Civizen records in project knowledge. ${need?.hint ?? "Open the relevant page while signed in."}`;
  } else if (resourcePlan.internalResolution === "insufficient" && kinds.includes("civizen_product") && !kinds.includes("external_world")) {
    groundedAnswer = retrieval.faq.length || retrieval.capabilities.length || retrieval.documents.length ? composeFromRetrieval(retrieval, searchQuery, topic) : `${UNVERIFIED} I can help with related current features if you name one.`;
  } else {
    groundedAnswer = composeFromRetrieval(retrieval, searchQuery, topic);
    if (groundedAnswer === UNVERIFIED && kinds.includes("external_world")) {
      groundedAnswer = "I do not have a Civizen-specific fact for that. I can explain the general topic, separate from current Civizen features.";
    }
  }
  if (learnedHit && resourcePlan.internalResolution !== "requires_runtime_data") {
    groundedAnswer = learnedHit.answer;
    usedLearnedMemoryKey = learnedHit.questionKey;
  }
  if (inScope && !greeting) {
    const shapeQuery = rewritten.isVerification ? rewritten.previousUserQuestion ?? latestText : latestText;
    groundedAnswer = shapeAnswerToQuestion(shapeQuery, groundedAnswer);
  }
  if (rewritten.isVerification && inScope && !greeting && !canned) {
    groundedAnswer = composeVerification(rewritten.previousAssistantClaim, groundedAnswer);
  }
  if (options.runtimeData?.summary && !canned && resourcePlan.internalResolution !== "insufficient") {
    groundedAnswer = `${groundedAnswer}

For your account: ${options.runtimeData.summary}`.trim();
  }
  const retrievedContext = formatRetrievedContext(retrieval, options.runtimeData?.summary);
  const systemPrompt = buildNelaSystemPrompt({
    pack,
    resolvedQuery,
    retrievedContext,
    groundedAnswer,
    resourcePlan,
    isVerification: rewritten.isVerification,
    audience: options.audience
  });
  const prep = {
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
      isVerification: rewritten.isVerification,
      previousUserQuestion: rewritten.previousUserQuestion,
      matchedFaqId: hardship ? PERSONAL_HARDSHIP_FAQ_ID : peace ? PEACE_COOPERATION_FAQ_ID : usedLearnedMemoryKey ? `learned:${usedLearnedMemoryKey}` : retrieval.faq[0]?.item.id ?? null,
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
        sourceFingerprint: pack.meta.sourceFingerprint
      }
    }
  };
  prep.skipLlm = canned || shouldSkipLlm(prep);
  return prep;
}

// src/lib/assistant/interaction-log.ts
function classifyCiviInteractionSource(args) {
  if (args.abused) return "refusal";
  if (!args.prep) return "refusal";
  if (args.prep.isGreeting) return "greeting";
  if (!args.prep.inScope) return "refusal";
  if (args.prep.diagnostics.usedLearnedMemoryKey) return "memory";
  if (args.usedModel) return "model";
  return "knowledge";
}
function shouldRecordCiviInteraction(args) {
  if (args.source === "greeting") return false;
  return args.question.trim().length > 0;
}
function redactSensitiveCiviQuestion(question, abused) {
  if (abused) return "[Blocked]";
  return question.trim();
}
export {
  KNOWLEDGE_PACK,
  classifyCiviInteractionSource,
  classifyRequest,
  isVerificationFollowUp,
  learnedMemoryFromRow,
  prepareNelaTurn,
  redactSensitiveCiviQuestion,
  resolveConversationalQuery,
  reviewLlmAnswerForLearning,
  shouldRecordCiviInteraction
};
