import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReceiptCapture from '../components/ReceiptCapture';
import ReceiptReview from '../components/ReceiptReview';
import { RECEIPT_SAVE_FAILED_MESSAGE, RECEIPT_TOO_MANY_MESSAGE } from '../constants/receipt';
import { useFamilyData } from '../context/FamilyDataContext';
import { receiptParser } from '../services/receiptParser';
import type { ReceiptItem } from '../types/models';

// 오프라인이면 Firestore 쓰기가 서버 확인을 기다리며 오래 걸린다. 쓰기는 기기에 먼저 반영되고
// 연결되면 이어서 올라가므로, 이 시간이 지나면 저장된 것으로 보고 넘어간다(장보기와 같은 방식).
const WRITE_WAIT_MS = 8000;

type Step =
  | { kind: 'capture' }
  | { kind: 'review'; lines: string[]; items: ReceiptItem[] };

// 영수증 스캔: 찍기·고르기 → 기기 안에서 읽기 → 확인·수정 → 냉장고에 넣기.
// 사진은 인식이 끝나면(또는 화면을 닫으면) 지우고, 원문과 품목은 이 화면의 상태에만 있어서
// 화면을 닫거나 저장하면 함께 사라진다. 로그에는 남기지 않는다.
export default function ReceiptScanScreen() {
  const { ingredients, addIngredients } = useFamilyData();
  const [step, setStep] = useState<Step>({ kind: 'capture' });

  const existingNames = ingredients.map((item) => item.name);

  const handleRecognized = async (lines: string[]) => {
    const items = await receiptParser.parse(lines, existingNames).catch(() => []);
    setStep({ kind: 'review', lines, items });
  };

  const save = async (names: string[]) => {
    let added: number;
    try {
      added = await Promise.race([
        addIngredients(names),
        new Promise<number>((resolve) => setTimeout(() => resolve(names.length), WRITE_WAIT_MS)),
      ]);
    } catch (e) {
      console.warn('영수증 품목을 냉장고에 넣지 못했어요', (e as { code?: string })?.code ?? 'unknown');
      const message = e instanceof Error && e.message === RECEIPT_TOO_MANY_MESSAGE
        ? RECEIPT_TOO_MANY_MESSAGE
        : RECEIPT_SAVE_FAILED_MESSAGE;
      throw new Error(message);
    }

    // 홈으로 돌아가 결과를 알린다. 이 화면이 닫히면서 원문과 품목 상태도 사라진다.
    const notice = added > 0 ? `${added}개를 냉장고에 넣었어요` : '이미 냉장고에 있는 재료예요';
    router.dismissAll();
    router.navigate({ pathname: '/', params: { notice } });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: step.kind === 'capture' ? '영수증으로 추가' : '품목 확인' }} />
      {step.kind === 'capture' ? (
        <ReceiptCapture onRecognized={handleRecognized} />
      ) : (
        <ReceiptReview
          initialItems={step.items}
          rawLines={step.lines}
          existingNames={existingNames}
          onSave={save}
          onRetake={() => setStep({ kind: 'capture' })}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
