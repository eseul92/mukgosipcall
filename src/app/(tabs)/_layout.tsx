import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IconName, inactive: IconName) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={24} color={color} />
  );
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#FF5A5F' }}>
      <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: tabIcon('home', 'home-outline') }} />
      <Tabs.Screen name="family" options={{ title: '가족', tabBarIcon: tabIcon('people', 'people-outline') }} />
      <Tabs.Screen name="shopping" options={{ title: '장보기', tabBarIcon: tabIcon('cart', 'cart-outline') }} />
    </Tabs>
  );
}
