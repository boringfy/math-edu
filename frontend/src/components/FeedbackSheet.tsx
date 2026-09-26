import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FEEDBACK_LIMITS } from '../content/contract';
import { FeedbackDraft, SendResult, sendFeedback } from '../lib/feedback';
import { colors } from '../theme';
import { Grade, Subject } from '../types';

/**
 * One form, two jobs.
 *
 * A suggestion and a bug report ask for the same thing — a paragraph and, if
 * the sender knows, which map it is about — so they share a sheet and differ
 * in their words. Splitting them into two components would duplicate the
 * keyboard handling, the send state and the confirmation to no end.
 *
 * The sheet closes itself a moment after a successful send. A dialog that
 * stays open after it has done its job invites a second tap, and a second tap
 * would file the same report twice.
 */

const WORDING: Record<
  FeedbackDraft['kind'],
  { title: string; blurb: string; placeholder: string; action: string; thanks: string }
> = {
  suggestion: {
    title: 'Suggest a kind of problem',
    blurb:
      'What would you like the app to ask? Anything from a topic it has never covered to a way of asking that would suit your child better.',
    placeholder: 'Telling the time on a clock with hands…',
    action: 'Send suggestion',
    thanks: 'Thank you — that has been sent.',
  },
  bug: {
    title: 'Report a problem',
    blurb:
      'What went wrong, and what were you doing when it happened? The more ordinary the detail, the easier it is to find.',
    placeholder: 'The owl kept spinning after I tapped it on question 3…',
    action: 'Send report',
    thanks: 'Thank you — that has been sent.',
  },
};

const SUBJECTS: { key: Subject; label: string }[] = [
  { key: 'math', label: 'Maths' },
  { key: 'reading', label: 'Reading' },
  { key: 'logic', label: 'Logic' },
];

interface Props {
  visible: boolean;
  kind: FeedbackDraft['kind'];
  /** The child playing, so a report says which of them hit it. */
  profileId?: string;
  /** Their grade on whichever subject is picked, for context. */
  gradeFor: (subject: Subject) => Grade;
  onClose: () => void;
}

export default function FeedbackSheet({ visible, kind, profileId, gradeFor, onClose }: Props) {
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState<Subject | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const words = WORDING[kind];

  // A fresh sheet every time it opens. Without this, reopening it shows the
  // last thing sent, which reads as though it failed to send.
  useEffect(() => {
    if (visible) {
      setMessage('');
      setSubject(null);
      setResult(null);
      setSending(false);
    }
  }, [visible, kind]);

  // Closes itself once it has worked, so the button cannot be hit twice.
  useEffect(() => {
    if (result?.ok !== true) return;
    const timer = setTimeout(onClose, 1400);
    return () => clearTimeout(timer);
  }, [result, onClose]);

  const send = async (): Promise<void> => {
    setSending(true);
    setResult(null);
    try {
      setResult(
        await sendFeedback({
          kind,
          message,
          subject: subject ?? undefined,
          grade: subject ? gradeFor(subject) : undefined,
          profileId,
        }),
      );
    } finally {
      setSending(false);
    }
  };

  const empty = message.trim() === '';
  const sent = result?.ok === true;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          {/* Stops a tap inside the card from closing it. */}
          <Pressable style={styles.card} onPress={() => {}}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.title}>{words.title}</Text>
              <Text style={styles.blurb}>{words.blurb}</Text>

              <TextInput
                style={styles.input}
                value={message}
                onChangeText={setMessage}
                placeholder={words.placeholder}
                placeholderTextColor={colors.textMuted}
                accessibilityLabel={words.title}
                multiline
                editable={!sending && !sent}
                maxLength={FEEDBACK_LIMITS.message}
                textAlignVertical="top"
              />

              <Text style={styles.label}>Which one is it about?</Text>
              <View style={styles.pills}>
                {SUBJECTS.map(({ key, label }) => {
                  const on = subject === key;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.pill, on && styles.pillOn]}
                      accessibilityRole="button"
                      accessibilityLabel={on ? `${label}, chosen` : label}
                      disabled={sending || sent}
                      // Tapping the chosen one clears it — "all of them", or
                      // "none in particular", needs to be reachable too.
                      onPress={() => setSubject(on ? null : key)}
                    >
                      <Text style={[styles.pillText, on && styles.pillTextOn]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                style={[styles.send, (empty || sending || sent) && styles.sendOff]}
                accessibilityRole="button"
                accessibilityLabel={words.action}
                disabled={empty || sending || sent}
                onPress={() => void send()}
              >
                {sending ? (
                  <ActivityIndicator color={colors.card} />
                ) : (
                  <Text style={styles.sendText}>{sent ? 'Sent' : words.action}</Text>
                )}
              </Pressable>

              {result !== null && (
                <Text style={[styles.result, !result.ok && styles.resultBad]}>
                  {result.ok ? words.thanks : result.reason}
                </Text>
              )}

              <Text style={styles.fine}>
                Sent with your device and app version so a problem can be traced. Nothing
                is taken from what your child has written or answered.
              </Text>

              <Pressable
                style={styles.close}
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
              >
                <Text style={styles.closeText}>{sent ? 'Done' : 'Cancel'}</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(31, 36, 55, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  blurb: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginTop: 8 },
  input: {
    marginTop: 16,
    minHeight: 120,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  label: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 18 },
  pills: { flexDirection: 'row', gap: 8, marginTop: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.border,
  },
  pillOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  pillText: { fontSize: 15, fontWeight: '700', color: colors.textMuted },
  pillTextOn: { color: colors.card },
  send: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sendOff: { backgroundColor: colors.border },
  sendText: { color: colors.card, fontSize: 16, fontWeight: '800' },
  result: { marginTop: 12, fontSize: 14, color: colors.correct, fontWeight: '700' },
  resultBad: { color: colors.wrong },
  fine: { marginTop: 16, fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  close: { marginTop: 14, alignItems: 'center', paddingVertical: 8 },
  closeText: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
});
