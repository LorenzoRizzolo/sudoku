import { json } from '@sveltejs/kit';
import { signin } from '$lib/server/auth.js';

export async function POST({ request, cookies }) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return json({ error: 'Username and password are required' }, { status: 400 });
  }

  const result = signin(username, password);
  if (result.error) {
    return json({ error: result.error }, { status: 401 });
  }

  cookies.set('token', result.token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30
  });

  return json({ user: result.user });
}
