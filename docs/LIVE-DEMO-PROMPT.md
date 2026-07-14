# Live demo prompt

```text
We are doing a live Claudex software-engineering demonstration.

Begin by reporting:

- agent harness;
- harness-visible model label;
- repository;
- current branch;
- available tools.

Do not infer the ultimate backend provider or model from your own runtime metadata. Backend routing is verified externally through the CLIProxyAPI log shown beside this session.

Investigate the issue described in DEMO_BUG.md.

Use parallel subagents for:

1. tracing the request and database execution path;
2. inspecting tests and reproducing the failure;
3. reviewing concurrency and idempotency risks.

Before modifying code, synthesize their findings into one root-cause statement, one proposed remediation, and the regression test that should fail before the fix.

Then add and run the regression test, implement the smallest robust fix, run the relevant checks, ask a fresh subagent to perform an adversarial review of the diff, address valid findings, and finish with concise evidence that the issue is fixed.

Execute the work rather than merely describing commands.
```
