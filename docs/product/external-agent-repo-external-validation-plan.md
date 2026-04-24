# External Agent Repo-External Validation Plan

## Purpose

This document defines the next validation stage after AFAL's packaging and release surfaces are in place.

The goal is to move from:

- internally accepted external-agent sandbox

to:

- externally validated external-agent sandbox

This is not another internal demo.
It is a controlled validation pass where someone outside the AFAL implementation loop consumes AFAL with only the published external surface.

---

## What This Stage Is Testing

This stage answers one question:

- can a different engineer consume AFAL from outside the implementation repo without hidden context

More specifically, it tests whether:

- the standalone pilot kit is sufficient
- the onboarding docs are sufficient
- the auth/signing model is understandable enough for sandbox use
- callback registration is clear
- payment and resource request flows are externally comprehensible
- the current release and handoff artifacts are usable in practice

It does not test:

- real funds
- real provider billing
- production auth
- production deployment
- multi-tenant production operations

---

## Stage Entry Criteria

Do not start the repo-external validation round until all of these are true:

1. `npm run test:mock` is green
2. `npm run accept:external-onboarding` is green
3. `npm run validate:external-agent-pilot-release-surfaces` is green
4. the standalone pilot kit and handoff docs are up to date
5. one specific validation owner on the AFAL side is assigned
6. one specific external engineer or partner contact is assigned

Recommended preflight:

```bash
npm run typecheck
npm run test:mock
npm run accept:external-onboarding
npm run validate:external-agent-pilot-release-surfaces
```

---

## Validation Modes

There are two valid ways to run this stage.

### Mode A: Directed Internal Handoff

Use this when:

- AFAL team is working with one named engineer
- AFAL team is willing to provision a live sandbox bundle
- the priority is learning friction quickly

Use artifact:

- internal handoff artifact

Reference:

- [external-agent-pilot-release-quickstart.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-agent-pilot-release-quickstart.md)

### Mode B: Public Release-Safe Consumption

Use this when:

- AFAL team wants to validate the public package surface itself
- the recipient should not receive a live signing key through the package
- provisioning happens separately

Use artifact:

- public release-safe package

Reference:

- [external-agent-pilot-release-handbook.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-agent-pilot-release-handbook.md)

Mode A is the recommended first pass.
Mode B becomes more important once AFAL starts using GitHub Releases as a real external distribution channel.

---

## Required Inputs For The External Engineer

The external engineer should receive only:

1. one AFAL sandbox base URL
2. one release artifact or handoff package
3. one provisioned bundle or equivalent env values
4. the engineer-facing docs

The external engineer should not need:

- internal runtime module knowledge
- internal test harnesses
- hidden fixture assumptions
- internal OpenRouter pilot scripts
- direct help interpreting raw repo internals

If they need those, the stage has not passed.

---

## Execution Plan

Before starting any round, fill:

- [external-agent-validation-round-checklist.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-agent-validation-round-checklist.md)

### Phase 1. Distribution

AFAL team sends:

- either the internal handoff package or the public release-safe package
- the appropriate message template
- the expected validation deadline
- the findings template

Recommended docs to include:

- [external-engineer-message-template.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-engineer-message-template.md)
- [external-engineer-pilot-handoff.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-engineer-pilot-handoff.md)
- [external-agent-sandbox-onboarding.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-agent-sandbox-onboarding.md)
- [external-agent-validation-round-checklist.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-agent-validation-round-checklist.md)
- [external-pilot-findings-template.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-pilot-findings-template.md)

### Phase 2. External Execution

The external engineer should attempt, in order:

1. standalone setup
2. callback receiver startup
3. callback registration
4. callback readback
5. payment request
6. resource request
7. callback observation if callbacks arrive during the run

They should not be coached through implementation details during the first pass.
Clarifying missing input values is allowed.
Explaining repo internals is not the point of the stage.

### Phase 3. Findings Collection

AFAL team should collect:

- raw command outputs
- one callback payload if available
- the engineer's friction notes
- environment metadata
- whether the engineer was blocked

Use:

- [external-pilot-findings-template.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-pilot-findings-template.md)

### Phase 4. Triage

Every finding should be classified into:

- onboarding/docs
- auth/signing
- callback registration
- request or response shape
- sample kit
- operator packaging
- release distribution

Then assign:

- severity
- owner
- whether it must be fixed before another external round

---

## Evidence Required

The stage is not complete without this evidence:

1. callback registration output
2. callback readback output
3. payment command output
4. resource command output
5. one callback payload sample if observed
6. external engineer friction report
7. filled findings template

Optional but useful:

- video or screen recording of the first run
- the exact package or tag the engineer used
- the exact provisioned bundle identifier or client ID

---

## Pass / Fail Criteria

### Pass

Mark the round as `passed` when all of these are true:

- the external engineer completes the intended flow from outside the main repo
- no hidden internal repo knowledge is required
- no critical findings remain unresolved
- the engineer says the current AFAL boundary is understandable enough to wrap later in their own runtime

### Passed With Friction

Mark the round as `passed-with-friction` when:

- the engineer completes the flow
- but major onboarding or packaging friction remains
- and the AFAL team would want fixes before scaling the same experience to more users

This is the most likely outcome for the next immediate round.

### Blocked

Mark the round as `blocked` when:

- the engineer cannot complete the flow
- or needs hidden internal context to proceed
- or the package / docs / provisioning data are not sufficient to finish the pilot

Blocked rounds should produce a small fix list before the next external attempt.

---

## Stage Exit Criteria

AFAL can claim **externally validated external-agent sandbox** only when:

1. at least one external engineer finishes a full repo-external run
2. the result is either `passed` or `passed-with-friction`
3. all critical findings are fixed
4. the fixes are reflected in docs or package surface
5. the AFAL team can repeat the process without ad hoc internal rescue steps

Stronger exit criterion for the next maturity level:

- two independent external engineers succeed on separate runs

That stronger criterion is not required for the first external validation claim, but it is the right target after the first pass lands.

---

## After The First External Round

Once the first external validation round is complete, choose one of these paths:

1. If the result is `passed`:
   promote the repo status narrative to externally validated sandbox and start planning a starter SDK/client layer.

2. If the result is `passed-with-friction`:
   fix the top 3 friction points, then repeat one more round before changing the stage claim.

3. If the result is `blocked`:
   do not claim external validation yet; fix the blocked items first.

---

## Relationship To Current Stage

Today, the repo already has:

- release-safe packaging
- internal handoff packaging
- CI release-surface guardrails
- operator release docs

That means the packaging side is no longer the main missing piece.

The next real uncertainty is external usability.
That is why this stage should now be treated as the primary next milestone.
