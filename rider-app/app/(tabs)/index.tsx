import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import Constants from "expo-constants";

import AppLogo from "../../components/app-logo";
import { useAuth } from "../../contexts/AuthContext";
import { driversAPI } from "../../services/api";
import { Colors, Radius, Spacing } from "../../constants/theme";
import { useColorScheme } from "../../hooks/use-color-scheme";

type NearbyDriver = {
  id: number | string;
  latitude: number;
  longitude: number;
  name?: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const { user, token, walletBalance, updateWalletBalance } = useAuth();

  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [fare, setFare] = useState<string | null>(null);
  const [surge, setSurge] = useState(true);
  const [coords, setCoords] = useState<Location.LocationObjectCoords | null>(
    null,
  );
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([]);
  const hasAndroidMapsKey =
    Platform.OS !== "android" ||
    Boolean(
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
        (Constants.expoConfig as any)?.android?.config?.googleMaps?.apiKey,
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

      if (loc.coords) {
        try {
          // Only fetch nearby drivers if token is available
          if (token) {
            const response = await driversAPI.getNearbyDrivers(
              token,
              loc.coords.latitude,
              loc.coords.longitude,
            );
            if (!isMounted) return;

            if (response?.drivers?.length) {
              setNearbyDrivers(response.drivers);
            } else {
              setNearbyDrivers([]);
            }
          } else {
            // Use mock drivers if not authenticated yet
            setNearbyDrivers([
              {
                id: 1,
                latitude: loc.coords.latitude + 0.001,
                longitude: loc.coords.longitude + 0.001,
                name: "Jean Pierre",
              },
              {
                id: 2,
                latitude: loc.coords.latitude - 0.001,
                longitude: loc.coords.longitude + 0.002,
                name: "Marie Claire",
              },
            ]);
          }
        } catch (error) {
          console.error("Failed to load nearby drivers:", error);
          setNearbyDrivers([
            {
              id: 1,
              latitude: loc.coords.latitude + 0.001,
              longitude: loc.coords.longitude + 0.001,
              name: "Jean Pierre",
            },
            {
              id: 2,
              latitude: loc.coords.latitude - 0.001,
              longitude: loc.coords.longitude + 0.002,
              name: "Marie Claire",
            },
          ]);
        }
      }
    })();

    updateWalletBalance();

    return () => {
      isMounted = false;
    };
  }, [updateWalletBalance, token]);

  const handleEstimate = () => {
    if (!pickup || !dropoff) {
      Alert.alert(
        "Missing Information",
        "Please enter both pickup and dropoff locations.",
      );
      return;
    }

    const estimatedDistanceKm = 1.0;
    const baseRatePerKm = 7000;
    const estimatedFare = Math.max(baseRatePerKm * estimatedDistanceKm, 3500);

    setFare(`${estimatedFare.toLocaleString()} FBU`);
  };

  const topPadding = Platform.select({ android: 48, default: 64 });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {hasAndroidMapsKey ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: userLat,
            longitude: userLng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          region={
            coords
              ? {
                  latitude: userLat,
                  longitude: userLng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }
              : undefined
          }
        >
          <Marker
            coordinate={{ latitude: userLat, longitude: userLng }}
            title="You"
            pinColor={theme.tint}
          />
          {nearbyDrivers.map((driver) => (
            <Marker
              key={String(driver.id)}
              coordinate={{
                latitude: driver.latitude,
                longitude: driver.longitude,
              }}
              title={driver.name || `Driver ${driver.id}`}
              pinColor="#1976d2"
            />
          ))}
        </MapView>
      ) : (
        <View style={[styles.map, styles.mapFallback]}>
          <Text style={styles.mapFallbackTitle}>Map disabled in this build</Text>
          <Text style={styles.mapFallbackText}>
            Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to enable the live map.
          </Text>
        </View>
      )}

      <View style={[styles.topBar, { paddingTop: topPadding }]}>
        <View style={styles.brandRow}>
          <BlurView
            intensity={22}
            tint={colorScheme === "dark" ? "dark" : "light"}
            style={[styles.logoPill, { borderColor: theme.border }]}
          >
            <AppLogo size={28} compact containerStyle={styles.logoInner} />
          </BlurView>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: theme.text }]}>
              Hi, {greetingName}
            </Text>
            <Text style={[styles.subGreeting, { color: theme.muted }]}>
              Ready to ride?
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.circleBtn,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
            onPress={() => router.push("/profile")}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Text style={[styles.circleBtnText, { color: theme.text }]}>
              👤
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View
          style={[
            styles.walletCard,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.walletLabel, { color: theme.muted }]}>
              Balance
            </Text>
            <Text style={[styles.walletAmount, { color: theme.tint }]}>
              {walletBalance == null
                ? "—"
                : `${Number(walletBalance).toLocaleString()} FBU`}
            </Text>
          </View>

          <View style={styles.walletActions}>
            <TouchableOpacity
              style={[
                styles.secondaryPillBtn,
                { borderColor: theme.border, backgroundColor: theme.surface },
              ]}
              onPress={() => router.push("/(tabs)/wallet")}
              accessibilityRole="button"
            >
              <Text
                style={[styles.secondaryPillBtnText, { color: theme.text }]}
              >
                Wallet
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.text }]}
              onPress={() => router.push("/(tabs)/ride-history")}
              accessibilityRole="button"
            >
              <Text
                style={[styles.primaryBtnText, { color: theme.background }]}
              >
                Trips
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.searchCta,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
          onPress={() => router.push("/(tabs)/ride-booking")}
          accessibilityRole="button"
        >
          <Text style={[styles.searchCtaText, { color: theme.text }]}>
            Where to?
          </Text>
          <Text style={[styles.searchCtaHint, { color: theme.muted }]}>
            Choose a destination to book
          </Text>
        </TouchableOpacity>

        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[
              styles.pill,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
            onPress={() => router.push("/support")}
            accessibilityRole="button"
          >
            <Text style={[styles.pillText, { color: theme.text }]}>Safety</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pill,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
            onPress={() => router.push("/promotions")}
            accessibilityRole="button"
          >
            <Text style={[styles.pillText, { color: theme.text }]}>Promos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pill,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
            onPress={() => setSurge((s) => !s)}
            accessibilityRole="button"
          >
            <Text style={[styles.pillText, { color: theme.text }]}>
              {surge ? "Surge On" : "Surge Off"}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.banner,
            {
              backgroundColor: surge ? "#E8F5E9" : theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.bannerText, { color: theme.text }]}>
            {surge ? "Surge pricing active" : "Standard pricing"}
          </Text>
          <Text style={[styles.bannerSubText, { color: theme.muted }]}>
            {surge
              ? "Fares may be higher during peak demand."
              : "Enjoy stable fares right now."}
          </Text>
        </View>

        <View
          style={[
            styles.fareBox,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Quick fare estimate
          </Text>

          <TextInput
            value={pickup}
            onChangeText={setPickup}
            placeholder="Pickup (e.g., Downtown)"
            placeholderTextColor={theme.muted}
            style={[
              styles.input,
              {
                borderColor: theme.border,
                backgroundColor: theme.surface,
                color: theme.text,
              },
            ]}
          />

          <TextInput
            value={dropoff}
            onChangeText={setDropoff}
            placeholder="Drop-off (e.g., Airport)"
            placeholderTextColor={theme.muted}
            style={[
              styles.input,
              {
                borderColor: theme.border,
                backgroundColor: theme.surface,
                color: theme.text,
              },
            ]}
          />

          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              { borderColor: theme.border, backgroundColor: theme.surface },
            ]}
            onPress={handleEstimate}
            accessibilityRole="button"
          >
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>
              Estimate
            </Text>
          </TouchableOpacity>

          {fare ? (
            <Text style={[styles.fareResult, { color: theme.text }]}>
              Estimated fare: {fare}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef3f8",
    paddingHorizontal: 24,
  },
  mapFallbackTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  mapFallbackText: {
    fontSize: 14,
    color: "#4b5563",
    textAlign: "center",
  },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: Spacing.lg,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoPill: {
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
  },
  logoInner: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  greeting: {
    fontSize: 16,
    fontWeight: "900",
  },
  subGreeting: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  circleBtnText: {
    fontSize: 16,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 72,
    padding: Spacing.lg,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 12,
  },
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
  walletLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  walletAmount: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: "900",
  },
  walletActions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  primaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  primaryBtnText: {
    fontWeight: "900",
    fontSize: 13,
  },
  secondaryPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  secondaryPillBtnText: {
    fontWeight: "900",
    fontSize: 13,
  },
  searchCta: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  searchCtaText: {
    fontSize: 18,
    fontWeight: "900",
  },
  searchCtaHint: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  quickRow: {
    marginTop: Spacing.md,
    flexDirection: "row",
    gap: 10,
  },
  pill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  pillText: {
    fontWeight: "900",
    fontSize: 13,
  },
  banner: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
  bannerText: {
    fontWeight: "900",
    fontSize: 14,
  },
  bannerSubText: {
    marginTop: 2,
    fontWeight: "600",
    fontSize: 12,
  },
  fareBox: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontWeight: "900",
    fontSize: 13,
  },
  fareResult: {
    marginTop: 10,
    fontWeight: "700",
  },
});
