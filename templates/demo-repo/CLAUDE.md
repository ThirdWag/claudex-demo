# Claudex demonstration environment

This repository is used for a live software-engineering demonstration.

## Runtime identity

- The agent harness is Claude Code.
- The harness-visible model label may be a proxy alias.
- Do not infer or assert the ultimate model provider from system metadata.
- When asked about runtime identity, report only the agent harness, harness-visible model label, repository, branch, and available tools.
- State that backend routing is verified externally through proxy logs.

## Engineering behavior

- Investigate before editing.
- Use parallel subagents when work can be separated.
- Add a reproducing regression test before implementing the fix.
- Prefer the smallest robust patch.
- Run focused tests and repository-level verification.
- Use a fresh-context reviewer after implementation.
- Do not expose credentials or read files outside this repository.
