import { json } from '@sveltejs/kit';
import { signup } from '$lib/server/auth.js';

export async function POST({ request, cookies }) {
  const { username, email, password } = await request.json();

  if (!username || !email || !password) {
    return json({ error: 'All fields are required' }, { status: 400 });
  }
  if (username.length < 3) {
    return json({ error: 'Username must be at least 3 characters' }, { status: 400 });
  }
  if (password.length < 6) {
    return json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const result = signup(username, email, password);
  if (result.error) {
    return json({ error: result.error }, { status: 409 });
  }

  cookies.set('token', result.token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30
  });

  return json({ user: result.user });
}
