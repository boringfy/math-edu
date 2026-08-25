import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import ChoiceButton from '../components/ChoiceButton';
import CutBoard from '../components/CutBoard';
import NumberPad from '../components/NumberPad';
import PuzzleBoard from '../components/PuzzleBoard';
import ScratchPad from '../components/ScratchPad';
import StoryPassage from '../components/StoryPassage';
import { Chord } from '../lib/cakeCuts';
import { isAnswerCorrect, isDrawingCorrect, reshuffleChoices } from '../lib/questions';
import { colors, promptAlign, promptTextStyle } from '../theme';
import { Passage, Question, Subject } from '../types';

export interface CorrectionOutcome {
  questionId: string;
  attempts: number;
  fixed: boolean;
  skipped: boolean;
}

interface Props {
  /** Only maths gets scrap paper; a story or a puzzle is nothing to work out. */
  subject: Subject;
  /** Whether scrap paper is offered at all, and what may draw on it. */
  scratchPaper: boolean;
  penOnly: boolean;
  questions: Question[];
  /** The story these questions came from, if this was a reading round. */
  passage?: Passage;
  onDone: (outcomes: CorrectionOutcome[]) => void;
}

const MAX_ATTEMPTS = 3;

type Feedback = 'none' | 'tryAgain' | 'fixed' | 'skipped';

/**
 * Re-asks each missed question with immediate feedback. A wrong answer shows
 * the explanation and offers another try (with the choices reshuffled, or the
 * number pad cleared); after MAX_ATTEMPTS wrong tries the question is skipped
 * and the answer revealed.
 */
export default function CorrectionScreen({
  subject,
  scratchPaper,
  penOnly,
  questions,
  passage,
  onDone,
}: Props) {
  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState<Question>(() => reshuffleChoices(questions[0]));
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>('none');
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);
  const [entry, setEntry] = useState('');
  const [cuts, setCuts] = useState<Chord[]>([]);
  // A second go at a sum is exactly where working it out by hand helps most,
  // so the paper is here too, out from the start and put away by the pencil.
  const scratchable = scratchPaper && subject === 'math';
  const [scratching, setScratching] = useState(true);
  const outcomesRef = useRef<CorrectionOutcome[]>([]);
  const { width } = useWindowDimensions();

  const isEntry = question.mode === 'entry' && question.answerFormat !== null;
  const isDrawing = question.mode === 'draw' && question.cakeTask !== undefined;

  const submit = (answer: string, correct: boolean) => {
    if (feedback === 'fixed' || feedback === 'skipped') return;
    setLastAnswer(answer);
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (correct) {
      outcomesRef.current.push({
        questionId: question.id,
        attempts: nextAttempts,
        fixed: true,
        skipped: false,
      });
      setFeedback('fixed');
    } else if (nextAttempts >= MAX_ATTEMPTS) {
      outcomesRef.current.push({
        questionId: question.id,
        attempts: nextAttempts,
        fixed: false,
        skipped: true,
      });
      setFeedback('skipped');
    } else {
      setFeedback('tryAgain');
    }
  };

  const tryAgain = () => {
    setQuestion(reshuffleChoices(question));
    setLastAnswer(null);
    setEntry('');
    setCuts([]);
    setFeedback('none');
  };

  const next = () => {
    if (index + 1 < questions.length) {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      setQuestion(reshuffleChoices(questions[nextIndex]));
      setAttempts(0);
      setLastAnswer(null);
      setEntry('');
      setCuts([]);
      setFeedback('none');
    } else {
      onDone(outcomesRef.current);
    }
  };

  const settled = feedback === 'fixed' || feedback === 'skipped';
  const nextLabel = index + 1 < questions.length ? 'Next mistake' : 'See results';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Fix your mistakes</Text>
        {scratchable && (
          <Pressable
            style={[styles.scratchToggle, scratching && styles.scratchToggleOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: scratching }}
            accessibilityLabel="Scratch paper"
            onPress={() => setScratching((open) => !open)}
          >
            <Text style={styles.scratchToggleIcon}>✏️</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.progress}>
        Mistake {index + 1} of {questions.length} · Try{' '}
        {Math.min(attempts + (settled ? 0 : 1), MAX_ATTEMPTS)} of {MAX_ATTEMPTS}
      </Text>

      {passage && <View style={styles.passage}><StoryPassage passage={passage} /></View>}

      {/* Keyed by mistake: a fresh sheet each time, last one's working gone. */}
      {scratchable && scratching && <ScratchPad key={index} penOnly={penOnly} />}

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

      {isDrawing ? (
        <CutBoard
          task={question.cakeTask!}
          cuts={cuts}
          size={Math.min(width - 48, 320)}
          state={feedback === 'none' ? 'idle' : feedback === 'fixed' ? 'correct' : 'wrong'}
          disabled={feedback !== 'none'}
          onChange={setCuts}
          onSubmit={(pieces) => submit(`${pieces} pieces`, isDrawingCorrect(question, pieces))}
        />
      ) : isEntry ? (
        <NumberPad
          value={feedback === 'none' ? entry : lastAnswer ?? entry}
          format={question.answerFormat!}
          state={feedback === 'none' ? 'idle' : feedback === 'fixed' ? 'correct' : 'wrong'}
          disabled={feedback !== 'none'}
          onChange={setEntry}
          onSubmit={() => submit(entry, isAnswerCorrect(question, entry))}
        />
      ) : (
        <View style={question.puzzle ? styles.optionGrid : undefined}>
          {question.choices.map((choice) => {
            let state: 'idle' | 'correct' | 'wrong' = 'idle';
            if (settled && choice === question.correctAnswer) state = 'correct';
            else if (
              feedback !== 'none' &&
              choice === lastAnswer &&
              choice !== question.correctAnswer
            )
              state = 'wrong';
            return (
              <View key={choice} style={question.puzzle ? styles.option : undefined}>
                <ChoiceButton
                  label={choice}
                  tile={question.puzzle?.options[choice]}
                  state={state}
                  disabled={feedback !== 'none'}
                  onPress={() => submit(choice, choice === question.correctAnswer)}
                />
              </View>
            );
          })}
        </View>
      )}

      {feedback === 'tryAgain' && (
        <View style={[styles.feedback, styles.feedbackWrong]}>
          <Text style={styles.feedbackWrongText}>Not quite! Hint: {question.explanation}</Text>
          <Pressable style={styles.button} onPress={tryAgain}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      )}
      {feedback === 'fixed' && (
        <View style={[styles.feedback, styles.feedbackCorrect]}>
          <Text style={styles.feedbackCorrectText}>🎉 Correct! {question.explanation}</Text>
          <Pressable style={styles.button} onPress={next}>
            <Text style={styles.buttonText}>{nextLabel}</Text>
          </Pressable>
        </View>
      )}
      {feedback === 'skipped' && (
        <View style={[styles.feedback, styles.feedbackSkipped]}>
          <Text style={styles.feedbackSkippedText}>
            Let's skip this one for now. The answer is {question.correctAnswer}.{' '}
            {question.explanation}
          </Text>
          <Pressable style={styles.button} onPress={next}>
            <Text style={styles.buttonText}>{nextLabel}</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // flexGrow, so the scratch paper has room going spare to stretch into.
  content: { flexGrow: 1, padding: 20, paddingTop: 24, paddingBottom: 40 },
  headerRow: { justifyContent: 'center' },
  header: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  scratchToggle: {
    position: 'absolute',
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scratchToggleOn: { backgroundColor: '#fff5d6', borderColor: '#f5b700' },
  scratchToggleIcon: { fontSize: 15 },
  progress: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  passage: { marginTop: 20 },
  promptCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginVertical: 22,
    alignItems: 'center',
  },
  prompt: { fontWeight: '800', color: colors.text },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  option: { width: '48%' },
  feedback: { borderRadius: 14, padding: 16, marginTop: 16 },
  feedbackWrong: { backgroundColor: colors.wrongBg },
  feedbackWrongText: { color: colors.wrong, fontSize: 16, fontWeight: '600' },
  feedbackCorrect: { backgroundColor: colors.correctBg },
  feedbackCorrectText: { color: colors.correct, fontSize: 16, fontWeight: '600' },
  feedbackSkipped: { backgroundColor: colors.warningBg },
  feedbackSkippedText: { color: colors.warning, fontSize: 16, fontWeight: '600' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
