import { fileURLToPath } from "node:url";
import { build } from "vite";
import { editorSourcePlugin } from "./editor-source.mjs";

// Keep the source modular while serving one optional, origin-checked bridge.
// An inline script tag is deliberate: Astro hoists bundled script tags even
// when their surrounding template condition is false.
await build({
  configFile: false,
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  plugins: [editorSourcePlugin(fileURLToPath(new URL("../", import.meta.url)))],
  esbuild: { jsx: "automatic" },
  publicDir: false,
  logLevel: "warn",
  build: {
    outDir: fileURLToPath(new URL("../public/", import.meta.url)),
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL("../src/scripts/editor-preview.js", import.meta.url)),
      name: "ThreeActsEditorPreview",
      formats: ["iife"],
      fileName: () => "editor-preview.js"
    }
  }
});
