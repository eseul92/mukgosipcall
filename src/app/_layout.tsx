import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppDataProvider } from '../../context/AppDataContext';
import { AuthProvider, useAuth } from '../../context/AuthContext';

function RootStack() {
  const { status } = useAuth();
  const signedOut = status === 'signedOut';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedOut}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={!signedOut}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="recipes"
          options={{ headerShown: true, title: '요리 추천', headerBackTitle: '홈' }}
        />
        <Stack.Screen
          name="call"
          options={{ headerShown: true, title: '콜 보내기', headerBackTitle: '홈' }}
        />
        <Stack.Screen
          name="call-confirm"
          options={{ headerShown: true, title: '콜 확인', headerBackTitle: '뒤로' }}
        />
        <Stack.Screen
          name="respond"
          options={{ headerShown: true, title: '콜 응답', headerBackTitle: '홈' }}
        />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <RootStack />
      </AppDataProvider>
      <StatusBar style="dark" />
    </AuthProvider>
  );
}
