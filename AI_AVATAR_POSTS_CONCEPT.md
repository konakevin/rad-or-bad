# AI Vibe Engine — Product Concept Doc

## The Pivot

This app is pivoting from a binary photo-rating app ("Rad or Bad") to a **dream-sharing platform powered by personal AI art bots.** The name and branding will change (TBD).

## The Theme: Dreams

**Tagline: "Share your dreams with the world."**

The central metaphor is **dreaming.** Each user's AI is their personal "dream machine" — it learns their taste and dreams up magical creations while they're away. Users come back each day to see what their dream machine made for them. The social layer is "dreaming with others" — discovering people whose dream machines produce similar things.

- "Vibe with others" → **"Dream with others"**
- "Discover Vibers" → **"Discover Dreamers"**
- "Vibe request" → **"Dream request"** (or similar — TBD)
- Feed = a stream of everyone's dreams
- Profile = your dream gallery
- Liking = "this dream resonates with me"

**NOTE: The dream theming needs to be applied throughout the app — all copy, screen names, button labels, notification text. This is a future pass once the core features are working.**

## The Idea

Every user gets a personal dream machine — a little AI that learns their taste, dreams up magical creations while they're away, and shares them with the world. During signup, they build their "character" through a quick visual game. The system generates 1 stunning, unique AI image daily, posted automatically to their account. Users browse a feed of everyone's dreams, double-tap to like, and discover people who dream up the same kind of stuff.

Your profile becomes a living dream gallery that reflects your taste without you lifting a finger.

## Core Mechanics (Pivoted)

- **No more voting UI** — the rad/bad swipe buttons are removed from the feed
- **Double-tap to like** — Instagram-style, familiar. Likes drive dream matching + recipe evolution
- **Rad/bad buttons may return later** for active taste shaping, but not for V1 of the pivot
- **Upload = reference photo** — users upload photos only as input to apply a recipe/aesthetic to. Not direct content posts.
- **Recipes are entities** — generated from the user's character attributes, viewable in their collection, selectable when uploading a reference photo
- **Everyone gets awesome images** — more character customization = more *you*, not more *quality*. Kids, grandparents, and newbies all get great results. Power users get results that are more distinctly *them*.
- **Feed is mixed** — house account curated content + all user AI dreams, ranked by dream similarity
- **Dream discovery** — common likes connect users. "Discover Dreamers" is the core social discovery mechanic.

## How It Works

### 1. Onboarding: The Character Creator (11 Screens, ~90 Seconds)

The walkthrough feels like a game, not a form. Every screen collects data that directly changes the AI output — no dead inputs. Set it and forget it. The app does the rest.

**Screen 0: Welcome** — "Your AI artist awaits." Explains the dream machine concept. "Create My Character" CTA.

**Screen 1: Interests** (SUBJECT layer) — "What do you love?" Tile grid: Animals, Nature, Fantasy, Sci-Fi, Architecture, Fashion, Food, Abstract, Dark, Cute, Ocean, Space, Whimsical. Pick 3+. → Controls what subjects appear in dreams.

**Screen 2: Spirit Companion** (SIGNATURE layer) — "Pick your dream companion." Tile grid: Fox, Cat, Owl, Dragon, Rabbit, Wolf, Jellyfish, Deer, Butterfly, Robot, Ghost, Mushroom. Pick 1. → This creature appears as a recurring motif in ~30% of their dreams, tying the gallery together.

**Screen 3: Style Spectrum** (TECHNIQUE layer) — "Shape your style." Three sliders:
- Visual Style: Artistic ↔ Photorealistic → Filters which mediums (watercolor, Pixar, DSLR, etc.) the engine picks from
- Weirdness: Normal ↔ Surreal → Controls distortion level ("slightly unusual" to "full Dali")
- Scale: Intimate Close-up ↔ Epic Vista → Controls camera framing

**Screen 4: World Builder** (WORLD layer) — "Where do your dreams live?" Two sections:
- Era: Ancient, Medieval, Victorian, Retro, Modern, Far Future → Controls architecture, objects, technology in scenes
- Setting: Cozy Indoors, Wild Outdoors, City Streets, Otherworldly → Controls physical environment

**Screen 5: Mood Board** (ATMOSPHERE layer) — "Set the mood." Tile grid: Cozy, Epic, Dreamy, Moody, Playful, Serene, Intense, Nostalgic, Mysterious, Whimsical, Dramatic, Peaceful. → Averages selected moods' energy/brightness values into axes.

**Screen 6: Scene Atmosphere** (ATMOSPHERE layer) — "Set the scene." Tile grid: Sunny Morning, Rainy Afternoon, Snowy Night, Foggy Dawn, Stormy Twilight, Starry Midnight, Golden Hour, Aurora Night. → Directly injected as weather/time/season keywords.

**Screen 7: Color Palette** (TECHNIQUE layer) — "Pick your palette." Cards with gradient swatches: Warm Sunset, Cool Twilight, Earthy Natural, Soft Pastel, Dark & Bold, Surprise Me. → Mapped to color keyword strings in prompts.

**Screen 8: Personality Tags** (ATMOSPHERE layer) — "Describe yourself." Pill grid: Dreamy, Adventurous, Cozy, Edgy, Romantic, Mysterious, Playful, Fierce, Peaceful, Chaotic, Nostalgic, Futuristic, Elegant, Raw, Whimsical, Bold, Gentle, Wild. → Sampled 2-3 per generation as adjective modifiers.

**Screen 9: Surprise Factor** — "How adventurous?" Slider: Predictable ↔ Surprise Me. → Controls the chaos probability — how often the engine picks outside the user's preferences.

**Screen 10: Reveal** — Generates one image from the assembled recipe via Flux. Shows it full-screen with prompt preview. "Love it" (saves recipe, go to feed) / "Try again" (re-rolls) / "Adjust my vibe" (back to sliders).

**Every screen maps to a specific prompt layer. No dead inputs. Every tap changes the output.**

**Complete prompt layer mapping:**
| Layer | Screens | What it controls |
|-------|---------|-----------------|
| TECHNIQUE | Style Spectrum, Color Palette, Surprise Factor | Medium, palette, weirdness, scale, chaos |
| SUBJECT | Interests, Spirit Companion | What's in the image, recurring motif |
| WORLD | World Builder | Era, setting, environment |
| ATMOSPHERE | Mood Board, Scene Atmosphere, Personality Tags | Mood, weather, lighting, adjectives |

### 2. Daily Generation Pipeline

Every day, each user gets **1 new AI-generated dream**:

```
User's recipe (axes + interests + companion + era + setting + mood + atmosphere + palette + tags)
  → Engine rolls dice on each axis using recipe weights as probability biases
  → Filtered option pools select medium, mood, lighting matching rolled axes
  → Random scene type + action verb add variety
  → Spirit companion has 30% chance of appearing
  → Claude Haiku refines into a concise, forceful Flux prompt (~80 words)
  → Flux Pro generates the image at 768×1344 (9:16 portrait)
  → Uploaded to Supabase Storage
  → Posted to the user's account
  → Appears in feed
```

Example: A user with interests [Nature, Fantasy] + companion [Fox] + era [Victorian] + mood [Dreamy, Cozy] + palette [Soft Pastel] might get:
- "A black glass forest under twin moons, dreamy fog rolling between obsidian trees"
- "A ghost deer drinking from a mirror-still lake at twilight, gothic fantasy"
- "Bioluminescent mushrooms growing from ancient ruins, eerie serenity"

### 3. The Invisible Recipe Engine

Behind the scenes, their taps and slider positions map to a recipe:

```json
{
  "axes": { "warmth": 0.7, "chaos": 0.4, "organic": 0.8, "darkness": 0.6 },
  "affinities": ["bioluminescent", "overgrown", "tiny things"],
  "avoidances": ["corporate", "minimalist", "text"],
  "style_bias": "painterly"
}
```

The user never sees this. They don't know the word "recipe." This recipe feeds into the prompt engine. Each day, the engine rolls dice within the bounds of the recipe — so every image is different, but they all *feel like you.* The randomness is constrained by taste.

### 4. Coming Back to Delight

The core experience is **opening the app and being surprised.** You open the app two days later. Your profile has 10 new images. Some are incredible. Some are weird. You scroll through and think *"I didn't even know I wanted to see a glass octopus inside a cathedral but here we are."*

No daily tasks. No notifications nagging you to engage. The content just accumulates, like a garden growing while you sleep. Part of the fun is not knowing what will be there when you come back.

### 5. Passive Evolution — Every Interaction Trains the Recipe

The recipe gets better without the user ever touching a setting:

**Voting on your own images** — The ones that get Rad votes from other people? The system notices and leans into whatever made those work. The ones that flop? The system quietly drifts away from those patterns. Your gallery gets better without you doing anything.

**Saving/favoriting images** — Every time you save an image (yours or someone else's), the system reverse-engineers what made that image work and subtly weights your recipe toward it. You're curating your recipe every time you engage — you just think you're saving cool pictures.

**Voting on other people's images** — Swiping Rad on someone's Cyberpunk + Nature post? The system notes that aesthetic resonates with you and gives your recipe a tiny nudge in that direction.

**Dwell time** — Spending more time looking at an image before swiping? Engagement signal. The system notices what makes you pause.

**Following someone** — Their recipe ingredients get a tiny weight boost in yours. You followed them because you like their vibe — so the system borrows a little of their DNA.

**The user never configures. They just use the app. The recipe evolves underneath.**

If they *want* to tweak — there's a subtle "Adjust your vibe" button buried in settings. Opens the sliders again. But most people never touch it because the passive evolution handles it.

### 6. "Tonight's Dream" — User-Prompted Dreams

Users can set a custom prompt for tonight's dream. They type a simple idea — "a castle in the clouds" or "my dog as a knight" — and the engine enhances it through their full recipe (medium, mood, era, companion, palette, everything). The result feels like *them* but guided by their idea.

**How it works:**
- Text input on the Dream tab or a "Set tonight's dream" button on their profile
- The description is used for ONE generation only — that night's dream
- The engine runs the user's idea through Haiku enhancement with all their recipe constraints
- The output gets a special **"Inspired" badge** (small star or lightbulb icon) in the feed, indicating the user guided this dream
- After generation, the prompt is cleared. Tomorrow goes back to fully automatic
- Other users can see the badge and tap it to see what the user typed (transparent, fun)

**Why this matters:**
- Gives users a reason to come back and engage actively, not just passively
- The badge creates social signal — "this person cared enough to guide their dream tonight"
- The enhancement engine ensures even a lazy prompt like "cats" produces something stunning through their recipe
- Creates a daily micro-ritual: "what should I dream about tonight?"

**Database:** Add `tonight_prompt text` nullable column to `user_recipes`. The daily generation script checks this field first — if set, uses it as the subject instead of random interest sampling, then nulls it out after generation. Posts with user prompts get `is_user_prompted boolean DEFAULT false` on the uploads table.

### 6b. "Daydream" — On-Demand Generation (Monetization)

Users can dream on demand during the day by spending **Sparks** — the app's creative currency. Nightly dreams are free. Daydreaming costs sparks.

**How it works:**
- "Daydream" button on the Dream tab — same tool as tonight's dream but instant
- User types a prompt or just taps "Surprise me" for a random recipe roll
- Costs 1 Spark per generation
- Result appears immediately with a **"Daydream" badge** (sun icon) in the feed
- Users can also daydream a reference photo (the Dream Upload flow) for 1 Spark

**Spark economy:**
- Free users: **3 Sparks/week** (refill every Monday)
- Premium ($5/mo): **Unlimited Sparks** (the primary upsell)
- Spark packs (cheap enough to not think about): 10 for $0.99, 30 for $1.99, 100 for $4.99
- Watching a rewarded ad: **+1 Spark** (self-serve, no pressure)
- Referral bonus: invite a friend who signs up → both get 5 Sparks

**Why Sparks work:**
- Free users can still daydream 3x/week — enough to feel the feature, not enough to not want more
- Premium is positioned as "unlimited creativity" — feels generous, not restrictive
- Spark packs capture impulse purchases ("I NEED to see what this prompt looks like right now")
- Rewarded ads are opt-in and feel like earning, not being advertised to
- The scarcity makes each daydream feel intentional and valuable

**Revenue math at 10K users:**
| Source | Assumption | Monthly |
|--------|-----------|---------|
| Premium subs | 10% @ $5/mo | $5,000 |
| Spark packs | 10% buy $0.99/mo avg | $9,900 |
| Rewarded ads | 30% watch 2/week | $2,400 |
| **Total** | | **$17,300** |
| Generation cost | ~$3,383 | |
| **Profit** | | **~$13,900/mo** |

**Database:** Add `sparks integer DEFAULT 3` to users table. Add `spark_transactions` table for audit trail. Deduct on daydream, refill via cron weekly, add on purchase/ad/referral.

### 7. What Makes Each Account Unique

No two users get the same images because no two users have the same recipe. Even users who make similar choices during onboarding diverge over time because their passive interactions (what they vote on, save, follow) pull their recipes in different directions.

Your profile becomes a curated aesthetic that's distinctly *yours* — even though you didn't make the images yourself. People follow accounts not for the person, but for the **vibe** their account produces. It's like following a mood board that updates itself daily.

### 7. Social Layer

- **Double-tap to like** — familiar Instagram mechanic. No voting UI.
- **Likes drive everything** — vibe matching, recipe evolution, discovery
- **Vibe discovery** — users with overlapping likes surface in "Discover Vibers"
- **"More like this"** — future feature: strong signal that nudges your recipe toward a specific aesthetic
- **No scores** — nobody's art gets a public score. Likes are private counts. The social dynamic is "I vibe with this" not "this scored 73%"

### 8. "Dream a Photo" — Upload as Reference

The Dream tab lets users transform real photos through their dream machine. The reference photo is never posted directly — only the dreamified version.

**User Flow:**
1. Tap Dream tab (moon icon in footer)
2. "Dream a photo" screen with moon icon + explanation
3. Pick a photo from camera roll
4. Preview with "How dreamy?" selector:
   - **Subtle** (0.35) — recognizable, light style changes
   - **Balanced** (0.55) — clearly stylized but still you
   - **Dreamy** (0.7) — the essence is there, reimagined
   - **Full Dream** (0.85) — loosely inspired, fully transformed
5. "Dream It" → NSFW moderation check → Flux image-to-image with recipe prompt + strength
6. Reveal the dreamified image with animation
7. "Post This Dream" / "Dream again" / "New photo"

**Technical:** Uses Flux Pro's `image_url` + `strength` parameters. The reference photo uploads to a temp folder, gets moderated, then passed to Flux alongside the user's recipe prompt. Temp file is cleaned up after generation.

**Use cases:**
- Dream a selfie → see yourself as a Ghibli character in a Victorian greenhouse
- Dream a family photo → the whole family reimagined through your aesthetic
- Dream your pet → your cat as a dreamy watercolor in a fantasy forest
- Dream a landscape from a trip → the place you visited, transformed through your taste

### 8b. "Dream Characters" — Upload Faces & Things

Users can upload photos of people, pets, objects, or places they want to appear in their dreams. These become recurring "dream characters" — the AI weaves them into nightly generations.

**Examples:**
- Upload a selfie → you start appearing in your own dreams as a character
- Upload your dog → your dog shows up alongside your spirit companion
- Upload your friend → gift them a cameo in your dream gallery
- Upload your car, your house, a favorite place → they become dream settings

**How it could work:**
- Profile section: "My Dream Characters" — upload up to 5 reference photos
- Each photo gets a label ("Me", "Luna the cat", "My cabin")
- The daily generation engine passes these as reference images with low strength (~0.3) so they're recognizable but dreamified
- Characters appear in ~20-30% of dreams (not every one — keeps it surprising)
- Could use Flux's IP-Adapter or face-swap models for better likeness preservation

**Why this is powerful:**
- Makes dreams deeply personal — it's not just "art in my style," it's "art starring ME and my life"
- Creates emotional attachment to the gallery
- Social hook: "Look, my dream machine put me and @sarah in a medieval castle last night"
- Natural upsell: free users get 1 dream character, premium gets 5

### 9. User Control

- Users can **delete** any AI post they don't like (keep the gallery curated)
- Users can **pause** AI generation from settings
- Users can **adjust their character** anytime from settings (re-launches onboarding tool)
- Users can browse their **recipe collection** (auto-generated from their character)

## Full Monetization Strategy

### Revenue Stream 1: Sparks (In-App Currency)
Sparks power daydreams (on-demand generation). Nightly dreams are free. Daydreaming costs 1 spark.
- New users start with **3 free sparks**
- Spark packs (cheap enough to not think about):
  - 10 Sparks — $0.99 ($0.10/spark)
  - 30 Sparks — $1.99 ($0.07/spark)
  - 100 Sparks — $4.99 ($0.05/spark)
- Rewarded ad: watch a 30-second ad → +1 Spark
- Referral: invite a friend who signs up → both get 5 Sparks
- Gift sparks to friends
- **Margin: ~89-95% per spark** (costs $0.011 to generate, sells for $0.05-0.10)

### Revenue Stream 2: Premium Subscription ("Lucid" Tier) — $5/mo
- Unlimited sparks (the primary upsell)
- Flux Pro quality instead of Dev (noticeably better images)
- Priority generation (dreams render first)
- No interstitial ads
- Daily nightly dreams guaranteed (if we ever throttle free tier to every-other-day)

### Revenue Stream 3: Interstitial Ads
- 1 interstitial per session for free users (~$10 CPM)
- Rewarded ads for sparks (~$25 CPM, opt-in)
- Premium users see no ads

### Revenue Stream 4: Print-on-Demand — "Make It Real"
- Tap any dream → "Print this dream" → poster, phone case, canvas, sticker, t-shirt
- Partner with Printful/Gooten — zero inventory, they handle fulfillment
- 40-50% margin. A $25 poster costs ~$12 to fulfill
- No upfront cost — pure margin when someone orders

### Revenue Stream 5: Custom Spirit Companions — $0.99 each
- 12 free companions in onboarding
- Premium companions: Unicorn, Phoenix, Kraken, Mechanical Owl, Crystal Stag, Aurora Serpent
- Purely cosmetic — changes what motif appears in dreams
- Low-effort, high-margin. Just a new string in the prompt

### Revenue Stream 6: Dream Packs — Themed Spark Bundles
- Seasonal/limited-time bundles that add temporary recipe modifiers:
  - "Halloween Dream Pack" — 20 sparks + spooky modifiers for a week ($1.99)
  - "Valentine's Pack" — romantic/dreamy modifiers ($1.99)
  - "Chaos Pack" — maxes out weirdness for 10 dreams ($0.99)
- Creates urgency and collectibility

### Revenue Stream 7: Gifting Sparks
- Send sparks to a friend: "Here's 5 sparks, dream something cool tonight"
- Birthday feature: "It's @sarah's birthday! Gift her sparks"
- Social mechanic + revenue — you buy sparks to give away

### Revenue Stream 8: Brand Dreams (B2B, Longer Term)
- Brands pay to inject their aesthetics as optional recipe modifiers
- Users opt-in: "Try the Nike Dream Pack" → dreams get Nike-inspired elements
- Not traditional ads — collaborative creativity. Users might actually want it
- Brands get organic content creation from users posting branded dreams
- Pricing: $10-50K/mo per brand depending on user base

### Build Priority
1. **Sparks + Daydream** (core monetization, build first)
2. **Premium sub** (predictable recurring revenue)
3. **Rewarded ads** (free revenue, no development cost)
4. **Interstitial ads** (once 500+ users)
5. **Print-on-demand** (partner integration, medium effort)
6. **Custom companions** (trivial to build)
7. **Dream packs** (seasonal, once content pipeline is stable)
8. **Gifting** (social feature, later)
9. **Brand dreams** (B2B sales, much later)

### Revenue Projection at 10K DAU
| Source | Assumption | Monthly |
|--------|-----------|---------|
| Premium subs | 10% @ $5/mo | $5,000 |
| Spark packs | 10% buy $0.99/mo avg | $9,900 |
| Rewarded ads | 30% watch 2/week | $2,400 |
| Interstitial ads | 1/session @ $10 CPM | $3,000 |
| Print-on-demand | 1% buy $25 avg, 40% margin | $1,000 |
| Custom companions | 5% buy 1 @ $0.99 | $495 |
| **Total revenue** | | **$21,795** |
| **Generation cost** | | **-$3,383** |
| **Profit** | | **~$18,400/mo** |

### Technical Cost Estimate

**IMPORTANT: Original estimates below were wrong.** Real-world testing on fal.ai showed ~$0.33/image at 768x1664, not $0.01. fal.ai charges based on resolution and adds margin on top of model costs.

Per user per day (1 nightly dream) on fal.ai Flux Dev at 768x1664:
- Generation: ~$0.33
- Haiku prompt enhancement: $0.001
- Storage: negligible
- **Total: ~$10/user/month**

| DAU | Monthly Cost (fal.ai) | Break-even |
|-----|----------------------|------------|
| 100 | ~$1,000 | Needs premium tier |
| 500 | ~$5,000 | Needs premium tier |
| 1,000 | ~$10,000 | Needs premium tier |

### Cost Reduction Options (TODO: evaluate)

1. **Lower resolution** — Generate at 512x896 instead of 768x1664. ~3-4x fewer pixels = proportionally cheaper. Still looks good on phone screens.
2. **Replicate** — Flux Dev on Replicate is reportedly ~$0.03/image flat regardless of resolution. Would bring 100 DAU down to ~$90/month.
3. **Together.ai / Fireworks.ai** — Alternative inference providers, often cheaper than fal.ai for the same models.
4. **Self-hosted GPU** — Run Flux Dev on a rented GPU (~$0.50/hr on RunPod/Lambda). Can generate hundreds of images per hour. Best unit economics at scale but requires infra management.
5. **SDXL or SD3** — Cheaper/free open-source models with lower quality. Could be a free-tier option while Flux stays premium.
6. **Batch generation** — Generate during off-peak hours when GPU providers offer discounts.
7. **Caching/reuse** — For similar recipes, cache prompt components and reuse partial generations.

**Recommended path:** Switch to Replicate for immediate 10x cost reduction, evaluate self-hosting when DAU exceeds 1,000.

## Design Inspirations — Systems We're Stealing From

**Perfume counters — the "nose" approach.** They don't hand you 200 bottles. They ask: warm or cool? Fresh or deep? Sweet or earthy? Three binary choices and they hand you something you love. The complexity is hidden behind simple either/or decisions. Our onboarding image pairs work the same way.

**Spotify Discover Weekly — earned trust.** Spotify doesn't ask you to configure. It watches you listen, then surprises you on Monday. Week 1 is meh. Week 4 you're like "how does it know me." Our passive evolution works the same way — the recipe earns your trust gradually through better and better daily images.

**Tinder's core mechanic — binary decisions at speed.** You know in 200ms if something appeals to you. The onboarding IS a swipe session. Show images rapid-fire, tap the one you prefer. Your aesthetic profile is built from gut reactions, not deliberate choices. People are terrible at describing what they like but excellent at recognizing it.

**Animal Crossing's terraforming.** Constrained daily actions force patience, and patience creates investment. Your 5 daily images can't be brute-forced. The gallery grows organically over time. That slowness creates attachment — it's *your* garden.

**The Lego principle.** Lego doesn't give you clay. It gives you constrained blocks. Constraints breed creativity. 20-25 strong, opinionated aesthetic tiles are better than 100 vague ones. The combinations are what create magic.

**Guitar Hero vs actual guitar.** Guitar Hero made millions feel like rock stars by mapping complex music to 5 colored buttons. Our tool does the same for visual art. Users make simple taste decisions, the system translates them into stunning images. The creative *judgment* is theirs, even though the execution is AI.

## Why This Is Interesting

1. **Zero-effort content creation** — Users get a beautiful profile without creating anything
2. **Infinite fresh content** — The app never runs dry, every day is new
3. **Taste as identity** — Your aesthetic choices define your account, not your camera skills
4. **Set it and forget it** — No daily tasks, no homework. The app rewards you for coming back, not for doing chores
5. **Christmas morning loop** — Every time you open the app, there's new art waiting that feels like *yours*
6. **Invisible sophistication** — Casual users get great results in 30 seconds. Power users can go deep. Same tool.
7. **Unique positioning** — No app does this. It's not an AI art tool (Midjourney) and it's not a photo app (Instagram). It's a taste-discovery platform where your feed is a reflection of who you are.

## The Creativity Engine — Cross-Mixing & Chaos

### The Flavor Wheel

Think of it like a cocktail mixer, not a settings panel. Users don't write prompts — they **spin dials**.

**Intensity sliders** on each attribute. You don't just pick "Goth" — you pick *how goth*. A little goth mixed with mostly cute gives you "pastel skulls and flower crowns." Full goth gives you "obsidian cathedrals in eternal twilight."

**Chaos dial** — one global slider from "Coherent" to "Unhinged." At low chaos, the system picks safe combos from your tags. At max chaos, it starts cross-pollinating things that shouldn't go together — and that's where the best images come from:
- "Brutalist architecture + Kawaii + Underwater" = a concrete bunker made of Hello Kitty on the ocean floor
- "Cottagecore + Cyberpunk" = a thatched-roof cottage with neon vines and holographic chickens
- "Baroque + Space + Cozy" = an ornate gold-framed living room floating in a nebula

**Weekly wildcard** — once a week, the system intentionally picks a tag you *didn't* choose and throws it in. You're a Cozy Cottagecore person and suddenly you get a Cyberpunk Cottagecore image. Users can thumbs-up or thumbs-down the wildcard, and the system learns what unexpected combos they actually enjoy. Over time, your palette expands organically.

### The Remix Chain

When someone sees an image they love on another person's account, they can tap **"Remix."** This doesn't copy the image — it pulls the *generation recipe* (the tag combo that made it) and offers to blend it with your own tags.

So if you're Pastel + Cute and you remix someone's Dark Fantasy + Epic post, you might get: *"a tiny dragon sleeping in a teacup under a blood moon, soft pink lighting."* Your version of their vibe.

This creates **content lineage** — you could trace an image's DNA back through a chain of remixes. That's a social feature in itself. "This image was remixed 47 times" becomes a status symbol for the original creator's taste.

### The Evolution System

The system tracks which of your daily images get the most Rad votes. Over time, it subtly shifts your prompt generation toward what resonates:

- Your Goth + Nature images always score high? More of those, with increasing specificity.
- Your Abstract + Minimalist images always flop? The system dials those down.
- But the **Chaos dial can override this** — so you're not stuck in a bubble.
- Users can also manually "lock" a tag combo they love, telling the system "keep doing this one."

Your account literally **evolves** based on community feedback. The longer you use the app, the more dialed-in your AI gets. New users' accounts feel exploratory and wild. Veteran accounts feel refined and distinctly *them*.

## The Creation Tool — "The Studio"

### Design Philosophy

The tool should feel like **finger painting, not Photoshop.** Three principles:
1. **Every tap changes something visible** — no abstract settings that feel disconnected from output
2. **Progressive depth** — simple on the surface, powerful underneath for people who dig in
3. **The user is the artist** — the tool is their brush, not an auto-generator they watch passively

### The Three Layers

The tool has three depth levels. Casual users never leave Layer 1. Creative users live in Layer 2. Power users obsess over Layer 3.

---

**Layer 1: The Palette (everyone starts here)**

A single screen with a visual grid of aesthetic tiles. Each tile is a beautiful sample image with a one-word label: *Dreamy, Neon, Cozy, Dark, Cute, Wild, Sacred, Retro, Alien, Lush.*

Tap to select. Selected tiles glow and float up slightly. You pick 3-5 tiles. That's it. You're done. The system has enough to start generating.

This takes 10 seconds. No sliders, no confusion. Just "tap what looks cool."

The grid itself is curated to look stunning — every tile is a hero image. The act of choosing feels like browsing an art gallery, not configuring software.

---

**Layer 2: The Mix (for people who want more control)**

Accessible via a "Refine your mix" button below the palette. This is where it gets interesting.

**The Spectrum Bar** — Your selected tiles appear as colored dots on a horizontal bar. Drag them left/right to control their weight. A tile dragged to the far right dominates your generations. A tile barely visible on the left is a subtle seasoning.

Example: You picked Dark, Cute, Nature. Drag Cute to 80%, Dark to 50%, Nature to 30%. You get: *"a tiny black kitten sitting on a skull overgrown with moss and wildflowers, soft moonlight."* Now drag Dark to 80% and Cute to 20%: *"a thorned obsidian garden under a blood-red sky, a single white flower blooming."* Same ingredients, totally different dish.

**The Combo Lock** — A visual indicator showing your current "recipe" as a color-blended circle. As you adjust weights, the circle shifts in real-time. Two users with the same tiles but different weights see different circles. This becomes your **visual signature** — shown on your profile as a tiny color badge. People recognize aesthetics by their circle color before even seeing the images.

**Live Preview** — As you adjust, a text area shows 3 sample prompts that would generate from your current mix. Not images (too slow/expensive) — just the prompts in italics. Users can read them and think "oh hell yes" or "nah, needs more chaos" and keep tweaking. This is the moment they feel like they're creating.

---

**Layer 3: The Lab (for power users)**

Accessible via a beaker icon. This is the deep end.

**Custom ingredients** — Type your own modifiers. Not full prompts — single concepts. "bioluminescent", "art deco", "underwater ruins", "origami", "stained glass." These get mixed into the prompt engine alongside your palette tiles. This is where creative people pull ahead — they're adding ingredients nobody else has.

**Pinned recipes** — Save a specific combo (tiles + weights + custom ingredients) as a named recipe. "My cozy apocalypse mix" or "neon forest vibes." Switch between recipes to generate different styles on different days. Your profile becomes multi-faceted.

**Exclusion list** — "Never generate images with: clowns, spiders, realistic faces." Important for comfort and also for refining output. Sometimes knowing what you *don't* want is more powerful than knowing what you do.

**Prompt history** — See every prompt that generated every image on your account. Star the ones that produced bangers. The system weights starred prompt patterns more heavily in future generations.

**A/B mode** — Generate two images from slightly different mixes side by side. Pick the winner. The system learns from your choice. This is the fastest way to refine your aesthetic — binary decisions are easy, and each one teaches the algorithm something.

### Why This Works

**Casual users** tap 3-5 pretty tiles and get gorgeous daily images. They feel ownership because they chose the vibe. Time investment: 10 seconds.

**Engaged users** discover the spectrum bar and start fine-tuning. They see the direct connection between their adjustments and the output. They feel like artists because the *decisions* are creative even though the execution is AI. Time investment: 5 minutes, then occasional tweaking.

**Power users** go full mad scientist in the Lab. They're adding custom ingredients, saving recipes, running A/B tests, building a deeply personal aesthetic engine. These users become the tastemakers — the accounts everyone follows. Time investment: as much as they want.

The key insight: **the same tool serves all three users** without overwhelming the first group or boring the third.

### What Makes Output Feel Meaningfully Different

The risk is that everyone's images look the same. Here's how creative users get measurably better results:

1. **Weight ratios matter enormously.** "Dark 80% + Cute 20%" produces radically different images than "Dark 20% + Cute 80%." Most casual users leave weights equal. Users who experiment immediately stand out.

2. **Custom ingredients are the secret weapon.** Adding "tilt-shift" or "double exposure" or "art nouveau" as a custom ingredient transforms the output in ways the basic palette can't. These users' images look noticeably more sophisticated.

3. **Exclusions sharpen the output.** Removing "people" from a Nature account makes every image pure landscape. Removing "text" eliminates those ugly AI text artifacts. Precision users get cleaner, more striking results.

4. **Pinned recipes create consistency.** A user with 3 well-tuned recipes produces a profile with a clear visual identity — you scroll their grid and it *looks* intentional, like a curated gallery. A user with random tiles produces a scattered, unfocused grid.

5. **The Evolution system rewards good taste over time.** A user who actively A/B tests and stars good prompts trains their engine faster. After a month, their daily generations are dialed in. A passive user's output stays generic.

The result: two users who both picked "Dark + Nature" produce noticeably different accounts after a week. The one who engaged with the tool more deeply has better images. **Effort is rewarded, but never required.**

### "Surprise Me" Button

Available at every layer. Generates one image right now from your current mix. Free, once a day. This is the hook — the moment someone taps it and sees a stunning image that matches their taste, they understand the product. It's the "aha" moment.

### Prompt Transparency

Every AI post has a subtle "See recipe" option. Tap it and you see:
- The palette tiles that contributed
- The weight ratios
- Any custom ingredients
- The final prompt text

This serves three purposes:
1. Users learn what makes good mixes (educational)
2. Users can tweak their setup based on what worked (refinement)
3. It's just fascinating — people love seeing how things are made

## Social Discovery Features

### Vibe Radio

A feed that's not sorted by recency or popularity, but by **aesthetic similarity to your tags.** You open Vibe Radio and it's a stream of images from accounts with overlapping taste. No usernames, no follower counts — just images. Pure visual discovery. Tap to follow.

This is the "lean back and explore" mode. No swiping, no voting pressure. Just vibes.

### Tag Leaderboards

Who has the highest-rated Goth + Sci-Fi account this week? Competitive creativity without requiring any creative skill. Leaderboards by:
- Tag combination (best Cyberpunk + Nature account)
- Chaos level (best "Unhinged" account)
- Remix count (most remixed images)
- Consistency (highest average score over 30 days)

### Aesthetic Collections

Curated playlists of images, but for visuals. Users or the system can create collections:
- "Cozy Apocalypse" — the best of Cozy + Dark + Post-Apocalyptic
- "Tiny Worlds" — miniature, tilt-shift, small things in big spaces
- "Neon Nature" — where Cyberpunk meets the outdoors

Users can subscribe to collections and get them mixed into their feed.

## TODOs

- **Rebrand bundle ID**: Change from `com.konakevin.radorbad` to `com.konakevin.dreambot`. Requires new App Store registration — do this before public launch.
- **App icon**: Create 1024x1024 PNG with DREAM (hot gradient) / BOT (cold gradient) on dark background
- **Update App Store Connect**: New name, description, screenshots, keywords for Dream Bot

## Open Questions

- Should AI posts be visually distinguished from uploaded photos? (Subtle badge? Or intentionally blended?)
- Should users be able to see each other's tag combinations? (Transparency vs. mystery)
- How to handle the cold start — generate a batch on signup so the profile isn't empty?
- Cap on total AI posts stored per account? (Storage costs at scale)
- Should the daily generation happen at a set time (morning drop) or staggered throughout the day?
- How does the Chaos dial interact with the Evolution system? Does high chaos override learned preferences?
- Should Remix chains be public? (Could be a discovery mechanism or a privacy concern)
- Should there be "seasonal" tags that rotate? (Halloween aesthetics in October, etc.)
- Could two users "collab" by merging their tag sets for a joint generation?
