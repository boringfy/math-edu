/**
 * A Speed Match round on screen.
 *
 * Two things have to hold that nothing else in the app does: running out of
 * time answers for you and moves on, while scratch paper remains available.
 */

import { act, create, ReactTestRenderer } from 'react-test-renderer';
import CountdownBar from '../../components/CountdownBar';
import ScratchPad from '../../components/ScratchPad';
import QuizScreen from '../QuizScreen';
import { AnswerRecord, Question } from '../../types';

const question = (id: string, limitSeconds?: number): Question => ({
  id,
  prompt: '12 + 5 = ?',
  correctAnswer: '17',
  choices: ['17', '16', '18', '7'],
  explanation: '12 + 5 = 17',
  answerFormat: 'integer',
  mode: 'choice',
  ...(limitSeconds === undefined ? {} : { limitSeconds }),
});

const mounted: ReactTestRenderer[] = [];

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(element);
  });
  mounted.push(tree);
  return tree;
}

afterEach(() => {
  act(() => {
    mounted.splice(0).forEach((tree) => tree.unmount());
  });
  jest.useRealTimers();
});

const quiz = (questions: Question[], onComplete = jest.fn()) =>
  render(
    <QuizScreen
      subject="math"
      grade={3}
      scratchPaper
      penOnly={false}
      questions={questions}
      onComplete={onComplete}
      onQuit={() => {}}
    />,
  );

const speedQuestions = [question('a', 3), question('b', 3)];

describe('the clock', () => {
  it('shows a countdown on a speed question', () => {
    const tree = quiz(speedQuestions);
    expect(tree.root.findAllByType(CountdownBar)).toHaveLength(1);
    expect(tree.root.findByType(CountdownBar).props.seconds).toBe(3);
  });

  it('shows none on an ordinary question', () => {
    const tree = quiz([question('a'), question('b')]);
    expect(tree.root.findAllByType(CountdownBar)).toHaveLength(0);
  });

  it('records a miss and moves on when time runs out', () => {
    jest.useFakeTimers();
    try {
      const done = jest.fn();
      const tree = quiz(speedQuestions, done);
      act(() => {
        jest.advanceTimersByTime(3500);
      });
      // Second question now, with a clock of its own.
      expect(tree.root.findAllByType(CountdownBar)).toHaveLength(1);
      act(() => {
        jest.advanceTimersByTime(3500);
      });
      expect(done).toHaveBeenCalled();
      const records = done.mock.calls[0][0] as AnswerRecord[];
      expect(records).toHaveLength(2);
      // `chosen: null` is what the correction round already renders as a dash.
      expect(records.every((r) => r.chosen === null && !r.correct)).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('gives each question its own fresh clock', () => {
    jest.useFakeTimers();
    try {
      const tree = quiz(speedQuestions);
      const first = tree.root.findByType(CountdownBar);
      act(() => {
        jest.advanceTimersByTime(3500);
      });
      const second = tree.root.findByType(CountdownBar);
      // A remount, not the same instance carrying its old countdown over.
      expect(second).not.toBe(first);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('answering and the clock racing each other', () => {
  /**
   * A tap landing in the same tick as the expiry used to file two answers for
   * one question, leaving the round with more records than questions.
   */
  it('takes only one answer per question', () => {
    jest.useFakeTimers();
    try {
      const done = jest.fn();
      const tree = quiz([question('a', 3)], done);
      const button = tree.root.find(
        (n) => typeof n.type !== 'string' && n.props.label === '17',
      );
      act(() => {
        button.props.onPress('17');
        jest.advanceTimersByTime(4000);
      });
      expect(done).toHaveBeenCalledTimes(1);
      expect((done.mock.calls[0][0] as AnswerRecord[])).toHaveLength(1);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('scratch paper', () => {
  it('keeps paper available on a speed round', () => {
    const tree = quiz(speedQuestions);
    expect(tree.root.findAllByType(ScratchPad)).toHaveLength(1);
  });

  it('still lays it out on an ordinary maths round', () => {
    const tree = quiz([question('a'), question('b')]);
    expect(tree.root.findAllByType(ScratchPad)).toHaveLength(1);
  });
});
