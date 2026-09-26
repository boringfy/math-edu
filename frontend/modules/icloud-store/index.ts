import { requireOptionalNativeModule } from 'expo-modules-core';

interface ICloudStoreNative {
  isAvailable(): boolean;
  getString(key: string): string | null;
  setString(key: string, value: string): boolean;
  synchronize(): boolean;
}

const native = requireOptionalNativeModule<ICloudStoreNative>('ICloudStore');

export const iCloudAvailable = (): boolean => {
  try {
    return native?.isAvailable() ?? false;
  } catch {
    return false;
  }
};

export const readICloudValue = (key: string): string | null => {
  try {
    native?.synchronize();
    return native?.getString(key) ?? null;
  } catch {
    return null;
  }
};

export const writeICloudValue = (key: string, value: string): boolean => {
  try {
    return native?.setString(key, value) ?? false;
  } catch {
    return false;
  }
};
