import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import UnpluginTypia from "@typia/unplugin/vite";

const root = fileURLToPath(new URL("../../src/", import.meta.url));

export default defineConfig({
  plugins: [UnpluginTypia(), viteSingleFile()],
  resolve: {
    alias: { "@": root },
    dedupe: ["react", "react-dom", "three"],
  },
  esbuild: { jsx: "automatic" },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: { input: fileURLToPath(new URL("./mcp-app.html", import.meta.url)) },
  },
});
