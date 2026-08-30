import { json } from '@sveltejs/kit';
import { database } from '$lib/server/db.js';

export async function GET({ url }) {
  const db = database();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const type = url.searchParams.get('type') || 'points';

  let query;
  if (type === 'speed') {
    query = db.prepare(`
      SELECT
        u.id, u.username, u.total_points, u.games_played, u.games_won,
        MIN(s.time_seconds) as best_time,
        AVG(s.time_seconds) as avg_time
      FROM users u
      JOIN solves s ON s.user_id = u.id
      GROUP BY u.id
      HAVING u.games_won > 0
      ORDER BY avg_time ASC
      LIMIT ?
    `);
  } else if (type === 'wins') {
    query = db.prepare(`
      SELECT id, username, total_points, games_played, games_won
      FROM users
      ORDER BY games_won DESC, total_points DESC
      LIMIT ?
    `);
  } else {
    query = db.prepare(`
      SELECT id, username, total_points, games_played, games_won
      FROM users
      ORDER BY total_points DESC
      LIMIT ?
    `);
  }

  const rows = query.all(limit);
  const overall = db.prepare(`
    SELECT id, username, total_points, games_played, games_won
    FROM users
    ORDER BY total_points DESC
  `).all();

  const withRank = rows.map((row) => {
    const rank = overall.findIndex((r) => r.id === row.id) + 1;
    return { ...row, rank };
  });

  return json({ leaderboard: withRank, type });
}
