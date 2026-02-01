# Admin portal (single admin)

The admin dashboard provides:

- **Overview** — Total users, active users (24h), notes/files counts, last cleanup. No sensitive content.
- **User management** — List users (email, created_at, last_sign_in, status). Block/unblock (soft-ban); blocked users cannot upload or download.
- **File management** — List all file metadata (no content, no auto-download). Force delete, extend expiry.
- **Notes management** — List anonymous note metadata (no content). Delete or force-expire abusive notes.
- **Audit log** — Every admin action is logged (admin ID, action, target, timestamp).
- **Settings** — App settings (max_file_size_mb, max_expiry_hours, anonymous_notes_enabled). Stored in `app_settings`; frontend can read dynamically.
- **Cleanup** — View last cleanup run, trigger cleanup manually (admin-only).

## Setup (one-time)

1. **Run Supabase migration**
   - In Supabase Dashboard → **SQL Editor**, run the contents of `supabase/migrations/20250131000000_admin_tables.sql`.
   - This creates: `user_flags`, `audit_logs`, `app_settings`, `cleanup_runs`.

2. **Get your Supabase user ID**
   - Supabase Dashboard → **Authentication → Users** → open your user → copy the **UUID**.

3. **Set env in Netlify**
   - Netlify → **Site settings → Environment variables**
   - Add: `ADMIN_USER_ID` = your UUID (e.g. `a1b2c3d4-e5f6-7890-abcd-ef1234567890`).
   - For login-by-username, also set (see **Supabase keys** below):
     - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

4. **Supabase keys (for Netlify env)**
   - **SUPABASE_URL** — Supabase Dashboard → **Project Settings → API** → Project URL.
   - **SUPABASE_ANON_KEY** — Same page → **Project API keys** → `anon` `public` key (safe for client; used by frontend and by the login function to obtain sessions).
   - **SUPABASE_SERVICE_ROLE_KEY** — Same page → **Project API keys** → `service_role` **secret** key.
     - **What it is:** A secret key that bypasses Row Level Security (RLS) and has full access to your project. Used only by server-side code (e.g. the `login` Netlify function to look up email from username in `profiles`).
     - **What to put:** Copy the exact `service_role` value from Supabase Dashboard → Project Settings → API → “service_role” (click “Reveal” if needed). Paste it into Netlify as `SUPABASE_SERVICE_ROLE_KEY`.
     - **Security:** Never expose this key in the browser, in client-side code, or in public repos. Use it only in Netlify (or other backend) environment variables.

5. **Accessing admin**
   - **Direct /admin or admin.html:** If you are not logged in, you are redirected to the login page (same for everyone, including your UUID). After you log in, you can go to admin.
   - **From dashboard:** After you log in, only your UUID sees an extra **Admin** card on the dashboard. Click it to open the admin portal. Other users never see this option.
   - **Hidden path (optional):** `https://your-site.netlify.app/.internal/panel` also serves the admin page. The normal dashboard does not link to admin; only the Admin card (visible to you only) does.

## Security

- Only the user whose ID matches `ADMIN_USER_ID` can access admin APIs; others get “Access denied”.
- The page has `noindex, nofollow` and is not linked from the app.
- All checks are done on the server. Admin does not see passwords or private file/note content by default; only metadata and aggregate stats.
- Every admin action is written to `audit_logs`.
