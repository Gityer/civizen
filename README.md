# Civizen

**For a Mature Humanity**

Civizen is a live civic network for voluntary world citizenship, civic learning, trusted participation, governance, cooperation, and the practical development of the Mature Humanity vision.

Today, Civizen is a voluntary, non-governmental platform and does not claim state authority, territorial jurisdiction, or government-recognized citizenship.

Its long-term purpose is to unite people as citizens of humanity and help build the democratic, institutional, technological, and legal foundations through which a complementary, recognized form of planetary citizenship may one day become possible. See the [recognized planetary citizenship pathway](https://civizen.world/about/planetary-citizenship-pathway).

**Try it:** [civizen.world](https://civizen.world)

---

## Why it exists

Humanity lacks a shared civic layer for cooperation across borders — auditable systems that prevent fraud and related harms — while divided institutions often reward rivalry over common interest. Civizen exists to build that complementary layer for world citizenship: software where people can create a Civizen profile, learn shared civic rules, take part in governance within current network scope, and cooperate economically with prototype tools — without depending on a closed proprietary platform, and without claiming that Civizen currently replaces lawful institutions.

It is developed with an open-source orientation and meant to be audited in public, with a staged path toward broader distributed stewardship. Rights to use each component are governed only by the license expressly included with that component.

The longer destination is documented in [From Voluntary World Citizenship to Recognized Planetary Citizenship](https://civizen.world/about/planetary-citizenship-pathway).

---

## What you can do today

Civizen is early access, but already usable:

- **World Citizen profile** — voluntary Civizen profile, trust signals, endorsements (not a government identity)  
- **Study** — Constitution and civic learning paths  
- **Governance** — proposals, audits, and community process within Civizen scope  
- **Market** — listings remain an important entry point to Agreements; Luma appears only as non-transferable prototype credits for demonstration (does not settle transactions; not money or a financial product)  
- **Agreements** — create, review, sign, and manage agreements with people and organizations from Market or another Civizen activity, or start one directly  
- **Messaging** — in-network communication  

Coming next includes broader federation, insurance modules, and iPhone distribution.

---

## Get the Android app

Sideload from civizen.world (APKs are not stored in this repo). The install page always offers the current Live and Testing builds, with in-app updates and a gated Test channel.

| | |
|---|---|
| Scan | ![Android install QR](./docs/04-operations/dev/assets/android-download-qr.png) |
| Or open | [Install page](https://civizen.world/download) |

Prefer **Android Chrome** for the Open / Install prompt. Some in-app browsers only save the file — then open it from notifications or Files.

---

## Origins

Civizen is the software expression of **Mature Humanity** — a civic, peace-oriented framework for world citizenship. The live product is [civizen.world](https://civizen.world).

---

## For contributors & developers

### Run locally

- Node.js **24.18.1+** (current LTS; see `.nvmrc`) and npm **10+**
- Clone, install, start:

```bash
git clone https://github.com/Gityer/civizen.git
cd civizen
npm install
cp .env.example .env   # then fill in the Supabase URL and publishable key
npm run dev
```

For a backend of your own, `scripts/local-supabase/up.sh` starts an isolated local Supabase (Docker) and replays every migration; it prints the URL and keys to put in `.env`. Database regression checks live in `supabase/tests/`.

Or run the dev server in Docker (restarts with Docker; uses the Supabase backend from `.env`). After `npm install`:

```bash
docker compose up -d                       # http://localhost:8080
CIVIZEN_PORT=8090 docker compose up -d     # if 8080 is taken
```

### Technical direction (short)

Local-first identity (DIDs), sync and storage toward P2P/decentralized backends, community governance of upgrades, and a staged path from testing builds to production. Deep architecture notes live under `docs/` — start with [docs/README.md](./docs/README.md) and [Sovereign Architecture](./docs/03-platform/architecture/sovereign-civizen-architecture.md).

### Project conventions

- **Feature registry:** `src/lib/feature-registry.ts` — update registry and Features-page copy together  
- **Autosave** is the default for editable app pages  
- **Android publish:** `npm run update:application` · **iOS:** not set up yet (`@capacitor/ios` is not installed)  
- Ops / release notes: `docs/04-operations/dev/`

### Contributing

Propose changes through the project’s governance process when possible; for code, open a clear PR against `main` with a short why. Prefer small, reviewable diffs. See [CONTRIBUTING.md](CONTRIBUTING.md) for checks to run, and [SECURITY.md](SECURITY.md) to report a vulnerability privately.

---

## Licensing Status Notice

Civizen is developed with an open-source orientation. Rights to use each component are governed only by the license expressly included with that component. See [LICENSE](LICENSE). Trademarks and official identity are excluded unless expressly licensed.

---

*Civizen — For a Mature Humanity*
