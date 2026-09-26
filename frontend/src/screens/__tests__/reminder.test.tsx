jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockSchedule = jest.fn(async (_hour: number, _minute: number) => true);
const mockCancel = jest.fn(() => true);
jest.mock('../../../modules/daily-reminder', () => ({
  scheduleDailyReminder: (hour: number, minute: number) => mockSchedule(hour, minute),
  cancelDailyReminder: () => mockCancel(),
}));

import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { emptyProfiles } from '../../lib/profiles';
import { DEFAULT_SETTINGS, Settings } from '../../types';
import SettingsScreen from '../SettingsScreen';

let tree: ReactTestRenderer;
let saved: Settings;

const node = (label: string) =>
  tree.root.find((n) => typeof n.type !== 'string' && n.props.accessibilityLabel === label);

beforeEach(() => {
  mockSchedule.mockClear();
  mockCancel.mockClear();
  saved = DEFAULT_SETTINGS;
  act(() => {
    tree = create(
      <SettingsScreen
        profiles={emptyProfiles()}
        onAddProfile={() => {}}
        onRenameProfile={() => {}}
        onRemoveProfile={() => {}}
        settings={saved}
        onChange={(settings) => { saved = settings; }}
        grades={{ math: 1, reading: 1, logic: 1 }}
        onGradeChange={() => {}}
        onBack={() => {}}
      />,
    );
  });
});

afterEach(() => act(() => tree.unmount()));

it('asks permission and schedules the chosen time when enabled', async () => {
  await act(async () => node('Remind me to learn').props.onValueChange(true));
  expect(mockSchedule).toHaveBeenCalledWith(17, 0);
  expect(saved.reminderEnabled).toBe(true);
});

it('leaves reminders off and explains how to enable notifications when permission is denied', async () => {
  mockSchedule.mockResolvedValueOnce(false);
  await act(async () => node('Remind me to learn').props.onValueChange(true));
  expect(saved.reminderEnabled).toBe(false);
  expect(JSON.stringify(tree.toJSON())).toContain('Notifications are off for this app');
});

it('moves the reminder in half-hour steps', () => {
  act(() => node('Later reminder').props.onPress());
  expect(saved).toMatchObject({ reminderHour: 17, reminderMinute: 30 });
});

it('cancels the scheduled notification when disabled', () => {
  saved = { ...DEFAULT_SETTINGS, reminderEnabled: true };
  act(() => node('Remind me to learn').props.onValueChange(false));
  expect(mockCancel).toHaveBeenCalled();
  expect(saved.reminderEnabled).toBe(false);
});
