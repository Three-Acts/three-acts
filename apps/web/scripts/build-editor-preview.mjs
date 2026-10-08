import { fileURLToPath } from "node:url";
import { build } from "vite";

// Keep the source modular while serving one optional, origin-checked bridge.
// An inline script tag is deliberate: Astro hoists bundled script tags even
// when their surrounding template condition is false.
await build({
  configFile: false,
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
