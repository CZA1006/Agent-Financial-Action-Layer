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
  the extracted handoff directory or release tarball contents only
- docs:
  docs/product/external-engineer-pilot-handoff.md
  docs/product/external-agent-sandbox-onboarding.md
  docs/product/external-agent-repo-external-validation-plan.md
  docs/specs/external-agent-auth-contract.md
  docs/specs/receiver-settlement-callback-contract.md

Do not run this validation from inside the AFAL monorepo root.
If the package you received still lives next to `backend/`, `agents/`, or other AFAL implementation directories, stop and report that immediately.
If the handoff tarball itself is missing or was never actually delivered to your machine, stop immediately and report that as a blocker.

Environment bundle:
AFAL_BASE_URL=<fill>
AFAL_CLIENT_ID=<fill>
AFAL_SIGNING_KEY=<fill>
AFAL_MONETARY_BUDGET_REF=<fill>
AFAL_RESOURCE_BUDGET_REF=<fill>
AFAL_RESOURCE_QUOTA_REF=<fill>
AFAL_PAYMENT_CALLBACK_URL=<fill>
AFAL_RESOURCE_CALLBACK_URL=<fill>

Additional prerequisite:
- you need one public HTTPS callback URL for your local callback receiver
- `cloudflared` is preferred because it works without an account flow
- `ngrok` is acceptable, but may require a verified account and configured authtoken
- if no working tunnel tool is available in your environment, report that before attempting callback registration

Expected workflow:
1. `cd pilot`
2. run `npm install`
3. run `npm run preflight`
4. start the callback receiver with `npm run callback:receiver`
5. expose the callback receiver through a public HTTPS tunnel with `npm run tunnel:start`
6. update `AFAL_PAYMENT_CALLBACK_URL` and `AFAL_RESOURCE_CALLBACK_URL` in `../.env`
7. run `npm run callbacks:register`
8. run `npm run callbacks:get`
9. run `npm run payment`
10. run `npm run resource`

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
- the exact artifact / tarball / commit you used
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
3. confirm the handoff tarball or extracted directory has actually been delivered to the engineer in a known path
4. confirm the engineer has a tunnel tool plan for callback exposure
5. confirm the callback URL in the bundle matches the engineer’s local receiver plan
6. confirm the engineer does not need hidden context from `agents/test-harness/`

If the external engineer gets blocked, do not immediately jump into implementation details.
First determine whether the blocker came from:

- missing onboarding context
- bad provisioning data
- auth/signing confusion
- callback registration friction
- unclear request or response shapes

That distinction is the whole point of this pilot.
