import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Tabs } from 'expo-router';
import { colors, Icon, type IconName, shadow, Text } from '@/design';

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

// The rider app's tab bar: a floating white bar with a curved notch, and a
// raised black circle in the notch holding the active tab's icon. Choosing a
// tab slides the notch and the circle to it.

const BAR_H = 64;       // height of the white bar
const R = 22;           // corner radius
const PAD = 28;         // space between the bar's ends and the first/last tab
const CIRCLE = 56;      // the raised circle
const GAP = 6;          // the notch: page colour around the circle
const NOTCH = CIRCLE + GAP * 2;
const LIFT = CIRCLE / 2; // the circle rises this much above the bar
const CIRCLE_TOP = -LIFT + 4;
const SPRING = { damping: 18, stiffness: 190, mass: 0.9 };

export const TAB_ICONS: Record<string, IconName> = {
  index: 'home',
  'ride-booking': 'map-pin',
  wallet: 'credit-card',
  'ride-history': 'clock',
  explore: 'menu',
};

export function FlowTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const count = state.routes.length;
  const slot = width > 0 ? (width - PAD * 2) / count : 0;
  const centre = (i: number) => PAD + slot * i + slot / 2;

  const cx = useSharedValue(0);
  const ready = width > 0;
  useEffect(() => {
    if (!ready) return;
    const target = centre(state.index);
    // First layout: jump there; afterwards: slide.
    cx.value = cx.value === 0 ? target : withSpring(target, SPRING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index, width, ready]);

  // Only transforms move, so it runs the same on iPhone and Android.
  const circleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: cx.value - CIRCLE / 2 }] }));
  const notchStyle = useAnimatedStyle(() => ({ transform: [{ translateX: cx.value - NOTCH / 2 }] }));
  const labelStyle = useAnimatedStyle(() => ({ transform: [{ translateX: cx.value - 40 }] }));

  const active = state.routes[state.index];
  const activeLabel = String(descriptors[active.key].options.title ?? active.name);

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.bar} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {ready && (
          <>
            {/* The notch: a page-coloured disc cut into the bar's top edge */}
            <Animated.View pointerEvents="none" style={[styles.notch, notchStyle]} />

            {/* Tabs: the active one's icon lives in the circle */}
            <View style={[styles.row, { paddingHorizontal: PAD }]}>
              {state.routes.map((route, i) => {
                const { options } = descriptors[route.key];
                const label = String(options.title ?? route.name);
                const focused = state.index === i;
                const onPress = () => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
                };
                return (
                  <Pressable
                    key={route.key}
                    onPress={onPress}
                    onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: focused }}
                    accessibilityLabel={label}
                    style={styles.tab}
                    hitSlop={6}
                  >
                    {!focused && <Icon name={TAB_ICONS[route.name] ?? 'circle'} size={24} color={colors.muted} />}
                  </Pressable>
                );
              })}
            </View>

            {/* The raised circle and the active tab's name under it */}
            <Animated.View pointerEvents="none" style={[styles.circle, circleStyle]}>
              <Icon name={TAB_ICONS[active.name] ?? 'circle'} size={24} color={colors.onDark} />
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.label, labelStyle]}>
              <Text variant="caption" weight="semibold" align="center" numberOfLines={1}>{activeLabel}</Text>
            </Animated.View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.bg, paddingTop: LIFT + 4, paddingHorizontal: 16 },
  bar: { height: BAR_H, borderRadius: R, backgroundColor: colors.surface, ...shadow.float, shadowOpacity: 0.08 },
  notch: {
    position: 'absolute', top: CIRCLE_TOP - GAP, left: 0, width: NOTCH, height: NOTCH, borderRadius: NOTCH / 2,
    backgroundColor: colors.bg,
  },
  row: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center' },
  tab: { flex: 1, height: BAR_H, alignItems: 'center', justifyContent: 'center' },
  circle: {
    position: 'absolute', top: CIRCLE_TOP, left: 0, width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2,
    backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', ...shadow.float, shadowOpacity: 0.25,
  },
  label: { position: 'absolute', top: CIRCLE_TOP + NOTCH - GAP + 2, left: 0, width: 80 },
});
