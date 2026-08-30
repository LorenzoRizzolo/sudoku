import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let db = null;
const DB_PATH = 'data/sudoku.db';

function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_points INTEGER DEFAULT 0,
      games_played INTEGER DEFAULT 0,
      games_won INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS solves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      level_index INTEGER NOT NULL,
      step_index INTEGER NOT NULL,
      puzzle_seed INTEGER NOT NULL,
      time_seconds REAL NOT NULL,
      errors INTEGER DEFAULT 0,
      points_earned INTEGER DEFAULT 0,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_solves_user ON solves(user_id);
    CREATE INDEX IF NOT EXISTS idx_solves_points ON solves(points_earned DESC);
    CREATE INDEX IF NOT EXISTS idx_solves_time ON solves(time_seconds ASC);
  `);
}

export function database() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
