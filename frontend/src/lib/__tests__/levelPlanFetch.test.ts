jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../content', () => ({ CONTENT_URL: 'https://levels.example.test' }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { composeLevel } from '../../content/factories/compose';
import { fetchPlan, loadPlans, PlanRequest } from '../levelPlanFetch';
import { plannedLevel } from '../levelPlans';

const request: PlanRequest = {
  subject: 'math', grade: 2, level: 7, firstComposedLevel: 7,
  mastery: {}, struggling: [],
};
const response = (theme: string) => ({
  ok: true,
  json: async () => ({ theme, source: 'local', lessons: composeLevel(request) }),
}) as Response;
const originalFetch = global.fetch;
let mockFetch: jest.Mock;

beforeEach(async () => {
  await AsyncStorage.clear();
  await loadPlans('alice');
  mockFetch = jest.fn();
  global.fetch = mockFetch;
});
afterEach(() => { global.fetch = originalFetch; });

it('persists server plans for offline play after restarting', async () => {
  mockFetch.mockResolvedValue(response('Saved level'));
  expect(await fetchPlan(request, 'alice')).toBe(true);
  await loadPlans('alice');
  mockFetch.mockRejectedValue(new Error('offline'));
  expect(plannedLevel('math', 2, 7)?.theme).toBe('Saved level');
  expect(await fetchPlan(request, 'alice')).toBe(false);
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

it('does not leak a late response across a profile switch', async () => {
  let resolve!: (value: Response) => void;
  mockFetch.mockReturnValue(new Promise<Response>((done) => { resolve = done; }));
  const pending = fetchPlan(request, 'alice');
  await loadPlans('bob');
  resolve(response('Alice only'));
  expect(await pending).toBe(false);
  expect(plannedLevel('math', 2, 7)).toBeNull();
  expect(await AsyncStorage.getItem('mathquiz:p:alice:levelplans')).toBeNull();
});

it('keeps the newest performance plan when responses arrive out of order', async () => {
  let resolve!: (value: Response) => void;
  mockFetch.mockReturnValueOnce(new Promise<Response>((done) => { resolve = done; }));
  const old = fetchPlan(request, 'alice', true);
  mockFetch.mockResolvedValueOnce(response('More practice'));
  await fetchPlan({ ...request, mastery: { addSub: 2 }, struggling: ['addSub'] }, 'alice', true);
  resolve(response('Old difficulty'));
  expect(await old).toBe(false);
  expect(plannedLevel('math', 2, 7)?.theme).toBe('More practice');
});

it('retains offline content when a refresh fails', async () => {
  mockFetch.mockResolvedValueOnce(response('Offline copy'));
  await fetchPlan(request, 'alice');
  mockFetch.mockRejectedValueOnce(new Error('offline'));
  expect(await fetchPlan({ ...request, struggling: ['addSub'] }, 'alice', true)).toBe(false);
  expect(plannedLevel('math', 2, 7)?.theme).toBe('Offline copy');
});
