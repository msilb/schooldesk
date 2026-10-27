import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync, appendFileSync } from 'node:fs';
import { loadEnvironment } from './env';
import { ask, password, fatal } from './cli';
try {
  if (!process.stdin.isTTY) throw new Error('Run setup in an interactive terminal.');
  if (!existsSync('.env.local'))
    writeFileSync(
      '.env.local',
      'SCHOOLDESK_MODE=private\nBETTER_AUTH_URL=http://localhost:3000\nBETTER_AUTH_SECRET=' +
        randomBytes(48).toString('base64url') +
        '\nSCHOOLDESK_SYNC_TOKEN=' +
        randomBytes(48).toString('base64url') +
        '\n',
      { mode: 0o600, flag: 'wx' },
    );
  loadEnvironment();
  if (!process.env.BETTER_AUTH_SECRET) {
    const secret = randomBytes(48).toString('base64url');
    appendFileSync('.env.local', '\nBETTER_AUTH_SECRET=' + secret + '\n');
    process.env.BETTER_AUTH_SECRET = secret;
  }
  if (process.env.SCHOOLDESK_MODE === 'demo')
    throw new Error('Set SCHOOLDESK_MODE=private before creating family accounts.');
  const { database, closeDatabase } = await import('../lib/database');
  const { addMember } = await import('./accounts');
  const email = await ask('Owner email: '),
    name = await ask('Owner name: '),
    secret = await password();
  if (secret !== (await password('Repeat password: '))) throw new Error('Passwords do not match.');
  await addMember(email, name, secret, 'owner');
  await closeDatabase();
  console.log('Private owner account created. Run npm run dev and open http://localhost:3000.');
  console.log(
    'Next: add a family member with npm run member:add, then import your catalogue in Updates & settings.',
  );
} catch (error) {
  fatal(error);
}
