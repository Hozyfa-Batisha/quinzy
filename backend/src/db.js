const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists for the SQLite DB file
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize schema before accepting requests. This prevents old databases
// from racing the first registration while the password migration is queued.
const ready = new Promise((resolve, reject) => db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      picture TEXT,
      password TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Progress table
  db.run(`
    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      passed BOOLEAN NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, lesson_id)
    )
  `);

  // Migrate databases created before password or username was part of the schema.
  db.all(`PRAGMA table_info(users)`, (err, columns = []) => {
    if (err) return reject(err);
    
    const hasPassword = columns.some((column) => column.name === 'password');
    const hasUsername = columns.some((column) => column.name === 'username');
    
    const migrations = [];
    if (!hasPassword) {
      migrations.push(new Promise((res, rej) => db.run(`ALTER TABLE users ADD COLUMN password TEXT`, (e) => e ? rej(e) : res())));
    }
    if (!hasUsername) {
      migrations.push(new Promise((res, rej) => db.run(`ALTER TABLE users ADD COLUMN username TEXT`, (e) => e ? rej(e) : res())));
    }
    
    Promise.all(migrations)
      .then(() => resolve())
      .catch(reject);
  });
}));

module.exports = {
  db,
  ready,
  
  // Promisify queries for easier async/await usage
  get: (query, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  all: (query, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  run: (query, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(query, params, function (err) {
        if (err) reject(err);
        else resolve(this); // this contains lastID and changes
      });
    });
  }
};
