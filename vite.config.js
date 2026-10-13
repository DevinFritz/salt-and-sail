import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  esbuild: { jsx: 'automatic' },
  server: { host: '0.0.0.0', port: 5173 },
  build: { rollupOptions: { output: { manualChunks: { graphics: ['three', 'three/addons/postprocessing/EffectComposer.js', 'three/addons/postprocessing/RenderPass.js', 'three/addons/postprocessing/ShaderPass.js', 'three/addons/postprocessing/OutputPass.js'] } } } },
});
