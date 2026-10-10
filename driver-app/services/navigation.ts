import type { Route, RouteStep } from './geo';

// Turn-by-turn on top of a route from the routing engine: where the driver
// is along it, the next instruction, what is left, and whether they left it.
// Pure functions, so they can be tested without a phone.

export type Point = { lat: number; lng: number };

// Further than this from the route counts as off it (GPS in town drifts ~10-20 m).
export const OFF_ROUTE_M = 40;
// Off the route on this many fixes in a row before asking for a new route.
export const OFF_ROUTE_FIXES = 2;

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

// Local flat projection around `origin`, in metres (fine over a city).
function project(p: Point, origin: Point) {
  return { x: rad(p.lng - origin.lng) * Math.cos(rad(origin.lat)) * R, y: rad(p.lat - origin.lat) * R };
}

export function metres(a: Point, b: Point) {
  const { x, y } = project(b, a);
  return Math.hypot(x, y);
}

const toPoint = ([lat, lng]: [number, number]): Point => ({ lat, lng });

// Distance from the start of the line to each of its points.
export function cumulative(line: [number, number][]): number[] {
  const out = [0];
  for (let i = 1; i < line.length; i += 1) out.push(out[i - 1] + metres(toPoint(line[i - 1]), toPoint(line[i])));
  return out;
}

// The closest point of the line to `p`: how far away it is and how far along the line.
export function snap(line: [number, number][], along: number[], p: Point): { offM: number; alongM: number } {
  let best = { offM: Infinity, alongM: 0 };
  for (let i = 1; i < line.length; i += 1) {
    const a = toPoint(line[i - 1]);
    const b = project(toPoint(line[i]), a);
    const q = project(p, a);
    const len2 = b.x * b.x + b.y * b.y;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (q.x * b.x + q.y * b.y) / len2));
    const off = Math.hypot(q.x - t * b.x, q.y - t * b.y);
    if (off < best.offM) best = { offM: off, alongM: along[i - 1] + t * (along[i] - along[i - 1]) };
  }
  return best;
}

export type Progress = {
  offM: number;
  // Metres and minutes left to the destination.
  remainingM: number;
  remainingMin: number;
  // The next manoeuvre and how far it is; null when only arriving is left.
  next: RouteStep | null;
  nextInM: number;
  arrived: boolean;
};

// Prepared once per route.
export function prepare(route: Route) {
  const along = cumulative(route.geometry);
  const steps = (route.steps ?? []).map((s) => ({ step: s, at: snap(route.geometry, along, toPoint(s.location)).alongM }));
  return { route, along, total: along[along.length - 1] ?? 0, steps };
}
export type PreparedRoute = ReturnType<typeof prepare>;

export function progress(nav: PreparedRoute, p: Point): Progress {
  const { offM, alongM } = snap(nav.route.geometry, nav.along, p);
  const remainingM = Math.max(0, nav.total - alongM);
  const share = nav.total > 0 ? remainingM / nav.total : 0;
  // The first manoeuvre still ahead (a few metres of slack for GPS).
  const ahead = nav.steps.find((s) => s.step.type !== 'depart' && s.at > alongM + 5);
  return {
    offM,
    remainingM,
    remainingMin: Math.max(remainingM > 0 ? 1 : 0, Math.round(nav.route.durationMin * share)),
    next: ahead?.step ?? null,
    nextInM: ahead ? ahead.at - alongM : remainingM,
    arrived: remainingM < 30,
  };
}

// Counts fixes off the route; true when it is time to ask for a new one.
export function offRouteTracker(limitM = OFF_ROUTE_M, fixes = OFF_ROUTE_FIXES) {
  let count = 0;
  return (offM: number) => {
    count = offM > limitM ? count + 1 : 0;
    if (count >= fixes) {
      count = 0;
      return true;
    }
    return false;
  };
}

// Words for a manoeuvre, from translated pieces.
export type NavWords = {
  turn: (dir: string, road: string | null) => string;
  keep: (dir: string, road: string | null) => string;
  roundabout: (road: string | null) => string;
  continueOn: (road: string | null) => string;
  uturn: (road: string | null) => string;
  arrive: string;
  dirs: Record<string, string>;
};

export function instruction(step: RouteStep | null, w: NavWords): string {
  if (!step || step.type === 'arrive') return w.arrive;
  if (step.modifier === 'uturn') return w.uturn(step.name);
  const dir = w.dirs[step.modifier ?? 'straight'] ?? w.dirs.straight;
  switch (step.type) {
    case 'roundabout':
    case 'rotary':
    case 'roundabout turn':
    case 'exit roundabout':
    case 'exit rotary':
      return w.roundabout(step.name);
    case 'fork':
    case 'merge':
    case 'on ramp':
    case 'off ramp':
      return w.keep(dir, step.name);
    case 'continue':
    case 'new name':
    case 'notification':
      return step.modifier && step.modifier !== 'straight' ? w.turn(dir, step.name) : w.continueOn(step.name);
    default:
      return step.modifier === 'straight' ? w.continueOn(step.name) : w.turn(dir, step.name);
  }
}

// 1.2 km / 350 m / 20 m, rounded the way people read them while driving.
export function spoken(m: number, decimal = '.'): string {
  if (m >= 1000) return `${(Math.round(m / 100) / 10).toString().replace('.', decimal)} km`;
  if (m >= 100) return `${Math.round(m / 50) * 50} m`;
  return `${Math.max(10, Math.round(m / 10) * 10)} m`;
}
