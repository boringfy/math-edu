import { Question } from '../../types';
import { adjustTier, isAnswerCorrect, promoteToEntry } from '../grading';

const question = (over: Partial<Question>): Question => ({
  id: 'q',
  prompt: '1 + 1 = ?',
  correctAnswer: '2',
  choices: ['1', '2', '3', '4'],
  explanation: '1 + 1 = 2',
  answerFormat: 'integer',
  mode: 'choice',
  ...over,
});

describe('adjustTier', () => {
  it('steps down on too many mistakes and up on a near-perfect round', () => {
    expect(adjustTier(2, 0.4)).toBe(1);
    expect(adjustTier(2, 0.7)).toBe(2);
    expect(adjustTier(2, 0.9)).toBe(3);
  });

  it('stays within easy and hard', () => {
    expect(adjustTier(1, 0)).toBe(1);
    expect(adjustTier(3, 1)).toBe(3);
  });

  it('takes its thresholds from the rules when given some', () => {
    expect(adjustTier(2, 0.7, 0.75, 0.95)).toBe(1);
    expect(adjustTier(2, 0.96, 0.75, 0.95)).toBe(3);
    expect(adjustTier(2, 0.8, 0.75, 0.95)).toBe(2);
  });
});

describe('isAnswerCorrect', () => {
  it('compares by value, not by text', () => {
    expect(isAnswerCorrect(question({ correctAnswer: '5.0' }), '5')).toBe(true);
    expect(isAnswerCorrect(question({ correctAnswer: '1/2' }), '4/8')).toBe(true);
    expect(isAnswerCorrect(question({}), ' 2 ')).toBe(true);
    expect(isAnswerCorrect(question({}), '3')).toBe(false);
  });

  it('accepts the exact answer even when it is not a number', () => {
    expect(isAnswerCorrect(question({ correctAnswer: 'B' }), 'B')).toBe(true);
    expect(isAnswerCorrect(question({ correctAnswer: 'B' }), 'C')).toBe(false);
  });
});

describe('promoteToEntry', () => {
  it('promotes the tier share of typeable questions', () => {
    const questions = Array.from({ length: 4 }, (_, i) => question({ id: `q${i}` }));
    promoteToEntry(questions, 2, { 1: 0.25, 2: 0.5, 3: 0.75 });
    expect(questions.filter((q) => q.mode === 'entry')).toHaveLength(2);
  });

  it('leaves untypeable questions alone', () => {
    const questions = [question({ answerFormat: null })];
    promoteToEntry(questions, 3, { 1: 1, 2: 1, 3: 1 });
    expect(questions[0].mode).toBe('choice');
  });
});
