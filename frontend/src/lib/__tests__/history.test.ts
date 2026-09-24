import { HISTORY_RETENTION_DAYS, recentHistory } from '../history';
import { QuizResult } from '../../types';

const result = (id: string, date: string): QuizResult => ({
  id,
  date,
  subject: 'math',
  grade: 1,
  tier: 2,
  total: 5,
  correctCount: 4,
  fixedCount: 0,
  skippedCount: 0,
  elapsedMs: 30_000,
});

describe('recentHistory', () => {
  it(`keeps only the rolling ${HISTORY_RETENTION_DAYS}-day audit history`, () => {
    const now = new Date('2026-09-23T12:00:00.000Z');
    const recent = recentHistory([
      result('today', '2026-09-23T11:00:00.000Z'),
      result('inside', '2026-08-25T12:00:00.000Z'),
      result('boundary', '2026-08-24T12:00:00.000Z'),
      result('old', '2026-08-24T11:59:59.999Z'),
      result('invalid', 'not-a-date'),
    ], now);

    expect(recent.map((entry) => entry.id)).toEqual(['today', 'inside', 'boundary']);
  });

  it('sorts newest first without limiting busy days to an entry count', () => {
    const now = new Date('2026-09-23T12:00:00.000Z');
    const history = Array.from({ length: 75 }, (_, index) =>
      result(String(index), new Date(now.getTime() - index * 1000).toISOString()),
    ).reverse();

    const recent = recentHistory(history, now);
    expect(recent).toHaveLength(75);
    expect(recent[0].id).toBe('0');
  });
});
