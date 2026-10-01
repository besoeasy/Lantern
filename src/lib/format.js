// Small display formatters. Pure string/date helpers with no app dependencies.

// Relative age of a post: "now", "5h", or "Mar 4" once it is over a day old.
export function relTime(unixSec) {
  const d = new Date(unixSec * 1000);
  const h = Math.floor((Date.now() - d) / 36e5);
  if (h < 1) return "now";
  if (h < 24) return `${h}h`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// First letter for the fallback avatar circle.
export function initialOf(str, fallback = "?") {
  return (str || fallback).slice(0, 1).toUpperCase();
}

// Milliseconds remaining -> "2D 4H 9M left", or "Expired" once it runs out.
export function countdownText(msLeft) {
  let s = Math.max(0, Math.floor(msLeft / 1000));
  if (s <= 0) return "Expired";
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  const parts = [];
  if (d) parts.push(`${d}D`);
  if (h || d) parts.push(`${h}H`);
  if (m || (!d && !h)) parts.push(`${m}M`);
  if (!parts.length) parts.push(`${s}S`);
  return `${parts.join(" ")} left`;
}