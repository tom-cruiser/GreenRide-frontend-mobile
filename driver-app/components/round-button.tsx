import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, Icon, type IconName, space, Text } from '@/design';

// Big round call button with its label underneath (calls, incoming calls).
export function RoundButton({ icon, label, onPress, danger = false, active = false, light = false }: {
  icon: IconName; label: string; onPress: () => void; danger?: boolean; active?: boolean; light?: boolean;
}) {
  const bg = danger ? colors.danger : light || active ? colors.onDark : 'rgba(255,255,255,0.14)';
  const fg = light || active ? colors.ink : colors.onDark;
  return (
    <View style={{ alignItems: 'center', gap: space.sm }}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
        style={({ pressed }) => [styles.round, { backgroundColor: bg, opacity: pressed ? 0.8 : 1 }]}>
        <Icon name={icon} size={30} color={fg} />
      </Pressable>
      <Text variant="caption" color={colors.onDarkMuted}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  round: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
});
