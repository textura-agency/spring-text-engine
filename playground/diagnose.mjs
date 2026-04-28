// Headless smoke test: visits each playground tab, samples the computed
// opacity of the first animated letter, and asserts the engine actually
// transitions out of the OUT state.
//
// Modes whose OUT state has opacity:0 should rise to ~1 once playIn fires.
// "static-manual" is expected to stay in OUT until we click the Play In button.
//
// Usage:
//   node diagnose.mjs                  # all tests
//   node diagnose.mjs static-always    # one or more test keys

import { chromium } from "playwright";

const ALL_TESTS = [
  { key: "static-always",     expect: "in"  },
  { key: "static-once",       expect: "in"  },
  { key: "static-forward",    expect: "in"  },
  // Progress mode is scroll-driven: thresholds for words 1+ aren't crossed
  // at progress=0, so we scroll the document to advance progress before sampling.
  { key: "static-progress",   expect: "in", scroll: true },
  { key: "static-manual",     expect: "out", click: 'button:has-text("Play In")', afterClick: "in" },
  { key: "toggled-baseline",  expect: "in"  },
];

const filter = process.argv.slice(2);
const target = filter.length
  ? ALL_TESTS.filter((t) => filter.includes(t.key))
  : ALL_TESTS;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
const page = await ctx.newPage();

async function loadTest(key) {
  await page.goto("http://localhost:5173/");
  await page.click(`nav a[href="#${key}"]`);
  await page.waitForTimeout(50);
}

async function scrollToBottom() {
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
}

async function probeOpacity({ waitMs = 1500 } = {}) {
  // Samples the first AND last .line-word OF THE FIRST .demo block. We scope to
  // the first block because most test pages have additional blocks below the
  // fold that legitimately stay OUT (mode="always"/"forward" only play in-view).
  // First+last (rather than just first) catches the "only-first-word-animates"
  // regression: useSprings' layout-effect re-fires ctrl.start every render and,
  // without ref:, clobbers any imperative api.start whose delay hadn't elapsed
  // yet — so word 0 (delay 0) animates but words 1+ stay STUCK OUT.
  const samples = [];
  for (const wait of [0, 100, 600, 1200, waitMs].sort((a, b) => a - b)) {
    await page.waitForTimeout(wait);
    const data = await page.evaluate(() => {
      const block = document.querySelector(".demo");
      if (!block) return null;
      const words = block.querySelectorAll(".line-word");
      const pick = (el) => {
        const animatedChild = el?.querySelector("*");
        const computed = animatedChild ? getComputedStyle(animatedChild) : null;
        return computed ? +computed.opacity : null;
      };
      return { first: pick(words[0]), last: pick(words[words.length - 1]), n: words.length };
    });
    if (data?.first != null) samples.push(data);
  }
  const max = Math.max(...samples.flatMap((s) => [s.first, s.last]));
  const minSettled = Math.min(samples.at(-1)?.first ?? 0, samples.at(-1)?.last ?? 0);
  return { samples, max, settled: minSettled };
}

let failures = 0;
for (const t of target) {
  await loadTest(t.key);
  if (t.scroll) await scrollToBottom();
  const beforeClick = await probeOpacity();
  const expectedIn = t.expect === "in";
  // For "in", BOTH first and last words must have actually played in. For "out",
  // both must remain at OUT. Using settled (= min of first/last final opacity)
  // catches the regression where last word is STUCK OUT even though first is fine.
  const beforeOk = expectedIn ? beforeClick.settled > 0.5 : beforeClick.max <= 0.05;
  const lastSample = beforeClick.samples.at(-1);
  const beforeStatus = expectedIn
    ? beforeClick.settled > 0.5
      ? "PLAYED IN (first+last)"
      : `STUCK OUT (first=${lastSample?.first?.toFixed(2)}, last=${lastSample?.last?.toFixed(2)})`
    : beforeClick.max <= 0.05 ? "stayed OUT" : "unexpectedly played";
  console.log(`${t.key.padEnd(22)} | n=${lastSample?.n ?? "?"} | ${beforeStatus} ${beforeOk ? "✓" : "✗"}`);
  if (!beforeOk) failures++;

  if (t.click) {
    await page.click(t.click);
    const afterClick = await probeOpacity();
    const afterOk = t.afterClick === "in" ? afterClick.settled > 0.5 : afterClick.max <= 0.05;
    const afterLast = afterClick.samples.at(-1);
    console.log(
      `${" ".repeat(22)} | post-click first=${afterLast?.first?.toFixed(2)} last=${afterLast?.last?.toFixed(2)} ${afterOk ? "✓" : "✗"}`
    );
    if (!afterOk) failures++;
  }
}

await browser.close();

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nAll tests passed.");
