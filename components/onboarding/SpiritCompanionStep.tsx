import { useOnboardingStore } from '@/store/onboarding';
import { SPIRIT_COMPANIONS } from '@/constants/onboarding';
import { OnboardingTileScreen } from '@/components/OnboardingTileScreen';
import type { SpiritCompanion } from '@/types/recipe';

interface Props { onNext: () => void; onBack: () => void; }

export function SpiritCompanionStep({ onNext, onBack }: Props) {
  const companion = useOnboardingStore((s) => s.recipe.spirit_companion);
  const setCompanion = useOnboardingStore((s) => s.setSpiritCompanion);

  return (
    <OnboardingTileScreen
      hideChrome
      stepNumber={2}
      title="Pick your dream companion"
      subtitle="This little friend may appear in your dreams"
      tiles={SPIRIT_COMPANIONS}
      selected={companion ? [companion] : []}
      onToggle={(key) => {
        const k = key as SpiritCompanion;
        setCompanion(companion === k ? null : k);
      }}
      singleSelect
      minRequired={1}
      onNext={onNext}
      onBack={onBack}
    />
  );
}
