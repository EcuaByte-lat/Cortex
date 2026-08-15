import type { DashboardCommand, DashboardSnapshot } from '@ecuabyte/cortex-shared';
import { useSyncExternalStore } from 'react';
import type {
  DashboardEvidenceSummaryLike,
  DashboardFilter,
  DashboardSnapshotLike,
  DashboardStore,
} from './state';

export interface DashboardTransport {
  send(command: DashboardCommand): void | Promise<void>;
}

export interface DashboardAppProps<Snapshot extends DashboardSnapshotLike = DashboardSnapshot> {
  store: DashboardStore<Snapshot>;
  transport?: DashboardTransport;
}

function useDashboardState<Snapshot extends DashboardSnapshotLike>(
  store: DashboardStore<Snapshot>
) {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

function titleCase(value: string): string {
  return value.replace(/[-_.]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function relativeTime(timestamp?: string): string {
  if (!timestamp) return 'No activity';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function sendCommand(transport: DashboardTransport | undefined, command: DashboardCommand) {
  if (!transport) return;
  void transport.send(command);
}

function Chip({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <span className={`chip ${className}`}>
      <strong>{label}</strong> {value}
    </span>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="empty page">
      <div className="empty-mark" aria-hidden="true">
        C/
      </div>
      <h2>Nothing is running yet</h2>
      <p>
        Cortex will show the active task, agent activity, repository evidence, and safe handoff
        state here as agents work.
      </p>
      <button className="button primary" type="button" onClick={onRefresh}>
        Read local state
      </button>
    </div>
  );
}

function TaskList<Snapshot extends DashboardSnapshotLike>({
  state,
  onSelect,
}: {
  state: ReturnType<DashboardStore<Snapshot>['getState']>;
  onSelect: (taskId: string) => void;
}) {
  const tasks = state.snapshot?.tasks ?? [];
  return (
    <section id="task-list" className="task-list" aria-label="Tasks">
      {tasks.map((task) => (
        <button
          className={`task${task.id === state.selectedTaskId ? ' selected' : ''}`}
          type="button"
          key={task.id}
          aria-label={task.objective}
          onClick={() => onSelect(task.id)}
        >
          <span className="task-row">
            <span className={`task-dot ${task.status}`} aria-hidden="true" />
            <span className="task-title">{task.objective}</span>
          </span>
          <span className="task-meta">
            <span>{task.actor?.harness ?? 'unassigned'}</span>
            <span>{relativeTime(task.latestEvent?.timestamp)}</span>
          </span>
        </button>
      ))}
    </section>
  );
}

function EvidenceMetrics({ evidence }: { evidence: DashboardEvidenceSummaryLike }) {
  const metrics = [
    ['Current evidence', evidence.current, 'usable now'],
    ['Verified', evidence.verified, 'backed by source'],
    ['Needs review', evidence.unverified, 'uncertain claims'],
    ['Failed', evidence.failed, 'requires attention'],
    ['Conflicts', evidence.conflicts, 'superseded state'],
  ] as const;
  return (
    <section className="metrics" aria-label="Evidence health">
      {metrics.map(([label, value, note]) => (
        <div className="metric" key={label}>
          <div className="metric-label">{label}</div>
          <div className="metric-value">{value}</div>
          <div className="metric-note">{note}</div>
        </div>
      ))}
    </section>
  );
}

function TaskCriteria({ criteria }: { criteria: readonly string[] }) {
  if (criteria.length === 0) return null;
  return (
    <section className="criteria" aria-label="Acceptance criteria">
      <div className="criteria-title">Acceptance criteria</div>
      <ul>
        {criteria.map((criterion) => (
          <li key={criterion}>{criterion}</li>
        ))}
      </ul>
    </section>
  );
}

function Timeline<Snapshot extends DashboardSnapshotLike>({
  state,
  onSelect,
}: {
  state: ReturnType<DashboardStore<Snapshot>['getState']>;
  onSelect: (eventId: string) => void;
}) {
  const task = state.snapshot?.tasks.find((candidate) => candidate.id === state.selectedTaskId);
  const events = (state.snapshot?.events ?? [])
    .filter((event) => event.taskId === task?.id)
    .filter(
      (event) => state.filter === 'all' || event.status === 'failed' || event.kind === 'error'
    );

  if (events.length === 0) {
    return (
      <div className="empty" style={{ padding: '36px 18px' }}>
        <h2>
          {state.filter === 'errors' ? 'No failures in this task' : 'Waiting for the first event'}
        </h2>
        <p>
          {state.filter === 'errors'
            ? 'Cortex has not recorded a failed tool or command.'
            : 'Start or resume an agent task and its normalized activity will appear here.'}
        </p>
      </div>
    );
  }

  return (
    <div className="timeline" aria-live="polite">
      {events.map((event) => (
        <button
          className={`event${event.id === state.selectedEventId ? ' selected' : ''}`}
          type="button"
          key={event.id}
          onClick={() => onSelect(event.id)}
        >
          <span className="event-rail">
            <span className={`event-mark ${event.kind}`} aria-hidden="true" />
          </span>
          <span className="event-main">
            <span className="event-label">
              <span className="event-kind">{titleCase(event.kind)}</span>
              <span className="event-summary">{event.summary}</span>
            </span>
            <span className="event-sub">
              <span>{event.agent?.harness ?? 'agent'}</span>
              <span>{relativeTime(event.timestamp)}</span>
            </span>
          </span>
          <span
            className={`event-status ${event.status === 'failed' ? 'failed' : event.authority === 'verified' ? 'verified' : ''}`}
          >
            {event.status}
          </span>
        </button>
      ))}
    </div>
  );
}

function Inspector<Snapshot extends DashboardSnapshotLike>({
  state,
  onCopy,
}: {
  state: ReturnType<DashboardStore<Snapshot>['getState']>;
  onCopy: (event: NonNullable<Snapshot['events'][number]>) => void;
}) {
  const event = state.snapshot?.events.find((candidate) => candidate.id === state.selectedEventId);
  if (!event) {
    return (
      <div className="inspector-body">
        <p className="inspector-summary">
          Choose an event to inspect its provenance, status, and related repository state.
        </p>
      </div>
    );
  }

  return (
    <div className="inspector-body">
      <div className="inspector-kicker">
        {titleCase(event.kind)} / {event.type}
      </div>
      <h2 className="inspector-title">{event.summary}</h2>
      <p className="inspector-summary">Recorded {new Date(event.timestamp).toLocaleString()}</p>
      <dl className="detail-list">
        {[
          ['Actor', event.agent?.harness],
          ['Model', event.agent?.model],
          ['Session', event.agent?.sessionId],
          ['Source', event.source],
          ['Authority', event.authority],
          ['Status', event.status],
          ['Branch', event.repository?.branch],
          ['Commit', event.repository?.commit],
        ].map(([label, value]) =>
          value ? (
            <span key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </span>
          ) : null
        )}
      </dl>
      {event.details ? <pre>{JSON.stringify(event.details, null, 2)}</pre> : null}
      <div className="inspector-actions">
        <button className="button" type="button" onClick={() => onCopy(event)}>
          Copy evidence
        </button>
      </div>
    </div>
  );
}

function connectionLabel(connection: string | undefined) {
  return connection === 'live' ? 'Live' : connection === 'stale' ? 'Last seen' : 'Offline';
}

export function DashboardApp<Snapshot extends DashboardSnapshotLike = DashboardSnapshot>({
  store,
  transport,
}: DashboardAppProps<Snapshot>) {
  const state = useDashboardState(store);
  const snapshot = state.snapshot;
  const task = snapshot?.tasks.find((candidate) => candidate.id === state.selectedTaskId);
  const connection = connectionLabel(snapshot?.connection);
  const send = (command: DashboardCommand) => sendCommand(transport, command);
  const selectTask = (taskId: string) => store.dispatch({ type: 'selectTask', taskId });
  const selectEvent = (eventId: string) => store.dispatch({ type: 'selectEvent', eventId });
  const setFilter = (filter: DashboardFilter) => store.dispatch({ type: 'setFilter', filter });

  return (
    <div className="app">
      <aside className="sidebar" aria-label="Cortex workspace">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            C/
          </div>
          <div className="brand-copy">
            <div className="brand-name">Cortex</div>
            <div className="brand-subtitle">Continuity cockpit</div>
          </div>
        </div>
        <div className="sidebar-section">
          <div className="section-label">
            <span>Workspace</span>
            <button
              className="button subtle"
              type="button"
              aria-label="Refresh local state"
              onClick={() => send({ type: 'refreshDashboard' })}
            >
              ↻
            </button>
          </div>
          <div className="workspace-card">
            <div className="workspace-name">{snapshot?.workspace.name ?? 'Workspace'}</div>
            <div className="workspace-root">
              {snapshot?.workspace.root ?? 'Waiting for local state'}
            </div>
          </div>
        </div>
        <div className="sidebar-section">
          <div className="section-label">
            <span>Tasks</span>
            <span>{snapshot?.tasks.length ?? 0}</span>
          </div>
        </div>
        <TaskList state={state} onSelect={selectTask} />
        <div className="sidebar-footer">
          <div className={`connection ${snapshot?.connection ?? 'offline'}`}>
            <span className="connection-dot" aria-hidden="true" />
            <span>{connection}</span>
          </div>
          <div className="workspace-root">
            {snapshot?.lastSeenAt
              ? `Last event ${relativeTime(snapshot.lastSeenAt)}`
              : 'No events received'}
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <strong>Cortex</strong>
            <span> / </span>
            <span>Engineering state</span>
          </div>
          <div className="top-actions">
            <span className="chip">{connection}</span>
            <button
              className="button subtle"
              type="button"
              onClick={() => send({ type: 'refreshDashboard' })}
            >
              Refresh
            </button>
            <button
              className="button primary"
              type="button"
              disabled={!task}
              onClick={() => task && send({ type: 'openHandoff', data: { taskId: task.id } })}
            >
              Open latest handoff
            </button>
          </div>
        </header>
        {!task ? (
          <EmptyState onRefresh={() => send({ type: 'refreshDashboard' })} />
        ) : (
          <div className="page">
            <section className="task-hero">
              <div>
                <div className="eyebrow">Active engineering task</div>
                <h1>{task.objective}</h1>
                <p className="objective">
                  Work is scoped to this repository and its current evidence trail.
                </p>
                <div className="meta-row">
                  <Chip
                    label="status"
                    value={titleCase(task.status)}
                    className={`status-${task.status}`}
                  />
                  {task.actor?.harness ? <Chip label="agent" value={task.actor.harness} /> : null}
                  {task.actor?.model ? <Chip label="model" value={task.actor.model} /> : null}
                  {task.repository.branch ? (
                    <Chip label="branch" value={task.repository.branch} />
                  ) : null}
                  {task.repository.commit ? (
                    <Chip label="commit" value={task.repository.commit.slice(0, 8)} />
                  ) : null}
                </div>
                <TaskCriteria criteria={task.acceptanceCriteria ?? []} />
              </div>
              <div className="task-actions">
                <button
                  className="button primary"
                  type="button"
                  disabled={task.status === 'completed'}
                  onClick={() => send({ type: 'resumeTask', data: { taskId: task.id } })}
                >
                  Resume task
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={() => send({ type: 'copyHandoff', data: { taskId: task.id } })}
                >
                  Copy handoff
                </button>
              </div>
            </section>
            <EvidenceMetrics evidence={task.evidence} />
            <section className="content-grid">
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <div className="panel-title">Live activity</div>
                    <div className="panel-caption">Normalized agent and engineering events</div>
                  </div>
                  <div className="timeline-toolbar">
                    {(['all', 'errors'] as const).map((filter) => (
                      <button
                        className={`filter${state.filter === filter ? ' active' : ''}`}
                        type="button"
                        key={filter}
                        onClick={() => setFilter(filter)}
                      >
                        {filter === 'all' ? 'All' : 'Errors'}
                      </button>
                    ))}
                  </div>
                </div>
                <Timeline state={state} onSelect={selectEvent} />
              </div>
              <aside className="panel inspector">
                <div className="panel-heading">
                  <div>
                    <div className="panel-title">Evidence inspector</div>
                    <div className="panel-caption">Select an event to inspect its source</div>
                  </div>
                </div>
                <Inspector
                  state={state}
                  onCopy={(event) =>
                    send({
                      type: 'copyEvidence',
                      data: { summary: event.summary, details: event.details },
                    })
                  }
                />
              </aside>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
