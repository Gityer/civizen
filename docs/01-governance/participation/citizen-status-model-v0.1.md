---
content_id: citizen-status-model-v0-1
title: Citizen Status Model v0.1
content_category: policy
moderation_lane: moderated
content_type: policy_document
professional_domain: governance
contribution_policy: staff_only
owner_role: founder
review_status: draft
---

# Citizen Status Model v0.1

These status layers describe Civizen's present network. They are designed both for current participation and as building blocks for the project's longer-term planetary-citizenship mission. No present status alone creates public-law citizenship.

## 1. Status Layers

Civizen should distinguish among:

1. Registered Member
2. Verified Member
3. Citizen
4. Active Citizen
5. Governance-Eligible Citizen

## 2. Registered Member

A registered member has signed up and may use ordinary member features, but has no governance rights.

## 3. Verified Member

A verified member has passed identity and contact verification. Verification strengthens trust standing but does not itself create citizenship or governance power.

## 4. Citizen

A citizen is a verified member who has remained signed up long enough to be reviewed and who has accepted Civizen's internal civic framework. Citizenship may arise after 30 days automatically or after 14 days through eligible manual acceptance.

## 5. Active Citizen

An active citizen is a citizen whose civic standing is active because published participation and program-readiness criteria for the relevant Civizen scope have been recognized under the Community Readiness and Program Availability Framework. Active status currently operates within Civizen and does not by itself create legal or governmental authority. It may help measure participation and institutional maturity relevant to future, separately authorized recognition processes.

## 6. Governance-Eligible Citizen

A governance-eligible citizen is an active, verified citizen who also satisfies the minimum Civizen score, good-standing, device trust, and any required training or certification needed for governance rights.

A minimum score, if used, is an **eligibility** condition in this draft model. It must not be treated as a rule that a single numeric contribution or Civizen score determines voting power. See the [Working Governance Framework](../../institutional/governance-framework.md) §§25–26.

## 6a. Implementation (2026-10-09)

`profiles.citizenship_status` carries the layer (`registered_member` → `verified_member` → `citizen`), separate from `profiles.role`. The daily job `citizenship_promotion_tick` promotes a verified member to citizen 30 days after `citizenship_review_cleared_at`, or 14 days after it when `civic_framework_accepted_at` is set (the member accepts the framework under Settings > Edit Profile > Civic status; `accept_civic_framework`). `my_civic_status` returns the layers and the due date; `is_eligible(profile, scope)` is the one eligibility service (scopes participate, vote_countable, propose, publish, governance). Active citizen and governance-eligible remain separate flags.

## 7. Badge Principle

Verified, Citizen, Active, and Governance Eligible should remain separate badges so that users and institutions can understand status clearly. Founder, where shown, should be a distinct office badge rather than a replacement for these civic states.
