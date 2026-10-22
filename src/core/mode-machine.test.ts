import { describe, expect, it, vi } from 'vitest';

import type { KeyPress, KeyResult } from './key-listener';
import {
  MODE_NAMES,
  createModeMachine,
  type EnterOptions,
  type Mode,
  type ModeMachine,
  type ModeName,
} from './mode-machine';

function fakeMode(name: ModeName, result: KeyResult = 'passed') {
  const handleKey = vi.fn<(press: KeyPress) => KeyResult>(() => result);
  const onEnter = vi.fn<(options: EnterOptions) => void>();
  const onExit = vi.fn<() => void>();
  const mode = { name, handleKey, onEnter, onExit } satisfies Mode;
  return { mode, handleKey, onEnter, onExit };
}
type FakeMode = ReturnType<typeof fakeMode>;

function setup(initial: ModeName = 'normal'): {
  machine: ModeMachine;
  normal: FakeMode;
  insert: FakeMode;
} {
  const normal = fakeMode('normal', 'consumed');
  const insert = fakeMode('insert', 'passed');
  const machine = createModeMachine([normal.mode, insert.mode], initial);
  return { machine, normal, insert };
}

const J: KeyPress = { key: 'j', repeat: false };

function expectNoHooks(...fakes: readonly FakeMode[]): void {
  for (const fake of fakes) {
    expect(fake.onEnter).not.toHaveBeenCalled();
    expect(fake.onExit).not.toHaveBeenCalled();
  }
}

describe('createModeMachine', () => {
  it('starts in the initial mode without calling its onEnter', () => {
    const { machine, normal, insert } = setup('insert');

    expect(machine.current).toBe('insert');
    expect(machine.isSticky).toBe(false);
    expectNoHooks(normal, insert);
  });

  it('sends keys to the current mode and returns its result', () => {
    const { machine, normal, insert } = setup();

    expect(machine.handleKey(J)).toBe('consumed');
    expect(normal.handleKey).toHaveBeenCalledWith(J);

    machine.enter('insert');

    expect(machine.handleKey(J)).toBe('passed');
    expect(insert.handleKey).toHaveBeenCalledWith(J);
  });

  it('calls onExit on the old mode and onEnter on the new one', () => {
    const { machine, normal, insert } = setup();

    machine.enter('insert');

    expect(normal.onExit).toHaveBeenCalledTimes(1);
    expect(insert.onEnter).toHaveBeenCalledTimes(1);
    expect(insert.onEnter).toHaveBeenCalledWith({ sticky: false });
    expect(machine.current).toBe('insert');
  });

  it('calls onExit before the switch and onEnter after it', () => {
    const { machine, normal, insert } = setup();
    const log: string[] = [];
    normal.onExit.mockImplementation(() => {
      log.push(`exit:${machine.current}`);
    });
    insert.onEnter.mockImplementation(() => {
      log.push(`enter:${machine.current}:${String(machine.isSticky)}`);
    });

    machine.enter('insert', { sticky: true });

    expect(log).toEqual(['exit:normal', 'enter:insert:true']);
  });

  it('does nothing when entering the current mode with the same stickiness', () => {
    const { machine, normal, insert } = setup();

    machine.enter('normal');

    expectNoHooks(normal, insert);
    expect(machine.current).toBe('normal');
    expect(machine.isSticky).toBe(false);
  });

  it('marks Insert mode sticky when entered with sticky: true', () => {
    const { machine, insert } = setup();

    machine.enter('insert', { sticky: true });

    expect(machine.isSticky).toBe(true);
    expect(insert.onEnter).toHaveBeenCalledWith({ sticky: true });
  });

  it('clears the sticky flag when entering another mode', () => {
    const { machine } = setup();
    machine.enter('insert', { sticky: true });

    machine.enter('normal');

    expect(machine.isSticky).toBe(false);
    expect(machine.current).toBe('normal');
  });

  it('updates only the sticky flag when re-entering the current mode with different stickiness', () => {
    const { machine, normal, insert } = setup();
    machine.enter('insert');
    for (const spy of [normal.onEnter, normal.onExit, insert.onEnter, insert.onExit]) {
      spy.mockClear();
    }

    machine.enter('insert', { sticky: true });

    expect(machine.isSticky).toBe(true);
    expectNoHooks(normal, insert);
  });

  it('lets a mode switch modes and hand the key on during handleKey', () => {
    const { machine, normal, insert } = setup('insert');
    insert.handleKey.mockImplementation((press) => {
      machine.enter('normal');
      return machine.handleKey(press);
    });

    expect(machine.handleKey(J)).toBe('consumed');
    expect(normal.handleKey).toHaveBeenCalledWith(J);
    expect(machine.current).toBe('normal');
  });

  it('registers one mode per name in MODE_NAMES', () => {
    expect(() =>
      createModeMachine(
        MODE_NAMES.map((name) => fakeMode(name).mode),
        'normal',
      ),
    ).not.toThrow();
  });

  it('throws when a mode is registered twice', () => {
    const modes = [fakeMode('normal').mode, fakeMode('normal').mode, fakeMode('insert').mode];

    expect(() => createModeMachine(modes, 'normal')).toThrow('Duplicate mode: normal');
  });

  it('throws when a mode in MODE_NAMES is missing', () => {
    expect(() => createModeMachine([fakeMode('normal').mode], 'normal')).toThrow(
      'Missing mode: insert',
    );
  });
});
