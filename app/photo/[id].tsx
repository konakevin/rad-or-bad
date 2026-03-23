import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function PhotoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-text-primary text-xl font-bold">Photo {id}</Text>
    </View>
  );
}
