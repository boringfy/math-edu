/**
 * Asking a language model to plan a level.
 *
 * The model does not write questions. It picks from the factory catalog and
 * names what it picked: which skills a lesson is about, roughly how hard, and
 * a title a child might want to tap. Every number a child then sees is built
 * by the same deterministic factory it would have been anyway, so no reply
 * from a model can put a wrong answer in front of a seven-year-old — the
 * worst it can do is choose badly, and even that is bounded below.
 *
 * The composer in `factories/compose.ts` is the floor. Anything the model
 * sends is checked against the catalog slot by slot and repaired where it is
 * wrong; if what comes back is unusable, or there is no model configured at
 * all, the deterministic level is what gets served. This endpoint has no
 * failure mode that reaches the app as an error, because a child waiting to
 * play is not a good moment to be out of ideas.
 */

import { createHash } from 'node:crypto';

import type { Grade } from '../contract';
import { CATALOG, skillsOf } from '../factories/catalog';
import {
  ComposedLesson,
  LESSONS_PER_LEVEL,
  Mastery,
  composeLevel,
  liveSkills,
} from '../factories/compose';
import { Skill } from '../factories/ramp';
import { TutorProvider, TutorError } from './tutor';

export interface ComposeRequest {
  subject: 'math' | 'logic';
  grade: Grade;
  level: number;
  firstComposedLevel: number;
  /** What the child has shown, per skill, as a difficulty. */
  mastery: Mastery;
  /** Skills they have got wrong lately, most recent first. */
  struggling: string[];
}

export interface ComposeResponse {
  /** A word or two naming the level, for the map. */
  theme: string;
  lessons: ComposedLesson[];
  /** Where the plan came from, so the app can say so and tests can tell. */
  source: 'ai' | 'local';
}

/** What the model is allowed to change about a lesson. Nothing else. */
interface Planned {
  title?: unknown;
  skills?: unknown;
}

const MAX_TITLE = 28;

export function asComposeRequest(body: unknown): ComposeRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  const grade = b.grade;
  const level = b.level;

  if (b.subject !== 'math' && b.subject !== 'logic') return null;
  if (typeof grade !== 'number' || grade < 1 || grade > 5) return null;
  if (typeof level !== 'number' || !Number.isInteger(level) || level < 1) return null;

  const first =
    typeof b.firstComposedLevel === 'number' && b.firstComposedLevel >= 1
      ? b.firstComposedLevel
      : 7;

  // Mastery is advice, so a malformed entry is dropped rather than refused.
  const mastery: Mastery = {};
  if (typeof b.mastery === 'object' && b.mastery !== null) {
    for (const [skill, d] of Object.entries(b.mastery as Record<string, unknown>)) {
      if (typeof d === 'number' && Number.isFinite(d) && d >= 1 && d <= 99) {
        mastery[skill as Skill] = Math.round(d);
      }
    }
  }

  return {
    subject: b.subject,
    grade: grade as Grade,
    level,
    firstComposedLevel: first,
    mastery,
    struggling: Array.isArray(b.struggling)
      ? b.struggling.filter((s): s is string => typeof s === 'string').slice(0, 12)
      : [],
  };
}

/**
 * What the model is told.
 *
 * It is given the catalog as skills rather than factory ids, because naming a
 * factory is a decision about difficulty and difficulty is not its job — the
 * ramps already know what a skill costs at a given `d`. That keeps the reply
 * small, keeps it checkable, and keeps the model out of the one place a
 * mistake would be expensive.
 */
export function buildLevelPrompt(request: ComposeRequest, plan: ComposedLesson[]): string {
  const usable = liveSkills(
    Math.max(...plan.flatMap((l) => l.slots.map((s) => s.d)), 1),
    request.subject,
  );
  const weak = request.struggling.filter((s) => usable.includes(s as Skill));

  return [
    `You are planning level ${request.level} of a ${request.subject === 'math' ? 'maths' : 'logic puzzle'} ` +
      `game for a child of about ${5 + request.grade} years old. A level is ${LESSONS_PER_LEVEL} lessons.`,
    '',
    `The skills available at this level are: ${usable.join(', ')}.`,
    weak.length > 0
      ? `The child has been getting these wrong lately, so give them more practice: ${weak.join(', ')}.`
      : 'The child is doing well across the board.',
    '',
    'For each of the ten lessons, choose one or two of those skills and write a short title.',
    `Titles are for a child: plain, concrete, at most ${MAX_TITLE} characters, no punctuation at the end. ` +
      '"Shapes and Sums" is good. "Lesson 4" and "Mathematical Reasoning" are not.',
    'Vary the skills across the ten so the level does not become about one thing.',
    '',
    'Also give the level itself a two or three word theme, like "Market Day" or "Space Shapes".',
    '',
    'Reply with ONLY JSON, no prose, in exactly this shape:',
    '{"theme":"...","lessons":[{"title":"...","skills":["addSub"]}, ... ten of them]}',
  ].join('\n');
}

/** Strips a fenced code block, which models add however firmly they are asked not to. */
export function parsePlan(text: string): { theme?: unknown; lessons?: unknown } | null {
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/<think>[\s\S]*/g, '')
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as { theme?: unknown; lessons?: unknown };
  } catch {
    return null;
  }
}

const clean = (title: unknown, fallback: string): string => {
  if (typeof title !== 'string') return fallback;
  const trimmed = title.replace(/\s+/g, ' ').replace(/[.:;,!]+$/, '').trim();
  return trimmed === '' || trimmed.length > MAX_TITLE ? fallback : trimmed;
};

/**
 * Folds what the model chose into the level that was already composed.
 *
 * The composed level is the thing being edited, never replaced: its ids,
 * indices, seeds and problem counts are untouchable, because progress is
 * stored against them and a level that renumbered itself would lose a child's
 * stars. A lesson the model got wrong keeps what it already had.
 */
export function applyPlan(
  plan: { theme?: unknown; lessons?: unknown },
  composed: ComposedLesson[],
  subject: 'math' | 'logic',
): ComposeResponse {
  const planned = Array.isArray(plan.lessons) ? (plan.lessons as Planned[]) : [];
  const known = new Set(skillsOf(subject));

  const lessons = composed.map((lesson, i) => {
    const suggestion = planned[i];
    if (typeof suggestion !== 'object' || suggestion === null) return lesson;

    // Skills the model made up, or that belong to the other map, are dropped.
    const skills = Array.isArray(suggestion.skills)
      ? (suggestion.skills.filter(
          (s): s is Skill => typeof s === 'string' && known.has(s as Skill),
        ) as Skill[])
      : [];

    // A cake-cutting lesson keeps its drawn puzzles whatever is suggested.
    const drawn = lesson.slots.filter((s) => CATALOG[s.factory]?.skill === 'draw');
    if (skills.length === 0 || drawn.length > 0) {
      return { ...lesson, title: clean(suggestion.title, lesson.title) };
    }

    // Re-slot onto the chosen skills, at exactly the difficulty and count the
    // deterministic level already decided. The model moves what a lesson is
    // about; it does not get to move how hard it is.
    const slots = lesson.slots.map((slot, n) => {
      const skill = skills[n % skills.length];
      const options = (CATALOG[slot.factory] ? Object.values(CATALOG) : []).filter(
        (f) => f.skill === skill && slot.d >= f.dRange[0] && slot.d <= f.dRange[1],
      );
      return options.length > 0
        ? { factory: options[n % options.length].id, d: slot.d }
        : slot;
    });

    return {
      ...lesson,
      title: clean(suggestion.title, lesson.title),
      skills,
      slots,
    };
  });

  return { theme: clean(plan.theme, `Level ${composed[0]?.level ?? 1}`), lessons, source: 'ai' };
}

/**
 * Small models charge by the token and a level is asked for once per ten
 * lessons, but a child who closes and reopens the app should not pay for it
 * twice. Keyed by everything that changes the answer.
 */
const cache = new Map<string, ComposeResponse>();
const CACHE_MAX = 200;

const cacheKey = (request: ComposeRequest): string =>
  createHash('sha256')
    .update(
      JSON.stringify([
        request.subject,
        request.grade,
        request.level,
        request.firstComposedLevel,
        Object.entries(request.mastery).sort(),
        [...request.struggling].sort(),
      ]),
    )
    .digest('hex')
    .slice(0, 16);

export function clearLevelCache(): void {
  cache.clear();
}

const LEVEL_TIMEOUT_MS = 60_000;

/**
 * Plans a level, with a model if there is one and without if there is not.
 *
 * Never throws. The deterministic composition is computed first and is what
 * is returned unless a model improves on it, which is what makes the AI an
 * enhancement rather than a dependency.
 */
export async function planLevel(
  request: ComposeRequest,
  providers: TutorProvider[],
  fetchFn: typeof fetch = fetch,
): Promise<ComposeResponse> {
  const composed = composeLevel({
    subject: request.subject,
    grade: request.grade,
    level: request.level,
    firstComposedLevel: request.firstComposedLevel,
    mastery: request.mastery,
  });
  const local: ComposeResponse = {
    theme: `Level ${request.level}`,
    lessons: composed,
    source: 'local',
  };

  if (providers.length === 0) return local;

  const key = cacheKey(request);
  const cached = cache.get(key);
  if (cached) return cached;

  for (const provider of providers) {
    try {
      const text = await ask(request, composed, provider, fetchFn);
      const plan = parsePlan(text);
      if (!plan) throw new TutorError('level plan was not JSON');

      const applied = applyPlan(plan, composed, request.subject);
      if (cache.size >= CACHE_MAX) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      cache.set(key, applied);
      return applied;
    } catch (error) {
      const reason = error instanceof TutorError ? error.message : String(error);
      console.warn(`level plan failed on ${provider.label}: ${reason}`);
    }
  }

  // Every model failed. The child still gets a level.
  return local;
}

async function ask(
  request: ComposeRequest,
  composed: ComposedLesson[],
  provider: TutorProvider,
  fetchFn: typeof fetch,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LEVEL_TIMEOUT_MS);
  try {
    const response = await fetchFn(provider.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 1500,
        temperature: 0.8,
        ...provider.extra,
        messages: [
          {
            role: 'user',
            content:
              (provider.noThink ? '/no_think ' : '') + buildLevelPrompt(request, composed),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new TutorError(`HTTP ${response.status}`);
    const body = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim() === '') {
      throw new TutorError('empty reply');
    }
    return content;
  } finally {
    clearTimeout(timer);
  }
}
