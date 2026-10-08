import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

type Slide = {
  key: string;
  title: string;
  description: string;
  image: any;
};

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    title: 'Welcome to Green Ride',
    description: 'The eco-friendly way to get around your city — cleaner trips, fairer fares.',
    image: require('../assets/images/app-logo.png'),
  },
  {
    key: 'eco',
    title: 'Greener by design',
    description: 'Every ride is matched to low-emission drivers, so your daily commute helps the planet.',
    image: require('../assets/images/onboarding-visual.png'),
  },
  {
    key: 'wallet',
    title: 'Pay in seconds',
    description: 'Top up your in-app wallet once and pay for rides instantly — no card swipes, no surprises.',
    image: require('../assets/images/uber-design.png'),
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const finish = useCallback(async () => {
    try {
      await AsyncStorage.setItem('riderHasOnboarded', 'true');
    } catch {}
    router.replace('/(auth)/login');
  }, [router]);

  const goNext = useCallback(() => {
    if (index >= SLIDES.length - 1) {
      finish();
      return;
    }
    const next = index + 1;
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  }, [index, finish]);

  const onMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (newIndex !== index) setIndex(newIndex);
  }, [index]);

  const renderItem: ListRenderItem<Slide> = useCallback(({ item }) => (
    <View style={styles.slide}>
      <View style={styles.imageWrap}>
        <Image source={item.image} style={styles.image} accessibilityLabel={item.title} />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  ), []);

  const isLast = index === SLIDES.length - 1;
  const dots = useMemo(() => SLIDES.map((s, i) => (
    <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
  )), [index]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.skipRow}>
        {!isLast ? (
          <TouchableOpacity onPress={finish} hitSlop={12}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, i) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * i, index: i })}
      />

      <View style={styles.dotsRow}>{dots}</View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={goNext}>
          <Text style={styles.primaryBtnText}>
            {isLast ? 'Get started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7F7' },
  skipRow: {
    height: 32,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  skipText: { color: '#111111', fontWeight: '600', fontSize: 14 },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  imageWrap: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  image: { width: '100%', height: '100%', resizeMode: 'contain' },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0B0B0B',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  dotActive: { backgroundColor: '#111111', width: 22 },
  footer: { paddingHorizontal: 24, paddingBottom: 12 },
  primaryBtn: {
    backgroundColor: '#111111',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
