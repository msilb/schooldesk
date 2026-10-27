import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { database } from './database';
import { baseURL } from './config';
let current: ReturnType<typeof makeAuth> | undefined;
export function authOptions(allowSignup = false) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error('Run npm run setup to configure private login.');
  return {
    telemetry: { enabled: false },
    database: database().authDatabase,
    secret,
    baseURL: baseURL(),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !allowSignup,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 60,
      customRules: { '/sign-in/email': { window: 60, max: 5 } },
    },
    // A one-family deployment uses a shared per-path login budget. Never let a
    // caller reset it by inventing a forwarded IP header on a direct connection.
    advanced: {
      cookiePrefix: 'schooldesk',
      useSecureCookies: baseURL().startsWith('https:'),
      ipAddress: { ipAddressHeaders: [] },
    },
  } satisfies BetterAuthOptions;
}
export function makeAuth(allowSignup = false) {
  return betterAuth(authOptions(allowSignup));
}
export function auth() {
  return (current ??= makeAuth());
}
