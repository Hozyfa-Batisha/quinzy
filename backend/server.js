require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(async (_req, _res, next) => {
  try {
    await db.ready;
    next();
  } catch (error) {
    next(error);
  }
});

// Load credentials from environment variables
// IMPORTANT: User must set GOOGLE_CLIENT_ID in the .env file
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-local-key';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * Middleware to verify JWT token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer TOKEN

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

/**
 * Endpoint: POST /api/auth/register
 * Register a new user with email and password
 */
app.post('/api/auth/register', async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!username || !email || !password || !isValidEmail(email)) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (username.length < 3 || !/^[a-z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Invalid username. Use 3+ alphanumeric characters or underscores.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Invalid registration details' });
  }

  try {
    // Check if user already exists (email or username)
    const existingEmail = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const existingUser = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    await db.run(
      'INSERT INTO users (id, username, email, name, password) VALUES (?, ?, ?, ?, ?)',
      [userId, username, email, username, hashedPassword]
    );

    res.status(201).json({ success: true, message: 'Registration successful' });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

/**
 * Endpoint: POST /api/auth/login
 * Login with email and password
 */
app.post('/api/auth/login', async (req, res) => {
  const loginIdentifier = normalizeEmail(req.body.email); // Could be username or email
  const password = String(req.body.password || '');

  if (!loginIdentifier || !password) {
    return res.status(400).json({ error: 'Email/Username and password are required' });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE email = ? OR username = ?', [loginIdentifier, loginIdentifier]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(401).json({ error: 'Please login with Google for this account' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate local JWT token
    const token = jwt.sign({ id: user.id, username: user.username, email: user.email, name: user.name, picture: user.picture }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, name: user.name, picture: user.picture } });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

/**
 * Endpoint: POST /api/auth/google
 * Verifies Google ID token and issues a local JWT.
 */
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  
  if (!credential) {
    return res.status(400).json({ error: 'Missing credential' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Insert or update user in SQLite
    const existingUser = await db.get('SELECT * FROM users WHERE id = ?', [googleId]);
    let username = existingUser?.username;

    if (!existingUser) {
      // Auto-generate username from email prefix
      username = email.split('@')[0].replace(/[^a-z0-9_]/g, '') + Math.floor(Math.random() * 1000);
      await db.run(
        'INSERT INTO users (id, username, email, name, picture) VALUES (?, ?, ?, ?, ?)',
        [googleId, username, email, name, picture]
      );
    } else {
      await db.run(
        'UPDATE users SET name = ?, picture = ? WHERE id = ?',
        [name, picture, googleId]
      );
    }

    // Generate local JWT token
    const token = jwt.sign({ id: googleId, username, email, name, picture }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { id: googleId, username, email, name, picture } });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

/**
 * Endpoint: GET /api/me
 * Returns current authenticated user data.
 */
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.get('SELECT id, username, email, name, picture FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

/**
 * Endpoint: PUT /api/me
 * Updates current authenticated user's profile info.
 */
app.put('/api/me', authenticateToken, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = normalizeEmail(req.body.email);
  const picture = req.body.picture || null; // Can be base64 or URL

  if (!name || !email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Name and a valid email are required' });
  }

  try {
    // Check if new email is taken by someone else
    const existingEmail = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.user.id]);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    await db.run(
      'UPDATE users SET name = ?, email = ?, picture = ? WHERE id = ?',
      [name, email, picture, req.user.id]
    );

    const user = await db.get('SELECT id, username, email, name, picture FROM users WHERE id = ?', [req.user.id]);
    
    // Generate new local JWT token to reflect changes
    const token = jwt.sign({ id: user.id, username: user.username, email: user.email, name: user.name, picture: user.picture }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ success: true, token, user });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ error: 'Server error during profile update' });
  }
});

/**
 * Endpoint: GET /api/progress
 * Fetch progress for the authenticated user
 */
app.get('/api/progress', authenticateToken, async (req, res) => {
  try {
    const progress = await db.all('SELECT * FROM progress WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

/**
 * Endpoint: POST /api/progress
 * Save test score for a lesson
 */
app.post('/api/progress', authenticateToken, async (req, res) => {
  const { lessonId, score, totalQuestions, passed } = req.body;
  
  if (!lessonId || score === undefined || !totalQuestions) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if progress already exists for this lesson
    const existing = await db.get('SELECT * FROM progress WHERE user_id = ? AND lesson_id = ?', [req.user.id, lessonId]);

    if (existing) {
      // Only update if the new score is higher
      if (score > existing.score) {
        await db.run(
          'UPDATE progress SET score = ?, passed = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
          [score, passed ? 1 : 0, existing.id]
        );
      }
    } else {
      // Insert new record
      await db.run(
        'INSERT INTO progress (user_id, lesson_id, score, total_questions, passed) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, lessonId, score, totalQuestions, passed ? 1 : 0]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Save Progress Error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});
