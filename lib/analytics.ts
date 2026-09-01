import { kv } from "@vercel/kv";

/** YYYY-MM-DD in UTC, used as the daily counter key. */
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Record one click event under a breakdown label (e.g. "Law · 200lvl"). */
export async function recordClick(label: string) {
  const today = todayKey();
  await Promise.all([
    kv.incr("clicks:total:all"),
    kv.incr(`clicks:total:${today}`),
    kv.hincrby("clicks:breakdown", label, 1),
  ]);
}

export async function getStats() {
  const today = todayKey();
  const [totalToday, totalAllTime, breakdown] = await Promise.all([
    kv.get<number>(`clicks:total:${today}`),
    kv.get<number>("clicks:total:all"),
    kv.hgetall<Record<string, number>>("clicks:breakdown"),
  ]);

  const breakdownList = Object.entries(breakdown ?? {})
    .map(([label, count]) => ({ label, count: Number(count) }))
    .sort((a, b) => b.count - a.count);

  return {
    totalToday: totalToday ?? 0,
    totalAllTime: totalAllTime ?? 0,
    breakdown: breakdownList,
  };
}
