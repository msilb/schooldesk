import { createInterface } from 'node:readline/promises';
export async function ask(question: string) {
  if (!process.stdin.isTTY) throw new Error('Use an interactive terminal for account setup.');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}
export function password(question = 'Password (at least 12 characters): '): Promise<string> {
  if (!process.stdin.isTTY) throw new Error('Use an interactive terminal to enter the password.');
  process.stdout.write(question);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const clean = () => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
    };
    const onData = (chunk: Buffer) => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\r' || char === '\n') {
          clean();
          resolve(value);
          return;
        }
        if (char === '\u0003') {
          clean();
          reject(new Error('Cancelled.'));
          return;
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ') value += char;
      }
    };
    process.stdin.on('data', onData);
  });
}
export function fatal(error: unknown) {
  console.error(error instanceof Error ? error.message : 'The command failed.');
  process.exitCode = 1;
}
