# Docs Clone

A small Google Docs–style editor: create rich-text documents, import `.docx`, `.md` and `.txt` files, share them with other users as editor or viewer, and see who did what in each document's activity log.

Built with Next.js 16 (App Router, Server Actions), React 19, Tiptap, Tailwind CSS 4 and PostgreSQL.

## Requirements

| Tool       | Version                           |
| ---------- | --------------------------------- |
| Node.js    | 20.9 or newer                     |
| npm        | ships with Node                   |
| PostgreSQL | 14 or newer, with `psql` on PATH  |

On macOS, PostgreSQL can be installed with Homebrew:

```bash
brew install postgresql@14
brew services start postgresql@14
```

## Installation

```bash
git clone <repository-url> docs-clone
cd docs-clone
npm install
```

## Database setup

### 1. Create the database

```bash
createdb docs_app_db
```

`docs_app_db` is the name the app uses by default. If you pick another name, set `DATABASE_URL` in step 3.

### 2. Create the tables

```bash
psql -d docs_app_db -f db/schema.sql
```

The script only uses `CREATE ... IF NOT EXISTS`, so it is safe to run again on a database that already has the tables.

Check that it worked:

```bash
psql -d docs_app_db -c '\dt'
```

You should see six tables:

| Table                  | Holds                                                                  |
| ---------------------- | ---------------------------------------------------------------------- |
| `users`                | Accounts: username and display name                                    |
| `documents`            | Title, HTML content, owner, and the original file for imported uploads |
| `document_shares`      | Who a document is shared with, as `editor` or `viewer`                 |
| `document_activity`    | Log of created / viewed / edited / renamed events                      |
| `document_attachments` | Reserved for file attachments; not used by the app yet                 |
| `global_settings`      | Key/value settings, such as the allowed upload extensions              |

Deleting a user or a document cascades to its shares, activity and attachments.

### 3. Point the app at the database

Create `.env.local` in the project root:

```bash
DATABASE_URL=postgres://localhost:5432/docs_app_db
```

With a username and password:

```bash
DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/docs_app_db
```

`.env.local` is git-ignored. If the variable is missing, the app falls back to `postgres://localhost:5432/docs_app_db`, which works for a default Homebrew install where your macOS user owns the database.

### 4. Create the first user

The database starts with no users, and sign-in needs an existing username. Add one in either of two ways.

From the admin page, after starting the app (next section): open <http://localhost:3000/admin> and fill in **Add a user**.

Or with SQL:

```bash
psql -d docs_app_db -c "INSERT INTO users (username, display_name) VALUES ('alice', 'Alice Example');"
```

Usernames are 2–50 characters, lowercase letters, numbers, dot, dash or underscore.

## Running the app

```bash
npm run dev
```

Open <http://localhost:3000>, sign in with the username you created, and you land on the dashboard.

| Command         | What it does                         |
| --------------- | ------------------------------------ |
| `npm run dev`   | Development server with hot reload   |
| `npm run build` | Production build                     |
| `npm run start` | Serve the production build           |
| `npm run lint`  | ESLint                               |

## Configuration

**Upload extensions.** `/admin` has an **Allowed file extensions** field, stored in `global_settings` as `allowed_extensions` (for example `txt|docx|md`). Until it is saved for the first time the default is `txt`, `docx` and `md`. `.docx` and `.md` keep their formatting; any other allowed extension is imported as plain text.

**Upload size.** Files are limited to 10 MB (`lib/limits.ts`). The Server Action body limit in `next.config.ts` is set to 11 MB to match; change both together.

**Uploaded files.** The original copy of every imported file is written to `uploads/` in the project root. The folder is created on first upload and is git-ignored. Back it up together with the database, and make sure the process running the app can write to it.

## Security notes

This project is a demo and is not ready to be exposed to the internet as is:

- Sign-in is by username only; there are no passwords.
- `/admin` is open to anyone, signed in or not, and can add users and change upload settings.
- The session cookie holds the plain user id and is not signed.

## Troubleshooting

**`database "docs_app_db" does not exist`** — run step 1, or fix the database name in `DATABASE_URL`.

**`relation "users" does not exist`** — the tables were not created in the database the app connects to. Run step 2 against the same database named in `DATABASE_URL`.

**`ECONNREFUSED 127.0.0.1:5432`** — PostgreSQL is not running. Start it with `brew services start postgresql@14`.

**`role "..." does not exist` or `password authentication failed`** — the default connection string uses your operating system user without a password. Put the right user and password in `DATABASE_URL`.

**"No account found" on sign-in** — the user has not been created yet; see step 4.

**Changes to `.env.local` are ignored** — restart `npm run dev`; environment files are read at startup.

## Project layout

```
app/            Routes (sign-in, dashboard, d/[id] editor, admin) and Server Actions
components/     Client components: editor, forms, menus
lib/db/         PostgreSQL connection pool
lib/repositories/  SQL queries, one file per table
lib/services/   Business rules built on the repositories
lib/auth/       Session cookie and permission checks
lib/import/     Converters for uploaded files
lib/storage/    Where uploaded originals are stored
db/             SQL schema
proxy.ts        Redirects visitors without a session cookie to /sign-in
```
