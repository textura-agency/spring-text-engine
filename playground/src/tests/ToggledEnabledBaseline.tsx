import { useEffect, useState } from "react";
import TextEngine from "spring-text-engine";

/**
 * Baseline that *forces* a re-render after mount by toggling `enabled` from
 * false → true. Use this as a known-good comparison against the static tests.
 */
export function ToggledEnabledBaseline() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setEnabled(true), 50);
    return () => clearTimeout(id);
  }, []);

  return (
    <section>
      <h2>Baseline — enabled flips false → true after mount</h2>
      <p>If this works but the "static" tests don't, the engine relies on a re-render to play in.</p>
      <TextEngine
        tag="h1"
        enabled={enabled}
        className="demo"
        letterIn={{ y: 0, opacity: 1 }}
        letterOut={{ y: 30, opacity: 0 }}
        letterStagger={30}
        letterConfig={{ duration: 600 }}
      >
        Hello world this is the toggled baseline
      </TextEngine>
    </section>
  );
}
