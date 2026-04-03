import { useRef, useCallback, useMemo } from 'react';
import { View, FlatList, Dimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboardingStore } from '@/store/onboarding';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { colors } from '@/constants/theme';

import { WelcomeStep } from '@/components/onboarding/WelcomeStep';
import { InterestsStep } from '@/components/onboarding/InterestsStep';
import { SpiritCompanionStep } from '@/components/onboarding/SpiritCompanionStep';
import { StyleSpectrumStep } from '@/components/onboarding/StyleSpectrumStep';
import { WorldBuilderStep } from '@/components/onboarding/WorldBuilderStep';
import { MoodBoardStep } from '@/components/onboarding/MoodBoardStep';
import { SceneAtmosphereStep } from '@/components/onboarding/SceneAtmosphereStep';
import { ColorPaletteStep } from '@/components/onboarding/ColorPaletteStep';
import { PersonalityStep } from '@/components/onboarding/PersonalityStep';
import { SurpriseFactorStep } from '@/components/onboarding/SurpriseFactorStep';
import { RevealStep } from '@/components/onboarding/RevealStep';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type StepComponent = (props: { onNext: () => void; onBack: () => void }) => React.JSX.Element;

interface StepConfig {
  key: string;
  component: StepComponent;
  skipInEdit?: boolean;
}

const STEPS: StepConfig[] = [
  { key: 'welcome', component: WelcomeStep, skipInEdit: true },
  { key: 'interests', component: InterestsStep },
  { key: 'spirit', component: SpiritCompanionStep },
  { key: 'style', component: StyleSpectrumStep },
  { key: 'world', component: WorldBuilderStep },
  { key: 'mood', component: MoodBoardStep },
  { key: 'atmosphere', component: SceneAtmosphereStep },
  { key: 'palette', component: ColorPaletteStep },
  { key: 'personality', component: PersonalityStep },
  { key: 'surprise', component: SurpriseFactorStep },
  { key: 'reveal', component: RevealStep },
];

export default function OnboardingPager() {
  const isEditing = useOnboardingStore((s) => s.isEditing);
  const step = useOnboardingStore((s) => s.step);
  const setStep = useOnboardingStore((s) => s.setStep);
  const listRef = useRef<FlatList>(null);

  const steps = useMemo(() =>
    isEditing ? STEPS.filter((s) => !s.skipInEdit) : STEPS,
  [isEditing]);

  const goTo = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) {
      setStep(index + 1);
      listRef.current?.scrollToIndex({ index, animated: true });
    }
  }, [steps.length, setStep]);

  const goNext = useCallback(() => goTo(step), [step, goTo]);

  const goBack = useCallback(() => {
    if (step <= 1) {
      if (isEditing) router.back();
      return;
    }
    goTo(step - 2);
  }, [step, isEditing, goTo]);

  return (
    <SafeAreaView style={s.root}>
      {(isEditing || step > 1) && (
        <OnboardingHeader
          stepNumber={isEditing ? step : step - 1}
          onBack={step > 1 || isEditing ? goBack : undefined}
        />
      )}

      <FlatList
        ref={listRef}
        data={steps}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(item) => item.key}
        getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
        renderItem={({ item, index }) => (
          <View style={s.page}>
            <item.component
              onNext={goNext}
              onBack={index > 0 ? goBack : () => {}}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  page: { width: SCREEN_WIDTH, flex: 1 },
});
