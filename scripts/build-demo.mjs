import { build } from 'esbuild';
import { mkdir, cp, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = process.env.SCHOOLDESK_BASE_PATH || '';
if (!/^(?:\/[A-Za-z0-9_-]+)*$/.test(base))
  throw new Error('Use an empty or simple absolute base path.');
await mkdir('demo-dist', { recursive: true });
const result = await build({
  entryPoints: ['demo/main.tsx'],
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'browser',
  target: ['safari16', 'chrome110'],
  outfile: 'demo-dist/app.js',
  metafile: true,
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.NEXT_PUBLIC_BUILD_ID': '"static-demo"',
    'process.env.NEXT_PUBLIC_BASE_PATH': JSON.stringify(base),
  },
});
const inputs = Object.keys(result.metafile.inputs);
if (inputs.some((file) => /(?:lib\/(?:auth|access|database|store)\.ts|app\/api\/)/.test(file)))
  throw new Error('The public bundle includes private server code.');
await cp('public', 'demo-dist', { recursive: true });
const manifest = JSON.parse(await readFile('public/site.webmanifest', 'utf8'));
manifest.start_url = './';
for (const icon of manifest.icons) icon.src = '.' + icon.src;
await writeFile('demo-dist/site.webmanifest', JSON.stringify(manifest));
const hash = createHash('sha256')
  .update(await readFile('demo-dist/app.js'))
  .digest('hex')
  .slice(0, 12);
await writeFile(
  'demo-dist/index.html',
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#28594c"><meta name="description" content="Try Schooldesk: a fictional, interactive preview of a private family school dashboard."><meta name="robots" content="noindex,nofollow"><title>Schooldesk · fictional demo</title><link rel="icon" href="${base}/icon.svg"><link rel="apple-touch-icon" href="${base}/apple-touch-icon.png"><link rel="manifest" href="${base}/site.webmanifest"><link rel="stylesheet" href="${base}/app.css?v=${hash}"></head><body><div id="root"></div><script type="module" src="${base}/app.js?v=${hash}"></script></body></html>`,
);
await writeFile('demo-dist/.nojekyll', '');
console.log(
  'Static fictional demo built. No server/auth/storage modules are in the browser bundle.',
);
