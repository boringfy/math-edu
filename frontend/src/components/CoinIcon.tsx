import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

interface Props {
  size?: number;
}

/** A gold reward coin with the same appearance on iOS and Android. */
export default function CoinIcon({ size = 18 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" testID="gold-coin" accessible={false}>
      <Defs>
        <LinearGradient id="coin-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0" stopColor="#FFF0A0" />
          <Stop offset="0.45" stopColor="#FFD13B" />
          <Stop offset="1" stopColor="#E99A00" />
        </LinearGradient>
      </Defs>
      <Circle cx="16" cy="16" r="15" fill="#A86700" />
      <Circle cx="16" cy="15.5" r="13" fill="url(#coin-gold)" />
      <Circle cx="16" cy="15.5" r="10.4" fill="none" stroke="#C77D00" strokeWidth="1.4" />
      <Path
        d="M16 7.7l2.1 5.1 5.5.4-4.2 3.6 1.3 5.4-4.7-2.9-4.7 2.9 1.3-5.4-4.2-3.6 5.5-.4z"
        fill="#A96900"
      />
      <Path d="M7 11.4a10.8 10.8 0 0 1 9-6" fill="none" stroke="#FFF8D3" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}
