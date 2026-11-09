# Smart Expense Tracker

A React + Vite personal finance tracker with Firebase email/password authentication and UID-isolated Firestore sync. Each signed-in account also keeps a browser-local cache, so a local network or Firestore problem does not immediately remove the data already available on that device.

## Run locally

**Prerequisites:** Node.js 20+

```bash
npm ci --legacy-peer-deps
cp .env.example .env.local
npm run dev
```

The existing Firebase project configuration is used by default. For a fork or a new Firebase project, replace the `VITE_FIREBASE_*` values in `.env.local` with the Web App configuration from Firebase Console. These values are frontend configuration, not server secrets; do not put an Admin SDK service-account key in this repository.

## Firebase setup

The app uses the existing Firebase project. In Firebase Console:

1. Confirm **Authentication → Sign-in method → Email/Password** is enabled.
2. Open **Firestore Database** and create/enable the database for the existing project if it does not already exist.
3. Open **Firestore Database → Rules**, copy the contents of [`firestore.rules`](firestore.rules), and publish them. The rules allow a signed-in user to access only `/users/{their-auth-uid}` and documents beneath that UID; creates and updates must carry the matching `userId`.
4. Confirm the app’s deployed domain is listed under **Authentication → Settings → Authorized domains**. For this repository, the project URL is `https://arshadldbr.github.io/Smart-Expense/`.

If Firestore is not enabled or the rules have not been published, the app keeps the browser-local cache and displays a sync error; it does not report the data as saved to Firestore. No service-account credential or new Firebase project is required by this code.

## Data layout and migration

The browser client reads and writes only the authenticated user’s Firestore subtree:

```text
users/{uid}                                      profile/preferences
users/{uid}/transactions/{documentId}
users/{uid}/categories/{documentId}
users/{uid}/budgets/{documentId}                  month is stored as a field
users/{uid}/savingsGoals/{documentId}
users/{uid}/creditDebitRecords/{documentId}
users/{uid}/loans/{documentId}
```

Record IDs remain in each document; document path IDs are stable, path-safe encodings of those IDs. Each document includes its owning `userId`, and writes add server-side `createdAtServer`/`updatedAtServer` timestamps. The app listens to the signed-in user’s profile and collections for realtime updates. Transactions, categories, budgets, savings goals, credit/debit records, loans, profile changes, backup restores, and explicit resets use document-level creates, updates, and deletes rather than replacing unrelated documents.

On sign-in, the app merges existing UID-scoped browser data with the matching Firestore account. For matching IDs, Firestore wins; local-only IDs are added once, making a retry safe. Existing unscoped legacy `set_*` values are reserved for the first authenticated UID that claims them, so a later account on a shared browser cannot adopt another account’s old data. A small ownership marker records that claim. Legacy keys and the user-scoped local cache are not deleted by migration. If the app is offline or Firestore rejects access, the local copy stays in place and the status indicator says that cloud sync is pending or failed.

Learned description-to-category suggestions remain a browser-local preference, but now use a UID-specific key; the former global rules key is copied to the first UID that claims it and is retained. Those suggestion rules are not part of the Firestore financial-record collections.

Normal sign-out unmounts the active tracker and switches storage access away from that UID, but retains that UID’s local cache for that same user’s next sign-in/offline fallback. The app does not clear or migrate one account’s cache into another account’s namespace.

## Email authentication

1. Open **Firebase Console → Authentication → Sign-in method**.
2. Enable **Email/Password** and save.
3. In **Authentication → Settings → Authorized domains**, add `arshadldbr.github.io` if it is not already listed.
4. Password reset emails use Firebase's configured email template and authorized domain settings.

The app supports email/password sign in, account registration with display name, password reset, friendly Firebase error messages, and persistent Firebase Auth sessions.

## Build and validate

```bash
npm test
npm run lint
npm run build
```

The unit tests cover migration precedence, duplicate avoidance, category defaults, stable document IDs, and document-level CRUD diffs. They do not require a live Firebase account. Authenticated two-account isolation, realtime propagation, live migration, and offline behavior still need to be exercised against the existing Firebase project with two test accounts and the published rules.

The Vite build creates both `dist/index.html` and `dist/404.html` so GitHub Pages can refresh SPA routes safely.

## GitHub Pages deployment

The workflow at `.github/workflows/deploy.yml` deploys on every push to `main`. In the repository settings:

1. Go to **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Ensure the workflow has Pages write and OIDC permissions (already declared in the workflow).
4. Push the repository to `main` and wait for the **Deploy to GitHub Pages** workflow.

The repository path is part of the Vite base URL (`/Smart-Expense/`). If the repository name differs, update `base` in `vite.config.ts` before deploying.

## Data backups

Use **Settings → Data Management & Backups → Export Complete JSON Backup** before changing devices or deleting browser data. Firestore sync adds cloud storage, but retaining a JSON backup remains a useful recovery option.
