/**
 * Sending a suggestion or a bug report.
 *
 * The point of this is to be worth typing into. Two things follow from that.
 *
 * The context goes along for free. Nobody debugging a report wants to ask
 * "which grade? which build? Android or iOS?", and nobody typing one wants to
 * be asked — so the app attaches what it already knows. What it attaches is
 * about the *install*, never about the person: a device id minted here and
 * kept here, and the profile id of whoever was playing, which is a random
 * string, not a child's name.
 *
 * And it never blocks. A send that fails says so and leaves the text where it
 * was, so the reply to a bad connection is "try again", not "type it out
 * again".
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import type { FeedbackKind, FeedbackRequest, FeedbackResponse } from '../content/contract';
import { SYNC_URL, authHeader, fetchWithTimeout, loadIdentity, syncAvailable } from './identity';
import { Grade, Subject } from '../types';

/**
 * Device-level, not per profile: it identifies the tablet, so two children on
 * one device share it. Deliberately outside the `mathquiz:p:<id>:` namespace
 * that profiles are keyed under, and so untouched by removing a child.
 */
const DEVICE_KEY = 'mathquiz:deviceId';

const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0';

/**
 * A fresh opaque id.
 *
 * Three sources, tried in order, because no one of them is present
 * everywhere: `expo-crypto` has `randomUUID` on a device but not under the
 * test runner, and the web crypto global is the other way round on older
 * runtimes. The last resort is not cryptographic and does not need to be —
 * this is an install marker, and a collision would cost nothing worse than
 * two tablets' reports being grouped together.
 */
function mintId(): string {
  try {
    if (typeof Crypto.randomUUID === 'function') return Crypto.randomUUID();
  } catch {
    /* not available in this runtime */
  }
  try {
    if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  } catch {
    /* nor this one */
  }
  const rand = (): string => Math.random().toString(16).slice(2, 10);
  return `${Date.now().toString(16)}-${rand()}-${rand()}`;
}

/**
 * This install's id, minted on first use.
 *
 * A random id and nothing else. It says two reports came from the same
 * tablet, which is what makes "it happens every time" a fact rather than a
 * claim, and it says nothing about who owns it. Clearing the app's data
 * mints a new one, which is the right trade: it is a debugging aid, not a
 * tracking one.
 */
export async function deviceId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_KEY);
    if (stored) return stored;
    const minted = mintId();
    await AsyncStorage.setItem(DEVICE_KEY, minted);
    return minted;
  } catch {
    // Storage is unavailable. The report is still worth sending, and a fresh
    // id each time is better than none — it just cannot be grouped.
    return mintId();
  }
}

export interface FeedbackDraft {
  kind: FeedbackKind;
  message: string;
  /** The map they had in mind, when they picked one. */
  subject?: Subject;
  grade?: Grade;
  profileId?: string;
}

export type SendResult =
  | { ok: true }
  /** Told to the sender, so it has to be worth reading. */
  | { ok: false; reason: string };

/** Whether there is anywhere to send one. Hides the form when there isn't. */
export const feedbackAvailable = (): boolean => syncAvailable();

/**
 * Sends one. Never throws — every path a caller cares about is in the result.
 */
export async function sendFeedback(draft: FeedbackDraft): Promise<SendResult> {
  if (draft.message.trim() === '') return { ok: false, reason: 'Write a little first.' };
  if (!feedbackAvailable()) {
    return { ok: false, reason: 'This build has no server set, so there is nowhere to send it.' };
  }

  const request: FeedbackRequest = {
    kind: draft.kind,
    message: draft.message.trim(),
    subject: draft.subject,
    grade: draft.grade,
    deviceId: await deviceId(),
    profileId: draft.profileId,
    appVersion: APP_VERSION,
    platform: Platform.OS,
  };

  // Sent when there is one, so a report from a backed-up device can be tied
  // to its account. Its absence is fine and the server expects it.
  const identity = await loadIdentity();

  try {
    const response = await fetchWithTimeout(`${SYNC_URL}/v1/feedback`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(identity ? { authorization: authHeader(identity) } : {}),
      },
      body: JSON.stringify(request),
    });

    if (response.status === 201) {
      // Read so the connection closes tidily; the id is of no use here.
      await response.json().catch(() => ({}) as FeedbackResponse);
      return { ok: true };
    }
    if (response.status === 429) {
      return { ok: false, reason: 'That is a lot of reports at once — try again later.' };
    }
    if (response.status === 503) {
      return { ok: false, reason: 'The server is not taking reports at the moment.' };
    }
    return { ok: false, reason: 'The server would not take it. Nothing was lost — try again.' };
  } catch {
    return { ok: false, reason: 'Could not reach the server. Check the connection and try again.' };
  }
}
