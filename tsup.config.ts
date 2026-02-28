import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node22",
  banner: ({ format }) => {
    // Add shebang only to cli.js
    return { js: "" };
  },
  // Copy prompts directory to dist
  async onSuccess() {
    const { cpSync } = await import("fs");
    const { join } = await import("path");
    cpSync(join("src", "prompts"), join("dist", "prompts"), { recursive: true });
    console.log("✓ Copied prompts to dist/");
  },
});
