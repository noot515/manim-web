import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@modelcontextprotocol/ext-apps";
import { ManimScene } from "../../../src/integrations/react.tsx";
import { Axes, Circle, Create, Square, Transform } from "../../../src/index.ts";
import { betaDensity, DEFAULT_SCENE, normalizeScene, posteriorParameters } from "../scenes/contract.mjs";
import "./style.css";

const host = new App({ name: "Manim Web Mathematics", version: "0.1.0" });
const PRIMARY = "#818cf8";
const SECONDARY = "#34d399";

function constructBetaScene(scene, params) {
  const posterior = posteriorParameters(params);
  let peak = 0;
  for (let i = 0; i <= 200; i += 1) {
    const x = i / 200;
    peak = Math.max(
      peak,
      betaDensity(x, params.alpha, params.beta),
      betaDensity(x, posterior.alpha, posterior.beta),
    );
  }
  const ceiling = Math.max(2, Math.ceil(peak * 1.16));
  const axes = new Axes({
    xRange: [0, 1, 0.2],
    yRange: [0, ceiling, Math.max(1, Math.ceil(ceiling / 5))],
    xLength: 10,
    yLength: 5,
    color: "#94a3b8",
    tips: false,
  });
  const prior = axes.plot(
    (x) => betaDensity(x, params.alpha, params.beta),
    { xRange: [0, 1], color: PRIMARY, strokeWidth: 4 },
  );
  const updated = axes.plot(
    (x) => betaDensity(x, posterior.alpha, posterior.beta),
    { xRange: [0, 1], color: SECONDARY, strokeWidth: 4 },
  );
  return { axes, prior, updated };
}

async function draw(scene, spec, animate, isCancelled) {
  scene.stop();
  scene.clear();

  if (spec.scene === "square_to_circle") {
    const square = new Square({ sideLength: 3, color: PRIMARY, strokeWidth: 5 });
    const circle = new Circle({ radius: 1.65, color: SECONDARY, strokeWidth: 5 });
    if (!animate) {
      scene.add(circle);
      return;
    }
    await scene.play(new Create(square));
    if (isCancelled()) return;
    await scene.play(new Transform(square, circle));
    return;
  }

  const { axes, prior, updated } = constructBetaScene(scene, spec.params);
  scene.add(axes);
  if (!animate) {
    scene.add(prior, updated);
    return;
  }
  await scene.play(new Create(prior));
  if (isCancelled()) return;
  await scene.play(new Create(updated));
}

function useCanvasWidth() {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = (w) => setWidth(Math.max(240, Math.min(760, Math.floor(w))));
    const observer = new ResizeObserver((entries) => update(entries[0].contentRect.width));
    observer.observe(element);
    update(element.clientWidth);
    return () => observer.disconnect();
  }, []);

  return { containerRef, width };
}

function SliderRow({ label, field, value, min, max, onChange }) {
  return (
    <label className="parameter">
      <span>{label} <strong>{value}</strong></span>
      <input
        type="range"
        name={field}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(field, Number(event.target.value))}
      />
    </label>
  );
}

function MathWidget() {
  const [spec, setSpec] = useState(DEFAULT_SCENE);
  const [scene, setScene] = useState(null);
  const [animate, setAnimate] = useState(true);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const { containerRef, width } = useCanvasWidth();

  useEffect(() => {
    const accept = (raw) => {
      try {
        setSpec(normalizeScene(raw));
        setAnimate(true);
        setRevision((n) => n + 1);
        setError("");
      } catch (_error) {
        setError("The scene parameters were rejected.");
      }
    };
    // Register notifications before connecting to the host.
    host.ontoolinput = (message) => {
      if (message?.arguments) accept(message.arguments);
    };
    host.ontoolresult = (result) => {
      if (result?.structuredContent) accept(result.structuredContent);
    };
    host.onerror = () => setError("ChatGPT connection error; local examples remain available.");
    void host.connect().catch(() => {
      // The widget also works as a standalone Vite preview without a host.
    });
    return () => {
      host.ontoolinput = undefined;
      host.ontoolresult = undefined;
    };
  }, []);

  useEffect(() => {
    if (!scene) return;
    let cancelled = false;
    setError("");
    void draw(scene, spec, animate, () => cancelled).catch(() => {
      if (!cancelled) setError("The scene could not be rendered in this browser.");
    });
    return () => {
      cancelled = true;
      scene.stop();
    };
  }, [scene, spec, animate, revision]);

  const switchScene = (name) => {
    setSpec(normalizeScene({ scene: name }));
    setAnimate(true);
    setRevision((n) => n + 1);
  };

  const updateParameter = (name, value) => {
    if (spec.scene !== "beta_binomial") return;
    try {
      setSpec(normalizeScene({ scene: "beta_binomial", params: { ...spec.params, [name]: value } }));
      setAnimate(false);
    } catch (_error) {
      setError("The parameter is out of range.");
    }
  };

  const p = spec.params;
  const posterior = spec.scene === "beta_binomial" ? posteriorParameters(p) : null;
  const canvasHeight = Math.round(width * 0.58);

  return (
    <main className="manim-widget">
      <header className="heading">
        <div>
          <p className="eyebrow">Manim Web</p>
          <h1>Interactive mathematics</h1>
        </div>
        <button type="button" className="replay" onClick={() => {
          setAnimate(true);
          setRevision((n) => n + 1);
        }}>Replay</button>
      </header>

      <nav className="scene-selector" aria-label="Choose animation">
        <button type="button" aria-pressed={spec.scene === "square_to_circle"}
          onClick={() => switchScene("square_to_circle")}>Geometry</button>
        <button type="button" aria-pressed={spec.scene === "beta_binomial"}
          onClick={() => switchScene("beta_binomial")}>Bayesian update</button>
      </nav>

      <section aria-label="Animation canvas" ref={containerRef} className="canvas-shell">
        <ManimScene
          width={width}
          height={canvasHeight}
          backgroundColor="#101827"
          onSceneReady={setScene}
        />
      </section>
      {error && <p role="alert" className="error">{error}</p>}

      {spec.scene === "beta_binomial" ? (
        <section aria-label="Beta-Binomial controls" className="details">
          <div className="legend">
            <span><i className="dot prior" /> Prior Beta({p.alpha}, {p.beta})</span>
            <span><i className="dot posterior" /> Posterior Beta({posterior.alpha}, {posterior.beta})</span>
          </div>
          <p className="explanation">
            Observed {p.successes} successes and {p.failures} failures.
            Posterior mean: {(posterior.alpha / (posterior.alpha + posterior.beta)).toFixed(3)}.
          </p>
          <div className="parameters">
            <SliderRow label="Prior alpha" field="alpha" value={p.alpha} min={1} max={20} onChange={updateParameter} />
            <SliderRow label="Prior beta" field="beta" value={p.beta} min={1} max={20} onChange={updateParameter} />
            <SliderRow label="Successes" field="successes" value={p.successes} min={0} max={30} onChange={updateParameter} />
            <SliderRow label="Failures" field="failures" value={p.failures} min={0} max={30} onChange={updateParameter} />
          </div>
        </section>
      ) : (
        <p className="explanation">A square transforms into a circle using the Manim Web animation engine.</p>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<MathWidget />);
