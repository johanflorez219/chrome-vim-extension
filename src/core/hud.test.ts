import { describe, expect, it } from 'vitest';

import { hudView } from './hud';

describe('hudView', () => {
  it('shows the normal mode name with nothing pending and no position (R1.1)', () => {
    expect(hudView('normal', '', undefined)).toEqual({
      mode: 'NORMAL',
      pending: '',
      position: '',
    });
  });

  it('shows the pending keys in notation while a sequence waits (R1.3)', () => {
    expect(hudView('normal', '5g', undefined).pending).toBe('5g');
  });

  it('names the other modes in capitals (R1.1)', () => {
    expect(hudView('insert', '', undefined).mode).toBe('INSERT');
    expect(hudView('hint', '', undefined).mode).toBe('HINT');
    expect(hudView('help', '', undefined).mode).toBe('HELP');
    expect(hudView('find', '', undefined).mode).toBe('FIND');
  });

  it('shows the position as current/total while a query is remembered (R4.6)', () => {
    expect(hudView('normal', '', { current: 2, total: 7, capped: false }).position).toBe('2/7');
  });

  it('shows 0/0 for a remembered query with no matches (R3.6)', () => {
    expect(hudView('normal', '', { current: 0, total: 0, capped: false }).position).toBe('0/0');
  });

  it('marks a capped count with a plus sign', () => {
    expect(hudView('normal', '', { current: 1, total: 10_000, capped: true }).position).toBe(
      '1/10000+',
    );
  });
});
