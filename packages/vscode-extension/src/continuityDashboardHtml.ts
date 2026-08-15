import { randomBytes } from 'node:crypto';

function nonce(): string {
  return randomBytes(16).toString('base64');
}

function attribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function getContinuityDashboardHtml(cspSource: string, scriptUri?: string): string {
  const styleNonce = nonce();
  const scriptNonce = nonce();
  const script = scriptUri
    ? `<script nonce="${scriptNonce}" src="${attribute(scriptUri)}"></script>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${attribute(cspSource)}; style-src 'nonce-${styleNonce}'; script-src 'nonce-${scriptNonce}' ${attribute(cspSource)};">
  <title>Cortex Continuity Cockpit</title>
  <style nonce="${styleNonce}">
    :root {
      color-scheme: dark;
      --bg: var(--vscode-editor-background);
      --surface: var(--vscode-sideBar-background, var(--vscode-editor-background));
      --surface-raised: var(--vscode-editorWidget-background, var(--vscode-sideBar-background, var(--vscode-editor-background)));
      --surface-hover: var(--vscode-list-hoverBackground);
      --line: color-mix(in srgb, var(--vscode-foreground) 13%, transparent);
      --line-strong: color-mix(in srgb, var(--vscode-foreground) 23%, transparent);
      --text: var(--vscode-foreground);
      --muted: var(--vscode-descriptionForeground);
      --accent: #7dd3c7;
      --accent-blue: #8ab4ff;
      --success: #82d99b;
      --warning: #e4bd72;
      --danger: #f28b82;
      --purple: #c3a6ff;
      --mono: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Consolas, monospace);
      --sans: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
    }
    * { box-sizing: border-box; }
    html, body { min-height: 100%; }
    body { margin: 0; background: var(--bg); color: var(--text); font: 13px/1.45 var(--sans); overflow: hidden; }
    button { font: inherit; }
    button:focus-visible { outline: 1px solid var(--accent-blue); outline-offset: 2px; }
    .app { display: grid; grid-template-columns: 248px minmax(0, 1fr); height: 100vh; min-height: 560px; }
    .sidebar { display: flex; flex-direction: column; min-width: 0; border-right: 1px solid var(--line); background: color-mix(in srgb, var(--surface) 92%, black); }
    .brand { display: flex; align-items: center; gap: 10px; padding: 18px 16px 14px; border-bottom: 1px solid var(--line); }
    .brand-mark { width: 28px; height: 28px; display: grid; place-items: center; border: 1px solid color-mix(in srgb, var(--accent) 70%, transparent); color: var(--accent); font: 700 12px var(--mono); letter-spacing: -1px; }
    .brand-copy { min-width: 0; }
    .brand-name { font-size: 14px; font-weight: 650; }
    .brand-subtitle { color: var(--muted); font-size: 11px; }
    .sidebar-section { padding: 14px 12px 8px; }
    .section-label { display: flex; align-items: center; justify-content: space-between; padding: 0 4px 8px; color: var(--muted); font-size: 10px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }
    .workspace-card { border: 1px solid var(--line); background: color-mix(in srgb, var(--surface-raised) 55%, transparent); padding: 10px; }
    .workspace-name, .workspace-root, .task-title, .event-summary { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .workspace-name { font-weight: 600; }
    .workspace-root { margin-top: 2px; color: var(--muted); font: 10px var(--mono); }
    .task-list { display: flex; flex-direction: column; gap: 4px; overflow: auto; padding: 0 8px 10px; }
    .task { width: 100%; padding: 9px 9px 9px 10px; border: 1px solid transparent; background: transparent; color: var(--text); text-align: left; cursor: pointer; }
    .task:hover, .task.selected { border-color: var(--line-strong); background: var(--surface-hover); }
    .task.selected { border-left: 2px solid var(--accent); padding-left: 9px; }
    .task-row, .task-meta, .event-label, .event-sub, .top-actions, .meta-row, .task-actions, .inspector-actions { display: flex; }
    .task-row { align-items: center; gap: 7px; min-width: 0; }
    .task-dot, .connection-dot { width: 7px; height: 7px; flex: 0 0 auto; border-radius: 50%; background: var(--muted); }
    .task-dot.working, .connection.live .connection-dot { background: var(--accent); }
    .task-dot.blocked, .connection.offline .connection-dot { background: var(--danger); }
    .task-dot.waiting, .connection.stale .connection-dot { background: var(--warning); }
    .task-dot.completed { background: var(--success); }
    .task-title { font-size: 12px; }
    .task-meta { justify-content: space-between; gap: 8px; margin-top: 4px; color: var(--muted); font-size: 10px; }
    .sidebar-footer { margin-top: auto; padding: 12px; border-top: 1px solid var(--line); }
    .connection { display: flex; align-items: center; gap: 7px; color: var(--muted); font-size: 11px; }
    .connection.live { color: var(--success); }
    .connection.stale { color: var(--warning); }
    .connection.offline { color: var(--danger); }
    .main { min-width: 0; overflow: auto; }
    .topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 58px; padding: 0 24px; border-bottom: 1px solid var(--line); }
    .breadcrumb, .panel-caption { color: var(--muted); font-size: 11px; }
    .breadcrumb strong, .panel-title { color: var(--text); font-weight: 650; }
    .top-actions { align-items: center; gap: 8px; }
    .button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 30px; padding: 0 11px; border: 1px solid var(--line-strong); background: transparent; color: var(--text); cursor: pointer; }
    .button:hover { background: var(--surface-hover); border-color: color-mix(in srgb, var(--accent-blue) 45%, var(--line-strong)); }
    .button.primary { border-color: color-mix(in srgb, var(--accent) 65%, transparent); background: color-mix(in srgb, var(--accent) 13%, transparent); color: var(--accent); }
    .button.subtle { border-color: transparent; color: var(--muted); }
    .button:disabled { cursor: default; opacity: .45; }
    .page { max-width: 1600px; margin: 0 auto; padding: 24px; }
    .task-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding-bottom: 22px; }
    .eyebrow, .inspector-kicker { color: var(--accent); font: 700 10px var(--mono); letter-spacing: .11em; text-transform: uppercase; }
    h1 { max-width: 760px; margin: 6px 0 7px; font-size: clamp(22px, 3vw, 32px); line-height: 1.08; letter-spacing: -.035em; font-weight: 650; }
    .objective { max-width: 780px; margin: 0; color: var(--muted); font-size: 14px; }
    .task-actions { flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
    .meta-row { flex-wrap: wrap; gap: 7px; margin-top: 14px; }
    .chip { display: inline-flex; align-items: center; gap: 5px; min-height: 23px; padding: 0 8px; border: 1px solid var(--line); color: var(--muted); font: 10px var(--mono); }
    .chip strong { color: var(--text); font-weight: 500; }
    .chip.status-working { border-color: color-mix(in srgb, var(--accent) 45%, transparent); color: var(--accent); }
    .chip.status-blocked { border-color: color-mix(in srgb, var(--danger) 45%, transparent); color: var(--danger); }
    .chip.status-waiting { border-color: color-mix(in srgb, var(--warning) 45%, transparent); color: var(--warning); }
    .criteria { max-width: 780px; margin-top: 16px; padding-top: 13px; border-top: 1px solid var(--line); }
    .criteria-title { color: var(--muted); font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .criteria ul { margin: 8px 0 0; padding-left: 18px; color: var(--muted); font-size: 12px; }
    .criteria li + li { margin-top: 4px; }
    .metrics { display: grid; grid-template-columns: repeat(5, minmax(110px, 1fr)); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
    .metric { min-height: 76px; padding: 13px 14px; border-right: 1px solid var(--line); }
    .metric:last-child { border-right: 0; }
    .metric-label { color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: .06em; }
    .metric-value { margin-top: 4px; font: 650 22px var(--mono); }
    .metric-note { color: var(--muted); font-size: 10px; }
    .content-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(280px, .65fr); gap: 16px; margin-top: 18px; }
    .panel { min-width: 0; border: 1px solid var(--line); background: color-mix(in srgb, var(--surface-raised) 42%, transparent); }
    .panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 48px; padding: 0 14px; border-bottom: 1px solid var(--line); }
    .timeline-toolbar { display: flex; align-items: center; gap: 4px; }
    .filter { padding: 4px 7px; border: 0; background: transparent; color: var(--muted); font-size: 11px; cursor: pointer; }
    .filter.active, .filter:hover { color: var(--text); background: var(--surface-hover); }
    .timeline { padding: 7px 0 10px; }
    .event { position: relative; display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; gap: 9px; width: 100%; padding: 10px 14px; border: 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 70%, transparent); background: transparent; color: var(--text); text-align: left; cursor: pointer; }
    .event:hover, .event.selected { background: var(--surface-hover); }
    .event-rail { position: relative; display: flex; justify-content: center; }
    .event-rail::before { content: ""; position: absolute; top: 15px; bottom: -25px; width: 1px; background: var(--line-strong); }
    .event-mark { z-index: 1; width: 10px; height: 10px; margin-top: 3px; border: 2px solid var(--muted); background: var(--bg); }
    .event-mark.tool, .event-mark.file { border-color: var(--accent-blue); }
    .event-mark.command, .event-mark.evidence { border-color: var(--success); }
    .event-mark.error { border-color: var(--danger); background: color-mix(in srgb, var(--danger) 20%, var(--bg)); }
    .event-mark.prompt { border-color: var(--purple); }
    .event-main { min-width: 0; }
    .event-label { align-items: center; gap: 7px; min-width: 0; }
    .event-kind, .event-sub, .event-status { font: 10px var(--mono); }
    .event-kind { color: var(--muted); font-weight: 700; text-transform: uppercase; }
    .event-summary { font-size: 12px; }
    .event-sub { gap: 8px; margin-top: 3px; color: var(--muted); }
    .event-status { align-self: start; padding-top: 1px; color: var(--muted); white-space: nowrap; }
    .event-status.failed { color: var(--danger); }
    .event-status.verified { color: var(--success); }
    .empty { padding: 48px 22px; text-align: center; }
    .empty-mark { display: inline-grid; place-items: center; width: 48px; height: 48px; border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent); color: var(--accent); font: 700 16px var(--mono); }
    .empty h2 { margin: 14px 0 6px; font-size: 17px; }
    .empty p { max-width: 420px; margin: 0 auto 16px; color: var(--muted); }
    .inspector-body { padding: 14px; }
    .inspector-title { margin: 5px 0 8px; font-size: 16px; line-height: 1.25; }
    .inspector-summary { margin: 0 0 15px; color: var(--muted); }
    .detail-list { display: grid; grid-template-columns: 88px minmax(0, 1fr); gap: 7px 10px; margin: 0; font-size: 11px; }
    .detail-list > span { display: contents; }
    .detail-list dt { color: var(--muted); }
    .detail-list dd { overflow: hidden; margin: 0; font-family: var(--mono); text-overflow: ellipsis; white-space: nowrap; }
    .inspector-actions { flex-wrap: wrap; gap: 7px; margin-top: 16px; }
    pre { overflow: auto; max-height: 180px; margin: 10px 0 0; padding: 9px; border: 1px solid var(--line); background: color-mix(in srgb, var(--bg) 65%, black); color: var(--muted); font: 10px/1.45 var(--mono); white-space: pre-wrap; word-break: break-word; }
    @media (max-width: 980px) { .app { grid-template-columns: 210px minmax(0, 1fr); } .content-grid { grid-template-columns: 1fr; } }
    @media (max-width: 700px) { body { overflow: auto; } .app { display: block; height: auto; } .sidebar { min-height: 220px; border-right: 0; border-bottom: 1px solid var(--line); } .task-list { max-height: 150px; } .topbar { padding: 0 14px; } .page { padding: 16px 14px; } .task-hero { display: block; } .task-actions { justify-content: flex-start; margin-top: 16px; } .metrics { grid-template-columns: repeat(2, 1fr); } .metric:nth-child(2n) { border-right: 0; } .metric:nth-child(n+3) { border-top: 1px solid var(--line); } }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; } }
  </style>
</head>
<body>
  <div id="root"></div>
  <noscript>Cortex Continuity Cockpit · Live activity · Evidence health · Open latest handoff</noscript>
  ${script}
</body>
</html>`;
}
