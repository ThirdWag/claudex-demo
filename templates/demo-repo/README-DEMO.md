# Claudex concurrency demo

This deliberately incomplete service creates customers from an HTTP-shaped request. The baseline suite passes, but the production symptom in `DEMO_BUG.md` is not covered.

Useful commands:

```bash
bun run test:demo
git diff
```

The repository is disposable. The outer environment's `demo-reset` command restores the immutable baseline tag.
