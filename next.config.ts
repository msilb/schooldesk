import type { NextConfig } from 'next';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? sourceFiles(join(dir, e.name))
      : /\.(ts|tsx|css)$/.test(e.name)
        ? [join(dir, e.name)]
        : [],
  );
}
const buildId = createHash('sha256')
  .update(
    [...sourceFiles('app'), ...sourceFiles('lib')]
      .sort()
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n'),
  )
  .digest('hex')
  .slice(0, 16);
const config: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  output: 'standalone',
  poweredByHeader: false,
  devIndicators: false,
  outputFileTracingExcludes: { '*': ['./.data/**', './private/**', './.env*', './tests/**'] },
  serverExternalPackages: ['better-sqlite3', 'pg'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'" +
              (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '') +
              "; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
          },
        ],
      },
    ];
  },
};
export default config;
