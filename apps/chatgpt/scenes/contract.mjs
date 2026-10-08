/**
 * The model and the widget exchange declarative scene specifications only.
 * No source code, URLs, HTML, or arbitrary animation instructions are accepted.
 */
export const SCENE_NAMES = Object.freeze(["square_to_circle", "beta_binomial"]);
export const DEFAULT_SCENE = Object.freeze({
  scene: "square_to_circle",
  params: Object.freeze({}),
});
export const DEFAULT_BETA = Object.freeze({
  alpha: 2,
  beta: 2,
  successes: 7,
  failures: 3,
});

const LIMITS = Object.freeze({
  alpha: [1, 20],
  beta: [1, 20],
  successes: [0, 30],
  failures: [0, 30],
});

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function checkKeys(value, allowed) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new TypeError("Unexpected scene parameter: " + key);
    }
  }
}

function integerInRange(key, value) {
  const [min, max] = LIMITS[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(key + " must be an integer from " + min + " to " + max);
  }
  return value;
}

/** Normalize and validate both MCP tool arguments and MCP tool output. */
export function normalizeScene(value = DEFAULT_SCENE) {
  if (!record(value)) throw new TypeError("Scene must be an object");
  checkKeys(value, ["scene", "params", ...Object.keys(DEFAULT_BETA)]);
  const name = value.scene ?? "square_to_circle";
  if (!SCENE_NAMES.includes(name)) throw new TypeError("Unsupported scene: " + String(name));

  const hasParams = Object.prototype.hasOwnProperty.call(value, "params");
  if (hasParams && Object.keys(DEFAULT_BETA).some((key) => key in value)) {
    throw new TypeError("Use nested params or top-level parameters, not both");
  }
  const params = hasParams ? value.params : value;
  if (!record(params)) throw new TypeError("Scene params must be an object");
  checkKeys(params, hasParams ? Object.keys(DEFAULT_BETA) : ["scene", ...Object.keys(DEFAULT_BETA)]);

  if (name === "square_to_circle") {
    if (Object.keys(params).some((key) => key !== "scene")) {
      throw new TypeError("Square-to-circle does not accept parameters");
    }
    return { scene: name, params: {} };
  }

  const normalized = {};
  for (const key of Object.keys(DEFAULT_BETA)) {
    normalized[key] = integerInRange(key, params[key] ?? DEFAULT_BETA[key]);
  }
  return { scene: name, params: normalized };
}

function logFactorial(n) {
  let total = 0;
  for (let i = 2; i <= n; i += 1) total += Math.log(i);
  return total;
}

/** Beta distribution density for the positive integer shapes allowed by the tool. */
export function betaDensity(x, alpha, beta) {
  if (!Number.isFinite(x) || x < 0 || x > 1) return 0;
  if (x === 0) return alpha === 1 ? beta : 0;
  if (x === 1) return beta === 1 ? alpha : 0;
  const logNorm =
    logFactorial(alpha + beta - 1) -
    logFactorial(alpha - 1) -
    logFactorial(beta - 1);
  return Math.exp(logNorm + (alpha - 1) * Math.log(x) + (beta - 1) * Math.log1p(-x));
}

export function posteriorParameters({ alpha, beta, successes, failures }) {
  return { alpha: alpha + successes, beta: beta + failures };
}
