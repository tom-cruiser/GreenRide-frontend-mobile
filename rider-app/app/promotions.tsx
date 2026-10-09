import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInputFlow as TextInput, IconButton } from '@/design';
import { useRouter } from 'expo-router';

import AppLogo from '../components/app-logo';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';

type Promotion = {
  id: number;
  title: string;
  description: string;
  code: string;
  discountLabel: string;
  validUntil: string;
  isActive: boolean;
  accent: string;
};

const PROMOTIONS: Promotion[] = [
  {
    id: 1,
    title: 'First Ride Free',
    description: 'Get your first ride completely free up to 5,000 FBU',
    code: 'WELCOME50',
    discountLabel: 'FREE',
    validUntil: 'March 15, 2026',
    isActive: true,
    accent: '#111111',
  },
  {
    id: 2,
    title: 'Weekend Special',
    description: '20% off all weekend rides',
    code: 'WEEKEND20',
    discountLabel: '20% OFF',
    validUntil: 'Every Weekend',
    isActive: true,
    accent: '#F59E0B',
  },
  {
    id: 3,
    title: 'Student Discount',
    description: '15% off for verified students',
    code: 'STUDENT15',
    discountLabel: '15% OFF',
    validUntil: 'Dec 31, 2026',
    isActive: false,
    accent: '#1976d2',
  },
];

export default function PromotionsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [promoCode, setPromoCode] = useState('');

  const rewardsProgram = useMemo(
    () => ({
      currentPoints: 1250,
      nextReward: 2000,
    }),
    []
  );

  const pointsPct = Math.min(100, (rewardsProgram.currentPoints / rewardsProgram.nextReward) * 100);
  const pointsToNext = Math.max(0, rewardsProgram.nextReward - rewardsProgram.currentPoints);

  const handleApplyPromo = () => {
    const trimmed = promoCode.trim();
    if (!trimmed) {
      Alert.alert('Enter Code', 'Please enter a promo code.');
      return;
    }

    const found = PROMOTIONS.find((p) => p.code.toLowerCase() === trimmed.toLowerCase());
    if (!found) {
      Alert.alert('Invalid Code', 'Please check your promo code and try again.');
      return;
    }

    Alert.alert('Promo Applied', `${found.title} applied. Use it on your next ride.`);
    setPromoCode('');
  };

  const handlePromoCopy = (code: string) => {
    Alert.alert('Code Copied', `Promo code "${code}" copied.`);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ paddingBottom: 28 }}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
        <IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />
      </View>
        <AppLogo size={28} compact />
      </View>

      <View style={[styles.hero, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.heroIcon, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <IconSymbol name="gift.fill" size={18} color={theme.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>Promotions</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>Save money on your rides</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Loyalty Rewards</Text>

        <View style={styles.pointsRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pointsValue, { color: theme.text }]}>{rewardsProgram.currentPoints}</Text>
            <Text style={[styles.pointsLabel, { color: theme.muted }]}>Current points</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <Text style={[styles.pillText, { color: theme.tint }]}>+{pointsToNext} to next reward</Text>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <View style={[styles.progressTrack, { backgroundColor: theme.surfaceAlt }]}> 
            <View style={[styles.progressFill, { width: `${pointsPct}%`, backgroundColor: theme.tint }]} />
          </View>
          <Text style={[styles.progressText, { color: theme.muted }]}>{pointsToNext} points to next reward</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Have a promo code?</Text>
        <View style={[styles.inputRow, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}> 
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Enter promo code"
            placeholderTextColor={theme.muted}
            value={promoCode}
            onChangeText={setPromoCode}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={[styles.applyBtn, { backgroundColor: theme.tint }]} onPress={handleApplyPromo} accessibilityRole="button">
            <Text style={[styles.applyBtnText, { color: theme.background }]}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Available promotions</Text>

        {PROMOTIONS.map((promo) => {
          const accent = promo.isActive ? promo.accent : theme.muted;
          return (
            <View
              key={promo.id}
              style={[
                styles.promoCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  borderLeftColor: accent,
                  opacity: promo.isActive ? 1 : 0.72,
                },
              ]}
            >
              <View style={styles.promoTopRow}>
                <Text style={[styles.promoTitle, { color: theme.text }]}>{promo.title}</Text>
                <View style={[styles.discountBadge, { backgroundColor: promo.isActive ? accent : theme.surfaceAlt, borderColor: theme.border }]}>
                  <Text style={[styles.discountText, { color: promo.isActive ? '#FFFFFF' : theme.text }]}>{promo.discountLabel}</Text>
                </View>
              </View>

              <Text style={[styles.promoDescription, { color: theme.muted }]}>{promo.description}</Text>

              <View style={styles.promoBottomRow}>
                <TouchableOpacity
                  style={[styles.codeButton, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                  onPress={() => handlePromoCopy(promo.code)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.codeText, { color: promo.isActive ? accent : theme.text }]}>{promo.code}</Text>
                  <IconSymbol name="doc.on.doc" size={16} color={promo.isActive ? accent : theme.text} />
                </TouchableOpacity>

                <Text style={[styles.validityText, { color: theme.muted }]}>Valid until: {promo.validUntil}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>How it works</Text>
        <View style={styles.step}>
          <View style={[styles.stepDot, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}> 
            <Text style={[styles.stepDotText, { color: theme.tint }]}>1</Text>
          </View>
          <Text style={[styles.stepText, { color: theme.muted }]}>Copy a code from the list above.</Text>
        </View>
        <View style={styles.step}>
          <View style={[styles.stepDot, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}> 
            <Text style={[styles.stepDotText, { color: theme.tint }]}>2</Text>
          </View>
          <Text style={[styles.stepText, { color: theme.muted }]}>Paste it here or during booking.</Text>
        </View>
        <View style={styles.step}>
          <View style={[styles.stepDot, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}> 
            <Text style={[styles.stepDotText, { color: theme.tint }]}>3</Text>
          </View>
          <Text style={[styles.stepText, { color: theme.muted }]}>Discount applies on your next ride.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  hero: {
    margin: 20,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsValue: {
    fontSize: 34,
    fontWeight: '900',
  },
  pointsLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontWeight: '900',
    fontSize: 12,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
  },
  applyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  promoCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  promoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
    marginRight: 10,
  },
  discountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '900',
  },
  promoDescription: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 12,
  },
  promoBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginRight: 8,
  },
  validityText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 10,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  stepDotText: {
    fontWeight: '900',
    fontSize: 14,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
});
