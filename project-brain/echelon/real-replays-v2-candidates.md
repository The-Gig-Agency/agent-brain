# Echelon — Real Replays v2 Candidates

## Purpose

This file captures the next grounded replay-expansion set mined directly from local private-repo history rather than chat summaries alone.

The goal is not volume. The goal is to widen terrain diversity while keeping each case:

- reproducible to a real commit
- tied to a real changed surface
- usable in the router-visible versus evaluator-only split

## Current Candidate Set

Primary five:

1. `cg-937` — CreatorGift backend
2. `cg-987` — CreatorGift backend
3. `cg-936` — CreatorGift backend
4. `ciq-95356ae` — CIQ automations
5. `acp-8d0c011` — ACP gateway

These were written to:

- `fixtures/echelon/real-replays-v2-candidates.visible.json`
- `fixtures/echelon/real-replays-v2-candidates.evaluator.json`

## Why These Five

### `cg-937`

- delayed decisive evidence
- hidden dependency after create flow
- easy to misread as a narrow attribute bug

### `cg-987`

- stale-state or sequencing ambiguity
- compact surface with operational timing implications
- good anti-broadening case

### `cg-936`

- interacting root causes
- propagation and recalculation across multiple layers
- strong partial-fix risk

### `ciq-95356ae`

- interface-shape mismatch
- incorrect collection and total-field mapping
- clean CIQ handler contract drift case

### `acp-8d0c011`

- deceptive auth symptom
- hidden dependency between gateway and Repo B response format
- good explore-versus-prune discriminator

## CIQ Note

The originally suggested CIQ commit references:

- `f267680`
- `b87f6a8`
- `a7a37e4`

did not resolve after fetching current remote history for the locally cloned repo.

Rather than fabricate those cases, the candidate set currently uses a grounded replacement:

- `ciq-95356ae` — `Fix campaign data mapping`

That keeps terrain diversity without depending on non-resolvable commit references.

## Strong Alternates

If we want the next expansion set to be larger or more deceptive, these looked strong during mining:

- `acp-e7eebcc` — wrong `api-keys-lookup` path causing gateway 401
- `acp-faf5153` — duplicate `/functions/v1` path composition in registry endpoints
- `ciq-6adf83e` — campaign summary report flow with partner-resolution and response-shape ambiguity
- `ciq-7eefd8d` — publisher lookup by Id versus PublisherId mapping mismatch

## Suggested Next Move

Use these five to build a `v0.6c` replay pass that asks:

> does the current replay-routing logic still separate from compact baselines when the real-case set contains more hidden-dependency, propagation, and contract-drift bugs?

Before claiming success on that pass, tighten the visible layer again:

- reduce file-name leakage where possible
- preserve terrain cues instead of repo-specific naming
- keep evaluator truth hidden
