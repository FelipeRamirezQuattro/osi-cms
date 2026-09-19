// Shared cookie names between the beacon collect route
// (app/api/analytics/collect/route.ts, which sets these) and any other
// server-side code that opportunistically reads them (e.g.
// lib/data/search.ts, attributing a search to the visitor's existing
// session without establishing a new one).
export const VISITOR_COOKIE = "osi_vid";
export const SESSION_COOKIE = "osi_sid";
export const ATTRIBUTION_COOKIE = "osi_attr";
