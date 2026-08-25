import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  biasingWords,
  PASS_PERCENT,
  passageWords,
  ReadingScore,
  scoreReading,
  tokenise,
} from '../lib/readAloud';
import {
  ensureOfflineModel,
  readAloudAvailable,
  requestMicrophone,
  startListening,
  stopListening,
  useSpeechRecognitionEvent,
} from '../lib/speech';
import { colors } from '../theme';
import { Passage } from '../types';

/**
 * A child pausing for breath ends an Android recognition turn, so turns are
 * restarted as they finish. The cap is what stops a device that cannot listen
 * at all from restarting forever.
 */
const MAX_TURNS = 12;

type Phase = 'idle' | 'preparing' | 'listening' | 'finished';

interface Props {
  passage: Passage;
  /** Reported on every change so the screen above can react to a pass. */
  onScore?: (score: ReadingScore) => void;
}

/**
 * The story, with the words lighting up as they are read out loud.
 *
 * Entirely optional: the reader above this can always be skipped, and on a
 * device that cannot recognise speech without a network this renders as an
 * ordinary passage with no microphone in sight.
 */
export default function ReadAloud({ passage, onScore }: Props) {
  const words = useMemo(() => passageWords(passage.text), [passage.text]);
  const tokens = useMemo(() => tokenise(passage.text), [passage.text]);
  const bias = useMemo(() => biasingWords(words), [words]);
  // Asked once: whether a microphone exists doesn't change mid-story.
  const available = useMemo(() => readAloudAvailable(), []);

  const [phase, setPhase] = useState<Phase>('idle');
  const [committed, setCommitted] = useState('');
  const [interim, setInterim] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  // Whether the child still means to be reading, which is what tells an
  // ending turn from a finished session.
  const listening = useRef(false);
  const turns = useRef(0);

  const score = useMemo(
    () => scoreReading(words, `${committed} ${interim}`),
    [words, committed, interim],
  );

  // Held in a ref so an inline callback from the screen above can't turn every
  // render into another round of reporting.
  const report = useRef(onScore);
  report.current = onScore;
  useEffect(() => {
    report.current?.(score);
  }, [score]);

  // Readable from inside the recogniser's callbacks, which close over whatever
  // render registered them.
  const passed = useRef(false);
  passed.current = score.passed;

  // Stop the microphone if the child navigates away mid-sentence.
  useEffect(
    () => () => {
      listening.current = false;
      stopListening();
    },
    [],
  );

  useSpeechRecognitionEvent('result', (event) => {
    const heard = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      // Android hands back a finished segment and starts a new one, so
      // finished text is kept and only the live tail is replaced.
      setCommitted((prior) => `${prior} ${heard}`);
      setInterim('');
    } else {
      setInterim(heard);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    // Silence is not a failure — children pause, think, and start again.
    if (event.error === 'no-speech' || event.error === 'speech-timeout') return;
    listening.current = false;
    setPhase('finished');
    // The recogniser often gives up right as a child finishes the last line.
    // Warning them it stopped, directly above "Brilliant reading", reads as
    // though something went wrong when nothing did.
    setNotice(
      passed.current
        ? null
        : "The tablet stopped listening. You can read it out loud again if you'd like.",
    );
  });

  useSpeechRecognitionEvent('end', () => {
    if (!listening.current) return;
    if (turns.current >= MAX_TURNS) {
      listening.current = false;
      setPhase('finished');
      return;
    }
    turns.current += 1;
    startListening(bias);
  });

  const begin = async () => {
    setPhase('preparing');
    setNotice(null);

    if (!(await requestMicrophone())) {
      setPhase('idle');
      setNotice('Boring Quest needs the microphone to hear you read.');
      return;
    }

    const model = await ensureOfflineModel();
    if (model !== 'ready') {
      setPhase('idle');
      setNotice(
        model === 'downloading'
          ? 'Getting the words ready — try again in a moment.'
          : "This tablet can't listen without the internet, so reading out loud isn't available here.",
      );
      return;
    }

    setCommitted('');
    setInterim('');
    turns.current = 0;
    listening.current = true;
    setPhase('listening');
    startListening(bias);
  };

  const finish = () => {
    listening.current = false;
    stopListening();
    setPhase('finished');
  };

  const showHighlights = phase === 'listening' || phase === 'finished';

  return (
    <View>
      <View style={styles.card}>
        <Text style={styles.text}>
          {tokens.map((token, i) => (
            <Text
              key={i}
              style={
                showHighlights && token.wordIndex !== null && score.heard[token.wordIndex]
                  ? styles.heard
                  : undefined
              }
            >
              {token.text}
            </Text>
          ))}
        </Text>
      </View>

      {notice && <Text style={styles.notice}>{notice}</Text>}

      {available && phase === 'idle' && (
        <Pressable style={styles.micButton} onPress={begin}>
          <Text style={styles.micButtonText}>🎤 Read it out loud</Text>
        </Pressable>
      )}

      {phase === 'preparing' && <Text style={styles.status}>Getting ready…</Text>}

      {phase === 'listening' && (
        <View style={styles.listeningBox}>
          <Text style={styles.listeningLabel}>
            🎤 Listening… {score.percent}% of the words heard
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${score.percent}%` }]} />
          </View>
          <Pressable style={styles.stopButton} onPress={finish}>
            <Text style={styles.stopButtonText}>I've finished reading</Text>
          </Pressable>
        </View>
      )}

      {phase === 'finished' && (
        <View style={styles.listeningBox}>
          <Text style={score.passed ? styles.passText : styles.tryText}>
            {score.passed
              ? `🎉 Brilliant reading — I heard ${score.percent}% of the words!`
              : `I heard ${score.percent}% of the words. ${PASS_PERCENT}% earns the star — want another go?`}
          </Text>
          <Pressable style={styles.micButton} onPress={begin}>
            <Text style={styles.micButtonText}>🎤 Read it again</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    marginTop: 18,
  },
  // Wide line spacing and left alignment: the shape a child reads best.
  text: { fontSize: 19, lineHeight: 31, color: colors.text },
  // A soft wash rather than a hard block, so a whole read passage still reads
  // as a story rather than a highlighter accident.
  heard: { color: colors.correct, fontWeight: '800', backgroundColor: colors.correctBg },
  notice: { fontSize: 14, color: colors.warning, textAlign: 'center', marginTop: 12 },
  status: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 14 },
  micButton: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  micButtonText: { color: colors.primary, fontSize: 17, fontWeight: '800' },
  listeningBox: { marginTop: 14 },
  listeningLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    marginTop: 10,
    overflow: 'hidden',
  },
  fill: { height: 10, borderRadius: 5, backgroundColor: colors.correct },
  stopButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  stopButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  passText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.correct,
    textAlign: 'center',
  },
  tryText: { fontSize: 15, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
});
