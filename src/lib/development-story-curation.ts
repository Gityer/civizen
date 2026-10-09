import type { DevelopmentStory } from '@/lib/development-stories';

/**
 * Reader-facing development journal contract:
 * 1. Infer the main product topic of the conversation.
 * 2. Show a short summarized feature title (stable, grouped where appropriate).
 * 3. List detailed specifications and expected behavior only — omit minor chat,
 *    pure questions ("what do you mean"), acknowledgements ("ok, implement"), etc.
 */
export type CuratedStoryListItem = DevelopmentStory & {
  relatedCount: number;
  featureTitle: string;
  behaviorHighlights: string[];
};

const LOW_SIGNAL_TITLE_PATTERN =
  /^(ok\b|okay\b|yes\b|no\b|what do you mean\b|do you mean\b|i mean\b|now\b|please\b|can you\b|is there\b|says\b|why does\b|help me\b)/i;
const FEATURE_INTENT_PATTERN =
  /(add|fix|remove|update|implement|create|enable|support|improve|refactor|document|configure|set up|integrate|move|toggle|classify|let's\b)/i;
const GENERIC_PROVENANCE_PATTERN =
  /(backfilled from chat transcript|chat transcript|backfilled|from transcript|conversation log|history import)/i;
const CHAT_HISTORY_PREFIX_PATTERN = /^user-requested change captured from chat history:\s*/i;
const CONVERSATIONAL_PREFIX_PATTERN = /^(ok[,:\s-]*|okay[,:\s-]*|i mean[,:\s-]*|now[,:\s-]*|please[,:\s-]*|so[,:\s-]*)/i;
const FEATURE_PROBLEM_PATTERN = /(doesn['’]t work|didn['’]t offer|not offer|broken|error|failed|can['’]t|cannot)/i;
const UX_SCOPE_PATTERN =
  /\b(search|filter|keyword|scroll|scrollbar|apk|capacitor|messaging|chat|emoji|update|preload|prefetch|cold\s+start)\b/i;
/** "implement" alone is often an acknowledgement — require other anchors or longer text. */
const SUBSTANTIVE_TECH_PATTERN =
  /\b(search|keyword|matching|substring|scroll|scrollbar|apk|capacitor|policy|update|fix|remove|add|configure|emoji|nela|gemini|llm|login|auth|profile|message|chat|bot|assistant|currency|deploy|slice|federation|migration|migrations|schema|sql|vps|ssh|nav|icon|icons|decentralization|decentralisation|decentralized|decentralised|preload|prefetch)\b/i;

/** If present, the line is probably a real spec — do not treat as journal “process chatter”. */
const JOURNAL_VALUE_ANCHOR =
  /\b(decentrali|migration|migrations|ssh|vps|fix|implement|bug|preload|prefetch|search|scroll|icon|icons|apk|deploy|schema|nela|policy|navigation|wallet|auth|login|market|study|governance|messaging|supabase|postgres|bundle|capacitor|emoji|llm|gemini|currency|federation|investigate|logging)\b/i;

/** Common transcript typos → canonical tokens for topic grouping and noise rules. */
function normalizeBlobTypoVariants(blob: string): string {
  return blob
    .replace(/\bchunds\b/gi, 'chunks')
    .replace(/\bchuncks\b/gi, 'chunks')
    .replace(/\bcources\b/gi, 'courses')
    .replace(/\bdecentralisaiton\b/gi, 'decentralization')
    .replace(/\bdecentralizaiton\b/gi, 'decentralization');
}

/** Chat preambles that are not the subject of work (strip before titles / summaries). */
function stripOperationalPreamble(s: string): string {
  return s
    .replace(/^move on as per your recommendations\.?\s*(and\s+)?/i, '')
    .replace(/^as per your recommendations,?\s*(and\s+)?/i, '')
    .replace(/^ok,?\s*let'?s\s+(move on|continue)\b[^.]*\.?\s*/i, '')
    .replace(/^now\s+move\s+on\s+to\s+the\s+next\s+slice,?\s*(and\s+)?/i, '')
    .replace(/^(so,?\s*)?can\s+we\s+move\s+on\s+to\s+the\s+next\s+slice[^.!?]*[.!?]?\s*/i, '')
    .replace(/^move\s+on\s*,?\s*with\s+(?:a\s+)?(?:much\s+)?larger\s+ch[\w]*[s]?\b[^.!?]*[.!?]?\s*/i, '')
    .replace(/^move\s+on,?\s+but\s+it'?s\s+not\s+good\s+that[^.!?]*[.!?]?\s*/i, '')
    .trim();
}

function compactText(value: string, max = 120): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}...`;
}

/** Strip list markers duplicated from chat or markdown (UI adds its own bullet). */
function sanitizeJournalTitleForDisplay(title: string): string {
  return title.replace(/^\s*[•\-\u2022\u25CF]+(?:\s*[•\-\u2022\u25CF]+)*[\s.-]*/u, '').replace(/^\s*-\s+/, '').trim();
}

function toSingleLineSummary(value: string): string {
  let normalized = value.replace(CHAT_HISTORY_PREFIX_PATTERN, '').replace(/\s+/g, ' ').trim();
  normalized = sanitizeJournalTitleForDisplay(normalized);
  if (!normalized) return normalized;
  const [firstSentence] = normalized
    .replace(/^\s*[-*]\s*/, '')
    .split(/(?<=[.!?])\s+| - | — /);
  const cleaned = (firstSentence || normalized).replace(CONVERSATIONAL_PREFIX_PATTERN, '').trim();
  return compactText(cleaned);
}

function storyTextBlob(story: DevelopmentStory): string {
  return [story.section, story.area, story.title, story.originalInstruction, story.rephrasedDescription, ...story.createdFeatures]
    .join(' ')
    .toLowerCase();
}

function storyTextBlobForTopics(story: DevelopmentStory): string {
  return normalizeBlobTypoVariants(storyTextBlob(story));
}

/** Process / meta chat that should not count as a story body or summary (original or rephrased). */
function narrativeLineIsNoise(text: string): boolean {
  const stripped = text.replace(CHAT_HISTORY_PREFIX_PATTERN, '').replace(/\s+/g, ' ').trim();
  const core = stripLeadingConversationalNoise(stripped).toLowerCase();
  if (!core) return true;
  const norm = normalizeBlobTypoVariants(core);
  if (JOURNAL_VALUE_ANCHOR.test(norm)) return false;

  if (/\b(can we|could we)\s+move\s+on\s+to\s+the\s+next\s+slice\b/i.test(core)) return true;
  if (/\bso,?\s+can\s+we\s+move\s+on\b.*\b(next\s+slice|slice\s+now)\b/i.test(core)) return true;
  if (/\bmove\s+on\s+to\s+the\s+next\s+slice\b/i.test(core) && core.length < 180) return true;
  if (/\bnext\s+slice\s+now\b/i.test(core)) return true;
  if (/\b(if we'?re\s+done\s+with\s+the\s+previous\s+one)\b/i.test(core)) return true;
  if (/\bmove\s+on,?\s+and\s+at\s+the\s+end\s+of\s+every\s+(report|rerport|repport|reprot)\b/i.test(core)) return true;

  if (/\b(divide\s+(the\s+)?plan\s+into)\b.*\b(chunk|chunks|slice|slices)\b/i.test(norm)) return true;
  if (/\bmove\s+on\s*,?\s*with\s+(?:a\s+)?(?:much\s+)?larger\s+chunks?\b/i.test(norm) && core.length < 190) return true;

  if (/\b(are you asking me|you'?re gonna bring|another excuse)\b/i.test(core) && core.length < 200) return true;
  if (/\bdid\s+you\s+take\s+all\s+necessary\s+measures\b/i.test(core) && !/\b(preload|prefetch|cache|performance|bundle|lazy)\b/i.test(core)) {
    return true;
  }

  if (
    /\b(i\s+just\s+restarted|restarted\s+the\s+application)\b/i.test(core)
    && /\b(failed to connect|couldn'?t connect|wouldn'?t connect|lost connection)\b/i.test(core)
    && core.length < 260
    && !/\b(please\s+fix|investigate|implement|add\s+logging|repro|steps\s+to)\b/i.test(core)
  ) {
    return true;
  }

  return false;
}

/** Repository-only chores (manifest refresh, lint config) — hide from the product journal. */
function isLowSignalRepositoryChoreStory(story: DevelopmentStory): boolean {
  const title = story.title || '';
  const orig = story.originalInstruction || '';
  const rep = story.rephrasedDescription || '';
  const blob = `${title}\n${orig}\n${rep}`.toLowerCase();
  const looksChoreTitle = /^\s*chore:\s*/i.test(title.trim()) || /^\s*chore:\s*/i.test(orig.trim());
  const looksGitRephrase = /implemented repository change:\s*chore:/i.test(rep);
  if (!looksChoreTitle && !looksGitRephrase) return false;

  if (/chore:\s*refresh\b.*\bmanifest\b/i.test(blob) && /\b(android-testing|update manifest)\b/i.test(blob)) return true;
  if (/implemented repository change:\s*chore:\s*refresh/i.test(rep) && /\bmanifest\b/i.test(rep)) return true;
  if (
    /^\s*chore:\s*/i.test(title)
    && /\b(eslint|prettier|lint-staged|husky|lockfile|renovate)\b/i.test(blob)
    && blob.length < 320
  ) {
    return true;
  }
  return false;
}

/** Chat confirmations with no specification — not shown as development stories. */
function isAcknowledgementOnlyStory(story: DevelopmentStory): boolean {
  const strip = (s: string) => s.replace(CHAT_HISTORY_PREFIX_PATTERN, '').replace(/\s+/g, ' ').trim();
  const variants = [strip(story.originalInstruction), strip(story.title), strip(story.rephrasedDescription)].map((s) =>
    s.toLowerCase(),
  );
  const ackOnly = /^ok\b[,.\s-]*implement\.?$/i;
  if (variants.some((v) => ackOnly.test(v))) return true;
  const longest = variants.reduce((m, v) => (v.length > m.length ? v : m), '');
  if (longest.length > 48) return false;
  if (SUBSTANTIVE_TECH_PATTERN.test(longest)) return false;
  if (FEATURE_PROBLEM_PATTERN.test(longest)) return false;
  if (/^(yes|yep|sure|thanks|thank you)\b/i.test(longest) && longest.length < 40) return true;
  return false;
}

function hasSubstantiveOriginalInstruction(story: DevelopmentStory): boolean {
  const o = story.originalInstruction.replace(CHAT_HISTORY_PREFIX_PATTERN, '').replace(/\s+/g, ' ').trim();
  if (o.length < 36) return false;
  if (/^ok\b[,.\s-]*implement\.?$/i.test(o)) return false;
  if (narrativeLineIsNoise(story.originalInstruction)) return false;
  return true;
}

function hasSubstantiveRephrasedDescription(story: DevelopmentStory): boolean {
  const r = story.rephrasedDescription.replace(CHAT_HISTORY_PREFIX_PATTERN, '').replace(/\s+/g, ' ').trim();
  if (r.length < 52) return false;
  if (GENERIC_PROVENANCE_PATTERN.test(r)) return false;
  if (/^ok\b[,.\s-]*implement\.?$/i.test(r)) return false;
  if (narrativeLineIsNoise(story.rephrasedDescription)) return false;
  return true;
}

/** Drop grouped rows that only exist because "implement" matched intent with no real spec. */
function curatedRowHasReaderValue(row: CuratedStoryListItem): boolean {
  if (row.behaviorHighlights.length > 0) return true;
  if (hasSubstantiveOriginalInstruction(row)) return true;
  if (hasSubstantiveRephrasedDescription(row)) return true;
  const meaningfulFeature = row.createdFeatures.some(
    (f) => f.trim().length > 0 && !GENERIC_PROVENANCE_PATTERN.test(f) && !/^source:/i.test(f),
  );
  if (meaningfulFeature) return true;
  return false;
}

function domainFromSection(section: string): string {
  const s = section.toLowerCase();
  if (s.includes('study')) return 'Study';
  if (s.includes('home')) return 'Home';
  if (s.includes('messag')) return 'Messaging';
  if (s.includes('market')) return 'Market';
  if (s.includes('search')) return 'Search';
  if (s.includes('setting')) return 'Settings';
  if (s.includes('governance')) return 'Governance';
  const head = section.split('/')[0]?.trim();
  return head && head.length < 40 ? head : 'Product';
}

type TopicMatch = { groupKey: string; featureTitle: string };

function matchFeatureTopic(story: DevelopmentStory): TopicMatch | null {
  const blob = storyTextBlobForTopics(story);
  const section = story.section.toLowerCase();
  const area = story.area.toLowerCase();

  if (/\b(decentrali[sz]{1,2}ation|decentralized|decentralised|decentrali[sz]e)\b/i.test(blob)) {
    return {
      groupKey: 'development|topic|decentralization',
      featureTitle: 'Decentralization progress and in-app metrics',
    };
  }

  if (
    /\b(failed to connect|couldn'?t connect|wouldn'?t connect|lost connection)\b/i.test(blob)
    && /\b(app|application|restart|restarted)\b/i.test(blob)
    && /\b(please\s+check\s+and\s+fix|check\s+and\s+fix|please\s+fix|fix\s+the\s+issue)\b/i.test(blob)
  ) {
    return {
      groupKey: 'development|topic|app-connectivity-stability',
      featureTitle: 'Fix app connectivity and startup connection failures',
    };
  }

  if (
    /\bstudy\b/i.test(blob)
    && /\b(article|articles)\b/i.test(blob)
    && /\b(open by default|shouldn'?t be open by default|all articles should open|display and function the same way)\b/i.test(blob)
  ) {
    return {
      groupKey: 'development|topic|study-articles-open-state',
      featureTitle: 'Fix Study article open-state and default expansion behavior',
    };
  }

  if (
    (
      /\b(civic learning center|tabs?\s+list)\b/i.test(blob)
      || (/\bcourses?\b/i.test(blob) && /\btab\b/i.test(blob))
    )
    && /\b(study|tabs?|search|remove|clickable|position|repetitive)\b/i.test(blob)
    || (
      /\bclose\s+button\b/i.test(blob)
      && /\b(remove|no additional elements|on the page|study)\b/i.test(blob)
    )
  ) {
    return {
      groupKey: 'development|topic|study-tabs-panel-controls',
      featureTitle: 'Refine Study tabs and panel controls',
    };
  }

  const searchish = /\b(search|keyword|filter|find\b|substring|matching)\b/i.test(blob);

  if (searchish) {
    if (/\bgovern/i.test(story.section)) {
      return {
        groupKey: 'development|topic|governance-search',
        featureTitle: 'Improve Governance search and discovery',
      };
    }
    if (/\bmarket\b/i.test(story.section)) {
      return {
        groupKey: 'development|topic|market-search',
        featureTitle: 'Implement Search in Market',
      };
    }
    if (/\bhome\b/i.test(story.section)) {
      return {
        groupKey: 'development|topic|home-search',
        featureTitle: 'Improve Home search and discovery',
      };
    }
    return {
      groupKey: 'development|topic|study-field-search',
      featureTitle: 'Implement Search functionality in Study',
    };
  }

  const scrollish = /\b(scroll|scrollbar|scrolling)\b/i.test(blob);
  if (scrollish) {
    const messagingContext =
      section.includes('messag') ||
      /\b(messaging|open chat|chat on|conversation|message thread|dm)\b/i.test(blob);
    if (messagingContext) {
      return {
        groupKey: 'development|topic|messaging-scroll',
        featureTitle: 'Improve Messaging chat scrolling',
      };
    }
    return {
      groupKey: 'development|topic|scroll-without-visible-scrollbar',
      featureTitle: 'Improve scrolling without visible scrollbars',
    };
  }

  if (section.includes('messag') || blob.includes('messaging')) {
    if (/\b(emoji|whatsapp|click|selected|select\b|3-dot|three-dot|nela|conversation)\b/i.test(blob)) {
      return {
        groupKey: 'development|topic|messaging-conversation-ui',
        featureTitle: 'Improve Messaging conversation UI and actions',
      };
    }
  }

  if (
    /\b(persistent\s+ssh|ssh\s+access|set\s+up\s+.{0,48}\bssh\b|ssh\s+tunnel|bastion\s+host)\b/i.test(blob)
    || (/\bis there a way\b/i.test(blob) && /\bssh\b/i.test(blob) && /\b(vps|server|remote|persistent)\b/i.test(blob))
  ) {
    return {
      groupKey: 'development|topic|vps-ssh-access',
      featureTitle: 'Persistent SSH access for server operations',
    };
  }

  if (
    /\b(migration|migrations)\b/i.test(blob)
    && (/\b(vps|ssh|supabase|postgres|database|schema|remote|apply)\b/i.test(blob) || /\bapply the migration\b/i.test(blob))
  ) {
    return {
      groupKey: 'development|topic|db-migration-ops',
      featureTitle: 'Apply database migrations on the VPS',
    };
  }

  if (
    /\b(icon|icons)\b/i.test(blob)
    && /\b(messaging|market|contribute|home)\b/i.test(blob)
    && /\b(swap|replace|takes up more space|layout|bottom nav|navigation|nav bar|shell|pages|places)\b/i.test(blob)
  ) {
    return {
      groupKey: 'development|topic|shell-nav-icons',
      featureTitle: 'Refine bottom navigation and app shell icons',
    };
  }

  if (
    /\b(apk|capacitor|mobile device|play store|in-app update|offer to update|testing version|update policy)\b/i.test(blob)
    || (/\bmobile\b/i.test(blob) && /\b(update|apk)\b/i.test(blob))
  ) {
    return {
      groupKey: 'development|topic|mobile-updates',
      featureTitle: 'Ship mobile builds and in-app update flow',
    };
  }

  if (/\b(agents?\s+rule|ag\.md|agents\.md|testing and production apk|both testing)\b/i.test(blob)) {
    return {
      groupKey: 'development|topic|agent-release-workflow',
      featureTitle: 'Strengthen agent rules and release workflow',
    };
  }

  if (/\b(nela|gemini|openai|self[- ]?hosted|api key|\bai key\b|llm)\b/i.test(blob)) {
    return {
      groupKey: 'development|topic|nela-ai',
      featureTitle: 'Configure Civi AI assistant and model hosting',
    };
  }

  if (
    /\b(i'?m not talking about|not talking about)\b.*\b(agent|chats with the agent)\b/i.test(blob) &&
    /\b(user|users|people).*\b(message|messaging|calls?)\b/i.test(blob)
  ) {
    return {
      groupKey: 'development|topic|messaging-user-vs-agent',
      featureTitle: 'Separate user messaging from agent chat experiences',
    };
  }

  if (
    /\b(chat\s*bot|chatbot)\b/i.test(blob)
    || (/\bai agent\b/i.test(blob) && /\b(user|users|people|citizen)\b/i.test(blob) && /\b(chat|question|answer)\b/i.test(blob))
    || (/\b(chat|assistant)\b/i.test(blob) && /\b(project|app|civizen)\b/i.test(blob) && /\b(question|answer|help)\b/i.test(blob))
  ) {
    return {
      groupKey: 'development|topic|project-ai-assistant',
      featureTitle: 'Add in-app AI assistant for project Q&A',
    };
  }

  if (/\b(currency unit|civic currency|economic unit|stablecoin|mint|federation.*coin)\b/i.test(blob)) {
    return {
      groupKey: 'development|topic|currency-economics',
      featureTitle: 'Define currency and economic units',
    };
  }

  if (/\b(production\/testing|testing wording|wordings on the application)\b/i.test(blob)) {
    return {
      groupKey: 'development|topic|channel-labels',
      featureTitle: 'Refine production vs testing channel labeling',
    };
  }

  if (
    /\b(founder|founder\s+access)\b/i.test(blob)
    && /\b(citizens?|departments?)\b/i.test(blob)
    && /\b(access|permission|authorities|privileges?|functionality|develop|improve|manage)\b/i.test(blob)
  ) {
    return {
      groupKey: 'development|topic|governance-founder-access',
      featureTitle: 'Governance: Founder access and Citizen or Department roles',
    };
  }

  if (
    /\bdevelopment\s+stories\b/i.test(blob)
    && /\b(remove|rename|move|wording|sentence|subtitle|label|tab|heading)\b/i.test(blob)
    && /\b(requests|implemented|implement|outcomes|document|documente|explanative|helper|copy)\b/i.test(blob)
  ) {
    return {
      groupKey: 'development|topic|home-stories-stream-copy',
      featureTitle: 'Refine Home Stories tab labels and helper copy',
    };
  }

  if (/\b(preload|prefetch|warm\s*start|startup\s+performance)\b/i.test(blob)) {
    return {
      groupKey: 'development|topic|preload-performance',
      featureTitle: 'Improve app preload and startup performance',
    };
  }

  return null;
}

/** Process check-in, not a spec line — keep journal summary on the curated feature title. */
function isVaguePreloadFollowUpQuestion(line: string): boolean {
  const s = line.trim();
  return /^did you take all necessary measures\b/i.test(s) && /\bpreload\b/i.test(s.toLowerCase());
}

function isReaderUsefulHighlight(line: string): boolean {
  const t = line.trim();
  if (t.length < 30) return false;
  if (isVaguePreloadFollowUpQuestion(t)) return false;
  if (narrativeLineIsNoise(t)) return false;
  if (GENERIC_PROVENANCE_PATTERN.test(t)) return false;
  if (/^(ok\b|okay\b)\s*[,.-]?\s*implement\s*$/i.test(t)) return false;
  if (/^since it now started answering/i.test(t)) return false;
  if (/^let's move on\b/i.test(t)) return false;
  if (/^is there any other ai agent\b/i.test(t)) return false;
  if (/\b(let'?s make a plan|out of your recommendations|start implementing it)\b/i.test(t.toLowerCase())) return false;
  if (/\b(move on as per your recommendations|as per your recommendations)\b/i.test(t.toLowerCase()) && t.length < 160) {
    if (!/\b(migration|migrations|ssh|vps)\b/i.test(t.toLowerCase())) return false;
  }
  const tl = t.toLowerCase();
  if (/\b(you\s+)?didn'?t\s+move\s+on\b/i.test(tl) && t.length < 140) return false;
  const tln = normalizeBlobTypoVariants(tl);
  if (/\bmove\s+on\s*,?\s*with\s+(?:a\s+)?(?:much\s+)?larger\s+chunks?\b/i.test(tln)) return false;
  if (/\b(divide\s+(the\s+)?plan\s+into)\b.*\b(chunk|chunks|slice|slices)\b/i.test(tln)) return false;

  if (/^(what|why|how|can you|could you|do you mean|is there|are there)\b/i.test(t)) {
    const hasAnchor =
      FEATURE_INTENT_PATTERN.test(t) || FEATURE_PROBLEM_PATTERN.test(t) || SUBSTANTIVE_TECH_PATTERN.test(t);
    if (!hasAnchor || t.length < 55) return false;
  }

  if (LOW_SIGNAL_TITLE_PATTERN.test(t) && t.length < 72) return false;

  return true;
}

function fingerprintFallback(story: DevelopmentStory): string {
  const raw = story.originalInstruction.replace(CHAT_HISTORY_PREFIX_PATTERN, '').trim();
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|a|an|to|for|and|or|of|on|in|with|it|is|are|be)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 72);
  return `${story.storyKind}|${story.section}|${story.area}|${slug}`;
}

/** When no topic rule matches, derive a readable title from the instruction (not "Implement changes in General"). */
function proposeTitleFromInstruction(story: DevelopmentStory): string | null {
  if (isMetaOrProcessOnlyStory(story)) return null;
  if (isPlanningAgreementOnlyStory(story)) return null;

  let raw = stripOperationalPreamble(
    stripLeadingConversationalNoise(
      story.originalInstruction.replace(CHAT_HISTORY_PREFIX_PATTERN, '').replace(/\s+/g, ' ').trim(),
    ),
  );
  raw = sanitizeJournalTitleForDisplay(raw);
  if (raw.length < 24) return null;

  const trimmed = raw.trim();
  const whyKeepShowing = trimmed.match(
    /^why\s+does\s+it\s+keep\s+(?:displaying|showing)\s+(.+?)\??$/i,
  );
  if (whyKeepShowing?.[1]) {
    return compactText(`Fix recurring UI message: ${whyKeepShowing[1].trim()}`, 96);
  }
  const whyShort = trimmed.match(/^why\s+(does|do|is|are)\s+(.+?)\??$/i);
  if (whyShort?.[2] && trimmed.length < 130) {
    return compactText(`Resolve: ${whyShort[2].trim()}`, 96);
  }

  if (raw.length < 42) return null;

  raw = raw
    .replace(/^(can we|could we|should we|would it be possible to|i would like to|we need to|we should)\s+/i, '')
    .replace(/^(i'?d like to|i want to|please)\s+/i, '')
    .trim();
  if (raw.length < 36) return null;

  let t = raw;
  const q = t.indexOf('?');
  if (q > 0 && q < 180) {
    t = t.slice(0, q).trim();
  }
  if (t.length < 36) t = raw.slice(0, 140).trim();

  t = t.charAt(0).toUpperCase() + t.slice(1);
  return compactText(t, 96);
}

function stripLeadingConversationalNoise(s: string): string {
  return s
    .replace(/^\s*i mean\b[,.\s-]*\s*/i, '')
    .replace(CONVERSATIONAL_PREFIX_PATTERN, '')
    .trim();
}

/** Git / workflow / status-only — not product stories for the journal. */
function isMetaOrProcessOnlyStory(story: DevelopmentStory): boolean {
  const coreRaw = stripLeadingConversationalNoise(
    story.originalInstruction.replace(CHAT_HISTORY_PREFIX_PATTERN, '').replace(/\s+/g, ' ').trim(),
  );
  const core = coreRaw.toLowerCase();
  if (!core) return false;
  const coreNorm = normalizeBlobTypoVariants(core);
  if (/\bdecentrali|decentralized|decentralised\b/i.test(coreNorm)) return false;

  if (
    /\b(you\s+)?didn'?t\s+move\s+on\b/i.test(core)
    && !/\b(decentrali|migration|migrations|ssh|vps|search|schema|fix\s|bug\b|apk|scroll|icon)\b/i.test(coreNorm)
  ) {
    return true;
  }

  if (narrativeLineIsNoise(story.originalInstruction)) return true;

  if (!core || core.length > 220) return false;
  if (SUBSTANTIVE_TECH_PATTERN.test(core) && core.length > 70) return false;

  if (/^(is this|are we)\b[^.]{0,120}\bfully implemented\b/i.test(core)) return true;
  if (/what'?s the next logical slice/i.test(core)) return true;
  if (/\b(let'?s|let us)\s+(commit|push)\b/i.test(core)) return true;
  if (/\b(commit and push|push to origin|open a pr|create a pr|merge this)\b/i.test(core)) return true;
  if (/\b(commit,?\s*push,?\s*build and ship|build and ship the updated version of the application)\b/i.test(core)) {
    return true;
  }
  if (/^(thanks|thank you|sounds good|got it|perfect|great)\b/i.test(core) && core.length < 90) return true;

  return false;
}

/** Meta planning / agreement — no concrete product spec (e.g. "let's make a plan… then implement"). */
function isPlanningAgreementOnlyStory(story: DevelopmentStory): boolean {
  const coreRaw = stripLeadingConversationalNoise(
    story.originalInstruction.replace(CHAT_HISTORY_PREFIX_PATTERN, '').replace(/\s+/g, ' ').trim(),
  );
  const core = coreRaw.toLowerCase();
  if (!core) return true;
  const norm = normalizeBlobTypoVariants(core);
  if (/\bdecentrali|decentralized|decentralised\b/i.test(norm)) return false;
  if (core.length > 160) return false;
  if (core.length > 100 && SUBSTANTIVE_TECH_PATTERN.test(core)) return false;

  if (
    /\b(let'?s make a plan|make a plan out of your recommendations|out of your recommendations and start|start implementing it)\b/i.test(
      core,
    )
  ) {
    return true;
  }
  if (/^(ok\b|okay\b),?\s*let'?s make a plan\b/i.test(core)) return true;
  if (/^let'?s make a plan\b/i.test(core) && core.length < 140) return true;
  if (/\b(let'?s|we should)\s+(sync up|touch base|align offline)\b/i.test(core) && core.length < 100) return true;

  if (/\b(divide\s+(the\s+)?plan\s+into)\b.*\b(chunk|chunks|slice|slices)\b/i.test(norm)) return true;
  if (/\bmove\s+on\s*,?\s*with\s+(?:a\s+)?(?:much\s+)?larger\s+chunks?\b/i.test(norm) && core.length < 190) return true;

  if (/\b(can we|could we)\s+move\s+on\s+to\s+the\s+next\s+slice\b/i.test(core)) return true;
  if (/\bso,?\s+can\s+we\s+move\s+on\b.*\b(next\s+slice|slice\s+now)\b/i.test(core)) return true;
  if (/\bmove\s+on\s+to\s+the\s+next\s+slice\b/i.test(core) && !JOURNAL_VALUE_ANCHOR.test(normalizeBlobTypoVariants(core))) {
    return true;
  }
  if (/\b(if we'?re\s+done\s+with\s+the\s+previous\s+one)\b/i.test(core)) return true;
  if (/\bmove\s+on,?\s+and\s+at\s+the\s+end\s+of\s+every\s+(report|rerport|repport|reprot)\b/i.test(core)) {
    return true;
  }

  if (
    /\b(move on as per your recommendations|as per your recommendations)\b/i.test(core)
    && !/\b(migration|migrations|schema|sql|vps|ssh|supabase|database)\b/i.test(core)
  ) {
    return true;
  }

  return false;
}

function normalizeHighlightFingerprint(s: string): string {
  return s.replace(CHAT_HISTORY_PREFIX_PATTERN, '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
}

/** Collapse near-duplicate lines (same sentence pasted into title, original, rephrased). */
function dedupeHighlightLinesOrdered(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    if (!isReaderUsefulHighlight(line)) continue;
    const k = normalizeHighlightFingerprint(line);
    if (k.length < 22) continue;
    let dup = false;
    for (const kept of out) {
      const kk = normalizeHighlightFingerprint(kept);
      if (k === kk) {
        dup = true;
        break;
      }
      const shorter = k.length <= kk.length ? k : kk;
      const longer = k.length > kk.length ? k : kk;
      if (longer.includes(shorter) && shorter.length >= longer.length * 0.82) {
        dup = true;
        break;
      }
    }
    if (!dup) out.push(line);
  }
  return out.slice(0, 10);
}

function extractBehaviorNotes(story: DevelopmentStory): string[] {
  const out: string[] = [];
  for (const raw of [story.originalInstruction, story.rephrasedDescription, story.title]) {
    let s = stripOperationalPreamble(
      stripLeadingConversationalNoise(raw.replace(CHAT_HISTORY_PREFIX_PATTERN, '').replace(/\s+/g, ' ').trim()),
    );
    if (!s || GENERIC_PROVENANCE_PATTERN.test(s)) continue;
    if (/^ok\b[,.\s-]*implement\s*$/i.test(s)) continue;
    if (isPlanningAgreementOnlyStory({ ...story, originalInstruction: s } as DevelopmentStory)) continue;
    if (s.length < 20) continue;

    if (/^what do you mean/i.test(s)) {
      const afterHow = s.match(/\bhow\s+(.+)/i);
      if (afterHow?.[1] && afterHow[1].length > 28) {
        s = afterHow[1].replace(/^(the|a|an)\s+/i, '').trim();
      } else {
        const afterThat = s.match(/\bthat\s+(.+)/i);
        if (afterThat?.[1] && afterThat[1].length > 28) s = afterThat[1].trim();
      }
    }

    if (LOW_SIGNAL_TITLE_PATTERN.test(s) && s.length < 48) continue;

    const line = compactText(s, 220);
    if (isReaderUsefulHighlight(line)) out.push(line);
  }
  return dedupeHighlightLinesOrdered(out);
}

function mergeUniqueHighlights(existing: string[], incoming: string[]): string[] {
  return dedupeHighlightLinesOrdered([...existing, ...incoming]);
}

export function isFeatureStory(story: DevelopmentStory): boolean {
  if (isMetaOrProcessOnlyStory(story)) return false;
  if (isPlanningAgreementOnlyStory(story)) return false;
  if (isAcknowledgementOnlyStory(story)) return false;
  if (isLowSignalRepositoryChoreStory(story)) return false;

  const candidates = [story.title, story.rephrasedDescription, ...story.createdFeatures, story.originalInstruction]
    .map((candidate) => toSingleLineSummary(candidate))
    .filter(Boolean);

  return candidates.some((candidate) => {
    if (GENERIC_PROVENANCE_PATTERN.test(candidate)) return false;
    if (FEATURE_PROBLEM_PATTERN.test(candidate)) return true;
    if (UX_SCOPE_PATTERN.test(candidate) && candidate.length >= 28) return true;
    if (FEATURE_INTENT_PATTERN.test(candidate)) {
      if (/^ok\b[,.\s-]*implement\b/i.test(candidate)) return false;
      if (candidate.length < 28 && !SUBSTANTIVE_TECH_PATTERN.test(candidate)) return false;
      return true;
    }
    return false;
  });
}

export function buildCuratedStoryList(stories: DevelopmentStory[]): CuratedStoryListItem[] {
  const grouped = new Map<string, CuratedStoryListItem>();

  for (const story of stories) {
    if (isMetaOrProcessOnlyStory(story)) continue;
    if (isPlanningAgreementOnlyStory(story)) continue;
    if (isAcknowledgementOnlyStory(story)) continue;
    if (isLowSignalRepositoryChoreStory(story)) continue;
    if (!isFeatureStory(story)) continue;

    const topic = matchFeatureTopic(story);
    const groupKey = topic?.groupKey ?? fingerprintFallback(story);
    const rawFeatureTitle =
      topic?.featureTitle ??
      proposeTitleFromInstruction(story) ??
      (() => {
        const domain = domainFromSection(story.section);
        const blob = storyTextBlob(story);
        if (FEATURE_PROBLEM_PATTERN.test(blob)) return `Fix issues in ${domain}`;
        if (FEATURE_INTENT_PATTERN.test(blob)) {
          return compactText(`Ship product updates in ${domain}: ${story.area}`, 96);
        }
        return compactText(`${story.section}: ${story.area} — ongoing improvements`);
      })();
    const featureTitle = sanitizeJournalTitleForDisplay(rawFeatureTitle);

    const notes = extractBehaviorNotes(story);
    const existing = grouped.get(groupKey);

    if (!existing) {
      grouped.set(groupKey, {
        ...story,
        title: featureTitle,
        featureTitle,
        behaviorHighlights: notes,
        relatedCount: 1,
      });
      continue;
    }

    existing.relatedCount += 1;
    existing.createdFeatures = Array.from(new Set([...existing.createdFeatures, ...story.createdFeatures]));
    existing.behaviorHighlights = mergeUniqueHighlights(existing.behaviorHighlights, notes);

    if (new Date(story.requestedAt) > new Date(existing.requestedAt)) {
      const { relatedCount, behaviorHighlights, featureTitle: ft } = existing;
      Object.assign(existing, story);
      existing.relatedCount = relatedCount;
      existing.behaviorHighlights = behaviorHighlights;
      existing.featureTitle = ft;
      existing.title = ft;
    }
  }

  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      behaviorHighlights: dedupeHighlightLinesOrdered(row.behaviorHighlights),
    }))
    .filter(curatedRowHasReaderValue)
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
}

/** One paragraph for the expanded story header when DB fields are still chat-shaped. */
export function buildReaderFacingSummary(row: CuratedStoryListItem): string {
  if (row.behaviorHighlights.length > 0) {
    const first = row.behaviorHighlights[0];
    if (!narrativeLineIsNoise(first)) return first;
  }
  const r = stripOperationalPreamble(
    row.rephrasedDescription.replace(CHAT_HISTORY_PREFIX_PATTERN, '').replace(/\s+/g, ' ').trim(),
  );
  if (/^did you take all necessary measures\b/i.test(r.trim())) {
    return row.featureTitle;
  }
  if (
    r.length > 36
    && !GENERIC_PROVENANCE_PATTERN.test(r)
    && !/^ok\b[,.\s-]*implement\.?$/i.test(r)
    && !narrativeLineIsNoise(row.rephrasedDescription)
  ) {
    return r;
  }
  const o = stripOperationalPreamble(
    stripLeadingConversationalNoise(row.originalInstruction.replace(CHAT_HISTORY_PREFIX_PATTERN, '').trim()),
  );
  if (o.length > 36 && !narrativeLineIsNoise(row.originalInstruction)) return o;
  return row.featureTitle;
}

/** True when rephrased text adds detail beyond Summary / highlights (avoid triple repetition in UI). */
export function rephrasedAddsUniqueDetail(row: CuratedStoryListItem): boolean {
  const summaryNorm = normalizeHighlightFingerprint(buildReaderFacingSummary(row));
  const r = stripOperationalPreamble(
    row.rephrasedDescription.replace(CHAT_HISTORY_PREFIX_PATTERN, '').replace(/\s+/g, ' ').trim(),
  );
  if (r.length < 40) return false;
  if (GENERIC_PROVENANCE_PATTERN.test(r)) return false;
  const rNorm = normalizeHighlightFingerprint(r);
  if (!rNorm || rNorm === summaryNorm) return false;
  if (rNorm.includes(summaryNorm) && rNorm.length <= summaryNorm.length + 12) return false;
  for (const h of row.behaviorHighlights) {
    if (normalizeHighlightFingerprint(h) === rNorm) return false;
  }
  return true;
}

const EXPECTED_BOILERPLATE_PREFIX =
  /^this change should be visible in app behavior and aligned with the request:\s*/i;

export function expectedBehaviorAddsUniqueDetail(row: CuratedStoryListItem): boolean {
  const e = row.expectedBehavior.replace(/\s+/g, ' ').trim();
  if (e.length < 50) return false;
  if (!EXPECTED_BOILERPLATE_PREFIX.test(e)) return true;
  const rest = e.replace(EXPECTED_BOILERPLATE_PREFIX, '').trim();
  const summaryNorm = normalizeHighlightFingerprint(buildReaderFacingSummary(row));
  if (normalizeHighlightFingerprint(rest) === summaryNorm) return false;
  for (const h of row.behaviorHighlights) {
    if (normalizeHighlightFingerprint(h) === normalizeHighlightFingerprint(rest)) return false;
  }
  return true;
}

export function originalInstructionAddsUniqueDetail(row: CuratedStoryListItem): boolean {
  const cleaned = stripOperationalPreamble(
    stripLeadingConversationalNoise(
      row.originalInstruction.replace(CHAT_HISTORY_PREFIX_PATTERN, '').replace(/\s+/g, ' ').trim(),
    ),
  );
  if (cleaned.length < 40) return false;
  const oNorm = normalizeHighlightFingerprint(cleaned);
  const summaryNorm = normalizeHighlightFingerprint(buildReaderFacingSummary(row));
  if (oNorm === summaryNorm) return false;
  for (const h of row.behaviorHighlights) {
    if (oNorm === normalizeHighlightFingerprint(h)) return false;
  }
  return true;
}

/** Extra refinements beyond the single-line Summary (avoid repeating the same sentence 3×). */
export function behaviorHighlightsBeyondSummary(row: CuratedStoryListItem): string[] {
  const sn = normalizeHighlightFingerprint(buildReaderFacingSummary(row));
  return row.behaviorHighlights.filter((h) => normalizeHighlightFingerprint(h) !== sn);
}

/** Substrings that must never appear in a curated feature title (regression guard). */
export const JOURNAL_TITLE_BANNED_SUBSTRINGS = [
  'move on as per your recommendations',
  "let's make a plan out of your recommendations",
  'user-requested change captured from chat history',
] as const;

export function featureTitleLooksUnclear(title: string): boolean {
  const t = title.toLowerCase();
  return JOURNAL_TITLE_BANNED_SUBSTRINGS.some((b) => t.includes(b));
}
