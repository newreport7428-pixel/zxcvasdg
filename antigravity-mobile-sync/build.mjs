import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/extension.js'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  external: ['vscode'],
  outfile: 'dist/extension.js',
  legalComments: 'none',
});

await esbuild.build({
  entryPoints: ['web/main.js'],
  bundle: true,
  format: 'iife',
  minify: true,
  target: ['es2020', 'safari14'],
  outfile: 'media/app.js',
  legalComments: 'none',
});
console.log('built dist/extension.js and media/app.js');
