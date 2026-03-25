import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["TextEngine/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "@react-spring/web"],
  treeshake: true,
});
