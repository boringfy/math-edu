import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TOPIC_LOOKS, fetchLesson } from '../lib/tutor';
import { speakStep, stopSpeaking } from '../lib/voice';
import { colors } from '../theme';
import { Grade, Question, tutorTopicOf } from '../types';

interface Props {
  question: Question;
  grade: Grade;
  /** Also fired by the ✕; whatever is being said stops mid-word. */
  onClose: () => void;
}

/** A beat of silence between steps, so they land as separate thoughts. */
const STEP_GAP_MS = 450;

type Phase = 'thinking' | 'error' | 'talking' | 'done';

/**
 * The AI tutor's lesson, as an overlay on the stuck question.
 *
 * The lesson is fetched when the owl is asked, not before — most questions
 * never need one. While the model thinks, the owl visibly thinks too; then
 * the steps arrive one at a time, each spoken aloud as it appears, because
 * the child this is for may not read fluently enough to be handed a
 * paragraph. The question underneath stays visible around the card.
 */
export default function TutorLesson({ question, grade, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('thinking');
  const [steps, setSteps] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  // Closing must silence a voice that is mid-sentence and cancel a fetch
  // that is mid-flight; both check this rather than racing the unmount.
  const closed = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const look = TOPIC_LOOKS[tutorTopicOf(question.id)];

  const play = useCallback((lesson: string[], index: number) => {
    if (closed.current) return;
    setPhase('talking');
    setCurrent(index);
    speakStep(lesson[index], () => {
      if (closed.current) return;
      if (index + 1 < lesson.length) {
        timer.current = setTimeout(() => play(lesson, index + 1), STEP_GAP_MS);
      } else {
        setPhase('done');
      }
    });
  }, []);

  const fetchAndPlay = useCallback(() => {
    setPhase('thinking');
    fetchLesson(question, grade)
      .then((lesson) => {
        if (closed.current) return;
        setSteps(lesson);
        play(lesson, 0);
      })
      .catch(() => {
        if (!closed.current) setPhase('error');
      });
  }, [question, grade, play]);

  useEffect(() => {
    closed.current = false;
    fetchAndPlay();
    return () => {
      closed.current = true;
      if (timer.current) clearTimeout(timer.current);
      stopSpeaking();
    };
  }, [fetchAndPlay]);

  const close = () => {
    closed.current = true;
    if (timer.current) clearTimeout(timer.current);
    stopSpeaking();
    onClose();
  };

  const replay = () => {
    stopSpeaking();
    play(steps, 0);
  };

  const busy = phase === 'thinking' || phase === 'talking';

  return (
    <Modal transparent visible animationType="fade" onRequestClose={close}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <View style={styles.header}>
            <TutorOwl bobbing={busy} />
            <View style={styles.headerText}>
              <Text style={styles.title}>{look.icon} {look.title}</Text>
              <Text style={styles.subtitle}>
                {phase === 'thinking' && 'Hmm, let me think about this one'}
                {phase === 'talking' && 'Listen with me…'}
                {phase === 'done' && 'That was the whole trick!'}
                {phase === 'error' && 'Oh no, my thoughts got tangled'}
              </Text>
            </View>
            <Pressable
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel="Close the helper"
              onPress={close}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {phase === 'thinking' && <ThinkingDots />}

          {phase === 'error' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                I couldn't get my explanation ready. Shall we try once more?
              </Text>
              <Pressable style={styles.button} onPress={fetchAndPlay}>
                <Text style={styles.buttonText}>Try again</Text>
              </Pressable>
            </View>
          )}

          {(phase === 'talking' || phase === 'done') && (
            <>
              <ScrollView style={styles.steps} contentContainerStyle={styles.stepsContent}>
                {steps.slice(0, current + 1).map((step, i) => (
                  <StepRow
                    key={i}
                    index={i}
                    text={step}
                    active={phase === 'talking' && i === current}
                  />
                ))}
              </ScrollView>
              {phase === 'done' && (
                <View style={styles.footer}>
                  <Pressable style={styles.againButton} onPress={replay}>
                    <Text style={styles.againButtonText}>🔁 Hear it again</Text>
                  </Pressable>
                  <Pressable style={styles.button} onPress={close}>
                    <Text style={styles.buttonText}>Got it!</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

/** The tutor themself: an owl that bobs while thinking or talking. */
function TutorOwl({ bobbing }: { bobbing: boolean }) {
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!bobbing) {
      bob.stopAnimation(() => bob.setValue(0));
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bobbing, bob]);

  return (
    <Animated.Text
      style={[
        styles.owl,
        {
          transform: [
            { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
            { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) },
          ],
        },
      ]}
    >
      🦉
    </Animated.Text>
  );
}

/** "…" that swells dot by dot while the model is off thinking. */
function ThinkingDots() {
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const tick = setInterval(() => setDots((d) => (d % 3) + 1), 450);
    return () => clearInterval(tick);
  }, []);
  return (
    <View style={styles.thinking}>
      <Text style={styles.thinkingText}>{'●'.repeat(dots)}</Text>
      <Text style={styles.thinkingHint}>Good thinking takes a moment — mine too!</Text>
    </View>
  );
}

/** One step of the lesson, springing in as its turn to be spoken comes. */
function StepRow({ index, text, active }: { index: number; text: string; active: boolean }) {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enter, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }).start();
  }, [enter]);

  return (
    <Animated.View
      style={[
        styles.step,
        active && styles.stepActive,
        {
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          ],
        },
      ]}
    >
      <View style={[styles.stepBadge, active && styles.stepBadgeActive]}>
        <Text style={[styles.stepBadgeText, active && styles.stepBadgeTextActive]}>
          {index + 1}
        </Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  owl: { fontSize: 40 },
  headerText: { flex: 1 },
  title: { fontSize: 19, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 15, fontWeight: '800', color: colors.textMuted, lineHeight: 18 },
  thinking: { alignItems: 'center', paddingVertical: 28 },
  thinkingText: { fontSize: 24, color: colors.primary, letterSpacing: 6 },
  thinkingHint: { fontSize: 13, color: colors.textMuted, marginTop: 10 },
  errorBox: { paddingVertical: 16 },
  errorText: { fontSize: 15, color: colors.text, textAlign: 'center', lineHeight: 21 },
  steps: { marginTop: 14 },
  stepsContent: { gap: 10, paddingBottom: 4 },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  stepActive: { borderColor: colors.primary, backgroundColor: '#eef1ff' },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeActive: { backgroundColor: colors.primary },
  stepBadgeText: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
  stepBadgeTextActive: { color: '#fff' },
  stepText: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text, lineHeight: 23 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 14 },
  button: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  againButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  againButtonText: { color: colors.text, fontSize: 16, fontWeight: '800' },
});
