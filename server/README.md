Windows notes

If you run the dev server on Windows, you may see an error like:

Error: listen ENOTSUP: operation not supported on socket 0.0.0.0:5000

This is caused by the `SO_REUSEPORT` option (set via `reusePort: true`) on the listen options, which is not supported on Windows platforms. The server now conditionally enables `reusePort` only on platforms that support it (non-Windows).

Workarounds:
- Set HOST=127.0.0.1 in your environment to bind to localhost (recommended for local development on Windows):

  ```powershell
  $env:HOST = "127.0.0.1"; npm run dev
  ```

- Or run the project on a platform which supports `SO_REUSEPORT` (Linux, macOS) if you need `reusePort`.

If you're on a Linux/macOS host but inside a Windows-like runtime (e.g., WSL) the behavior should be fine because the platform is likely `linux`.

How it works now:
- The server sets a default `HOST` to '0.0.0.0' on non-Windows platforms and to '127.0.0.1' on Windows.
- `reusePort` is only set on non-Windows platforms.
- The server logs a helpful message and exits if it detects `ENOTSUP`.

Supabase integration
---------------------

This project uses Supabase as the single server-side storage backend. The server
requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_KEY`) to be
present at startup; the app will fail fast with a clear error if they are
missing.

Environment variables required for Supabase:

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — the service role key for server-side operations (required)

To run the dev server with Supabase configured (PowerShell):

```powershell
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
$env:HOST = "127.0.0.1" # optional for Windows
npm run dev
```

Note: The storage layer will attempt to map rows from either `users` or
`users_eif` tables into the app's `User` shape. The included SQL schema
(`sql/schema_eif.sql`) provides an example schema compatible with the app.

How to apply the included schema to a Supabase project
-------------------------------------------------------

The `sql/schema_eif.sql` file contains the tables you provided. There are a couple of ways to apply this to your Supabase project:

- Supabase SQL Editor (web):
  1. Open your Supabase project in the web dashboard.
 2. Go to "SQL Editor" and paste the contents of `sql/schema_eif.sql` and run it.

- Using psql:
  1. Obtain the database connection string from the Supabase project settings (Database -> Connection string).
  2. Run:

  ```powershell
  psql "postgres://<db_user>:<db_pass>@<db_host>:<db_port>/<db_name>" -f sql/schema_eif.sql
  ```

- Using Supabase CLI (recommended for automation):
  1. Install the Supabase CLI and authenticate.
  2. Use SQL migration or run the SQL file against your project by connecting or using the `psql` command shown above.

Notes:
- The script enables `pgcrypto` to make `gen_random_uuid()` available; if you already use a different uuid function, adapt accordingly.
-- If you want to manage schema through migrations, prefer the Supabase CLI or
  SQL migrations; the included `sql/schema_eif.sql` is a practical starting point.

Notifications API
------------------

This project supplies in-app notifications backed by the `notifications_eif` table. New endpoints:

- GET `/api/notifications?limit=20&offset=0` — List notifications for the authenticated user (default limit = 20, offset = 0)
- PATCH `/api/notifications/:id` — Accepts JSON body `{ is_read: true|false }` to set the read state
- PATCH `/api/notifications/:id/read` — Convenience endpoint to mark a single notification read
- POST `/api/notifications/mark-all-read` — Mark all notifications read for authenticated user
- DELETE `/api/notifications/:id` — Delete a single notification for the user

Client-side pages and usage
--------------------------

- The dashboard header includes a bell icon with unread counts and a compact dropdown. The dropdown allows marking notifications read and includes a "View all" link that navigates to `/notifications`.
- A new dedicated page `/dashboard/notifications` (and redirect `/notifications`) lists all notifications, supports pagination, filtering (unread only) and actions (mark read/unread, delete, mark all read).

For real-time updates: the dashboard polls the server every 20 seconds and also listens for a `notifications-updated` browser event that triggers a refresh.

