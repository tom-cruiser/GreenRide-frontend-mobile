import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { ridesAPI } from "../../services/api";

const { width, height } = Dimensions.get("window");

type RideRequest = {
  id: number | string;
  pickup?: string;
  dropoff?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  rider?: string;
  fare?: string | number;
  share_mode?: "friends" | "others" | null;
  riders_count?: number;
  group_fare?: number;
};

export default function DriverMapScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState({
    latitude: -3.375,
    longitude: 29.36,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const maps = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const rnMaps = require("react-native-maps");
      return { MapView: rnMaps.default, Marker: rnMaps.Marker };
    } catch {
      return null;
    }
  }, []);

  const loadRequests = useCallback(async () => {
    if (!token) {
      setError("Please sign in to view ride requests");
      setLoading(false);
      return;
    }
    try {
      const data = await ridesAPI.getRideRequests(token);
      setRequests((data?.requests as RideRequest[]) || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ride requests");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({});
          if (cancelled) return;
          setRegion({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
      } catch {
        // Non-fatal; we still try to load requests below.
      }
      if (!cancelled) loadRequests();
    })();

    return () => {
      cancelled = true;
    };
  }, [loadRequests]);

  const handleAccept = async (rideId: number | string) => {
    if (!token) return;
    try {
      await ridesAPI.acceptRide(token, rideId);
      router.push("/active-ride");
    } catch (e) {
      Alert.alert(
        "Could not accept",
        e instanceof Error ? e.message : "Please try again.",
      );
    }
  };

  const markers = requests.filter(
    (r) => typeof r.pickup_lat === "number" && typeof r.pickup_lng === "number",
  );

  return (
    <View style={styles.container}>
      {!maps ? (
        <View style={styles.fallback}>
          <Text style={styles.fallbackTitle}>Map unavailable</Text>
          <Text style={styles.fallbackText}>
            This screen uses native maps. If you are using Expo Go, you may need
            a development build for maps support.
          </Text>
        </View>
      ) : (
        <maps.MapView style={styles.map} region={region} showsUserLocation>
          {markers.map((req) => (
            <maps.Marker
              key={req.id}
              coordinate={{
                latitude: req.pickup_lat as number,
                longitude: req.pickup_lng as number,
              }}
              title={req.rider ? `Rider: ${req.rider}` : `Request ${req.id}`}
              description={
                req.share_mode === "friends" && (req.riders_count ?? 1) > 1
                  ? `${req.pickup} · group of ${req.riders_count} · ${Number(req.group_fare).toLocaleString()} FBU`
                  : req.pickup
              }
            >
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => handleAccept(req.id)}
              >
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
            </maps.Marker>
          ))}
        </maps.MapView>
      )}
      {loading && (
        <ActivityIndicator
          size="large"
          color="#1976d2"
          style={styles.loading}
        />
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.sharedRideBadge}>
        <Text style={styles.sharedRideText}>
          {markers.length} request(s) nearby
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width, height },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  fallbackTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  fallbackText: { textAlign: "center", color: "#444" },
  acceptBtn: {
    backgroundColor: "#43a047",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    marginTop: 4,
  },
  acceptText: { color: "#fff", fontWeight: "700" },
  loading: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -20,
    marginTop: -20,
  },
  error: {
    position: "absolute",
    bottom: 60,
    alignSelf: "center",
    color: "#b91c1c",
    backgroundColor: "#fee2e2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sharedRideBadge: {
    position: "absolute",
    bottom: 20,
    left: 16,
    backgroundColor: "#1e3a8a",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sharedRideText: { color: "#fff", fontWeight: "600", fontSize: 12 },
});
