/**
 * The app's half of the tutor conversation: what it sends, and how little it
 * trusts what comes back. The server is a mocked fetch throughout — the wire
 * format is the contract's business, and these tests pin that the app honours
 * it and survives a server that doesn't.
 */
import { fetchLesson, TOPIC_LOOKS } from '../tutor';
import { tutorTopicOf } from '../../types';
import type { Question } from '../../types';

const question: Question = {
  id: 'boring-quest-v1/math.g2:money:1#4',
  prompt: 'You pay 50¢ for a toy that costs 35¢. How much change do you get?',
  correctAnswer: '15',
  choices: ['15', '25', '10', '85'],
  explanation: '50 - 35 = 15',
  answerFormat: 'integer',
  mode: 'choice',
};

const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

afterEach(() => {
  jest.restoreAllMocks();
});

describe('fetchLesson', () => {
  it('sends the whole question and returns the steps', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(okResponse({ steps: ['Count up from 35.', 'You reach 50 after 15.'] }));

    const steps = await fetchLesson(question, 2);
    expect(steps).toEqual(['Count up from 35.', 'You reach 50 after 15.']);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('/v1/explain');
    const sent = JSON.parse(String(init?.body));
    expect(sent.questionId).toBe(question.id);
    expect(sent.grade).toBe(2);
    expect(sent.correctAnswer).toBe('15');
  });

  it('refuses an empty lesson rather than showing a silent owl', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(okResponse({ steps: ['', '  '] }));
    await expect(fetchLesson(question, 2)).rejects.toThrow();
  });

  it('turns a server error into a thrown error, not steps', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: false, status: 503, json: async () => ({}) } as Response);
    await expect(fetchLesson(question, 2)).rejects.toThrow('503');
  });

  /**
   * A tablet on battery drops long connections — Wi-Fi power saving and Doze
   * both do it, and a lesson takes most of a minute. That is the single most
   * common way the owl fails, and it is not the server being down.
   */
  it('tries again when the connection breaks', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValue(okResponse({ steps: ['Count up from 35.'] }));

    expect(await fetchLesson(question, 2)).toEqual(['Count up from 35.']);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('gives up after the second break rather than hammering', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new TypeError('Network request failed'));
    await expect(fetchLesson(question, 2)).rejects.toThrow();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  /** The server answered; asking the same thing again would only annoy it. */
  it('does not retry a server that replied', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: false, status: 502, json: async () => ({}) } as Response);
    await expect(fetchLesson(question, 2)).rejects.toThrow('502');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  /** We already waited as long as a child will; starting over would double it. */
  it('does not retry its own timeout', async () => {
    const aborted = new Error('Aborted');
    aborted.name = 'AbortError';
    const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(aborted);
    await expect(fetchLesson(question, 2)).rejects.toThrow();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('the lesson looks', () => {
  it('dresses every topic the parser can produce', () => {
    // A money question opens as a shop, a fraction as pizza — and an id from
    // the future still gets the general look rather than a crash.
    expect(TOPIC_LOOKS[tutorTopicOf(question.id)].icon).toBe('🪙');
    expect(TOPIC_LOOKS[tutorTopicOf('x/math.g3:fractions:2#1')].icon).toBe('🍕');
    expect(TOPIC_LOOKS[tutorTopicOf('x/math.g3:brandNew:2#1')]).toBeDefined();
  });
});
