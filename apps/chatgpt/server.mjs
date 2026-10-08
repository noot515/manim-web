import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { createManimServer } from "./mcp.mjs";

/**
 * Stateless, read-only MCP HTTP server. Defaults to loopback. Never expose to
 * public networks without a reverse proxy and appropriate access controls.
 */
export function createHttpApp({ host = "127.0.0.1" } = {}) {
  const app = createMcpExpressApp({ host });

  app.get("/", (_req, res) => {
    res.type("text/plain").send("Manim Web MCP server. Connect to /mcp.");
  });

  app.all("/mcp", async (req, res) => {
    const server = createManimServer();
    const transport = new NodeStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.once("close", () => {
      void transport.close().catch(() => {});
      void server.close().catch(() => {});
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (_error) {
      // Avoid reflecting request or internal error details to remote clients.
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  return app;
}

export function startServer({
  host = process.env.HOST || "127.0.0.1",
  port = Number(process.env.PORT ?? "8787"),
} = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new RangeError("PORT must be an integer between 0 and 65535");
  }
  const server = createHttpApp({ host }).listen(port, host);
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = startServer();
  server.once("listening", () => {
    const address = server.address();
    const port = address && typeof address !== "string" ? address.port : "?";
    process.stdout.write("Manim Web MCP server listening on http://" +
      (process.env.HOST || "127.0.0.1") + ":" + port + "/mcp\n");
  });
}
