import { afterEach, describe, expect, it, vi } from 'vitest';

import { createScroller } from './scroller';
import type { Axis, FrameScheduler } from './scroller';

interface Sizes {
  readonly scrollHeight?: number;
  readonly clientHeight?: number;
  readonly scrollWidth?: number;
  readonly clientWidth?: number;
}

function makeScrollable(sizes: Sizes = {}, parent: Element = document.body) {
  const {
    scrollHeight = 2000,
    clientHeight = 1000,
    scrollWidth = 2000,
    clientWidth = 1000,
  } = sizes;
  const element = document.createElement('div');
  parent.appendChild(element);
  for (const [name, value] of Object.entries({
    scrollHeight,
    clientHeight,
    scrollWidth,
    clientWidth,
  })) {
    Object.defineProperty(element, name, { value, configurable: true });
  }
  // jsdom has no Element.scrollTo; its scrollTop / scrollLeft store any value
  const scrollTo = vi.fn((options: ScrollToOptions) => {
    if (options.top !== undefined) {
      element.scrollTop = options.top;
    }
    if (options.left !== undefined) {
      element.scrollLeft = options.left;
    }
  });
  Object.defineProperty(element, 'scrollTo', { value: scrollTo, configurable: true });
  return { element, scrollTo };
}

function setup({ reducedMotion = false } = {}) {
  let time = 0;
  let lastId = 0;
  const pending = new Map<number, (now: number) => void>();
  const request = vi.fn<FrameScheduler['request']>((callback) => {
    lastId += 1;
    pending.set(lastId, callback);
    return lastId;
  });
  const cancel = vi.fn<FrameScheduler['cancel']>((id) => {
    pending.delete(id);
  });
  const reduced = { value: reducedMotion };
  const scroller = createScroller({
    frames: { request, cancel },
    now: () => time,
    prefersReducedMotion: () => reduced.value,
  });
  return {
    scroller,
    request,
    cancel,
    reduced,
    at: (ms: number): void => {
      time = ms;
    },
    flush: (ms: number): void => {
      time = ms;
      for (const [id, callback] of [...pending]) {
        pending.delete(id);
        callback(ms);
      }
    },
    pendingFrames: (): number => pending.size,
  };
}

const NORMAL = { repeat: false };
const REPEAT = { repeat: true };

afterEach(() => {
  document.body.replaceChildren();
});

describe('createScroller', () => {
  it('reaches the destination 250 ms after a normal press', () => {
    const { scroller, flush, pendingFrames } = setup();
    const { element } = makeScrollable();

    scroller.scrollBy(element, 'y', 60, NORMAL);
    flush(100);

    expect(element.scrollTop).toBeCloseTo(47.04);

    flush(250);

    expect(element.scrollTop).toBe(60);
    expect(pendingFrames()).toBe(0);
  });

  it('reaches the destination 100 ms after a key-repeat press', () => {
    const { scroller, flush, pendingFrames } = setup();
    const { element } = makeScrollable();

    scroller.scrollBy(element, 'y', 60, REPEAT);
    flush(40);

    expect(element.scrollTop).toBeCloseTo(47.04);

    flush(100);

    expect(element.scrollTop).toBe(60);
    expect(pendingFrames()).toBe(0);
  });

  it('adds a new press to the previous destination, not the current position', () => {
    const { scroller, flush, at } = setup();
    const { element } = makeScrollable();

    scroller.scrollBy(element, 'y', 60, NORMAL);
    flush(50);
    at(50);
    scroller.scrollBy(element, 'y', 60, NORMAL);
    flush(200);

    expect(element.scrollTop).toBeGreaterThan(0);
    expect(element.scrollTop).toBeLessThan(120);

    flush(300);

    expect(element.scrollTop).toBe(120);
  });

  it('keeps up with a held key and stops 100 ms after the last press', () => {
    const { scroller, flush, at, pendingFrames } = setup();
    const { element } = makeScrollable();

    scroller.scrollBy(element, 'y', 60, NORMAL);
    for (const t of [33, 66, 99, 132]) {
      flush(t);
      at(t);
      scroller.scrollBy(element, 'y', 60, REPEAT);
    }
    flush(165);

    expect(Math.abs(element.scrollTop - 300)).toBeLessThanOrEqual(60);

    flush(232);

    expect(element.scrollTop).toBe(300);
    expect(pendingFrames()).toBe(0);
  });

  it('runs x and y animations on the same element together', () => {
    const { scroller, flush, request } = setup();
    const { element } = makeScrollable();

    scroller.scrollBy(element, 'y', 60, NORMAL);
    scroller.scrollBy(element, 'x', 40, NORMAL);
    flush(250);

    expect(element.scrollTop).toBe(60);
    expect(element.scrollLeft).toBe(40);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each<{ axis: Axis; property: 'scrollTop' | 'scrollLeft'; option: 'top' | 'left' }>([
    { axis: 'y', property: 'scrollTop', option: 'top' },
    { axis: 'x', property: 'scrollLeft', option: 'left' },
  ])('writes the $axis axis with $property', ({ axis, property, option }) => {
    const { scroller, flush } = setup();
    const { element, scrollTo } = makeScrollable();

    scroller.scrollBy(element, axis, 60, NORMAL);
    flush(250);

    expect(element[property]).toBe(60);
    expect(scrollTo).toHaveBeenLastCalledWith({ [option]: 60, behavior: 'instant' });
  });

  it('clamps the destination to the scroll range', () => {
    const { scroller, flush, at } = setup();
    const { element } = makeScrollable();
    element.scrollTop = 950;

    scroller.scrollBy(element, 'y', 60, NORMAL);
    flush(250);

    expect(element.scrollTop).toBe(1000);

    element.scrollTop = 30;
    at(250);
    scroller.scrollBy(element, 'y', -60, NORMAL);
    flush(500);

    expect(element.scrollTop).toBe(0);
  });

  it('does nothing at the edge', () => {
    const { scroller, request } = setup();
    const { element, scrollTo } = makeScrollable();

    element.scrollTop = 1000;
    scroller.scrollBy(element, 'y', 60, NORMAL);
    element.scrollTop = 0;
    scroller.scrollBy(element, 'y', -60, NORMAL);

    expect(scrollTo).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it('does nothing when the content fits', () => {
    const { scroller, request } = setup();
    const { element, scrollTo } = makeScrollable({ scrollHeight: 500, clientHeight: 1000 });

    scroller.scrollBy(element, 'y', 60, NORMAL);

    expect(scrollTo).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it('keeps the running deadline when a press adds nothing at the edge', () => {
    const { scroller, flush, at, pendingFrames } = setup();
    const { element } = makeScrollable();
    element.scrollTop = 950;

    scroller.scrollBy(element, 'y', 60, NORMAL);
    at(100);
    scroller.scrollBy(element, 'y', 60, NORMAL);
    flush(250);

    expect(element.scrollTop).toBe(1000);
    expect(pendingFrames()).toBe(0);
  });

  it('writes with behavior instant on the target only', () => {
    const { scroller, flush, at } = setup();
    const parent = makeScrollable();
    const child = makeScrollable({}, parent.element);

    scroller.scrollBy(child.element, 'y', 60, NORMAL);
    flush(250);

    expect(child.scrollTo.mock.calls.every(([options]) => options.behavior === 'instant')).toBe(
      true,
    );

    child.element.scrollTop = 1000;
    child.scrollTo.mockClear();
    at(250);
    scroller.scrollBy(child.element, 'y', 60, NORMAL);

    expect(child.scrollTo).not.toHaveBeenCalled();
    expect(parent.scrollTo).not.toHaveBeenCalled();
  });

  it('never moves backwards when the frame time is before the press', () => {
    const { scroller, flush, at } = setup();
    const { element } = makeScrollable();

    at(10);
    scroller.scrollBy(element, 'y', 60, NORMAL);
    flush(5);

    expect(element.scrollTop).toBe(0);

    flush(260);

    expect(element.scrollTop).toBe(60);
  });

  it('writes the destination at once when reduced motion is preferred', () => {
    const { scroller, request } = setup({ reducedMotion: true });
    const { element, scrollTo } = makeScrollable();

    scroller.scrollBy(element, 'y', 60, NORMAL);

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 60, behavior: 'instant' });
    expect(request).not.toHaveBeenCalled();
  });

  it('reads the reduced-motion preference on every scroll', () => {
    const { scroller, flush, reduced, pendingFrames } = setup();
    const { element, scrollTo } = makeScrollable();

    scroller.scrollBy(element, 'y', 60, NORMAL);
    flush(50);
    reduced.value = true;
    scroller.scrollBy(element, 'y', 60, NORMAL);

    expect(scrollTo).toHaveBeenLastCalledWith({ top: 120, behavior: 'instant' });

    const calls = scrollTo.mock.calls.length;
    flush(100);

    expect(scrollTo).toHaveBeenCalledTimes(calls);
    expect(pendingFrames()).toBe(0);
  });

  it('drops the animation when something else scrolls the element', () => {
    const { scroller, flush, at, pendingFrames } = setup();
    const { element, scrollTo } = makeScrollable();

    scroller.scrollBy(element, 'y', 60, NORMAL);
    flush(50);
    element.scrollTop += 5;
    const drifted = element.scrollTop;
    const calls = scrollTo.mock.calls.length;
    flush(100);

    expect(scrollTo).toHaveBeenCalledTimes(calls);
    expect(pendingFrames()).toBe(0);

    at(100);
    scroller.scrollBy(element, 'y', 60, NORMAL);
    flush(350);

    expect(element.scrollTop).toBeCloseTo(drifted + 60);
  });

  it('starts from the real position when something else scrolled before the next frame', () => {
    const { scroller, flush, at } = setup();
    const { element } = makeScrollable();

    scroller.scrollBy(element, 'y', 60, NORMAL);
    flush(50);
    element.scrollTop = 500;
    at(50);
    scroller.scrollBy(element, 'y', 60, NORMAL);
    flush(300);

    expect(element.scrollTop).toBe(560);
  });

  it('drops the animation when the element leaves the page', () => {
    const { scroller, flush, pendingFrames } = setup();
    const { element, scrollTo } = makeScrollable();

    scroller.scrollBy(element, 'y', 60, NORMAL);
    flush(50);
    element.remove();
    const calls = scrollTo.mock.calls.length;
    flush(100);

    expect(scrollTo).toHaveBeenCalledTimes(calls);
    expect(pendingFrames()).toBe(0);
  });

  it('moves to a fraction of the scroll range', () => {
    const { scroller, flush, at } = setup();
    const { element } = makeScrollable();

    scroller.scrollToFraction(element, 'y', 0.5);
    flush(250);

    expect(element.scrollTop).toBe(500);

    at(250);
    scroller.scrollToFraction(element, 'y', 1);
    flush(500);

    expect(element.scrollTop).toBe(1000);

    at(500);
    scroller.scrollToFraction(element, 'y', 0);
    flush(750);

    expect(element.scrollTop).toBe(0);
  });

  it('does nothing when the fraction is the current position', () => {
    const { scroller, request } = setup();
    const { element, scrollTo } = makeScrollable();

    scroller.scrollToFraction(element, 'y', 0);

    expect(scrollTo).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it('stops every animation', () => {
    const { scroller, flush, request, cancel } = setup();
    const { element, scrollTo } = makeScrollable();

    scroller.scrollBy(element, 'y', 60, NORMAL);
    scroller.stop();

    expect(cancel).toHaveBeenCalledWith(request.mock.results[0]?.value);

    flush(250);

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
