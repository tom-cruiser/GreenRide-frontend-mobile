import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { ridesAPI } from "../services/api";

type RideRequest = {
  id: number | string;
  rider?: string;
  pickup?: string;
  dropoff?: string;
  fare?: number | string;
  distance?: number;
  // A "share with friends" group arrives as one request.
  share_mode?: "friends" | "others" | null;
  riders_count?: number;
  group_fare?: number;
};

const isGroup = (req: RideRequest) => req.share_mode === "friends" && (req.riders_count ?? 1) > 1;

const formatFare = (fare: RideRequest["fare"]) => {
  if (typeof fare === "number") return `${fare.toLocaleString()} FBU`;
  if (typeof fare === "string" && fare.length > 0) return fare;
  return "—";
};

export default function RideRequestsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<RideRequest["id"] | null>(null);

  const load = useCallback(async () => {
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
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    // Deferred a tick so no state is set during the effect itself.
    Promise.resolve().then(load);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const accept = async (id: RideRequest["id"]) => {
    if (!token) return;
    setPendingId(id);
    try {
      await ridesAPI.acceptRide(token, id);
      router.push("/active-ride");
    } catch (e) {
      Alert.alert(
        "Could not accept",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setPendingId(null);
    }
  };

  const decline = async (id: RideRequest["id"]) => {
    if (!token) return;
    setPendingId(id);
    try {
      await ridesAPI.declineRide(token, id);
      load();
    } catch (e) {
      Alert.alert(
        "Could not decline",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setPendingId(null);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Incoming Ride Requests</Text>

      {loading && <ActivityIndicator size="large" color="#111111" />}
      {error && <Text style={styles.errorText}>{error}</Text>}
      {!loading && !error && requests.length === 0 && (
        <Text style={styles.emptyText}>No requests right now. Stay online.</Text>
      )}

      {requests.map((req) => (
        <View key={req.id} style={styles.card}>
          <Text style={styles.rider}>
            {req.rider || `Rider #${req.id}`}
            {isGroup(req) ? ` + ${(req.riders_count ?? 1) - 1} friend${(req.riders_count ?? 1) > 2 ? "s" : ""}` : ""}
          </Text>
          {req.share_mode === "friends" && (
            <View style={styles.groupChip}>
              <Text style={styles.groupChipText}>
                {isGroup(req) ? `Group of ${req.riders_count} riders · one pickup, one drop-off` : "Booked as a group ride"}
              </Text>
            </View>
          )}
          {req.pickup && (
            <Text style={styles.detail}>Pickup: {req.pickup}</Text>
          )}
          {req.dropoff && (
            <Text style={styles.detail}>Dropoff: {req.dropoff}</Text>
          )}
          {typeof req.distance === "number" && (
            <Text style={styles.detail}>Distance: {req.distance} km</Text>
          )}
          <Text style={styles.fare}>{formatFare(isGroup(req) ? req.group_fare : req.fare)}</Text>
          {isGroup(req) && (
            <Text style={styles.detail}>
              Total for {req.riders_count} riders ({formatFare(req.fare)} each)
            </Text>
          )}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.acceptBtn, pendingId === req.id && styles.btnDisabled]}
              disabled={pendingId === req.id}
              onPress={() => accept(req.id)}
            >
              <Text style={styles.acceptText}>
                {pendingId === req.id ? "..." : "Accept"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.declineBtn, pendingId === req.id && styles.btnDisabled]}
              disabled={pendingId === req.id}
              onPress={() => decline(req.id)}
            >
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionsSecondary}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push("/messaging")}
            >
              <Text style={styles.secondaryText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push("/call")}
            >
              <Text style={styles.secondaryText}>Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  groupChip: { alignSelf: "flex-start", backgroundColor: "#F3F4F6", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginVertical: 4 },
  groupChipText: { color: "#0B0B0B", fontWeight: "700", fontSize: 12 },
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  content: { padding: 24, paddingBottom: 40 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111111",
    marginBottom: 24,
    textAlign: "center",
  },
  errorText: {
    color: "#b91c1c",
    backgroundColor: "#fee2e2",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: "center",
  },
  emptyText: {
    color: "#475569",
    textAlign: "center",
    marginTop: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  rider: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 4,
  },
  detail: { fontSize: 15, color: "#555", marginBottom: 2 },
  fare: {
    fontSize: 16,
    color: "#111111",
    fontWeight: "bold",
    marginVertical: 8,
  },
  actions: { flexDirection: "row", justifyContent: "space-between" },
  actionsSecondary: { flexDirection: "row", gap: 8, marginTop: 8 },
  acceptBtn: {
    backgroundColor: "#111111",
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginRight: 8,
    alignItems: "center",
  },
  acceptText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  declineBtn: {
    backgroundColor: "#e53935",
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginLeft: 8,
    alignItems: "center",
  },
  declineText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnDisabled: { opacity: 0.6 },
  secondaryBtn: {
    backgroundColor: "#F7F7F7",
    borderRadius: 8,
    padding: 10,
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  secondaryText: { color: "#111111", fontWeight: "700", fontSize: 14 },
});
