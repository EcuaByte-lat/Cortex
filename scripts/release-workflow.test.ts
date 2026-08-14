import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'bun:test';

const workflowPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '.github',
  'workflows',
  'unified.yml'
);

describe('GitHub extension release workflow', () => {
  test('creates an idempotent GitHub Release with the packaged VSIX', async () => {
    const workflow = await readFile(workflowPath, 'utf8');

    expect(workflow).toContain('name: Create GitHub Release');
    expect(workflow).toContain('GH_TOKEN: ${{ secrets.GH_TOKEN || secrets.GITHUB_TOKEN }}');
    expect(workflow).toContain('RELEASE_TAG="cortex-vscode@${EXTENSION_VERSION}"');
    expect(workflow).toContain('gh release view "$RELEASE_TAG"');
    expect(workflow).toContain('bunx @vscode/vsce package --no-dependencies');
    expect(workflow).toContain('cortex-vscode-${EXTENSION_VERSION}.vsix');
    expect(workflow).toContain('gh release create "$RELEASE_TAG"');

    expect(workflow.indexOf('gh release view "$RELEASE_TAG"')).toBeLessThan(
      workflow.indexOf('gh release create "$RELEASE_TAG"')
    );
  });
});
