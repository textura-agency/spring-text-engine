// Inspect the line-only block in static-always: log the computed transform &
// opacity of every word slot and its inner Line span at multiple time samples.
import { chromium } from "playwright";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
const page = await ctx.newPage();

await page.goto("http://localhost:5173/");
await page.click(`nav a[href="#static-always"]`);

for (const wait of [50, 200, 600, 1500, 3000]) {
  await page.waitForTimeout(wait - (wait > 50 ? (wait === 3000 ? 1500 : 400) : 0));
  // hacky: just await each delta. Easier: track absolute time below.
}

await page.waitForTimeout(0);
const result = await page.evaluate(() => {
  const blocks = Array.from(document.querySelectorAll("h1.demo, p.demo"));
  const target = blocks[1]; // "The quick brown fox..."
  if (!target) return { error: "no target" };
  const wordSlots = Array.from(target.querySelectorAll(".line-word"));
  return {
    blockText: (target.textContent || "").slice(0, 80),
    rect: target.getBoundingClientRect().toJSON(),
    slots: wordSlots.map((slot, i) => {
      const slotStyle = getComputedStyle(slot);
      const inner = slot.querySelector("span"); // inner Line span
      const innerStyle = inner ? getComputedStyle(inner) : null;
      return {
        i,
        text: slot.textContent,
        slotOverflow: slotStyle.overflow,
        slotTransform: slotStyle.transform,
        slotOpacity: slotStyle.opacity,
        innerTransform: innerStyle?.transform,
        innerOpacity: innerStyle?.opacity,
        innerStyleAttr: inner?.getAttribute("style"),
      };
    }),
  };
});
console.log(JSON.stringify(result, null, 2));

await browser.close();
