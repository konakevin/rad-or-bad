import { useOnboardingStore } from '@/store/onboarding';
import { PERSONALITY_TAGS, LIMITS } from '@/constants/onboarding';
import { OnboardingTileScreen } from '@/components/OnboardingTileScreen';
import type { PersonalityTag } from '@/types/recipe';

interface Props { onNext: () => void; onBack: () => void; }

export function PersonalityStep({ onNext, onBack }: Props) {
  const tags = useOnboardingStore((s) => s.recipe.personality_tags);
  const toggleTag = useOnboardingStore((s) => s.togglePersonalityTag);

  return (
    <OnboardingTileScreen
      hideChrome
      stepNumber={8}
      title="Describe yourself"
      subtitle="Pick traits that feel like you — the more you choose, the more vivid your dreams"
      tiles={PERSONALITY_TAGS.map((t) => ({ ...t, icon: '' }))}
      selected={tags}
      onToggle={(key) => toggleTag(key as PersonalityTag)}
      minRequired={LIMITS.personalityTags.min}
      onNext={onNext}
      onBack={onBack}
    />
  );
}
