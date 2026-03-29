# Content Strategy — Faking Critical Mass at Launch

Every social app needs content before users arrive. Empty feeds kill retention. This doc outlines the plan to make Rad or Bad feel alive from day one.

---

## The Goal

When a new user opens the app, they should see:
- Hundreds of interesting, varied posts across all categories
- Realistic vote counts (some low, some "viral")
- Active-looking comments and engagement
- New content appearing daily
- Different users with unique avatars and usernames

---

## Content Sources

### 1. Pexels (Currently Using)
- **License:** Free for commercial use, no attribution required, no competing service clause
- **Quality:** Good stock photography, clean and professional
- **Risk:** Zero — license explicitly allows use in apps
- **Cost:** Free (API key required, rate limited)
- **Downside:** Recognizable as stock photos to some users

### 2. Unsplash
- **License:** Free for commercial use, no attribution required
- **Quality:** Higher quality and more artistic than Pexels
- **Risk:** Medium — license includes a "competing service" restriction. An app where users browse/rate photos *could* be argued as competing. Probably fine, but gray area.
- **Cost:** Free (API key required, 50 requests/hour free tier)
- **Downside:** Legal gray area for this specific use case

### 3. AI-Generated Images (Recommended)
- **License:** You own them outright. Zero legal risk.
- **Quality:** Excellent — DALL-E 3, Midjourney, Stable Diffusion all produce stunning images
- **Risk:** None — they're original creations
- **Cost:**
  - DALL-E API: ~$0.04/image (1,000 images = ~$40)
  - Midjourney: $10-30/month subscription (unlimited-ish)
  - Stable Diffusion: Free (self-hosted) or ~$0.01/image (API)
- **Upside:** Content is truly unique — nobody has seen these images before. Feels organic, not stock.

### 4. Pixabay
- **License:** Free for commercial use, very permissive
- **Quality:** Mixed — ranges from great to mediocre
- **Risk:** Low
- **Cost:** Free

### 5. Videos
- **Pexels Videos:** Free, same license as photos
- **Pixabay Videos:** Free, permissive license
- **AI Video (Runway, Pika, Kling):** Emerging, $15-40/month, quality varies
- **Coverr.co:** Free stock video clips

---

## Recommended Approach

### Phase 1: Pre-Launch Seed (Before App Store)
**Target: 5,000-10,000 posts**

1. **Pexels** — bulk content across all categories (already implemented in seed script)
2. **AI-Generated (DALL-E)** — 1,000-2,000 unique images for premium feel
   - Generate per category with creative prompts
   - Mix styles: photos, illustrations, close-ups, landscapes
3. **Fake user accounts** — 200-300 bot accounts with:
   - Realistic usernames (already have generator)
   - AI-generated or thispersondoesnotexist.com avatars
   - Varied posting patterns (some active, some casual)
4. **Staggered timestamps** — posts spread over 2-4 weeks so it looks like ongoing activity
5. **Organic-looking engagement:**
   - Vote distribution: bell curve (most posts 5-30 votes, 10% "viral" at 100-500)
   - Comments: 60% of posts get 2-8 comments, 10% get 20+
   - Some posts intentionally "bad" (low scores) — real apps have mid content

### Phase 2: Auto-Poster Bot (Post-Launch)
**Keep the feed alive while user count is low**

Build a Supabase Edge Function on a cron schedule:
- Runs every 2-4 hours
- Pulls a random image from Pexels/Unsplash
- Posts it under a rotating bot account
- Adds 5-15 fake votes over the next few hours (staggered)
- Adds 1-3 comments from other bot accounts
- 10-20 new posts per day, looks like real activity

### Phase 3: Beta Seeding (Soft Launch)
**Real content from real people**

- Invite 50-100 friends, family, micro-influencers
- Incentive: "First 100 users who post 10 things get Founding Member badge"
- Their content mixes with bot content — impossible to tell the difference
- Gradually reduce bot posting as real users increase

### Phase 4: Organic Growth
**Phase out bots**

- Once you hit ~1,000 daily active users, the feed sustains itself
- Stop the auto-poster or reduce to 2-3 posts/day
- Keep bot accounts around (they have vote/comment history) but stop new activity
- Never delete them — their engagement props up older content

---

## Implementation Plan

### AI Image Generation Script
```
scripts/generate-ai-content.js
- Reads category list
- For each category, generates N images via DALL-E API
- Uploads to Supabase storage
- Creates posts under bot accounts
- Adds staggered votes and comments
- Estimated: 1,000 images in ~30 minutes, ~$40
```

### Auto-Poster Edge Function
```
supabase/functions/auto-poster/index.ts
- Triggered by pg_cron every 2 hours
- Fetches random image from Pexels API
- Picks a random bot account
- Creates upload + random votes
- Adds 1-2 comments from other bots
```

### Bot Account Generator
```
scripts/create-bots.js
- Creates 200-300 accounts with realistic profiles
- AI-generated avatars (thispersondoesnotexist.com or generated.photos)
- Realistic usernames, varied join dates
- Some "active" (post often), some "casual" (vote/comment only)
```

---

## Budget Estimate

| Item | Cost | Notes |
|------|------|-------|
| DALL-E images (1,000) | $40 | One-time |
| DALL-E images (5,000) | $200 | One-time |
| Pexels API | Free | Rate limited |
| Unsplash API | Free | Gray area, optional |
| Supabase (Edge Functions) | Free tier | Included in current plan |
| AI avatars | Free | thispersondoesnotexist.com |
| **Total (minimum viable)** | **~$40** | |
| **Total (premium)** | **~$200** | |

---

## Making Bots Sound Human

This is the hardest part. Stock captions and generic comments are instantly recognizable as fake. The solution is AI vision + language models.

### Caption Generation Pipeline

```
For each image before posting:
1. Send image to a vision model (Claude, GPT-4V, or Google Vision)
2. Ask: "What's in this image? Describe it casually."
3. Send that description to a language model with a persona prompt:
   "You are a 22-year-old posting on a photo rating app. Write a short
    caption (under 100 chars) for this photo. Be casual, use lowercase,
    no hashtags. Sometimes be funny, sometimes genuine, sometimes just
    one word. Never sound like a brand or influencer."
4. Use the generated caption as the post description.
```

**Why this works:** The vision model understands the actual content (it's a sunset, it's a dog wearing a hat, it's a plate of tacos). The language model writes like a real person would about that specific thing. No generic "beautiful day!" captions.

### Comment Generation

Same approach but with context:
```
For each bot comment:
1. Vision model describes the image
2. Language model gets: image description + existing comments + a random persona
3. Persona examples:
   - "You're a hype person who loves everything"
   - "You're mildly unimpressed but occasionally surprised"
   - "You're the friend who always has a joke"
   - "You reply to other comments, not just the photo"
4. Generate 1-3 sentence response in that persona's voice
```

### Bot Personality System

Each bot account gets a persistent personality:
- **Posting style:** frequent/casual, rare/curated, meme-heavy, aesthetic-only
- **Comment tone:** hype, sarcastic, genuine, one-word-only, emoji-heavy
- **Category preferences:** each bot has 2-3 favorite categories they post/comment in
- **Vote bias:** some bots vote rad 80% of the time, others are harsh critics at 40%
- **Activity pattern:** some are night owls, some post at lunch, some are weekend warriors

This makes the engagement feel organic because different "people" interact differently.

### Vision API Options

| Service | Cost | Quality | Notes |
|---------|------|---------|-------|
| Claude Vision | ~$0.01/image | Excellent | Best at casual description |
| GPT-4V | ~$0.01/image | Excellent | Good at creative captions |
| Google Vision | Free tier available | Good | Labels only, no captions |
| Llama 3.2 Vision | Free (self-hosted) | Good | No API cost, needs GPU |

### Cost Estimate for AI Captions

- 5,000 posts × $0.01 vision + $0.005 caption = **~$75**
- 15,000 comments × $0.005 each = **~$75**
- **Total: ~$150** for completely organic-sounding content

### Ongoing Bot Simulation

The auto-poster should follow the same pipeline:
```
Every 2-4 hours:
1. Fetch a random Pexels image
2. Run it through vision → caption pipeline
3. Post under a bot account matching the category
4. Over the next 1-6 hours, bot accounts trickle in votes
5. 1-3 bots leave comments (different personas, staggered timing)
6. Occasionally bots reply to each other's comments
```

The staggered timing is critical — real users don't all show up at once. Votes and comments should arrive gradually over hours, not instantly.

### Anti-Detection Patterns

Things that make bots obvious (avoid these):
- All posts have similar caption length
- Comments arrive within seconds of a post
- Every post gets exactly the same number of votes
- Bot accounts never interact with real user content
- All bot avatars have the same style

Things that make bots invisible:
- Varied caption length (1 word to 2 sentences)
- Comments arrive 10 minutes to 12 hours after posting
- Vote counts follow a natural bell curve
- Bots vote on and comment on real user posts too
- Mix of avatar styles (photos, illustrations, initials)
- Some bot accounts are "lurkers" (vote only, never post)
- Bots occasionally make typos or use weird punctuation

---

## Key Principles

1. **Mix sources** — don't let all content look the same
2. **Include "bad" content** — real apps have mediocre posts. All-amazing feels fake.
3. **Stagger everything** — timestamps, vote counts, comment timing
4. **Never admit it** — bot accounts should be indistinguishable from real users
5. **Phase out gradually** — don't flip a switch, slowly reduce bot activity as real users grow
6. **Keep the bots around** — their historical engagement makes the app look more active than it is
