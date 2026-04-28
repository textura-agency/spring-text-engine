import TextEngine from "spring-text-engine";

export function StaticOnceMode() {
  return (
    <section>
      <h2>mode="once" — no parent state, no enabled toggle</h2>
      <TextEngine
        tag="h1"
        mode="once"
        className="demo"
        lineIn={{ y: 0, opacity: 1 }}
        lineOut={{ y: 60, opacity: 0 }}
        lineStagger={120}
        lineConfig={{ duration: 1000 }}
        overflow
      >
        Plays in exactly once
      </TextEngine>

      <div className="spacer" />

      <h2>mode="once" with letters</h2>
      <TextEngine
        tag="h1"
        mode="once"
        className="demo"
        letterIn={{ y: 0, opacity: 1 }}
        letterOut={{ y: 20, opacity: 0 }}
        letterStagger={30}
        letterConfig={{ duration: 600 }}
      >
        Letter cascade once
      </TextEngine>
    </section>
  );
}
