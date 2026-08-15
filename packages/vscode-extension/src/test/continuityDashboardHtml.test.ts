import { describe, expect, test } from 'bun:test';
import { getContinuityDashboardHtml } from '../continuityDashboardHtml';

describe('Continuity dashboard HTML', () => {
  test('ships a self-contained secure webview with the core cockpit surfaces', () => {
    const html = getContinuityDashboardHtml('vscode-webview-source');

    expect(html).toContain("default-src 'none'");
    expect(html).toContain('Live activity');
    expect(html).toContain('Evidence health');
    expect(html).toContain('Open latest handoff');
    expect(html).not.toContain('unpkg.com');
  });

  test('mounts the shared React dashboard from a local webview bundle', () => {
    const html = getContinuityDashboardHtml('vscode-webview-source', 'vscode-webview-script');

    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('src="vscode-webview-script"');
  });
});
