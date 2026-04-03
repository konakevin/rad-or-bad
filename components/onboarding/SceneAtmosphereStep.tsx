import { useOnboardingStore } from '@/store/onboarding';
import { SCENE_ATMOSPHERE_TILES, LIMITS } from '@/constants/onboarding';
import { OnboardingTileScreen } from '@/components/OnboardingTileScreen';
import type { SceneAtmosphere } from '@/types/recipe';

interface Props { onNext: () => void; onBack: () => void; }

export function SceneAtmosphereStep({ onNext, onBack }: Props) {
  const atmospheres = useOnboardingStore((s) => s.recipe.scene_atmospheres);
  const toggle = useOnboardingStore((s) => s.toggleSceneAtmosphere);

  return (
    <OnboardingTileScreen
      hideChrome
      stepNumber={6}
      title="Set the scene"
      subtitle="Pick the weather and time your dreams take place"
      tiles={SCENE_ATMOSPHERE_TILES}
      selected={atmospheres}
      onToggle={(key) => toggle(key as SceneAtmosphere)}
      minRequired={LIMITS.sceneAtmospheres.min}
      onNext={onNext}
      onBack={onBack}
    />
  );
}
