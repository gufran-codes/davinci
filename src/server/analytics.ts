import { randomUUID } from "node:crypto";
import { run, one } from "./db";
import { now } from "./repository";
export interface AnalyticsProvider {
  track(userId: string, type: string, metadata?: Record<string, unknown>): void;
}
export const analytics: AnalyticsProvider = {
  track(userId, type, metadata = {}) {
    run(
      "INSERT INTO product_events VALUES(?,?,?,?,?)",
      randomUUID(),
      userId,
      type,
      JSON.stringify(metadata),
      now(),
    );
  },
};
export function trackReturn(userId: string, createdAt: string) {
  const days = Math.floor((Date.now() - Date.parse(createdAt)) / 86400000);
  for (const day of [2, 7])
    if (
      days >= day - 1 &&
      !one(
        "SELECT id FROM product_events WHERE user_id=? AND type=?",
        userId,
        `day_${day}_return`,
      )
    )
      analytics.track(userId, `day_${day}_return`);
}
