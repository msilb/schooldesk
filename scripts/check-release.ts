import { execFileSync } from 'node:child_process';
import { readFileSync, lstatSync } from 'node:fs';

// Check the exact tracked/staged release, not ignored local databases. This
// complements manual review; no scanner can prove that all content is public.
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
if (!files.length) throw new Error('Stage the intended release before running this check.');
const forbiddenPath =
  /(?:^|\/)(?:\.env(?!\.example$)|\.data|private|\.openai|\.vercel|node_modules|\.next|family|catalog|source-archive)(?:\/|$)|\.(?:db|sqlite|sqlite3|pdf|eml|heic|mov|mp4|webm|zip|tar|gz)(?:$|[-.])/i;
const findings: string[] = [];
for (const file of files) {
  if (forbiddenPath.test(file)) findings.push('Private/runtime path: ' + file);
  if (lstatSync(file).isSymbolicLink()) findings.push('Symlink: ' + file);
  if (/\.(?:png|webp)$/.test(file)) {
    if (
      !/^public\/(?:apple-touch-icon|icon-192|icon-512)\.png$|^docs\/screenshots\/demo-(?:desktop|phone)\.png$/.test(
        file,
      )
    )
      findings.push('Unreviewed binary asset: ' + file);
    continue;
  }
  const text = readFileSync(file, 'utf8');
  const patterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{30,})\b/,
    /https?:\/\/[^\s"'<>]+[?&](?:X-Amz-Signature|X-Amz-Credential|access_token|refresh_token)=/i,
    /appgprj_[a-f0-9]{16,}|Automation_[a-f0-9]{16,}/,
    /ns:\d+\/\//,
    /\b(?:BETTER_AUTH_SECRET|SCHOOLDESK_SYNC_TOKEN|DATABASE_URL)\s*=\s*["']?[A-Za-z0-9/+_.-]{24,}/,
  ];
  for (const pattern of patterns)
    if (pattern.test(text))
      findings.push('Possible secret or private deployment identifier: ' + file);
  if (
    !['scripts/check-release.ts'].includes(file) &&
    /\/Users\/|\/var\/folders\/|codex-remote-attachments|\.chatgpt\.site/.test(text)
  )
    findings.push('Local/private environment reference: ' + file);
}
if (findings.length) {
  console.error([...new Set(findings)].join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Release check passed: ${files.length} tracked files; no forbidden runtime paths, recognised secrets or private deployment identifiers.`,
  );
