import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/lib/supabase';

export default function Index() {
  const { session, user, initialized } = useAuthStore();
  const [hasRecipe, setHasRecipe] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setHasRecipe(null);
      return;
    }
    supabase
      .from('users')
      .select('has_ai_recipe')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setHasRecipe(data?.has_ai_recipe ?? false);
      });
  }, [user?.id]);

  if (!initialized) return null;
  if (!session) return <Redirect href="/(auth)" />;
  if (hasRecipe === null) return null; // loading
  if (!hasRecipe) return <Redirect href="/(onboarding)" />;
  return <Redirect href="/(tabs)" />;
}
