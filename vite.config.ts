import {defineConfig, loadEnv} from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// https://vitejs.dev/config/
//@ts-ignore
export default defineConfig(() => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv("development", process.cwd(), "");
  return {
    // vite config

    plugins: [react({fastRefresh: false})],

    worker: {
      plugins: [react({fastRefresh: false})],
    },
    server: {
      port: env.PORT, // set port
    },
    esbuild: {
      jsxFactory: "React.createElement",
      jsxFragment: "React.Fragment",
    },
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./src"),
        "@assets": path.resolve(__dirname, "./src/assets"),
        "@BimModel": path.resolve(__dirname, "./src/BimModel"),
        "@components": path.resolve(__dirname, "./src/components"),
      },
    },
    base: "./",
    build: {
      outDir: "dist",
    },
    test: {
      global: true,
      includeSource: ["src/**/*.{js,ts}"],
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      CSS: true,
    },
  };
});
