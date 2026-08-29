/**
 * Turns a stuck child's question into a spoken lesson.
 *
 * The server, not the app, talks to the language model. That is the point of
 * this module existing here: the API key never ships inside an APK a child
 * carries around, and the provider can be swapped by editing an environment
 * variable instead of releasing an app.
 *
 * The provider is anything OpenAI-compatible. Today that is NeoSky Cloud
 * (https://neoskycloud.com/docs); tomorrow it can be someone else, which is
 * why every provider-specific fact — URL, key, model — arrives from the
 * environment and nothing here mentions a vendor by name.
 */

import type { ExplainRequest, TutorTopic } from '../contract';
import { tutorTopicOf } from '../contract';

export interface TutorConfig {
  /** Full chat-completions URL, e.g. "https://api.example.com/v1/chat/completions". */
  url: string;
  key: string;
  model: string;
  /**
   * Prefix the prompt with Qwen's "/no_think" switch. Measured against the
   * current provider it halves a child's wait (33s against 63s) by shrinking
   * the hidden reasoning. Off unless asked for, because on another vendor's
   * model the switch is just a strange token at the start of the prompt.
   */
  noThink: boolean;
}

/** Read fresh per request, same as the manifest: a key rotation is a file edit. */
export function tutorConfig(env: NodeJS.ProcessEnv = process.env): TutorConfig | null {
  const url = env.TUTOR_LLM_URL ?? '';
  const key = env.TUTOR_LLM_KEY ?? '';
  const model = env.TUTOR_LLM_MODEL ?? '';
  if (!url || !key || !model) return null;
  return { url, key, model, noThink: env.TUTOR_LLM_NO_THINK === '1' };
}

/**
 * How each kind of problem wants to be taught. This is the "special way per
 * type": the angle is written into the prompt, so a fractions question comes
 * back as pizza slices and a place-value question as bundles of sticks,
 * instead of one generic recitation for everything.
 */
const ANGLES: Record<TutorTopic, string> = {
  addSub:
    'Teach it with counting things the child knows — toys, sweets, hops along a number line. Adding is getting more, subtracting is some going away.',
  mulDiv:
    'Teach it with equal groups: rows of stickers, bags with the same number of marbles, or sharing fairly between friends.',
  fractions:
    'Teach it by cutting something up — a pizza or a cake sliced into equal pieces. Say what the bottom number and the top number of a fraction each count.',
  decimals:
    'Teach it with money: whole dollars and the cents that make up one dollar. Line the numbers up the way prices are written.',
  order:
    'Teach comparing sizes with a picture the child can see — children lining up by height, towers of blocks side by side.',
  word:
    'First retell the story in even simpler words and point out the numbers hiding in it. Then say which operation the story is secretly asking for, and why.',
  geometry:
    'Teach it with shapes from around the house — windows, wheels, slices of toast. Count sides and corners out loud.',
  measurement:
    'Teach it with measuring things at home — a ruler on a pencil, cups of water into a jug. Make the units something the child can picture.',
  money:
    'Teach it like playing shop: paying coins over one at a time, and counting up to find the change.',
  speed:
    'Teach it as a journey — walking to school or a car trip. Distance is how far, time is how long, speed is how far each hour or minute.',
  time:
    'Teach it on a clock face: the short hand and the long hand as two runners going round, and minutes counted in fives.',
  place:
    'Teach place value with bundles: sticks tied in tens, boxes of a hundred. Say what each digit in the number is really counting.',
  draw:
    'This is a cake-cutting puzzle. Teach it with a real cake and a knife: what one straight cut does, and how crossing cuts or stacking pieces makes more pieces.',
  general:
    'Use a small everyday example a young child would recognise.',
};

/**
 * The whole lesson plan, in one prompt.
 *
 * Assumes the child is NOT familiar with the concept — that is who presses a
 * help button — so the model is told to teach the idea, not just recompute
 * the answer. And it must never SAY the answer: the button sits on a live
 * question, so a lesson that ends "...so it is 52" is not help, it is the
 * answer key. The model is still shown the answer — teaching the wrong
 * method confidently is worse — but as reference, with the lesson required
 * to stop at the door and hand the child the final move.
 *
 * Steps are demanded as numbered lines because that is the one format small
 * instruction-tuned models reliably produce and `parseSteps` can reliably
 * take apart.
 */
export function buildTutorPrompt(request: ExplainRequest): string {
  const topic = tutorTopicOf(request.questionId);
  const choices =
    request.choices.length > 0
      ? `The answer choices shown were: ${request.choices.join(', ')}.\n`
      : '';

  return [
    `You are a warm, playful maths tutor talking to a grade ${request.grade} child ` +
      `(about ${5 + request.grade} years old). The child is stuck on this problem and ` +
      `is not yet familiar with the idea behind it, so teach the idea, don't just solve.`,
    '',
    `The problem: ${request.prompt}`,
    `${choices}For your eyes only, so you teach the right method: the answer is ` +
      `${request.correctAnswer}. The child still has to find it themself, so you must ` +
      `NEVER say it, spell it out, or hint which choice it is.`,
    '',
    'How to teach it:',
    `- ${ANGLES[topic]}`,
    '- If an analogy or a tiny everyday example makes it clearer, use one; if the problem is plain enough, skip it.',
    '- Walk the method one small move at a time — but STOP before the finish line. Set up the very last move and leave it undone. Never perform the final count, sum, or comparison that would reveal the answer, and never use a different number that happens to equal it.',
    '- Your last step hands the problem back: tell the child exactly what final move to make, as a question ("Now hop back the eight steps — where do you land?"), with one cheerful word of confidence.',
    `- Use only words a grade ${request.grade} child knows. Short sentences. No symbols the child may not have met.`,
    '- The steps will be READ ALOUD by the app, so write for the ear: no formulas mid-sentence that sound strange spoken.',
    '',
    'Reply with ONLY 3 to 6 numbered steps, one per line, like:',
    '1. First step.',
    '2. Next step.',
    'No title, no greeting, nothing after the last step.',
  ].join('\n');
}

/**
 * Numbered lines out of whatever the model actually sent.
 *
 * Reasoning models wrap deliberation in <think> tags, and a truncated reply
 * can leave the tag unclosed; both are stripped rather than read aloud to a
 * child. If numbering didn't happen at all, sentences stand in for steps —
 * a lesson in the wrong format still beats an error.
 */
export function parseSteps(text: string): string[] {
  const spoken = text
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/<think>[\s\S]*/g, '')
    .trim();

  const numbered = [...spoken.matchAll(/^\s*\d+[.)]\s+(.+)$/gm)].map((m) => m[1].trim());
  if (numbered.length >= 2) return numbered.slice(0, 8);

  return spoken
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 8);
}

/**
 * LLM latency is what it is: the current reasoning model was measured taking
 * a minute for a full lesson. A child watching a thinking owl gets this long.
 */
const LLM_TIMEOUT_MS = 120_000;

/**
 * Small models charge by the token and children repeat questions, so an
 * explanation once given is kept. Question content is immutable per id (the
 * bake guarantees it), which is what makes the id a safe key.
 */
const cache = new Map<string, string[]>();
const CACHE_MAX = 500;

export class TutorError extends Error {}

/** Asks the model for the lesson. Throws TutorError on anything but success. */
export async function explain(
  request: ExplainRequest,
  config: TutorConfig,
  fetchFn: typeof fetch = fetch,
): Promise<string[]> {
  const cached = cache.get(request.questionId);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetchFn(config.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'user',
            content: (config.noThink ? '/no_think ' : '') + buildTutorPrompt(request),
          },
        ],
        // Generous, because a reasoning model spends tokens thinking before
        // the numbered steps ever start; a tight cap truncates the lesson.
        // Measured: the don't-reveal-the-answer rule pushes deliberation to
        // ~1450 tokens on a comparison question, and a cap hit mid-thought
        // comes back as empty content, not as a shorter lesson.
        max_tokens: 3000,
        temperature: 0.6,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    throw new TutorError(`tutor unreachable: ${String(error)}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new TutorError(`tutor HTTP ${response.status}`);
  }

  let content: unknown;
  try {
    const body = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    content = body.choices?.[0]?.message?.content;
  } catch {
    throw new TutorError('tutor sent unreadable JSON');
  }
  if (typeof content !== 'string' || content.trim() === '') {
    throw new TutorError('tutor sent an empty reply');
  }

  const steps = parseSteps(content);
  if (steps.length === 0) {
    throw new TutorError('tutor sent nothing speakable');
  }

  if (cache.size >= CACHE_MAX) {
    // Drop the oldest entry; Map iterates in insertion order.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(request.questionId, steps);
  return steps;
}

/** For tests, which must not see each other's answers. */
export function clearTutorCache(): void {
  cache.clear();
}
