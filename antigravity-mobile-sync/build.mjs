import * as esbuild from 'esbuild';
import fs from 'fs';

// One id for this build, baked into both the extension and the phone page so the phone can
// tell when it is running an older page than the computer (and reload itself).
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const BUILD = `${pkg.version}+${Date.now().toString(36)}`;
const define = { __BUILD__: JSON.stringify(BUILD) };

await esbuild.build({
  entryPoints: ['src/extension.js'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  external: ['vscode', 'bufferutil', 'utf-8-validate'],
  outfile: 'dist/extension.js',
  define,
  legalComments: 'none',
});

await esbuild.build({
  entryPoints: ['web/main.js'],
  bundle: true,
  format: 'iife',
  minify: true,
  target: ['es2020', 'safari14'],
  outfile: 'media/app.js',
  define,
  legalComments: 'none',
});
console.log(`built dist/extension.js and media/app.js (${BUILD})`);
