import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  RECEIPT_CAMERA_DENIED_MESSAGE,
  RECEIPT_MAX_PHOTOS,
  RECEIPT_OCR_FAILED_MESSAGE,
  RECEIPT_PICK_FAILED_MESSAGE,
} from '../constants/receipt';
import { deleteReceiptImages, recognizeReceiptLines } from '../services/receiptOcr';

type Props = {
  /** 인식이 끝나면 줄 목록을 넘긴다. 사진은 넘기기 전에 지운다. */
  onRecognized: (lines: string[]) => void;
};

// 영수증 사진을 최대 3장까지 찍거나 골라 기기 안에서 읽는다.
// 사진은 앱 캐시에만 잠깐 있고, 인식이 끝나거나 이 화면이 사라지면 지운다.
export default function ReceiptCapture({ onRecognized }: Props) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [recognizing, setRecognizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraBlocked, setCameraBlocked] = useState(false);

  // 화면이 사라질 때 남은 사진을 지우기 위해 최신 목록을 들고 있는다.
  const photosRef = useRef<string[]>([]);
  const mounted = useRef(true);
  const busy = useRef(false);

  const updatePhotos = useCallback((next: string[]) => {
    photosRef.current = next;
    setPhotos(next);
  }, []);

  const addAssets = useCallback(
    (assets: ImagePicker.ImagePickerAsset[]) => {
      const room = RECEIPT_MAX_PHOTOS - photosRef.current.length;
      const uris = assets.map((asset) => asset.uri);
      // 남는 자리를 넘는 사진은 바로 지운다.
      deleteReceiptImages(uris.slice(Math.max(room, 0)));
      if (room > 0) updatePhotos([...photosRef.current, ...uris.slice(0, room)]);
      setError(null);
    },
    [updatePhotos],
  );

  useEffect(() => {
    mounted.current = true;
    // 이미 '다시 묻지 않음'으로 거부돼 있으면 처음부터 안내한다.
    ImagePicker.getCameraPermissionsAsync()
      .then((permission) => {
        if (mounted.current && !permission.granted && !permission.canAskAgain) setCameraBlocked(true);
      })
      .catch(() => {});
    // Android가 고르는 동안 앱을 내렸다가 다시 띄우면 결과를 여기서 받는다.
    ImagePicker.getPendingResultAsync()
      .then((result) => {
        if (mounted.current && result && 'assets' in result && !result.canceled && result.assets) {
          addAssets(result.assets);
        }
      })
      .catch(() => {});

    return () => {
      mounted.current = false;
      deleteReceiptImages(photosRef.current);
      photosRef.current = [];
    };
  }, [addAssets]);

  const pick = async (launch: () => Promise<ImagePicker.ImagePickerResult>) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const result = await launch();
      if (!mounted.current) {
        if (!result.canceled) deleteReceiptImages(result.assets.map((asset) => asset.uri));
        return;
      }
      if (!result.canceled) addAssets(result.assets);
    } catch {
      console.warn('영수증 사진을 가져오지 못했어요');
      if (mounted.current) setError(RECEIPT_PICK_FAILED_MESSAGE);
    } finally {
      busy.current = false;
    }
  };

  const takePhoto = async () => {
    if (busy.current) return;
    let permission = await ImagePicker.getCameraPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) {
      permission = await ImagePicker.requestCameraPermissionsAsync();
    }
    if (!mounted.current) return;
    if (!permission.granted) {
      setCameraBlocked(true);
      return;
    }
    setCameraBlocked(false);
    await pick(() => ImagePicker.launchCameraAsync({ mediaTypes: ['images'] }));
  };

  // Android 사진 선택기는 권한 없이 쓸 수 있어서, 카메라를 거부해도 계속 고를 수 있다.
  const pickFromLibrary = () =>
    pick(() =>
      ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: RECEIPT_MAX_PHOTOS - photosRef.current.length,
      }),
    );

  const removePhoto = (uri: string) => {
    deleteReceiptImages([uri]);
    updatePhotos(photosRef.current.filter((item) => item !== uri));
  };

  const recognize = async () => {
    if (busy.current || photosRef.current.length === 0) return;
    busy.current = true;
    setRecognizing(true);
    setError(null);
    const uris = photosRef.current;
    try {
      const lines = await recognizeReceiptLines(uris);
      // 인식이 끝났으니 사진은 바로 지운다.
      deleteReceiptImages(uris);
      photosRef.current = [];
      if (mounted.current) onRecognized(lines);
    } catch (e) {
      // 오류에 사진 경로가 들어 있을 수 있어 종류만 남긴다.
      console.warn('영수증을 읽지 못했어요', (e as { code?: string })?.code ?? 'unknown');
      if (mounted.current) setError(RECEIPT_OCR_FAILED_MESSAGE);
    } finally {
      busy.current = false;
      if (mounted.current) setRecognizing(false);
    }
  };

  const full = photos.length >= RECEIPT_MAX_PHOTOS;

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.title}>영수증을 찍어 주세요</Text>
          <Text style={styles.description}>
            최대 {RECEIPT_MAX_PHOTOS}장까지 넣을 수 있어요. 글자는 휴대폰 안에서만 읽고, 사진은
            저장하지 않아요.
          </Text>
        </View>

        {cameraBlocked && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{RECEIPT_CAMERA_DENIED_MESSAGE}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => Linking.openSettings()}
              style={({ pressed }) => [styles.noticeButton, pressed && styles.pressed]}
            >
              <Text style={styles.noticeButtonText}>설정 열기</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.buttons}>
          <Pressable
            accessibilityRole="button"
            disabled={full || recognizing}
            onPress={takePhoto}
            style={({ pressed }) => [
              styles.pickButton,
              (full || recognizing) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="camera-outline" size={22} color="#111" />
            <Text style={styles.pickButtonText}>카메라로 찍기</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={full || recognizing}
            onPress={pickFromLibrary}
            style={({ pressed }) => [
              styles.pickButton,
              (full || recognizing) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="images-outline" size={22} color="#111" />
            <Text style={styles.pickButtonText}>앨범에서 고르기</Text>
          </Pressable>
        </View>

        {photos.length > 0 && (
          <View style={styles.photos}>
            {photos.map((uri, index) => (
              <View key={uri} style={styles.photo}>
                <Image source={{ uri }} style={styles.photoImage} accessibilityLabel={`영수증 ${index + 1}`} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`영수증 ${index + 1} 빼기`}
                  disabled={recognizing}
                  hitSlop={6}
                  onPress={() => removePhoto(uri)}
                  style={styles.photoRemove}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: photos.length === 0 || recognizing, busy: recognizing }}
          disabled={photos.length === 0 || recognizing}
          onPress={recognize}
          style={({ pressed }) => [
            styles.primaryButton,
            photos.length === 0 && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {photos.length > 0 ? `${photos.length}장 읽기` : '사진을 넣어 주세요'}
          </Text>
        </Pressable>
      </View>

      {recognizing && (
        <View style={styles.overlay} accessibilityLiveRegion="polite">
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color="#FF5A5F" />
            <Text style={styles.overlayText}>영수증을 읽고 있어요</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  description: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
  },
  notice: {
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  noticeButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111',
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  pickButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pickButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  photos: {
    flexDirection: 'row',
    gap: 10,
  },
  photo: {
    flex: 1,
    maxWidth: '33%',
    aspectRatio: 3 / 4,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(17,17,17,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    fontSize: 14,
    color: '#EF4444',
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  primaryButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#FF5A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayCard: {
    alignItems: 'center',
    gap: 12,
  },
  overlayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
