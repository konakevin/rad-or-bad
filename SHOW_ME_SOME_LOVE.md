# Show Me Some Love — DreamBot Human Connection Roadmap

> How to make the Dream Bot feel like an extension of the person, not just a tool.
> Each idea below has enough context to pick up cold in a new session.

---

## The Core Insight

People don't want a tool. They want to feel **seen**. The moment someone looks at a dream and thinks "how did it know that's exactly what I needed to see right now" — that's when the bot becomes an extension of self.

**The hierarchy of user happiness:**
Delight gets people in. Recognition keeps them. Authorship makes them proud. Connection makes them share. Ritual makes them stay. Identity makes them *need* it.

---

## 1. Evolution — Bot Learns From Your Engagement

**Rank: #1 | Complexity: Medium | Effort: 2-3 weeks**

**What:** The recipe gradually drifts based on likes, saves, shares, and ignored dreams. If you consistently like surreal dark dreams but onboarded with "bright and cozy," the bot learns and shifts.

**How it works:**
- Every generated dream stores which recipe elements were actually sampled (interests, era, setting, medium, axes values)
- Engagement signals are weighted: favorite +2.0, share +1.5, like +1.0, ignored -0.2
- Nightly evolution algorithm runs before dream generation: computes weighted average of engaged dream elements, drifts recipe 3-5% per day toward those values
- Axes use exponential moving average; arrays add/remove at most 1 item per cycle
- Takes ~2-3 weeks of daily engagement to noticeably shift an axis

**Safety rails:**
- Manual recipe edit resets evolution (explicit choice trumps drift)
- Spirit companion never evolves (too personal)
- Wish/fusion/twin dreams excluded from signals
- Only learns from user's own dreams (not feed likes)
- Circuit breaker: max 1 evolution per day

**Unlocks:** Recognition, Growth, Identity, Surprise

**Key files:** `lib/recipe/builder.ts` (refactor to expose resolved keys), `supabase/functions/nightly-dreams/index.ts` (wire in evolution), new `lib/recipeEvolution.ts` (algorithm), new migration for `resolved_elements` column and `recipe_evolution_log` table.

**Status: PLANNED** — Full implementation plan exists at `.claude/plans/compressed-weaving-wall.md`

---

## 2. Dreams as Thoughts — Bot Inner Monologue

**Rank: #2 | Complexity: Low | Effort: 2-3 days**

**What:** Each dream comes with a tiny inner thought from the bot. Not a description of the image, but a creative thought: "I was thinking about that forest you liked last week and wondered what it looks like underwater." Gives the bot interiority.

**How it works:**
- After generating the dream prompt, make one more Haiku call with context: the prompt, the user's recent dream history (last 3-5 dreams), and instructions to write a 1-2 sentence "thought" in first person as the Dream Bot
- Store as `bot_thought` column on `uploads` table
- Display below the image on the dream card — subtle, secondary text
- Tone: intimate, curious, slightly mysterious. Not robotic. Not cringe.

**Example thoughts:**
- "I've been dreaming about water lately. Maybe it's something we both need."
- "This one reminded me of that dragon I made you on Tuesday — same energy, different world."
- "I went darker than usual tonight. Felt right."

**Key files:** `lib/enhancePrompt.ts` (add thought generation), `supabase/functions/nightly-dreams/index.ts` (call thought gen, store on upload), `components/DreamCard.tsx` (display thought), new migration for `bot_thought` column on uploads.

**Dependencies:** Benefits massively from #3 (Memory) — thoughts are better when the bot can reference past dreams.

---

## 3. Memory — Continuity Across Dreams

**Rank: #3 | Complexity: Medium | Effort: 1-2 weeks**

**What:** The bot remembers what it made you. It avoids repetition, builds on themes, and can reference past dreams in new prompts. Dreams become a living body of work, not random outputs.

**How it works:**
- Before generating, query the user's last 5-10 dreams from `ai_generation_log` (resolved_elements + prompt)
- Build a "dream history summary" — which interests, eras, settings, mediums were recently used
- Feed this into the Haiku prompt as context: "Recent dreams used: medieval, ocean, anime style. Avoid repeating these unless the user loved them."
- If evolution data exists (#1), weight recent liked elements as "worth revisiting" and recent ignored elements as "avoid"
- Optionally: detect emerging themes ("3 of your last 5 dreams had water — lean into it or break the pattern")

**Key insight:** Memory makes the bot feel like a creative partner instead of a random number generator. The difference between a DJ who reads the room vs. one who plays from a shuffled playlist.

**Key files:** `lib/recipe/builder.ts` or new `lib/dreamMemory.ts` (build history context), `lib/enhancePrompt.ts` (inject history into Haiku system prompt), `supabase/functions/nightly-dreams/index.ts` (query recent dreams).

**Dependencies:** Needs #1's `resolved_elements` data to know what was actually in each dream.

---

## 4. Rejection as Signal — Learn From "No"

**Rank: #4 | Complexity: Low-Medium | Effort: 1 week**

**What:** What you reject says as much about you as what you love. Dreams that are viewed but not liked/saved/shared within 48 hours count as passive rejections with a small negative weight.

**How it works:**
- No new tracking needed. The data already exists: if a dream is >48h old, the user has been active (`last_active_at`), and there's no like/favorite/share — it's a passive rejection.
- Weight: -0.2 (very mild, so it takes many ignored dreams to move the needle)
- The evolution algorithm (#1) already accounts for this in its signal scoring
- This is really a sub-feature of #1, but called out separately because the concept is important

**What NOT to build:** No explicit "dislike" button. That changes the vibe from dreamy to judgmental. The absence of love IS the signal.

**Key files:** Same as #1 — this is built into the evolution algorithm's signal scoring query.

---

## 5. Authorship Framing — "Your Recipe Made This"

**Rank: #5 | Complexity: Low | Effort: 2-3 days**

**What:** Make the user feel like a co-creator, not a consumer. Show which ingredients from their recipe influenced each dream. "Your love of fantasy + the medieval era + your high weirdness axis = this dream."

**How it works:**
- Use `resolved_elements` from #1 (or compute it on the fly from `recipe_id` on the upload)
- On the dream detail screen or Character Sheet, show a "Recipe Fingerprint" — 3-4 key ingredients that went into this dream
- Visual: small pill badges below the image, e.g. `fantasy` `medieval` `dreamy` `high chaos`
- The framing matters: not "AI generated this using:" but "Your taste recipe created:"

**Why it works psychologically:** People feel ownership over things they influenced. The recipe is the user's creative DNA. Making it visible turns passive consumption into creative authorship.

**Key files:** `components/DreamCard.tsx` (add ingredient pills), `app/photo/[id].tsx` (detail view), needs `resolved_elements` data from #1 or a way to reconstruct from `recipe_id`.

---

## 6. Mood — Emotional State Input

**Rank: #6 | Complexity: Low-Medium | Effort: 1 week**

**What:** Dreams shift based on how you're feeling right now. Open the app feeling melancholy → softer, more introspective dreams. Hyped → explosive and dramatic.

**How it works:**
- **Explicit mood (MVP):** Simple mood picker on the home screen — 4-6 mood options (calm, energetic, melancholy, playful, dark, wonder). Tapping one temporarily overrides certain axes for the next dream generation.
- **Time-of-day inference (v2):** Morning dreams trend brighter/warmer, late night trends darker/more mysterious. Free signal, no user input needed.
- Mood modifiers are temporary — they don't change the base recipe, just the next generation's axis biases
- Similar pattern to existing `wish_modifiers` (mood/weather/energy/vibe overrides already exist in the schema)

**Mood → Axis mapping example:**
- Calm: energy -0.3, brightness +0.1, chaos -0.2
- Melancholy: brightness -0.2, color_warmth -0.1, energy -0.2
- Energetic: energy +0.3, chaos +0.1, brightness +0.1
- Dark: brightness -0.3, weirdness +0.2, energy +0.1

**Key files:** New component for mood picker, `store/feed.ts` or `store/onboarding.ts` (store current mood), `lib/recipe/builder.ts` (apply mood overrides to axes before rolling), `constants/wishModifiers.ts` (already has mood definitions — reuse).

---

## 7. Aspiration — Dream Self (Push Beyond Comfort Zone)

**Rank: #7 | Complexity: Low | Effort: 3-4 days**

**What:** Occasionally push the user slightly beyond their stated preferences. If your chaos is 0.3, sometimes roll as if it's 0.5. If you only picked 2 interests, sometimes sample from an adjacent one. The bot explores the edges of your taste.

**How it works:**
- In `buildPromptInput()`, add a 15-20% "aspiration chance" per generation
- When triggered: temporarily bump 1-2 random axes by +0.1 to +0.2, or sample one interest from outside the user's selections (but adjacent — e.g., if they like `fantasy`, try `mythology`)
- Track aspiration dreams in `resolved_elements` with an `aspirational: true` flag
- If the user likes an aspirational dream, evolution (#1) naturally incorporates it
- If they ignore it, no harm — it was a one-off experiment

**Why it works:** People report higher satisfaction from "pleasant surprises that still feel like me" than from perfectly predicted preferences. The uncanny valley of recommendation is when it's TOO accurate — it feels like a cage.

**Key files:** `lib/recipe/builder.ts` (add aspiration logic to buildPromptInput), define adjacency map for interests.

---

## 8. Smarter Chaos — Inspired Randomness

**Rank: #8 | Complexity: Medium | Effort: 1-2 weeks**

**What:** The chaos axis currently adds pure randomness (wildcards, bonus locations, mixed interests). Smarter chaos would create unexpected *combinations* of things you already like, rather than random noise.

**How it works:**
- Instead of chaos gating in random bonus eras/settings from the full pool, weight the bonus pool by the user's existing preferences and engagement history
- "Inspired chaos" = combining two things you love in ways you haven't seen: your love of `ocean` + your love of `steampunk` → "underwater steampunk city"
- Build a "combination engine" that pairs elements from different recipe arrays that haven't been combined before
- Track which combinations have been used (via `resolved_elements`) to avoid repeats

**Key files:** `lib/recipe/builder.ts` (refactor chaos gates and bonus pools), `lib/recipe/pools.ts` (add combination affinity data).

---

## 9. Ritual — Morning Reveal Experience

**Rank: #9 | Complexity: Low | Effort: 1 week**

**What:** The nightly dream arrives "sealed" — you unwrap it in the morning. Add anticipation mechanics: the dream is blurred or hidden behind a reveal animation. Optional streak tracking for consecutive days of checking your dream.

**How it works:**
- Nightly dream generates as normal but is marked `revealed: false` on the upload
- When user opens app, show a special "Your dream is ready" card with a blurred preview
- Tap to reveal with a satisfying animation (blur → clear, or card flip)
- Track dream check streak in `users` table (`dream_streak` integer)
- After 7-day streak, unlock a special "golden dream" with higher chaos/aspiration

**Why it works:** The reveal mechanic creates anticipation (dopamine from uncertainty). Streaks create commitment. Together they make opening the app feel like unwrapping a gift, not checking a feed.

**Key files:** New migration for `revealed` column on uploads and `dream_streak` on users, `components/DreamCard.tsx` (blur state + reveal animation), `app/(tabs)/index.tsx` (detect unrevealed dream, show special card).

---

## 10. Signature Style — Recognizable Visual Fingerprint

**Rank: #10 | Complexity: High | Effort: 3-4 weeks**

**What:** Over time, your bot's output becomes recognizably "yours" — recurring color tendencies, composition preferences, motif patterns. If someone showed 10 dreams to a friend, they could guess whose bot made them.

**How it works:**
- Analyze generated images for dominant colors, composition patterns, recurring subjects (requires image analysis API or CLIP embeddings)
- Build a "style profile" that captures statistical tendencies: "tends toward cool blues, favors close-up compositions, recurring water motifs"
- Feed style profile back into prompt generation as reinforcement: "maintain your established style tendencies: cool palette, intimate framing"
- This is essentially a personal style transfer built gradually from engagement data

**Why it's hard:** Requires image analysis (not just prompt analysis), and balancing style consistency with variety is an art. Too much consistency = boring. Too little = no signature.

**Key files:** New `lib/styleProfile.ts`, would need image analysis integration (possibly CLIP via Replicate), new table for style profile data.

**Dependencies:** Heavily benefits from #1 (evolution) and #3 (memory).

---

## 11. Connection — Fusion as Intimacy

**Rank: #11 | Complexity: Medium | Effort: 2 weeks**

**What:** Deepen the genetic fusion mechanic. When two users fuse dreams, show them a "compatibility report" — how their taste overlaps and diverges. Make the fusion feel like a creative collaboration, not just a blended output.

**How it works:**
- Before fusion, analyze both recipes: "You both love fantasy and ocean, but you're warm where they're cool. Your chaos is high, theirs is low."
- Show a visual Venn diagram or compatibility score
- The fused dream gets a special "collab" badge and both users are credited
- Track "creative partners" — pairs who fuse frequently develop a shared style
- Fusion dreams could have their own gallery/timeline

**Key files:** `lib/geneticMerge.ts` (add compatibility analysis), `app/fusion.tsx` (show compatibility UI), new component for compatibility visualization.

---

## 12. Growth Timeline — Taste Arc Visualization

**Rank: #12 | Complexity: Low-Medium | Effort: 1 week**

**What:** A gallery view showing how your dreams and taste evolved over time. Your dreams from January look different from June, and you can see the arc.

**How it works:**
- Monthly dream grid showing representative dreams from each period
- Overlay recipe axis changes: "Your realism increased from 0.3 to 0.7 over 3 months"
- "Taste milestones": moments where evolution made significant changes, e.g. "March 15: Ocean appeared in your recipe for the first time after you liked 5 ocean dreams"
- Uses `recipe_evolution_log` from #1 for the data

**Key files:** New screen `app/tasteArc.tsx`, new hook `hooks/useRecipeEvolutionLog.ts`, accessible from Character Sheet or profile.

**Dependencies:** Requires #1 (evolution) to have meaningful data.

---

## Implementation Priority

**Sprint 1 (1 week):** #5 (authorship framing), #2 (bot thoughts), #7 (aspiration)
- All low complexity, high emotional impact. The app feels different immediately.

**Sprint 2 (2-3 weeks):** #1 (evolution) Phase 1 + Phase 2
- The foundational system. Everything else gets better once this exists.

**Sprint 3 (1-2 weeks):** #3 (memory), #4 (rejection signals)
- Makes bot thoughts smarter, evolution more accurate, dreams less repetitive.

**Sprint 4 (1 week):** #6 (mood), #9 (ritual)
- Daily experience improvements. Morning reveal + mood input.

**Sprint 5 (1-2 weeks):** #8 (smarter chaos), #12 (taste arc)
- Polish and visualization. Requires accumulated data from earlier sprints.

**Sprint 6 (2-3 weeks):** #11 (fusion intimacy), #10 (signature style)
- Advanced features. Signature style is the hardest and most speculative.

**Total estimated timeline: ~10-12 weeks to ship everything.**
