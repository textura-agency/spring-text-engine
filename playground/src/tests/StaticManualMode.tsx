import { useRef } from "react";
import TextEngine, { type TextEngineInstance } from "spring-text-engine";

export function StaticManualMode() {
  const ref = useRef<TextEngineInstance | null>(null);
  return (
    <section>
      <h2>mode="manual" — control via ref</h2>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => ref.current?.playIn()}>Play In</button>
        <button onClick={() => ref.current?.playOut()}>Play Out</button>
        <button onClick={() => ref.current?.togglePause()}>Pause/Resume</button>
      </div>
      <TextEngine
        tag="h1"
        mode="manual"
        className="demo"
        letterIn={{ y: 0, opacity: 1 }}
        letterOut={{ y: 30, opacity: 0 }}
        letterStagger={30}
        letterConfig={{ duration: 600 }}
        onTextEngine={(instance) => { ref.current = instance.current; }}
      >
        Manual mode — start hidden, click to play
      </TextEngine>
    </section>
  );
}
