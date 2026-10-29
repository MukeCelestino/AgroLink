# AgroLink app

The Expo app for AgroLink — see the [root README](../README.md) for a
feature overview.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your Firebase project's web
   config (Firebase console → Project settings → General → Your apps):
   ```bash
   cp .env.example .env
   ```
3. Start the dev server:
   ```bash
   npx expo start --web   # or `npx expo start` for the dev-client/QR flow
   ```

## Scripts

- `npm run web` — start the web dev server
- `npm run android` / `npm run ios` — start on a connected device/emulator
  (requires a dev build or Expo Go)
- `npm run lint` — run ESLint

## Firebase project setup

This app expects a Firebase project with:

- **Authentication** → Email/Password provider enabled
- **Firestore** → rules and composite indexes in `firestore.rules` /
  `firestore.indexes.json`
- **Storage** → rules in `storage.rules`, used for verification document
  uploads (requires the project to be on the Blaze pricing plan — Storage
  isn't available on the free Spark plan)

Deploy all three with the [Firebase CLI](https://firebase.google.com/docs/cli)
from this directory:
```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

The first admin account has to be granted by hand — set `isAdmin: true` on
their `Users/{uid}` document in the Firestore console.

## Tech notes

- File-based routing via [Expo Router](https://docs.expo.dev/router/introduction/)
  — screens live in `src/app/`
- Shared app state lives in `src/store/MarketStore.tsx` (React Context,
  backed by real-time Firestore listeners)
- `src/services/` holds the Firebase-touching logic (auth, verification,
  messaging)
- Deployed as a static web export (`expo export --platform web`) to GitHub
  Pages — see `../.github/workflows/deploy-pages.yml`
