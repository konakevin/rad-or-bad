import { useState } from 'react';
import { router } from 'expo-router';
import { useOnboardingStore } from '@/store/onboarding';
import { MOOD_TILES, LIMITS } from '@/constants/onboarding';
import { OnboardingTileScreen } from '@/components/OnboardingTileScreen';

export default function MoodBoardScreen() {
  const setMoodPosition = useOnboardingStore((s) => s.setMoodPosition);
  const [selected, setSelected] = useState<string[]>([]);

  function handleToggle(key: string) {
    const next = selected.includes(key)
      ? selected.filter((k) => k !== key)
      : [...selected, key];

    setSelected(next);

    if (next.length > 0) {
      const selectedData = MOOD_TILES.filter((m) => next.includes(m.key));
      const avgEnergy = selectedData.reduce((sum, m) => sum + m.energy, 0) / selectedData.length;
      const avgBrightness = selectedData.reduce((sum, m) => sum + m.brightness, 0) / selectedData.length;
      setMoodPosition(avgEnergy, avgBrightness);
    }
  }

  return (
    <OnboardingTileScreen
      stepNumber={5}
      title="Set the mood"
      subtitle="Pick the moods you're drawn to"
      tiles={MOOD_TILES}
      selected={selected}
      onToggle={handleToggle}
      minRequired={LIMITS.moods.min}
      onNext={() => router.push('/(onboarding)/sceneAtmosphere')}
      onBack={() => router.back()}
    />
  );
}
