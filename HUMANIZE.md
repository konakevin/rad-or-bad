# HUMANIZE — Multi-Bot Design Document

> How multiple Dream Bots transform DreamBot from a tool into an ecosystem of creative personalities.

---

## The Core Concept

You start with one Dream Bot — born during onboarding, shaped by your taste. But what if you could raise a second one? A darker one. A weirder one. A cozy one for Sunday mornings. Each bot dreams differently because each has its own recipe. You pick your active bot and that's who dreams for you tonight.

People don't just have one mood. They have facets. The person who loves cozy cottagecore also has a dark anime phase. Multiple bots let them split their personality into distinct creative voices without diluting any of them.

It also taps into collection psychology. "I have 3 bots." That's identity. That's investment. That's retention.

---

## Purchase Model

- **First bot:** Free (created during onboarding)
- **Second bot:** 500 sparkles (~$4.99 IAP)
- **Third bot:** 1000 sparkles
- **Max 5 bots** — keeps it manageable, creates scarcity
- Each new bot goes through a mini-onboarding (shorter than the first — maybe 5 steps instead of 11, since they already understand the system)

Why sparkles not direct IAP: keeps the currency unified, and users who earn sparkles through engagement can eventually afford one. Rewards loyal users.

---

## UX Flow

### Discovering Additional Bots

- Profile screen shows your current bot with a "+" button next to it
- After 2 weeks of use, a gentle nudge — "Your Dream Bot has been dreaming for 14 nights. Want to raise a sibling?"
- Sparkle Store has a "New Dream Bot" item alongside sparkle packs

### Creating a New Bot

1. Tap "New Dream Bot" -> spend sparkles -> mini-onboarding
2. Steps: Name your bot -> Pick interests (3-5) -> Set mood axes (sliders) -> Pick spirit companion -> Done
3. Faster than first onboarding — skip the explanatory stuff
4. Each bot gets a name and a spirit companion icon as its visual identity

### Switching Bots

- **Dream tab:** Bot picker at top (horizontal scroll of bot avatars — spirit companion icons)
- Tap a bot -> its recipe is used for the next dream you generate on-device
- **Profile/Settings:** Toggle which bot is "active" for nightly dreams
- Only ONE bot is the nightly dreamer at a time

### Bot Identity in the Feed

- Each dream shows which bot made it (small spirit companion icon on the card)
- Your gallery can be filtered by bot
- Bot messages have different voices per bot — the dragon bot talks differently than the butterfly bot

---

## Bot Personality Beyond the Recipe

The recipe controls WHAT dreams look like. Each bot also has a personality that controls HOW it talks to you. The spirit companion becomes a personality archetype:

- **Dragon bot** — confident, slightly dramatic: "Outdid myself tonight. That castle was inevitable."
- **Butterfly bot** — gentle, whimsical: "Found this little meadow. Thought you'd like it here."
- **Ghost bot** — cryptic, moody: "Something pulled me to the water tonight. Not sure why."
- **Robot bot** — dry, deadpan: "Calculated optimal dream. 94% chance you'll save this one."
- **Fox bot** — clever, playful: "Snuck something into the background. See if you can find it."
- **Cat bot** — aloof, self-assured: "Made this for me, honestly. You can look at it though."
- **Owl bot** — wise, contemplative: "Been thinking about light and shadow lately. This felt right."
- **Jellyfish bot** — dreamy, ethereal: "Drifted somewhere deep tonight. It was so quiet down there."
- **Rabbit bot** — excitable, warm: "Okay this one. THIS one. I need you to look at this one."
- **Wolf bot** — intense, loyal: "Hunted for the right mood all night. Finally found it."
- **Deer bot** — gentle, observant: "Noticed the way the light was falling and had to capture it."
- **Mushroom creature bot** — odd, endearing: "Grew this one in the dark. It came out kind of beautiful?"

The Haiku system prompt for bot messages gets a personality modifier based on the companion. Same API cost, way more character.

---

## The Nursery

New bots don't start at full power. They have a "nursery" phase — first 3-5 days where the bot is learning:

- Dreams are slightly more random (chaos floor is higher)
- Bot message tone is more uncertain: "Still figuring out what you like. Bear with me."
- Each like/save during nursery has 3x weight on evolution — the bot learns fast early
- After nursery, the bot "graduates" — small celebration animation, message like "Okay, I think I get you now."

This creates emotional investment. You're not just buying a recipe — you're raising something. The nursery makes you pay attention to those first dreams because your feedback matters more.

---

## Bot Relationships

What if bots could interact with each other?

### Sibling Dreams
Once a week, your two bots collaborate on a dream. The system fuses their recipes (using the genetic merge algorithm that already exists) and generates one dream from the blend. You didn't ask for it — your bots just... did something together.

### Rivalry
If two bots have opposite recipes (one bright/cozy, one dark/chaotic), occasionally one "steals" an element from the other. "Your dragon bot borrowed the butterfly bot's meadow tonight."

### Lineage
When you create a third bot, you can optionally "breed" it from two existing bots instead of going through mini-onboarding. The new bot inherits traits from both parents with genetic jitter. Your bots have children.

This turns the bots into a living ecosystem inside the app. People get attached.

---

## Bot Skins (Visual Identity)

Each bot needs to feel visually distinct beyond just the spirit companion icon:

- **Bot color:** Pick a signature color during creation. The dream card gets a subtle colored border glow when that bot made it (same system as the wish shimmer, different color).
- **Bot avatar:** The spirit companion rendered as a small character illustration. Could be AI-generated at creation time — one Flux call to generate "a cute [spirit_companion] character portrait, chibi style, [bot_color] theme." That becomes the bot's permanent avatar. Costs 3 cents once.
- **Gallery view:** Each bot's dreams grouped by color, so your gallery has visual lanes.

---

## Social Mechanics

- **"Who made this?"** — When you see a dream in the feed, you can see which bot made it. Tap the bot icon to see its name, companion, personality description. You're not just following a person — you're following their bots.
- **Bot envy:** "I love your ghost bot's style" -> creates desire to buy a similar one.
- **Fusion gets richer:** Instead of "fuse with this person," it's "fuse my dragon bot with their jellyfish bot." The specificity makes it more intentional and intimate.
- **Bot leaderboard:** Which of your bots gets more likes? Creates internal competition/engagement.

---

## Monetization Depth

Beyond the initial purchase:

- **Bot reset:** 200 sparkles to wipe a bot's recipe and re-onboard it (keep the name/icon, fresh recipe)
- **Bot boost:** 100 sparkles for a "supercharged" dream — higher quality model, longer Haiku prompt, more creative latitude
- **Bot slot expansion:** Start with max 3, buy a 4th slot for 2000 sparkles, 5th for 5000. Whale-friendly.
- **Seasonal bots:** Limited-time bot templates with pre-set recipes (Halloween bot, Summer Vibes bot). Buy the template, customize from there. Creates urgency.

---

## Schema Changes

Current `user_recipes` has `user_id` as PRIMARY KEY — one recipe per user. Needs to become multi-row:

```sql
ALTER TABLE public.user_recipes
  DROP CONSTRAINT user_recipes_pkey;

ALTER TABLE public.user_recipes
  ADD COLUMN id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN bot_name text NOT NULL DEFAULT 'Dream Bot',
  ADD COLUMN bot_icon text,          -- spirit companion used as icon
  ADD COLUMN bot_color text,         -- signature color hex
  ADD COLUMN bot_avatar_url text,    -- AI-generated portrait URL
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN is_nightly boolean NOT NULL DEFAULT true,
  ADD COLUMN nursery_until timestamptz,  -- null = graduated
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.user_recipes
  ADD PRIMARY KEY (id);

-- Only ONE bot per user can be the nightly dreamer
CREATE UNIQUE INDEX idx_user_recipes_nightly
  ON public.user_recipes(user_id) WHERE is_nightly = true;
```

**Key constraints:**
- `is_nightly` unique per user — only one bot dreams at night
- `is_active` — bot is usable (all bots active by default)
- `nursery_until` — null means graduated, timestamp means still learning
- Existing rows get `id` auto-generated, keep working as before

---

## Impact on Existing Features

| Feature | Change Needed |
|---------|--------------|
| Onboarding | None — creates the first bot as today |
| Dream generation (on-device) | Bot picker sends selected bot's recipe |
| Nightly dreams | Query `WHERE is_nightly = true` bot per user |
| Dream wishes | Attached to the nightly bot |
| Fusion | Pick which of your bots to fuse with |
| Twinning | Uses whichever bot is selected |
| Character Sheet | Shows selected bot's recipe, switcher at top |
| Bot messages | Voice varies per bot's spirit companion personality |
| Evolution | Evolves each bot's recipe independently |
| Feed display | Spirit companion icon badge shows which bot made it |
| `generate-dream` Edge Function | Already accepts any recipe as input — no change needed |

---

## The Emotional Hook

When someone buys a skin in a game, they bought a thing. When someone raises a Dream Bot for 3 weeks, watches it go through nursery, sees it learn their taste, reads its little nightly messages... and then it generates the one dream that makes them go "holy shit, it actually gets me" — that bot isn't a purchase. It's a relationship.

People don't delete relationships. They don't churn from relationships. They tell their friends about relationships.

*"My ghost bot made the most insane dream last night."*

That's a sentence no other app can produce.

---

## Implementation Priority

**Phase 1:** Schema migration, bot picker UI, mini-onboarding flow, sparkle purchase gate
**Phase 2:** Bot personality voices in messages, nursery phase, bot avatar generation
**Phase 3:** Sibling dreams, rivalry mechanics, lineage/breeding
**Phase 4:** Seasonal bots, bot leaderboard, social bot profiles
