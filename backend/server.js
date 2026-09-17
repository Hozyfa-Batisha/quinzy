require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Load credentials from environment variables
// IMPORTANT: User must set GOOGLE_CLIENT_ID in the .env file
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-local-key';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

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
    if (!existingUser) {
      await db.run(
        'INSERT INTO users (id, email, name, picture) VALUES (?, ?, ?, ?)',
        [googleId, email, name, picture]
      );
    } else {
      await db.run(
        'UPDATE users SET name = ?, picture = ? WHERE id = ?',
        [name, picture, googleId]
      );
    }

    // Generate local JWT token
    const token = jwt.sign({ id: googleId, email, name, picture }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { id: googleId, email, name, picture } });
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
    const user = await db.get('SELECT id, email, name, picture FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
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
