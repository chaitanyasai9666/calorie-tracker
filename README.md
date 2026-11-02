# Plate Count

A calorie and fiber tracker: AI meal estimates with calorie ranges, one-dish logging, saved foods, a daily calorie calculator, streaks with milestones, a weekly exercise plan, and a nightly day rating.

- **Full app (AI, account sync):** https://claude.ai/artifact/P9kMCvqEeaHG7XyetYwfem
- **GitHub Pages copy:** deployed by CI on every push to `main`. It runs without Claude, so AI estimates are off and data stays in your browser.

## Files

- `calorie-tracker.html` — the whole app (the artifact page).
- `scripts/build.mjs` — wraps the page into `dist/index.html` for GitHub Pages.
- `tests/` — smoke tests that load the page in jsdom and run its built-in self-checks.
- `.github/workflows/ci.yml` — runs tests on every push and pull request, then deploys `main` to GitHub Pages.

## Develop

```bash
npm install
npm test
```
