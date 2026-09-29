import { requireOptionalNativeModule } from 'expo-modules-core';

interface PencilSqueezeNative {
  addListener(
    event: 'onSqueeze',
    listener: (payload: { held: boolean }) => void,
  ): { remove(): void };
}

const native = requireOptionalNativeModule<PencilSqueezeNative>('PencilSqueeze');

/** No-op on Android and on iPads without Apple Pencil Pro squeeze support. */
export function observePencilSqueeze(onChange: (held: boolean) => void): () => void {
  if (!native) return () => {};
  const subscription = native.addListener('onSqueeze', ({ held }) => onChange(held));
  return () => subscription.remove();
}
