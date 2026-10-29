# AgroLink

Agricultural marketplace connecting buyers, sellers, and transporters, with
document-verified sellers/transporters, real-time messaging, delivery
tracking, and lightweight payment confirmation.

**Live app:** https://mukecelestino.github.io/AgroLink/ (web — open in any
browser, no install needed)

## What it does

- **Marketplace** — sellers list produce, buyers browse/search/buy (full or
  partial quantity), or post "wanted" requests
- **Logistics** — transporters browse and accept delivery jobs, post route
  updates, and can share live GPS location while a delivery is in transit
- **Verification** — sellers and transporters must be approved by an admin
  (upload supporting documents) before they can list or deliver; enforced
  server-side via Firestore security rules, not just hidden in the UI
- **Admin panel** — review, approve, or reject verification requests
- **Messaging** — real-time two-way chat between buyers, sellers, and
  transporters, plus automatic one-way notifications when a verification
  request is decided
- **Payments** — AgroLink doesn't process payment itself yet; buyer and
  seller settle up directly (cash, mobile money), and the seller marks an
  order paid once they've received it
- **Extension services** — directory of agricultural advisory providers
  (soil testing, veterinary, insurance, etc.)

## Tech stack

- [Expo](https://expo.dev) (React Native + Expo Router) — one codebase for
  web, iOS, and Android
- [Firebase](https://firebase.google.com) — Authentication, Firestore
  (real-time database), Storage (document uploads)
- TypeScript throughout
- Deployed to GitHub Pages (web build), auto-deployed on every push to
  `main` via GitHub Actions

## Project structure

```
AgroLink/
├── .github/workflows/deploy-pages.yml   # auto-deploys the web build to GitHub Pages
└── agrolink-app/                        # the actual Expo app — see its README for local dev setup
```

## Local development

See [`agrolink-app/README.md`](agrolink-app/README.md).

## Deployment

- **Web**: every push to `main` triggers `.github/workflows/deploy-pages.yml`,
  which builds and publishes the web export to GitHub Pages automatically.
- **Firebase** (Firestore rules, indexes, Storage rules): defined in
  `agrolink-app/firebase.json`, `firestore.rules`, `firestore.indexes.json`,
  and `storage.rules`. Deploy with the
  [Firebase CLI](https://firebase.google.com/docs/cli), run from inside
  `agrolink-app/`:
  ```bash
  firebase deploy --only firestore:rules,firestore:indexes,storage
  ```

## Admin access

There's no in-app way to grant the first admin — set `isAdmin: true` by
hand on a user's document in Firestore (`Users/{uid}`) via the Firebase
console. Every admin after that has to be granted the same way.

## Roadmap / known gaps

- No installable native app yet (Android/iOS) — web-only for now
- Payments are tracked, not processed — no in-app mobile money/card
  integration
- No rate limiting or abuse protection (Firebase App Check not configured)
- No email verification on registration
