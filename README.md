# Secure File Vault

A full-stack web app for **secure anonymous notes**, **collaborative notes**, and **authenticated file storage**. Built with React, Supabase, and Netlify serverless functions.

---

## Features

- **Anonymous one-time notes** – Create a note with optional expiry and password; share a link. Recipients view once; the note is deleted after viewing or when it expires.
- **Collaborative notes** – Create notes with other users: real-time presence (who’s viewing), live cursor positions and name labels, shared editing, and invite-by-email.
- **File vault** – Log in to upload, list, and download files; short shareable links for downloads; optional expiry.
- **Account & auth** – Register, login, password reset (email), and account management powered by Supabase Auth.
- **Admin panel** – Stats, user management, notes/files/audit (when `ADMIN_USER_ID` is set).
- **Custom cursor** – Optional cursor effects and text/pointer variants (desktop only).

---

## Benefits

| Benefit | Description |
|--------|-------------|
| **Privacy** | Anonymous notes never require sign-up; one-time view and optional password. |
| **Collaboration** | See who’s in a note and where they’re typing; share by email; content syncs on save. |
| **Security** | Auth and file access via Supabase; serverless APIs keep secrets server-side. |
| **Deploy anywhere** | Single `npm run build`; deploy to Netlify (or any static + serverless host). |
| **No secrets in repo** | All keys and config via environment variables; `.env` is gitignored. |

---

## Tech Stack

- **Frontend:** React 18, React Router, Vite, Tailwind CSS, Motion
- **Backend / DB / Auth:** Supabase (PostgreSQL, Auth, Realtime)
- **Serverless:** Netlify Functions (Node.js)
- **Hosting:** Netlify (recommended) or any static + serverless platform

---

## Prerequisites

- **Node.js** 18+ and npm
- **Supabase** project ([supabase.com](https://supabase.com))
- **Netlify** account (for deployment; optional for local dev)

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/secure-file-vault.git
cd secure-file-vault
npm install
```

### 2. Environment variables

Copy the example env file and add your Supabase keys:

```bash
cp .env.example .env
```

Edit `.env` and set:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key from Project → Settings → API |

**Do not commit `.env`** – it is listed in `.gitignore`.

### 3. Run locally

```bash
npm run dev
```

Open the URL shown (e.g. `http://localhost:5173`). You can create anonymous notes and use the app; for login, file upload, and collaborative notes you need Supabase Auth and backend configured (see below).

### 4. Build for production

```bash
npm run build
```

Output is in `dist/`. The build also generates `public/js/supabaseConfig.generated.js` from your env for legacy static pages (if you keep `public/`).

---

## How to Use the App

### Anonymous notes

1. On the **home page**, use “Create a note”.
2. Set optional **expiry** and **password**, then create.
3. **Share the link** with anyone. They open it once; after viewing (or when the note expires), it’s gone.

### Collaborative notes (requires login)

1. **Register** or **log in**.
2. Go to **Collaborative notes** (or **Notes list**).
3. **Create** a new collaborative note (expiry required; password optional).
4. **Share** the note link or invite by **email** (invitees must have an account).
5. Open the note to **edit**. You’ll see:
   - “· **email1, email2** viewing” when others have the note open.
   - **Name labels** at each collaborator’s cursor in the text.
6. Content **auto-saves**; when someone else saves, you see “Updated” and can keep editing.

### File vault (requires login)

1. **Log in**.
2. Use **Upload** to add files or **My Files** to list and download.
3. Use **short links** from the file list to share download links (with optional expiry).

### Account and admin

- **Account** – Profile and password change.
- **Admin** – If your user ID is set as `ADMIN_USER_ID` in the server environment, you get access to the admin panel (stats, users, notes, files, audit). See `ADMIN.md` for details.

---

## Deployment (Netlify)

1. Push the repo to **GitHub** (see “What to upload to GitHub” below).
2. In **Netlify**: New site → Import from Git → choose the repo.
3. **Build settings:**  
   - Build command: `npm run build`  
   - Publish directory: `dist`
4. **Environment variables** (Site settings → Environment variables):

   | Variable | Required | Description |
   |----------|----------|-------------|
   | `VITE_SUPABASE_URL` | Yes | Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
   | `SUPABASE_URL` | Yes | Same as `VITE_SUPABASE_URL` (used by functions) |
   | `SUPABASE_ANON_KEY` | Yes | Same as `VITE_SUPABASE_ANON_KEY` |
   | `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
   | `ADMIN_USER_ID` | No | Your Supabase user UUID for admin access |

5. Deploy. The site will use the React app from `dist/` and Netlify Functions from `Netlify/functions/`.

More detail: see `DEPLOY.md`.

---

## Project structure (high level)

```
secure-file-vault/
├── src/                 # React app (Vite)
│   ├── App.jsx
│   ├── components/      # Layout, CustomCursor, etc.
│   ├── lib/             # Supabase client, auth, notes API
│   └── pages/           # Home, Login, Dashboard, NoteEdit, Files, etc.
├── public/              # Static assets + legacy HTML/JS pages
├── Netlify/functions/   # Serverless API (auth, notes, files, admin)
├── scripts/             # Build-time config (e.g. Supabase config generator)
├── .env.example         # Template for env vars
├── netlify.toml         # Netlify build and functions config
└── package.json
```

---

## License

ISC (see `package.json`).
