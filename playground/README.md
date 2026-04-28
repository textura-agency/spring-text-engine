# Playground

Vite app that consumes the local TextEngine source (via the alias in
`vite.config.ts`) to exercise the engine in a browser and run a headless
smoke test.

## Run interactively

```bash
cd playground
npm install
npm run dev
```

Then open <http://localhost:5173/> and click between the test tabs.

## Run the headless smoke test

The dev server must be running first.

```bash
node diagnose.mjs                  # all tests
node diagnose.mjs static-always    # one or more test keys
```

Each test renders a TextEngine in a specific mode, samples the computed
opacity of the first animated letter at several intervals, and asserts the
spring transitions out of its OUT state. `static-manual` stays in OUT
until the test clicks the Play In button.

## Adding a test

1. Create `src/tests/MyScenario.tsx`.
2. Register it in `src/main.tsx` (`TESTS` map) with a stable key.
3. (Optional) add it to `ALL_TESTS` in `diagnose.mjs` with the expected
   pre/post-click state so the headless run covers it.

## Why this exists

When the engine misbehaves it is almost always a state-and-effect timing
problem (when `playIn` fires, what `inView` / `lines.length` / `played` are,
how react-spring re-applies updates). Reproducing those bugs in a parent
app is slow; the playground gives a known-clean tree, the smoke test
catches regressions in seconds, and the per-mode tabs let you visually
verify a fix before shipping.
