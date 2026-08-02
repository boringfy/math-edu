import { applyKey, canSubmit } from '../NumberPad';

describe('applyKey', () => {
  it('appends digits', () => {
    expect(applyKey('', '4', 'integer')).toBe('4');
    expect(applyKey('4', '2', 'integer')).toBe('42');
  });

  it('deletes the last character', () => {
    expect(applyKey('42', 'del', 'integer')).toBe('4');
    expect(applyKey('', 'del', 'integer')).toBe('');
  });

  it('replaces a lone leading zero', () => {
    expect(applyKey('0', '7', 'integer')).toBe('7');
    // ...but keeps it in front of a decimal point.
    expect(applyKey('0.', '5', 'decimal')).toBe('0.5');
  });

  it('stops at six characters', () => {
    expect(applyKey('123456', '7', 'integer')).toBe('123456');
    // Deleting still works at the cap.
    expect(applyKey('123456', 'del', 'integer')).toBe('12345');
  });

  it('allows one decimal point, and only in decimal questions', () => {
    expect(applyKey('3', '.', 'decimal')).toBe('3.');
    expect(applyKey('3.5', '.', 'decimal')).toBe('3.5');
    expect(applyKey('', '.', 'decimal')).toBe('');
    expect(applyKey('3', '.', 'integer')).toBe('3');
  });

  it('allows one slash, and only in fraction questions', () => {
    expect(applyKey('3', '/', 'fraction')).toBe('3/');
    expect(applyKey('3/4', '/', 'fraction')).toBe('3/4');
    expect(applyKey('', '/', 'fraction')).toBe('');
    expect(applyKey('3', '/', 'integer')).toBe('3');
  });
});

describe('canSubmit', () => {
  it('needs a complete answer', () => {
    expect(canSubmit('12')).toBe(true);
    expect(canSubmit('3.5')).toBe(true);
    expect(canSubmit('3/4')).toBe(true);
  });

  it('rejects nothing typed or a half-typed answer', () => {
    expect(canSubmit('')).toBe(false);
    expect(canSubmit('3.')).toBe(false);
    expect(canSubmit('3/')).toBe(false);
  });
});
