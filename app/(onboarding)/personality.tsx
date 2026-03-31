import { router } from 'expo-router';
import { useOnboardingStore } from '@/store/onboarding';
import { PERSONALITY_TAGS, LIMITS } from '@/constants/onboarding';
  const isEditing = useOnboardingStore((s) => s.isEditing);
import { OnboardingTileScreen } from '@/components/OnboardingTileScreen';
import type { PersonalityTag } from '@/types/recipe';

export default function PersonalityScreen() {
  const tags = useOnboardingStore((s) => s.recipe.personality_tags);
  const toggleTag = useOnboardingStore((s) => s.togglePersonalityTag);

  return (
    <OnboardingTileScreen canDismiss={isEditing}
      stepNumber={8}
      title="Describe yourself"
      subtitle="Pick traits that feel like you"
      tiles={PERSONALITY_TAGS.map((t) => ({ ...t, icon: '' }))}
      selected={tags}
      onToggle={(key) => toggleTag(key as PersonalityTag)}
      minRequired={LIMITS.personalityTags.min}
      accentColor="#FF4500"
      onNext={() => router.push('/(onboarding)/surpriseFactor')}
      onBack={() => router.back()}
    />
  );
}
