# Docs Clone

A small Google Docs–style editor: create rich-text documents, import `.docx`, `.md` and `.txt` files, and share them with other users as editor, commenter or viewer.

- **Presence** — see who else has the document open and who is typing.
- **Comments** — comment on selected text or on the whole document, reply, resolve and reopen threads.
- **Version history** — look at earlier versions and restore one.
- **PDF export** — download the document as a PDF.
- **Activity log** — who created, viewed, edited, renamed or restored each document.

Built with Next.js 16 (App Router, Server Actions), React 19, Tiptap, Tailwind CSS 4, pdfmake and PostgreSQL.

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
git clone git@github.com:bryangiray/docs-clone.git
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

You should see nine tables:

| Table                  | Holds                                                                  |
| ---------------------- | ---------------------------------------------------------------------- |
| `users`                | Accounts: username and display name                                    |
| `documents`            | Title, HTML content, owner, and the original file for imported uploads |
| `document_shares`      | Who a document is shared with, as `editor`, `commenter` or `viewer`    |
| `document_activity`    | Log of created / viewed / edited / renamed / restored events           |
| `document_versions`    | Snapshots of each document's content, for version history              |
| `document_comments`    | Comment threads and their replies                                      |
| `document_presence`    | Who has each document open right now                                   |
| `document_attachments` | Reserved for file attachments; not used by the app yet                 |
| `global_settings`      | Key/value settings, such as the allowed upload extensions              |

Deleting a user or a document cascades to its shares, activity, versions, comments and attachments.

**Upgrading an existing database:** run the same `psql -d docs_app_db -f db/schema.sql` command again after pulling changes. It adds any tables that are missing and leaves existing data alone.

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

### 4. Add users

The database starts with no users, and sign-in needs an existing username. Load the starter users:

```bash
psql -d docs_app_db -f db/seed.sql
```

This adds six accounts. Sign in with any of the usernames; there are no passwords.

| Username    | Display name  |
| ----------- | ------------- |
| `user1`     | Bryan Giray   |
| `user2`     | Bob Giray     |
| `user3`     | Charlie Giray |
| `newuser`   | NewUser       |
| `user2test` | user2         |
| `testuser`  | TestUser      |

The seed is safe to re-run: usernames that already exist are left alone. It contains users only, no documents.

To add your own users instead, or as well, use the admin page after starting the app (next section): open <http://localhost:3000/admin> and fill in **Add a user**. Or use SQL:

```bash
psql -d docs_app_db -c "INSERT INTO users (username, display_name) VALUES ('alice', 'Alice Example');"
```

Usernames are 2–50 characters, lowercase letters, numbers, dot, dash or underscore.

## Running the app

```bash
npm run dev
```

Open <http://localhost:3000>, sign in with one of the usernames from step 4 (for example `user1`), and you land on the dashboard. If port 3000 is already in use, Next.js picks the next free port and prints the address in the terminal.

| Command              | What it does                       |
| -------------------- | ---------------------------------- |
| `npm run dev`        | Development server with hot reload |
| `npm run build`      | Production build                   |
| `npm run start`      | Serve the production build         |
| `npm run lint`       | ESLint                             |
| `npm run test`       | Unit tests, run once (Vitest)      |
| `npm run test:watch` | Unit tests, re-run on change       |

The tests live next to the code they cover as `*.test.ts`. They do not need the database or a running server: the repositories are replaced with mocks.

## Configuration

**Upload extensions.** `/admin` has an **Allowed file extensions** field, stored in `global_settings` as `allowed_extensions` (for example `txt|docx|md`). Until it is saved for the first time the default is `txt`, `docx` and `md`. `.docx` and `.md` keep their formatting; any other allowed extension is imported as plain text.

**Upload size.** Files are limited to 10 MB (`lib/limits.ts`). The Server Action body limit in `next.config.ts` is set to 11 MB to match; change both together.

**Version history.** Every save is recorded. While one person keeps editing, their latest version is updated in place and a new one starts every 10 minutes, so autosave does not create a version per keystroke. Restoring adds the old content as a new version, so nothing is lost. Versions are kept indefinitely.

**Presence and live comments.** Open editors send a heartbeat to `/api/documents/[id]/live` every 4 seconds while the tab is visible. Other people's avatars and new comments therefore appear within a few seconds, not instantly. Document text itself is not merged live: if two people edit at once, the last save wins.

**PDF export.** The PDF is generated in the browser from the content on screen, including unsaved edits. It uses the Roboto font, which covers Latin, Cyrillic and Greek; other scripts will not render.

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

**"No account found" on sign-in** — that username is not in the database. Load the starter users or add your own; see step 4.

**New styles do not show up in development** — restart `npm run dev`; edits to `app/globals.css` are not always picked up by a running dev server.

**Changes to `.env.local` are ignored** — restart `npm run dev`; environment files are read at startup.

## Project layout

```
app/            Routes (sign-in, dashboard, d/[id] editor, admin) and Server Actions
app/api/        Heartbeat endpoint for presence and live comments
components/     Client components: editor, forms, menus
lib/db/         PostgreSQL connection pool
lib/repositories/  SQL queries, one file per table
lib/services/   Business rules built on the repositories
lib/auth/       Session cookie and permission checks
lib/import/     Converters for uploaded files
lib/export/     PDF export
lib/storage/    Where uploaded originals are stored
db/             SQL schema (schema.sql) and starter users (seed.sql)
test/           Test support files; the tests themselves sit next to the code as *.test.ts
proxy.ts        Redirects visitors without a session cookie to /sign-in
```
