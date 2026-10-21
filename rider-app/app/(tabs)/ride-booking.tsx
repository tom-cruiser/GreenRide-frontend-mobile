import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert, Modal, Switch, Platform } from 'react-native';
import { Button, Card, colors, formatKm, formatMoney, Header, Icon, radius, Row, Screen, shadow, space, Text } from '@/design';
import FlowMap from "@/components/flow-map";
import { PlaceButton, PlacePicker } from "@/components/place-picker";
import { geocoding, geoErrorMessage, type Place } from "@/services/geo";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { ApiError, ridesAPI, driversAPI, friendsAPI } from "../../services/api";

// The price and the road route, both from the server.
type Estimate = {
  fare: number;
  // Share with friends: the solo fare, paid while the host is still alone.
  soloFare?: number;
  distanceKm: number;
  durationMin: number | null;
  geometry: [number, number][] | null;
};

const points = (from: Place, to: Place) => ({
  pickup_lat: from.lat, pickup_lng: from.lng, dropoff_lat: to.lat, dropoff_lng: to.lng,
});

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
  const [pickup, setPickup] = useState<Place | null>(null);
  const [dropoff, setDropoff] = useState<Place | null>(null);
  const [picking, setPicking] = useState<"pickup" | "dropoff" | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [location, setLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  // The price sheet opens by itself once a newly chosen trip is priced.
  const [priceSheet, setPriceSheet] = useState(false);
  const [estimateFailed, setEstimateFailed] = useState(false);
  const [estimateTry, setEstimateTry] = useState(0);
  const [nearbyDrivers, setNearbyDrivers] = useState<Driver[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [isSharedRide, setIsSharedRide] = useState(false);
  const [maxCoRiders, setMaxCoRiders] = useState(1);
  // Shared rides: matched with nearby riders, or with people the rider invites.
  const [shareMode, setShareMode] = useState<"others" | "friends">("others");
  const withFriends = isSharedRide && shareMode === "friends";
  // Friends rides: invite-only, or public (riders nearby can join).
  const [isPublic, setIsPublic] = useState(false);

  // Opened from "Join a ride" → "Start your own ride": With friends is already
  // chosen. The params are cleared once applied, since this tab stays mounted.
  const params = useLocalSearchParams<{ share?: string; visibility?: string }>();
  useEffect(() => {
    if (params.share !== "friends") return;
    const visibility = params.visibility;
    // Deferred a tick so no state is set during the effect itself.
    Promise.resolve().then(() => {
      setIsSharedRide(true);
      setShareMode("friends");
      setIsPublic(visibility === "public");
      setEstimate(null);
      setPriceSheet(false);
      router.setParams({ share: undefined, visibility: undefined });
    });
  }, [params.share, params.visibility, router]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Location is off",
            "Search for your pickup instead, or allow location in the phone settings.",
          );
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        if (cancelled) return;

        setLocation(loc.coords);
        // Pickup starts at the phone's position, named by its address.
        const here = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        const place = token ? await geocoding.reverse(token, here).catch(() => null) : null;
        if (cancelled) return;
        setPickup((current) => current ?? {
          id: "here", name: place?.name ?? "My location", address: place?.address ?? "Where the phone is now", ...here,
        });
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
  }, [token]);

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
    setPriceSheet(false);
  };

  // Price the trip as soon as both ends are known, and again when the ride type changes.
  useEffect(() => {
    if (!pickup || !dropoff || !token) return;
    let cancelled = false;

    (async () => {
      setEstimate(null);
      setEstimateFailed(false);
      setEstimating(true);
      try {
        // The server measures the road between the two points and prices it.
        const trip = points(pickup, dropoff);
        const result = await ridesAPI.estimate(token, { ...trip, is_shared: isSharedRide });
        // With friends the host pays the solo fare until someone joins.
        const solo = withFriends ? await ridesAPI.estimate(token, { ...trip, is_shared: false }) : null;
        if (cancelled) return;
        setEstimate({
          fare: result.fare,
          soloFare: solo?.fare,
          distanceKm: result.distanceKm,
          durationMin: result.durationMin ?? null,
          geometry: result.geometry ?? null,
        });
      } catch (error) {
        if (cancelled) return;
        setEstimateFailed(true);
        setPriceSheet(false);
        const status = error instanceof ApiError ? error.status : undefined;
        Alert.alert(
          "Could not price this trip",
          status === 422
            ? "No road connects these places. Choose a point on a street."
            : status === 400 && error instanceof Error ? error.message : geoErrorMessage(error),
        );
      } finally {
        if (!cancelled) setEstimating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pickup, dropoff, token, isSharedRide, withFriends, estimateTry]);

  const bookRide = async () => {
    if (!user || !token) {
      Alert.alert("Authentication Required", "Please log in to book a ride.");
      return;
    }
    if (!estimate || !pickup || !dropoff) return;

    if (walletBalance < estimate.fare) {
      Alert.alert(
        "Insufficient Balance",
        `This ride costs ${formatMoney(estimate.fare)}. Please top up your wallet.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Top up", onPress: () => { setPriceSheet(false); router.push("/(tabs)/wallet"); } },
        ],
      );
      return;
    }

    setIsBooking(true);
    try {
      if (withFriends) {
        const { group } = await friendsAPI.create(token, {
          pickup: pickup.name,
          dropoff: dropoff.name,
          ...points(pickup, dropoff),
          visibility: isPublic ? "public" : "friends",
        });
        resetEstimate();
        setDropoff(null);
        // Share the code, invite friends, then request the driver.
        router.replace(`/friends-ride/${group.groupId}`);
        return;
      }
      await ridesAPI.bookRide(token, {
        pickup: pickup.name,
        dropoff: dropoff.name,
        ...points(pickup, dropoff),
        is_shared: isSharedRide,
        max_co_riders: isSharedRide ? maxCoRiders : undefined,
      });
      resetEstimate();
      setDropoff(null);
      // The active-ride screen shows "Finding a driver" and follows the ride.
      router.replace("/active-ride");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // An earlier ride is still open: take the rider to it.
        setPriceSheet(false);
        const { ride } = await ridesAPI.getActiveRide(token).catch(() => ({ ride: null }));
        const groupId = ride?.status === "gathering" ? ride.share?.groupId : null;
        Alert.alert(
          "You already have a ride",
          "Finish or cancel your current ride before booking a new one.",
          [
            { text: "Not now", style: "cancel" },
            { text: "See my ride", onPress: () => router.push(groupId ? `/friends-ride/${groupId}` : "/active-ride") },
          ],
        );
        return;
      }
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
        <FlowMap
          style={StyleSheet.absoluteFill}
          center={{ latitude: userLat, longitude: userLng }}
          controls={false}
          // Price shown: the road route, framed with both ends.
          route={estimate?.geometry}
          fitTo={estimate && pickup && dropoff ? [
            { latitude: pickup.lat, longitude: pickup.lng },
            { latitude: dropoff.lat, longitude: dropoff.lng },
          ] : null}
          userLocation={Platform.OS === "android" && location ? { latitude: userLat, longitude: userLng } : undefined}
          pins={[
            // iOS keeps its "You" pin; Android shows the live blue dot.
          ...(Platform.OS === "ios" ? [{ id: "me", latitude: userLat, longitude: userLng, title: "You", color: colors.ink }] : []),
            ...(estimate && dropoff ? [{ id: "dropoff", latitude: dropoff.lat, longitude: dropoff.lng, title: dropoff.name, color: colors.ink }] : []),
            ...nearbyDrivers.map((driver) => ({
              id: `driver-${driver.id}`,
              latitude: driver.latitude,
              longitude: driver.longitude,
              title: driver.name || `Driver ${driver.id}`,
              color: colors.ink3,
            })),
          ]}
        />
        <View style={styles.driversPill}>
          <Icon name="navigation" size={14} color={colors.onDark} />
          <Text variant="caption" weight="semibold" color={colors.onDark}>
            {nearbyDrivers.length ? `${nearbyDrivers.length} driver${nearbyDrivers.length > 1 ? "s" : ""} nearby` : "No drivers nearby yet"}
          </Text>
        </View>
      </View>

      {/* Where from, where to */}
      <View style={{ gap: space.md, marginTop: space.lg }}>
        <PlaceButton label="Pickup" place={pickup} placeholder="Where are you?" onPress={() => setPicking("pickup")} />
        <PlaceButton label="Drop-off" place={dropoff} placeholder="Where to?" onPress={() => setPicking("dropoff")} />
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

      {/* The price sheet was closed or the trip is still being priced */}
      {pickup && dropoff && (
        <View style={{ marginTop: space.lg }}>
          {estimating ? (
            <Button label="Working out the price…" loading onPress={() => {}} />
          ) : estimate ? (
            <Button label={`Book this ride · ${formatMoney(estimate.fare)}`} icon="arrow-right" onPress={() => setPriceSheet(true)} />
          ) : estimateFailed ? (
            <Button label="Try the price again" icon="search" onPress={() => { setPriceSheet(true); setEstimateTry((n) => n + 1); }} />
          ) : null}
        </View>
      )}

      {token && (
        <PlacePicker
          visible={picking !== null}
          title={picking === "pickup" ? "Pickup" : "Drop-off"}
          token={token}
          here={location ? { lat: location.latitude, lng: location.longitude } : null}
          onPick={(place) => {
            if (picking === "pickup") setPickup(place);
            else setDropoff(place);
            resetEstimate();
            setPriceSheet(true);
          }}
          onClose={() => setPicking(null)}
        />
      )}

      {/* Price of the chosen trip, booked in one tap */}
      <Modal animationType="slide" transparent visible={priceSheet && !!estimate && picking === null} onRequestClose={() => setPriceSheet(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {estimate && (
              <>
                <Text color={colors.muted}>{withFriends ? "Each rider pays" : "Your price"}</Text>
                <Text weight="extrabold" style={{ fontSize: 40, lineHeight: 46, letterSpacing: -1.2 }}>
                  {formatMoney(estimate.fare)}
                </Text>
                {isSharedRide && (
                  <Text color={colors.ink3} style={{ marginTop: space.xs }}>
                    {withFriends
                      ? estimate.soloFare != null
                        ? `Until a friend joins you pay the solo price, ${formatMoney(estimate.soloFare)}. Up to 4 riders. You get a code to share; the driver is requested when you are ready.`
                        : "You get a code to share; the driver is requested when you are ready."
                      : `Shared ride with up to ${maxCoRiders} co-rider${maxCoRiders > 1 ? "s" : ""}.`}
                  </Text>
                )}
                <View style={{ marginTop: space.lg }}>
                  <Row label="From" value={pickup?.name} />
                  <Row label="To" value={dropoff?.name} />
                  <Row label="Distance by road" value={formatKm(estimate.distanceKm)} />
                  {estimate.durationMin != null && <Row label="Trip time" value={`about ${estimate.durationMin} min`} />}
                </View>
                <Text variant="caption" color={colors.muted} style={{ marginTop: space.md }}>
                  The fare is held from your wallet and charged when the trip ends.
                </Text>
              </>
            )}
            <View style={{ gap: space.sm, marginTop: space.xl }}>
              <Button label={withFriends ? "Continue and invite friends" : "Book this ride"} icon="arrow-right" onPress={bookRide} loading={isBooking} />
              <Button label="Change the trip" variant="secondary" onPress={() => setPriceSheet(false)} disabled={isBooking} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrap: { height: 200, borderRadius: radius.xl, overflow: "hidden", backgroundColor: colors.soft2 },
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
