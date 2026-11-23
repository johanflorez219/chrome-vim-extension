import type { FrameScheduler } from '../scroll/scroller';

import { composedContains } from './finder';

interface PageWatchDeps {
  readonly window: Window;
  readonly frames: FrameScheduler;
}

const CAPTURE = { capture: true } as const;

/**
 * Calls `onChange` once, and removes its listeners, when the page moves under the
 * hints (R7.2): a resize, a window blur, a visibility change, or a scroll of a
 * composed ancestor of a hinted element (the document included). A scroll in the
 * first two animation frames is ignored, so the last frame of our own `j` animation
 * or trackpad momentum does not cancel `f`. Scrolls inside shadow roots never reach
 * the window (scroll is not composed), so those hints can go stale: a known gap,
 * checked by hand (NFR1.3 is met by removing every listener and frame on the way out).
 * Returns `stop`, which is safe to call more than once.
 */
export function watchPage(
  deps: PageWatchDeps,
  hinted: readonly Element[],
  onChange: () => void,
): () => void {
  let armed = false;
  let frameId: number | undefined;

  function stop(): void {
    deps.window.removeEventListener('scroll', onScroll, CAPTURE);
    deps.window.removeEventListener('resize', end, CAPTURE);
    deps.window.removeEventListener('visibilitychange', end, CAPTURE);
    deps.window.removeEventListener('blur', onBlur, CAPTURE);
    if (frameId !== undefined) {
      deps.frames.cancel(frameId);
      frameId = undefined;
    }
  }

  function end(): void {
    stop();
    onChange();
  }

  function onScroll(event: Event): void {
    const target = event.target;
    if (
      armed &&
      target instanceof Node &&
      hinted.some((element) => composedContains(target, element))
    ) {
      end();
    }
  }

  // Element blurs are captured too, and must not end Hint mode (R7.3)
  // A window target is not a Node; an element blur is
  function onBlur(event: Event): void {
    if (!(event.target instanceof Node)) {
      end();
    }
  }

  deps.window.addEventListener('scroll', onScroll, CAPTURE);
  deps.window.addEventListener('resize', end, CAPTURE);
  deps.window.addEventListener('visibilitychange', end, CAPTURE);
  deps.window.addEventListener('blur', onBlur, CAPTURE);
  frameId = deps.frames.request(() => {
    frameId = deps.frames.request(() => {
      frameId = undefined;
      armed = true;
    });
  });
  return stop;
}
