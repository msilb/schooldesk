export function isDemo() {
  return process.env.SCHOOLDESK_MODE === 'demo';
}
export function baseURL() {
  const raw = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  const url = new URL(raw);
  if (
    process.env.NODE_ENV === 'production' &&
    !isDemo() &&
    (!process.env.BETTER_AUTH_URL || url.protocol !== 'https:') &&
    process.env.SCHOOLDESK_ALLOW_HTTP !== 'true'
  )
    throw new Error('Set BETTER_AUTH_URL to your HTTPS origin.');
  return url.origin;
}
