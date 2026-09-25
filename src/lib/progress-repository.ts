/** A finished activity. `correct`/`total` are absent for activities that
 *  aren't scored (the sign-off) and for records saved before scores were
 *  tracked, so every reader must treat them as optional. */
export type ActivityRecord = {
  completedAt: string;
  correct?: number;
  total?: number;
};

export type LearnerProgress = {
  schemaVersion: "1.0.0";
  learnerId: "local-learner";
  completedActivities: Record<string, ActivityRecord>;
  updatedAt: string;
};

/** Totals every scored activity into one course-wide result. */
export function courseScore(progress: LearnerProgress) {
  let correct = 0;
  let total = 0;
  for (const entry of Object.values(progress.completedActivities)) {
    if (typeof entry.correct === "number" && typeof entry.total === "number") {
      correct += entry.correct;
      total += entry.total;
    }
  }
  return { correct, total, percent: total ? Math.round((correct / total) * 100) : 0 };
}

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
