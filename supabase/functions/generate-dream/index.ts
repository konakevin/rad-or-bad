/**
 * Edge Function: generate-dream
 *
 * Server-side dream generation. Receives a recipe (or raw prompt),
 * builds the prompt via the recipe engine, optionally enhances via Haiku,
 * generates an image via Replicate Flux, persists to Storage, and returns
 * the permanent URL.
 *
 * POST /functions/v1/generate-dream
 * Authorization: Bearer <user JWT>
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildPromptInput, buildRawPrompt, buildHaikuPrompt } from '../_shared/recipeEngine.ts';
import type { Recipe } from '../_shared/recipe.ts';

const MAX_DAILY_GENERATIONS = 50;

// Curated + engine pool merged — all mediums in one place per model
const CURATED_FLUX_STYLES = [
  // Kevin's handpicked
  'Bob Ross happy little trees, soft landscape, calm mountains, warm and gentle',
  'Faded vintage photograph, slightly overexposed, warm nostalgic tones',
  'Ornate embossed leather book cover style',
  'Miniature tilt-shift photograph, toy-like depth of field, vivid saturated',
  'Cottagecore illustrated, wildflowers, linen, soft pastoral warmth',
  'Solarpunk, lush green futurism, solar panels on organic architecture',
  'Cute 3D character render, soft rounded shapes, vibrant colors',
  'DMT visionary art style, sacred geometry, infinite recursive patterns, overwhelming color',
  'Spider-Verse mixed media, comic dots, paint splatters, dynamic angles',
  'A whimsical chalk drawing on sidewalk, colorful and wobbly',
  '1960s Pan Am advertisement illustration style, glamorous jet-age optimism, bold colors',
  'Vaporwave aesthetic, pink and cyan gradients, Greek statues, surreal consumerism',
  'A blacklight poster, psychedelic velvet colors glowing in the dark',
  'Acid trip visuals, melting surfaces, breathing walls, colors bleeding into each other',
  'Art nouveau, Alphonse Mucha style, flowing organic lines',
  'Gustav Klimt gold-leaf Byzantine mosaic, ornate patterns',
  'Adorable chibi kawaii illustration, pastel watercolors, big sparkly eyes',
  'Pixar-style 3D render, soft rounded shapes, vibrant colors',
  'Dreamworks animation style, expressive characters, cinematic lighting',
  'A knitted Sackboy character, LittleBigPlanet craft world, buttons and zippers',
  'Aardman claymation, Wallace & Gromit smooth clay, expressive faces',
  'Soft shoujo manga claymation stop-motion, visible fingerprint textures in clay',
  'K-pop album cover aesthetic, glossy, soft lighting, pastel gradients',
  'Tim Burton gothic illustration, spindly limbs, spiral shapes, dark whimsy',
  'LEGO brick diorama, everything built from LEGO, plastic studs visible',
  'Comic book panel, bold ink outlines, halftone dots',
  'Monet impressionist, soft water lilies, dappled light, dreamy blur',
  'LEGO minifigure in a realistic world, tiny plastic character',
  'Muppet-style felt puppet world, fuzzy textures, googly eyes, Jim Henson whimsy',
  'LittleBigPlanet craft world, knitted characters, cardboard and sticker scenery',
  'Baroque oil painting, Caravaggio dramatic chiaroscuro, deep shadows, golden light',
  'Digital painting, cinematic lighting, vivid colors',
  'Digital illustration, clean lines, vibrant composition',
  'Fantasy illustration, lush detail, dramatic lighting',
  'Papercraft diorama, handmade paper cutouts, miniature world',
  'Ultra-realistic photograph, DSLR, 8K detail',
  'Picasso cubist style, fragmented geometric faces, multiple perspectives',
  // From engine pool
  'oil painting on canvas, visible brushstrokes, impressionist',
  'vintage Disney animation cel, 1950s hand-drawn style',
  'ukiyo-e Japanese woodblock print, flat color, bold outlines',
  'chalk pastel on black paper, soft edges, dramatic contrast',
  'claymation stop-motion, visible fingerprint textures in clay',
  'retro 1980s airbrush illustration, chrome and gradients',
  'botanical scientific illustration, ink linework with watercolor',
  'stained glass window, bold black leading, jewel-tone translucent color',
  'neon sign art, glowing tube lights on dark brick wall',
  'low-poly geometric 3D render, faceted surfaces',
  'pencil sketch with watercolor splashes, loose linework',
  'fantasy book cover illustration, lush detail, dramatic lighting',
  'cross-stitch embroidery on fabric, every element stitched in thread, visible grid texture',
  'everything is shiny molded plastic, like toys in a playset — glossy surfaces, seam lines',
  'entire world built from LEGO bricks, everything is LEGO — plastic studs visible everywhere',
  'classic Disney 2D animation, clean ink outlines, cel-shaded, 1990s era',
  'Wes Anderson symmetrical composition, pastel color palette, dollhouse miniature',
  'vintage travel poster, bold flat shapes, limited color palette, art deco lettering',
  'dreamy soft-focus film photography, 35mm grain, light leaks, golden tones',
  'felt and fabric diorama, stitched textures, button eyes, handmade craft',
  'Funko Pop vinyl figure style, oversized head, tiny body, glossy plastic',
  'mosaic tile artwork, small colorful square tiles, ancient Roman style',
  'pop art screen print, bold primary colors, Andy Warhol style',
  'cyberpunk neon cityscape style, rain-slicked surfaces, holographic ads',
  'Tron digital world, glowing neon lines on black, light trails, geometric',
  'gouache painting, thick opaque paint, matte finish, children\'s book illustration',
  'origami paper sculpture, crisp folds, white paper with colored accents',
  'woodcut print, bold carved lines, high contrast black and white with one accent color',
  'shadow puppet theater, silhouettes against warm backlit screen',
  'Japanese ink sumi-e, minimal brushstrokes, zen simplicity, negative space',
  'voxel 3D art, chunky isometric blocks, Minecraft meets cute',
  'Frida Kahlo surrealist style, lush flowers, vivid symbolic colors, folk art motifs',
  'Banksy street art, stencil graffiti, political irony, concrete wall',
  'Edward Hopper lonely realism, empty diners, long shadows, isolation',
  'Keith Haring bold outlines, dancing figures, primary colors, street art',
  'MC Escher impossible architecture, tessellations, mind-bending perspective',
  'Basquiat neo-expressionist, raw, crown motif, scrawled text, street',
  'Hokusai Great Wave style, Japanese woodblock, dramatic ocean, Mount Fuji',
  'Rothko color field, massive blocks of bleeding color, meditative',
  'Dalí melting clocks surrealism, desert dreamscape, impossible objects',
  'Warhol repeated screen print, bold flat pop art colors, celebrity style',
  'Rankin/Bass stop-motion, classic Christmas special, felt snow and glitter',
  'Laika stop-motion, Coraline/Kubo style, dark handcrafted beauty',
  'golden age storybook illustration, Beatrix Potter watercolor, gentle linework',
  'marble sculpture, Michelangelo carved stone, dramatic form',
  'charcoal drawing on textured paper, smudged dramatic shadows',
  'tarot card illustration, ornate gold borders, mystical symbolism',
  'vintage newspaper comic strip, Ben-Day dots, speech bubbles, Calvin & Hobbes warmth',
  'Looney Tunes cartoon, exaggerated squash and stretch, painted backgrounds, slapstick energy',
  '1920s Steamboat Willie style, black and white rubber hose animation, simple shapes',
  'pointillism, entire image made of tiny colored dots, Seurat style',
  'Mondrian De Stijl, bold black grid lines, primary color blocks, geometric abstraction',
  'Bauhaus design, clean geometric shapes, primary colors, functional minimalism',
  'Soviet Constructivist propaganda poster, bold red and black, angular typography',
  'Art Brut outsider art, raw untrained style, intense emotion, unconventional materials',
  'dark academia aesthetic, leather-bound books, candlelit libraries, autumn tones',
  'heavy metal album cover, dark fantasy, skulls and fire, intricate detail',
  'Blue Note jazz album cover, bold graphic shapes, smoky atmosphere, cool tones',
  'hyperrealistic CGI render, impossibly sharp detail, every pore and fiber visible',
  'kaleidoscope vision, infinite symmetrical reflections, fractal patterns, shifting geometry',
  'Alex Grey visionary art, translucent bodies, energy meridians, cosmic consciousness',
  'Retro sci-fi pulp magazine cover, 1950s ray guns and rockets, bold lettering',
  'Pop surrealism, Mark Ryden style, big-eyed figures, unsettling cute, candy colors',
  'Colorful steampunk illustration, brass gears, copper pipes, Victorian machinery',
  'Retro futurism, sleek chrome, atomic age optimism, space-age design',
  'Surrealism, impossible dreamscape, floating objects, melting reality',
  '3D blind box collectible figure, chibi proportions, glossy vinyl, display packaging',
  'Collage art, cut paper, mixed textures, layered fragments, editorial style',
  'Risograph print, limited color overlap, grainy texture, indie zine aesthetic',
  'Minimalist 80s retro, neon grid, sunset gradient, clean geometric shapes',
  'Glitch art, corrupted pixels, data moshing, digital distortion, vivid color bands',
  'Polygon art, geometric faceted surfaces, crystalline low-poly world',
  'Coloring book style, clean black outlines, white fill, intricate patterns',
  'Fantasy art style, epic and painterly, rich saturated colors, magical atmosphere',
  'Western cartoon style, bold outlines, exaggerated expressions, flat vivid colors',
  'Retro game style, 16-bit sprite art, vibrant pixel palette, nostalgic',
  'Light and airy, soft glowing whites, ethereal luminosity, delicate',
  'Candy aesthetic, glossy sugar-coated surfaces, pastel swirls, sweet and shiny',
  'Bubble aesthetic, iridescent floating spheres, translucent rainbow reflections, dreamy',
  '3D printed, visible layer lines, matte plastic filament, single-color sculptural',
];

const CURATED_SDXL_STYLES = [
  // Kevin's handpicked
  '8-bit pixel art, NES color palette, chunky pixels, retro gaming',
  'Retro anime VHS aesthetic, 1990s cel animation, warm grain, scanlines',
  'Digital illustration, anime style, clean lines, vibrant colors',
  'Studio Ghibli anime watercolor, hand-painted cel animation',
  'Anime illustration, expressive eyes, dynamic composition',
  'Manga panel, detailed ink work, dramatic shading',
  'Van Gogh swirling brushstrokes, vivid blues and yellows, thick impasto',
  'Lo-fi anime dreamscape, cozy room, warm lighting, chill vibes',
  'Makoto Shinkai style with photorealistic anime backgrounds, dramatic sky',
  'Soft shoujo manga illustration, sparkly eyes, flower petals, gentle pastels',
  'A whimsical cottagecore illustration, gentle linework, pastoral',
  // From engine pool
  'shonen manga action scene, speed lines, dramatic angles, high energy',
  'isometric pixel art, retro game aesthetic, crisp edges',
  'lo-fi hip hop album cover, cozy room, warm lighting, anime-inspired chill',
  'Cel-shaded video game cutscene, Zelda Breath of the Wild style',
  'Webtoon digital comic style, clean lines, soft gradients, vertical panel',
  'Anime art, vibrant colors, expressive characters, dynamic action',
  'Japanese illustration, delicate linework, soft washes, elegant composition',
  'Impressionism, loose visible brushstrokes, dappled light, plein air',
  'Marker illustration, bold Copic marker strokes, vibrant ink on paper',
];

interface RequestBody {
  /** Which Flux model to use */
  mode: 'flux-dev' | 'flux-kontext';
  /** User's taste recipe — server builds the prompt from this */
  recipe?: Recipe;
  /** Pre-built prompt — used for twins (re-rolling existing prompt) */
  prompt?: string;
  /** Optional user hint to weave into the dream */
  hint?: string;
  /** Base64 data URL for flux-kontext (photo-to-image) */
  input_image?: string;
  /** Custom Haiku brief — used for photo reimagining (upload.tsx dream()) */
  haiku_brief?: string;
  /** Fallback prompt if Haiku fails — paired with haiku_brief */
  haiku_fallback?: string;
  /** Epigenetic context for fusion dreams */
  epigenetic_context?: string;
  /** Whether to persist the image to Storage (default: true) */
  persist?: boolean;
  /** Skip Haiku enhancement — use raw prompt from recipe engine (faster) */
  skip_enhance?: boolean;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const REPLICATE_TOKEN = Deno.env.get('REPLICATE_API_TOKEN');
  const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');

  if (!REPLICATE_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'Server misconfigured: missing REPLICATE_API_TOKEN' }),
      { status: 500 }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Create a user-scoped client from the request's Authorization header.
  // The Supabase gateway already validates the JWT before invoking the function,
  // so we can trust the token and use it to identify the user.
  const authHeader = req.headers.get('authorization') ?? '';
  const supabaseUser = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_ANON_KEY') ?? serviceRoleKey,
    {
      global: { headers: { Authorization: authHeader } },
    }
  );
  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    console.error(
      '[generate-dream] Auth failed:',
      authError?.message,
      'header:',
      authHeader.slice(0, 30)
    );
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }
  const userId = user.id;

  // Service role client for database operations (bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Parse request body
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const {
    mode,
    recipe,
    prompt: rawPrompt,
    hint,
    input_image,
    haiku_brief,
    haiku_fallback,
    epigenetic_context,
    persist = false,
    skip_enhance = false,
  } = body;

  if (!mode || !['flux-dev', 'flux-kontext'].includes(mode)) {
    return new Response(
      JSON.stringify({ error: 'Invalid mode. Must be "flux-dev" or "flux-kontext"' }),
      { status: 400 }
    );
  }

  if (mode === 'flux-kontext' && !input_image) {
    return new Response(JSON.stringify({ error: 'flux-kontext mode requires input_image' }), {
      status: 400,
    });
  }

  if (!recipe && !rawPrompt && !haiku_brief) {
    return new Response(JSON.stringify({ error: 'Must provide recipe, prompt, or haiku_brief' }), {
      status: 400,
    });
  }

  // ── Timing ─────────────────────────────────────────────────────────────────
  const t0 = Date.now();
  const lap = (label: string) => {
    const elapsed = Date.now() - t0;
    console.log(`[generate-dream] ⏱ ${label}: ${elapsed}ms`);
  };

  // ── Rate limit check ──────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const { data: budgetRow } = await supabase
    .from('ai_generation_budget')
    .select('images_generated')
    .eq('user_id', userId)
    .eq('date', today)
    .single();
  lap('rate-limit-check');

  const todayCount = budgetRow?.images_generated ?? 0;
  // Rate limit disabled for now
  // if (todayCount >= MAX_DAILY_GENERATIONS) {
  //   return new Response(
  //     JSON.stringify({
  //       error: 'Daily generation limit reached. Try again tomorrow!',
  //       retry_after: secondsUntilMidnightUTC(),
  //     }),
  //     { status: 429 }
  //   );
  // }

  // ── Build prompt ──────────────────────────────────────────────────────────
  let finalPrompt: string;

  let logAxes: Record<string, unknown> = {};

  if (rawPrompt) {
    finalPrompt = rawPrompt;
    lap('prompt-raw');
  } else if (haiku_brief) {
    finalPrompt = await enhanceViaHaiku(haiku_brief, haiku_fallback ?? haiku_brief, ANTHROPIC_KEY);
    lap('prompt-haiku-brief');
  } else if (recipe) {
    // THREE-PART SONG: roll which dream type this is
    // 50% archetype (focused narrative), 30% chord (pure blend), 20% beauty (pure visual)
    const dreamRoll = Math.random();
    const dreamMode = dreamRoll < 0.5 ? 'archetype' : dreamRoll < 0.8 ? 'chord' : 'beauty';

    let archetype: { key: string; name: string; prompt_context: string; flavor_keywords: string[]; trigger_interests?: string[]; trigger_moods?: string[] } | undefined;
    if (dreamMode === 'archetype') {
      try {
        const { data: userArchs } = await supabase
          .from('user_archetypes')
          .select('archetype_id')
          .eq('user_id', userId);
        if (userArchs && userArchs.length > 0) {
          const randomArch = userArchs[Math.floor(Math.random() * userArchs.length)];
          const { data: arch } = await supabase
            .from('dream_archetypes')
            .select('key, name, prompt_context, flavor_keywords, trigger_interests, trigger_moods')
            .eq('id', randomArch.archetype_id)
            .single();
          if (arch) archetype = arch;
        }
      } catch { /* non-critical — falls back to chord path */ }
    }

    // Build ingredients — archetype identity injected into Haiku brief, not the engine
    const input = buildPromptInput(recipe);

    // Pick a random style from the full pot (Flux + SDXL), route accordingly
    const allStyles = [...CURATED_FLUX_STYLES, ...CURATED_SDXL_STYLES];
    input.medium = allStyles[Math.floor(Math.random() * allStyles.length)];

    logAxes = {
      medium: input.medium,
      mood: input.mood,
      lighting: input.lighting,
      interests: input.interests,
      dreamSubject: input.dreamSubject,
      sceneType: input.sceneType,
      action: input.action,
      settingKeywords: input.settingKeywords,
      eraKeywords: input.eraKeywords,
      sceneAtmosphere: input.sceneAtmosphere,
      colorKeywords: input.colorKeywords,
      weirdnessModifier: input.weirdnessModifier,
      scaleModifier: input.scaleModifier,
      personalityTags: input.personalityTags,
      spiritAppears: input.spiritAppears,
      spiritCompanion: input.spiritCompanion,
      archetype: archetype?.key ?? 'none',
      dreamMode,
    };
    const fallback = buildRawPrompt(input);

    if (skip_enhance) {
      finalPrompt = fallback;
      lap('prompt-raw-skip');
    } else {
      let haikuBrief: string;

      if (dreamMode === 'beauty') {
        // BEAUTY MODE: pure visual poetry — environment, light, texture, no characters
        haikuBrief = `You are painting a place, not telling a story. No characters, no figures, no creatures. Just a breathtaking environment that makes someone stop scrolling and stare.

Think: the light after a storm. A canyon at golden hour. An alien ocean at dawn. A forest floor after rain. Textures you can feel. Light that has weight. Depth that pulls you in.

Medium: ${input.medium}
Setting: ${input.settingKeywords}, ${input.eraKeywords}
Mood: ${input.mood}, ${input.lighting}
Palette: ${input.colorKeywords || 'vivid and expressive'}
Weather: ${input.sceneAtmosphere}

Write an image prompt (max 50 words). Start with the art medium. You can go macro (a single dewdrop, a crack in ancient stone) or epic (an infinite horizon, a cathedral of clouds). Just make it GORGEOUS. No people. No text. Output ONLY the prompt.`;
      } else {
        // CHORD or ARCHETYPE mode — use the standard Chord template
        haikuBrief = buildHaikuPrompt(input);

        // If archetype is active, inject its creative brief so Haiku knows the identity
        if (archetype) {
          haikuBrief += `\n\nTONIGHT'S DREAM IDENTITY: ${archetype.name}\n${archetype.prompt_context}\n\nUse the ingredients above but channel them through this identity. The dream should feel like it came from "${archetype.name}."`;
        }
      }

      logAxes.promptPath = dreamMode + (archetype ? '+' + archetype.key : '');

      if (hint) {
        haikuBrief += `\n\nIMPORTANT: The user requested "${hint}". Make this the heart of the dream — use their taste profile to style it, but this wish is the subject.`;
      }

      if (epigenetic_context) {
        haikuBrief += `\n\n${epigenetic_context}`;
      }

      // Store what we sent to Haiku so we can compare input vs output
      logAxes.haikuBrief = haikuBrief.slice(0, 2000);

      finalPrompt = await enhanceViaHaiku(haikuBrief, fallback, ANTHROPIC_KEY);
      logAxes.usedFallback = finalPrompt === fallback;
      lap('prompt-haiku-recipe');
    }
  } else {
    return new Response(JSON.stringify({ error: 'No prompt source provided' }), { status: 400 });
  }

  const { model: pickedModel } = pickModel(mode, finalPrompt);
  logAxes.model = pickedModel;
  console.log(
    `[generate-dream] User ${userId}, mode=${mode}, model=${pickedModel}, prompt=${finalPrompt.slice(0, 80)}...`
  );

  // ── Generate image via Replicate ──────────────────────────────────────────
  try {
    const tempUrl = await generateImage(mode, finalPrompt, input_image, REPLICATE_TOKEN);
    lap('replicate-done');

    let imageUrl = tempUrl;

    // Always log the prompt for debugging/analysis
    try {
      await supabase.from('ai_generation_log').insert({
        user_id: userId,
        recipe_snapshot: recipe ?? {},
        rolled_axes: logAxes,
        enhanced_prompt: finalPrompt,
        model_used: mode === 'flux-kontext' ? 'flux-kontext-pro' : 'flux-dev',
        cost_cents: 3,
        status: 'completed',
      });
    } catch {
      /* non-critical */
    }

    // Only persist to Storage and budget when explicitly requested (i.e., user taps Post)
    if (persist) {
      imageUrl = await persistToStorage(tempUrl, userId, supabase);
      lap('persist-done');

      try {
        await supabase.from('ai_generation_budget').upsert(
          {
            user_id: userId,
            date: today,
            images_generated: todayCount + 1,
            total_cost_cents: (todayCount + 1) * 3,
          },
          { onConflict: 'user_id,date' }
        );
      } catch {
        /* non-critical */
      }
    }

    lap('total');
    console.log(`[generate-dream] ✅ Done in ${Date.now() - t0}ms for user ${userId}`);

    return new Response(
      JSON.stringify({
        image_url: imageUrl,
        prompt_used: finalPrompt,
        dream_mode: logAxes.dreamMode ?? mode,
        archetype: logAxes.archetype ?? null,
        model: logAxes.model ?? null,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error(`[generate-dream] Error for user ${userId}:`, (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function enhanceViaHaiku(
  brief: string,
  fallback: string,
  anthropicKey: string | undefined
): Promise<string> {
  if (!anthropicKey) return fallback;
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
        messages: [{ role: 'user', content: brief }],
      }),
    });
    if (!res.ok) throw new Error(`Haiku ${res.status}`);
    const data = await res.json();
    const text = data.content?.[0]?.text?.trim() ?? '';
    return text.length >= 10 ? text : fallback;
  } catch (err) {
    console.warn('[generate-dream] Haiku fallback:', (err as Error).message);
    return fallback;
  }
}

// Route to the best model based on the medium/prompt content
function pickModel(mode: string, prompt: string): { model: string; inputOverrides: Record<string, unknown> } {
  if (mode === 'flux-kontext') {
    return { model: 'black-forest-labs/flux-kontext-pro', inputOverrides: {} };
  }

  const p = prompt.toLowerCase();

  // SDXL for anime/manga, pixel art, and select painterly styles
  if (p.includes('anime') || p.includes('manga') || p.includes('cel animation') ||
      p.includes('shonen') || p.includes('shoujo') || p.includes('shinkai') ||
      p.includes('pixel art') || p.includes('8-bit') || p.includes('16-bit') ||
      p.includes('ghibli') || p.includes('lo-fi') || p.includes('lofi') ||
      p.includes('vhs') || p.includes('retro anime') ||
      p.includes('van gogh') || p.includes('swirling brushstroke') ||
      p.includes('cottagecore illustration') ||
      p.includes('cel-shaded') || p.includes('cel shaded') ||
      p.includes('webtoon') ||
      p.includes('japanese illustration') || p.includes('impressionism') ||
      p.includes('plein air') || p.includes('marker illustration') ||
      p.includes('copic marker')) {
    return {
      model: 'sdxl',
      inputOverrides: { width: 768, height: 1344, num_inference_steps: 30, guidance_scale: 7.5 },
    };
  }

  // Default: Flux Dev
  return { model: 'black-forest-labs/flux-dev', inputOverrides: {} };
}

async function generateImage(
  mode: string,
  prompt: string,
  inputImage: string | undefined,
  replicateToken: string
): Promise<string> {
  const { model, inputOverrides } = pickModel(mode, prompt);
  const isSDXL = model === 'sdxl';
  const SDXL_VERSION = '7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc';

  const input: Record<string, unknown> = {
    prompt,
    ...(!isSDXL ? {
      aspect_ratio: '9:16',
      num_outputs: 1,
      output_format: 'jpg',
    } : {
      width: 768,
      height: 1344,
      num_outputs: 1,
    }),
    ...inputOverrides,
  };

  if (mode === 'flux-kontext' && inputImage) {
    input.input_image = inputImage;
    input.output_quality = 90;
  }

  // SDXL uses version-based API, Flux uses model-based API
  const url = isSDXL
    ? 'https://api.replicate.com/v1/predictions'
    : `https://api.replicate.com/v1/models/${model}/predictions`;
  const body = isSDXL
    ? { version: SDXL_VERSION, input }
    : { input };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${replicateToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    const body = await res.json();
    const retryAfter = body.retry_after ?? 6;
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return generateImage(mode, prompt, inputImage, replicateToken);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate submit failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data.id) throw new Error('No prediction ID');

  // Poll for result
  const maxPolls = mode === 'flux-kontext' ? 30 : 60;
  const intervalMs = mode === 'flux-kontext' ? 2000 : 1500;

  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${data.id}`, {
      headers: { Authorization: `Bearer ${replicateToken}` },
    });
    const pollData = await pollRes.json();
    if (pollData.status === 'succeeded') {
      const url = typeof pollData.output === 'string' ? pollData.output : pollData.output?.[0];
      if (url) return url;
    }
    if (pollData.status === 'failed' || pollData.status === 'canceled') {
      throw new Error(`Generation ${pollData.status}: ${pollData.error ?? 'unknown'}`);
    }
  }
  throw new Error('Generation timed out');
}

async function persistToStorage(
  tempUrl: string,
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  const resp = await fetch(tempUrl);
  if (!resp.ok) throw new Error(`Failed to download image: ${resp.status}`);
  const buf = await resp.arrayBuffer();

  const fileName = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('uploads')
    .upload(fileName, buf, { contentType: 'image/jpeg' });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from('uploads').getPublicUrl(fileName);
  return data.publicUrl;
}

function secondsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
}
