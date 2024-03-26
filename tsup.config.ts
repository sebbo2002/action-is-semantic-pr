import { defineConfig } from 'tsup';

export default defineConfig({
    entry: [
        'src/lib/index.ts',
        'src/bin/cli.ts',
        'src/bin/start.ts'
    ],
    format: ['cjs'],
    dts: true,
    shims: true,
    sourcemap: true,
    minify: true,
    noExternal: [ /(.*)/ ],
});
