import { Feather } from '@expo/vector-icons';
import React, { createContext, useContext } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadow, space, type, type TypeVariant, type Weight } from './tokens';
import { initials as initialsOf } from './format';

// ── Size: the driver app is bigger ─────────────────────────────────────────
// 'rider' is the base; 'driver' scales text and touch targets up so they
// read at a glance and are easy to hit while working.

type Density = 'rider' | 'driver';
const DensityContext = createContext<Density>('rider');
export const DesignProvider = ({ density, children }: { density: Density; children: React.ReactNode }) => (
  <DensityContext.Provider value={density}>{children}</DensityContext.Provider>
);
export function useScale() {
  const density = useContext(DensityContext);
  return density === 'driver' ? { text: 1.15, touch: 1.2 } : { text: 1, touch: 1 };
}

export type IconName = React.ComponentProps<typeof Feather>['name'];
export function Icon({ name, size = 20, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  return <Feather name={name} size={size} color={color} />;
}

// ── Text ──────────────────────────────────────────────────────────────────

// Maps a numeric fontWeight to the Inter family that has it.
const WEIGHT_FAMILY: Record<string, string> = {
  '100': fonts.regular, '200': fonts.regular, '300': fonts.regular, '400': fonts.regular, normal: fonts.regular,
  '500': fonts.medium, '600': fonts.semibold, '700': fonts.bold, bold: fonts.bold, '800': fonts.extrabold, '900': fonts.extrabold,
};

type FlowTextProps = TextProps & {
  variant?: TypeVariant;
  weight?: Weight;
  color?: string;
  align?: TextStyle['textAlign'];
};

// Inter everywhere. Also a drop-in for react-native's Text: a style with a
// fontWeight picks the matching Inter family.
export function Text({ variant = 'body', weight, color, align, style, ...props }: FlowTextProps) {
  const { text: k } = useScale();
  const t = type[variant];
  const flat = StyleSheet.flatten(style) ?? {};
  const family = weight ? fonts[weight] : flat.fontWeight ? WEIGHT_FAMILY[String(flat.fontWeight)] : fonts[t.weight];
  return (
    <RNText
      {...props}
      style={[
        {
          fontSize: t.size * k,
          lineHeight: t.line * k,
          letterSpacing: t.tracking,
          color: color ?? colors.ink,
          textAlign: align,
          textTransform: variant === 'overline' ? 'uppercase' : undefined,
        },
        style,
        // Android draws custom fonts only by family; weight must not fight it.
        { fontFamily: family, fontWeight: undefined },
        flat.fontSize && !flat.lineHeight ? { lineHeight: undefined } : null,
      ]}
    />
  );
}

// Inter for typed text too: a drop-in for react-native's TextInput.
export const TextInputFlow = React.forwardRef<TextInput, TextInputProps>(function TextInputFlow({ style, ...props }, ref) {
  const flat = StyleSheet.flatten(style) ?? {};
  const family = flat.fontWeight ? WEIGHT_FAMILY[String(flat.fontWeight)] : fonts.regular;
  return <TextInput ref={ref} {...props} style={[style, { fontFamily: family, fontWeight: undefined }]} />;
});

// ── Layout ────────────────────────────────────────────────────────────────

export function Screen({
  children, scroll = true, padded = true, dark = false, style, contentStyle, edges = ['top'],
  refreshControl,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'];
}) {
  const bg = dark ? colors.night : colors.bg;
  const inner = [padded && { padding: space.xl, paddingBottom: space.xxxl * 2 }, contentStyle];
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: bg }, style]}>
      {scroll ? (
        <ScrollView contentContainerStyle={inner} keyboardShouldPersistTaps="handled" refreshControl={refreshControl}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, dark = false, padded = true, onPress }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; dark?: boolean; padded?: boolean; onPress?: () => void;
}) {
  const box: StyleProp<ViewStyle> = [
    {
      backgroundColor: dark ? colors.night : colors.surface,
      borderRadius: radius.xl,
      borderWidth: dark ? 0 : 1,
      borderColor: colors.line,
    },
    // Only set when padded, so a caller's paddingHorizontal/Vertical wins
    // (on the web a 0 shorthand would override them).
    padded && { padding: space.xl },
    !dark && shadow.card,
    style,
  ];
  if (!onPress) return <View style={box}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [box, pressed && { opacity: 0.85 }]} accessibilityRole="button">
      {children}
    </Pressable>
  );
}

export const Gap = ({ size = space.md }: { size?: number }) => <View style={{ height: size, width: size }} />;

export function Divider({ dark = false }: { dark?: boolean }) {
  return <View style={{ height: 1, backgroundColor: dark ? 'rgba(255,255,255,0.12)' : colors.line, marginVertical: space.md }} />;
}

// ── Buttons ───────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'ghostDark' | 'danger' | 'light';
type ButtonSize = 'md' | 'lg' | 'xl';

const BUTTON: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.ink, fg: colors.onDark },
  secondary: { bg: colors.surface, fg: colors.ink, border: colors.line },
  ghost: { bg: 'transparent', fg: colors.ink },
  ghostDark: { bg: 'transparent', fg: colors.onDark }, // text button on dark panels
  danger: { bg: colors.surface, fg: colors.danger, border: '#FCA5A5' },
  light: { bg: colors.onDark, fg: colors.ink }, // white button on dark panels
};
const BUTTON_HEIGHT: Record<ButtonSize, number> = { md: 48, lg: 56, xl: 68 };

export function Button({
  label, onPress, variant = 'primary', size = 'lg', icon, loading = false, disabled = false, style, ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { touch } = useScale();
  const v = BUTTON[variant];
  const off = disabled || loading;
  return (
    <Pressable
      {...rest}
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      style={({ pressed }) => [
        {
          height: BUTTON_HEIGHT[size] * touch,
          borderRadius: radius.pill,
          backgroundColor: v.bg,
          borderWidth: v.border ? 1.5 : 0,
          borderColor: v.border,
          paddingHorizontal: space.xl,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
          opacity: off ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={size === 'xl' ? 24 : 20} color={v.fg} />}
          <Text variant="label" weight="bold" color={v.fg} style={{ fontSize: (size === 'xl' ? 19 : size === 'lg' ? 16 : 15) }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// Round icon button (bell, back, close), with an optional count badge.
export function IconButton({ icon, onPress, label, count, dark = false, size = 44 }: {
  icon: IconName; onPress?: () => void; label: string; count?: number; dark?: boolean; size?: number;
}) {
  const { touch } = useScale();
  const s = size * touch;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [{
        width: s, height: s, borderRadius: s / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: dark ? 'rgba(255,255,255,0.12)' : colors.surface,
        borderWidth: dark ? 0 : 1, borderColor: colors.line, opacity: pressed ? 0.8 : 1,
      }, !dark && shadow.card]}
    >
      <Icon name={icon} size={20 * touch} color={dark ? colors.onDark : colors.ink} />
      {count ? (
        <View style={styles.count}>
          <Text variant="caption" weight="bold" color={colors.onDark} style={{ fontSize: 11, lineHeight: 14 }}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ── Small pieces ──────────────────────────────────────────────────────────

type BadgeTone = 'neutral' | 'dark' | 'warning' | 'danger' | 'light';
const BADGE: Record<BadgeTone, [string, string]> = {
  neutral: [colors.soft2, colors.ink2],
  dark: [colors.ink, colors.onDark],
  warning: [colors.warningSoft, colors.warning],
  danger: [colors.dangerSoft, colors.danger],
  light: ['rgba(255,255,255,0.14)', colors.onDark],
};
export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: BadgeTone; icon?: IconName }) {
  const [bg, fg] = BADGE[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
      {icon && <Icon name={icon} size={13} color={fg} />}
      <Text variant="caption" weight="semibold" color={fg}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, size = 48, dark = false }: { name?: string | null; size?: number; dark?: boolean }) {
  const { touch } = useScale();
  const s = size * touch;
  return (
    <View style={{ width: s, height: s, borderRadius: s / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? colors.onDark : colors.ink }}>
      <Text weight="bold" color={dark ? colors.ink : colors.onDark} style={{ fontSize: s * 0.36, lineHeight: s * 0.44 }}>{initialsOf(name)}</Text>
    </View>
  );
}

// "Label ........ value" line.
export function Row({ label, value, dark = false, strong = false }: { label: string; value: React.ReactNode; dark?: boolean; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text color={dark ? colors.onDarkMuted : colors.ink3}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text weight={strong ? 'bold' : 'semibold'} color={dark ? colors.onDark : colors.ink} style={{ flexShrink: 1, textAlign: 'right' }}>{value}</Text>
      ) : value}
    </View>
  );
}

// A tappable line in a list (Account menu, ride history).
export function ListItem({ icon, title, subtitle, right, onPress, danger = false }: {
  icon?: IconName; title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void; danger?: boolean;
}) {
  const { touch } = useScale();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.item, { minHeight: 60 * touch, opacity: pressed ? 0.7 : 1 }]}
    >
      {icon && (
        <View style={[styles.itemIcon, { width: 40 * touch, height: 40 * touch }]}>
          <Icon name={icon} size={19 * touch} color={danger ? colors.danger : colors.ink} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text weight="semibold" color={danger ? colors.danger : colors.ink}>{title}</Text>
        {subtitle ? <Text variant="caption" color={colors.muted} style={{ marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-right" size={20} color={colors.muted} /> : null)}
    </Pressable>
  );
}

export function Stat({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="caption" color={dark ? colors.onDarkMuted : colors.muted}>{label}</Text>
      <Text variant="heading" weight="bold" color={dark ? colors.onDark : colors.ink} style={{ marginTop: 2, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

// `dark`: for dark screens (sign-in), as on the website: white label,
// faint white field.
export function Field({ label, hint, error, dark = false, style, ...input }: TextInputProps & {
  label: string; hint?: string; error?: string | null; dark?: boolean;
}) {
  const { text: k, touch } = useScale();
  return (
    <View style={{ gap: 6 }}>
      <Text variant="label" color={dark ? colors.onDark : colors.ink}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={dark ? 'rgba(255,255,255,0.35)' : colors.muted}
        {...input}
        style={[{
          height: 52 * touch, borderRadius: radius.md, borderWidth: 1.5,
          borderColor: error ? colors.danger : dark ? 'rgba(255,255,255,0.14)' : colors.line,
          backgroundColor: dark ? 'rgba(255,255,255,0.05)' : colors.surface,
          paddingHorizontal: space.lg, fontSize: 16 * k, color: dark ? colors.onDark : colors.ink, fontFamily: fonts.regular,
        }, style]}
      />
      {error ? <Text variant="caption" color={colors.danger}>{error}</Text>
        : hint ? <Text variant="caption" color={dark ? colors.onDarkMuted : colors.muted}>{hint}</Text> : null}
    </View>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: IconName; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.xxxl, paddingHorizontal: space.xl, gap: space.sm }}>
      <View style={[styles.itemIcon, { width: 56, height: 56, borderRadius: 28 }]}><Icon name={icon} size={24} /></View>
      <Text variant="heading" align="center" style={{ marginTop: space.sm }}>{title}</Text>
      {text ? <Text color={colors.ink3} align="center">{text}</Text> : null}
      {action ? <View style={{ marginTop: space.md, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

// Page title with an optional back button and a right-hand slot.
export function Header({ title, onBack, backLabel = 'Back', right, dark = false }: {
  title?: string; onBack?: () => void; backLabel?: string; right?: React.ReactNode; dark?: boolean;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1 }}>
        {onBack && <IconButton icon="chevron-left" label={backLabel} onPress={onBack} dark={dark} />}
        {title ? <Text variant="title" color={dark ? colors.onDark : colors.ink} style={{ flexShrink: 1 }} numberOfLines={1}>{title}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  count: {
    position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10,
    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md, paddingVertical: 7 },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  itemIcon: { borderRadius: radius.pill, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, marginBottom: space.xl },
});
