import {defineConfig} from 'vite';
import motionCanvas from '@motion-canvas/vite-plugin';
import tsconfigPaths from 'vite-tsconfig-paths';
import {motionCanvasCorsProxyPlugin} from './src/vitePlugin.ts';
export default defineConfig({
  plugins: [
    tsconfigPaths(),
    motionCanvas({
      project: ['./test/src/project.ts'],
    }),
    motionCanvasCorsProxyPlugin({}),
  ],
});
