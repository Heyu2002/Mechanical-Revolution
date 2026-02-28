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
});
