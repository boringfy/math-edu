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

import { createHash } from 'node:crypto';

import type { ExplainRequest, TutorTopic } from '../contract';
import { tutorTopicOf } from '../contract';

export interface TutorProvider {
  /** Which link in the chain this is, for logs: "primary", "fallback 2". */
  label: string;
  /** Full chat-completions URL, e.g. "https://api.example.com/v1/chat/completions". */
  url: string;
  key: string;
  model: string;
  /**
   * Prefix the prompt with Qwen's "/no_think" switch. A soft fallback: it
   * shrinks hidden reasoning where it is understood, and on another vendor's
   * model it is just a strange token at the start of the prompt. Off unless
   * asked for; prefer `extra` where the provider has a real switch.
   */
  noThink: boolean;
  /**
   * Extra request-body fields, merged into every chat-completions call.
   * This is where provider-specific tuning lives so the code stays neutral —
   * today `{"chat_template_kwargs":{"enable_thinking":false}}`, which turns
   * the current model's hidden reasoning off entirely. Measured on a lesson:
   * ~900 hidden tokens became ~140 total, and a child's wait fell from about
   * a minute to roughly ten seconds (the rest is the provider's own pace,
   * which varies). It may override the sampling defaults, never the prompt.
   */
  extra: Record<string, unknown>;
}

/**
 * Parsed tuning: an object, `null` for malformed, `undefined` for absent.
 * The three are different — absent means "inherit", malformed means "stop".
 */
function parseExtra(raw: string | undefined): Record<string, unknown> | null | undefined {
  if (raw === undefined || raw === '') return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** How many links the chain can have: TUTOR_LLM_, then _2_ through _4_. */
const MAX_PROVIDERS = 4;

/**
 * The chain of models to try, best first.
 *
 * One provider going down should not take the owl with it, so the primary can
 * be followed by fallbacks: `TUTOR_LLM_2_MODEL`, `TUTOR_LLM_3_MODEL` and so
 * on. A fallback inherits anything it does not set from the primary, so
 * naming a second model on the same provider is a single line, while pointing
 * one at a different vendor means giving it its own URL and key.
 *
 * Read fresh per request, same as the manifest: a key rotation, or adding a
 * fallback during an outage, is a file edit rather than a redeploy.
 */
export function tutorProviders(env: NodeJS.ProcessEnv = process.env): TutorProvider[] {
  const url = env.TUTOR_LLM_URL ?? '';
  const key = env.TUTOR_LLM_KEY ?? '';
  const model = env.TUTOR_LLM_MODEL ?? '';
  if (!url || !key || !model) return [];

  // Malformed tuning on the primary disables the tutor outright rather than
  // quietly running without it — a 503 gets investigated, a silently slow owl
  // does not.
  const extra = parseExtra(env.TUTOR_LLM_EXTRA);
  if (extra === null) return [];

  const primary: TutorProvider = {
    label: 'primary',
    url,
    key,
    model,
    noThink: env.TUTOR_LLM_NO_THINK === '1',
    extra: extra ?? {},
  };
  const providers = [primary];

  for (let n = 2; n <= MAX_PROVIDERS; n++) {
    const at = (field: string): string | undefined => env[`TUTOR_LLM_${n}_${field}`];
    // Any field at all makes a link. A fallback that sets only a key is the
    // "this credential is out of quota, try the other one" case, and one that
    // sets only a model is the common same-provider spare.
    if (!['URL', 'KEY', 'MODEL', 'EXTRA', 'NO_THINK'].some((f) => at(f))) continue;
    const slotModel = at('MODEL');
    const slotUrl = at('URL');

    // A broken fallback is dropped rather than allowed to disable the tutor:
    // the whole point of it is to be the part that can fail. The startup log
    // prints the chain, so a fallback that failed to load is visible.
    const slotExtra = parseExtra(at('EXTRA'));
    if (slotExtra === null) continue;

    const noThink = at('NO_THINK');
    providers.push({
      label: `fallback ${n}`,
      url: slotUrl || primary.url,
      key: at('KEY') || primary.key,
      model: slotModel || primary.model,
      noThink: noThink === undefined ? primary.noThink : noThink === '1',
      extra: slotExtra === undefined ? primary.extra : slotExtra,
    });
  }

  return providers;
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
 * a minute for a full lesson. A child watching a thinking owl gets this long
 * in total — the whole chain shares it, so adding a fallback shortens what
 * each model is given rather than doubling how long the child waits.
 *
 * The app gives up at 130s, deliberately later than this, so a lesson that
 * was coming is never thrown away by the client first.
 */
const DEFAULT_TIMEOUT_MS = 120_000;

const totalTimeout = (env: NodeJS.ProcessEnv = process.env): number => {
  const raw = Number(env.TUTOR_LLM_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
};

/**
 * Small models charge by the token and children repeat questions, so an
 * explanation once given is kept. The key is the id PLUS a digest of what
 * the request claims the question says: the server takes the client's word
 * for the prompt, so keying on the id alone would let one mismatched request
 * park the wrong lesson under a real question for everyone after it.
 */
const cache = new Map<string, string[]>();
const CACHE_MAX = 500;

const cacheKey = (request: ExplainRequest): string =>
  `${request.questionId}:${createHash('sha256')
    .update(`${request.grade}|${request.prompt}|${request.correctAnswer}`)
    .digest('hex')
    .slice(0, 12)}`;

export class TutorError extends Error {}

/** One attempt at one provider. Throws TutorError so the caller can move on. */
async function ask(
  request: ExplainRequest,
  config: TutorProvider,
  fetchFn: typeof fetch,
  timeoutMs: number,
): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

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
        // Generous, because a reasoning model spends tokens thinking before
        // the numbered steps ever start; a tight cap truncates the lesson.
        // Measured: the don't-reveal-the-answer rule pushes deliberation to
        // ~1450 tokens on a comparison question, and a cap hit mid-thought
        // comes back as empty content, not as a shorter lesson.
        max_tokens: 3000,
        temperature: 0.6,
        // The provider-specific tuning. After the defaults so it may retune
        // them; before the messages so it can never replace the lesson.
        ...config.extra,
        messages: [
          {
            role: 'user',
            content: (config.noThink ? '/no_think ' : '') + buildTutorPrompt(request),
          },
        ],
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
  return steps;
}

/**
 * Asks for the lesson, trying each model in turn.
 *
 * A child stuck on a question is the worst moment to have nothing to say, and
 * the reasons one provider fails — a rate limit, an outage, a model retired
 * from under us, a reply that parses to nothing — are all reasons the next
 * one might still work. So every failure is a reason to move down the chain,
 * and only the last one is an error.
 *
 * Throws TutorError, naming every provider that failed, when none of them
 * could answer.
 */
export async function explain(
  request: ExplainRequest,
  providers: TutorProvider[],
  fetchFn: typeof fetch = fetch,
): Promise<string[]> {
  const key = cacheKey(request);
  const cached = cache.get(key);
  if (cached) return cached;
  if (providers.length === 0) {
    throw new TutorError('no tutor provider is configured');
  }

  // Split the child's patience evenly, so a primary that hangs cannot use up
  // the whole budget and leave the fallback no time to answer in.
  const each = Math.max(1, Math.floor(totalTimeout() / providers.length));

  const failures: string[] = [];
  for (const provider of providers) {
    try {
      const steps = await ask(request, provider, fetchFn, each);
      if (failures.length > 0) {
        console.warn(`tutor fell back to ${provider.label} (${provider.model}) after: ${failures.join('; ')}`);
      }
      if (cache.size >= CACHE_MAX) {
        // Drop the oldest entry; Map iterates in insertion order.
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      cache.set(key, steps);
      return steps;
    } catch (error) {
      const reason = error instanceof TutorError ? error.message : String(error);
      failures.push(`${provider.label} (${provider.model}) ${reason}`);
    }
  }

  throw new TutorError(failures.join('; '));
}

/** For tests, which must not see each other's answers. */
export function clearTutorCache(): void {
  cache.clear();
}
