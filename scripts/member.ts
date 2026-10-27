import { loadEnvironment } from './env';
import { ask, password, fatal } from './cli';
loadEnvironment();
try {
  const { addMember, removeMember } = await import('./accounts');
  const { closeDatabase } = await import('../lib/database');
  const command = process.argv[2],
    email = await ask('Family member email: ');
  if (command === 'add') {
    const name = await ask('Name: '),
      role = await ask('Role (owner/viewer) [viewer]: ');
    if (role && role !== 'owner' && role !== 'viewer') throw new Error('Choose owner or viewer.');
    const secret = await password();
    if (secret !== (await password('Repeat password: ')))
      throw new Error('Passwords do not match.');
    await addMember(email, name, secret, role === 'owner' ? 'owner' : 'viewer');
    console.log('Family account created.');
  } else if (command === 'remove') {
    await removeMember(email);
    console.log('Family membership removed. Existing sessions can no longer access the dashboard.');
  } else throw new Error('Use npm run member:add or npm run member:remove.');
  await closeDatabase();
} catch (error) {
  fatal(error);
}
