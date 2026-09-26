import { requireOptionalNativeModule } from 'expo-modules-core';

interface PermissionResult { granted?: boolean; status?: string }
interface DailyReminderNative {
  requestPermissionsAsync(): Promise<PermissionResult>;
  schedule(hour: number, minute: number): boolean | Promise<boolean>;
  cancel(): boolean;
}

const native = requireOptionalNativeModule<DailyReminderNative>('DailyReminder');

export async function scheduleDailyReminder(hour: number, minute: number): Promise<boolean> {
  if (!native) return false;
  try {
    const permission = await native.requestPermissionsAsync();
    if (permission.granted !== true && permission.status !== 'granted') return false;
    return await native.schedule(hour, minute);
  } catch {
    return false;
  }
}

export function cancelDailyReminder(): boolean {
  try {
    return native?.cancel() ?? false;
  } catch {
    return false;
  }
}
