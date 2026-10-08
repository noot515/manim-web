import test from "node:test";
import assert from "node:assert/strict";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { startServer } from "../server.mjs";
import { RESOURCE_URI } from "../mcp.mjs";

test("MCP handshake, scene tool, and embedded UI resource work over HTTP", async () => {
  const http = startServer({ port: 0 });
  await new Promise((resolve, reject) => {
    http.once("listening", resolve);
    http.once("error", reject);
  });
  const address = http.address();
  assert.ok(address && typeof address !== "string");
  const url = new URL("http://127.0.0.1:" + address.port + "/mcp");
  const client = new Client({ name: "manim-web-test", version: "0.1.0" });

  try {
    await client.connect(new StreamableHTTPClientTransport(url));
    const tools = await client.listTools();
    const sceneTool = tools.tools.find((tool) => tool.name === "show_manim_scene");
    assert.ok(sceneTool, "scene tool should be discoverable");
    assert.equal(sceneTool._meta?.ui?.resourceUri, RESOURCE_URI);

    const result = await client.callTool({
      name: "show_manim_scene",
      arguments: { scene: "square_to_circle" },
    });
    assert.equal(result.isError, undefined);
    assert.deepEqual(result.structuredContent, { scene: "square_to_circle", params: {} });

    const beta = await client.callTool({
      name: "show_manim_scene",
      arguments: { scene: "beta_binomial", alpha: 3, beta: 4, successes: 7, failures: 2 },
    });
    assert.deepEqual(beta.structuredContent, {
      scene: "beta_binomial",
      params: { alpha: 3, beta: 4, successes: 7, failures: 2 },
    });

    const ui = await client.readResource({ uri: RESOURCE_URI });
    assert.ok(ui.contents.length > 0);
    assert.match(ui.contents[0].mimeType, /text\/html/);
    assert.match(ui.contents[0].text, /<html/i);
  } finally {
    await client.close();
    await new Promise((resolve, reject) => {
      http.close((err) => err ? reject(err) : resolve());
    });
  }
});
