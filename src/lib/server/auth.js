import { database } from './db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sudoku-secret-change-me-in-production';
const TOKEN_EXPIRY = '30d';

export function hashPassword(password) {
  return bcrypt.hashSync(password, 12);
}

export function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function createToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function signup(username, email, password) {
  const db = database();
  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    return { error: 'Username or email already taken' };
  }
  const hash = hashPassword(password);
  const result = db.prepare(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
  ).run(username, email, hash);
  const user = db.prepare('SELECT id, username, email, total_points, games_played, games_won, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = createToken(user);
  return { user, token };
}

export function signin(username, password) {
  const db = database();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return { error: 'Invalid username or password' };
  }
  if (!verifyPassword(password, user.password_hash)) {
    return { error: 'Invalid username or password' };
  }
  const { password_hash, ...safeUser } = user;
  const token = createToken(safeUser);
  return { user: safeUser, token };
}
