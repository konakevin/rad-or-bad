import { router } from 'expo-router';
import { useOnboardingStore } from '@/store/onboarding';
import { INTEREST_TILES, LIMITS } from '@/constants/onboarding';
import { OnboardingTileScreen } from '@/components/OnboardingTileScreen';
import type { Interest } from '@/types/recipe';

export default function InterestsScreen() {
  const interests = useOnboardingStore((s) => s.recipe.interests);
  const toggleInterest = useOnboardingStore((s) => s.toggleInterest);
  const isEditing = useOnboardingStore((s) => s.isEditing);

  return (
    <OnboardingTileScreen
      stepNumber={1}
      canDismiss={isEditing}
      title="What do you love?"
      subtitle="Pick at least 3 things that interest you"
      tiles={INTEREST_TILES}
      selected={interests}
      onToggle={(key) => toggleInterest(key as Interest)}
      minRequired={LIMITS.interests.min}
      onNext={() => router.push('/(onboarding)/spiritCompanion')}
    />
  );
}
