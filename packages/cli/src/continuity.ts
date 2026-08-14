import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import type { RepositoryContext } from '@ecuabyte/cortex-core';

export interface RepositoryContextValues {
  root: string;
  remote?: string;
  branch?: string;
  commit?: string;
}

/**
 * Convert HTTPS and SCP-style Git remotes to a credential-free canonical URL.
 * Remote URLs can contain deploy tokens, so credentials must never become part
 * of the durable project identity.
 */
export function normalizeRemote(remote: string | undefined): string | undefined {
  if (!remote) return undefined;

  const trimmed = remote.trim();
  const scp = trimmed.match(/^(?:[^@]+@)?([^:/]+):(.+)$/);
  if (scp && !trimmed.includes('://')) {
    const [, host, path] = scp;
    if (host && path) {
      return `https://${host}/${path.replace(/^\/+/, '').replace(/\.git$/, '')}`;
    }
  }

  try {
    const url = new URL(trimmed);
    url.username = '';
    url.password = '';
    url.pathname = url.pathname.replace(/\.git$/, '').replace(/\/+$/, '');
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return trimmed.replace(/\.git$/, '').replace(/\/+$/, '');
  }
}

export function repositoryContextFromValues(values: RepositoryContextValues): RepositoryContext {
  const context: RepositoryContext = { root: values.root };
  const remote = normalizeRemote(values.remote);
  if (remote) context.remote = remote;
  if (values.branch) context.branch = values.branch;
  if (values.commit) context.commit = values.commit;
  context.worktree = values.root;
  return context;
}

export function deriveProjectId(repository: RepositoryContext): string {
  if (repository.remote) {
    try {
      const url = new URL(repository.remote);
      return `${url.host}${url.pathname}`.replace(/\/+$/, '');
    } catch {
      return repository.remote.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    }
  }
  return `local:${repository.root}`;
}

function gitValue(cwd: string, args: string[]): string | undefined {
  try {
    const value = execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

export function getRepositoryContext(cwd = process.cwd()): RepositoryContext {
  const requestedRoot = resolve(cwd);
  const root = gitValue(requestedRoot, ['rev-parse', '--show-toplevel']) ?? requestedRoot;

  return repositoryContextFromValues({
    root,
    remote: gitValue(root, ['config', '--get', 'remote.origin.url']),
    branch: gitValue(root, ['branch', '--show-current']),
    commit: gitValue(root, ['rev-parse', 'HEAD']),
  });
}
