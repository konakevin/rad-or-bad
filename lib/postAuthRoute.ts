import { supabase } from '@/lib/supabase';

/** After sign-in, check if user has completed onboarding and return the right route */
export async function getPostAuthRoute(): Promise<'/(onboarding)' | '/(tabs)'> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return '/(tabs)';

  const { data } = await supabase
    .from('users')
    .select('has_ai_recipe')
    .eq('id', user.id)
    .single();

  return data?.has_ai_recipe ? '/(tabs)' : '/(onboarding)';
}
