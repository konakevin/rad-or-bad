// Supabase Edge Function: nightly-dreams
// Triggered by pg_cron at 3am UTC daily.
// Generates one dream per eligible active user.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildPromptInput, buildRawPrompt, buildHaikuPrompt } from '../_shared/recipeEngine.ts';
import type { Recipe } from '../_shared/recipe.ts';
import { DEFAULT_RECIPE } from '../_shared/recipe.ts';

const COST_PER_IMAGE_CENTS = 3;
const MAX_BUDGET_CENTS = 500; // $5 default
const BATCH_SIZE = 5;

interface EligibleUser {
  user_id: string;
  recipe: Recipe;
  dream_wish: string | null;
  wish_recipient_ids: string[] | null;
}

Deno.serve(async (req) => {
  const REPLICATE_TOKEN = Deno.env.get('REPLICATE_API_TOKEN');
  const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');

  if (!REPLICATE_TOKEN) {
    return new Response(JSON.stringify({ error: 'Missing REPLICATE_API_TOKEN' }), { status: 500 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const today = new Date().toISOString().slice(0, 10);

  // 1. Find eligible users: onboarded + AI enabled + active in last 36 hours
  const { data: eligible, error: eligibleErr } = await supabase
    .from('user_recipes')
    .select('user_id, recipe, dream_wish, wish_recipient_ids, users!inner(last_active_at)')
    .eq('onboarding_completed', true)
    .eq('ai_enabled', true)
    .gte('users.last_active_at', new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString());

  if (eligibleErr) {
    console.error('[Nightly] Failed to fetch eligible users:', eligibleErr);
    return new Response(JSON.stringify({ error: eligibleErr.message }), { status: 500 });
  }

  if (!eligible || eligible.length === 0) {
    console.log('[Nightly] No eligible users');
    return new Response(JSON.stringify({ message: 'No eligible users', generated: 0 }), {
      status: 200,
    });
  }

  // 2. Filter out users who already got a dream today
  const { data: alreadyDreamed } = await supabase
    .from('ai_generation_budget')
    .select('user_id')
    .eq('date', today);

  const doneSet = new Set((alreadyDreamed ?? []).map((r: { user_id: string }) => r.user_id));
  const users: EligibleUser[] = eligible
    .filter((u: Record<string, unknown>) => !doneSet.has(u.user_id as string))
    .map((u: Record<string, unknown>) => ({
      user_id: u.user_id as string,
      recipe: (u.recipe as Recipe) ?? DEFAULT_RECIPE,
      dream_wish: (u.dream_wish as string | null) ?? null,
      wish_recipient_ids: (u.wish_recipient_ids as string[] | null) ?? null,
    }));

  console.log(
    `[Nightly] ${users.length} users to dream for (${eligible.length} eligible, ${doneSet.size} already done)`
  );

  // 3. Process in batches
  let generated = 0;
  let failed = 0;
  let totalCost = 0;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    if (totalCost >= MAX_BUDGET_CENTS) {
      console.log(`[Nightly] Budget exceeded (${totalCost}c >= ${MAX_BUDGET_CENTS}c), stopping`);
      break;
    }

    const batch = users.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((user) =>
        generateDreamForUser(user, supabase, REPLICATE_TOKEN, ANTHROPIC_KEY, today)
      )
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        generated++;
        totalCost += COST_PER_IMAGE_CENTS;
      } else {
        failed++;
        console.error(`[Nightly] Failed:`, result.reason?.message?.slice(0, 80));
      }
    }

    // Pause between batches
    if (i + BATCH_SIZE < users.length) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  const summary = { generated, failed, costCents: totalCost };
  console.log(`[Nightly] Done:`, summary);
  return new Response(JSON.stringify(summary), { status: 200 });
});

async function generateDreamForUser(
  user: EligibleUser,
  supabase: ReturnType<typeof createClient>,
  replicateToken: string,
  anthropicKey: string | undefined,
  today: string
) {
  const { recipe, dream_wish: wish } = user;
  const input = buildPromptInput(recipe);

  // Build prompt — use Haiku if available, fallback to raw
  let prompt: string;
  const haikuBrief = wish
    ? buildHaikuPrompt(input) +
      `\n\nIMPORTANT: The user wished for "${wish}". Make this the heart of the dream — use their taste profile to style it, but the wish is the subject.`
    : buildHaikuPrompt(input);

  if (anthropicKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 150,
          messages: [{ role: 'user', content: haikuBrief }],
        }),
      });
      if (!res.ok) throw new Error('Haiku error');
      const data = await res.json();
      const text = data.content?.[0]?.text?.trim() ?? '';
      prompt = text.length >= 10 ? text : buildRawPrompt(input);
    } catch {
      prompt = buildRawPrompt(input);
    }
  } else {
    prompt = buildRawPrompt(input);
  }

  // Append wish to raw prompt if Haiku wasn't used and wish exists
  if (!anthropicKey && wish) {
    prompt += ` DREAM WISH: "${wish}" — this is the heart of the dream.`;
  }

  // Generate image via Replicate Flux Dev
  const createRes = await fetch(
    'https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${replicateToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { prompt, aspect_ratio: '9:16', num_outputs: 1, output_format: 'jpg' },
      }),
    }
  );

  if (createRes.status === 429) {
    const body = await createRes.json();
    await new Promise((r) => setTimeout(r, (body.retry_after ?? 6) * 1000));
    throw new Error('Rate limited — will retry in next batch');
  }
  if (!createRes.ok) throw new Error('Generation failed to start');

  const createData = await createRes.json();
  if (!createData.id) throw new Error('No prediction ID');

  // Poll for result
  let imageUrl: string | null = null;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${createData.id}`, {
      headers: { Authorization: `Bearer ${replicateToken}` },
    });
    const pollData = await pollRes.json();
    if (pollData.status === 'succeeded') {
      imageUrl = pollData.output?.[0];
      break;
    }
    if (pollData.status === 'failed') throw new Error('Generation failed');
  }

  if (!imageUrl) throw new Error('Generation timed out');

  // Download from Replicate and upload to Supabase Storage (Replicate URLs are temporary)
  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) throw new Error('Failed to download generated image');
  const imgBuf = await imgResp.arrayBuffer();
  const fileName = `${user.user_id}/${Date.now()}.jpg`;

  const { error: storageErr } = await supabase.storage
    .from('uploads')
    .upload(fileName, imgBuf, { contentType: 'image/jpeg' });
  if (storageErr) throw new Error(`Storage upload failed: ${storageErr.message}`);

  const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName);
  const permanentUrl = urlData.publicUrl;

  // Generate a bot message — a short playful note from the Dream Bot
  let botMessage: string | null = null;
  if (anthropicKey) {
    try {
      // Fetch recent dreams for memory context
      const { data: recentDreams } = await supabase
        .from('uploads')
        .select('ai_prompt, from_wish')
        .eq('user_id', user.user_id)
        .eq('is_ai_generated', true)
        .order('created_at', { ascending: false })
        .limit(5);

      const recentContext = (recentDreams ?? [])
        .map((d: { ai_prompt: string | null; from_wish: string | null }) => d.ai_prompt?.slice(0, 80))
        .filter(Boolean);
      const pastWishes = (recentDreams ?? [])
        .map((d: { ai_prompt: string | null; from_wish: string | null }) => d.from_wish)
        .filter(Boolean);

      let memoryBlock = '';
      if (recentContext.length > 0) {
        memoryBlock += `\nOPTIONAL CONTEXT (reference ONLY if genuinely interesting, otherwise ignore):\n- Recent dreams: ${recentContext.join(' | ')}`;
      }
      if (pastWishes.length > 0) {
        memoryBlock += `\n- Past wishes: ${pastWishes.join(', ')}`;
      }
      if (wish) {
        memoryBlock += `\n- Tonight's wish: "${wish}"`;
      }

      const msgRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 60,
          messages: [{
            role: 'user',
            content: `You are a Dream Bot — a small, curious, slightly mischievous creative spirit that lives inside someone's phone and makes dreams for them every night. You ADORE your human. You're not an AI assistant. You're a tiny artist who gets excited about your own work.

Tonight's dream prompt: "${prompt.slice(0, 200)}"

Write a 1-2 sentence message about tonight's dream.

VOICE RULES:
- You're a character, not a service. Have opinions.
- Be specific. Reference actual elements from the prompt.
- Vary your energy. Sometimes excited, sometimes chill, sometimes proud, sometimes sheepish about a weird choice.
- NEVER explain what the dream is. They can see it. React to it instead.
- Keep it under 20 words. Shorter is better.
- No emojis. No exclamation marks more than once.
- NEVER start with "I" — vary your openings.
${memoryBlock}

Output ONLY the message, nothing else.`,
          }],
        }),
      });

      if (msgRes.ok) {
        const msgData = await msgRes.json();
        const text = msgData.content?.[0]?.text?.trim() ?? '';
        if (text.length >= 5 && text.length <= 100) {
          botMessage = text;
        }
      }
    } catch {
      // Non-critical — dream still gets delivered without a message
    }
  }

  // Store the dream
  const { data: upload } = await supabase
    .from('uploads')
    .insert({
      user_id: user.user_id,
      categories: ['art'],
      image_url: permanentUrl,
      media_type: 'image',
      caption: null,
      is_ai_generated: true,
      ai_prompt: prompt,
      from_wish: wish,
      bot_message: botMessage,
      is_approved: true,
      is_active: true,
    })
    .select('id')
    .single();

  // Send notification to dreamer
  if (upload?.id) {
    const { error: notifErr } = await supabase.from('notifications').insert({
      recipient_id: user.user_id,
      actor_id: user.user_id,
      type: 'dream_generated',
      upload_id: upload.id,
      body: wish ? `Wish: "${wish.slice(0, 60)}"` : null,
    });
    if (notifErr)
      console.warn(`[Nightly] Notification failed for ${user.user_id}:`, notifErr.message);

    // Send notification to wish recipients (friends) — deduplicated
    if (user.wish_recipient_ids && user.wish_recipient_ids.length > 0) {
      const uniqueRecipients = [...new Set(user.wish_recipient_ids)].filter(
        (rid) => rid !== user.user_id
      );
      if (uniqueRecipients.length > 0) {
        const friendNotifs = uniqueRecipients.map((rid) => ({
          recipient_id: rid,
          actor_id: user.user_id,
          type: 'dream_generated',
          upload_id: upload.id,
          body: wish ? `Wished you a dream: "${wish.slice(0, 50)}"` : 'Wished you a dream',
        }));
        const { error: friendErr } = await supabase.from('notifications').insert(friendNotifs);
        if (friendErr)
          console.warn(
            `[Nightly] Friend notifications failed for ${user.user_id}:`,
            friendErr.message
          );
      }
    }
  }

  // Log generation
  const { error: logErr } = await supabase.from('ai_generation_log').insert({
    user_id: user.user_id,
    recipe_snapshot: recipe,
    enhanced_prompt: prompt,
    model_used: 'flux-dev',
    cost_cents: COST_PER_IMAGE_CENTS,
    status: 'completed',
  });
  if (logErr) console.warn(`[Nightly] Log insert failed for ${user.user_id}:`, logErr.message);

  // Update budget
  const { error: budgetErr } = await supabase.from('ai_generation_budget').upsert(
    {
      user_id: user.user_id,
      date: today,
      images_generated: 1,
      total_cost_cents: COST_PER_IMAGE_CENTS,
    },
    { onConflict: 'user_id,date' }
  );
  if (budgetErr)
    console.warn(`[Nightly] Budget update failed for ${user.user_id}:`, budgetErr.message);

  // Clear wish + recipient if used
  if (wish) {
    const { error: wishErr } = await supabase
      .from('user_recipes')
      .update({ dream_wish: null, wish_recipient_ids: null, wish_modifiers: null })
      .eq('user_id', user.user_id);
    if (wishErr) console.warn(`[Nightly] Wish clear failed for ${user.user_id}:`, wishErr.message);
  }

  console.log(`[Nightly] Dream generated for ${user.user_id} (wish: ${wish ? 'yes' : 'no'})`);
}
