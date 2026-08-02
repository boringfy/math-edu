import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
// The app draws edge-to-edge on Android, so real insets are needed to keep
// the number pad clear of the navigation bar.
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { adjustTier, generateQuiz } from './src/lib/questions';
import { loadHistory, loadTier, saveResult, saveTier } from './src/lib/storage';
import CorrectionScreen, { CorrectionOutcome } from './src/screens/CorrectionScreen';
import HomeScreen from './src/screens/HomeScreen';
import QuizScreen from './src/screens/QuizScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import { colors } from './src/theme';
import { AnswerRecord, Grade, QuizResult, Tier } from './src/types';

type Phase = 'home' | 'quiz' | 'results' | 'correction';

const GRADES: Grade[] = [1, 2, 3, 4, 5];

interface Session {
  resultId: string;
  grade: Grade;
  tier: Tier;
  questions: ReturnType<typeof generateQuiz>;
  records: AnswerRecord[];
  elapsedMs: number;
  tierChange: 'up' | 'down' | null;
  afterCorrection: boolean;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('home');
  const [history, setHistory] = useState<QuizResult[]>([]);
  const [tiers, setTiers] = useState<Record<Grade, Tier>>({ 1: 2, 2: 2, 3: 2, 4: 2, 5: 2 });
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    (async () => {
      setHistory(await loadHistory());
      const loaded = await Promise.all(GRADES.map((g) => loadTier(g)));
      setTiers({ 1: loaded[0], 2: loaded[1], 3: loaded[2], 4: loaded[3], 5: loaded[4] });
    })();
  }, []);

  const startQuiz = (grade: Grade, count: number) => {
    const tier = tiers[grade];
    setSession({
      resultId: `r${Date.now()}`,
      grade,
      tier,
      questions: generateQuiz(grade, tier, count),
      records: [],
      elapsedMs: 0,
      tierChange: null,
      afterCorrection: false,
    });
    setPhase('quiz');
  };

  const resultFromSession = (s: Session): QuizResult => {
    const mistakes = s.records.filter((r) => !r.correct);
    return {
      id: s.resultId,
      date: new Date().toISOString(),
      grade: s.grade,
      tier: s.tier,
      total: s.records.length,
      correctCount: s.records.length - mistakes.length,
      fixedCount: mistakes.filter((r) => r.fixed).length,
      skippedCount: mistakes.filter((r) => r.skipped).length,
      elapsedMs: s.elapsedMs,
    };
  };

  const persist = async (s: Session, newTier: Tier) => {
    const result = resultFromSession(s);
    await saveResult(result);
    setHistory([result, ...history.filter((r) => r.id !== result.id)]);
    if (newTier !== s.tier) {
      await saveTier(s.grade, newTier);
      setTiers({ ...tiers, [s.grade]: newTier });
    }
  };

  const onQuizComplete = (records: AnswerRecord[], elapsedMs: number) => {
    if (!session) return;
    const accuracy = records.filter((r) => r.correct).length / records.length;
    const newTier = adjustTier(session.tier, accuracy);
    const tierChange = newTier > session.tier ? 'up' : newTier < session.tier ? 'down' : null;
    const updated: Session = { ...session, records, elapsedMs, tierChange };
    setSession(updated);
    setPhase('results');
    persist(updated, newTier);
  };

  const onCorrectionDone = (outcomes: CorrectionOutcome[]) => {
    if (!session) return;
    const byId = new Map(outcomes.map((o) => [o.questionId, o]));
    const records = session.records.map((r) => {
      const o = byId.get(r.question.id);
      return o ? { ...r, attempts: o.attempts, fixed: o.fixed, skipped: o.skipped } : r;
    });
    const updated: Session = { ...session, records, afterCorrection: true };
    setSession(updated);
    setPhase('results');
    persist(updated, updated.tier);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        {phase === 'home' && <HomeScreen history={history} tiers={tiers} onStart={startQuiz} />}
        {phase === 'quiz' && session && (
          <QuizScreen questions={session.questions} onComplete={onQuizComplete} />
        )}
        {phase === 'results' && session && (
          <ResultsScreen
            records={session.records}
            elapsedMs={session.elapsedMs}
            tierChange={session.tierChange}
            afterCorrection={session.afterCorrection}
            onFixMistakes={() => setPhase('correction')}
            onHome={() => {
              setSession(null);
              setPhase('home');
            }}
          />
        )}
        {phase === 'correction' && session && (
          <CorrectionScreen
            questions={session.records.filter((r) => !r.correct).map((r) => r.question)}
            onDone={onCorrectionDone}
          />
        )}
        <StatusBar style="dark" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
