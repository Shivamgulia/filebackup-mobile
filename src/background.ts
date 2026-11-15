import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { syncAndUpload } from './sync';

export const TASK_NAME = 'filebackup-sync';

// Task definition must run at app launch (see index.ts), before registration.
TaskManager.defineTask(TASK_NAME, async () => {
  try {
    await syncAndUpload();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Registers the periodic maintenance sync. Where the OS or Expo Go can't run
 * background tasks (iOS in Expo Go, restricted battery settings), this is a no-op —
 * on-open backfill and the manual sync button still cover it.
 */
export async function registerSyncTask(): Promise<void> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Available) {
      await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 15 });
    }
  } catch {
    // unavailable — treat as no-op
  }
}
