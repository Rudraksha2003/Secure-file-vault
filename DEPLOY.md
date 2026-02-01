# Deploying to GitHub & Netlify

This app is production-ready for stakeholder deployment. No secrets are committed; all config comes from environment variables.

## Build

- `npm run build` runs `prebuild` (generates `public/js/supabaseConfig.generated.js` from env) then Vite build.
- Netlify runs `npm run build`; set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify so static HTML pages get Supabase config at build time.
- The generated config file is gitignored and must not be committed.

## What to upload to your personal GitHub repo

**Upload (include):**

- **Source code:** `src/`, `index.html`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`
- **Netlify serverless:** `Netlify/functions/` (all function files)
- **Config:** `package.json`, `package-lock.json`, `netlify.toml`
- **Docs:** `ADMIN.md`, `.env.example`, `DEPLOY.md` (this file)
- **Git:** `.gitignore` only (so secrets and build artifacts are ignored)

**Do not upload:**

- **`node_modules/`** – Install with `npm install` after clone. (Already in `.gitignore`.)
- **`dist/`** – Build output. Netlify runs `npm run build` itself. (In `.gitignore`.)
- **`.env`** and **`.env.local`** – Real keys and secrets. (In `.gitignore`.)
- **`.netlify/`** – Local Netlify CLI state. (In `.gitignore`.)
- **Any file containing real API keys, passwords, or tokens** – Use env vars only.

**Optional (your choice):**

- **`public/`** – Contains legacy vanilla HTML/JS pages. If you only use the React SPA, you can remove this folder and remove `publicDir: 'public'` from `vite.config.js` to avoid serving duplicate UIs. Otherwise keep it if you still use those static pages.

## After cloning on a new machine

1. Copy `.env.example` to `.env` and fill in:
   - `VITE_SUPABASE_URL` – Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` – Your Supabase anon (public) key
2. Run `npm install` then `npm run dev`.

## Netlify environment variables

In **Netlify → Site settings → Environment variables**, set (for production/build):

- **`VITE_SUPABASE_URL`** – Same as in `.env` (needed at build time for the React app)
- **`VITE_SUPABASE_ANON_KEY`** – Same as in `.env`
- **`SUPABASE_URL`** – Supabase project URL (used by serverless functions)
- **`SUPABASE_ANON_KEY`** – Supabase anon key (used by `login.js` and others)
- **`SUPABASE_SERVICE_ROLE_KEY`** – Supabase service role key (server-side only; never expose in client)
- **`ADMIN_USER_ID`** – Your Supabase user UUID for admin access (used by admin functions)

Never commit `.env` or put the service role key in client-side code.

## Summary

| Item            | Upload to GitHub? |
|-----------------|-------------------|
| `src/`, configs | Yes               |
| `Netlify/functions/` | Yes          |
| `package.json`, `package-lock.json` | Yes |
| `.env.example`  | Yes               |
| `node_modules/` | No                |
| `dist/`         | No                |
| `.env`          | No                |
