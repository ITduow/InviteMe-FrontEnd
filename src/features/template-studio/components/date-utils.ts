export function isValidEventDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function calendarMonth(date: string) {
  if (!isValidEventDate(date)) return null;
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const first = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  const next = new Date(first);
  next.setUTCMonth(next.getUTCMonth() + 1);
  next.setUTCDate(0);
  return { year, month, day, offset: (first.getUTCDay() + 6) % 7, days: next.getUTCDate() };
}

export function eventTimestamp(date: string, time: string, timezone: "Asia/Ho_Chi_Minh" | "UTC") {
  if (!isValidEventDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return NaN;
  return Date.parse(`${date}T${time}:00${timezone === "UTC" ? "Z" : "+07:00"}`);
}

export function countdownParts(target: number, now: number) {
  if (!Number.isFinite(target)) return null;
  const total = Math.max(0, Math.ceil((target - now) / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor(total / 3600) % 24,
    minutes: Math.floor(total / 60) % 60,
    seconds: total % 60,
    ended: target <= now,
  };
}
