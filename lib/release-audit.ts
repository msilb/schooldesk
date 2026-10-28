import { createHash } from 'node:crypto';

/** Keep private values outside this repository; the CLI can load a local denylist. */
export function privateReleasePath(path: string): boolean {
  const parts = path.replace(/\\/g, '/').split('/');
  return (
    parts.some(
      (part) =>
        (/^\.env(?:\..*)?$/.test(part) && part !== '.env.example') ||
        /^(?:\.data|private|\.openai|\.vercel|node_modules|\.next|family|catalog|source[-_]archive|\d+_Source_archive)$/i.test(
          part,
        ),
    ) || /\.(?:db|sqlite|sqlite3|pdf|eml|heic|mov|mp4|webm|zip|tar|gz)(?:$|[-.])/i.test(path)
  );
}

export function contentFindings(text: string, privateLiterals: readonly string[] = []): string[] {
  const rules: [string, RegExp][] = [
    ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    [
      'access token',
      /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{30,})\b/,
    ],
    [
      'signed URL',
      /https?:\/\/[^\s"'<>]+[?&](?:X-Amz-Signature|X-Amz-Credential|access_token|refresh_token)=/i,
    ],
    ['private deployment ID', /appgprj_[a-f0-9]{16,}|Automation_[a-f0-9]{16,}/],
    ['Dropbox namespace', /ns:\d+\/\//],
    [
      'populated runtime secret',
      /\b(?:BETTER_AUTH_SECRET|SCHOOLDESK_SYNC_TOKEN|DATABASE_URL)\s*=\s*["']?[A-Za-z0-9/+_.-]{24,}/,
    ],
    [
      'local/private environment reference',
      /\/Users\/[A-Za-z0-9_.-]+\/|\/var\/folders\/[A-Za-z0-9_/.-]{6,}|codex-remote-attachments\/[a-f0-9-]{16,}|https?:\/\/[^\s/"']+\.chatgpt\.site(?:\/|$)/,
    ],
  ];
  const found = rules.filter(([, regex]) => regex.test(text)).map(([label]) => label);
  const lower = text.toLowerCase();
  if (privateLiterals.some((value) => value.length > 2 && lower.includes(value.toLowerCase())))
    found.push('private denylist match');
  return found;
}

export function binaryFinding(
  path: string,
  bytes: Buffer,
  reviewed: Record<string, string>,
): string | undefined {
  if (!/\.(?:png|jpe?g|webp)$/i.test(path)) return 'unreviewed binary type';
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (reviewed[path] !== sha256) return 'binary bytes differ from reviewed fictional asset';
}
