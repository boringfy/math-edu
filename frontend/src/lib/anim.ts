/**
 * Bits shared by the animated overlays.
 *
 * Both the celebration and the miss feedback drive every moving piece from a
 * single `Animated.Value`, and both need to give some pieces a head start.
 * That is the whole of this file, and it lives here because getting it wrong
 * is silent.
 */

/**
 * The slice of the driver a delayed piece runs on, or null when it has no
 * delay and should take the driver unchanged.
 *
 * A zero delay would otherwise produce an input range of [0, 0, 1], which is
 * not increasing. The native driver builds that node without a word and then
 * renders nothing at all, so the entire burst disappears with no error in
 * logcat and every unit test still green — the tree is correct and only the
 * animated output is dead. That bug shipped once; this is what stops it.
 */
export function pieceSlice(delay: number, total: number): [number, number, number] | null {
  const start = Math.min(0.7, delay / total);
  return start <= 0 ? null : [0, start, 1];
}
