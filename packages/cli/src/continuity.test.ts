import { describe, expect, test } from 'bun:test';
import { deriveProjectId, normalizeRemote, repositoryContextFromValues } from './continuity';

describe('continuity repository identity', () => {
  test('normalizes common git remote formats without credentials', () => {
    expect(normalizeRemote('https://token@example.com/Org/Cortex.git')).toBe(
      'https://example.com/Org/Cortex'
    );
    expect(normalizeRemote('git@github.com:EcuaByte-lat/Cortex.git')).toBe(
      'https://github.com/EcuaByte-lat/Cortex'
    );
  });

  test('derives a stable project id from the remote or local root', () => {
    const remote = repositoryContextFromValues({
      root: 'C:\\workspace\\cortex',
      remote: 'git@github.com:EcuaByte-lat/Cortex.git',
      branch: 'main',
      commit: 'abc123',
    });
    expect(deriveProjectId(remote)).toBe('github.com/EcuaByte-lat/Cortex');

    const local = repositoryContextFromValues({ root: 'C:\\workspace\\local-project' });
    expect(deriveProjectId(local)).toBe('local:C:\\workspace\\local-project');
  });
});
