import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function registerPushSubscription(supabaseClient: any, userId: string, subscription: PushSubscription) {
  const { error } = await supabaseClient.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: subscription.endpoint,
    keys: (subscription as any).toJSON().keys
  });
  if (error) throw error;
}

export async function sendPushNotification(
  supabaseClient: any,
  userId: string,
  title: string,
  body: string
) {
  const { data: subs } = await supabaseClient
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (!subs || subs.length === 0) return;

  // Edge Function VAPID Push Dispatcher
  console.log(`Sending WebPush to user ${userId}: ${title} - ${body}`);
}
