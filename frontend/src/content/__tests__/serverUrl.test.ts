import { PRODUCTION_CONTENT_URL, contentUrlFor } from '../index';

it('uses the Hashfront production backend in release builds without EAS variables', () => {
  expect(contentUrlFor(undefined, false)).toBe('https://math-edu.hashfront.com');
  expect(PRODUCTION_CONTENT_URL).toBe('https://math-edu.hashfront.com');
});

it('keeps development offline unless a URL is supplied', () => {
  expect(contentUrlFor(undefined, true)).toBe('');
  expect(contentUrlFor('https://staging.example.test', true)).toBe('https://staging.example.test');
  expect(contentUrlFor('https://staging.example.test', false)).toBe('https://staging.example.test');
});
