const SEARCH_ENGINE_HOSTS = [
  "google.",
  "bing.com",
  "yahoo.",
  "duckduckgo.com",
  "baidu.com",
  "yandex.",
];

const SOCIAL_HOSTS = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "youtube.com",
  "pinterest.com",
];

const PAID_UTM_MEDIUMS = ["cpc", "ppc", "paid", "cpm", "paidsocial", "display"];

export type TrafficCategory = "direct" | "organic" | "social" | "referral" | "paid";

function hostMatches(host: string, patterns: string[]): boolean {
  return patterns.some((pattern) => host.includes(pattern));
}

export function classifyTraffic(params: {
  referrerHost: string | null;
  utmMedium: string | null;
}): TrafficCategory {
  const { referrerHost, utmMedium } = params;

  if (utmMedium && PAID_UTM_MEDIUMS.includes(utmMedium.toLowerCase())) {
    return "paid";
  }

  if (!referrerHost) {
    return "direct";
  }

  const host = referrerHost.toLowerCase();

  if (hostMatches(host, SEARCH_ENGINE_HOSTS)) {
    return "organic";
  }

  if (hostMatches(host, SOCIAL_HOSTS)) {
    return "social";
  }

  return "referral";
}
