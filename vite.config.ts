/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// https://vitejs.dev/config/
export default defineConfig( () => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // eslint-disable-next-line no-undef
  const env = loadEnv( "development", process.cwd(), "" );
  return {
    // vite config

    plugins: [react()],
    worker: {
      plugins: [react()],
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
        '~': path.resolve( __dirname, './src' ),
        '@assets': path.resolve( __dirname, './src/assets' ),
        '@BimModel': path.resolve( __dirname, './src/BimModel' ),
        '@components': path.resolve( __dirname, './src/components' ),
      },
    },
    build: {
      outDir: "build",
    },
    test: {
      global: true,
      environment: 'jsdom',
    },
  };
} );