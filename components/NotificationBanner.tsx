import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  title: string;
  body: string;
  onPress: () => void;
};

// 앱이 열려 있을 때 시스템 알림 대신 화면 위쪽에 잠깐 보여 주는 배너
export default function NotificationBanner({ title, body, onPress }: Props) {
  const insets = useSafeAreaInsets();
  const [slide] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [slide]);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          top: insets.top + 8,
          opacity: slide,
          transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title} ${body}`}
        onPress={onPress}
        style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body} numberOfLines={2}>
          {body}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    elevation: 10,
  },
  banner: {
    backgroundColor: 'rgba(17,17,17,0.94)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF8A8E',
  },
  body: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  pressed: {
    opacity: 0.85,
  },
});
