import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FrameScheduler } from '../scroll/scroller';

import { watchPage } from './page-watch';

const queue = new Map<number, (now: number) => void>();
let lastFrameId = 0;

const request = vi.fn<FrameScheduler['request']>((callback) => {
  lastFrameId += 1;
  queue.set(lastFrameId, callback);
  return lastFrameId;
});
// Like the browser, a cancelled frame never runs
const cancel = vi.fn<FrameScheduler['cancel']>((id) => {
  queue.delete(id);
});
const onChange = vi.fn<() => void>();

/** Runs the frames queued so far; a frame requested by one of them waits for the next flush. */
function flushFrame(): void {
  const pending = [...queue.values()];
  queue.clear();
  for (const callback of pending) {
    callback(0);
  }
}

function armed(): void {
  flushFrame();
  flushFrame();
}

let stop: (() => void) | undefined;

function watch(hinted: readonly Element[]): void {
  stop = watchPage({ window, frames: { request, cancel } }, hinted, onChange);
}

let container: HTMLElement;
let link: HTMLElement;
let carousel: HTMLElement;

beforeEach(() => {
  queue.clear();
  lastFrameId = 0;
  request.mockClear();
  cancel.mockClear();
  onChange.mockClear();
  container = document.body.appendChild(document.createElement('div'));
  link = container.appendChild(document.createElement('a'));
  link.setAttribute('href', 'https://x.test/');
  carousel = document.body.appendChild(document.createElement('div'));
});

afterEach(() => {
  stop?.();
  stop = undefined;
  document.body.replaceChildren();
});

describe('watchPage', () => {
  it('ignores scrolls during the first two animation frames', () => {
    watch([link]);
    document.dispatchEvent(new Event('scroll'));
    flushFrame();
    document.dispatchEvent(new Event('scroll'));
    expect(onChange).not.toHaveBeenCalled();

    flushFrame();
    document.dispatchEvent(new Event('scroll'));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('requests the second frame only after the first ran', () => {
    watch([link]);
    expect(request).toHaveBeenCalledOnce();
    flushFrame();
    expect(request).toHaveBeenCalledTimes(2);
    flushFrame();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it.each<readonly [string, () => EventTarget]>([
    ['the document', () => document],
    ['an element containing it', () => container],
    ['the hinted element itself', () => link],
  ])('ends on a scroll of %s', (_name, target) => {
    watch([link]);
    armed();
    target().dispatchEvent(new Event('scroll'));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('ends on a scroll around a hinted element in a shadow root', () => {
    const host = container.appendChild(document.createElement('div'));
    const button = document.createElement('button');
    host.attachShadow({ mode: 'open' }).appendChild(button);
    watch([button]);
    armed();
    container.dispatchEvent(new Event('scroll'));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('ignores a scroll elsewhere', () => {
    watch([link]);
    armed();
    carousel.dispatchEvent(new Event('scroll'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each<readonly [string, () => void]>([
    ['resize', () => window.dispatchEvent(new Event('resize'))],
    ['window blur', () => window.dispatchEvent(new FocusEvent('blur'))],
    ['visibilitychange', () => document.dispatchEvent(new Event('visibilitychange'))],
  ])('ends on %s even in the first frames', (_name, fire) => {
    watch([link]);
    fire();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('ignores an element losing focus', () => {
    const first = document.body.appendChild(document.createElement('button'));
    const second = document.body.appendChild(document.createElement('button'));
    first.focus();
    watch([link]);
    armed();
    second.focus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('calls onChange once and stops listening', () => {
    watch([link]);
    armed();
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    document.dispatchEvent(new Event('scroll'));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('stop before the first frame cancels it and removes the listeners', () => {
    watch([link]);
    stop?.();
    expect(cancel).toHaveBeenCalledExactlyOnceWith(1);
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new FocusEvent('blur'));
    document.dispatchEvent(new Event('visibilitychange'));
    flushFrame();
    flushFrame();
    document.dispatchEvent(new Event('scroll'));
    expect(onChange).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledOnce();
  });

  it('stop between the frames cancels the second one', () => {
    watch([link]);
    flushFrame();
    stop?.();
    expect(cancel).toHaveBeenCalledExactlyOnceWith(2);
    flushFrame();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('stop after both frames cancels nothing', () => {
    watch([link]);
    armed();
    stop?.();
    expect(cancel).not.toHaveBeenCalled();
  });

  it('stop twice is safe', () => {
    watch([link]);
    stop?.();
    expect(() => {
      stop?.();
    }).not.toThrow();
    expect(cancel).toHaveBeenCalledOnce();
  });
});
