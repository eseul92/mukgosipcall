import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './screens/LoginScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <LoginScreen />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
