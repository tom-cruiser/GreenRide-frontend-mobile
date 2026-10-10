import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, colors, formatMoney, Icon, IconButton, type IconName, radius, shadow, space, Text } from '@/design';
import FlowMap from "@/components/flow-map";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";

import { useAuth } from "../../contexts/AuthContext";
import { driversAPI, friendsAPI, ridesAPI, type FriendsGroup } from "../../services/api";

type NearbyDriver = {
  id: number | string;
  latitude: number;
  longitude: number;
  name?: string;
  vehicle?: string;
  eta?: string;
  distance?: string;
};

export default function HomeScreen() {
  const router = useRouter();

  const { user, token, walletBalance, updateWalletBalance } = useAuth();

  const [coords, setCoords] = useState<Location.LocationObjectCoords | null>(
    null,
  );
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([]);
  const [sheetHeight, setSheetHeight] = useState(0);
  // False until the first answer, so "no drivers" isn't shown while loading.
  const [nearbyLoaded, setNearbyLoaded] = useState(false);
  const [activeRideStatus, setActiveRideStatus] = useState<string | null>(null);
  // A friends ride still gathering opens its own screen, not active-ride.
  const [gatheringGroupId, setGatheringGroupId] = useState<number | null>(null);
  const [invitations, setInvitations] = useState<FriendsGroup[]>([]);

  // Show a "current ride" banner whenever the rider has an open ride, and any
  // open invitations to share a ride.
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      ridesAPI
        .getActiveRide(token)
        .then(({ ride }) => {
          setActiveRideStatus(ride?.status ?? null);
          setGatheringGroupId(ride?.status === "gathering" ? ride.share?.groupId ?? null : null);
        })
        .catch(() => setActiveRideStatus(null));
      friendsAPI
        .myInvitations(token)
        .then(({ invitations: open }) => setInvitations(open ?? []))
        .catch(() => setInvitations([]));
    }, [token]),
  );

  const userLat = coords?.latitude ?? -3.375;
  const userLng = coords?.longitude ?? 29.36;

  const greetingName = useMemo(() => {
    const raw = (user as any)?.name ?? (user as any)?.full_name ?? "";
    if (typeof raw !== "string" || raw.trim().length === 0) return "Rider";
    return raw.trim().split(/\s+/)[0];
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      let loc: Location.LocationObject;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Location", "Permission to access location was denied.");
          return;
        }
        loc = await Location.getCurrentPositionAsync({});
      } catch (error) {
        if (!isMounted) return;
        console.warn("Location unavailable:", error);
        Alert.alert(
          "Location unavailable",
          "Enable GPS / location services to see nearby drivers.",
        );
        return;
      }
      if (!isMounted) return;

      setCoords(loc.coords);
    })();

    updateWalletBalance();

    return () => {
      isMounted = false;
    };
  }, [updateWalletBalance, token]);

  // Real drivers online near the rider, refreshed every 30 s so drivers who
  // go online (or move) show up without reopening the screen.
  const lat = coords?.latitude;
  const lng = coords?.longitude;
  useEffect(() => {
    if (!token || lat === undefined || lng === undefined) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await driversAPI.getNearbyDrivers(token, lat, lng);
        if (!cancelled) {
          setNearbyDrivers(response?.drivers ?? []);
          setNearbyLoaded(true);
        }
      } catch (error) {
        console.error("Failed to load nearby drivers:", error);
        if (!cancelled) setNearbyDrivers([]);
      }
    };
    load();
    const timer = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token, lat, lng]);

  const ridingLabel =
    activeRideStatus === "gathering" ? "Waiting for your friends…"
      : activeRideStatus === "pending" ? "Finding your driver…"
        : "Your ride is in progress";

  const quick: [IconName, string, () => void][] = [
    ["users", "Join a ride", () => router.push("/join")],
    ["shield", "Safety", () => router.push("/safety")],
    ["gift", "Promos", () => router.push("/promotions")],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Map: you and the drivers online near you */}
      <FlowMap
        style={StyleSheet.absoluteFill}
        center={{ latitude: userLat, longitude: userLng }}
        // Keep you, the buttons and the map credit above the panel.
        insets={{ top: 120, bottom: sheetHeight }}
        userLocation={Platform.OS === "android" && coords ? { latitude: userLat, longitude: userLng } : undefined}
        pins={[
          // iOS keeps its "You" pin; Android shows the live blue dot.
          ...(Platform.OS === "ios" ? [{ id: "me", latitude: userLat, longitude: userLng, title: "You", color: colors.ink }] : []),
          ...nearbyDrivers.map((driver) => ({
            id: `driver-${driver.id}`,
            latitude: driver.latitude,
            longitude: driver.longitude,
            title: driver.name || `Driver ${driver.id}`,
            description: [driver.vehicle, driver.eta && `${driver.eta} away`].filter(Boolean).join(" · "),
            color: colors.ink3,
          })),
        ]}
      />

      {/* Greeting */}
      <SafeAreaView edges={["top"]} style={styles.top} pointerEvents="box-none">
        <View style={styles.greetCard}>
          <Image source={require("@/assets/images/app-logo.png")} style={styles.logo} />
          <View style={{ flex: 1 }}>
            <Text weight="bold">Hi, {greetingName}</Text>
            <Text variant="caption" color={colors.muted} numberOfLines={1}>
              {!nearbyLoaded
                ? "Ready to ride?"
                : nearbyDrivers.length
                  ? `${nearbyDrivers.length} driver${nearbyDrivers.length > 1 ? "s" : ""} nearby${nearbyDrivers[0].eta ? ` · closest ${nearbyDrivers[0].eta}` : ""}`
                  : "No drivers online near you right now"}
            </Text>
          </View>
          <IconButton icon="user" label="Open profile" onPress={() => router.push("/profile")} />
        </View>
      </SafeAreaView>

      {/* Sheet */}
      <View style={styles.sheet} onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}>
        {invitations.map((inv) => (
          <Card key={inv.invitation?.id ?? inv.groupId} dark onPress={() => router.push(`/invitation/${inv.invitation?.id}`)} style={styles.banner}>
            <Icon name="users" color={colors.onDark} />
            <View style={{ flex: 1 }}>
              <Text weight="semibold" color={colors.onDark}>{inv.host.firstName} invited you to share a ride</Text>
              <Text variant="caption" color={colors.onDarkMuted}>To {inv.dropoff} · {formatMoney(inv.myPrice, inv.currency)} · Tap to answer</Text>
            </View>
            <Icon name="chevron-right" color={colors.onDark} />
          </Card>
        ))}

        {activeRideStatus && (
          <Card dark onPress={() => router.push(gatheringGroupId ? `/friends-ride/${gatheringGroupId}` : "/active-ride")} style={styles.banner}>
            <Icon name="navigation" color={colors.onDark} />
            <View style={{ flex: 1 }}>
              <Text weight="semibold" color={colors.onDark}>{ridingLabel}</Text>
              <Text variant="caption" color={colors.onDarkMuted}>Tap to follow your ride</Text>
            </View>
            <Icon name="chevron-right" color={colors.onDark} />
          </Card>
        )}

        <Pressable onPress={() => router.push("/(tabs)/ride-booking")} accessibilityRole="button" style={({ pressed }) => [styles.whereTo, pressed && { opacity: 0.85 }]}>
          <Icon name="search" size={22} />
          <View style={{ flex: 1 }}>
            <Text variant="heading">Where to?</Text>
            <Text variant="caption" color={colors.muted}>Choose a destination to book</Text>
          </View>
          <Icon name="arrow-right" />
        </Pressable>

        <View style={styles.balanceRow}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.muted}>Balance</Text>
            <Text variant="heading" weight="bold">{walletBalance == null ? "—" : formatMoney(Number(walletBalance))}</Text>
          </View>
          <Button size="md" variant="secondary" label="Top up" icon="plus" onPress={() => router.push("/(tabs)/wallet")} />
        </View>

        <View style={styles.quickRow}>
          {quick.map(([icon, label, onPress]) => (
            <Pressable key={label} onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.quick, pressed && { opacity: 0.8 }]}>
              <Icon name={icon} size={18} />
              <Text variant="caption" weight="semibold">{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: "absolute", left: 0, right: 0, top: 0, paddingHorizontal: space.lg, paddingTop: space.sm },
  greetCard: {
    flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: colors.surface, borderRadius: radius.xl,
    paddingVertical: space.sm, paddingLeft: space.sm, paddingRight: space.sm, ...shadow.card,
  },
  logo: { width: 40, height: 40, borderRadius: 20 },
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, gap: space.md,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: space.xl, ...shadow.float,
  },
  banner: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.lg },
  whereTo: {
    flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: colors.soft, borderRadius: radius.xl,
    paddingHorizontal: space.lg, paddingVertical: space.lg,
  },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  quickRow: { flexDirection: "row", gap: space.sm },
  quick: {
    flex: 1, alignItems: "center", gap: 6, paddingVertical: space.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line,
  },
});
