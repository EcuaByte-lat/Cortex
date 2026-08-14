import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Dashboard panel restoration', () => {
  test('registers a serializer for an already-open dashboard webview', () => {
    const source = readFileSync(join(import.meta.dir, '..', 'extension.ts'), 'utf8');

    expect(source).toContain("registerWebviewPanelSerializer('cortexAIScan'");
  });
});
