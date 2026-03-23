# Rad or Bad — Claude Code Guidelines

## What This App Is
Binary swipe rating app — users upload photos of anything (cars, fits, setups, etc.), others swipe Rad 🔥 or Bad 👎. Must rate 10 others to unlock your own score. Dark, high-energy aesthetic.

## Stack
- **Framework:** React Native + Expo SDK 54, Expo Router v4 (file-based routing)
- **Styling:** NativeWind v4 (Tailwind CSS) — always use className, never StyleSheet
- **State:** Zustand (client state), TanStack Query (server/async state)
- **Backend:** Supabase (Postgres, auth, storage, realtime)
- **Animations:** Reanimated 3 + Gesture Handler
- **Images:** expo-image (not react-native-fast-image)
- **Language:** TypeScript strict mode — no `any`, no `// @ts-ignore`

## Design System

### Colors (use Tailwind classes)
- Background: `bg-background` (#0F0F1A)
- Surface/cards: `bg-surface` (#1A1A2E)
- Borders: `border-border` (#2D2D44)
- Primary action (Gas): `bg-gas` (#FF4500)
- Primary text: `text-text-primary` (#FFFFFF)
- Secondary text: `text-text-secondary` (#9CA3AF)

### Typography
- Headings: `text-xl font-bold text-text-primary`
- Body: `text-base text-text-primary`
- Captions: `text-sm text-text-secondary`

### Spacing
- Screen padding: `px-4`
- Card padding: `p-4`
- Stack gap: `gap-3` or `gap-4`
- Section gap: `gap-6`

### Component Conventions
- All screens have `bg-background` as root background
- Cards use `bg-surface rounded-2xl p-4`
- Primary buttons: `bg-gas rounded-xl py-3 px-6`
- All text must be inside `<Text>` components
- Use `expo-image` `<Image>` not React Native's built-in Image

## File Structure
```
app/
  (tabs)/         # Main tab screens
  (auth)/         # Auth screens (login, signup)
  photo/[id].tsx  # Photo detail modal
components/       # Shared UI components
lib/
  supabase.ts     # Supabase client
store/            # Zustand stores
hooks/            # Custom React hooks
types/
  database.ts     # Supabase DB types
```

## Routing (Expo Router)
- File-based, like Next.js App Router
- `(tabs)` and `(auth)` are route groups (don't appear in URL)
- `[id]` is a dynamic segment
- Navigate with `router.push('/photo/123')` or `<Link href="/photo/123">`

## Key Rules
1. Never use `StyleSheet.create` — always use NativeWind `className`
2. Never use `any` type
3. Always handle loading and error states in UI
4. Supabase queries go in TanStack Query hooks inside `hooks/`
5. Keep screens thin — logic in hooks, UI in components
6. The app is dark-mode only — no light theme logic needed

## iOS UX Principles (Apple HIG)
Follow these in every screen and component:

### Touch targets
- Minimum 44x44pt touch target for all tappable elements (use `min-h-[44px] min-w-[44px]`)
- Never place interactive elements too close together — minimum 8px gap

### Navigation
- Back gestures must always work (don't block swipe-back)
- Bottom tab bar is always visible — never hide it mid-session
- Modals slide up from bottom, never push from side
- Destructive actions always require confirmation

### Feedback & Motion
- Every tap gets immediate visual feedback (opacity or scale change)
- Use `activeOpacity={0.7}` on TouchableOpacity or Reanimated scale for press states
- Animations should be snappy: 200-300ms for transitions, not slow fades
- Add haptic feedback on key actions (Gas/Pass swipe, upload success, achievements)

### Typography & Readability
- Minimum font size 13pt — never smaller
- Line height at least 1.4x font size for body text
- Never put white text on light backgrounds or dark text on dark backgrounds
- Limit lines of text to 60-70 chars wide for readability

### Loading & Empty States
- Every screen needs a loading skeleton or spinner — never show blank white/dark space
- Every empty state needs an illustration or icon + message + action button
- Never show raw error messages to users — translate to plain English

### iOS-Specific Conventions
- Respect safe areas — always wrap screens in `SafeAreaView` or use `safe-area` classes
- Keyboard should push content up, never cover input fields
- Swipe interactions should have rubber-band physics (Reanimated handles this)
- Large title style for main screens, small title for drill-downs
- Use SF Symbols (via `@expo/vector-icons/Ionicons`) for icons — they feel native
