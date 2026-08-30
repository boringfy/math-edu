/**
 * The AI level planner, with no language model anywhere near it.
 *
 * What matters here is not that the model does well — it is that nothing it
 * can send does harm. A model that hallucinates a skill, renames the ids
 * progress is stored against, asks for a difficulty a factory cannot build,
 * returns nine lessons, or returns prose instead of JSON must all end with a
 * child getting a playable level. So every one of those is a test.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { CATALOG } from '../src/factories/catalog';
import { composeLevel, questionsFor } from '../src/factories/compose';
import {
  ComposeRequest,
  applyPlan,
  asComposeRequest,
  buildLevelPrompt,
  clearLevelCache,
  parsePlan,
  planLevel,
} from '../src/server/levels';
import { TutorProvider } from '../src/server/tutor';
import { app } from '../src/server/app';

const provider: TutorProvider = {
  label: 'primary',
  url: 'https://llm.example.com/v1/chat/completions',
  key: 'test-key',
  model: 'test-model',
  noThink: false,
  extra: {},
};

const request = (over: Partial<ComposeRequest> = {}): ComposeRequest => ({
  subject: 'math',
  grade: 2,
  level: 7,
  firstComposedLevel: 7,
  mastery: {},
  struggling: [],
  ...over,
});

const composed = (over: Partial<ComposeRequest> = {}) => {
  const r = request(over);
  return composeLevel({
    subject: r.subject,
    grade: r.grade,
    level: r.level,
    firstComposedLevel: r.firstComposedLevel,
    mastery: r.mastery,
  });
};

/** A fetch answering like an OpenAI-compatible provider with `content`. */
const modelSaying = (content: string) =>
  vi.fn(async () =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 }),
  ) as unknown as typeof fetch;

const goodPlan = JSON.stringify({
  theme: 'Market Day',
  lessons: Array.from({ length: 10 }, (_, i) => ({
    title: `Counting Stalls ${i + 1}`,
    skills: ['addSub'],
  })),
});

afterEach(() => {
  clearLevelCache();
  vi.unstubAllEnvs();
});

describe('what the app is allowed to ask for', () => {
  it('takes a well-formed request', () => {
    expect(asComposeRequest({ subject: 'math', grade: 2, level: 7 })).toMatchObject({
      subject: 'math',
      grade: 2,
      level: 7,
    });
  });

  it('refuses a subject with no factories behind it', () => {
    expect(asComposeRequest({ subject: 'reading', grade: 2, level: 7 })).toBeNull();
    expect(asComposeRequest({ subject: 'nonsense', grade: 2, level: 7 })).toBeNull();
  });

  it('refuses a grade or level that is not one', () => {
    expect(asComposeRequest({ subject: 'math', grade: 9, level: 7 })).toBeNull();
    expect(asComposeRequest({ subject: 'math', grade: 0, level: 7 })).toBeNull();
    expect(asComposeRequest({ subject: 'math', grade: 2, level: 0 })).toBeNull();
    expect(asComposeRequest({ subject: 'math', grade: 2, level: 1.5 })).toBeNull();
  });

  /** Mastery is advice, so a bad entry is dropped rather than a refusal. */
  it('drops nonsense out of the mastery without refusing the request', () => {
    const parsed = asComposeRequest({
      subject: 'math',
      grade: 2,
      level: 7,
      mastery: { addSub: 8, mulDiv: 'lots', word: -3, place: Infinity },
    });
    expect(parsed?.mastery).toEqual({ addSub: 8 });
  });

  it('refuses something that is not an object at all', () => {
    expect(asComposeRequest(null)).toBeNull();
    expect(asComposeRequest('level 7 please')).toBeNull();
  });
});

describe('reading the reply', () => {
  it('takes plain JSON', () => {
    expect(parsePlan('{"theme":"Hi","lessons":[]}')).toEqual({ theme: 'Hi', lessons: [] });
  });

  /** Models fence their JSON however firmly they are asked not to. */
  it('takes JSON in a code fence', () => {
    expect(parsePlan('```json\n{"theme":"Hi"}\n```')).toEqual({ theme: 'Hi' });
  });

  it('takes JSON with chatter around it', () => {
    expect(parsePlan('Sure! {"theme":"Hi"} Hope that helps.')).toEqual({ theme: 'Hi' });
  });

  it('strips the hidden reasoning some models emit', () => {
    expect(parsePlan('<think>hmm</think>{"theme":"Hi"}')).toEqual({ theme: 'Hi' });
  });

  it('gives up on prose rather than guessing', () => {
    expect(parsePlan('I think level seven should be about addition.')).toBeNull();
    expect(parsePlan('{not json at all')).toBeNull();
    expect(parsePlan('')).toBeNull();
  });
});

describe('folding a plan into a level', () => {
  const plan = (lessons: unknown[], theme: unknown = 'Market Day') => ({ theme, lessons });

  it('takes the titles and the theme', () => {
    const applied = applyPlan(
      plan(composed().map(() => ({ title: 'Counting Stalls', skills: ['addSub'] }))),
      composed(),
      'math',
    );
    expect(applied.theme).toBe('Market Day');
    expect(applied.lessons.every((l) => l.title === 'Counting Stalls')).toBe(true);
    expect(applied.source).toBe('ai');
  });

  /**
   * The ids are progress keys. A plan that could rename them would lose a
   * child's stars, so they are not the model's to touch — nor are the
   * indices, the seeds, or how many problems a lesson asks.
   */
  it('never lets a plan move an id, an index, a seed or a length', () => {
    const before = composed();
    const applied = applyPlan(
      plan(
        before.map(() => ({
          id: 'hacked',
          index: 999,
          seed: 'hacked',
          title: 'Fine',
          skills: ['addSub'],
        })),
      ),
      before,
      'math',
    );
    expect(applied.lessons.map((l) => l.id)).toEqual(before.map((l) => l.id));
    expect(applied.lessons.map((l) => l.index)).toEqual(before.map((l) => l.index));
    expect(applied.lessons.map((l) => l.seed)).toEqual(before.map((l) => l.seed));
    expect(applied.lessons.map((l) => l.slots.length)).toEqual(
      before.map((l) => l.slots.length),
    );
  });

  it('ignores a skill it invented', () => {
    const before = composed();
    const applied = applyPlan(
      plan(before.map(() => ({ title: 'Fine', skills: ['quantumAlgebra'] }))),
      before,
      'math',
    );
    expect(applied.lessons.map((l) => l.skills)).toEqual(before.map((l) => l.skills));
  });

  /** A maths lesson must never be handed a rotation puzzle. */
  it('ignores a skill from the other map', () => {
    const before = composed();
    const applied = applyPlan(
      plan(before.map(() => ({ title: 'Fine', skills: ['rotation', 'matrix'] }))),
      before,
      'math',
    );
    expect(applied.lessons.map((l) => l.skills)).toEqual(before.map((l) => l.skills));
  });

  it('keeps the difficulty the composer decided', () => {
    const before = composed();
    const applied = applyPlan(
      plan(before.map(() => ({ title: 'Fine', skills: ['addSub'] }))),
      before,
      'math',
    );
    expect(applied.lessons.flatMap((l) => l.slots.map((s) => s.d))).toEqual(
      before.flatMap((l) => l.slots.map((s) => s.d)),
    );
  });

  it('leaves lessons the plan is too short to cover', () => {
    const before = composed();
    const applied = applyPlan(plan([{ title: 'Only One', skills: ['addSub'] }]), before, 'math');
    expect(applied.lessons[0].title).toBe('Only One');
    expect(applied.lessons[5].title).toBe(before[5].title);
  });

  it('ignores extra lessons a plan invents', () => {
    const before = composed();
    const applied = applyPlan(
      plan(Array.from({ length: 40 }, () => ({ title: 'Fine', skills: ['addSub'] }))),
      before,
      'math',
    );
    expect(applied.lessons).toHaveLength(before.length);
  });

  it('refuses a title that is empty, endless or not a string', () => {
    const before = composed();
    const applied = applyPlan(
      plan([
        { title: '', skills: ['addSub'] },
        { title: 'x'.repeat(200), skills: ['addSub'] },
        { title: 42, skills: ['addSub'] },
      ]),
      before,
      'math',
    );
    expect(applied.lessons[0].title).toBe(before[0].title);
    expect(applied.lessons[1].title).toBe(before[1].title);
    expect(applied.lessons[2].title).toBe(before[2].title);
  });

  it('falls back on a theme it cannot use', () => {
    expect(applyPlan(plan([], 42), composed(), 'math').theme).toBe('Level 7');
  });

  it('survives a plan that is not a list at all', () => {
    const applied = applyPlan({ theme: 'Fine', lessons: 'nope' }, composed(), 'math');
    expect(applied.lessons).toHaveLength(10);
  });

  /** Whatever the plan says, the level still has to be playable. */
  it('leaves every lesson able to build real questions', () => {
    const applied = applyPlan(
      plan(composed().map(() => ({ title: 'Fine', skills: ['addSub', 'geometry'] }))),
      composed(),
      'math',
    );
    for (const lesson of applied.lessons) {
      const questions = questionsFor(lesson);
      expect(questions).toHaveLength(lesson.slots.length);
      for (const q of questions) {
        expect(q.prompt.trim()).not.toBe('');
        expect(q.correctAnswer).not.toBe('');
        if (q.mode !== 'draw') expect(new Set(q.choices).size).toBe(4);
      }
      for (const slot of lesson.slots) {
        const factory = CATALOG[slot.factory];
        expect(factory, slot.factory).toBeDefined();
        expect(slot.d).toBeGreaterThanOrEqual(factory.dRange[0]);
        expect(slot.d).toBeLessThanOrEqual(factory.dRange[1]);
      }
    }
  });

  it('leaves the drawn puzzles of a cake lesson alone', () => {
    const cake = composeLevel({
      subject: 'math',
      grade: 2,
      level: 8,
      firstComposedLevel: 7,
      mastery: {},
    });
    const applied = applyPlan(
      plan(cake.map(() => ({ title: 'Fine', skills: ['addSub'] }))),
      cake,
      'math',
    );
    const drawnBefore = cake.flatMap((l) => l.slots.filter((s) => s.factory === 'cakeCut'));
    const drawnAfter = applied.lessons.flatMap((l) =>
      l.slots.filter((s) => s.factory === 'cakeCut'),
    );
    expect(drawnAfter).toEqual(drawnBefore);
  });
});

describe('planning a level end to end', () => {
  it('uses the model when it answers well', async () => {
    const plan = await planLevel(request(), [provider], modelSaying(goodPlan));
    expect(plan.source).toBe('ai');
    expect(plan.theme).toBe('Market Day');
    expect(plan.lessons[0].title).toBe('Counting Stalls 1');
  });

  /** No key, no network, no problem: the composed level is a real level. */
  it('composes without a model at all', async () => {
    const plan = await planLevel(request(), []);
    expect(plan.source).toBe('local');
    expect(plan.lessons).toHaveLength(10);
    expect(questionsFor(plan.lessons[0]).length).toBeGreaterThan(0);
  });

  it('composes when the model refuses', async () => {
    const failing = vi.fn(async () => new Response('nope', { status: 429 })) as unknown as typeof fetch;
    const plan = await planLevel(request(), [provider], failing);
    expect(plan.source).toBe('local');
    expect(plan.lessons).toHaveLength(10);
  });

  it('composes when the model sends prose', async () => {
    const plan = await planLevel(request(), [provider], modelSaying('Sounds fun!'));
    expect(plan.source).toBe('local');
  });

  it('composes when the model sends nothing', async () => {
    const plan = await planLevel(request(), [provider], modelSaying(''));
    expect(plan.source).toBe('local');
  });

  it('falls to the second model before giving up', async () => {
    let call = 0;
    const fetchFn = vi.fn(async () => {
      call++;
      if (call === 1) return new Response('nope', { status: 500 });
      return new Response(JSON.stringify({ choices: [{ message: { content: goodPlan } }] }), {
        status: 200,
      });
    }) as unknown as typeof fetch;

    const plan = await planLevel(
      request(),
      [provider, { ...provider, label: 'fallback 2', model: 'spare' }],
      fetchFn,
    );
    expect(plan.source).toBe('ai');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('asks once and remembers the answer', async () => {
    const fetchFn = modelSaying(goodPlan);
    await planLevel(request(), [provider], fetchFn);
    await planLevel(request(), [provider], fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('asks again for a different level', async () => {
    const fetchFn = modelSaying(goodPlan);
    await planLevel(request({ level: 7 }), [provider], fetchFn);
    await planLevel(request({ level: 8 }), [provider], fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('plans a logic level out of puzzle families', async () => {
    const plan = await planLevel(request({ subject: 'logic' }), []);
    const skills = new Set(plan.lessons.flatMap((l) => l.skills));
    expect([...skills]).not.toContain('addSub');
    expect(skills.size).toBeGreaterThan(0);
  });
});

describe('the levels route', () => {
  const post = (body: unknown) =>
    app.fetch(
      new Request('http://localhost/v1/levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );

  it('rejects a request it cannot read', async () => {
    expect((await post({ subject: 'reading', grade: 2, level: 7 })).status).toBe(400);
  });

  /**
   * The one thing this route must never do. The tutor may answer 503 and the
   * app hides its owl; a child asking for the next level has nothing to hide
   * behind, so this always answers with a level.
   */
  it('answers with a level even when no model is configured', async () => {
    const response = await post({ subject: 'math', grade: 2, level: 7 });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { source: string; lessons: unknown[] };
    expect(body.source).toBe('local');
    expect(body.lessons).toHaveLength(10);
  });

  it('prompts the model with the skills that are actually available', () => {
    const prompt = buildLevelPrompt(request(), composed());
    expect(prompt).toContain('addSub');
    // A grade-2 child has not met decimals, so they must not be offered.
    expect(prompt).not.toContain('decimals');
    expect(prompt).toContain('10 lessons');
  });

  it('tells the model which skills the child is struggling with', () => {
    const prompt = buildLevelPrompt(request({ struggling: ['money', 'quantumAlgebra'] }), composed());
    expect(prompt).toContain('money');
    // A skill that is not in the catalog is not passed on as advice.
    expect(prompt).not.toContain('quantumAlgebra');
  });
});
