import { json } from '@sveltejs/kit';
import { database } from '$lib/server/db.js';

export async function GET({ locals }) {
  if (!locals.user) {
    return json({ user: null });
  }

  const db = database();
  const user = db.prepare(
    'SELECT id, username, email, total_points, games_played, games_won, created_at FROM users WHERE id = ?'
  ).get(locals.user.id);

  if (!user) {
    return json({ user: null });
  }

  return json({ user });
}
