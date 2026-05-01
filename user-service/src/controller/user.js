import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { centralApiGet } from '../centralApiClient.js';

const SALT_ROUNDS = 10;

// P6: Discount tier logic (pure function for testability)
export function getDiscountPercent(score) {
  if (score >= 80) return 20;
  if (score >= 60) return 15;
  if (score >= 40) return 10;
  if (score >= 20) return 5;
  return 0;
}

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hash]
    );
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('[register]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('[login]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMe = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [req.user.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[me]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDiscount = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID' });

    const userData = await centralApiGet(`/api/data/users/${id}`);
    const discountPercent = getDiscountPercent(userData.securityScore);
    res.json({ userId: id, securityScore: userData.securityScore, discountPercent });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'User not found' });
    if (err.status === 503) return res.status(503).json(err.body);
    console.error('[discount]', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
