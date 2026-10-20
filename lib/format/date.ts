// Admin timestamps are formatted with an explicit locale and time zone so the
// server render and the browser render are byte-identical. Anything that relies
// on the runtime default (`toLocaleString()` with no arguments) differs between
// the Vercel server (UTC, en-US) and an editor's browser, which React reports as
// hydration error #418.
const LOCALE = "en-US";
const TIME_ZONE = "America/Chicago"; // Odessa, TX — where OSI staff work

// Date and time are formatted separately and joined here: engines disagree on the
// glue ("Oct 19, 2026, 3:02 PM" vs WebKit's "Oct 19, 2026 at 3:02 PM"). timeZoneName
// makes the zone explicit ("CDT"/"CST") so staff elsewhere aren't misled.
const time = new Intl.DateTimeFormat(LOCALE, { hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone: TIME_ZONE });
const date = new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeZone: TIME_ZONE });
const integer = new Intl.NumberFormat(LOCALE);

// Newer ICU puts a narrow no-break space (U+202F) before AM/PM; WebKit and older
// engines use a plain space. Normalising keeps the server and every browser identical.
const plain = (text: string) => text.replace(/[\u202f\u00a0]/g, " ");

export function formatDateTime(value: string | number | Date): string {
  const d = new Date(value);
  return plain(`${date.format(d)}, ${time.format(d)}`);
}

export function formatDate(value: string | number | Date): string {
  return plain(date.format(new Date(value)));
}

export function formatInteger(value: number): string {
  return integer.format(value);
}
