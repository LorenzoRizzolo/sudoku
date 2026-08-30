import { json } from '@sveltejs/kit';
import { database } from '$lib/server/db.js';

const BASE_POINTS = [60, 80, 120, 160, 220, 300];
const MAX_TIME_SECONDS = [360, 480, 600, 720, 900, 1200];
const TIME_MULTIPLIER_CAP = 2.5;
const MISTAKE_PENALTY = 8;

function calculatePoints(levelIndex, timeSeconds, errors) {
  const base = BASE_POINTS[levelIndex] || 100;
  const maxTime = MAX_TIME_SECONDS[levelIndex] || 600;

  let timeMultiplier = TIME_MULTIPLIER_CAP;

  if (timeSeconds < maxTime) {
    const frac = timeSeconds / maxTime;
    timeMultiplier = 1 + (1 - frac) * (TIME_MULTIPLIER_CAP - 1);
  }

  const timeBonus = Math.round(base * (timeMultiplier - 1));
  const penalty = errors * MISTAKE_PENALTY;
  const total = Math.max(10, base + timeBonus - penalty);

  return total;
}

export async function POST({ request, locals }) {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { level_index, step_index, puzzle_seed, time_seconds, errors } = await request.json();

  if (level_index === undefined || step_index === undefined || time_seconds === undefined) {
    return json({ error: 'Missing required fields' }, { status: 400 });
  }

  const points = calculatePoints(level_index, time_seconds, errors || 0);
  const db = database();

  const result = db.prepare(`
    INSERT INTO solves (user_id, level_index, step_index, puzzle_seed, time_seconds, errors, points_earned)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(locals.user.id, level_index, step_index, puzzle_seed || 0, time_seconds, errors || 0, points);

  db.prepare(`
    UPDATE users
    SET total_points = total_points + ?,
        games_played = games_played + 1,
        games_won = games_won + 1
    WHERE id = ?
  `).run(points, locals.user.id);

  const updated = db.prepare(
    'SELECT id, username, total_points, games_played, games_won FROM users WHERE id = ?'
  ).get(locals.user.id);

  return json({
    solve: {
      id: result.lastInsertRowid,
      points_earned: points,
      time_seconds,
      errors: errors || 0
    },
    user: updated
  });
}
