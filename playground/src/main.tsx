import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { StaticAlwaysMode } from "./tests/StaticAlwaysMode";
import { StaticOnceMode } from "./tests/StaticOnceMode";
import { StaticForwardMode } from "./tests/StaticForwardMode";
import { StaticProgressMode } from "./tests/StaticProgressMode";
import { StaticManualMode } from "./tests/StaticManualMode";
import { ToggledEnabledBaseline } from "./tests/ToggledEnabledBaseline";

const TESTS = {
  "static-always":   { label: "Static · always",   Component: StaticAlwaysMode },
  "static-once":     { label: "Static · once",     Component: StaticOnceMode },
  "static-forward":  { label: "Static · forward",  Component: StaticForwardMode },
  "static-progress": { label: "Static · progress", Component: StaticProgressMode },
  "static-manual":   { label: "Static · manual",   Component: StaticManualMode },
  "toggled-baseline": { label: "Baseline · enabled-toggled", Component: ToggledEnabledBaseline },
} as const;

type TestKey = keyof typeof TESTS;

function App() {
  const [active, setActive] = useState<TestKey>("static-always");
  const Active = TESTS[active].Component;
  return (
    <>
      <nav>
        {Object.entries(TESTS).map(([key, { label }]) => (
          <a
            key={key}
            href={`#${key}`}
            className={key === active ? "active" : ""}
            onClick={(e) => { e.preventDefault(); setActive(key as TestKey); }}
          >
            {label}
          </a>
        ))}
      </nav>
      <main>
        <Active key={active} />
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
