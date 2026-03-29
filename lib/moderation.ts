/**
 * Content moderation — provider-agnostic interface.
 *
 * To swap providers, implement ModerationProvider and change the
 * `activeProvider` assignment at the bottom of this file.
 */

// ── Interface ────────────────────────────────────────────────────────────────

export interface ModerationResult {
  passed: boolean;
  reason: string | null;
}

export interface ModerationProvider {
  name: string;
  checkImage(imageUrl: string): Promise<ModerationResult>;
  checkVideo(videoUrl: string): Promise<ModerationResult>;
  checkText(text: string): Promise<ModerationResult>;
}

// ── Sightengine Implementation ───────────────────────────────────────────────

class SightengineProvider implements ModerationProvider {
  name = 'Sightengine';

  private apiUser: string;
  private apiSecret: string;

  // Bikinis/lingerie OK, actual nudity blocked.
  // suggestive/very_suggestive thresholds are lenient (fashion/swimwear).
  // sexual_display/sexual_activity/erotica thresholds are strict (nudity).
  private imageThresholds: Record<string, number> = {
    'nudity.sexual_activity': 0.2,
    'nudity.sexual_display': 0.2,
    'nudity.erotica': 0.4,
    // suggestive/very_suggestive intentionally excluded — they flag bra/lingerie/bikini
    'gore.prob': 0.3,
    'weapon.classes.firearm': 0.5,
    'weapon.firearm_action.aiming_threat': 0.3,
    'weapon.firearm_action.aiming_camera': 0.3,
    'weapon.classes.knife': 0.7,
    'self-harm.prob': 0.3,
  };

  // nudity.none removed — it flags lingerie/bra the same as actual nudity.
  // We rely on sexual_display + erotica to distinguish underwear from nude.

  // Text moderation — only block threats, racial/sexual content.
  // Casual insults and trash talk are allowed (toxic/insulting excluded).
  private textThresholds: Record<string, number> = {
    discriminatory: 0.5,
    violent: 0.5,
    sexual: 0.5,
  };

  constructor(apiUser: string, apiSecret: string) {
    this.apiUser = apiUser;
    this.apiSecret = apiSecret;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): number {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') return 0;
      current = (current as Record<string, unknown>)[part];
    }
    return typeof current === 'number' ? current : 0;
  }

  async checkImage(imageUrl: string): Promise<ModerationResult> {
    try {
      console.log(`[${this.name}] Checking image: ${imageUrl.slice(0, 80)}...`);
      console.log(`[${this.name}] Credentials: user=${this.apiUser ? this.apiUser.slice(0, 4) + '...' : 'EMPTY'}, secret=${this.apiSecret ? 'SET' : 'EMPTY'}`);

      const params = new URLSearchParams({
        url: imageUrl,
        models: 'nudity-2.1,gore-2.0,weapon,self-harm',
        api_user: this.apiUser,
        api_secret: this.apiSecret,
      });

      const res = await fetch(`https://api.sightengine.com/1.0/check.json?${params}`);
      console.log(`[${this.name}] HTTP status: ${res.status}`);
      if (!res.ok) {
        const body = await res.text();
        console.warn(`[${this.name}] API error: ${res.status} — ${body}`);
        return { passed: false, reason: 'Unable to verify content. Please try again.' };
      }

      const data = await res.json();
      console.log(`[${this.name}] Response:`, JSON.stringify(data.status === 'success' ? { status: data.status, nudity_none: data.nudity?.none } : data));
      if (data.status !== 'success') {
        console.warn(`[${this.name}] Response error:`, data.error?.message);
        return { passed: false, reason: 'Unable to verify content. Please try again.' };
      }

      // Log nudity scores for debugging
      const nudity = data.nudity ?? {};
      console.log(`[${this.name}] Scores: none=${nudity.none}, sexual_display=${nudity.sexual_display}, erotica=${nudity.erotica}, suggestive=${nudity.suggestive}, very_suggestive=${nudity.very_suggestive}`);

      for (const [path, threshold] of Object.entries(this.imageThresholds)) {
        const score = this.getNestedValue(data as Record<string, unknown>, path);
        if (score > threshold) {
          console.log(`[${this.name}] BLOCKED: ${path}=${score} > threshold ${threshold}`);
          const category = path.split('.')[0];
          return { passed: false, reason: `Content flagged: ${category}` };
        }
      }

      return { passed: true, reason: null };
    } catch (err) {
      console.warn(`[${this.name}] Image check failed:`, err);
      return { passed: false, reason: 'Unable to verify content. Please try again.' };
    }
  }

  async checkVideo(videoUrl: string): Promise<ModerationResult> {
    try {
      console.log(`[${this.name}] Checking video: ${videoUrl.slice(0, 80)}...`);

      const params = new URLSearchParams({
        stream_url: videoUrl,
        models: 'nudity-2.1,gore-2.0,weapon,self-harm',
        api_user: this.apiUser,
        api_secret: this.apiSecret,
      });

      const res = await fetch(`https://api.sightengine.com/1.0/video/check-sync.json?${params}`, {
        method: 'GET',
      });
      console.log(`[${this.name}] Video HTTP status: ${res.status}`);
      if (!res.ok) {
        const body = await res.text();
        console.warn(`[${this.name}] Video API error: ${res.status} — ${body}`);
        return { passed: false, reason: 'Unable to verify content. Please try again.' };
      }

      const data = await res.json();
      console.log(`[${this.name}] Video response status: ${data.status}, frames: ${data.data?.frames?.length ?? 0}`);
      if (data.status !== 'success') {
        console.warn(`[${this.name}] Video response error:`, data.error?.message);
        return { passed: false, reason: 'Unable to verify content. Please try again.' };
      }

      // Video response has frames array — check each frame
      const frames = data.data?.frames ?? [];
      for (const frame of frames) {
        for (const [path, threshold] of Object.entries(this.imageThresholds)) {
          const score = this.getNestedValue(frame as Record<string, unknown>, path);
          if (score > threshold) {
            const category = path.split('.')[0];
            return { passed: false, reason: `Video flagged: ${category}` };
          }
        }
      }

      return { passed: true, reason: null };
    } catch (err) {
      console.warn(`[${this.name}] Video check failed:`, err);
      return { passed: false, reason: 'Unable to verify content. Please try again.' };
    }
  }

  async checkText(text: string): Promise<ModerationResult> {
    if (!text || text.trim().length === 0) return { passed: true, reason: null };

    try {
      const params = new URLSearchParams({
        text,
        lang: 'en',
        mode: 'ml',
        models: 'general',
        api_user: this.apiUser,
        api_secret: this.apiSecret,
      });

      const res = await fetch(`https://api.sightengine.com/1.0/text/check.json?${params}`);
      if (!res.ok) {
        console.warn(`[${this.name}] Text API error:`, res.status);
        return { passed: false, reason: 'Unable to verify content. Please try again.' };
      }

      const data = await res.json();
      if (data.status !== 'success') {
        console.warn(`[${this.name}] Text response error:`, data.error?.message);
        return { passed: false, reason: 'Unable to verify content. Please try again.' };
      }

      const classes = data.moderation_classes ?? {};
      for (const [category, threshold] of Object.entries(this.textThresholds)) {
        const score = typeof classes[category] === 'number' ? classes[category] : 0;
        if (score > threshold) {
          console.log(`[${this.name}] Text BLOCKED: ${category}=${score} > ${threshold}`);
          return { passed: false, reason: 'Caption contains inappropriate language' };
        }
      }

      return { passed: true, reason: null };
    } catch (err) {
      console.warn(`[${this.name}] Text check failed:`, err);
      return { passed: false, reason: 'Unable to verify content. Please try again.' };
    }
  }
}

// ── Passthrough (no moderation — for testing) ────────────────────────────────

class NoopProvider implements ModerationProvider {
  name = 'Noop';
  async checkImage(): Promise<ModerationResult> { return { passed: true, reason: null }; }
  async checkVideo(): Promise<ModerationResult> { return { passed: true, reason: null }; }
  async checkText(): Promise<ModerationResult> { return { passed: true, reason: null }; }
}

// ── Active provider ──────────────────────────────────────────────────────────
// To swap moderation services:
//   1. Create a new class implementing ModerationProvider (e.g. GoogleVisionProvider)
//   2. Change the activeProvider assignment below to use the new class
//   3. No other files need to change — useUpload.ts and any other callers
//      only import moderateUpload() which delegates to whichever provider is active
//
// Example:
//   class GoogleVisionProvider implements ModerationProvider { ... }
//   const activeProvider = new GoogleVisionProvider('your-api-key');

const activeProvider: ModerationProvider = new SightengineProvider(
  process.env.EXPO_PUBLIC_SIGHTENGINE_API_USER ?? '',
  process.env.EXPO_PUBLIC_SIGHTENGINE_API_SECRET ?? ''
);

// To disable moderation for testing:
// const activeProvider: ModerationProvider = new NoopProvider();

// ── Public API (delegates to active provider) ────────────────────────────────

export async function moderateImage(imageUrl: string): Promise<ModerationResult> {
  return activeProvider.checkImage(imageUrl);
}

export async function moderateVideo(videoUrl: string): Promise<ModerationResult> {
  return activeProvider.checkVideo(videoUrl);
}

export async function moderateText(text: string): Promise<ModerationResult> {
  return activeProvider.checkText(text);
}

export async function moderateUpload(
  mediaUrl: string,
  mediaType: 'image' | 'video',
  caption: string | null,
): Promise<ModerationResult> {
  const mediaCheck = mediaType === 'video'
    ? activeProvider.checkVideo(mediaUrl)
    : activeProvider.checkImage(mediaUrl);

  const [mediaResult, textResult] = await Promise.all([
    mediaCheck,
    caption ? activeProvider.checkText(caption) : Promise.resolve({ passed: true, reason: null } as ModerationResult),
  ]);

  if (!mediaResult.passed) return mediaResult;
  if (!textResult.passed) return textResult;
  return { passed: true, reason: null };
}
