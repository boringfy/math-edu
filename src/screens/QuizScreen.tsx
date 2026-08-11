import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import ChoiceButton from '../components/ChoiceButton';
import ComboBurst from '../components/ComboBurst';
import CutBoard from '../components/CutBoard';
import ElapsedTimer from '../components/ElapsedTimer';
import NumberPad from '../components/NumberPad';
import PuzzleBoard from '../components/PuzzleBoard';
import ReadAloud from '../components/ReadAloud';
import StoryPassage from '../components/StoryPassage';
import { Chord } from '../lib/cakeCuts';
import { isComboMilestone } from '../lib/progress';
import { isAnswerCorrect, isDrawingCorrect } from '../lib/questions';
import { colors, promptAlign, promptTextStyle } from '../theme';
import { AnswerRecord, Passage, Question } from '../types';

/** Keeps the cake comfortably inside the screen on phones and tablets alike. */
const cakeSize = (width: number) => Math.min(width - 48, 320);

interface Props {
  questions: Question[];
  /**
   * Set for a reading round: the story is shown on its own first, and then
   * stays above every question so answering is comprehension, not recall.
   */
  passage?: Passage;
  onComplete: (records: AnswerRecord[], elapsedMs: number, bestCombo: number) => void;
}

/**
 * One question at a time, answered either by tapping a choice or by typing
 * on the number pad. Which answers were right is still saved for the results
 * screen rather than marked here — the only live feedback is the combo, which
 * celebrates a run without pointing out any single mistake.
 */
export default function QuizScreen({ questions, passage, onComplete }: Props) {
  const startedAt = useRef(Date.now()).current;
  // The story is read before the first question; the clock runs through it,
  // because time spent reading is part of the round.
  const [reading, setReading] = useState(passage !== undefined);
  // Whether the story was also read out loud well enough to count. Reading
  // aloud is never required — it only ever adds a star to the button.
  const [readAloud, setReadAloud] = useState(false);
  const [index, setIndex] = useState(0);
  const [entry, setEntry] = useState('');
  const [cuts, setCuts] = useState<Chord[]>([]);
  const [combo, setCombo] = useState(0);
  // `nonce` re-triggers the burst even when two milestones share a length.
  const [burst, setBurst] = useState({ combo: 0, nonce: 0 });
  const recordsRef = useRef<AnswerRecord[]>([]);
  const bestComboRef = useRef(0);
  const { width } = useWindowDimensions();

  const question = questions[index];
  const isEntry = question.mode === 'entry' && question.answerFormat !== null;
  const isDrawing = question.mode === 'draw' && question.cakeTask !== undefined;

  const record = (answer: string, correct: boolean) => {
    recordsRef.current.push({ question, chosen: answer, correct });

    const streak = correct ? combo + 1 : 0;
    setCombo(streak);
    bestComboRef.current = Math.max(bestComboRef.current, streak);
    if (correct && isComboMilestone(streak)) {
      setBurst((b) => ({ combo: streak, nonce: b.nonce + 1 }));
    }

    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setEntry('');
      setCuts([]);
    } else {
      onComplete(recordsRef.current, Date.now() - startedAt, bestComboRef.current);
    }
  };

  if (reading && passage) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.readContent}>
          <Text style={styles.readIcon}>{passage.icon}</Text>
          <Text style={styles.readTitle}>{passage.title}</Text>
          <ReadAloud passage={passage} onScore={(score) => setReadAloud(score.passed)} />
          <Text style={styles.readHint}>
            Read it as many times as you like. You can look back at any time.
          </Text>
        </ScrollView>
        <Pressable style={styles.readButton} onPress={() => setReading(false)}>
          <Text style={styles.readButtonText}>
            {readAloud ? '⭐ ' : ''}I've read it — {questions.length} question
            {questions.length > 1 ? 's' : ''}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.progress}>
          Question {index + 1} of {questions.length}
        </Text>
        <View style={styles.headerRight}>
          {combo >= 2 && (
            <View style={styles.comboChip}>
              <Text style={styles.comboChipText}>🔥 {combo}</Text>
            </View>
          )}
          <ElapsedTimer startedAt={startedAt} />
        </View>
      </View>
      <View style={styles.progressBarTrack}>
        <View
          style={[styles.progressBarFill, { width: `${(index / questions.length) * 100}%` }]}
        />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {passage && <StoryPassage passage={passage} />}

        <View style={styles.promptCard}>
          <Text
            style={[
              styles.prompt,
              promptTextStyle(question.prompt),
              { textAlign: promptAlign(question.prompt) },
            ]}
          >
            {question.prompt}
          </Text>
          {question.puzzle && <PuzzleBoard puzzle={question.puzzle} />}
        </View>

        {isDrawing && (
          <CutBoard
            task={question.cakeTask!}
            cuts={cuts}
            size={cakeSize(width)}
            onChange={setCuts}
            onSubmit={(pieces) =>
              record(`${pieces} pieces`, isDrawingCorrect(question, pieces))
            }
            submitLabel={index + 1 < questions.length ? 'Next question' : 'Finish quiz'}
          />
        )}

        {!isEntry && !isDrawing && (
          // Drawn answers go two-by-two, so all four pictures are comparable
          // without scrolling; written ones stay full width.
          <View style={question.puzzle ? styles.optionGrid : undefined}>
            {question.choices.map((choice) => (
              <View key={choice} style={question.puzzle ? styles.option : undefined}>
                <ChoiceButton
                  label={choice}
                  tile={question.puzzle?.options[choice]}
                  onPress={() => record(choice, choice === question.correctAnswer)}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {isEntry && (
        <NumberPad
          value={entry}
          format={question.answerFormat!}
          onChange={setEntry}
          onSubmit={() => record(entry, isAnswerCorrect(question, entry))}
          submitLabel={index + 1 < questions.length ? 'Next question' : 'Finish quiz'}
        />
      )}

      <ComboBurst combo={burst.combo} nonce={burst.nonce} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progress: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  comboChip: {
    backgroundColor: '#fff5d6',
    borderWidth: 1,
    borderColor: '#f5b700',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  comboChipText: { fontSize: 14, fontWeight: '800', color: '#a86b00' },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBarFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  scroll: { flex: 1 },
  // Centred so the question doesn't sit marooned at the top of a tall screen
  // while the number pad is pinned to the bottom.
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 8 },
  promptCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginVertical: 24,
    alignItems: 'center',
  },
  prompt: { fontWeight: '800', color: colors.text },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  option: { width: '48%' },
  readContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 12 },
  readIcon: { fontSize: 44, textAlign: 'center' },
  readTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginTop: 6,
  },
  readHint: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 14 },
  readButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  readButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
