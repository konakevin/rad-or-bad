import { View, Text, StyleSheet } from 'react-native';
import type { TextStyle } from 'react-native';
import { Image } from 'expo-image';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

export type UserRank = 'LEGENDARY' | 'RAD' | 'SOLID' | 'MID' | 'BAD' | 'CURSED';

const RANK_META: Record<UserRank, { colors: string[]; glow: string }> = {
  LEGENDARY: { colors: ['#FFFFFF', '#FFE566', '#FFAA00'], glow: 'rgba(255,220,80,0.75)'  },
  RAD:       { colors: ['#AAFF55', '#44EE88'],            glow: 'rgba(100,255,100,0.65)' },
  SOLID:     { colors: ['#44CCFF', '#2277EE'],            glow: 'rgba(68,204,255,0.55)'  },
  MID:       { colors: ['#BBBBBB', '#888888'],            glow: 'rgba(170,170,170,0.4)'  },
  BAD:       { colors: ['#CC77FF', '#8833CC'],            glow: 'rgba(180,100,255,0.6)'  },
  CURSED:    { colors: ['#FF4444', '#BB0000'],            glow: 'rgba(255,60,60,0.65)'   },
};

interface GradientUsernameProps {
  username: string;
  rank: UserRank | string | null | undefined;
  style: TextStyle | (TextStyle | false | null | undefined)[];
  /** Pass true on the swipe card (over photos) to swap the black shadow for a rank-tinted glow */
  photoOverlay?: boolean;
  /** Pass true to suppress rank gradient (e.g. home feed — avoid voting bias) */
  hideRank?: boolean;
  /** Avatar URL to show a circular thumbnail to the left of the username */
  avatarUrl?: string | null;
  /** Show avatar thumbnail. Defaults to false. */
  showAvatar?: boolean;
  /** Avatar diameter in pixels. Defaults to 20. */
  avatarSize?: number;
}

function AvatarCircle({ url, size, username }: { url?: string | null; size: number; username: string }) {
  if (url) {
    return <Image source={{ uri: url }} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} />;
  }
  // Fallback: initial letter on a dark circle
  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarInitial, { fontSize: size * 0.45 }]}>{username[0]?.toUpperCase() ?? '?'}</Text>
    </View>
  );
}

export function GradientUsername({
  username, rank, style, photoOverlay = false, hideRank = false,
  avatarUrl, showAvatar = false, avatarSize = 20,
}: GradientUsernameProps) {
  const text = username;

  function wrapWithAvatar(node: React.ReactNode) {
    if (!showAvatar) return node;
    return (
      <View style={styles.row}>
        <AvatarCircle url={avatarUrl} size={avatarSize} username={username} />
        {node}
      </View>
    );
  }

  if (hideRank) {
    return wrapWithAvatar(
      <Text style={[style, { color: 'rgba(255,255,255,0.9)' }]}>{text}</Text>
    );
  }

  const meta = rank ? RANK_META[rank as UserRank] : null;

  if (!meta) {
    return wrapWithAvatar(
      <MaskedView maskElement={<Text style={style}>{text}</Text>}>
        <LinearGradient
          colors={['#999999', '#666666']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={[style, { opacity: 0 }]}>{text}</Text>
        </LinearGradient>
      </MaskedView>
    );
  }

  const maskStyle = photoOverlay
    ? [style, { textShadowColor: meta.glow, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 }]
    : style;

  return wrapWithAvatar(
    <MaskedView maskElement={<Text style={maskStyle}>{text}</Text>}>
      <LinearGradient
        colors={meta.colors as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={[style, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  avatar: {
    backgroundColor: '#2D2D44',
  },
  avatarFallback: {
    backgroundColor: '#2D2D44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
