/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { copyFileSync } from 'fs';

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/app.ts'],
  dts: true,
  format: ['cjs', 'esm'],
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  target: 'node18',
  minify: false,
  treeshake: true,
  skipNodeModulesBundle: true,
  noExternal: [], // No ESM-only dependencies to bundle currently
  splitting: false,
  outExtension({ format }) {
    if (format === 'esm') return { js: '.mjs' };
    return { js: '.cjs' };
  },
  onSuccess: async () => {
    copyFileSync('src/openapi.yaml', 'dist/openapi.yaml');
  }
});
