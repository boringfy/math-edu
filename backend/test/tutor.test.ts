/**
 * The tutor, without a language model anywhere near it.
 *
 * Everything nondeterministic is injected: the model is a fake fetch, the
 * config is a literal. What is pinned here is our half of the conversation —
 * the prompt says what the lesson plan promises, and whatever comes back is
 * turned into speakable steps or an honest error, never garbage read aloud.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ExplainRequest } from '../src/contract';
import { tutorTopicOf } from '../src/contract';
import {
  TutorConfig,
  TutorError,
  buildTutorPrompt,
  clearTutorCache,
  explain,
  parseSteps,
  tutorConfig,
} from '../src/server/tutor';
import { app } from '../src/server/app';

const request = (overrides: Partial<ExplainRequest> = {}): ExplainRequest => ({
  questionId: 'boring-quest-v1/math.g3:fractions:2#1',
  grade: 3,
  prompt: 'Which is bigger, 1/2 or 1/4?',
  correctAnswer: '1/2',
  choices: ['1/2', '1/4', 'they are equal', 'cannot tell'],
  ...overrides,
});

const config: TutorConfig = {
  url: 'https://llm.example.com/v1/chat/completions',
  key: 'test-key',
  model: 'test-model',
  noThink: false,
  extra: {},
};

/** A fetch that answers like an OpenAI-compatible provider. */
const llmSaying = (content: string) =>
  vi.fn(async () =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 }),
  ) as unknown as typeof fetch;

afterEach(() => {
  clearTutorCache();
  vi.unstubAllEnvs();
});

describe('tutorTopicOf', () => {
  it('reads the topic out of a question id', () => {
    expect(tutorTopicOf('boring-quest-v1/math.g3:addSub:2#1')).toBe('addSub');
    expect(tutorTopicOf('boring-quest-v1/math.g5:decimals:3#12')).toBe('decimals');
  });

  it('knows the cake puzzles', () => {
    expect(tutorTopicOf('boring-quest-v1/math.g2:draw:1#3')).toBe('draw');
  });

  it('falls back to general for anything it cannot vouch for', () => {
    // A topic added server-side before this parser learns it.
    expect(tutorTopicOf('boring-quest-v1/math.g3:algebra:2#1')).toBe('general');
    expect(tutorTopicOf('boring-quest-v1/logic.g3:sequence:2#1')).toBe('general');
    expect(tutorTopicOf('nonsense')).toBe('general');
  });
});

describe('buildTutorPrompt', () => {
  it('teaches each topic its own way', () => {
    expect(buildTutorPrompt(request())).toContain('pizza');
    expect(buildTutorPrompt(request({ questionId: 'x/math.g3:money:2#1' }))).toContain('shop');
    expect(buildTutorPrompt(request({ questionId: 'x/math.g3:time:2#1' }))).toContain('clock');
  });

  it('carries the problem, the answer and the grade', () => {
    const prompt = buildTutorPrompt(request());
    expect(prompt).toContain('Which is bigger, 1/2 or 1/4?');
    // The model sees the answer — teaching the wrong method confidently is
    // worse — but only as reference it is forbidden to repeat.
    expect(prompt).toContain('the answer is 1/2');
    expect(prompt).toContain('NEVER say it');
    expect(prompt).toContain('grade 3');
  });

  it('demands the lesson stop short and hand the final move to the child', () => {
    const prompt = buildTutorPrompt(request());
    expect(prompt).toContain('STOP before the finish line');
    expect(prompt).toContain('hands the problem back');
  });

  it('mentions choices only when the question had any', () => {
    expect(buildTutorPrompt(request())).toContain('answer choices');
    expect(buildTutorPrompt(request({ choices: [] }))).not.toContain('answer choices');
  });
});

describe('parseSteps', () => {
  it('takes numbered lines apart', () => {
    expect(parseSteps('1. Look at the halves.\n2) Now the quarters.\n3. Halves win!')).toEqual([
      'Look at the halves.',
      'Now the quarters.',
      'Halves win!',
    ]);
  });

  it('never reads a reasoning trace to a child', () => {
    const reply = '<think>The child is 8, so pizza.</think>\n1. Cut a pizza in two.\n2. Each bit is a half.';
    expect(parseSteps(reply)).toEqual(['Cut a pizza in two.', 'Each bit is a half.']);
  });

  it('drops an unclosed think tag from a truncated reply', () => {
    expect(parseSteps('1. Cut the pizza.\n2. Share it.\n<think>and then')).toEqual([
      'Cut the pizza.',
      'Share it.',
    ]);
  });

  it('falls back to sentences when the model ignored the numbering', () => {
    expect(parseSteps('Cut a pizza in two. Each piece is a half! Bigger than a quarter.')).toEqual([
      'Cut a pizza in two.',
      'Each piece is a half!',
      'Bigger than a quarter.',
    ]);
  });

  it('caps a rambling reply', () => {
    const lines = Array.from({ length: 12 }, (_, i) => `${i + 1}. Step ${i + 1}.`).join('\n');
    expect(parseSteps(lines)).toHaveLength(8);
  });
});

describe('explain', () => {
  it('asks the configured model and returns its steps', async () => {
    const fetchFn = llmSaying('1. Cut a pizza in two.\n2. A half beats a quarter.');
    const steps = await explain(request(), config, fetchFn);
    expect(steps).toEqual(['Cut a pizza in two.', 'A half beats a quarter.']);

    const [url, init] = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(config.url);
    expect(init.headers.Authorization).toBe('Bearer test-key');
    expect(JSON.parse(init.body).model).toBe('test-model');
    expect(JSON.parse(init.body).messages[0].content).not.toContain('/no_think');
  });

  it('prefixes the think switch when the config asks for it', async () => {
    const fetchFn = llmSaying('1. One.\n2. Two.');
    await explain(request(), { ...config, noThink: true }, fetchFn);
    const [, init] = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(init.body).messages[0].content.startsWith('/no_think ')).toBe(true);
  });

  it('merges the extra tuning into the body, but never over the lesson', async () => {
    const fetchFn = llmSaying('1. One.\n2. Two.');
    const extra = {
      chat_template_kwargs: { enable_thinking: false },
      temperature: 0.2,
      messages: 'must not win',
    };
    await explain(request(), { ...config, extra }, fetchFn);
    const body = JSON.parse((fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.chat_template_kwargs).toEqual({ enable_thinking: false });
    // Tuning may retune sampling; the prompt itself is not negotiable.
    expect(body.temperature).toBe(0.2);
    expect(Array.isArray(body.messages)).toBe(true);
  });

  it('answers a repeated question from memory', async () => {
    const fetchFn = llmSaying('1. Cut a pizza in two.\n2. A half beats a quarter.');
    await explain(request(), config, fetchFn);
    await explain(request(), config, fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('turns a provider failure into a TutorError', async () => {
    const failing = vi.fn(async () => new Response('nope', { status: 429 })) as unknown as typeof fetch;
    await expect(explain(request(), config, failing)).rejects.toThrow(TutorError);
  });

  it('refuses an empty reply rather than caching it', async () => {
    await expect(explain(request(), config, llmSaying(''))).rejects.toThrow(TutorError);
  });
});

describe('the explain route', () => {
  const post = (body: unknown) =>
    app.fetch(
      new Request('http://localhost/v1/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );

  it('says so when no model is configured', async () => {
    const response = await post(request());
    expect(response.status).toBe(503);
  });

  it('rejects a malformed request before spending a token on it', async () => {
    vi.stubEnv('TUTOR_LLM_URL', config.url);
    vi.stubEnv('TUTOR_LLM_KEY', config.key);
    vi.stubEnv('TUTOR_LLM_MODEL', config.model);
    const response = await post({ questionId: 'x', grade: 9 });
    expect(response.status).toBe(400);
  });
});

describe('tutorConfig', () => {
  it('is all or nothing', () => {
    expect(tutorConfig({})).toBeNull();
    expect(tutorConfig({ TUTOR_LLM_URL: 'u', TUTOR_LLM_KEY: 'k' })).toBeNull();
    expect(tutorConfig({ TUTOR_LLM_URL: 'u', TUTOR_LLM_KEY: 'k', TUTOR_LLM_MODEL: 'm' })).toEqual({
      url: 'u',
      key: 'k',
      model: 'm',
      noThink: false,
      extra: {},
    });
  });

  it('parses the extra tuning, and turns the tutor off rather than run without it', () => {
    const base = { TUTOR_LLM_URL: 'u', TUTOR_LLM_KEY: 'k', TUTOR_LLM_MODEL: 'm' };
    expect(tutorConfig({ ...base, TUTOR_LLM_EXTRA: '{"a":1}' })?.extra).toEqual({ a: 1 });
    // Broken JSON silently ignored would mean a silently slow owl instead of
    // a 503 someone investigates.
    expect(tutorConfig({ ...base, TUTOR_LLM_EXTRA: '{oops' })).toBeNull();
    expect(tutorConfig({ ...base, TUTOR_LLM_EXTRA: '[1]' })).toBeNull();
  });

  it('passes the think switch through only when asked', () => {
    const env = {
      TUTOR_LLM_URL: 'u',
      TUTOR_LLM_KEY: 'k',
      TUTOR_LLM_MODEL: 'm',
      TUTOR_LLM_NO_THINK: '1',
    };
    expect(tutorConfig(env)?.noThink).toBe(true);
  });
});
