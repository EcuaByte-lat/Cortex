import type { ContinuityEvidence, ContinuityHandoff } from '@ecuabyte/cortex-shared';

function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function renderEvidence(items: ContinuityEvidence[]): string {
  if (items.length === 0) return '- None recorded.';

  return items
    .map(
      (item) =>
        `- **${oneLine(item.summary)}** _(source: ${item.source}; authority: ${item.authority}; status: ${item.status})_`
    )
    .join('\n');
}

/** Render a provider-neutral handoff that can be pasted into any agent. */
export function renderContinuityHandoffMarkdown(handoff: ContinuityHandoff): string {
  const repository = handoff.task.repository;
  const repositoryLine = [repository.remote, repository.branch, repository.commit]
    .filter(Boolean)
    .join(' · ');

  return [
    `# Cortex Handoff: ${oneLine(handoff.summary)}`,
    '',
    `- Task: \`${handoff.task.id}\``,
    `- Attempt: \`${handoff.attempt.id}\``,
    `- Actor: ${handoff.attempt.actor.harness}${handoff.attempt.actor.model ? ` (${handoff.attempt.actor.model})` : ''}`,
    `- Repository: ${repositoryLine || repository.root}`,
    `- Freshness: **${handoff.freshness}**`,
    '',
    '## Objective',
    '',
    oneLine(handoff.task.objective),
    '',
    '## Decisions',
    '',
    renderEvidence(handoff.decisions),
    '',
    '## Files changed',
    '',
    renderEvidence(handoff.filesChanged),
    '',
    '## Commands',
    '',
    renderEvidence(handoff.commands),
    '',
    '## Tests and verification',
    '',
    renderEvidence([
      ...handoff.tests,
      ...handoff.evidence.filter((item) => item.kind === 'verification'),
    ]),
    '',
    '## Blockers',
    '',
    renderEvidence(handoff.blockers),
    '',
    '## Next actions',
    '',
    handoff.nextActions.length > 0
      ? handoff.nextActions.map((action) => `- ${oneLine(action)}`).join('\n')
      : '- None recorded.',
    '',
    '> Evidence is preserved by Cortex. Re-check the repository and stale claims before continuing.',
    '',
  ].join('\n');
}
