import TextEngine from "spring-text-engine";

export function StaticProgressMode() {
  return (
    <section>
      <h2>mode="progress" — toggle</h2>
      <p>Scroll to drive the toggle thresholds.</p>
      <div className="spacer" />
      <TextEngine
        tag="h1"
        mode="progress"
        type="toggle"
        className="demo"
        wordIn={{ y: 0, opacity: 1 }}
        wordOut={{ y: 40, opacity: 0 }}
        wordConfig={{ duration: 700 }}
      >
        Toggle progress per word
      </TextEngine>

      <div className="spacer" />
      <div className="spacer" />

      <h2>mode="progress" — interpolate</h2>
      <TextEngine
        tag="h1"
        mode="progress"
        type="interpolate"
        className="demo"
        letterIn={{ y: 0, opacity: 1 }}
        letterOut={{ y: 30, opacity: 0 }}
        letterConfig={{ duration: 600 }}
      >
        Interpolated letter progress
      </TextEngine>

      <div className="spacer" />
      <div className="spacer" />
    </section>
  );
}
