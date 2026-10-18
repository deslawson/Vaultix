import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cacheDashboardData,
  getCachedDashboardData,
  clearDashboardCache,
} from './dashboardCache';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('dashboard cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores a dashboard payload with the current timestamp', async () => {
    const payload = { escrows: [{ id: 'escrow-1' }], hasNextPage: false };

    await cacheDashboardData(payload);

    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
    const [key, rawValue] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
    expect(key).toBe('dashboard_cache');
    const entry = JSON.parse(rawValue);
    expect(entry.data).toEqual(payload);
    expect(entry.updatedAt).toBeGreaterThan(0);
    expect(entry.expiresAt).toBeGreaterThan(entry.updatedAt);
  });

  it('retrieves a cached payload and marks stale entries when expired', async () => {
    const now = Date.now();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
      version: 1,
      updatedAt: now - 60_000,
      expiresAt: now - 1,
      data: { escrows: [{ id: 'escrow-1' }], hasNextPage: false },
      stale: false,
    }));

    const cached = await getCachedDashboardData();

    expect(cached).toMatchObject({
      data: { escrows: [{ id: 'escrow-1' }], hasNextPage: false },
      stale: true,
    });
  });

  it('removes invalid dashboard cache entries', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not-json');

    const cached = await getCachedDashboardData();

    expect(cached).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('dashboard_cache');
  });

  it('clears the dashboard cache entry', async () => {
    await clearDashboardCache();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('dashboard_cache');
  });
});