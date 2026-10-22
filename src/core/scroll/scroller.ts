export interface FrameScheduler {
  request(callback: (now: number) => void): number;
  cancel(id: number): void;
}

export type Axis = 'x' | 'y';

interface ScrollerDeps {
  readonly frames: FrameScheduler;
  /** Same clock as the frame timestamps (performance.now). */
  readonly now: () => number;
  /** Read on each scroll. */
  readonly prefersReducedMotion: () => boolean;
}

export interface Scroller {
  /** Moves `target` by `delta` px from its current destination. */
  scrollBy(target: Element, axis: Axis, delta: number, options: { repeat: boolean }): void;
  /** Moves `target` to `fraction` (0–1) of its scroll range. */
  scrollToFraction(target: Element, axis: Axis, fraction: number): void;
  /** Cancels every animation (R1.4). */
  stop(): void;
}

// R6.7: a press reaches its destination within 300 ms
const NORMAL_DURATION_MS = 250;
// R6.8: a held key never builds up a backlog
const REPEAT_DURATION_MS = 100;

interface Animation {
  readonly element: Element;
  readonly axis: Axis;
  from: number;
  to: number;
  start: number;
  duration: number;
  lastWritten: number;
}

function position(element: Element, axis: Axis): number {
  return axis === 'y' ? element.scrollTop : element.scrollLeft;
}

function maxScroll(element: Element, axis: Axis): number {
  return axis === 'y'
    ? Math.max(0, element.scrollHeight - element.clientHeight)
    : Math.max(0, element.scrollWidth - element.clientWidth);
}

// 'instant' so a page's CSS `scroll-behavior: smooth` can't animate each frame
function write(element: Element, axis: Axis, value: number): void {
  element.scrollTo(
    axis === 'y' ? { top: value, behavior: 'instant' } : { left: value, behavior: 'instant' },
  );
}

function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

// Gone from the page, or scrolled by something else (wheel, trackpad, page)
function isStale(animation: Animation): boolean {
  return (
    !animation.element.isConnected ||
    Math.abs(position(animation.element, animation.axis) - animation.lastWritten) > 1
  );
}

/** Writes the position for `now`; returns true once the animation is done. */
function advance(animation: Animation, now: number): boolean {
  // A frame's timestamp can be earlier than the press, so clamp t
  const t = Math.min(1, Math.max(0, (now - animation.start) / animation.duration));
  const value =
    t === 1 ? animation.to : animation.from + (animation.to - animation.from) * easeOut(t);
  write(animation.element, animation.axis, value);
  animation.lastWritten = value;
  return t === 1;
}

/** The running animation for `element` and `axis`; a stale one is dropped. */
function live(animations: Set<Animation>, element: Element, axis: Axis): Animation | undefined {
  for (const animation of animations) {
    if (animation.element === element && animation.axis === axis) {
      if (!isStale(animation)) {
        return animation;
      }
      animations.delete(animation);
    }
  }
  return undefined;
}

/**
 * Animates scrolls itself, one animation per element and axis, so a new
 * press adds to where the last one was going and a held key keeps up.
 */
export function createScroller(deps: ScrollerDeps): Scroller {
  const animations = new Set<Animation>();
  let frameId: number | undefined;

  const onFrame = (now: number): void => {
    frameId = undefined;
    for (const animation of animations) {
      if (isStale(animation) || advance(animation, now)) {
        animations.delete(animation);
      }
    }
    if (animations.size > 0) {
      frameId = deps.frames.request(onFrame);
    }
  };

  const animateTo = (element: Element, axis: Axis, target: number, duration: number): void => {
    const running = live(animations, element, axis);
    const current = position(element, axis);
    const to = Math.min(Math.max(target, 0), maxScroll(element, axis));
    if (to === (running?.to ?? current)) {
      return;
    }
    if (running !== undefined) {
      animations.delete(running);
    }
    if (deps.prefersReducedMotion()) {
      write(element, axis, to);
      return;
    }
    animations.add({
      element,
      axis,
      from: current,
      to,
      start: deps.now(),
      duration,
      lastWritten: current,
    });
    frameId ??= deps.frames.request(onFrame);
  };

  return {
    scrollBy: (target, axis, delta, { repeat }) => {
      const from = live(animations, target, axis)?.to ?? position(target, axis);
      animateTo(target, axis, from + delta, repeat ? REPEAT_DURATION_MS : NORMAL_DURATION_MS);
    },
    scrollToFraction: (target, axis, fraction) => {
      animateTo(target, axis, Math.round(fraction * maxScroll(target, axis)), NORMAL_DURATION_MS);
    },
    stop: () => {
      if (frameId !== undefined) {
        deps.frames.cancel(frameId);
      }
      frameId = undefined;
      animations.clear();
    },
  };
}
