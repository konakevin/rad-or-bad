import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface FeatureFlags {
  homeSwipeToSkipEnabled: boolean;
}

const DEFAULTS: FeatureFlags = {
  homeSwipeToSkipEnabled: false,
};

export function useFeatureFlags() {
  return useQuery({
    queryKey: ['featureFlags'],
    queryFn: async (): Promise<FeatureFlags> => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('key, value');
      if (error) throw error;
      const flags = { ...DEFAULTS };
      for (const row of data ?? []) {
        if (row.key in flags) {
          (flags as Record<string, boolean>)[row.key] = row.value;
        }
      }
      return flags;
    },
    staleTime: Infinity, // flags are read once at startup; refresh requires app restart
    gcTime: Infinity,
  });
}
