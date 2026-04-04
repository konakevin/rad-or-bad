// Supabase Edge Function: revenuecat-webhook
// Receives purchase events from RevenueCat, grants sparkles to the user.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Product ID → sparkle amount mapping
// SOURCE OF TRUTH: constants/sparklePacks.ts — keep in sync
const SPARKLE_PACKS: Record<string, number> = {
  'com.konakevin.radorbad.sparkles.25': 25,
  'com.konakevin.radorbad.sparkles.50': 50,
  'com.konakevin.radorbad.sparkles.100_': 100,
  'com.konakevin.radorbad.sparkles.500': 500,
};

// Event types that represent a completed purchase
const PURCHASE_EVENTS = new Set([
  'NON_RENEWING_PURCHASE', // one-time consumable (our sparkle packs)
  'INITIAL_PURCHASE', // subscription start (future-proofing)
]);

Deno.serve(async (req) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verify authorization header matches our webhook secret
  const authHeader = req.headers.get('authorization');
  const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');

  if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
    console.error('[RevenueCat] Unauthorized request');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await req.json();
    const event = body.event;

    if (!event) {
      return new Response(JSON.stringify({ message: 'No event in payload' }), { status: 400 });
    }

    const eventType: string = event.type;
    const appUserId: string = event.app_user_id;
    const productId: string = event.product_id;
    const transactionId: string = event.transaction_id ?? event.id;
    const environment: string = event.environment ?? 'PRODUCTION';

    console.log(
      `[RevenueCat] ${eventType} | user=${appUserId} | product=${productId} | env=${environment}`
    );

    // Only process purchase events
    if (!PURCHASE_EVENTS.has(eventType)) {
      return new Response(JSON.stringify({ message: `Ignored event: ${eventType}` }), {
        status: 200,
      });
    }

    // Look up sparkle amount
    const sparkleAmount = SPARKLE_PACKS[productId];
    if (!sparkleAmount) {
      console.error(`[RevenueCat] Unknown product: ${productId}`);
      return new Response(JSON.stringify({ error: `Unknown product: ${productId}` }), {
        status: 400,
      });
    }

    // Skip anonymous RevenueCat IDs — we need a real Supabase user ID
    if (appUserId.startsWith('$RCAnonymousID:')) {
      console.error(`[RevenueCat] Anonymous user, cannot grant sparkles: ${appUserId}`);
      return new Response(JSON.stringify({ error: 'Anonymous user ID' }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Idempotency: check if this transaction was already processed
    const { data: existing } = await supabase
      .from('sparkle_transactions')
      .select('id')
      .eq('reason', `purchase:${transactionId}`)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`[RevenueCat] Duplicate transaction, skipping: ${transactionId}`);
      return new Response(JSON.stringify({ message: 'Already processed' }), { status: 200 });
    }

    // Grant sparkles
    const { error } = await supabase.rpc('grant_sparkles', {
      p_user_id: appUserId,
      p_amount: sparkleAmount,
      p_reason: `purchase:${transactionId}`,
    });

    if (error) {
      console.error(`[RevenueCat] grant_sparkles failed:`, error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    console.log(`[RevenueCat] Granted ${sparkleAmount} sparkles to ${appUserId}`);
    return new Response(JSON.stringify({ granted: sparkleAmount }), { status: 200 });
  } catch (err) {
    console.error('[RevenueCat] Error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
