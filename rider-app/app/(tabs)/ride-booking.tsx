import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert, Modal, Switch, Platform } from 'react-native';
import { Button, Card, colors, Field, formatKm, formatMoney, Header, Icon, radius, Row, Screen, shadow, space, Text } from '@/design';
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { useAuth } from "../../contexts/AuthContext";
import { ridesAPI, driversAPI, friendsAPI } from "../../services/api";

type Coords = { latitude: number; longitude: number };

// Longest trip the app will price (the server rejects anything over 500 km).
const MAX_TRIP_KM = 200;

type Estimate = {
  fare: number;
  // Share with friends: the solo fare, paid while the host is still alone.
  soloFare?: number;
  distanceKm: number;
  pickupCoords: Coords;
};

// Straight-line distance in km between two points (haversine formula).
function distanceKm(a: Coords, b: Coords): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// Looks up a typed address with the phone's geocoder (no API key needed).
async function geocode(address: string): Promise<Coords | null> {
  try {
    const [first] = await Location.geocodeAsync(address);
    return first ? { latitude: first.latitude, longitude: first.longitude } : null;
  } catch {
    return null;
  }
}

type Driver = {
  id: number;
  latitude: number;
  longitude: number;
  name?: string;
  rating?: number;
  eta?: string;
};

export default function RideBookingScreen() {
  const router = useRouter();
  const { user, token, walletBalance } = useAuth();
  const hasAndroidMapsKey =
    Platform.OS !== "android" ||
    Boolean(
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
        (Constants.expoConfig as any)?.android?.config?.googleMaps?.apiKey,
    );
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [location, setLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [confirmationModalVisible, setConfirmationModalVisible] =
    useState(false);
  const [bookingStep, setBookingStep] = useState<
    "input" | "confirmation" | "booked"
  >("input");
  const [nearbyDrivers, setNearbyDrivers] = useState<Driver[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [isSharedRide, setIsSharedRide] = useState(false);
  const [maxCoRiders, setMaxCoRiders] = useState(1);
  // Shared rides: matched with nearby riders, or with people the rider invites.
  const [shareMode, setShareMode] = useState<"others" | "friends">("others");
  const withFriends = isSharedRide && shareMode === "friends";
  // Friends rides: invite-only, or public (riders nearby can join).
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Location Permission",
            "Permission to access location was denied",
          );
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        if (cancelled) return;

        setLocation(loc.coords);
      } catch (error) {
        console.error("Location init failed:", error);
        Alert.alert(
          "Location Error",
          "Unable to get your current location. Please enable GPS and try again.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadNearbyDrivers = async (lat: number, lng: number) => {
    try {
      const response = await driversAPI.getNearbyDrivers(token!, lat, lng);
      setNearbyDrivers((response.drivers ?? []) as Driver[]);
    } catch (error) {
      console.error("Failed to load nearby drivers:", error);
      setNearbyDrivers([]);
    }
  };

  useEffect(() => {
    if (!location || !token) return;
    const { latitude, longitude } = location;
    Promise.resolve().then(() => loadNearbyDrivers(latitude, longitude));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, token]);

  const resetEstimate = () => {
    setEstimate(null);
    setBookingStep("input");
  };

  const handleEstimate = async () => {
    if (!pickup.trim() || !dropoff.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter both pickup and dropoff locations.",
      );
      return;
    }
    if (!token) return;

    setEstimating(true);
    try {
      // Pickup falls back to the phone's GPS position if the address isn't found.
      const pickupCoords =
        (await geocode(pickup)) ??
        (location ? { latitude: location.latitude, longitude: location.longitude } : null);
      const dropoffCoords = await geocode(dropoff);
      if (!pickupCoords || !dropoffCoords) {
        Alert.alert(
          "Address not found",
          `We couldn't find ${!pickupCoords ? "the pickup" : "the dropoff"} address. Try adding the street or neighbourhood and city.`,
        );
        return;
      }

      const km = Math.max(0.1, Math.round(distanceKm(pickupCoords, dropoffCoords) * 100) / 100);
      if (__DEV__) console.log("[booking] geocoded", { pickupCoords, dropoffCoords, km });
      // A geocoder can match a name in another town or country; catch that
      // here instead of sending an impossible trip to the server.
      if (km > MAX_TRIP_KM) {
        Alert.alert(
          "Check the addresses",
          `These places are ${Math.round(km)} km apart. Add the neighbourhood and city to both addresses.`,
        );
        return;
      }
      const result = await ridesAPI.estimate(token, { distance: km, is_shared: isSharedRide });
      // With friends the host pays the solo fare until someone joins.
      const solo = withFriends ? await ridesAPI.estimate(token, { distance: km, is_shared: false }) : null;
      setEstimate({ fare: result.fare, soloFare: solo?.fare, distanceKm: km, pickupCoords });
      setBookingStep("confirmation");
    } catch (error) {
      Alert.alert(
        "Estimate failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setEstimating(false);
    }
  };

  const handleBookRide = () => {
    if (!user || !token) {
      Alert.alert("Authentication Required", "Please log in to book a ride.");
      return;
    }
    if (!estimate) return;

    if (walletBalance < estimate.fare) {
      Alert.alert(
        "Insufficient Balance",
        `This ride costs ${formatMoney(estimate.fare)}. Please top up your wallet.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Top up", onPress: () => router.push("/(tabs)/wallet") },
        ],
      );
      return;
    }

    setConfirmationModalVisible(true);
  };

  const confirmBooking = async () => {
    if (!token || !user || !estimate) return;

    setIsBooking(true);
    try {
      if (withFriends) {
        const { group } = await friendsAPI.create(token, {
          pickup: pickup.trim(),
          dropoff: dropoff.trim(),
          distance: estimate.distanceKm,
          pickup_lat: estimate.pickupCoords.latitude,
          pickup_lng: estimate.pickupCoords.longitude,
          visibility: isPublic ? "public" : "friends",
        });
        setConfirmationModalVisible(false);
        resetEstimate();
        setPickup("");
        setDropoff("");
        // Share the code, invite friends, then request the driver.
        router.replace(`/friends-ride/${group.groupId}`);
        return;
      }
      await ridesAPI.bookRide(token, {
        pickup: pickup.trim(),
        dropoff: dropoff.trim(),
        distance: estimate.distanceKm,
        is_shared: isSharedRide,
        max_co_riders: isSharedRide ? maxCoRiders : undefined,
        pickup_lat: estimate.pickupCoords.latitude,
        pickup_lng: estimate.pickupCoords.longitude,
      });
      setConfirmationModalVisible(false);
      resetEstimate();
      setPickup("");
      setDropoff("");
      // The active-ride screen shows "Finding a driver" and follows the ride.
      router.replace("/active-ride");
    } catch (error) {
      console.error("Booking failed:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to book the ride. Please try again.";
      Alert.alert("Booking Failed", message);
    } finally {
      setIsBooking(false);
    }
  };

  const userLat = location ? location.latitude : -3.375;
  const userLng = location ? location.longitude : 29.36;

  return (
    <Screen>
      <Header title="Book a ride" onBack={() => router.replace("/(tabs)")} backLabel="Home" />

      {/* Map with you and the drivers near you */}
      <View style={styles.mapWrap}>
        {hasAndroidMapsKey ? (
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={{ latitude: userLat, longitude: userLng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
            region={location ? { latitude: userLat, longitude: userLng, latitudeDelta: 0.01, longitudeDelta: 0.01 } : undefined}
          >
            <Marker coordinate={{ latitude: userLat, longitude: userLng }} title="You" pinColor={colors.ink} />
            {nearbyDrivers.map((driver) => (
              <Marker
                key={driver.id}
                coordinate={{ latitude: driver.latitude, longitude: driver.longitude }}
                title={driver.name || `Driver ${driver.id}`}
                pinColor={colors.ink3}
              />
            ))}
          </MapView>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.mapOff]}>
            <Icon name="map" size={28} color={colors.muted} />
            <Text variant="caption" color={colors.muted} style={{ marginTop: space.sm }}>Map not available in this build</Text>
          </View>
        )}
        <View style={styles.driversPill}>
          <Icon name="navigation" size={14} color={colors.onDark} />
          <Text variant="caption" weight="semibold" color={colors.onDark}>
            {nearbyDrivers.length ? `${nearbyDrivers.length} driver${nearbyDrivers.length > 1 ? "s" : ""} nearby` : "No drivers nearby yet"}
          </Text>
        </View>
      </View>

      {/* Where from, where to */}
      <View style={{ gap: space.md, marginTop: space.lg }}>
        <Field label="Pickup" placeholder="e.g. Rohero, near the market" value={pickup}
          onChangeText={(v) => { setPickup(v); resetEstimate(); }} />
        <Field label="Drop-off" placeholder="e.g. Kiriri" value={dropoff}
          onChangeText={(v) => { setDropoff(v); resetEstimate(); }} />
      </View>

      {/* Shared ride */}
      <Card style={{ marginTop: space.lg }}>
        <View style={styles.sharedRow}>
          <View style={{ flex: 1 }}>
            <Text weight="semibold">Shared ride</Text>
            <Text variant="caption" color={colors.muted}>Pay less by riding with friends or nearby riders</Text>
          </View>
          <Switch
            value={isSharedRide}
            onValueChange={(v) => { setIsSharedRide(v); resetEstimate(); }}
            trackColor={{ false: colors.soft2, true: colors.ink3 }}
            thumbColor={isSharedRide ? colors.ink : "#FFFFFF"}
          />
        </View>

        {isSharedRide && (
          <View style={styles.modeRow}>
            {([
              ["friends", "With friends", "Invite people you know", "users"],
              ["others", "With others", "Match with nearby riders", "shuffle"],
            ] as const).map(([mode, label, hint, icon]) => {
              const on = shareMode === mode;
              return (
                <Pressable
                  key={mode}
                  style={[styles.modeOption, on && styles.modeOptionOn]}
                  onPress={() => { setShareMode(mode); resetEstimate(); }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <Icon name={icon} size={18} color={on ? colors.onDark : colors.ink} />
                  <Text weight="semibold" color={on ? colors.onDark : colors.ink} style={{ marginTop: space.sm }}>{label}</Text>
                  <Text variant="caption" color={on ? colors.onDarkMuted : colors.muted}>{hint}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {withFriends && (
          <View style={[styles.modeRow, { marginTop: space.md }]}>
            {([
              [false, "Friends only", "Invite by code or tap", "lock"],
              [true, "Public", "Riders nearby can join", "globe"],
            ] as const).map(([pub, label, hint, icon]) => {
              const on = isPublic === pub;
              return (
                <Pressable key={label} style={[styles.modeOption, on && styles.modeOptionOn]}
                  onPress={() => setIsPublic(pub)} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                  <Icon name={icon} size={18} color={on ? colors.onDark : colors.ink} />
                  <Text weight="semibold" color={on ? colors.onDark : colors.ink} style={{ marginTop: space.sm }}>{label}</Text>
                  <Text variant="caption" color={on ? colors.onDarkMuted : colors.muted}>{hint}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {withFriends && (
          <Pressable onPress={() => router.push("/join")} accessibilityRole="button" style={styles.joinLink}>
            <Icon name="users" size={18} />
            <View style={{ flex: 1 }}>
              <Text weight="semibold">{"Joining a friend's ride?"}</Text>
              <Text variant="caption" color={colors.muted}>Use their code or tap their public ride</Text>
            </View>
            <Icon name="chevron-right" color={colors.muted} />
          </Pressable>
        )}

        {isSharedRide && shareMode === "others" && (
          <View style={styles.stepper}>
            <Text color={colors.ink3} style={{ flex: 1 }}>You + up to {maxCoRiders} co-rider{maxCoRiders > 1 ? "s" : ""}</Text>
            <Pressable style={[styles.stepBtn, maxCoRiders <= 1 && { opacity: 0.4 }]} disabled={maxCoRiders <= 1}
              onPress={() => setMaxCoRiders((v) => Math.max(1, v - 1))} accessibilityLabel="Fewer co-riders">
              <Icon name="minus" size={18} />
            </Pressable>
            <Text variant="heading" style={{ minWidth: 24, textAlign: "center" }}>{maxCoRiders}</Text>
            <Pressable style={[styles.stepBtn, maxCoRiders >= 3 && { opacity: 0.4 }]} disabled={maxCoRiders >= 3}
              onPress={() => setMaxCoRiders((v) => Math.min(3, v + 1))} accessibilityLabel="More co-riders">
              <Icon name="plus" size={18} />
            </Pressable>
          </View>
        )}
      </Card>

      {!(estimate && bookingStep === "confirmation") && (
        <Button label="See the price" icon="search" onPress={handleEstimate} loading={estimating} style={{ marginTop: space.lg }} />
      )}

      {/* Price and trip, then book */}
      {estimate && bookingStep === "confirmation" && (
        <View style={{ marginTop: space.lg, gap: space.md }}>
          <Card dark>
            <Text color={colors.onDarkMuted}>{withFriends ? "Each rider pays" : "Your price"}</Text>
            <Text color={colors.onDark} weight="extrabold" style={{ fontSize: 40, lineHeight: 46, letterSpacing: -1.2 }}>
              {formatMoney(estimate.fare)}
            </Text>
            {withFriends && estimate.soloFare != null && (
              <Text color={colors.onDarkMuted} style={{ marginTop: space.xs }}>
                Until a friend joins you pay the solo price, {formatMoney(estimate.soloFare)}. Up to 4 riders.
              </Text>
            )}
          </Card>
          <Card>
            <Row label="From" value={pickup} />
            <Row label="To" value={dropoff} />
            <Row label="Distance" value={`~${formatKm(estimate.distanceKm)}`} />
          </Card>
          <Button label={withFriends ? "Continue and invite friends" : "Book this ride"} icon="arrow-right" onPress={handleBookRide} />
          <Button label="Change the trip" variant="ghost" onPress={resetEstimate} />
        </View>
      )}

      {/* Confirmation */}
      <Modal animationType="slide" transparent visible={confirmationModalVisible} onRequestClose={() => setConfirmationModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text variant="title">Confirm your ride</Text>
            {estimate && (
              <View style={{ marginTop: space.md, gap: space.sm }}>
                <Text variant="heading">
                  {withFriends && estimate.soloFare != null ? `Now: ${formatMoney(estimate.soloFare)}` : formatMoney(estimate.fare)}
                </Text>
                <Text color={colors.ink3}>{pickup} → {dropoff}</Text>
                {isSharedRide && (
                  <Text color={colors.ink3}>
                    {withFriends
                      ? `Drops to ${formatMoney(estimate.fare)} each when friends join. You get a code to share; the driver is requested when you are ready.`
                      : `Shared ride with up to ${maxCoRiders} co-rider(s).`}
                  </Text>
                )}
                <Text variant="caption" color={colors.muted}>The fare is held from your wallet and charged when the trip ends.</Text>
              </View>
            )}
            <View style={{ gap: space.sm, marginTop: space.xl }}>
              <Button label="Confirm" onPress={confirmBooking} loading={isBooking} />
              <Button label="Cancel" variant="secondary" onPress={() => setConfirmationModalVisible(false)} disabled={isBooking} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrap: { height: 200, borderRadius: radius.xl, overflow: "hidden", backgroundColor: colors.soft2 },
  mapOff: { alignItems: "center", justifyContent: "center" },
  driversPill: {
    position: "absolute", left: space.md, bottom: space.md, flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.ink, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 6,
  },
  sharedRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  modeRow: { flexDirection: "row", gap: space.sm, marginTop: space.lg },
  modeOption: { flex: 1, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.lg, padding: space.md, backgroundColor: colors.surface },
  modeOptionOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  joinLink: {
    flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.md, padding: space.md,
    borderRadius: radius.lg, backgroundColor: colors.soft,
  },
  stepper: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.lg },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: space.xxl, ...shadow.float },
});
