import { randomBytes } from 'node:crypto';

function nonce(): string {
  return randomBytes(16).toString('base64');
}

export function getContinuityDashboardHtml(cspSource: string): string {
  const scriptNonce = nonce();
  const styleNonce = nonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource}; style-src 'nonce-${styleNonce}'; script-src 'nonce-${scriptNonce}';">
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
    button:focus-visible, [tabindex]:focus-visible { outline: 1px solid var(--accent-blue); outline-offset: 2px; }
    .app { display: grid; grid-template-columns: 248px minmax(0, 1fr); height: 100vh; min-height: 560px; }
    .sidebar { display: flex; flex-direction: column; min-width: 0; border-right: 1px solid var(--line); background: color-mix(in srgb, var(--surface) 92%, black); }
    .brand { display: flex; align-items: center; gap: 10px; padding: 18px 16px 14px; border-bottom: 1px solid var(--line); }
    .brand-mark { width: 28px; height: 28px; display: grid; place-items: center; border: 1px solid color-mix(in srgb, var(--accent) 70%, transparent); color: var(--accent); font: 700 12px var(--mono); letter-spacing: -1px; }
    .brand-copy { min-width: 0; }
    .brand-name { font-size: 14px; font-weight: 650; letter-spacing: .01em; }
    .brand-subtitle { color: var(--muted); font-size: 11px; }
    .sidebar-section { padding: 14px 12px 8px; }
    .section-label { display: flex; align-items: center; justify-content: space-between; padding: 0 4px 8px; color: var(--muted); font-size: 10px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }
    .workspace-card { border: 1px solid var(--line); background: color-mix(in srgb, var(--surface-raised) 55%, transparent); padding: 10px; }
    .workspace-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
    .workspace-root { overflow: hidden; margin-top: 2px; color: var(--muted); font: 10px var(--mono); text-overflow: ellipsis; white-space: nowrap; }
    .task-list { display: flex; flex-direction: column; gap: 4px; overflow: auto; padding: 0 8px 10px; }
    .task { width: 100%; padding: 9px 9px 9px 10px; border: 1px solid transparent; background: transparent; color: var(--text); text-align: left; cursor: pointer; }
    .task:hover, .task.selected { border-color: var(--line-strong); background: var(--surface-hover); }
    .task.selected { border-left: 2px solid var(--accent); padding-left: 9px; }
    .task-row { display: flex; align-items: center; gap: 7px; min-width: 0; }
    .task-dot { width: 7px; height: 7px; flex: 0 0 auto; border-radius: 50%; background: var(--muted); }
    .task-dot.working { background: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 13%, transparent); }
    .task-dot.blocked { background: var(--danger); }
    .task-dot.waiting { background: var(--warning); }
    .task-dot.completed { background: var(--success); }
    .task-title { overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
    .task-meta { display: flex; justify-content: space-between; gap: 8px; margin-top: 4px; color: var(--muted); font-size: 10px; }
    .sidebar-footer { margin-top: auto; padding: 12px; border-top: 1px solid var(--line); }
    .connection { display: flex; align-items: center; gap: 7px; color: var(--muted); font-size: 11px; }
    .connection-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--muted); }
    .connection.live { color: var(--success); }
    .connection.live .connection-dot { background: var(--success); box-shadow: 0 0 0 3px color-mix(in srgb, var(--success) 13%, transparent); }
    .connection.stale { color: var(--warning); }
    .connection.stale .connection-dot { background: var(--warning); }
    .connection.offline { color: var(--danger); }
    .connection.offline .connection-dot { background: var(--danger); }
    .main { min-width: 0; overflow: auto; }
    .topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 58px; padding: 0 24px; border-bottom: 1px solid var(--line); }
    .breadcrumb { color: var(--muted); font-size: 11px; }
    .breadcrumb strong { color: var(--text); font-weight: 600; }
    .top-actions { display: flex; align-items: center; gap: 8px; }
    .button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 30px; padding: 0 11px; border: 1px solid var(--line-strong); background: transparent; color: var(--text); cursor: pointer; }
    .button:hover { background: var(--surface-hover); border-color: color-mix(in srgb, var(--accent-blue) 45%, var(--line-strong)); }
    .button.primary { border-color: color-mix(in srgb, var(--accent) 65%, transparent); background: color-mix(in srgb, var(--accent) 13%, transparent); color: var(--accent); }
    .button.subtle { border-color: transparent; color: var(--muted); }
    .button:disabled { cursor: default; opacity: .45; }
    .page { max-width: 1600px; margin: 0 auto; padding: 24px; }
    .task-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding-bottom: 22px; }
    .eyebrow { color: var(--accent); font: 700 10px var(--mono); letter-spacing: .11em; text-transform: uppercase; }
    h1 { max-width: 760px; margin: 6px 0 7px; font-size: clamp(22px, 3vw, 32px); line-height: 1.08; letter-spacing: -.035em; font-weight: 650; }
    .objective { max-width: 780px; margin: 0; color: var(--muted); font-size: 14px; }
    .task-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
    .meta-row { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; }
    .chip { display: inline-flex; align-items: center; gap: 5px; min-height: 23px; padding: 0 8px; border: 1px solid var(--line); color: var(--muted); font: 10px var(--mono); }
    .chip strong { color: var(--text); font-weight: 500; }
    .chip.status-working { border-color: color-mix(in srgb, var(--accent) 45%, transparent); color: var(--accent); }
    .chip.status-blocked { border-color: color-mix(in srgb, var(--danger) 45%, transparent); color: var(--danger); }
    .chip.status-waiting { border-color: color-mix(in srgb, var(--warning) 45%, transparent); color: var(--warning); }
    .metrics { display: grid; grid-template-columns: repeat(5, minmax(110px, 1fr)); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
    .metric { min-height: 76px; padding: 13px 14px; border-right: 1px solid var(--line); }
    .metric:last-child { border-right: 0; }
    .metric-label { color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: .06em; }
    .metric-value { margin-top: 4px; font: 650 22px var(--mono); letter-spacing: -.04em; }
    .metric-note { color: var(--muted); font-size: 10px; }
    .content-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(280px, .65fr); gap: 16px; margin-top: 18px; }
    .panel { min-width: 0; border: 1px solid var(--line); background: color-mix(in srgb, var(--surface-raised) 42%, transparent); }
    .panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 48px; padding: 0 14px; border-bottom: 1px solid var(--line); }
    .panel-title { font-weight: 650; }
    .panel-caption { color: var(--muted); font-size: 11px; }
    .timeline-toolbar { display: flex; align-items: center; gap: 4px; }
    .filter { padding: 4px 7px; border: 0; background: transparent; color: var(--muted); font-size: 11px; cursor: pointer; }
    .filter.active, .filter:hover { color: var(--text); background: var(--surface-hover); }
    .timeline { padding: 7px 0 10px; }
    .event { position: relative; display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; gap: 9px; width: 100%; padding: 10px 14px; border: 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 70%, transparent); background: transparent; color: var(--text); text-align: left; cursor: pointer; }
    .event:last-child { border-bottom: 0; }
    .event:hover, .event.selected { background: var(--surface-hover); }
    .event-rail { position: relative; display: flex; justify-content: center; }
    .event-rail::before { content: ""; position: absolute; top: 15px; bottom: -25px; width: 1px; background: var(--line-strong); }
    .event:last-child .event-rail::before { display: none; }
    .event-mark { z-index: 1; width: 10px; height: 10px; margin-top: 3px; border: 2px solid var(--muted); background: var(--bg); }
    .event-mark.tool, .event-mark.file { border-color: var(--accent-blue); }
    .event-mark.command, .event-mark.evidence { border-color: var(--success); }
    .event-mark.error { border-color: var(--danger); background: color-mix(in srgb, var(--danger) 20%, var(--bg)); }
    .event-mark.prompt { border-color: var(--purple); }
    .event-main { min-width: 0; }
    .event-label { display: flex; align-items: center; gap: 7px; min-width: 0; }
    .event-kind { color: var(--muted); font: 700 10px var(--mono); text-transform: uppercase; }
    .event-summary { overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
    .event-sub { display: flex; gap: 8px; margin-top: 3px; color: var(--muted); font: 10px var(--mono); }
    .event-status { align-self: start; padding-top: 1px; color: var(--muted); font: 10px var(--mono); white-space: nowrap; }
    .event-status.failed { color: var(--danger); }
    .event-status.verified { color: var(--success); }
    .empty { padding: 48px 22px; text-align: center; }
    .empty-mark { display: inline-grid; place-items: center; width: 48px; height: 48px; border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent); color: var(--accent); font: 700 16px var(--mono); }
    .empty h2 { margin: 14px 0 6px; font-size: 17px; }
    .empty p { max-width: 420px; margin: 0 auto 16px; color: var(--muted); }
    .inspector-body { padding: 14px; }
    .inspector-kicker { color: var(--accent); font: 700 10px var(--mono); letter-spacing: .08em; text-transform: uppercase; }
    .inspector-title { margin: 5px 0 8px; font-size: 16px; line-height: 1.25; }
    .inspector-summary { margin: 0 0 15px; color: var(--muted); }
    .detail-list { display: grid; grid-template-columns: 88px minmax(0, 1fr); gap: 7px 10px; margin: 0; font-size: 11px; }
    .detail-list dt { color: var(--muted); }
    .detail-list dd { overflow: hidden; margin: 0; font-family: var(--mono); text-overflow: ellipsis; white-space: nowrap; }
    .evidence-block { margin-top: 17px; padding-top: 14px; border-top: 1px solid var(--line); }
    .evidence-title { margin-bottom: 9px; color: var(--muted); font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .evidence-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 65%, transparent); font-size: 11px; }
    .evidence-row:last-child { border-bottom: 0; }
    .evidence-row strong { font: 600 12px var(--mono); }
    .inspector-actions { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 16px; }
    pre { overflow: auto; max-height: 180px; margin: 10px 0 0; padding: 9px; border: 1px solid var(--line); background: color-mix(in srgb, var(--bg) 65%, black); color: var(--muted); font: 10px/1.45 var(--mono); white-space: pre-wrap; word-break: break-word; }
    .hidden { display: none !important; }
    @media (max-width: 980px) { .app { grid-template-columns: 210px minmax(0, 1fr); } .content-grid { grid-template-columns: 1fr; } .inspector { min-height: 260px; } }
    @media (max-width: 700px) { body { overflow: auto; } .app { display: block; height: auto; } .sidebar { min-height: 220px; border-right: 0; border-bottom: 1px solid var(--line); } .task-list { max-height: 150px; } .main { overflow: visible; } .topbar { padding: 0 14px; } .page { padding: 16px 14px; } .task-hero { display: block; } .task-actions { justify-content: flex-start; margin-top: 16px; } .metrics { grid-template-columns: repeat(2, 1fr); } .metric:nth-child(2n) { border-right: 0; } .metric:nth-child(n+3) { border-top: 1px solid var(--line); } }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; } }
  </style>
</head>
<body>
  <div class="app">
    <aside class="sidebar" aria-label="Cortex workspace">
      <div class="brand"><div class="brand-mark" aria-hidden="true">C/</div><div class="brand-copy"><div class="brand-name">Cortex</div><div class="brand-subtitle">Continuity cockpit</div></div></div>
      <div class="sidebar-section"><div class="section-label"><span>Workspace</span><button id="refresh-button" class="button subtle" aria-label="Refresh local state">↻</button></div><div class="workspace-card"><div id="workspace-name" class="workspace-name">Workspace</div><div id="workspace-root" class="workspace-root">Waiting for local state</div></div></div>
      <div class="sidebar-section"><div class="section-label"><span>Tasks</span><span id="task-count">0</span></div></div>
      <div id="task-list" class="task-list" aria-label="Tasks"></div>
      <div class="sidebar-footer"><div id="connection" class="connection offline"><span class="connection-dot" aria-hidden="true"></span><span>Disconnected</span></div><div id="last-seen" class="workspace-root">No events received</div></div>
    </aside>
    <main class="main">
      <header class="topbar"><div class="breadcrumb"><strong>Cortex</strong><span> / </span><span>Engineering state</span></div><div class="top-actions"><span id="connection-chip" class="chip">Offline</span><button id="top-refresh" class="button subtle">Refresh</button><button id="handoff-button" class="button primary">Open latest handoff</button></div></header>
      <div id="empty-state" class="empty page"><div class="empty-mark" aria-hidden="true">C/</div><h2>Nothing is running yet</h2><p>Cortex will show the active task, agent activity, repository evidence, and safe handoff state here as agents work.</p><button id="empty-refresh" class="button primary">Read local state</button></div>
      <div id="task-page" class="page hidden">
        <section class="task-hero"><div><div class="eyebrow">Active engineering task</div><h1 id="task-title">No active task</h1><p id="task-objective" class="objective"></p><div id="task-meta" class="meta-row"></div></div><div class="task-actions"><button id="resume-button" class="button primary">Resume task</button><button id="copy-button" class="button">Copy handoff</button></div></section>
        <section class="metrics" aria-label="Evidence health"><div class="metric"><div class="metric-label">Current evidence</div><div id="metric-current" class="metric-value">0</div><div class="metric-note">usable now</div></div><div class="metric"><div class="metric-label">Verified</div><div id="metric-verified" class="metric-value">0</div><div class="metric-note">backed by source</div></div><div class="metric"><div class="metric-label">Needs review</div><div id="metric-unverified" class="metric-value">0</div><div class="metric-note">uncertain claims</div></div><div class="metric"><div class="metric-label">Failed</div><div id="metric-failed" class="metric-value">0</div><div class="metric-note">requires attention</div></div><div class="metric"><div class="metric-label">Conflicts</div><div id="metric-conflicts" class="metric-value">0</div><div class="metric-note">superseded state</div></div></section>
        <section class="content-grid"><div class="panel"><div class="panel-heading"><div><div class="panel-title">Live activity</div><div class="panel-caption">Normalized agent and engineering events</div></div><div class="timeline-toolbar"><button class="filter active" data-filter="all">All</button><button class="filter" data-filter="errors">Errors</button></div></div><div id="timeline" class="timeline" aria-live="polite"></div></div><aside class="panel inspector"><div class="panel-heading"><div><div class="panel-title">Evidence inspector</div><div class="panel-caption">Select an event to inspect its source</div></div></div><div id="inspector-body" class="inspector-body"></div></aside></section>
      </div>
    </main>
  </div>
  <script nonce="${scriptNonce}">
    const vscode = acquireVsCodeApi();
    const state = { snapshot: null, selectedEventId: null, filter: 'all' };
    const $ = (id) => document.getElementById(id);
    const post = (type, data) => vscode.postMessage(data === undefined ? { type } : { type, data });
    const text = (element, value) => { if (element) element.textContent = value ?? ''; };
    const safe = (value, fallback = '—') => value === undefined || value === null || value === '' ? fallback : String(value);
    const relative = (timestamp) => {
      if (!timestamp) return 'No activity';
      const seconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
      if (seconds < 5) return 'just now';
      if (seconds < 60) return seconds + 's ago';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return minutes + 'm ago';
      const hours = Math.floor(minutes / 60);
      return hours + 'h ago';
    };
    const titleCase = (value) => value ? value.replace(/[-_.]/g, ' ').replace(/\\b\\w/g, (letter) => letter.toUpperCase()) : '';
    const clear = (element) => { while (element && element.firstChild) element.removeChild(element.firstChild); };
    const chip = (label, value, className = '') => { const element = document.createElement('span'); element.className = 'chip ' + className; const strong = document.createElement('strong'); strong.textContent = label; element.append(strong, document.createTextNode(' ' + value)); return element; };

    function renderConnection(snapshot) {
      const connection = snapshot?.connection || 'offline';
      const label = connection === 'live' ? 'Live' : connection === 'stale' ? 'Last seen' : 'Offline';
      $('connection').className = 'connection ' + connection;
      $('connection').querySelector('span:last-child').textContent = label;
      $('connection-chip').textContent = label;
      text($('last-seen'), snapshot?.lastSeenAt ? 'Last event ' + relative(snapshot.lastSeenAt) : 'No events received');
    }

    function renderTasks(snapshot) {
      const list = $('task-list'); clear(list); const tasks = snapshot?.tasks || [];
      text($('task-count'), String(tasks.length));
      text($('workspace-name'), snapshot?.workspace?.name || 'Workspace');
      text($('workspace-root'), snapshot?.workspace?.root || 'Waiting for local state');
      tasks.forEach((task) => {
        const button = document.createElement('button'); button.className = 'task' + (task.id === snapshot.activeTaskId ? ' selected' : ''); button.type = 'button'; button.dataset.taskId = task.id; button.setAttribute('aria-label', task.objective);
        const row = document.createElement('div'); row.className = 'task-row'; const dot = document.createElement('span'); dot.className = 'task-dot ' + task.status; dot.setAttribute('aria-hidden', 'true'); const title = document.createElement('span'); title.className = 'task-title'; title.textContent = task.objective; row.append(dot, title);
        const meta = document.createElement('div'); meta.className = 'task-meta'; const actor = task.actor?.harness || 'unassigned'; const latest = task.latestEvent ? relative(task.latestEvent.timestamp) : 'no events'; meta.append(document.createTextNode(actor), document.createTextNode(latest)); button.append(row, meta); button.addEventListener('click', () => selectTask(task.id)); list.append(button);
      });
    }

    function selectTask(taskId) { if (!state.snapshot) return; state.snapshot.activeTaskId = taskId; state.selectedEventId = null; render(state.snapshot); }

    function activeTask(snapshot) { return snapshot?.tasks?.find((task) => task.id === snapshot.activeTaskId) || snapshot?.tasks?.[0]; }

    function renderHero(snapshot) {
      const task = activeTask(snapshot); if (!task) return;
      text($('task-title'), task.objective); text($('task-objective'), task.repository?.root ? 'Work is scoped to this repository and its current evidence trail.' : 'No repository scope recorded yet.');
      const meta = $('task-meta'); clear(meta); meta.append(chip('status', titleCase(task.status), 'status-' + task.status)); if (task.actor?.harness) meta.append(chip('agent', task.actor.harness)); if (task.actor?.model) meta.append(chip('model', task.actor.model)); if (task.repository?.branch) meta.append(chip('branch', task.repository.branch)); if (task.repository?.commit) meta.append(chip('commit', task.repository.commit.slice(0, 8)));
      $('resume-button').disabled = task.status === 'completed';
    }

    function renderMetrics(snapshot) { const metrics = snapshot?.evidenceSummary || {}; ['current','verified','unverified','failed','conflicts'].forEach((key) => text($('metric-' + key), String(metrics[key] || 0))); }

    function renderTimeline(snapshot) {
      const timeline = $('timeline'); clear(timeline); const task = activeTask(snapshot); const filter = state.filter; const events = (snapshot?.events || []).filter((event) => !task || event.taskId === task.id).filter((event) => filter === 'all' || event.status === 'failed' || event.kind === 'error');
      if (!events.length) { const empty = document.createElement('div'); empty.className = 'empty'; empty.style.padding = '36px 18px'; const heading = document.createElement('h2'); heading.textContent = filter === 'errors' ? 'No failures in this task' : 'Waiting for the first event'; const paragraph = document.createElement('p'); paragraph.textContent = filter === 'errors' ? 'Cortex has not recorded a failed tool or command.' : 'Start or resume an agent task and its normalized activity will appear here.'; empty.append(heading, paragraph); timeline.append(empty); return; }
      events.forEach((event) => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'event' + (event.id === state.selectedEventId ? ' selected' : ''); button.dataset.eventId = event.id;
        const rail = document.createElement('span'); rail.className = 'event-rail'; const mark = document.createElement('span'); mark.className = 'event-mark ' + event.kind; mark.setAttribute('aria-hidden', 'true'); rail.append(mark);
        const main = document.createElement('span'); main.className = 'event-main'; const label = document.createElement('span'); label.className = 'event-label'; const kind = document.createElement('span'); kind.className = 'event-kind'; kind.textContent = titleCase(event.kind); const summary = document.createElement('span'); summary.className = 'event-summary'; summary.textContent = event.summary; label.append(kind, summary); const sub = document.createElement('span'); sub.className = 'event-sub'; sub.append(document.createTextNode(event.agent?.harness || 'agent'), document.createTextNode(relative(event.timestamp))); main.append(label, sub);
        const status = document.createElement('span'); status.className = 'event-status ' + (event.status === 'failed' ? 'failed' : event.authority === 'verified' ? 'verified' : ''); status.textContent = event.status || 'observed'; button.append(rail, main, status); button.addEventListener('click', () => { state.selectedEventId = event.id; renderInspector(event); renderTimeline(state.snapshot); }); timeline.append(button);
      });
    }

    function renderInspector(event) {
      const body = $('inspector-body'); clear(body); if (!event) { const paragraph = document.createElement('p'); paragraph.className = 'inspector-summary'; paragraph.textContent = 'Choose an event to inspect its provenance, status, and related repository state.'; body.append(paragraph); return; }
      const kicker = document.createElement('div'); kicker.className = 'inspector-kicker'; kicker.textContent = titleCase(event.kind) + ' / ' + event.type; const heading = document.createElement('h2'); heading.className = 'inspector-title'; heading.textContent = event.summary; const summary = document.createElement('p'); summary.className = 'inspector-summary'; summary.textContent = 'Recorded ' + new Date(event.timestamp).toLocaleString(); body.append(kicker, heading, summary);
      const details = document.createElement('dl'); details.className = 'detail-list'; [['Actor', event.agent?.harness], ['Model', event.agent?.model], ['Session', event.agent?.sessionId], ['Source', event.source], ['Authority', event.authority], ['Status', event.status], ['Branch', event.repository?.branch], ['Commit', event.repository?.commit]].forEach(([label, value]) => { if (!value) return; const dt = document.createElement('dt'); dt.textContent = label; const dd = document.createElement('dd'); dd.textContent = value; details.append(dt, dd); }); body.append(details);
      if (event.details) { const pre = document.createElement('pre'); pre.textContent = JSON.stringify(event.details, null, 2); body.append(pre); }
      const actions = document.createElement('div'); actions.className = 'inspector-actions'; const copy = document.createElement('button'); copy.className = 'button'; copy.textContent = 'Copy evidence'; copy.addEventListener('click', () => post('copyEvidence', { summary: event.summary, details: event.details })); actions.append(copy); body.append(actions);
    }

    function render(snapshot) { state.snapshot = snapshot; renderConnection(snapshot); renderTasks(snapshot); const task = activeTask(snapshot); $('empty-state').classList.toggle('hidden', Boolean(task)); $('task-page').classList.toggle('hidden', !task); if (!task) return; renderHero(snapshot); renderMetrics(snapshot); renderTimeline(snapshot); const selected = snapshot.events.find((event) => event.id === state.selectedEventId) || snapshot.events.find((event) => event.taskId === task.id); state.selectedEventId = selected?.id || null; renderInspector(selected); }

    $('refresh-button').addEventListener('click', () => post('refreshDashboard')); $('top-refresh').addEventListener('click', () => post('refreshDashboard')); $('empty-refresh').addEventListener('click', () => post('refreshDashboard')); $('handoff-button').addEventListener('click', () => post('openHandoff')); $('copy-button').addEventListener('click', () => post('copyHandoff')); $('resume-button').addEventListener('click', () => post('resumeTask'));
    document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.filter').forEach((item) => item.classList.remove('active')); button.classList.add('active'); state.filter = button.dataset.filter || 'all'; if (state.snapshot) renderTimeline(state.snapshot); }));
    window.addEventListener('message', (message) => { const payload = message.data || {}; if (payload.type === 'hydrate') render(payload.state?.continuity || null); if (payload.type === 'continuitySnapshot') render(payload.snapshot); if (payload.type === 'clearState' && !state.snapshot) render(null); });
    window.setInterval(() => { if (state.snapshot) { renderConnection(state.snapshot); document.querySelectorAll('.event-sub').forEach((element) => { const eventId = element.closest('.event')?.dataset.eventId; const event = state.snapshot.events.find((item) => item.id === eventId); if (event) element.lastChild.textContent = relative(event.timestamp); }); } }, 15000);
    post('ready');
  </script>
</body>
</html>`;
}
