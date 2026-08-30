import { verifyToken } from '$lib/server/auth.js';

export async function handle({ event, resolve }) {
  const cookie = event.cookies.get('token');
  if (cookie) {
    const payload = verifyToken(cookie);
    if (payload) {
      event.locals.user = payload;
    }
  }
  return resolve(event);
}
