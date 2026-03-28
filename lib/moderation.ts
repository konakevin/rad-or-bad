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
    'nudity.very_suggestive': 0.85,
    'gore.prob': 0.3,
    'weapon.prob': 0.7,
    'drugs.prob': 0.7,
    'self-harm.prob': 0.3,
  };

  private textProfanityThreshold = 0.5;

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
      const params = new URLSearchParams({
        url: imageUrl,
        models: 'nudity-2.1,gore-2.0,weapon,drugs,self-harm',
        api_user: this.apiUser,
        api_secret: this.apiSecret,
      });

      const res = await fetch(`https://api.sightengine.com/1.0/check.json?${params}`);
      if (!res.ok) {
        console.warn(`[${this.name}] API error:`, res.status);
        return { passed: true, reason: null };
      }

      const data = await res.json();
      if (data.status !== 'success') {
        console.warn(`[${this.name}] Response error:`, data.error?.message);
        return { passed: true, reason: null };
      }

      for (const [path, threshold] of Object.entries(this.imageThresholds)) {
        const score = this.getNestedValue(data as Record<string, unknown>, path);
        if (score > threshold) {
          const category = path.split('.')[0];
          return { passed: false, reason: `Content flagged: ${category}` };
        }
      }

      return { passed: true, reason: null };
    } catch (err) {
      console.warn(`[${this.name}] Image check failed:`, err);
      return { passed: true, reason: null };
    }
  }

  async checkVideo(videoUrl: string): Promise<ModerationResult> {
    try {
      const params = new URLSearchParams({
        stream_url: videoUrl,
        models: 'nudity-2.1,gore-2.0,weapon,drugs,self-harm',
        api_user: this.apiUser,
        api_secret: this.apiSecret,
      });

      const res = await fetch(`https://api.sightengine.com/1.0/video/check-sync.json?${params}`, {
        method: 'GET',
      });
      if (!res.ok) {
        console.warn(`[${this.name}] Video API error:`, res.status);
        return { passed: true, reason: null };
      }

      const data = await res.json();
      if (data.status !== 'success') {
        console.warn(`[${this.name}] Video response error:`, data.error?.message);
        return { passed: true, reason: null };
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
      return { passed: true, reason: null };
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
        return { passed: true, reason: null };
      }

      const data = await res.json();
      if (data.status !== 'success') {
        console.warn(`[${this.name}] Text response error:`, data.error?.message);
        return { passed: true, reason: null };
      }

      const profanity = data.profanity ?? {};
      if (profanity.matches && profanity.matches.length > 0) {
        const worstMatch = profanity.matches.reduce(
          (worst: Record<string, unknown>, m: Record<string, unknown>) =>
            ((m.intensity as number) ?? 0) > ((worst.intensity as number) ?? 0) ? m : worst,
          profanity.matches[0]
        );
        if (((worstMatch?.intensity as number) ?? 0) >= this.textProfanityThreshold) {
          return { passed: false, reason: 'Caption contains inappropriate language' };
        }
      }

      return { passed: true, reason: null };
    } catch (err) {
      console.warn(`[${this.name}] Text check failed:`, err);
      return { passed: true, reason: null };
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
