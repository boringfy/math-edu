/**
 * What a grown-up sends back from the settings page.
 *
 * Two things arrive on the same route and land in the same table under
 * different kinds: an idea for a kind of problem the app does not have yet,
 * and a report that something is broken. They are one shape because the
 * difference between them is a word, not a schema — and one table sorts and
 * counts far better than two that have to be unioned.
 *
 * Everything past `kind` and `message` is context the sender did not have to
 * type: which child was playing, which grade they are on, which build this
 * is. A bug report with none of that is a bug report nobody can act on.
 */

import type { Grade } from './content';

export type FeedbackKind = 'suggestion' | 'bug';

export const FEEDBACK_KINDS: FeedbackKind[] = ['suggestion', 'bug'];

/**
 * Length caps, enforced on the server rather than trusted from the client.
 * The message cap is generous — someone describing a bug should not be cut
 * off mid-sentence — but bounded, because this is an unauthenticated write.
 */
export const FEEDBACK_LIMITS = {
  message: 2000,
  subject: 32,
  appVersion: 32,
  platform: 32,
  deviceId: 64,
  profileId: 64,
} as const;

export interface FeedbackRequest {
  kind: FeedbackKind;
  /** What they typed. The only field a person fills in by hand. */
  message: string;
  /**
   * Which map they had in mind — 'math', 'reading', 'logic', or absent for
   * something that spans them. Free text rather than the `Subject` union so
   * an older app naming a subject this build has never heard of is still
   * recorded rather than rejected.
   */
  subject?: string;
  /** The grade that child is set to, for reading a suggestion in context. */
  grade?: Grade;
  /** Which install this is. Minted on the device, not tied to a person. */
  deviceId: string;
  /** Which child was playing, so two kids on one tablet stay distinguishable. */
  profileId?: string;
  appVersion?: string;
  platform?: string;
}

export interface FeedbackResponse {
  id: string;
  receivedAt: string;
}
