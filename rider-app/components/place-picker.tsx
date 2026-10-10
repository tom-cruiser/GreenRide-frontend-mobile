import React, { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors, EmptyState, Field, Header, Icon, ListItem, radius, space, Text } from '@/design';
import FlowMap from '@/components/flow-map';
import { geocoding, geoErrorMessage, type Place, type Point } from '@/services/geo';

// Choosing a pickup or drop-off: search by name (on submit; the geocoder must
// not be asked on every key), the phone's own position, or a tap on the map
// (the address there is looked up).

type Props = {
  visible: boolean;
  title: string;
  token: string;
  // The phone's position: biases the search, and offered as "My location".
  here: Point | null;
  onPick: (place: Place) => void;
  onClose: () => void;
};

export function PlacePicker({ visible, title, token, here, onPick, onClose }: Props) {
  const [mode, setMode] = useState<'search' | 'map'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Map mode: the tapped point and its address.
  const [tapped, setTapped] = useState<Place | null>(null);

  const close = () => {
    setMode('search');
    setTapped(null);
    setError(null);
    onClose();
  };
  const pick = (place: Place) => {
    onPick(place);
    close();
  };

  const search = async () => {
    if (query.trim().length < 2) {
      setError('Type at least 2 letters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setResults(await geocoding.search(token, query, here));
    } catch (e) {
      setError(geoErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // The address at a point; without one the place is named by its position.
  const describe = async (point: Point, fallbackName: string): Promise<Place> => {
    try {
      const place = await geocoding.reverse(token, point);
      if (place) return { ...place, lat: point.lat, lng: point.lng };
    } catch {
      // Keep the point even if the address lookup failed.
    }
    return { id: `pt${point.lat},${point.lng}`, name: fallbackName, address: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`, ...point };
  };

  const useMyLocation = async () => {
    if (!here) return;
    setBusy(true);
    pick(await describe(here, 'My location'));
    setBusy(false);
  };

  const onMapTap = async (point: Point) => {
    setTapped({ id: 'tap', name: 'Looking up the address…', address: '', ...point });
    setTapped(await describe(point, 'Pinned place'));
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
        <View style={{ paddingHorizontal: space.lg }}>
          <Header title={title} onBack={mode === 'map' ? () => setMode('search') : close} backLabel={mode === 'map' ? 'Search' : 'Close'} />
        </View>

        {mode === 'search' ? (
          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.xxl }}>
            <Field label="Search a place" placeholder="e.g. Marché de Kamenge" value={query} autoFocus
              returnKeyType="search" onChangeText={setQuery} onSubmitEditing={search} error={error} />
            <Button label="Search" icon="search" onPress={search} loading={busy} style={{ marginTop: space.md }} />

            <View style={styles.shortcuts}>
              {here && <ListItem icon="crosshair" title="My location" subtitle="Where the phone is now" onPress={useMyLocation} />}
              {/* Tap-to-pick needs the Android (MapLibre) map. */}
              {Platform.OS === 'android' && (
                <ListItem icon="map-pin" title="Pick on the map" subtitle="Tap the exact spot" onPress={() => setMode('map')} />
              )}
            </View>

            {results && results.length === 0 && (
              <EmptyState icon="search" title="No places found" text="Try a nearby landmark, a street or the neighbourhood, or pick the spot on the map." />
            )}
            {results?.map((place) => (
              <ListItem key={place.id} icon="map-pin" title={place.name} subtitle={place.address} onPress={() => pick(place)} />
            ))}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            <FlowMap
              style={{ flex: 1 }}
              center={tapped ? { latitude: tapped.lat, longitude: tapped.lng } : here ? { latitude: here.lat, longitude: here.lng } : { latitude: -3.3822, longitude: 29.3644 }}
              delta={0.01}
              userLocation={here ? { latitude: here.lat, longitude: here.lng } : undefined}
              pins={tapped ? [{ id: 'tap', latitude: tapped.lat, longitude: tapped.lng, color: colors.ink }] : []}
              onPress={(p) => onMapTap({ lat: p.latitude, lng: p.longitude })}
            />
            <View style={styles.mapSheet}>
              {tapped ? (
                <>
                  <Text weight="semibold">{tapped.name}</Text>
                  {tapped.address ? <Text variant="caption" color={colors.muted}>{tapped.address}</Text> : <ActivityIndicator />}
                  <Button label="Use this place" onPress={() => pick(tapped)} disabled={!tapped.address} style={{ marginTop: space.md }} />
                </>
              ) : (
                <View style={styles.hint}>
                  <Icon name="map-pin" size={18} />
                  <Text>Tap the map where you want to be.</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// The chosen place, shown in the booking form; tap to change.
export function PlaceButton({ label, place, placeholder, onPress }: {
  label: string; place: Place | null; placeholder: string; onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${place?.name ?? placeholder}`} onPress={onPress} style={styles.placeButton}>
      <Icon name={label === 'Pickup' ? 'circle' : 'map-pin'} size={18} />
      <View style={{ flex: 1 }}>
        <Text variant="caption" color={colors.muted}>{label}</Text>
        <Text weight={place ? 'semibold' : undefined} color={place ? colors.ink : colors.muted} numberOfLines={1}>{place?.name ?? placeholder}</Text>
        {place?.address ? <Text variant="caption" color={colors.muted} numberOfLines={1}>{place.address}</Text> : null}
      </View>
      <Icon name="chevron-right" color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, paddingHorizontal: space.lg },
  shortcuts: { marginVertical: space.lg, gap: space.xs },
  mapSheet: { padding: space.lg, backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  hint: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  placeButton: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface,
  },
});
