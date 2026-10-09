---
title: Messaging calls — signalling and relay
status: current
version: 0.1
date: 2026-10-09
canonical: true
---

# Messaging calls: signalling and relay

Voice and video calls in Messaging are peer-to-peer WebRTC. This page is the contract for how the two
browsers find each other (signalling) and how media gets through restrictive networks (TURN relay).

## Signalling: private inbox per member

- Every signed-in member subscribes to one private Realtime channel, topic `call-inbox:<own profile id>`
  (`callInboxTopic()` in `src/lib/call-signalling.ts`), opened with `{ config: { private: true } }`.
- A signal (invite, join, offer, answer, ICE candidate, decline, hangup) is **sent to the recipient's
  inbox**, never broadcast. `createCallSignalSender()` keeps one outbox channel per recipient and drops any
  signal that names no recipient.
- Authorisation is row-level security on `realtime.messages` (migrations `20261009100000` and
  `20261009100100`): a member reads only their own inbox; a member may write to another member's inbox only
  when the two share a private conversation (`can_signal_call_inbox()`).
- The former shared public topic `messaging-calls` is gone. Group calls are not offered in the UI until real
  group conversations exist (plan Phase 7.3), because a group invite has no roster to route to.
- Contract tests: `supabase/tests/call_signalling_inbox_test.sql`, `src/lib/call-signalling.test.ts`.

## Relay: TURN credentials from the server

- Before an outgoing call and before accepting one, the client asks the `turn-credentials` edge function
  for ICE servers (`fetchRtcConfiguration()`); STUN defaults are always kept, TURN entries are appended.
  Without a configured relay the function returns an empty list and calls work as before (STUN only, which
  fails on symmetric NAT and many mobile networks).
- Only signed-in members may ask; credentials are short-lived when a coturn shared secret is configured.
- Operator setup (functions container environment):

| Variable | Meaning |
| --- | --- |
| `TURN_URLS` | comma-separated, e.g. `turn:relay.civizen.world:3478,turns:relay.civizen.world:5349` |
| `TURN_SHARED_SECRET` | coturn `static-auth-secret`; username `<expiry>:<user id>`, credential `base64(HMAC-SHA1)` |
| `TURN_TTL_SECONDS` | lifetime of derived credentials, default 3600 |
| `TURN_USERNAME` / `TURN_CREDENTIAL` | static credentials when no shared secret is used |

Provisioning the relay itself (coturn on the VPS with UDP 3478 and a relay port range, or a hosted TURN
provider) is an operations decision tracked in AyMe; nothing in the app changes when it lands.

## Local verification

`scripts/local-supabase/replay-migrations.sh` applies `*_realtime_policies.sql` as `supabase_admin`
(see `local-supabase.md`). The SQL test exercises the policies the way Realtime evaluates them
(`realtime.topic()` from the session setting).
