import { geocoding, geoErrorMessage, routing } from '@/services/geo';
import { ApiError } from '@/services/api';

// The app's geo service asks our API (which talks to OpenStreetMap services);
// HTTP is mocked here.

const TOKEN = 'test-token';
let fetchMock: jest.Mock;

const answer = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });

beforeEach(() => {
  fetchMock = jest.fn();
  globalThis.fetch = fetchMock as any;
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const called = () => {
  const [url, init] = fetchMock.mock.calls[0];
  return { url: new URL(url), init };
};

describe('geocoding', () => {
  test('search sends the text and where the rider is, signed in', async () => {
    const place = { id: 'way42', name: 'Marché Central', address: 'Rohero, Bujumbura, Burundi', lat: -3.3812, lng: 29.3601 };
    fetchMock.mockResolvedValue(answer(200, { places: [place] }));
    const places = await geocoding.search(TOKEN, '  marché central ', { lat: -3.38, lng: 29.36 });

    const { url, init } = called();
    expect(url.pathname).toBe('/api/geo/search');
    expect(url.searchParams.get('q')).toBe('marché central');
    expect(url.searchParams.get('lat')).toBe('-3.38');
    expect(url.searchParams.get('lng')).toBe('29.36');
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(places).toEqual([place]);
  });

  test('nothing found is an empty list', async () => {
    fetchMock.mockResolvedValue(answer(200, { places: [] }));
    await expect(geocoding.search(TOKEN, 'zzzz')).resolves.toEqual([]);
    expect(called().url.searchParams.has('lat')).toBe(false);
  });

  test('reverse returns the place, or null', async () => {
    fetchMock.mockResolvedValueOnce(answer(200, { place: { id: 'n1', name: 'Kamenge', address: 'Bujumbura', lat: -3.34, lng: 29.38 } }));
    await expect(geocoding.reverse(TOKEN, { lat: -3.34, lng: 29.38 })).resolves.toMatchObject({ name: 'Kamenge' });
    expect(called().url.search).toBe('?lat=-3.34&lng=29.38');
    fetchMock.mockResolvedValueOnce(answer(200, { place: null }));
    await expect(geocoding.reverse(TOKEN, { lat: 0, lng: 0 })).resolves.toBeNull();
  });

  test('the server being down is an ApiError the screen can explain', async () => {
    fetchMock.mockResolvedValue(answer(503, { error: 'Address search is not available right now' }));
    const error = await geocoding.search(TOKEN, 'marché').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(geoErrorMessage(error)).toBe('Maps are not available right now. Please try again in a moment.');
  });
});

describe('routing', () => {
  const route = { distanceKm: 6, durationMin: 6, geometry: [[-3.38, 29.36], [-3.35, 29.38]] };

  test('asks for the route between two points, with turn steps when wanted', async () => {
    fetchMock.mockResolvedValue(answer(200, { route }));
    await expect(routing.route(TOKEN, { lat: -3.38, lng: 29.36 }, { lat: -3.35, lng: 29.38 }, { steps: true })).resolves.toEqual(route);
    const { url, init } = called();
    expect(url.pathname).toBe('/api/geo/route');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ from: { lat: -3.38, lng: 29.36 }, to: { lat: -3.35, lng: 29.38 }, steps: true });
  });

  test('no road between the points is null', async () => {
    fetchMock.mockResolvedValue(answer(422, { error: 'No road route between these points' }));
    await expect(routing.route(TOKEN, { lat: 0, lng: 0 }, { lat: 1, lng: 1 })).resolves.toBeNull();
  });

  test('other failures are passed on, with a message for people', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const error = await routing.route(TOKEN, { lat: 0, lng: 0 }, { lat: 1, lng: 1 }).catch((e) => e);
    expect(geoErrorMessage(error)).toBe('Could not reach Flow. Check your internet and try again.');
    expect(geoErrorMessage(new ApiError('slow down', 429))).toBe('Too many searches. Please wait a moment.');
  });
});
