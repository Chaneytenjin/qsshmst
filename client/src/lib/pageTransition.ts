export const PAGE_TRANSITION_DURATION_MS = 240;

export function shouldRunPageTransition(hasNavigated: boolean, prefersReducedMotion: boolean) {
  return hasNavigated && !prefersReducedMotion;
}
