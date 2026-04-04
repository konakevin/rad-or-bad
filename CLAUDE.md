# DreamBot — Claude Code Guidelines

## Session Startup

**Before doing anything else, read this entire file.** You are a senior principal engineer on this project. Jump straight into whatever Kevin needs.

Do NOT auto-start the dev environment. Let Kevin know he can run `/dream` to spin up the dev tools.

---

## What This App Is

DreamBot is an AI-powered dream image generator for iOS. Users set up a "Vibe Profile" during onboarding (aesthetics, art styles, interests, mood sliders, personal anchors, spirit companion), and the app generates unique AI dreams personalized to their taste. Users can also fuse dreams genetically, twin dreams, set dream wishes, and share/comment/like in a social feed. Dark, high-energy aesthetic. Built for fun and delight.

**Key features:**
- Personality-driven AI image generation via a two-pass prompt engine
- 7 prompt modes (Dream Me, Chaos, Cinematic, Minimal, Nature, Character, Nostalgia)
- Photo reimagining (upload → AI transforms while keeping the subject)
- Re-dream: iteratively feed generated images back through the engine
- Genetic dream fusion (merge two users' recipes)
- Dream twinning (create variations)
- Dream wishes (request specific dream subjects)
- Nightly automatic dream generation with bot messages
- Social feed with likes, comments, shares, friend system
- Sparkle currency (in-app purchases via RevenueCat)
- Content moderation (SightEngine)

---

## Stack

- **Framework:** React Native + Expo SDK 54, Expo Router v4 (file-based routing)
- **Styling:** NativeWind v4 (Tailwind CSS) — always use className, never StyleSheet
- **State:** Zustand (client state), TanStack Query (server/async state)
- **Backend:** Supabase (Postgres, auth, storage, realtime, Edge Functions)
- **AI Image Gen:** Replicate API (Flux Dev for text-to-image, Flux Kontext Pro for photo-to-image)
- **AI Prompt Engine:** Anthropic API (Claude Haiku 4.5) — two-pass concept generator + prompt polisher
- **Moderation:** SightEngine API (NSFW, violence, text profanity)
- **Payments:** RevenueCat (sparkle currency IAP)
- **Auth:** Supabase Auth (email/password, Google, Apple, Facebook OAuth)
- **Animations:** Reanimated 3 + Gesture Handler
- **Images:** expo-image (not react-native-fast-image)
- **Language:** TypeScript strict mode — no `any`, no `// @ts-ignore`

---

## The Vibe Engine — How Dreams Are Generated

### Vibe Profile (types/vibeProfile.ts)

Every user has a `VibeProfile` (version: 2) with:
- **aesthetics[]** — cyberpunk, cozy, liminal, dreamy, etc. (20 options, min 3)
- **art_styles[]** — anime, watercolor, 35mm, oil painting, etc. (19 options, min 2)
- **interests[]** — nature, space, fantasy, animals, etc. (20 options, min 3)
- **moods** — 4 bipolar sliders (0-1): peaceful↔chaotic, cute↔terrifying, minimal↔maximal, realistic↔surreal
- **personal_anchors** — free text: places you love, objects you love, eras you vibe with, how your dreams should feel
- **avoid[]** — things to never include (text, watermarks, etc.)
- **spirit_companion** — one of 12 creatures (fox, cat, owl, dragon, etc.)

### Two-Pass Prompt Engine (lib/vibeEngine.ts)

**Pass 1 — Concept Generator:** Haiku receives the user's vibe profile + prompt mode config + weighting rules. It invents a unique "scene angle" (creative constraint) per dream to prevent repetition. Outputs structured JSON concept with: subject, environment, lighting, camera, style, palette, twist, composition, mood.

**Pass 2 — Prompt Polisher:** Takes the concept JSON and formats it into an optimized 50-70 word Flux prompt. Comma-separated phrases, starts with art style, ends with quality terms.

**Fallbacks:** If Pass 1 fails (bad JSON), `buildFallbackConcept()` constructs mechanically from arrays. If Pass 2 fails, `buildFallbackFluxPrompt()` concatenates concept fields.

### 7 Prompt Modes (constants/promptModes.ts)

| Mode | User/Surprise | Description |
|------|--------------|-------------|
| Dream Me | 70/30 | Personalized to taste |
| Chaos | 30/70 | Wild and unpredictable |
| Cinematic | 70/30 | Movie poster vibes |
| Minimal | 80/20 | One subject, one mood |
| Nature | 60/40 | Pure landscape, no characters |
| Character | 70/30 | Creature or figure focus |
| Nostalgia | 80/20 | Warm memories, golden tones |

### Photo Reimagining

When user uploads a photo, the same two-pass engine runs with an additional constraint: "KEEP THE MAIN SUBJECT — whatever or whoever is in the photo MUST remain the focus. Reimagine everything AROUND the subject."

### Re-Dream

Users can check "Re-dream this image" to feed a generated dream back into Flux Kontext as input, creating iterative creative chains. Each re-dream gets a fresh scene angle.

### Personal Anchors

Places, objects, eras, and dream vibe are included in ~40% of dreams (randomly gated per anchor to prevent overuse). Dream vibe (the creative north star) is always included.

### Bot Messages

Each nightly dream gets a short whimsical message from DreamBot via a dedicated Haiku call. The bot has a personality — playful, warm, a little weird. Messages reference the dream's content and occasionally recall past dreams/wishes.

### Legacy Support

Old users with Recipe (no version field) still work through `lib/recipeEngine.ts`. Migration helper exists at `lib/migrateRecipe.ts`. Both paths coexist in the Edge Function.

---

## Sparkle Economy

### Costs
- **1 sparkle** per dream (all types: Dream Me, photo, twin, re-dream, custom prompt)
- **3 sparkles** per fusion
- **Free:** nightly dreams (server-side), weekly free dream (future)
- **25 sparkles** welcome bonus on onboarding

### IAP Packs (via RevenueCat)

Product IDs centralized in `constants/sparklePacks.ts`:
- `com.konakevin.radorbad.sparkles.25` → 25 sparkles ($2.99)
- `com.konakevin.radorbad.sparkles.50` → 50 sparkles ($4.99)
- `com.konakevin.radorbad.sparkles.100__` → 100 sparkles ($7.99)
- `com.konakevin.radorbad.sparkles.500` → 500 sparkles ($24.99)

### Purchase Flow
App → RevenueCat SDK → Apple payment → RevenueCat webhook → `revenuecat-webhook` Edge Function → `grant_sparkles` RPC → balance updated → client refreshes.

**RevenueCat key:** Production iOS key (`appl_`) in `lib/revenuecat.ts`.
**Webhook secret:** `REVENUECAT_WEBHOOK_SECRET` in Supabase Edge Function secrets.

### Balance Display
Sparkle pill (tappable → sparkle store) on Dream screen pick/reveal/photo headers. "Not enough sparkles" alert with "Get Sparkles" button when balance = 0.

---

## Onboarding (7 steps)

1. **Welcome** — intro screen, "Get Started" CTA
2. **Visual Taste** — pick aesthetics (min 3) + art styles (min 2) from pill grids
3. **Interests** — pick subjects (min 3)
4. **Mood Sliders** — 4 bipolar sliders
5. **Personal Anchors** — 4 free-text fields (places, objects, eras, dream vibe)
6. **Spirit Companion** — pick one or skip
7. **Reveal** — generate first dream, post it, 25 sparkle welcome, welcome notification

Profile saves on first dream generation (not just on post). Welcome notification sent from DreamBot with emojis.

---

## Architecture & File Structure

```
app/                              # Expo Router (file-based routing)
  _layout.tsx                     # Root — providers, auth init, push, realtime
  (auth)/                         # Auth screens (login, signup)
  (onboarding)/                   # 7-step vibe profile builder
  (tabs)/                         # Main app — 5 tabs
    index.tsx                     # Home feed (forYou, following, dreamers)
    top.tsx                       # Top posts grid with category pills
    upload.tsx                    # Dream generation screen (modes, custom prompts, re-dream)
    inbox.tsx                     # Notifications (comments, shares, likes, bot messages)
    profile.tsx                   # User profile + settings
  photo/[id].tsx                  # Full-screen dream detail
  user/[userId].tsx               # Other user profiles
  fusion.tsx                      # Dream fusion interface
  sparkleStore.tsx                # Sparkle shop (IAP)
  comments.tsx                    # Comment thread (legacy route)
  search.tsx                      # User search (fullscreen)
  settings.tsx                    # Account settings

components/
  DreamCard.tsx                   # Full-screen image card (double-tap, swipe, pinch)
  FullScreenFeed.tsx              # Vertical scrolling feed container
  CommentOverlay.tsx              # Inline comment pane (image slides to thumbnail)
  DreamFamilySheet.tsx            # Twin/fusion overlay (same slide-up pattern)
  DreamWishBadge.tsx              # Wish status button
  DreamWishSheet.tsx              # Wish form
  onboarding/*.tsx                # 7 onboarding step components

hooks/                            # TanStack Query hooks (58+ hooks)
store/                            # Zustand stores (auth, onboarding, feed, fusion, album)

lib/
  supabase.ts                     # Supabase client
  vibeEngine.ts                   # Two-pass concept generator + prompt polisher
  dreamApi.ts                     # Edge Function client (generateDream, generateFromVibeProfile, etc.)
  migrateRecipe.ts                # Recipe → VibeProfile converter
  recipeEngine.ts                 # LEGACY — old single-pass recipe engine
  moderation.ts                   # SightEngine content moderation
  revenuecat.ts                   # RevenueCat IAP setup
  dreamPost.ts                    # Insert dream into uploads, pin to feed
  geneticMerge.ts                 # Genetic recipe fusion

types/
  vibeProfile.ts                  # VibeProfile, MoodAxes, PersonalAnchors, ConceptRecipe, PromptMode
  recipe.ts                       # LEGACY Recipe types
  database.ts                     # Supabase auto-generated DB types

constants/
  promptModes.ts                  # 7 prompt mode configs + tiles
  sparklePacks.ts                 # IAP product IDs (source of truth)
  onboarding.ts                   # Aesthetic, art style, interest, companion tile definitions
  theme.ts                        # Fire palette, dark backgrounds, semantic colors

supabase/
  migrations/                     # 72+ SQL migrations
  functions/
    generate-dream/index.ts       # Main dream generation (two-pass + legacy paths)
    nightly-dreams/index.ts       # Scheduled Edge Function (3am UTC)
    revenuecat-webhook/index.ts   # Purchase event handler
    moderate-content/index.ts     # Content moderation
    send-push/index.ts            # Expo Push API dispatcher
    _shared/                      # Shared types + engine for Edge Functions
      vibeProfile.ts              # Deploy copy of types/vibeProfile.ts
      vibeEngine.ts               # Deploy copy of lib/vibeEngine.ts
      recipe.ts                   # Legacy recipe types
      recipeEngine.ts             # Legacy recipe engine

scripts/
  nightly-dreams.js               # Node.js version for GitHub Actions cron
  seed.js                         # Main seed (wipes + recreates test data)
```

---

## 3rd Party Services

### Supabase (Backend)
- **Client:** `lib/supabase.ts`, auth tokens in Expo SecureStore
- **Env vars:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Key RPCs:** `get_feed`, `get_comments`, `spend_sparkles`, `grant_sparkles`

### Replicate (AI Image Generation)
- **Flux Dev** — text-to-image, ~$0.03/image
- **Flux Kontext Pro** — photo-to-image reimagining
- All generation goes through `generate-dream` Edge Function

### Anthropic (Prompt Engine)
- **Haiku 4.5** — concept generator (Pass 1) + prompt polisher (Pass 2) + bot messages
- ~$0.002 per dream for both passes
- All calls server-side in Edge Functions

### RevenueCat (In-App Purchases)
- Production iOS key in `lib/revenuecat.ts`
- Webhook → `revenuecat-webhook` Edge Function → `grant_sparkles` RPC
- Product IDs in `constants/sparklePacks.ts`

### SightEngine (Moderation)
- Image + text moderation via `moderate-content` Edge Function
- Sexual text threshold: 0.7 (blocks explicit, allows suggestive)
- NSFW image rejection sends notification to user

---

## Database Schema (Key Tables)

### Core
- **`users`** — id, email, username, avatar_url, sparkle_balance, last_active_at
- **`uploads`** — id, user_id, image_url, ai_prompt, bot_message, from_wish, is_ai_generated, is_approved, comment_count, like_count
- **`user_recipes`** — user_id, recipe (JSONB — VibeProfile or legacy Recipe), onboarding_completed, ai_enabled, dream_wish

### Social
- **`likes`**, **`favorites`**, **`follows`**, **`friendships`**, **`comments`**, **`post_shares`**, **`blocked_users`**

### System
- **`notifications`** — recipient_id, actor_id, type, body (prefixed: dream:/wish:/welcome:)
- **`sparkle_transactions`** — user_id, amount, reason (spend/grant audit log)
- **`ai_generation_log`** — recipe_snapshot, enhanced_prompt, model_used, cost_cents
- **`ai_generation_budget`** — daily per-user generation tracking

---

## Design System

### Colors
- Background: `#0F0F1A` | Surface: `#1A1A2E` | Border: `#2D2D44`
- Accent (purple): `colors.accent` | Like (red): `colors.like`
- Text primary: `#FFFFFF` | Text secondary: `#9CA3AF`

### Key Rules
1. Never use `StyleSheet.create` — always use NativeWind `className`
2. Never use `any` type
3. Always handle loading and error states in UI
4. Supabase queries go in TanStack Query hooks inside `hooks/`
5. Keep screens thin — logic in hooks, UI in components
6. Dark-mode only — no light theme
7. Use `expo-image` not React Native's Image

---

## GitHub & CI/CD

**Repo:** `konakevin/dreambot` on GitHub. Single `main` branch, push directly.

**CI pipeline** (`.github/workflows/ci.yml`): tsc, lint, prettier, jest on every push.

**Nightly dreams** (`.github/workflows/nightly-dreams.yml`): GitHub Actions cron at 1am MST + random delay. Secrets: `SUPABASE_SERVICE_ROLE_KEY`, `REPLICATE_API_TOKEN`, `ANTHROPIC_API_KEY`.

---

## Team

Kevin is the sole human developer. Claude is the other dev. No team, no PR process. Push directly to `main`.

---

## Pre-Commit Checklist

**Run ALL 4 before every commit — CI will fail if any don't pass:**
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"
npx prettier --write "**/*.{ts,tsx}" --ignore-path .gitignore
npx expo lint
npx tsc --noEmit
npx jest --silent
```

---

## Working With Kevin

### Screenshots
When Kevin asks to view a screenshot: `ls -t ~/Desktop/*.png | head -1` then read it.

### Running Node Scripts
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && node <script>
```

### Deploying Edge Functions
```bash
supabase functions deploy <function-name> --no-verify-jwt
```
**Always use `--no-verify-jwt`.** Deploy immediately after editing — don't wait to be asked. Active functions: `generate-dream`, `nightly-dreams`, `send-push`, `revenuecat-webhook`, `moderate-content`.

### Dev Build
Uses native modules — must use dev build via Xcode, not Expo Go. After adding native packages: `cd ios && pod install && cd ..` then rebuild.

### Database Migrations
Files in `supabase/migrations/`. Run manually in Supabase dashboard SQL editor. `get_feed` RPC must be DROPped before recreating.

### Running Nightly Dreams Locally
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && node scripts/nightly-dreams.js
```
Reads keys from `.env.local` automatically. Clear budget first if testing specific users.

### Setting Sparkle Balance
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && SUPABASE_SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d= -f2) node -e "const{createClient}=require('@supabase/supabase-js');const sb=createClient('https://jimftynwrinwenonjrlj.supabase.co',process.env.SUPABASE_SERVICE_ROLE_KEY);(async()=>{await sb.from('users').update({sparkle_balance:25}).eq('id','eab700d8-f11a-4f47-a3a1-addda6fb67ec');console.log('Done')})();"
```

### Kevin's User ID
`eab700d8-f11a-4f47-a3a1-addda6fb67ec`
