# Idle Wanderer v0.19.1 — Flat-Root Admin Build

Everything in this package is placed directly in the repository root. There are no required project folders.

## Public pages

- `index.html` — the game
- `admin.html` — the private administrator dashboard
- `admin.css` and `admin.js` — administrator dashboard assets

After Firebase Hosting is deployed, the dashboard is available at `/admin` or `/admin.html`.

## Server and Firebase files

- `server-functions.js` — privileged callable Cloud Functions
- `set-admin.mjs` — grants the administrator custom claim
- `package.json` — Cloud Functions dependencies and scripts
- `firebase.json` — flat-root deployment configuration
- `firestore.rules` — Firestore access rules
- `database.rules.json` — Realtime Database rules
- `.firebaserc` — Firebase project selection

The Hosting ignore list prevents server code, rules, package files, and the claim script from being served publicly. The Functions configuration uses the repository root as its source while excluding the public game files from the function upload.

## Admin features

- Admin-claim-only login
- Maintenance mode and forced-update screen
- Minimum-version enforcement
- Update messages and scheduled shutdowns
- Online-player viewer
- Account search and inspection
- Display-name, coins, position, inventory, suspension, and ban controls
- Session revocation and account deletion
- Server-written audit history
- Revisioned map drafts, publishing, and rollback foundation

## Install and deploy

Run these commands from the repository root:

```bash
npm install
firebase deploy --only functions,firestore:rules,database,hosting
```

## Grant your account administrator access

Configure Application Default Credentials for the Firebase project, then run from the repository root:

```bash
node set-admin.mjs your-email@example.com
```

Sign out and back in afterward so Firebase refreshes the custom claim.

## Security

Being able to open `admin.html` does not grant administrator access. Every privileged callable function checks the signed-in user's server-issued `admin` custom claim. Never upload or commit a service-account key or secret `.env` file.

## Map editor status

The dashboard can save, validate, publish, and roll back map JSON revisions. The live game still uses its current built-in map until remote map loading is connected in a later world update.
