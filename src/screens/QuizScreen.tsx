import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import ChoiceButton from '../components/ChoiceButton';
import CutBoard from '../components/CutBoard';
import ElapsedTimer from '../components/ElapsedTimer';
import NumberPad from '../components/NumberPad';
import { Chord } from '../lib/cakeCuts';
import { isAnswerCorrect, isDrawingCorrect } from '../lib/questions';
import { colors, promptTextStyle } from '../theme';
import { AnswerRecord, Question } from '../types';

/** Keeps the cake comfortably inside the screen on phones and tablets alike. */
const cakeSize = (width: number) => Math.min(width - 48, 320);

interface Props {
  questions: Question[];
  onComplete: (records: AnswerRecord[], elapsedMs: number) => void;
}

/**
 * One question at a time, answered either by tapping a choice or by typing
 * on the number pad. Answers are recorded silently — right/wrong is only
 * revealed on the results screen, so the quiz feels like a test.
 */
export default function QuizScreen({ questions, onComplete }: Props) {
  const startedAt = useRef(Date.now()).current;
  const [index, setIndex] = useState(0);
  const [entry, setEntry] = useState('');
  const [cuts, setCuts] = useState<Chord[]>([]);
  const recordsRef = useRef<AnswerRecord[]>([]);
  const { width } = useWindowDimensions();

  const question = questions[index];
  const isEntry = question.mode === 'entry' && question.answerFormat !== null;
  const isDrawing = question.mode === 'draw' && question.cakeTask !== undefined;

  const record = (answer: string, correct: boolean) => {
    recordsRef.current.push({ question, chosen: answer, correct });
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setEntry('');
      setCuts([]);
    } else {
      onComplete(recordsRef.current, Date.now() - startedAt);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.progress}>
          Question {index + 1} of {questions.length}
        </Text>
        <ElapsedTimer startedAt={startedAt} />
      </View>
      <View style={styles.progressBarTrack}>
        <View
          style={[styles.progressBarFill, { width: `${(index / questions.length) * 100}%` }]}
        />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.promptCard}>
          <Text style={[styles.prompt, promptTextStyle(question.prompt)]}>{question.prompt}</Text>
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

        {!isEntry &&
          !isDrawing &&
          question.choices.map((choice) => (
            <ChoiceButton
              key={choice}
              label={choice}
              onPress={() => record(choice, choice === question.correctAnswer)}
            />
          ))}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progress: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
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
  prompt: { fontWeight: '800', color: colors.text, textAlign: 'center' },
});
