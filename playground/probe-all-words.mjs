// One-shot probe: visits each playground tab and reports the settled
// opacity of EVERY .line-word, not just the first. The original
// diagnose.mjs samples els.slice(0, 1), which masks the "only the first
// word animates" bug.
import { chromium } from "playwright";

const TESTS = [
  "static-always",
  "static-once",
  "static-forward",
  "static-progress",
  "toggled-baseline",
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
const page = await ctx.newPage();

for (const key of TESTS) {
  await page.goto("http://localhost:5173/");
  await page.click(`nav a[href="#${key}"]`);
  // Scroll bottom to trigger inView for below-fold blocks, then back to top
  // to let any forward/once blocks settle. Stagger settles in <2s.
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);
  const blocks = await page.$$eval("h1.demo, p.demo", (els) =>
    els.map((root) => {
      const words = Array.from(root.querySelectorAll(".line-word"));
      return {
        text: (root.textContent || "").slice(0, 60),
        opacities: words.map((w) => {
          const child = w.querySelector("*");
          return child ? +getComputedStyle(child).opacity : null;
        }),
      };
    })
  );
  console.log(`\n== ${key} ==`);
  for (const b of blocks) {
    const o = b.opacities;
    const animated = o.filter((v) => v != null && v > 0.5).length;
    console.log(`  "${b.text}"`);
    console.log(`    n=${o.length} animated=${animated} opacities=[${o.map((v) => v == null ? "·" : v.toFixed(2)).join(", ")}]`);
  }
}

await browser.close();
