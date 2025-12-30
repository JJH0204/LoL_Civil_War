import { defineConfig } from "vite";

export default defineConfig({
    base: '/LoL_Civil_War/',
  build: {
    rollupOptions: {
      input: "index.html",
      output: {
        entryFileNames: "lol-civil-war.bundle.js",
        assetFileNames: "assets/[name].[hash][extname]",
        chunkFileNames: "assets/[name].[hash].js",
      },
    },
    outDir: "dist",
    emptyOutDir: true,
  },
});
