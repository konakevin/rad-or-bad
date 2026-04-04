import { useOnboardingStore } from '@/store/onboarding';
import { INTEREST_TILES, LIMITS } from '@/constants/onboarding';
import { OnboardingTileScreen } from '@/components/OnboardingTileScreen';
import type { SubjectInterest } from '@/types/vibeProfile';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function InterestsStep({ onNext, onBack }: Props) {
  const interests = useOnboardingStore((s) => s.profile.interests);
  const toggleInterest = useOnboardingStore((s) => s.toggleInterest);

  return (
    <OnboardingTileScreen
      hideChrome
      stepNumber={1}
      title="What excites you?"
      subtitle="Pick at least 3 subjects for your dreams"
      tiles={INTEREST_TILES}
      selected={interests}
      onToggle={(key) => toggleInterest(key as SubjectInterest)}
      minRequired={LIMITS.interests.min}
      onNext={onNext}
      onBack={onBack}
    />
  );
}
