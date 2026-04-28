import TextEngine from "spring-text-engine";

export function StaticForwardMode() {
  return (
    <section>
      <h2>mode="forward" — first block is ABOVE the fold</h2>
      <p>Reload the page with no scroll. Expected: text plays in (it is in view at mount).</p>
      <TextEngine
        tag="h1"
        mode="forward"
        className="demo"
        wordIn={{ y: 0, opacity: 1 }}
        wordOut={{ y: 20, opacity: 0 }}
        wordStagger={40}
        wordConfig={{ duration: 600 }}
      >
        Forward in viewport at mount
      </TextEngine>

      <div className="spacer" />
      <div className="spacer" />

      <h2>mode="forward" — below the fold</h2>
      <p>Scroll down to reveal — should play in on first downward scroll.</p>
      <TextEngine
        tag="h1"
        mode="forward"
        className="demo"
        wordIn={{ y: 0, opacity: 1 }}
        wordOut={{ y: 20, opacity: 0 }}
        wordStagger={40}
        wordConfig={{ duration: 600 }}
      >
        Forward below the fold
      </TextEngine>
    </section>
  );
}
