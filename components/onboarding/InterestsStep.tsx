import { useOnboardingStore } from '@/store/onboarding';
import { INTEREST_TILES, LIMITS } from '@/constants/onboarding';
import { OnboardingTileScreen } from '@/components/OnboardingTileScreen';
import type { Interest } from '@/types/recipe';

interface Props { onNext: () => void; onBack: () => void; }

export function InterestsStep({ onNext, onBack }: Props) {
  const interests = useOnboardingStore((s) => s.recipe.interests);
  const toggleInterest = useOnboardingStore((s) => s.toggleInterest);

  return (
    <OnboardingTileScreen
      hideChrome
      stepNumber={1}
      title="What do you love?"
      subtitle="Pick at least 3 things that interest you"
      tiles={INTEREST_TILES}
      selected={interests}
      onToggle={(key) => toggleInterest(key as Interest)}
      minRequired={LIMITS.interests.min}
      onNext={onNext}
      onBack={onBack}
    />
  );
}
