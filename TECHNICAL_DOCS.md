# Quinzy — Technical Documentation

Interactive self-assessment platform for Egyptian secondary-school IT students.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Nginx (port 8080)                                      │
│  ├── Static frontend (Vite build → dist/)               │
│  └── /api/* → proxy to Node backend                     │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│  Express API (port 3000)                                │
│  ├── JWT auth (email/password + Google OAuth)           │
│  ├── SQLite user & progress storage                     │
│  └── REST endpoints: /auth/*, /me, /progress           │
└─────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```text
Quiz Platform/
├── frontend/                  # Browser application and build output
│   ├── index.html             # Home (Vite entry)
│   ├── login.html             # Login page
│   ├── register.html          # Registration page
│   ├── profile.html           # User profile & stats
│   ├── package.json
│   ├── vite.config.js         # Vite + Handlebars MPA config
│   ├── src/
│   └── partials/              # Shared Handlebars partials
│       ├── head.html
│       ├── header.html
│       ├── footer.html        # Full app scripts (home page)
│       └── footer-minimal.html # Auth/profile scripts
│
│   ├── public/                # Static assets (copied to dist as-is)
│   └── assets/
│       ├── css/               # variables, base, layout, components, quiz, auth
│       ├── js/
│       │   ├── theme.js       # Dark/light mode (all pages)
│       │   ├── data/lessons.js # Generated — do not edit
│       │   ├── main.js        # Home page app
│       │   └── modules/       # api, auth, home, lesson, quiz, results, profile
│       └── images/
│
├── scripts/
│   ├── build-content.mjs      # Markdown → lessons.js
│   └── deploy-server.sh
│
│   └── dist/                   # Generated frontend output
├── content/                   # Lesson registry and Markdown content
│   ├── lessons.config.json
│   └── sources/
├── infra/                     # Container and web-server configuration
│   ├── frontend.Dockerfile
│   └── nginx.conf
├── scripts/                   # Build and deployment helpers
├── backend/
│   ├── src/
│   │   ├── server.js          # Express API
│   │   └── db.js              # SQLite schema
│   └── data/database.sqlite
```

---

## Content Pipeline

1. Add `-summary.md` and `-questions.md` to `content/sources/`
2. Register in `content/lessons.config.json`
3. Run `npm run build:content` (or `npm run build`) from `frontend/`

Output: `frontend/public/assets/js/data/lessons.js` → `window.LESSON_DATA`

---

## Development

```bash
# Install frontend deps
npm install

# Build lesson data + frontend
npm run build

# Dev server with HMR
npm run dev

# Backend (separate terminal)
cd backend && npm install && node src/server.js
```

Environment variables (`.env`):
- `GOOGLE_CLIENT_ID` — Google OAuth client ID (injected at build via Vite)
- `JWT_SECRET` — Backend JWT signing key

---

## Auth Flow

| Method | Endpoint | Frontend |
|--------|----------|----------|
| Email register | `POST /api/auth/register` | `register.html` → auto-login |
| Email login | `POST /api/auth/login` | `login.html` |
| Google OAuth | `POST /api/auth/google` | Google Identity Services button |
| Session | `GET /api/me` | JWT in `localStorage` (`quinzy_token`) |

---

## Adding a New Lesson

1. Create MD files in `content/sources/`
2. Add entry to `content/lessons.config.json`
3. Run `npm run build:content`
