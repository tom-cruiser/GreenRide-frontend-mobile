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
import { useT } from "@/i18n";

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
  const { t } = useT();
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
          Alert.alert(t("book.locationOff"), t("book.locationOffText"));
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
          id: "here", name: place?.name ?? t("book.myLocation"), address: place?.address ?? t("book.phoneHere"), ...here,
        });
      } catch (error) {
        console.error("Location init failed:", error);
        Alert.alert(t("book.locationError"), t("book.locationErrorText"));
      }
    })();

    return () => {
      cancelled = true;
    };
    // The strings are read once, when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          t("book.priceFailed"),
          status === 422
            ? t("book.noRoad")
            : status === 400 && error instanceof Error ? error.message : geoErrorMessage(error),
        );
      } finally {
        if (!cancelled) setEstimating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, dropoff, token, isSharedRide, withFriends, estimateTry]);

  const bookRide = async () => {
    if (!user || !token) {
      Alert.alert(t("book.authRequired"), t("book.authRequiredText"));
      return;
    }
    if (!estimate || !pickup || !dropoff) return;

    if (walletBalance < estimate.fare) {
      Alert.alert(
        t("book.lowBalance"),
        t("book.lowBalanceText", { price: formatMoney(estimate.fare) }),
        [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("home.topUp"), onPress: () => { setPriceSheet(false); router.push("/(tabs)/wallet"); } },
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
        // Friends only: share the code and invite. Public: listed for riders
        // nearby. Either way the host requests the driver when ready.
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
          t("book.alreadyRide"),
          t("book.alreadyRideText"),
          [
            { text: t("book.notNow"), style: "cancel" },
            { text: t("book.seeRide"), onPress: () => router.push(groupId ? `/friends-ride/${groupId}` : "/active-ride") },
          ],
        );
        return;
      }
      console.error("Booking failed:", error);
      const message =
        error instanceof Error
          ? error.message
          : t("book.bookFailedText");
      Alert.alert(t("book.bookFailed"), message);
    } finally {
      setIsBooking(false);
    }
  };

  const userLat = location ? location.latitude : -3.375;
  const userLng = location ? location.longitude : 29.36;

  return (
    <Screen>
      <Header title={t("book.title")} onBack={() => router.replace("/(tabs)")} backLabel={t("tabs.home")} />

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
          ...(Platform.OS === "ios" ? [{ id: "me", latitude: userLat, longitude: userLng, title: t("home.you"), color: colors.ink }] : []),
            ...(estimate && dropoff ? [{ id: "dropoff", latitude: dropoff.lat, longitude: dropoff.lng, title: dropoff.name, color: colors.ink }] : []),
            ...nearbyDrivers.map((driver) => ({
              id: `driver-${driver.id}`,
              latitude: driver.latitude,
              longitude: driver.longitude,
              title: driver.name || t("home.driver", { id: driver.id }),
              color: colors.ink3,
            })),
          ]}
        />
        <View style={styles.driversPill}>
          <Icon name="navigation" size={14} color={colors.onDark} />
          <Text variant="caption" weight="semibold" color={colors.onDark}>
            {nearbyDrivers.length ? t(nearbyDrivers.length > 1 ? "home.driversNearby" : "home.driverNearby", { count: nearbyDrivers.length }) : t("book.noDrivers")}
          </Text>
        </View>
      </View>

      {/* Where from, where to */}
      <View style={{ gap: space.md, marginTop: space.lg }}>
        <PlaceButton start label={t("book.pickup")} place={pickup} placeholder={t("book.whereAreYou")} onPress={() => setPicking("pickup")} />
        <PlaceButton label={t("book.dropoff")} place={dropoff} placeholder={t("home.whereTo")} onPress={() => setPicking("dropoff")} />
      </View>

      {/* Shared ride */}
      <Card style={{ marginTop: space.lg }}>
        <View style={styles.sharedRow}>
          <View style={{ flex: 1 }}>
            <Text weight="semibold">{t("book.shared")}</Text>
            <Text variant="caption" color={colors.muted}>{t("book.sharedText")}</Text>
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
              ["friends", t("book.withFriends"), t("book.withFriendsText"), "users"],
              ["others", t("book.withOthers"), t("book.withOthersText"), "shuffle"],
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
              [false, t("book.friendsOnly"), t("book.friendsOnlyText"), "lock"],
              [true, t("book.public"), t("book.publicText"), "globe"],
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
              <Text weight="semibold">{t("book.joining")}</Text>
              <Text variant="caption" color={colors.muted}>{t("book.joiningText")}</Text>
            </View>
            <Icon name="chevron-right" color={colors.muted} />
          </Pressable>
        )}

        {isSharedRide && shareMode === "others" && (
          <View style={styles.stepper}>
            <Text color={colors.ink3} style={{ flex: 1 }}>{t(maxCoRiders > 1 ? "book.coRiders" : "book.coRider", { count: maxCoRiders })}</Text>
            <Pressable style={[styles.stepBtn, maxCoRiders <= 1 && { opacity: 0.4 }]} disabled={maxCoRiders <= 1}
              onPress={() => setMaxCoRiders((v) => Math.max(1, v - 1))} accessibilityLabel={t("book.fewer")}>
              <Icon name="minus" size={18} />
            </Pressable>
            <Text variant="heading" style={{ minWidth: 24, textAlign: "center" }}>{maxCoRiders}</Text>
            <Pressable style={[styles.stepBtn, maxCoRiders >= 3 && { opacity: 0.4 }]} disabled={maxCoRiders >= 3}
              onPress={() => setMaxCoRiders((v) => Math.min(3, v + 1))} accessibilityLabel={t("book.more")}>
              <Icon name="plus" size={18} />
            </Pressable>
          </View>
        )}
      </Card>

      {/* The price sheet was closed or the trip is still being priced */}
      {pickup && dropoff && (
        <View style={{ marginTop: space.lg }}>
          {estimating ? (
            <Button label={t("book.pricing")} loading onPress={() => {}} />
          ) : estimate ? (
            <Button label={t("book.bookFor", { price: formatMoney(estimate.fare) })} icon="arrow-right" onPress={() => setPriceSheet(true)} />
          ) : estimateFailed ? (
            <Button label={t("book.priceAgain")} icon="search" onPress={() => { setPriceSheet(true); setEstimateTry((n) => n + 1); }} />
          ) : null}
        </View>
      )}

      {token && (
        <PlacePicker
          visible={picking !== null}
          title={picking === "pickup" ? t("book.pickup") : t("book.dropoff")}
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
                <Text color={colors.muted}>{withFriends ? (isPublic ? t("book.publicEach") : t("book.each")) : t("book.yourPrice")}</Text>
                <Text weight="extrabold" style={{ fontSize: 40, lineHeight: 46, letterSpacing: -1.2 }}>
                  {formatMoney(estimate.fare)}
                </Text>
                {isSharedRide && (
                  <Text color={colors.ink3} style={{ marginTop: space.xs }}>
                    {withFriends
                      ? isPublic
                        ? [
                          t("book.publicListed"),
                          estimate.soloFare != null ? t("book.soloUntilSomeone", { price: formatMoney(estimate.soloFare) }) : "",
                          t("book.publicUpTo"),
                        ].filter(Boolean).join(" ")
                        : estimate.soloFare != null
                          ? `${t("book.soloUntilFriend", { price: formatMoney(estimate.soloFare) })} ${t("book.friendsUpTo")}`
                          : t("book.codeToShare")
                      : t(maxCoRiders > 1 ? "book.sharedWithMany" : "book.sharedWithOne", { count: maxCoRiders })}
                  </Text>
                )}
                <View style={{ marginTop: space.lg }}>
                  <Row label={t("book.from")} value={pickup?.name} />
                  <Row label={t("book.to")} value={dropoff?.name} />
                  <Row label={t("book.distance")} value={formatKm(estimate.distanceKm)} />
                  {estimate.durationMin != null && <Row label={t("book.tripTime")} value={t("book.aboutMin", { min: estimate.durationMin })} />}
                </View>
                <Text variant="caption" color={colors.muted} style={{ marginTop: space.md }}>
                  {t("book.held")}
                </Text>
              </>
            )}
            <View style={{ gap: space.sm, marginTop: space.xl }}>
              <Button label={withFriends ? (isPublic ? t("book.postPublic") : t("book.inviteFriends")) : t("book.book")} icon={withFriends && isPublic ? "globe" : "arrow-right"} onPress={bookRide} loading={isBooking} />
              <Button label={t("book.change")} variant="secondary" onPress={() => setPriceSheet(false)} disabled={isBooking} />
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
