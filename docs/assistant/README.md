---
title: Civizen Assistant Knowledge
status: current
canonical: true
last_reviewed: 2026-10-06
---

# Civizen Assistant Knowledge

Civi answers from **this Civizen build**, not from general model memory. Visitors can ask Civi about the project without creating an account. Members also find Civi in Messaging.

## Layout

| Path | Role |
| --- | --- |
| [`civizen-identity.md`](./civizen-identity.md) | Canonical identity, purpose, and one-sentence definition |
| [`civizen-assistant-cheatsheet.md`](./civizen-assistant-cheatsheet.md) | Compact canonical facts for frequent questions |
| `src/lib/assistant/catalog.ts` | Machine-readable capabilities, FAQ, and terminology aliases (data in `catalog-data/`; voting, proposals, notifications, help in `faq-voting.ts` with Armenian and Russian answers in `faq-voting.hy.ts` / `faq-voting.ru.ts`) |
| `src/lib/assistant/language.ts` | Language detection and the Armenian / Russian → English concept lexicon used for scope, retrieval, and topic classification |
| `src/lib/assistant/civi-governance-voting.test.ts` | Regression question set (EN / HY / RU) for the voting, proposal, notification, and help features |
| `src/lib/assistant/learned-memory.ts` | Checked Gemini-answer memory (does not override identity or capabilities) |
| `src/pages/settings/AiAgentSettings.tsx` | Founder development review of Civi questions and replies |
| `src/lib/assistant/generated/knowledge-pack.ts` | Generated searchable index (do not edit by hand) |
| `supabase/functions/messaging-agent-reply/civi-bundle.js` | Bundled retrieval runtime for the Civi edge function |

## Refresh

After changing product behavior, registries, public pages, flows, or assistant-authoritative docs, update the cheat sheet and/or `src/lib/assistant/catalog.ts` in the same session, then:

```bash
npm run assistant:knowledge
```

Knowledge regen also indexes live bottom nav, Contribute lanes, and the pages Civi can link (`CIVI_PAGE_LINKS`).

When Civi gives directions, it should match the question: **Can I** starts with Yes or No, then the path; **How** starts with the page, for example `Open Agreements` (agreements live at `/agreements`; Market is Jobs plus a link to Agreements, and `Earnings` lists the agreements a member is party to). Chat turns those page names into links. Type names in the main answer (General, Partnership / Collaboration, and the rest) also link to New agreement for that type.

CI and `verify:agent-context` fail if the generated pack is stale relative to its sources.

## Languages

English is the canonical knowledge language. For Armenian and Russian, `language.ts` detects the script, maps word stems and whole question forms to the English wording the FAQ uses, and retrieval searches only that English wording (non-Latin tokens never match the pack and would drag overlap ratios down). A FAQ item may carry `localizedAnswers.hy` / `.ru`; when the question's language has one, Civi returns it directly and skips the model. Otherwise the English grounded answer stays the evidence and the system prompt tells the model to reply in the member's language. Greetings and the out-of-scope reply are localized in `LOCALIZED_REPLIES`.

When adding a feature members will ask about, add the FAQ card with hand-written Armenian and Russian answers in the same change, add the natural question forms to `ARMENIAN_QUESTIONS` / `RUSSIAN_QUESTIONS`, and extend `civi-governance-voting.test.ts` with the question in all three languages.

## Audit process

Run realistic questions through `prepareCiviTurn` (the same path the edge function and the public widget use) and check `diagnostics.matchedFaqId`, `inScope`, `skipLlm`, and the grounded answer. The regression suite in `civi-governance-voting.test.ts` is that question set; an answer that falls back to the generic capability blurb, to “I couldn't verify…”, or to the English scope refusal for an Armenian or Russian question counts as a gap to fix at the source (catalog card, FAQ, `CIVI_PAGE_LINKS`, scope terms, lexicon), then `npm run assistant:knowledge`.

## Internal-first routing

Civi uses the closest authoritative resource first:

1. Conversation context
2. Canonical identity (`civizen-identity.md`) for what Civizen is, its purpose, mission, scope, or one-sentence description
3. FAQ / this cheat sheet
4. Capability registry for what is implemented **now**
5. Project knowledge index
6. Authorized runtime / member data
7. Civi memory of **checked** previous model answers (similar questions only; never overrides 2–5)
8. AI reasoning over collected evidence
9. Broader API-agent resources only when the request needs the outside world

Identity questions must not be answered by reconstructing Civizen from feature docs. Capability questions must not be answered with the identity sentence alone.

Someone asking for housing, food, or a safe place tonight is not a Contribute question. Civi acknowledges the situation, says Civizen is not emergency housing, points to local emergency services / 211, and may mention Jobs — not Volunteer lanes.

Peace, war, and “how do we unite humanity” questions are in scope. Answer from founding documents, including the need to unite around shared human responsibility. Unity does not require uniformity. Invite signing up and making a contribution; name Study, Community Challenges, Opportunities, and Governance in ordinary sentences. Do not write “learn in Study”. Do not recap manifesto prose. How-questions do not start with Yes. Do not claim Civizen currently stops wars or is a government.

Civizen product facts stay internal even after escalation. Missing internal evidence does not authorize a generic web/model guess about Civizen. Gemini (or another model) may fill a gap for a general or mixed question; Civi then **checks** that reply before storing it. Invented Civizen capabilities, personal records, and one-off drafts are not remembered.

## Status vocabulary

Capabilities use: `implemented` · `experimental` · `in_development` · `proposed` · `deprecated` · `historical`.

“Civizen supports X” means X is **implemented** in this build.
