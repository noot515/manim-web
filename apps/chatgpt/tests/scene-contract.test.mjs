import test from "node:test";
import assert from "node:assert/strict";
import {
  betaDensity,
  DEFAULT_BETA,
  DEFAULT_SCENE,
  normalizeScene,
  posteriorParameters,
} from "../scenes/contract.mjs";

test("normalizes the square-to-circle scene without executable content", () => {
  assert.deepEqual(normalizeScene({ scene: "square_to_circle" }), DEFAULT_SCENE);
  assert.throws(() => normalizeScene({ scene: "square_to_circle", script: "alert(1)" }), /Unexpected/);
  assert.throws(() => normalizeScene({ scene: "unknown" }), /Unsupported/);
  assert.throws(() => normalizeScene({ scene: "square_to_circle", alpha: 2 }), /does not accept/);
});

test("accepts only bounded integer Beta-Binomial parameters", () => {
  assert.deepEqual(normalizeScene({ scene: "beta_binomial" }).params, DEFAULT_BETA);
  assert.deepEqual(
    normalizeScene({
      scene: "beta_binomial",
      params: { alpha: 3, beta: 4, successes: 5, failures: 6 },
    }).params,
    { alpha: 3, beta: 4, successes: 5, failures: 6 },
  );
  for (const invalid of [
    { alpha: 0 }, { alpha: 1.5 }, { beta: 21 },
    { successes: -1 }, { failures: 31 }, { alpha: "2" },
    { eval: "process.exit()" },
  ]) {
    assert.throws(() => normalizeScene({ scene: "beta_binomial", ...invalid }));
  }
});

test("posterior Beta parameters update with observed outcomes", () => {
  assert.deepEqual(
    posteriorParameters({ alpha: 2, beta: 3, successes: 7, failures: 4 }),
    { alpha: 9, beta: 7 },
  );
});

test("Beta density is finite, nonnegative, and integrates approximately to 1", () => {
  for (const [alpha, beta] of [[1, 1], [2, 3], [9, 7], [20, 20], [32, 24]]) {
    const n = 2000;
    let area = 0;
    for (let i = 0; i <= n; i += 1) {
      const density = betaDensity(i / n, alpha, beta);
      assert.ok(Number.isFinite(density) && density >= 0);
      area += density * (i === 0 || i === n ? 0.5 : 1) / n;
    }
    assert.ok(Math.abs(area - 1) < 0.005, "area must be close to 1");
  }
});
