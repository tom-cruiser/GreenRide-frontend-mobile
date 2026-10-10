import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FlowMap from '@/components/flow-map';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverWork } from '@/contexts/DriverWorkContext';
import { Button, colors, Icon, type IconName, radius, space, Text } from '@/design';
import { useT } from '@/i18n';
import { routing, type Point } from '@/services/geo';
import { instruction, offRouteTracker, prepare, progress, spoken, type NavWords, type PreparedRoute } from '@/services/navigation';

// Turn-by-turn to the pickup, then to the drop-off: the route from our
// routing engine (OSRM), the next instruction, what is left; leaving the
// route asks for a new one.

// At most one new route this often, however far off the driver goes.
const REROUTE_EVERY_MS = 10_000;

const ARROWS: Record<string, IconName> = {
  left: 'corner-up-left', 'sharp left': 'corner-up-left', 'slight left': 'arrow-up-left',
  right: 'corner-up-right', 'sharp right': 'corner-up-right', 'slight right': 'arrow-up-right',
  uturn: 'rotate-ccw', straight: 'arrow-up',
};

export default function NavigateScreen() {
  const router = useRouter();
  const { t, locale } = useT();
  const { token } = useAuth();
  const { activeRide } = useDriverWork();
  const [here, setHere] = useState<Point | null>(null);
  // The route, with the destination it leads to.
  const [planned, setPlanned] = useState<{ to: string; nav: PreparedRoute } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [rerouting, setRerouting] = useState(false);
  const lastRoute = useRef(0);
  const offRoute = useRef(offRouteTracker());

  const toDropoff = activeRide?.status === 'in_progress';
  const target: Point | null = activeRide
    ? toDropoff
      ? activeRide.dropoff_lat != null ? { lat: activeRide.dropoff_lat, lng: activeRide.dropoff_lng! } : null
      : activeRide.pickup_lat != null ? { lat: activeRide.pickup_lat, lng: activeRide.pickup_lng! } : null
    : null;
  const place = activeRide ? (toDropoff ? activeRide.dropoff : activeRide.pickup) : '';
  // Picked up: the destination changes and the old route no longer counts.
  const targetKey = target ? `${target.lat},${target.lng}` : '';
  const nav = planned?.to === targetKey ? planned.nav : null;

  const words: NavWords = useMemo(() => {
    const onto = (road: string | null) => (road ? t('nav.onto', { road }) : '');
    return {
      turn: (dir, road) => t('nav.turn', { dir, road: onto(road) }),
      keep: (dir, road) => t('nav.keep', { dir, road: onto(road) }),
      roundabout: (road) => t('nav.roundabout', { road: onto(road) }),
      continueOn: (road) => t('nav.continueOn', { road: onto(road) }),
      uturn: (road) => t('nav.uturnDo', { road: onto(road) }),
      arrive: t('nav.arrive'),
      dirs: {
        left: t('nav.left_'), right: t('nav.right_'), 'slight left': t('nav.slightLeft'), 'slight right': t('nav.slightRight'),
        'sharp left': t('nav.sharpLeft'), 'sharp right': t('nav.sharpRight'), straight: t('nav.straight'),
      },
    };
  }, [t]);

  const fetchRoute = useCallback(async (from: Point) => {
    if (!token || !target) return;
    lastRoute.current = Date.now();
    try {
      const route = await routing.route(token, from, target, { steps: true });
      if (!route) {
        setProblem(t('nav.noRoute'));
        return;
      }
      setPlanned({ to: `${target.lat},${target.lng}`, nav: prepare(route) });
      setProblem(null);
    } catch {
      setProblem(t('nav.unavailable'));
    } finally {
      setRerouting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, target?.lat, target?.lng, t]);

  // Follow the phone; the first fix asks for the route.
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    Location.getForegroundPermissionsAsync()
      .then((p) => (p.status === 'granted'
        ? Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 5 },
          (pos) => setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude }))
        : null))
      .then((s) => {
        if (cancelled) s?.remove();
        else if (s) sub = s;
        else setProblem(t('nav.noGps'));
      })
      .catch(() => setProblem(t('nav.noGps')));
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [t]);

  const status = nav && here ? progress(nav, here) : null;

  // First route, and a new one when the driver leaves it. Runs on every GPS
  // fix (a new object each time), so standing still off the route counts too.
  useEffect(() => {
    if (!here || !target) return;
    if (!nav) {
      if (Date.now() - lastRoute.current > REROUTE_EVERY_MS / 2) fetchRoute(here);
      return;
    }
    if (status && offRoute.current(status.offM) && Date.now() - lastRoute.current > REROUTE_EVERY_MS) {
      setRerouting(true);
      fetchRoute(here);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [here, nav, targetKey]);

  if (!activeRide) return null;

  const decimal = locale === 'fr' ? ',' : '.';
  const arrow = status?.arrived ? 'flag' : ARROWS[status?.next?.modifier ?? 'straight'] ?? 'arrow-up';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlowMap
        style={StyleSheet.absoluteFill}
        center={here ? { latitude: here.lat, longitude: here.lng } : target ? { latitude: target.lat, longitude: target.lng } : { latitude: -3.3822, longitude: 29.3644 }}
        delta={0.005}
        followUser={Boolean(here)}
        userLocation={here ? { latitude: here.lat, longitude: here.lng } : null}
        route={nav?.route.geometry}
        pins={target ? [{ id: 'target', latitude: target.lat, longitude: target.lng, color: colors.ink }] : []}
        controls={false}
        // The instruction above and the summary below cover the map.
        insets={{ top: 200, bottom: 130 }}
      />

      {/* The next instruction */}
      <SafeAreaView edges={['top']} style={styles.top} pointerEvents="box-none">
        <View style={styles.banner}>
          {status ? (
            <>
              <Icon name={arrow} size={36} color={colors.onDark} />
              <View style={{ flex: 1 }}>
                {!status.arrived && <Text color={colors.onDarkMuted}>{t('nav.in', { distance: spoken(status.nextInM, decimal) })}</Text>}
                <Text variant="heading" weight="bold" color={colors.onDark}>
                  {status.arrived ? t('nav.arrive') : instruction(status.next, words)}
                </Text>
              </View>
            </>
          ) : problem ? (
            <Text color={colors.onDark} style={{ flex: 1 }}>{problem}</Text>
          ) : (
            <ActivityIndicator color={colors.onDark} />
          )}
        </View>
        {rerouting && <Text variant="caption" color={colors.ink} style={styles.rerouting}>{t('nav.rerouting')}</Text>}
      </SafeAreaView>

      {/* What is left, and back to the ride */}
      <SafeAreaView edges={['bottom']} style={styles.bottom}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color={colors.muted}>{t(toDropoff ? 'nav.toDropoff' : 'nav.toPickup', { place })}</Text>
          {status && (
            <Text variant="heading" weight="bold">
              {status.arrived ? t('nav.arrive') : t('nav.left', { min: status.remainingMin, distance: spoken(status.remainingM, decimal) })}
            </Text>
          )}
        </View>
        <Button label={t('nav.exit')} variant="secondary" onPress={() => router.back()} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, top: 0, padding: space.md },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: space.lg, backgroundColor: colors.ink,
    borderRadius: radius.xl, padding: space.lg, minHeight: 84,
  },
  rerouting: { alignSelf: 'center', marginTop: space.sm, backgroundColor: colors.bg, paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden' },
  bottom: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.lg,
  },
});
