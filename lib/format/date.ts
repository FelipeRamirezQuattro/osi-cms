// Admin timestamps are formatted with an explicit locale and time zone so the
// server render and the browser render are byte-identical. Anything that relies
// on the runtime default (`toLocaleString()` with no arguments) differs between
// the Vercel server (UTC, en-US) and an editor's browser, which React reports as
// hydration error #418.
const LOCALE = "en-US";
const TIME_ZONE = "America/Chicago"; // Odessa, TX — where OSI staff work

// timeZoneName makes the zone explicit ("CDT"/"CST") so staff elsewhere aren't misled.
const dateTime = new Intl.DateTimeFormat(LOCALE, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone: TIME_ZONE });
const date = new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeZone: TIME_ZONE });
const integer = new Intl.NumberFormat(LOCALE);

export function formatDateTime(value: string | number | Date): string {
  return dateTime.format(new Date(value));
}

export function formatDate(value: string | number | Date): string {
  return date.format(new Date(value));
}

export function formatInteger(value: number): string {
  return integer.format(value);
}
