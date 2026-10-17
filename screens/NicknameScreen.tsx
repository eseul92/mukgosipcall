import { SafeAreaView } from 'react-native-safe-area-context';
import NicknameForm from '../components/NicknameForm';

// 저장하면 users 문서가 바뀌어 AuthContext가 이 화면을 치우고 홈으로 보낸다.
export default function NicknameScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <NicknameForm />
    </SafeAreaView>
  );
}
