import { describe, expect, test } from 'bun:test';
import { parseBridgeInput } from './bridge-input';

describe('bridge input', () => {
  test('parses JSON piped from Windows PowerShell with a UTF-8 BOM', () => {
    expect(parseBridgeInput('\uFEFF{"type":"SessionStart"}')).toEqual({
      type: 'SessionStart',
    });
  });
});
