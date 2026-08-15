import type { ContinuityDashboardSnapshot, DashboardTask } from './continuityDashboard';

export function selectDashboardTask(
  snapshot: ContinuityDashboardSnapshot,
  requestedTaskId?: string
): DashboardTask | undefined {
  if (requestedTaskId) {
    const requestedTask = snapshot.tasks.find((task) => task.id === requestedTaskId);
    if (requestedTask) return requestedTask;
  }

  return snapshot.tasks.find((task) => task.id === snapshot.activeTaskId) ?? snapshot.tasks[0];
}
