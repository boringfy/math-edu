/**
 * Who this install is, as far as the sync server knows.
 *
 * Nobody signs up for anything. The app plays with no identity at all, and
 * the first time it is online with sync configured it quietly registers,
 * getting back a userId and a secret that together are the account. Linking
 * a Google account later (see `sync.ts`) is what makes the same userId
 * reachable from a second device.
 *
 * The secret is the account: it is stored, never displayed, and losing the
 * install loses it — which is exactly the pitch for linking.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONTENT_URL } from '../content';
import type { RegisterResponse } from '../content/contract';

/** Where sync lives. Its own variable, falling back to the content server. */
export const SYNC_URL = process.env.EXPO_PUBLIC_SYNC_URL ?? CONTENT_URL;

export const syncAvailable = (): boolean => SYNC_URL !== '';

const IDENTITY_KEY = 'mathquiz:identity';

export interface Identity {
  userId: string;
  secret: string;
  /** Present once an account has been linked on this device. */
  provider?: 'google';
  linkedAt?: string;
}

export async function loadIdentity(): Promise<Identity | null> {
  try {
    const raw = await AsyncStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Partial<Identity>;
    if (typeof stored.userId !== 'string' || typeof stored.secret !== 'string') return null;
    return stored as Identity;
  } catch {
    return null;
  }
}

export async function saveIdentity(identity: Identity): Promise<void> {
  await AsyncStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

export const authHeader = (identity: Identity): string =>
  `Bearer ${identity.userId}.${identity.secret}`;

/** Fetch with a timeout, because sync must never hold gameplay hostage. */
export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = 10_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The stored identity, or a freshly registered one when the server can be
 * reached — or null, which means "offline or sync is off" and is always a
 * fine answer: the caller simply doesn't sync this time.
 */
export async function ensureRegistered(): Promise<Identity | null> {
  if (!syncAvailable()) return null;
  const existing = await loadIdentity();
  if (existing) return existing;

  try {
    const response = await fetchWithTimeout(`${SYNC_URL}/v1/users`, { method: 'POST' });
    if (response.status !== 201) return null;
    const body = (await response.json()) as RegisterResponse;
    if (typeof body.userId !== 'string' || typeof body.secret !== 'string') return null;
    const identity: Identity = { userId: body.userId, secret: body.secret };
    await saveIdentity(identity);
    return identity;
  } catch {
    return null;
  }
}
