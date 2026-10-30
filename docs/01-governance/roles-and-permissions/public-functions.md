# Public functions: one planet-wide model, existing structures mapped onto it

Status: built 2026-10-29 (migration `20261029120000_public_functions.sql`), in review. Owner direction 2026-10-29: "No country should be first, because we're building a system that should put the Planet Earth and all of its World Citizens first. The only thing that we should consider when it comes to different countries and nations, is how to efficiently integrate existing structures to Civizen by improving everything that already exists." The rule is recorded in `docs/04-operations/dev/AGENTS.md` §3.

## Why one model, not a copy of every government

Every place on Earth performs the same public functions (roads, water, health, schools, safety, elections, courts, social support and so on), but each organises them into different bodies at different levels, and those bodies are renamed, merged and split all the time. Copying every structure would never be complete or current; replacing them would cut members off from the bodies that actually act. So Civizen keeps one model of **functions** for the whole planet and maps each place's existing **bodies** onto it. The model is complete from the first day; the mapping grows place by place, wherever members are.

## Model

The backbone is the UN **Classification of the Functions of Government (COFOG)**: the standard governments everywhere already use to report what they do (UN Statistics Division, 1999; also used by the IMF and OECD). It has 10 divisions and their groups. COFOG classifies spending, so it folds some services people deal with directly into broad groups; Civizen lists those separately as **marked Civizen additions** inside the right division. Every division also has a **catch-all**, so nothing falls outside the model.

| Part | Where | What |
| --- | --- | --- |
| Division | `public_function_divisions` | The 10 COFOG divisions, plus "Civizen itself" (Member Support) and "Not sure which" (Public Liaison Lead). Each division has its liaison position |
| Function | `public_functions` | 87 functions: 50 COFOG groups (with their code, for example `04.5` transport), 26 Civizen additions (for example digital government, IT and cybersecurity; data protection; elections; civil registration and identity documents; migration and citizenship; consumer protection; financial regulation; emergency response; mental health) and 11 catch-alls. Each has a description and keywords for suggesting it from a Matter's text |
| Solutions categories | `solution_authorities.function_key` | The 37 Solutions categories keep working and point to the function they belong to |
| Liaison | `org_positions` in the Public Liaison unit | One liaison per COFOG division under the Public Liaison Lead. Liaisons act for Civizen on the Matters they carry |
| Body | `public_bodies` | A real body anywhere (international, national, regional, local), placed with the scope codes Matters use (`global`, country, region, locality), with its official request channel, legal answer deadline, and the official source it was checked against |
| Mapping | `public_body_functions` | Which functions a body performs there (with an optional coverage note, for example "state highways only") |

The model is reviewed like any other part of Civizen's governance: a function can be added, split or merged by the Public Liaison Lead's decision, recorded in that position's journal.

## Rules

- **Planet first.** A global-scope Matter routes to a planetary (international) body when one is mapped. No country, language or region is a default.
- **Sources, then verification.** Any signed-in member or position proposes a body with an `https` official source (`propose_public_body`, at most 10 a day). The proposal opens a review item for the liaison of its first function. Only that liaison (or whoever answers for it) verifies or rejects it, with a note (`review_public_body`). Only verified bodies are public or used for routing.
- **Routing.** `route_public_function(function, place)` returns the most local verified body that performs the function (locality, then region, then country, then global), or the function's liaison when none is mapped.
- **Matters.** On the Matter form, "A public authority" addresses the Matter to Civizen, suggests the function from the keywords in the text, and shows who will receive it. After submission, `set_matter_public_route` records the function and body on the Matter, closes Member Support's triage item and gives the liaison an item to deliver it through the body's official channel (or to find the right office first). Liaison positions act for Civizen on the Matter.
- **Improving what exists.** Because every body is mapped onto the same functions, gaps (a function no body performs in a place), overlaps (several bodies claim it) and unclear responsibility become visible. That is the material for proposals to improve existing structures through Civizen's governance, rather than replacing them.

## After routing

Built 2026-10-30 (migration `20261030100000_public_delivery_offices_coverage.sql`):

- **Delivery and answers.** Whoever works the division's liaison (or the body's office) records delivery on the Matter page, with the body's reference (`record_public_delivery`). The answer is due within the body's legal deadline, or 30 days when none is recorded. The answer is recorded with an outcome (resolved, answered, redirected, refused) and shown on the Matter (`record_public_answer`); the Matter's position items close with it. If the liaison mapped the body only after the Matter was raised, it attaches it first (`assign_matter_public_body`).
- **Deadlines.** A daily job (`process_public_delivery_deadlines`, pg_cron `37 6 * * *`) marks answers overdue, tells the initiator, and gives the Public Liaison Lead an item that names the oversight body mapped for the place (the "Audit, ombudsman and anti-corruption" function) as the next step.
- **Offices held by officials.** On a body's page (`/organisation/public/body/:id`), an official asks for their office's seat with evidence (`request_public_office`). The division's liaison approves it from the queue (`approve_public_office`): a position for the office is created under the liaison and the official is appointed. Matters routed to that body then go to the office's queue, and the delivery is recorded at once. Offices of public bodies never act for Civizen.
- **Coverage.** For any place, `public_coverage` lists every function as covered, a gap (no body mapped) or an overlap (several bodies at the same level); `/organisation/public` shows it. This is the evidence for improving existing structures.
- **City service-request systems.** A body whose channel is `service_request_api` stores `<endpoint>|<service code>` (Open311 GeoReport v2). The `public-delivery-open311` edge function submits the Matter there and records the city's request id as the reference; "Check the request's status" reads it back, and a closed request records its notes as the answer. Only https endpoints on public hosts are called; API keys per host come from `OPEN311_API_KEYS`. CI tests it against a local mock city with `OPEN311_ALLOW_PRIVATE_HTTP=1`, which must never be set in production.

## Not built yet

- Mapping real bodies: it needs official sources, which this environment cannot reach yet.
- Locations on Matters (coordinates or street addresses): cities' service-request systems prefer them; the place's codes are sent as the address for now.
