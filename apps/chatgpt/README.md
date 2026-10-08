# Manim Web for ChatGPT (MCP App)

An experimental, read-only MCP App that renders **the actual Manim Web engine**
inside a ChatGPT conversation. The app uses the MCP Apps open UI protocol,
an HTML widget bundled with Vite, and the existing React ManimScene integration.

## Available scenes

- square_to_circle: animated Manim Web Square -> Circle transformation.
- beta_binomial: two animated density curves for a Beta prior and its
  Beta-Binomial posterior, with sliders for prior parameters and observations.

The model selects a scene by calling show_manim_scene. Tool arguments are
**declarative and validated**; model-provided JavaScript and external URLs
cannot be executed by this server. The widget revalidates incoming specs.

## Requirements

- Node.js 22.12+
- A ChatGPT account/workspace that permits adding custom MCP servers
- HTTPS URL to the local MCP endpoint for ChatGPT testing
- Browser/WebGL support in the ChatGPT MCP Apps iframe

## Build and test

Run these commands from the repository root:

~~~sh
npm ci
cd apps/chatgpt
npm install
npm run check
npm start
~~~

The server binds to 127.0.0.1:8787 by default. Its MCP endpoint is
http://127.0.0.1:8787/mcp and GET / is a basic health check.

To preview the unhosted widget locally (it defaults to the geometry scene),
run npm run dev in apps/chatgpt, then open the URL printed by Vite.

The production widget is a single-file dist/mcp-app.html resource. Build it
before starting the MCP server. The MCP test covers initialize, tools/list,
tools/call and resources/read against a real stateless HTTP server.

## Connect to ChatGPT

1. Start the MCP server locally with npm start.
2. Make the port reachable through a trusted HTTPS tunnel, for example:
   ngrok http 8787
3. In ChatGPT on the web, go to Plugins -> Add custom MCP server. Connect
   to https://YOUR-TUNNEL/mcp and install the resulting plugin.
4. In a new conversation, select the plugin and ask:
   "Show a square transforming into a circle with Manim Web."
   Or: "Show a Beta(2,2) prior updated by 7 successes and 3 failures."

You should see a responsive Manim canvas with Replay and scene selection.
For the Bayesian scene, move the sliders to update the posterior.

## Scope and security

This is an **experimental local development** integration, not a hosted
production service. It does not enable authentication, write to GitHub,
run scripts supplied by the model, or persist user data. The server is
read-only and binds to the loopback interface by default. An HTTPS tunnel
does not itself authenticate callers: add appropriate access controls before
public deployment. Avoid putting sensitive data in scene parameters.

The UI resource declares empty network CSP allowlists because the first
two scenes are self-contained; verify this against host behavior before
submitting the app for publication. ChatGPT host/WebGL compatibility still
requires manual validation using an installed custom MCP connection.

## Design

- scenes/contract.mjs: typed-range input validation and Beta PDF computation
- mcp.mjs: MCP App tool, structured result and HTML resource
- server.mjs: stateless Streamable HTTP transport
- widget/main.jsx: React + existing ManimScene renderer
- widget/style.css: responsive controls and layout
- tests/: scene math/security checks and HTTP MCP smoke test
- vite.config.mjs: one-file embedded widget bundle

Documentation:
- https://developers.openai.com/plugins/build/app-quickstart
- https://developers.openai.com/plugins/build/chatgpt-ui
- https://github.com/modelcontextprotocol/ext-apps
