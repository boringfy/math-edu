import { seedLibrary } from '../../content/testLibrary';
import { highestOpenLevel } from '../endless';
import { recoverMapProgress } from '../progressRecovery';
import { ProgressMap, QuizResult } from '../../types';

const authored = seedLibrary().lessons(2);
const cleared = Object.fromEntries(authored.map((stop) => [
  stop.id, { stars: 3 as const, bestPercent: 100, clearedAt: '2026-08-01T12:00:00.000Z' },
])) as ProgressMap;

const result = (id: string, stars: 0 | 1 | 2 | 3): QuizResult => ({
  id,
  date: '2026-09-30T18:00:00.000Z',
  subject: 'math',
  grade: 2,
  tier: 2,
  total: 10,
  correctCount: stars === 3 ? 10 : stars === 2 ? 8 : stars === 1 ? 6 : 2,
  fixedCount: 0,
  skippedCount: 0,
  elapsedMs: 60_000,
  stopId: id,
  stars,
});

describe('recoverMapProgress', () => {
  it('reopens a reached level when older composed progress is missing', () => {
    const history = [
      result('math.g2.L19.l1', 3),
      result('math.g2.L19.l2', 2),
      result('math.g2.L19.l3', 1),
      result('math.g2.L19.l4', 3),
      result('math.g2.L19.l5', 0),
    ];
    const recovered = recoverMapProgress('math', 2, authored, cleared, history);

    expect(recovered[authored[0].id]).toEqual(cleared[authored[0].id]);
    expect(recovered['math.g2.L7.l1']).toMatchObject({ stars: 1, bestPercent: 0 });
    expect(recovered['math.g2.L18.l10'].stars).toBe(1);
    expect(recovered['math.g2.L19.l1']).toMatchObject({ stars: 3, bestPercent: 100 });
    expect(recovered['math.g2.L19.l2'].stars).toBe(2);
    expect(recovered['math.g2.L19.l4'].stars).toBe(3);
    expect(recovered['math.g2.L19.l5']).toBeUndefined();
    expect(highestOpenLevel('math', 2, authored, recovered)).toBe(19);
    expect(recoverMapProgress('math', 2, authored, recovered, history)).toBe(recovered);
  });

  it('does not infer progress from a failed or different-child map result', () => {
    const history = [result('math.g2.L19.l4', 0), result('math.g3.L19.l4', 3)];
    expect(recoverMapProgress('math', 2, authored, cleared, history)).toBe(cleared);
  });
});
