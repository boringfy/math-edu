/** Optional, first-party usage counts. No event is queued before consent. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const CONSENT_KEY = 'mathquiz:usageConsent';
const INSTALL_KEY = 'mathquiz:usageInstallId';
const QUEUE_KEY = 'mathquiz:usageQueue';
const URL = process.env.EXPO_PUBLIC_USAGE_URL ?? 'https://hashfront.com/api/usage';
const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0';

export type UsageName = 'app_opened' | 'lesson_completed';
interface UsageEvent {
  name: UsageName;
  at: string;
  props?: { subject: 'math' | 'reading' | 'logic' };
}

let pending: Promise<unknown> = Promise.resolve();
let activeRequest: AbortController | null = null;
let consentOverride: boolean | null = null;

/** Null means the grown-up has not answered yet. Consent is device-local. */
export async function loadUsageConsent(): Promise<boolean | null> {
  if (consentOverride !== null) return consentOverride;
  try {
    const value = await AsyncStorage.getItem(CONSENT_KEY);
    return value === 'yes' ? true : value === 'no' ? false : null;
  } catch {
    return null;
  }
}

export async function setUsageConsent(allowed: boolean): Promise<void> {
  if (!allowed) {
    consentOverride = false;
    activeRequest?.abort();
  }
  await serial(async () => {
    await AsyncStorage.setItem(CONSENT_KEY, allowed ? 'yes' : 'no');
    if (!allowed) await AsyncStorage.multiRemove([INSTALL_KEY, QUEUE_KEY]);
    if (allowed) consentOverride = true;
  });
}

function serial<T>(work: () => Promise<T>): Promise<T> {
  const next = pending.then(work, work);
  pending = next.catch(() => undefined);
  return next;
}

async function queued(): Promise<UsageEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UsageEvent[]).slice(-100) : [];
  } catch {
    return [];
  }
}

async function upload(): Promise<void> {
  if ((await loadUsageConsent()) !== true) return;
  const events = await queued();
  if (events.length === 0) return;
  const installId = await AsyncStorage.getItem(INSTALL_KEY);
  if (!installId || (await loadUsageConsent()) !== true) return;

  const controller = new AbortController();
  activeRequest = controller;
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app: 'math-edu',
        appVersion: APP_VERSION,
        installId,
        platform: Platform.OS,
        osVersion: String(Platform.Version),
        events,
      }),
      signal: controller.signal,
    });
    if (response.status === 202 && (await loadUsageConsent()) === true) {
      await AsyncStorage.removeItem(QUEUE_KEY);
    }
  } catch {
    // Offline or server unavailable: the small local queue will retry later.
  } finally {
    clearTimeout(timeout);
    if (activeRequest === controller) activeRequest = null;
  }
}

/** Called on launch/resume. Never sends or creates an ID without consent. */
export async function flushUsage(): Promise<void> {
  await serial(upload).catch(() => undefined);
}

export async function recordUsage(
  name: UsageName,
  props?: UsageEvent['props'],
): Promise<void> {
  await serial(async () => {
    if ((await loadUsageConsent()) !== true) return;
    let installId = await AsyncStorage.getItem(INSTALL_KEY);
    if (!installId) {
      installId = Crypto.randomUUID();
      await AsyncStorage.setItem(INSTALL_KEY, installId);
    }
    const events = await queued();
    events.push({ name, at: new Date().toISOString(), ...(props ? { props } : {}) });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-100)));
    await upload();
  }).catch(() => undefined);
}
