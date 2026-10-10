import type { Route } from '@/services/geo';
import { instruction, metres, offRouteTracker, prepare, progress, spoken, type NavWords } from '@/services/navigation';

// An L-shaped trip in Bujumbura: ~1.1 km east, then left, ~1.1 km north.
const A = { lat: -3.38, lng: 29.36 };
const CORNER = { lat: -3.38, lng: 29.37 };
const B = { lat: -3.37, lng: 29.37 };
const route: Route = {
  distanceKm: 2.2,
  durationMin: 6,
  geometry: [[A.lat, A.lng], [-3.38, 29.365], [CORNER.lat, CORNER.lng], [-3.375, 29.37], [B.lat, B.lng]],
  steps: [
    { type: 'depart', modifier: null, name: 'Boulevard de l’Uprona', distanceM: 1111, durationS: 180, location: [A.lat, A.lng] },
    { type: 'turn', modifier: 'left', name: 'Avenue de la Mission', distanceM: 1105, durationS: 180, location: [CORNER.lat, CORNER.lng] },
    { type: 'arrive', modifier: null, name: null, distanceM: 0, durationS: 0, location: [B.lat, B.lng] },
  ],
};

const words: NavWords = {
  turn: (dir, road) => `Turn ${dir}${road ? ` onto ${road}` : ''}`,
  keep: (dir, road) => `Keep ${dir}${road ? ` onto ${road}` : ''}`,
  roundabout: (road) => `At the roundabout, take the exit${road ? ` onto ${road}` : ''}`,
  continueOn: (road) => `Continue straight${road ? ` onto ${road}` : ''}`,
  uturn: () => 'Make a U-turn',
  arrive: 'You have arrived',
  dirs: { left: 'left', right: 'right', 'slight left': 'slightly left', straight: 'straight' },
};

describe('progress along the route', () => {
  const nav = prepare(route);

  test('the route is about 2.2 km long', () => {
    expect(nav.total).toBeGreaterThan(2150);
    expect(nav.total).toBeLessThan(2250);
  });

  test('at the start: turn left in ~1.1 km, everything still to go', () => {
    const p = progress(nav, A);
    expect(p.offM).toBeLessThan(1);
    expect(p.next?.type).toBe('turn');
    expect(p.nextInM).toBeCloseTo(metres(A, CORNER), -1);
    expect(p.remainingMin).toBe(6);
    expect(p.arrived).toBe(false);
    expect(instruction(p.next, words)).toBe('Turn left onto Avenue de la Mission');
  });

  test('halfway along the first street, a little off the line (GPS drift)', () => {
    const p = progress(nav, { lat: -3.3801, lng: 29.365 });
    expect(p.offM).toBeGreaterThan(5);
    expect(p.offM).toBeLessThan(20);
    expect(p.nextInM).toBeCloseTo(metres({ lat: -3.38, lng: 29.365 }, CORNER), -1);
    // Three quarters of the trip left: 0.75 × 6 min.
    expect(p.remainingMin).toBe(5);
  });

  test('past the corner: only arriving is left', () => {
    const p = progress(nav, { lat: -3.375, lng: 29.37 });
    expect(p.next?.type).toBe('arrive');
    expect(instruction(p.next, words)).toBe('You have arrived');
    expect(p.remainingM).toBeCloseTo(metres({ lat: -3.375, lng: 29.37 }, B), -1);
  });

  test('at the destination: arrived', () => {
    const p = progress(nav, { lat: -3.37005, lng: 29.37 });
    expect(p.arrived).toBe(true);
    expect(p.remainingMin).toBeLessThanOrEqual(1);
  });
});

describe('leaving the route', () => {
  test('one fix off is GPS noise; two in a row ask for a new route; back on resets', () => {
    const nav = prepare(route);
    const off = offRouteTracker();
    const away = progress(nav, { lat: -3.3815, lng: 29.365 }).offM; // ~165 m south of the street
    expect(away).toBeGreaterThan(100);
    expect(off(away)).toBe(false);
    expect(off(away)).toBe(true);
    // Counting starts again after a new route was asked for, and when back on it.
    expect(off(away)).toBe(false);
    expect(off(3)).toBe(false);
    expect(off(away)).toBe(false);
  });
});

describe('words', () => {
  const step = (type: string, modifier: string | null, name: string | null = null) =>
    ({ type, modifier, name, distanceM: 0, durationS: 0, location: [0, 0] as [number, number] });

  test.each([
    [step('turn', 'right', 'Avenue du Large'), 'Turn right onto Avenue du Large'],
    [step('turn', 'slight left'), 'Turn slightly left'],
    [step('continue', 'straight', 'RN1'), 'Continue straight onto RN1'],
    [step('new name', 'straight'), 'Continue straight'],
    [step('roundabout', 'right', 'Chaussée PLR'), 'At the roundabout, take the exit onto Chaussée PLR'],
    [step('fork', 'left'), 'Keep left'],
    [step('turn', 'uturn'), 'Make a U-turn'],
    [null, 'You have arrived'],
  ])('%j → %s', (s, text) => {
    expect(instruction(s, words)).toBe(text);
  });

  test('distances read naturally', () => {
    expect(spoken(1234)).toBe('1.2 km');
    expect(spoken(1234, ',')).toBe('1,2 km');
    expect(spoken(340)).toBe('350 m');
    expect(spoken(42)).toBe('40 m');
    expect(spoken(3)).toBe('10 m');
  });
});
