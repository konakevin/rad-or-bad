# Rad or Bad

A binary swipe rating app for iOS. Upload photos of anything — cars, fits, setups, food — and let the crowd decide: **Rad** or **Bad**. You have to rate 10 others before your own score unlocks.

## Stack

- **React Native** + Expo SDK 54, Expo Router (file-based routing)
- **Styling:** NativeWind v4 (Tailwind CSS)
- **State:** Zustand + TanStack Query
- **Backend:** Supabase (Postgres, Auth, Storage)
- **Animations:** Reanimated 3 + Gesture Handler
- **Video:** expo-video (playback) + react-native-compressor (on-device compression before upload)

## Features

- Swipe-based feed with gesture and button voting
- Temperature-based score gradient badges (red = hot, purple = cold)
- Author diversity algorithm so the feed stays varied
- Favorites / bookmarks
- Follow system with feed boost for followed users
- User profiles with post grid and saved posts
- Upload with category tagging

## Development Setup

### How the pieces fit together

React Native apps have two separate layers running simultaneously during development:

**1. The native binary** — compiled by Xcode. Contains all native iOS code: Swift/ObjC internals, native modules like `expo-video` and `react-native-compressor`, camera access, haptics, etc. This is the actual `.app` installed on the simulator.

**2. Metro** — a JavaScript bundler (like webpack) running in your terminal via `npx expo start`. It watches your `.tsx`/`.ts` source files, compiles them, and serves the JS bundle over a local server at `localhost:8081`.

When the app launches on the simulator, it connects to Metro to fetch the JavaScript. Metro serves it, the native shell runs it, and your React Native code comes alive. **Both must be running at the same time.**

Hot reload works because when you edit a `.tsx` file, Metro recompiles just that module and pushes it to the running app instantly — no Xcode rebuild needed.

### Expo Go vs Dev Build

**Expo Go** is a pre-built app published by Expo that has many common native modules baked in. Good for quick prototyping, but limited — it won't work with packages Expo didn't include (like `react-native-compressor`).

**The dev build** (in `/ios`) is our own compiled binary with exactly the native modules this app needs. Same hot reload behavior, no limitations. **Always use the dev build, not Expo Go.**

### First-time setup

```bash
npm install
cd ios && pod install && cd ..
```

Then open `ios/*.xcworkspace` in Xcode, select your simulator, and hit the play button. This compiles and installs the dev build on the simulator.

### Daily development

```bash
npx expo start
```

Metro starts serving JS. Open the **Rad or Bad** app on the simulator (not Expo Go) and it connects automatically. Edit code and it hot reloads instantly.

### When you need to rebuild in Xcode

Only go back to Xcode when:
- You add a new native package (`npx expo install <package>`)
- You run `pod install` after adding a package
- You change native config in `app.json`

Everything else — UI, logic, new screens, hooks — is just Metro hot reload.

### Adding a new native package

```bash
npx expo install <package-name>
cd ios && pod install && cd ..
```

Then rebuild in Xcode before the new package will work.

## Environment

Create a `.env.local` file with your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Seed Data

To populate the database with test users and posts covering all rating tiers:

```bash
SUPABASE_SERVICE_ROLE_KEY=your-key node scripts/seed.js
```

## Feed Algorithm Tests

```bash
SUPABASE_SERVICE_ROLE_KEY=your-key node scripts/test-algorithm.js
```

28 test scenarios covering ranking, recency decay, author diversity, category weighting, and vote filtering.
