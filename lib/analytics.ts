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

/**
 * Record one site visit. visitorId is an anonymous id the frontend
 * generates and stores in localStorage — it lets us count unique
 * visitors without any login or personal data.
 */
export async function recordVisit(visitorId: string) {
  const today = todayKey();
  await Promise.all([
    kv.incr("visits:total:all"),
    kv.incr(`visits:total:${today}`),
    kv.sadd("visits:uniqueVisitors", visitorId),
  ]);
}

export async function getStats() {
  const today = todayKey();
  const [
    totalToday,
    totalAllTime,
    breakdown,
    visitsToday,
    visitsAllTime,
    uniqueVisitors,
  ] = await Promise.all([
    kv.get<number>(`clicks:total:${today}`),
    kv.get<number>("clicks:total:all"),
    kv.hgetall<Record<string, number>>("clicks:breakdown"),
    kv.get<number>(`visits:total:${today}`),
    kv.get<number>("visits:total:all"),
    kv.scard("visits:uniqueVisitors"),
  ]);

  const breakdownList = Object.entries(breakdown ?? {})
    .map(([label, count]) => ({ label, count: Number(count) }))
    .sort((a, b) => b.count - a.count);

  return {
    totalToday: totalToday ?? 0,
    totalAllTime: totalAllTime ?? 0,
    breakdown: breakdownList,
    visitsToday: visitsToday ?? 0,
    visitsAllTime: visitsAllTime ?? 0,
    uniqueVisitors: uniqueVisitors ?? 0,
  };
}
