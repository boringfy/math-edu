import { DailyState } from '../../types';
import {
  applyMetrics,
  CHALLENGES,
  COIN_RATES,
  comboMilestones,
  correctionAward,
  dailyForDate,
  dayKey,
  emptyMetrics,
  freshDaily,
  isComboMilestone,
  lessonAward,
  pickChallenges,
} from '../progress';

describe('combo milestones', () => {
  it('starts at three in a row, then every other answer', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(isComboMilestone)).toEqual([
      false, false, false, true, false, true, false, true,
    ]);
  });

  it('counts how many a run passed through', () => {
    expect(comboMilestones(0)).toBe(0);
    expect(comboMilestones(2)).toBe(0);
    expect(comboMilestones(3)).toBe(1);
    expect(comboMilestones(4)).toBe(1);
    expect(comboMilestones(5)).toBe(2);
    expect(comboMilestones(9)).toBe(4);
  });
});

describe('lessonAward', () => {
  it('pays per correct answer', () => {
    const award = lessonAward({ correctCount: 4, total: 8, bestCombo: 0, firstClear: false });
    expect(award.correct).toBe(4 * COIN_RATES.correct);
    expect(award.total).toBe(award.correct);
  });

  it('pays a bonus for a clean run and for clearing a lesson first time', () => {
    const award = lessonAward({ correctCount: 6, total: 6, bestCombo: 6, firstClear: true });
    expect(award.perfect).toBe(COIN_RATES.perfect);
    expect(award.firstClear).toBe(COIN_RATES.firstClear);
    expect(award.combo).toBe(comboMilestones(6) * COIN_RATES.comboMilestone);
    expect(award.total).toBe(award.correct + award.combo + award.perfect + award.firstClear);
  });

  it('pays no perfect bonus when anything was missed', () => {
    expect(lessonAward({ correctCount: 5, total: 6, bestCombo: 0, firstClear: false }).perfect)
      .toBe(0);
  });

  it('earns more for fewer mistakes on the same lesson', () => {
    const strong = lessonAward({ correctCount: 8, total: 8, bestCombo: 8, firstClear: false });
    const weak = lessonAward({ correctCount: 3, total: 8, bestCombo: 1, firstClear: false });
    expect(strong.total).toBeGreaterThan(weak.total);
  });

  it('never goes negative on a bad run', () => {
    expect(lessonAward({ correctCount: 0, total: 8, bestCombo: 0, firstClear: false }).total)
      .toBe(0);
  });

  it('pays for mistakes put right in practice', () => {
    expect(correctionAward(3).total).toBe(3 * COIN_RATES.fixed);
    expect(correctionAward(0).total).toBe(0);
  });
});

describe('daily challenges', () => {
  const day = '2026-08-02';

  it('picks three, one from each bucket, the same way all day', () => {
    const ids = pickChallenges(day);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    expect(pickChallenges(day)).toEqual(ids);
    ids.forEach((id) => expect(CHALLENGES[id]).toBeDefined());
  });

  it('varies the goals across a month', () => {
    const sets = new Set(
      Array.from({ length: 31 }, (_, i) => pickChallenges(`2026-08-${String(i + 1).padStart(2, '0')}`).join()),
    );
    expect(sets.size).toBeGreaterThan(1);
  });

  it('keeps every goal reachable in a single sitting', () => {
    for (const def of Object.values(CHALLENGES)) {
      expect(def.target).toBeLessThanOrEqual(60);
      expect(def.reward).toBeGreaterThan(0);
    }
  });

  it('formats the day key as a local calendar date', () => {
    expect(dayKey(new Date(2026, 7, 2))).toBe('2026-08-02');
    expect(dayKey(new Date(2026, 11, 25))).toBe('2026-12-25');
  });

  it('resets when the stored state is from another day', () => {
    const yesterday: DailyState = {
      date: '2026-08-01',
      challengeIds: ['finishLesson'],
      progress: { finishLesson: 1 },
      claimed: ['finishLesson'],
    };
    expect(dailyForDate(yesterday, day).progress).toEqual({});
    expect(dailyForDate(yesterday, day).date).toBe(day);
    expect(dailyForDate(yesterday, '2026-08-01')).toBe(yesterday);
    expect(dailyForDate(null, day).date).toBe(day);
  });
});

describe('applyMetrics', () => {
  const stateWith = (ids: string[]): DailyState => ({
    date: '2026-08-02',
    challengeIds: ids,
    progress: {},
    claimed: [],
  });

  it('adds up countable goals across sessions', () => {
    const first = applyMetrics(stateWith(['correct15']), {
      ...emptyMetrics(),
      correctAnswers: 6,
    });
    expect(first.state.progress.correct15).toBe(6);
    expect(first.completed).toHaveLength(0);

    const second = applyMetrics(first.state, { ...emptyMetrics(), correctAnswers: 9 });
    expect(second.state.progress.correct15).toBe(15);
    expect(second.completed.map((c) => c.id)).toEqual(['correct15']);
    expect(second.coins).toBe(CHALLENGES.correct15.reward);
  });

  it('keeps the best streak rather than adding streaks up', () => {
    const first = applyMetrics(stateWith(['combo5']), { ...emptyMetrics(), bestCombo: 4 });
    expect(first.state.progress.combo5).toBe(4);
    expect(first.completed).toHaveLength(0);

    const worse = applyMetrics(first.state, { ...emptyMetrics(), bestCombo: 2 });
    expect(worse.state.progress.combo5).toBe(4);

    const better = applyMetrics(worse.state, { ...emptyMetrics(), bestCombo: 6 });
    expect(better.state.progress.combo5).toBe(6);
    expect(better.completed.map((c) => c.id)).toEqual(['combo5']);
  });

  it('pays each goal once, however much further it is pushed', () => {
    const done = applyMetrics(stateWith(['finishLesson']), {
      ...emptyMetrics(),
      lessonsCleared: 1,
    });
    expect(done.coins).toBe(CHALLENGES.finishLesson.reward);

    const again = applyMetrics(done.state, { ...emptyMetrics(), lessonsCleared: 1 });
    expect(again.coins).toBe(0);
    expect(again.completed).toHaveLength(0);
  });

  it('leaves goals the day did not draw untouched', () => {
    const result = applyMetrics(stateWith(['finishLesson']), {
      ...emptyMetrics(),
      lessonsCleared: 1,
      mistakesFixed: 5,
    });
    expect(result.state.progress.fixTwo).toBeUndefined();
  });

  it('starts a fresh day empty', () => {
    const fresh = freshDaily('2026-08-02');
    expect(fresh.progress).toEqual({});
    expect(fresh.claimed).toEqual([]);
    expect(fresh.challengeIds).toHaveLength(3);
  });
});
