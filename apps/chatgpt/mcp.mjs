import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/server";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { normalizeScene, posteriorParameters } from "./scenes/contract.mjs";

export const RESOURCE_URI = "ui://manim-web/v1/scene.html";
const DEFAULT_HTML_PATH = fileURLToPath(new URL("./dist/mcp-app.html", import.meta.url));

export function createManimServer({ htmlPath = DEFAULT_HTML_PATH } = {}) {
  const server = new McpServer({ name: "manim-web-chatgpt", version: "0.1.0" });

  registerAppTool(
    server,
    "show_manim_scene",
    {
      title: "Visualize with Manim Web",
      description:
        "Show an interactive mathematical animation. Use square_to_circle for a simple " +
        "geometry demonstration, or beta_binomial to explore a conjugate Bayesian prior " +
        "and posterior. This tool accepts only named, predefined scenes and numeric parameters.",
      inputSchema: z.object({
        scene: z.enum(["square_to_circle", "beta_binomial"]).default("square_to_circle"),
        alpha: z.number().int().min(1).max(20).optional(),
        beta: z.number().int().min(1).max(20).optional(),
        successes: z.number().int().min(0).max(30).optional(),
        failures: z.number().int().min(0).max(30).optional(),
      }).strict(),
      outputSchema: z.object({
        scene: z.enum(["square_to_circle", "beta_binomial"]),
        params: z.record(z.string(), z.number().int()),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      _meta: { ui: { resourceUri: RESOURCE_URI } },
    },
    async (args) => {
      const spec = normalizeScene(args);
      let text = "Showing an interactive square transforming into a circle.";
      if (spec.scene === "beta_binomial") {
        const p = spec.params;
        const posterior = posteriorParameters(p);
        text =
          "Visualizing the Beta(" + p.alpha + ", " + p.beta +
          ") prior and Beta(" + posterior.alpha + ", " + posterior.beta +
          ") posterior after " + p.successes + " successes and " + p.failures + " failures.";
      }
      return {
        structuredContent: spec,
        content: [{ type: "text", text }],
      };
    },
  );

  registerAppResource(
    server,
    "manim-web-scene",
    RESOURCE_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => ({
      contents: [{
        uri: RESOURCE_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: await readFile(htmlPath, "utf8"),
        _meta: {
          ui: {
            prefersBorder: true,
            // The first two scenes require no external resources or requests.
            csp: { connectDomains: [], resourceDomains: [] },
          },
        },
      }],
    }),
  );

  return server;
}
