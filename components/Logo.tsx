import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = {
  size?: number;
};

// 말풍선 안에 김이 나는 밥그릇: "먹고 싶은 걸 가족에게 콜!"
export default function Logo({ size = 112 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFA062" />
          <Stop offset="1" stopColor="#FF5A5F" />
        </LinearGradient>
      </Defs>

      <Rect width="120" height="120" rx="34" fill="url(#bg)" />

      {/* 말풍선 */}
      <Path
        d="M44 24 H76 A22 22 0 0 1 98 46 V62 A22 22 0 0 1 76 84 H56 L38 100 L40 83.5 A22 22 0 0 1 22 62 V46 A22 22 0 0 1 44 24 Z"
        fill="#fff"
      />

      {/* 김 */}
      <Path
        d="M50 47 q-4 -4 0 -8 M60 47 q-4 -4 0 -8 M70 47 q-4 -4 0 -8"
        stroke="#FF7A5C"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* 밥그릇 */}
      <Path d="M40 54 H80 A20 20 0 0 1 40 54 Z" fill="#FF5A5F" />
      <Rect x="51" y="73" width="18" height="3.5" rx="1.75" fill="#FF5A5F" />
    </Svg>
  );
}
