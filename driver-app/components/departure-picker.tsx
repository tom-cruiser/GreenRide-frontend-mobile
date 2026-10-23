import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, Icon, radius, space, Text } from '@/design';
import { useT } from '@/i18n';

// When a scheduled trip leaves: a day (the next two weeks) and a time, in
// 5-minute steps. Works in Expo Go (no native date picker needed).

const DAYS = 14;

export function DeparturePicker({ value, onChange }: { value: Date; onChange: (next: Date) => void }) {
  const { t, locale } = useT();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const dayLabel = (d: Date, i: number) =>
    i === 0 ? t('scheduled.today') : i === 1 ? t('scheduled.tomorrow') : d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' });

  const setDay = (d: Date) => {
    const next = new Date(d);
    next.setHours(value.getHours(), value.getMinutes(), 0, 0);
    onChange(next);
  };
  const shift = (minutes: number) => {
    const next = new Date(value.getTime() + minutes * 60_000);
    // Stay on the chosen day: the hours and minutes wrap around.
    if (!sameDay(next, value)) next.setDate(value.getDate());
    onChange(next);
  };

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {days.map((d, i) => {
          const on = sameDay(d, value);
          return (
            <Pressable key={d.toISOString()} onPress={() => setDay(d)} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={[styles.day, on && styles.dayOn]}>
              <Text weight="semibold" color={on ? colors.onDark : colors.ink}>{dayLabel(d, i)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.timeRow}>
        <Stepper label={t('scheduled.hour')} value={String(value.getHours()).padStart(2, '0')} onMinus={() => shift(-60)} onPlus={() => shift(60)} />
        <Text variant="title">:</Text>
        <Stepper label={t('scheduled.minutes')} value={String(value.getMinutes()).padStart(2, '0')} onMinus={() => shift(-5)} onPlus={() => shift(5)} />
      </View>
    </View>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onMinus} style={styles.stepBtn} accessibilityRole="button" accessibilityLabel={`${label} −`} hitSlop={6}>
        <Icon name="minus" size={18} />
      </Pressable>
      <Text variant="title" style={{ minWidth: 44, textAlign: 'center' }} accessibilityLabel={`${label} ${value}`}>{value}</Text>
      <Pressable onPress={onPlus} style={styles.stepBtn} accessibilityRole="button" accessibilityLabel={`${label} +`} hitSlop={6}>
        <Icon name="plus" size={18} />
      </Pressable>
    </View>
  );
}

// A sensible first choice: tomorrow at 08:00.
export function defaultDeparture() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d;
}

const styles = StyleSheet.create({
  day: { paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface },
  dayOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md, marginTop: space.lg },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
});
