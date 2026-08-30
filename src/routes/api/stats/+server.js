import { json } from '@sveltejs/kit';
import { database } from '$lib/server/db.js';

const LEVEL_NAMES = ['Beginner', 'Easy', 'Medium', 'Hard', 'Expert', 'Master'];

export async function GET({ locals }) {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = database();

  const user = db.prepare(
    'SELECT id, username, email, total_points, games_played, games_won, created_at FROM users WHERE id = ?'
  ).get(locals.user.id);

  const recentSolves = db.prepare(`
    SELECT level_index, step_index, time_seconds, errors, points_earned, completed_at
    FROM solves
    WHERE user_id = ?
    ORDER BY completed_at DESC
    LIMIT 20
  `).all(locals.user.id);

  const perLevel = db.prepare(`
    SELECT
      level_index,
      COUNT(*) as count,
      AVG(time_seconds) as avg_time,
      MIN(time_seconds) as best_time,
      SUM(errors) as total_errors,
      SUM(points_earned) as total_points
    FROM solves
    WHERE user_id = ?
    GROUP BY level_index
    ORDER BY level_index
  `).all(locals.user.id);

  const stats = perLevel.map((row) => ({
    level: LEVEL_NAMES[row.level_index] || `Level ${row.level_index}`,
    levelIndex: row.level_index,
    games: row.count,
    avgTime: Math.round(row.avg_time),
    bestTime: Math.round(row.best_time),
    totalErrors: row.total_errors,
    totalPoints: row.total_points
  }));

  const overall = db.prepare(`
    SELECT id, username, total_points, games_played, games_won
    FROM users
    ORDER BY total_points DESC
  `).all();
  const rank = overall.findIndex((r) => r.id === user.id) + 1;

  return json({
    user,
    rank,
    stats,
    recentSolves: recentSolves.map((s) => ({
      ...s,
      levelName: LEVEL_NAMES[s.level_index] || `Level ${s.level_index}`
    }))
  });
}
