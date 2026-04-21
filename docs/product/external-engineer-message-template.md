# External Engineer Message Template

Use this template when sending the AFAL sandbox pilot to an external engineer.

It is intentionally short, direct, and operational.

---

## Copy-Paste Message

```text
Hi — I’d like you to test the current AFAL external-agent sandbox boundary from an external-consumer point of view.

Important constraint:
Please do not write a fresh agent runtime first.
For the first pass, use only the standalone pilot scripts and command line flow.

What I’m asking you to validate:
1. whether the external-consumer onboarding is clear
2. whether auth/signing is clear
3. whether callback registration is clear
4. whether payment/resource request flows are understandable
5. whether the current public surface feels like something you could later wrap in your own agent runtime

What to use:
- standalone kit:
  samples/standalone-external-agent-pilot/
- docs:
  docs/product/external-engineer-pilot-handoff.md
  docs/product/external-agent-sandbox-onboarding.md
  docs/specs/external-agent-auth-contract.md
  docs/specs/receiver-settlement-callback-contract.md

Environment bundle:
AFAL_BASE_URL=<fill>
AFAL_CLIENT_ID=<fill>
AFAL_SIGNING_KEY=<fill>
AFAL_MONETARY_BUDGET_REF=<fill>
AFAL_RESOURCE_BUDGET_REF=<fill>
AFAL_RESOURCE_QUOTA_REF=<fill>
AFAL_PAYMENT_CALLBACK_URL=<fill>
AFAL_RESOURCE_CALLBACK_URL=<fill>

Expected workflow:
1. copy `.env.example` to `.env`
2. run `npm install`
3. run `npm run callback:receiver`
4. run `npm run callbacks:register`
5. run `npm run callbacks:get`
6. run `npm run payment`
7. run `npm run resource`

Please send back:
1. output from `callbacks:register`
2. output from `callbacks:get` or `callbacks:list`
3. output from `payment`
4. output from `resource`
5. one callback payload example, if received
6. a short friction report

Recommended friction report format:
Step:
What I tried:
What was confusing:
What I expected:
Suggested fix:

Also please summarize:
- your OS
- Node version
- whether anything blocked you completely
- the top 3 fixes you would want before using AFAL as a real dependency

The main thing I care about is not whether you can hack around issues.
I care about whether the current AFAL boundary is actually clear enough to consume from outside the implementation repo.
```

---

## Notes For AFAL Team

Before sending the message:

1. confirm the AFAL sandbox is reachable
2. confirm the client bundle is correct
3. confirm the callback URL in the bundle matches the engineer’s local receiver plan
4. confirm the engineer does not need hidden context from `agents/test-harness/`

If the external engineer gets blocked, do not immediately jump into implementation details.
First determine whether the blocker came from:

- missing onboarding context
- bad provisioning data
- auth/signing confusion
- callback registration friction
- unclear request or response shapes

That distinction is the whole point of this pilot.
