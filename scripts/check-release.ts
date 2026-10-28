import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, lstatSync } from 'node:fs';
import { TextDecoder } from 'node:util';
import { binaryFinding, contentFindings, privateReleasePath } from '../lib/release-audit';
import reviewed from './reviewed-public-assets.json';

const git = (...args: string[]) => execFileSync('git', args, { maxBuffer: 32 * 1024 * 1024 });
const files = git('ls-files', '-z').toString().split('\0').filter(Boolean);
if (!files.length) throw new Error('Stage the intended release before running this check.');
const policyPath = process.env.SCHOOLDESK_PRIVACY_DENYLIST;
const literals: string[] = policyPath ? JSON.parse(readFileSync(policyPath, 'utf8')) : [];
if (!Array.isArray(literals) || literals.some((value) => typeof value !== 'string'))
  throw new Error('The external privacy denylist must be an array of strings.');
const findings = new Set<string>(),
  inspected = new Set<string>();
function inspect(path: string, bytes: Buffer, scope: string) {
  if (privateReleasePath(path)) findings.add(`${scope}: private/runtime path: ${path}`);
  const signature = scope + ':' + path + ':' + bytes.toString('base64');
  if (inspected.has(signature)) return;
  inspected.add(signature);
  if (/\.(?:png|jpe?g|webp)$/i.test(path)) {
    const issue = binaryFinding(path, bytes, reviewed);
    if (issue) findings.add(`${scope}: ${issue}: ${path}`);
    return;
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    findings.add(`${scope}: unexpected binary file: ${path}`);
    return;
  }
  for (const issue of contentFindings(text, literals)) findings.add(`${scope}: ${issue}: ${path}`);
}
for (const file of files) {
  if (existsSync(file)) {
    if (lstatSync(file).isSymbolicLink()) findings.add('Working tree: symlink: ' + file);
    else inspect(file, readFileSync(file), 'Working tree');
  }
  try {
    inspect(file, git('show', ':' + file), 'Staged index');
  } catch {
    findings.add('Cannot inspect staged file: ' + file);
  }
}
let commits = 0;
if (process.argv.includes('--history')) {
  const objects = git('rev-list', '--all', '--objects').toString().trim().split('\n');
  for (const row of objects) {
    const space = row.indexOf(' '),
      sha = space < 0 ? row : row.slice(0, space);
    if (!sha || git('cat-file', '-t', sha).toString().trim() !== 'blob') continue;
    inspect(row.slice(space + 1), git('cat-file', 'blob', sha), 'Git history');
  }
  const metadata = git('log', '--all', '--format=%H %an <%ae> %cn <%ce>%n%B').toString();
  commits = Number(git('rev-list', '--all', '--count').toString().trim());
  for (const issue of contentFindings(metadata, literals))
    findings.add('Commit metadata: ' + issue);
}
if (findings.size) {
  // Print locations and rule names only, never matched private values.
  console.error([...findings].join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Release privacy check passed: ${files.length} tracked files, working tree and staged index${commits ? ', ' + commits + ' commits across all local refs' : ''}; reviewed binary hashes match.`,
  );
}
