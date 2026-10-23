import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Pressable, StyleSheet, View } from 'react-native';
import { DeparturePicker, defaultDeparture } from '@/components/departure-picker';
import { PlaceButton, PlacePicker } from '@/components/place-picker';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Card, colors, Field, formatMoney, Header, Icon, radius, Screen, space, Text } from '@/design';
import { useT } from '@/i18n';
import { driversAPI, photoSource } from '@/services/api';
import type { Place, Point } from '@/services/geo';
import { scheduledAPI, uploadCarPhoto } from '@/services/scheduled';
import { departureLabel } from '@/utils/departure';

// Posting a scheduled trip: where from, the stops on the way, where to,
// when, how many seats and the price of one seat (the driver's to set), and
// the car riders will look for (with its photo).

type Picking = { kind: 'origin' } | { kind: 'destination' } | { kind: 'stop' };
const MAX_STOPS = 10;

export default function NewScheduledTrip() {
  const router = useRouter();
  const { t, locale } = useT();
  const { token } = useAuth();
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [stops, setStops] = useState<Place[]>([]);
  const [picking, setPicking] = useState<Picking | null>(null);
  const [here, setHere] = useState<Point | null>(null);
  const [departure, setDeparture] = useState(defaultDeparture);
  const [seats, setSeats] = useState(4);
  const [price, setPrice] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [plate, setPlate] = useState('');
  const [carPhoto, setCarPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  // The clock, for "at least 10 minutes from now" (refreshed every 30 s).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // The approved car fills the form; the driver can still change it for this trip.
  useEffect(() => {
    if (!token) return;
    driversAPI.getMe(token).then(({ driver }) => {
      setMake(driver?.vehicle_make ?? '');
      setModel(driver?.vehicle_model ?? '');
      setPlate(driver?.license_number ?? '');
      setCarPhoto(driver?.carPhotoUrl ?? null);
    }).catch(() => {});
    Location.getLastKnownPositionAsync()
      .then((p) => p && setHere({ lat: p.coords.latitude, lng: p.coords.longitude }))
      .catch(() => {});
  }, [token]);

  const onPick = (place: Place) => {
    if (picking?.kind === 'origin') setOrigin(place);
    else if (picking?.kind === 'destination') setDestination(place);
    else setStops((list) => [...list, place].slice(0, MAX_STOPS));
  };

  const pickCarPhoto = async (camera: boolean) => {
    if (!token) return;
    const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert(t('scheduled.carPhoto'), t('profile.photoAccess'));
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7 };
    const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      setCarPhoto((await uploadCarPhoto(token, result.assets[0].uri)).carPhotoUrl);
    } catch (e) {
      Alert.alert(t('profile.uploadFailed'), e instanceof Error ? e.message : t('common.error'));
    } finally {
      setUploading(false);
    }
  };
  const carPhotoMenu = () =>
    Alert.alert(t('scheduled.carPhoto'), undefined, [
      { text: t('profile.takePhoto'), onPress: () => pickCarPhoto(true) },
      { text: t('profile.choosePhoto'), onPress: () => pickCarPhoto(false) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);

  const pricePerSeat = Number(price.replace(/\D/g, ''));
  const tooSoon = departure.getTime() - now < 10 * 60_000;
  const ready = origin && destination && pricePerSeat >= 100 && !tooSoon;

  const submit = async () => {
    if (!token || !origin || !destination) return;
    const point = (p: Place) => ({ name: p.name, lat: p.lat, lng: p.lng });
    setBusy(true);
    try {
      const { trip } = await scheduledAPI.create(token, {
        origin: point(origin),
        destination: point(destination),
        stops: stops.map(point),
        departureAt: departure.toISOString(),
        seats,
        pricePerSeat,
        car: {
          ...(make.trim() ? { make: make.trim() } : {}),
          ...(model.trim() ? { model: model.trim() } : {}),
          ...(color.trim() ? { color: color.trim() } : {}),
          ...(plate.trim() ? { plate: plate.trim() } : {}),
        },
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      router.replace(`/scheduled/${trip.id}`);
    } catch (e) {
      Alert.alert(t('scheduled.postFailed'), e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Screen>
        <Header title={t('scheduled.newTitle')} onBack={() => router.back()} backLabel={t('common.back')} />
        <Text color={colors.ink3}>{t('scheduled.newIntro')}</Text>

        {/* Route */}
        <Text variant="heading" style={styles.section}>{t('scheduled.route')}</Text>
        <View style={{ gap: space.md }}>
          <PlaceButton start label={t('scheduled.from')} place={origin} placeholder={t('scheduled.fromHint')} onPress={() => setPicking({ kind: 'origin' })} />
          {stops.map((stop, i) => (
            <View key={`${stop.id}-${i}`} style={styles.stopRow}>
              <View style={{ flex: 1 }}>
                <PlaceButton label={t('scheduled.stopN', { n: i + 1 })} place={stop} placeholder="" onPress={() => {}} />
              </View>
              <Pressable onPress={() => setStops((list) => list.filter((_, j) => j !== i))} style={styles.remove}
                accessibilityRole="button" accessibilityLabel={t('scheduled.removeStop')} hitSlop={6}>
                <Icon name="x" size={18} />
              </Pressable>
            </View>
          ))}
          {stops.length < MAX_STOPS && (
            <Button variant="secondary" icon="plus" label={t('scheduled.addStop')} onPress={() => setPicking({ kind: 'stop' })} />
          )}
          <PlaceButton label={t('scheduled.to')} place={destination} placeholder={t('scheduled.toHint')} onPress={() => setPicking({ kind: 'destination' })} />
        </View>

        {/* When */}
        <Text variant="heading" style={styles.section}>{t('scheduled.when')}</Text>
        <DeparturePicker value={departure} onChange={setDeparture} />
        <Text align="center" weight="semibold" style={{ marginTop: space.md }} color={tooSoon ? colors.danger : colors.ink}>
          {tooSoon ? t('scheduled.tooSoon') : departureLabel(departure.toISOString(), locale, t)}
        </Text>

        {/* Seats and price */}
        <Text variant="heading" style={styles.section}>{t('scheduled.seatsAndPrice')}</Text>
        <Card>
          <View style={styles.stepperRow}>
            <Text style={{ flex: 1 }}>{t('scheduled.seatsForRiders')}</Text>
            <Pressable style={[styles.stepBtn, seats <= 1 && { opacity: 0.4 }]} disabled={seats <= 1} onPress={() => setSeats((v) => v - 1)}
              accessibilityLabel={t('scheduled.fewer')}><Icon name="minus" size={18} /></Pressable>
            <Text variant="title" style={{ minWidth: 36, textAlign: 'center' }}>{seats}</Text>
            <Pressable style={[styles.stepBtn, seats >= 20 && { opacity: 0.4 }]} disabled={seats >= 20} onPress={() => setSeats((v) => v + 1)}
              accessibilityLabel={t('scheduled.more')}><Icon name="plus" size={18} /></Pressable>
          </View>
          <Text variant="caption" color={colors.muted} style={{ marginTop: space.xs }}>{t('scheduled.seatsHint')}</Text>
          <View style={{ marginTop: space.lg }}>
            <Field label={t('scheduled.pricePerSeat')} value={price} onChangeText={(v) => setPrice(v.replace(/\D/g, ''))}
              keyboardType="number-pad" placeholder="20000" hint={t('scheduled.priceHint')} />
          </View>
          {pricePerSeat > 0 && (
            <Text variant="caption" color={colors.ink3} style={{ marginTop: space.sm }}>
              {t('scheduled.fullCar', { price: formatMoney(pricePerSeat * seats) })}
            </Text>
          )}
        </Card>

        {/* Car */}
        <Text variant="heading" style={styles.section}>{t('scheduled.yourCar')}</Text>
        <Card>
          <Pressable onPress={carPhotoMenu} style={styles.carPhoto} accessibilityRole="button" accessibilityLabel={t('scheduled.carPhoto')}>
            {carPhoto && token ? (
              <Image source={photoSource(carPhoto, token)} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View style={{ alignItems: 'center', gap: space.sm }}>
                <Icon name="camera" size={28} color={colors.muted} />
                <Text color={colors.muted}>{t('scheduled.addCarPhoto')}</Text>
              </View>
            )}
            {uploading && <View style={styles.photoBusy}><ActivityIndicator color={colors.onDark} /></View>}
          </Pressable>
          <Text variant="caption" color={colors.muted} style={{ marginTop: space.sm }}>{t('scheduled.carPhotoHint')}</Text>
          <View style={{ gap: space.md, marginTop: space.lg }}>
            <Field label={t('car.make')} value={make} onChangeText={setMake} placeholder="Toyota" />
            <Field label={t('car.model')} value={model} onChangeText={setModel} placeholder="Voxy" />
            <Field label={t('scheduled.color')} value={color} onChangeText={setColor} placeholder={t('scheduled.colorHint')} />
            <Field label={t('car.plate')} value={plate} onChangeText={setPlate} autoCapitalize="characters" />
          </View>
        </Card>

        {/* Note */}
        <Text variant="heading" style={styles.section}>{t('scheduled.note')}</Text>
        <Field label={t('scheduled.noteLabel')} value={notes} onChangeText={setNotes} multiline maxLength={500}
          placeholder={t('scheduled.noteHint')} style={{ height: 90, paddingTop: space.md, textAlignVertical: 'top' }} />

        <Button size="xl" label={t('scheduled.post')} icon="check" onPress={submit} loading={busy} disabled={!ready}
          style={{ marginTop: space.xxl }} />
        {!ready && <Text variant="caption" color={colors.muted} align="center" style={{ marginTop: space.sm }}>{t('scheduled.fillIn')}</Text>}

        {token && (
          <PlacePicker
            visible={picking !== null}
            title={picking?.kind === 'origin' ? t('scheduled.from') : picking?.kind === 'destination' ? t('scheduled.to') : t('scheduled.addStop')}
            token={token}
            here={here}
            onPick={onPick}
            onClose={() => setPicking(null)}
          />
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xxl, marginBottom: space.md },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  remove: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  carPhoto: {
    height: 170, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.soft,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line,
  },
  photoBusy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
});
