import { describe, expect, it } from 'vitest';
import { parseBooleanArg, parseIdArg } from './action-args';

describe('parseIdArg', () => {
  it('приймає непорожній рядок', () => {
    expect(parseIdArg('cmwjp0wui0001quxvyhimgrxv')).toBe('cmwjp0wui0001quxvyhimgrxv');
  });

  it.each([undefined, null, '', '   ', 42, {}, ['id'], 'x'.repeat(101)])('відхиляє %j', (value) => {
    expect(parseIdArg(value)).toBeNull();
  });
});

describe('parseBooleanArg', () => {
  it('лише справжні boolean', () => {
    expect(parseBooleanArg(true)).toBe(true);
    expect(parseBooleanArg('true')).toBeNull();
    expect(parseBooleanArg(undefined)).toBeNull();
  });
});
