// Supabase Edge Function: send-push
// Called via database webhook when a notification row is inserted.
// Looks up the recipient's Expo push token and sends a push notification.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface WebhookPayload {
  type: 'INSERT';
  table: string;
  record: {
    id: string;
    recipient_id: string;
    actor_id: string;
    type: string;
    upload_id: string | null;
    comment_id: string | null;
    body: string | null;
    created_at: string;
  };
}

function getNotificationContent(type: string, actorName: string, body: string | null) {
  switch (type) {
    case 'post_comment':
      return { title: `${actorName} commented on your post`, body: body ?? '' };
    case 'comment_reply':
      return { title: `${actorName} replied to your comment`, body: body ?? '' };
    case 'comment_mention':
      return { title: `${actorName} mentioned you`, body: body ?? '' };
    case 'post_share':
      return { title: `${actorName} sent you a post`, body: 'Tap to check it out' };
    case 'friend_request':
      return { title: `${actorName} wants to dream with you`, body: 'Tap to respond' };
    case 'friend_accepted':
      return { title: `${actorName} accepted your dream request`, body: "You're now dreamers!" };
    case 'post_milestone':
      return { title: `Your post just hit ${body ?? 'a milestone'}!`, body: 'Keep it going!' };
    case 'dream_generated':
      return {
        title: 'A new dream awaits',
        body: body ?? 'DreamBot created something for you',
      };
    default:
      return { title: 'New notification', body: '' };
  }
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();
    const { record } = payload;

    // Create admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get recipient's push tokens
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', record.recipient_id);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No push tokens' }), { status: 200 });
    }

    // Get actor's username
    const { data: actor } = await supabase
      .from('users')
      .select('username')
      .eq('id', record.actor_id)
      .single();

    const actorName = actor?.username ?? 'Someone';
    const content = getNotificationContent(record.type, actorName, record.body);

    // Build push data for navigation on tap
    const data: Record<string, string> = {};
    if (record.upload_id) data.uploadId = record.upload_id;
    if (record.type === 'friend_request' || record.type === 'friend_accepted') {
      data.userId = record.actor_id;
    }

    // Send to all device tokens
    const messages = tokens.map((t) => ({
      to: t.token,
      sound: 'notification.wav',
      title: content.title,
      body: content.body,
      data,
      badge: 1,
    }));

    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    const pushResult = await pushResponse.json();
    console.log('[Push] Sent:', JSON.stringify(pushResult));

    return new Response(JSON.stringify({ sent: messages.length }), { status: 200 });
  } catch (err) {
    console.error('[Push] Error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
