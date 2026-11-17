import { defineConfig } from 'tsup';

export default defineConfig({
    dts: true,
    entry: ['src/lib/index.ts', 'src/bin/cli.ts', 'src/bin/start.ts'],
    format: ['esm'],
    minify: true,
    noExternal: [/(.*)/],
    shims: true,
    sourcemap: true,
});
