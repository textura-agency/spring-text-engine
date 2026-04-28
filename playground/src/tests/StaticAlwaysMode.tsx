import TextEngine from "spring-text-engine";

/**
 * Reproduces: a "clean" page with no parent state changes.
 *
 * Expected: the text fades in once the element is on screen — `mode="always"`
 * is the default, `enabled` defaults to `true`, and there is no toggle.
 */
export function StaticAlwaysMode() {
  return (
    <section>
      <h2>mode="always" — no parent state, no enabled toggle</h2>
      <TextEngine
        tag="h1"
        className="demo"
        letterIn={{ y: 0, opacity: 1 }}
        letterOut={{ y: 30, opacity: 0 }}
        letterStagger={30}
        letterConfig={{ duration: 600 }}
      >
        Hello world this is a static <span style={{color: 'red'}}>test!</span>
      </TextEngine>

      <div className="spacer" />

      <h2>mode="always" with line layer only</h2>
      <TextEngine
        tag="h1"
        className="demo"
        lineIn={{ y: "0%", opacity: 1 }}
        lineOut={{ y: "100%", opacity: 0 }}
        lineStagger={120}
        lineConfig={{ duration: 900 }}
        overflow
      >
        The quick brown fox jumps over the lazy dog
      </TextEngine>

      <div className="spacer" />

      <h2>mode="always" with word layer only</h2>
      <TextEngine
        tag="p"
        className="demo"
        wordIn={{ y: 0, opacity: 1 }}
        wordOut={{ y: 40, opacity: 0 }}
        wordStagger={60}
        wordConfig={{ duration: 700 }}
      >
        Animate every word independently
      </TextEngine>
    </section>
  );
}
