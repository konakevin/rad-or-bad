# Session Context — March 31, 2026

## What We Built Today

### Onboarding / Character Creator
- Rebuilt from Stack navigator to **horizontal FlatList pager** (`app/(onboarding)/index.tsx`)
- 11 step components extracted to `components/onboarding/` (WelcomeStep through RevealStep)
- Back/Next buttons on every step (no swipe gestures — conflicts with sliders)
- Style sliders use `measureInWindow` for accurate touch tracking
- Style spectrum axes compressed to 0.25-0.75 range so no style fully dominates
- Final reveal: generate up to 5 dreams, swipe to browse, pick one to post as first dream
- Pinned post system: first dream shows as top card on home feed via `useFeedStore.pinnedPost`
- Post-auth routing gate in `lib/postAuthRoute.ts` — checks `has_ai_recipe`, routes to onboarding or feed
- Bot mascot images: star-reaching bot (welcome), artist bot (reveal idle), sleeping bot (dreaming)
- All mascot URLs centralized in `constants/mascots.ts`

### Image Generation
- **Provider: Replicate** — Flux Dev model, ~$0.003-0.03/image
- Aspect ratio: `9:16` (Replicate doesn't accept custom w/h, only predefined ratios)
- Reveal screen: `components/onboarding/RevealStep.tsx` — uses Replicate API with queue polling
- 429 rate limit auto-retry built in
- fal.ai still configured in seed scripts but NOT used for in-app generation

### Recipe Engine (`lib/recipeEngine.ts`) — MASSIVE expansion
- **62 mediums**: Van Gogh, Picasso, Monet, Klimt, Banksy, Dalí, Bob Ross, manga styles, K-pop, voxel, LEGO, 8-bit, Tim Burton, Wes Anderson, etc.
- **20 interests**: added gaming, movies, music, geek, sports, travel, pride
- **Interest flavor system**: 40% chance to expand generic interests into specific pop culture (Pokémon, Star Wars, Naruto, etc.) — always expands vague ones like gaming/movies/geek
- **90+ bonus settings**: famous landmarks, planets (Mars, Pluto, Europa), anime locations, hobbies (cars, fishing, hunting, gym), pop culture locations (Hogwarts, Shire, Bikini Bottom, Mushroom Kingdom)
- **10 eras**: added prehistoric, steampunk, art deco, synthwave
- **10 settings**: added beach/tropical, mountains, underwater, underground, village, space
- **10 color palettes**: added black & white, sepia, neon electric, candy pop
- **18 moods** with color_warmth axis (was stuck at 0.5 before)
- **55 actions**, **25 scene types**, **18 lighting options**
- Bonus settings/eras gated by chaos axis: base 8-10% + chaos scaling
- `filterPool` selects from top 8 (was top 5) for more variety

### Dream Wish Feature
- Users whisper a wish to their Dream Bot before bed
- `DreamWishSheet` bottom sheet + `DreamWishBadge` compact button
- Available on: home feed (pill), profile (card), dream tab (card)
- Stored as `dream_wish` on `user_recipes` table
- Nightly script uses it as the subject, then clears it
- Migration 057: `dream_wish` column + `dream_generated` notification type

### Dream Fusion Feature (NEW — just built)
- Merge icon on other users' AI posts in the feed
- Tap → navigates to Dream tab with fusion context
- Three options: **Fuse Dreams** (3✨), **Dream in Style** (2✨), **Dream Photo in Style** (2✨)
- Haiku creatively blends two dream prompts
- `store/fusion.ts` passes context between feed and dream tab
- `hooks/useDreamFusion.ts` handles prompt building + generation

### Sparkle Currency (NEW — just built)
- Migration 058: `sparkle_balance` on users (default 10), `sparkle_transactions` log
- Atomic `spend_sparkles`/`grant_sparkles` RPCs with row locking
- `hooks/useSparkles.ts` for balance + spending

### Nightly Dream Generation Script
- `scripts/nightly-dreams.js` — batch processes eligible users
- Configurable: `--max-budget`, `--batch-size`, `--dry-run`
- Uses Replicate Flux Dev, ~$0.03/image
- If user has dream_wish, uses it as subject then clears
- Inserts `dream_generated` notification with upload thumbnail
- Tracks in `ai_generation_budget` table

### Notifications
- `dream_generated` type added to notifications table
- Inbox shows "A new dream has been conjured ✨" with sleeping bot mascot
- Tap → full detail view of the dream
- Unread badge on inbox tab icon (polls every 60s via `useUnreadCount`)

### Other Changes
- Toast notification system (`components/Toast.tsx`)
- Shared `lib/imageLongPress.ts` for save/delete menus (DreamCard + PostTile)
- Image download: `expo-file-system` File.downloadFileAsync (new API)
- Pinch to zoom: focal point tracking with smooth withTiming reset
- Double-tap tab icon refreshes feed (home + categories)
- Delete post navigates back from detail view
- Dream upload: checkbox to toggle Dream Bot vs custom prompt
- Dream upload: pin posted dream to home feed after posting
- App icon: star-reaching bot mascot (needs Xcode rebuild to show)
- AI-generated profile pics for all 11 seed accounts
- Settings: "Reset My Dream Bot" button (no confirmation, just toast)

## Migrations to Run
- **057**: dream_wish column + dream_generated notification type
- **058**: sparkle_balance + sparkle_transactions + spend/grant RPCs

## Known Issues / TODO
- Pull-to-refresh doesn't work with `pagingEnabled` FlatList — refresh via double-tap tab icon only
- Bottom row of PostGrid clips slightly under tab bar (minor)
- `ai_prompt` field needs to be included in feed queries for fusion to access source prompts
- DreamFusionSheet component exists but isn't used — fusion goes through dream tab instead
- Fusion "Dream a photo in this style" option needs the photo picker to pass the style reference to the dream function
- Sparkle earning mechanisms not built yet (daily login, getting likes, etc.)
- App icon requires Xcode rebuild to update on simulator
- API keys are hardcoded — need to move to env/edge functions for production

## Key Files
- `lib/recipeEngine.ts` — the brain, all prompt generation logic
- `components/onboarding/RevealStep.tsx` — dream preview + generation
- `app/(tabs)/upload.tsx` — dream tab (photo dream + fusion UI)
- `scripts/nightly-dreams.js` — batch generation script
- `store/fusion.ts` — fusion context between screens
- `constants/mascots.ts` — bot mascot image URLs
- `constants/onboarding.ts` — all character creator tile data
- `types/recipe.ts` — recipe type definitions

## Cost Summary
- Replicate Flux Dev: ~$0.003-0.03/image depending on GPU time
- 100 daily users: ~$1-3/day = ~$30-90/month
- Haiku enhancement: ~$0.001/call
- fal.ai was 10x more expensive — switched to Replicate
