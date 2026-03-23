import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function ModalScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-text-primary text-xl font-bold">Modal</Text>
      <TouchableOpacity onPress={() => router.back()} className="mt-4">
        <Text className="text-flame font-semibold">Close</Text>
      </TouchableOpacity>
    </View>
  );
}
