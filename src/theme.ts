export const colors = {
  background: '#f5f7ff',
  card: '#ffffff',
  primary: '#4f6df5',
  primaryDark: '#3a52c4',
  text: '#1f2437',
  textMuted: '#6b7290',
  correct: '#2e9e5b',
  correctBg: '#e3f6ea',
  wrong: '#d9455f',
  wrongBg: '#fde8ec',
  warning: '#c98a12',
  warningBg: '#fdf3dd',
  border: '#dfe3f0',
};

/**
 * Story problems are whole sentences while "7 × 8 = ?" is a handful of
 * characters, so the prompt shrinks to keep long questions readable.
 */
export const promptTextStyle = (prompt: string): { fontSize: number; lineHeight: number } => {
  const fontSize =
    prompt.length > 90 ? 19 : prompt.length > 45 ? 22 : prompt.length > 20 ? 26 : 32;
  return { fontSize, lineHeight: Math.round(fontSize * 1.35) };
};

/**
 * A logic puzzle's clue list is several short lines that have to be read one
 * at a time; centring those leaves the eye hunting for where each begins.
 */
export const promptAlign = (prompt: string): 'left' | 'center' =>
  prompt.split('\n').length > 2 ? 'left' : 'center';
