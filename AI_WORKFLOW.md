# AI workflow

How AI was used to build this project, what was decided along the way, and how the result was checked.

## AI tools used

| Tool | Used for |
| --- | --- |
| Claude Code (VS Code extension), model Claude Opus 5.5 | The four enhancements (presence, comments, version history, PDF export), the unit tests, `db/schema.sql`, `db/seed.sql`, and the documentation |

> **To complete before submitting:** this file was drafted from one Claude Code session, which started with the core application already written. Add here which tool or tools built the core application (sign-in, dashboard, editor, sharing, uploads, activity log, admin), and remove this note.

Claude worked directly in the repository: it read the code, wrote files, ran commands, and reported back. It was pointed at the Next.js documentation bundled in `node_modules/next/dist/docs/` by `AGENTS.md`, because Next.js 16 differs from older versions.

## How I worked with it

I gave it one feature at a time in short prompts ("Real-time collaboration indicators", "Commenting or suggestion mode", "export to pdf", "Document version history") and let it propose the design. After each piece of work I asked follow-up questions to check its claims before moving on.

## What I changed or rejected

**I questioned work the AI did without asking.** To verify the features, Claude launched a headless browser, signed in as two of my users, and wrote a temporary document to my development database. I had not asked for that. When I challenged it, it gave a full account of what it had touched and confirmed the temporary data was deleted. A throwaway check that only the AI can run is not something a reviewer can repeat, so I had it add a real `npm run test` to the repository.

**I did not take "it's up to date" on trust.** I asked separately whether `db/schema.sql` and the README matched the code. For the schema, Claude applied the file to an empty database and compared the result with my live database: identical. For the README, the re-check found four gaps (a placeholder clone URL, no note about the port, a misaligned table, a missing folder), which were then fixed.

**I asked for seed data.** The first README told a reviewer to create their own user. I had the users table dumped into `db/seed.sql` so the app can be signed into immediately after setup.

**Design choices I accepted, and the alternatives that were turned down.** Claude proposed these with reasons; I kept them.

| Decision | Instead of | Why |
| --- | --- | --- |
| Commenting | Suggestion mode | The brief asked for one of the two. Commenting is self-contained; suggestions need tracked changes inside the document format. |
| A "commenter" share level | Letting viewers comment | Keeps "viewer" meaning read-only and gives the owner control over who can comment. |
| Heartbeat every 4 seconds to one endpoint | WebSockets or a collaborative-editing engine | No extra server or dependency, and it fits the existing PostgreSQL setup. The cost is a few seconds of delay and no live text merging. |
| Comments stored in their own table and found again by their quoted text | Marks saved inside the document HTML | People who cannot edit can still comment, and highlights never leak into saved content or the PDF. The cost: a highlight is lost if its text is edited away. |
| One version per editing session (refreshed in place, new one every 10 minutes) | One version per autosave | Autosave fires on every pause in typing; a version each time would bury the history. |
| Version preview rendered through the editor | Injecting stored HTML into the page | Stored HTML comes from users, so injecting it directly would be a script-injection risk. |
| PDF built in the browser with pdfmake | The browser's print dialog, or a headless browser on the server | Gives a real file download with selectable text and no heavy server dependency. The cost: limited font coverage. |
| Unit tests with Vitest | Browser tests with Playwright | Runs with no database or server, so a reviewer can run it immediately. Browser tests would need a separate test database. |

## Mistakes the AI made, and how they were caught

- **Invisible comment highlights.** The automated check passed because the highlight existed in the page, but a screenshot showed no colour. The running dev server was serving an old stylesheet. A production build confirmed the styles were correct, and the README now says to restart the dev server.
- **Testing the wrong application.** Its first requests went to port 3000, where a different project of mine was running. The response made that obvious, and it found the right port.
- **A bug in its own test script.** A button lookup matched the "Comments" toggle instead of the "Comment" submit button, so no comment was posted. It checked the database, saw zero comments, and fixed the script, not the app.
- **A wrong expectation in a unit test.** One test expected the wrong character offset. The failure message showed the code was right and the test was wrong.
- **A lint error.** Its first version read a React ref during render; ESLint rejected it and it was rewritten.
- **A test fixture without a starting version.** The version-restore check looked wrong at first because the test document had been inserted directly with SQL. The restore was confirmed correct from the database rows and a screenshot.

## How I verified

**Repeatable, in the repository**

| Check | Command | Result |
| --- | --- | --- |
| Unit tests | `npm run test` | 61 tests in 8 files pass |
| Type check | `npx tsc --noEmit` | No errors |
| Lint | `npm run lint` | No errors |
| Production build | `npm run build` | Succeeds |

**Done once during development**

- **Two-browser run.** Two headless browser sessions, an owner and a commenter, on a temporary document. Confirmed: each sees the other's avatar; "is editing" appears while one types and clears afterwards; a comment on selected text is highlighted for both; a reply reaches the other person; resolving removes the highlight; the PDF downloads; restoring a version changes the document and adds a history entry.
- **Access control.** The heartbeat endpoint returns 401 without a session and 403 for a user the document is not shared with.
- **PDF.** Opened the exported file and checked the heading, list, bold text, quote, code block and rule against the editor.
- **Schema.** Applied `db/schema.sql` to an empty database and compared it with the live one using `pg_dump`: identical.
- **Seed.** Applied `db/seed.sql` twice to an empty database: six users the first time, no change the second.

## Known gaps

- The two-browser run is not in the repository and is not repeatable by a reviewer.
- No test runs real SQL; the repositories are mocked in the unit tests.
- Simultaneous editing by two people is not merged; the last save wins.
- Sign-in has no passwords and `/admin` is open, as noted in the README.
