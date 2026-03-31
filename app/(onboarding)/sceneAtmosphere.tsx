import { router } from 'expo-router';
import { useOnboardingStore } from '@/store/onboarding';
import { SCENE_ATMOSPHERE_TILES, LIMITS } from '@/constants/onboarding';
  const isEditing = useOnboardingStore((s) => s.isEditing);
import { OnboardingTileScreen } from '@/components/OnboardingTileScreen';
import type { SceneAtmosphere } from '@/types/recipe';

export default function SceneAtmosphereScreen() {
  const atmospheres = useOnboardingStore((s) => s.recipe.scene_atmospheres);
  const toggle = useOnboardingStore((s) => s.toggleSceneAtmosphere);

  return (
    <OnboardingTileScreen canDismiss={isEditing}
      stepNumber={6}
      title="Set the scene"
      subtitle="Pick the weather and time your dreams take place"
      tiles={SCENE_ATMOSPHERE_TILES}
      selected={atmospheres}
      onToggle={(key) => toggle(key as SceneAtmosphere)}
      minRequired={LIMITS.sceneAtmospheres.min}
      accentColor="#FF8C00"
      onNext={() => router.push('/(onboarding)/colorPalette')}
      onBack={() => router.back()}
    />
  );
}
