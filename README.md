# Rad or Bad

A binary swipe rating app for iOS. Upload photos of anything — cars, fits, setups, food — and let the crowd decide: **Rad** or **Bad**. You have to rate 10 others before your own score unlocks.

## Stack

- **React Native** + Expo SDK 54, Expo Router (file-based routing)
- **Styling:** NativeWind v4 (Tailwind CSS)
- **State:** Zustand + TanStack Query
- **Backend:** Supabase (Postgres, Auth, Storage)
- **Animations:** Reanimated 3 + Gesture Handler

## Features

- Swipe-based feed with gesture and button voting
- Temperature-based score gradient badges (red = hot, purple = cold)
- Author diversity algorithm so the feed stays varied
- Favorites / bookmarks
- Follow system with feed boost for followed users
- User profiles with post grid and saved posts
- Upload with category tagging

## Getting Started

```bash
npm install
npx expo start
```

To run on iOS:

```bash
npx expo run:ios
```

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
