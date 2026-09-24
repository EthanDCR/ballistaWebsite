export type LearnerProgress = {
  schemaVersion: "1.0.0";
  learnerId: "local-learner";
  completedActivities: Record<string, { completedAt: string }>;
  updatedAt: string;
};

export interface ProgressRepository {
  getProgress(): Promise<LearnerProgress>;
  saveProgress(progress: LearnerProgress): Promise<void>;
}

const STORAGE_KEY = "claimcraft.progress.v1";

export function createDefaultProgress(): LearnerProgress {
  return {
    schemaVersion: "1.0.0",
    learnerId: "local-learner",
    completedActivities: {},
    updatedAt: new Date(0).toISOString(),
  };
}

class LocalStorageProgressRepository implements ProgressRepository {
  async getProgress(): Promise<LearnerProgress> {
    if (typeof window === "undefined") return createDefaultProgress();

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultProgress();
      const parsed = JSON.parse(raw) as Partial<LearnerProgress>;
      const fallback = createDefaultProgress();

      return {
        ...fallback,
        ...parsed,
        schemaVersion: "1.0.0",
        learnerId: "local-learner",
        completedActivities: parsed.completedActivities ?? {},
      };
    } catch {
      return createDefaultProgress();
    }
  }

  async saveProgress(progress: LearnerProgress): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }
}

export function createProgressRepository(): ProgressRepository {
  return new LocalStorageProgressRepository();
}
