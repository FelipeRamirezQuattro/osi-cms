/**
 * Legacy-site inventory for migration batch 2 (live-site inspection,
 * 2026-10-04). Single source of truth for classification: the scraper,
 * importer, LEGACY-INVENTORY.csv and REDIRECT-PROPOSAL.csv all read this.
 * Slugs here are the stable upsert keys (no legacy_path column exists).
 */

export type LegacyGroup =
  | "general"
  | "services"
  | "careers-hse"
  | "news"
  | "esp"
  | "srp"
  | "gas-separation"
  | "sand-control"
  | "chemical-treatment"
  | "events"
  | "tools";

export type LegacyTarget =
  | "already_migrated"
  | "skipped"
  | "product"
  | "page"
  | "blog";

export interface LegacyEntry {
  id: string;
  /** Legacy path, e.g. "/esp-sand-d". */
  path: string;
  title: string;
  group: LegacyGroup;
  target: LegacyTarget;
  /** Target slug for product/page/blog. */
  slug?: string;
  /** Another entry's path this one duplicates (same content, second URL). */
  duplicateOf?: string;
  /** Where the existing site already sends / should send this path. */
  redirectTo?: string;
  needsOsiDecision?: boolean;
  language?: "es";
  note?: string;
}

const e = (
  id: number,
  path: string,
  title: string,
  group: LegacyGroup,
  target: LegacyTarget,
  extra: Partial<LegacyEntry> = {},
): LegacyEntry => ({ id: `PUB-${String(id).padStart(3, "0")}`, path, title, group, target, ...extra });

const product = (id: number, path: string, title: string, group: LegacyGroup, extra: Partial<LegacyEntry> = {}) =>
  e(id, path, title, group, "product", { slug: productSlug(path), ...extra });

const eventPage = (id: number, path: string, title: string, extra: Partial<LegacyEntry> = {}) =>
  e(id, path, title, "events", "page", { slug: path.slice(1), needsOsiDecision: true, ...extra });

/** Existing convention: drop a trailing "-osi" (esp-chem-screen-osi → esp-chem-screen). */
export function productSlug(path: string): string {
  return path.replace(/^\//, "").replace(/-osi$/, "");
}

export const LEGACY_ENTRIES: LegacyEntry[] = [
  // General
  e(1, "/about-us", "About Us", "general", "already_migrated", { slug: "about-us" }),
  e(2, "/", "Inicio", "general", "already_migrated", { slug: "home" }),
  e(3, "/products-1", "Products", "general", "skipped", {
    redirectTo: "/products",
    note: "Unedited Wix placeholder text; replaced by the new product listing.",
  }),
  e(4, "/wellbore-diagrams", "Wellbore Diagrams", "general", "page", { slug: "wellbore-diagrams" }),
  // Services / contact / customers
  e(5, "/book-online", "Book Online", "services", "skipped", { note: "Wix Bookings widget unavailable; not rebuilt." }),
  e(6, "/services-4", "Customer Cloud", "services", "skipped", {
    redirectTo: "/services",
    note: "External link to lightserve.com; redirect already exists.",
  }),
  e(7, "/inquiry-services-page", "Inquiry Services Page", "services", "page", { slug: "inquiry-services" }),
  e(8, "/machine-shop", "Machine Shop", "services", "already_migrated", { slug: "services/machine-shop" }),
  e(9, "/services-1", "Services", "services", "already_migrated", { slug: "services" }),
  // Careers / HSE / policies
  e(10, "/careers", "Careers", "careers-hse", "already_migrated", { slug: "careers" }),
  e(11, "/hiring", "Hiring", "careers-hse", "already_migrated", { slug: "careers/hiring" }),
  e(12, "/certifications", "HSE", "careers-hse", "already_migrated", { slug: "hse" }),
  e(13, "/iso-45001", "ISO 45001", "careers-hse", "skipped", { note: "Empty page on desktop and phone." }),
  e(14, "/osi-directory", "OSI Directory", "careers-hse", "already_migrated", { slug: "directory" }),
  e(15, "/privacy-policy", "Privacy Policy", "careers-hse", "already_migrated", { slug: "privacy-policy" }),
  e(16, "/sg-sst-policies", "SG SST Policies", "careers-hse", "already_migrated", {
    slug: "hse/sg-sst-policies",
    language: "es",
  }),
  e(17, "/terms-and-conditions", "Terms And Conditions", "careers-hse", "already_migrated", {
    slug: "terms-and-conditions",
  }),
  // News / documents / case studies
  e(18, "/blog", "Blog", "news", "skipped", { redirectTo: "/blog", note: "The /blog listing already exists." }),
  e(19, "/category", "Blog category", "news", "skipped", { redirectTo: "/blog", note: "Wix error page." }),
  e(20, "/case-study", "Case Study", "news", "page", { slug: "case-study" }),
  e(21, "/services-2", "OSI Papers", "news", "page", { slug: "osi-papers" }),
  e(22, "/single-post/odessa-separator-inc-acquires-acs-pump-and-supply-from-diamondback-energy",
    "Odessa Separator Inc Acquires ACS Pump And Supply From Diamondback Energy", "news", "blog", {
      slug: "odessa-separator-inc-acquires-acs-pump-and-supply-from-diamondback-energy",
    }),
  // ESP products
  e(23, "/esp-chem-screen-osi", "ESP Chem Screen OSI", "esp", "already_migrated", { slug: "esp-chem-screen" }),
  product(24, "/esp-guardian-shield", "ESP Guardian Shield", "esp"),
  product(25, "/esp-high-erosion-resistan", "ESP High Erosion Resistan", "esp"),
  product(26, "/esp-no-go-catcher", "ESP No Go Catcher", "esp"),
  product(27, "/esp-sand-d", "ESP Sand D", "esp"),
  product(28, "/esp-sand-lift", "ESP Sand Lift", "esp"),
  product(29, "/esp-screen-vortex-desander-osi", "ESP Screen Vortex Desander OSI", "esp"),
  product(30, "/esp-surge-valve", "ESP Surge Valve", "esp"),
  product(31, "/esp-top-bypass-valve", "ESP Top Bypass Valve", "esp"),
  product(32, "/esp-vortex-desander-bypass-valve", "ESP Vortex Desander Bypass Valve", "esp"),
  product(33, "/esp-vortex-desander-capillar-osi", "ESP Vortex Desander Capillar OSI", "esp"),
  product(34, "/esp-vortex-desander-osi", "ESP Vortex Desander OSI", "esp"),
  product(35, "/esp-vortex-desander-with-swivel", "ESP Vortex Desander With Swivel", "esp"),
  product(36, "/esp-vortex-regulator", "ESP Vortex Regulator", "esp"),
  product(37, "/osi-esp-guardian-shield", "OSI ESP Guardian Shield", "esp", { duplicateOf: "/esp-guardian-shield" }),
  product(38, "/osi-esp-packer-type-gas-separat", "OSI ESP Packer Type Gas Separat", "esp"),
  product(39, "/osi-pmm-guardian", "OSI PMM Guardian", "esp"),
  // SRP
  product(40, "/srp-retrievable-chem-tool", "SRP Retrievable Chem Tool", "srp"),
  e(41, "/srp-sand-lift", "SRP Sand Lift", "srp", "already_migrated", { slug: "srp-sand-lift" }),
  // Gas separation
  product(42, "/bumper-spring", "Bumper Spring", "gas-separation"),
  product(43, "/chamber-type-gas-separator", "Chamber Type Gas Separator", "gas-separation"),
  product(44, "/copy-of-g-force", "Copy of G Force", "gas-separation", { duplicateOf: "/gforce" }),
  product(45, "/gforce", "G Force", "gas-separation", { slug: "g-force" }),
  product(46, "/g-forcepackerless", "G Force Packerless", "gas-separation"),
  e(47, "/gasreleasesystem", "Gas Release System", "gas-separation", "already_migrated", { slug: "gas-release-system" }),
  product(48, "/gas-shield-osi", "Gas Shield OSI", "gas-separation"),
  product(49, "/gas-vent-tac", "Gas Vent TAC", "gas-separation"),
  product(50, "/osi-top-bypass-valve", "OSI Top Bypass Valve", "gas-separation"),
  product(51, "/packer-type-gas-separator-osi", "Packer Type Gas Separator OSI", "gas-separation"),
  product(52, "/quick-release", "Quick Release", "gas-separation"),
  product(53, "/slotted-gas-shield", "Slotted Gas Shield", "gas-separation"),
  product(54, "/slotted-gas-shield-gas-vent", "Slotted Gas Shield Gas Vent", "gas-separation"),
  product(55, "/surge-valve-packer-type-gas-separat", "Surge Valve Packer Type Gas Separat", "gas-separation"),
  product(56, "/the-nozzle", "The Nozzle", "gas-separation"),
  // Sand control
  product(57, "/hot-oil-tool", "Hot Oil Tool", "sand-control"),
  product(58, "/osi-mesh", "OSI Mesh", "sand-control"),
  product(59, "/pump-guard-screen-osi", "Pump Guard Screen OSI", "sand-control"),
  product(60, "/sandreleasevalve", "Sand Release Valve", "sand-control"),
  product(61, "/screen-vortex-desander-osi", "Screen Vortex Desander OSI", "sand-control"),
  product(62, "/super-perf", "Super Perf", "sand-control"),
  product(63, "/tubing-screen", "Tubing Screen", "sand-control"),
  product(64, "/vortex-desander-osi", "Vortex Desander OSI", "sand-control"),
  product(65, "/well-shock-kits-osi", "Well Shock Kits OSI", "sand-control"),
  // Chemical treatment
  product(66, "/chem-filter-tool", "Chem Filter Tool", "chemical-treatment"),
  product(67, "/chem-screen", "Chem Screen", "chemical-treatment"),
  product(68, "/chem-sticks", "Chem Sticks", "chemical-treatment"),
  product(69, "/chemicalinjectionmandrel", "Chemical Injection Mandrel", "chemical-treatment"),
  product(70, "/combination-tool", "Combination Tool", "chemical-treatment"),
  product(71, "/osi-chem-screen-gas-lift", "OSI Chem Screen Gas Lift", "chemical-treatment"),
  product(72, "/retrievable-chem-tool", "Retrievable Chem Tool", "chemical-treatment"),
  product(73, "/super-lube", "Super Lube", "chemical-treatment"),
  // Events, training, campaigns
  eventPage(74, "/employee-survey-osi", "Employee Survey OSI", { slug: "employee-survey" }),
  eventPage(75, "/esp-workshop-2026", "ESP Workshop 2026"),
  eventPage(76, "/form-sales-team-oil-show", "Form Sales Team Oil Show"),
  eventPage(77, "/oil-show-visitor", "Oil Show Visitor"),
  e(78, "/oil-show-visitor-1", "Oil Show Visitor 1", "events", "skipped", {
    redirectTo: "/oil-show-visitor",
    note: "Empty page; proposed redirect to /oil-show-visitor.",
  }),
  eventPage(79, "/osi-at-alf", "OSI at ALF"),
  eventPage(80, "/osihappyhour", "OSI Happy Hour"),
  eventPage(81, "/osi-hh-alce", "OSI HH ALCE"),
  eventPage(82, "/osi-lunch-and-learn", "OSI Lunch And Learn"),
  eventPage(83, "/reciclaje", "Reciclaje", { language: "es" }),
  eventPage(84, "/spe-alce", "SPE ALCE"),
  eventPage(85, "/swpsc-oil-show", "SWPSC Oil Show"),
  eventPage(86, "/training", "Training"),
  eventPage(87, "/training-vid-1", "Training Vid 1"),
  eventPage(88, "/training-vid-2", "Training Vid 2"),
  eventPage(89, "/webinars", "Webinars"),
  eventPage(90, "/workshop-brazil", "Workshop Brazil"),
  // Tools / unidentified
  e(91, "/calc", "Calculator", "tools", "skipped", { note: "Calculator backend refuses connections; not rebuilt." }),
  e(92, "/copia-de-fluid-levels", "Copy of Fluid Levels", "tools", "already_migrated", {
    slug: "services/pump-cards",
    redirectTo: "/services/pump-cards",
  }),
  e(93, "/one-min-mgnr", "One Minute Manager", "tools", "page", { slug: "one-minute-manager" }),
  product(94, "/osi-top-intake-bypass", "OSI Top Intake Bypass", "tools", { note: "Product by name; confirm after scrape." }),
  e(95, "/general-8", "Page named General 8", "tools", "already_migrated", {
    slug: "services/fluid-levels",
    redirectTo: "/services/fluid-levels",
  }),
  e(96, "/new-page", "Page named New Page", "tools", "skipped", { note: "Purpose unclear." }),
];

/** Group → existing product_categories slug, only where the match is exact. ESP/SRP stay uncategorized. */
export const GROUP_CATEGORY: Partial<Record<LegacyGroup, string>> = {
  "gas-separation": "gas-separation",
  "sand-control": "sand-control",
  "chemical-treatment": "chemical-treatment",
};

export const LEGACY_PDFS = [
  { id: "PDF-01", title: "OSI Brochure", path: "/_files/ugd/1ac9e9_931aa42fbde347859a703648a35d9297.pdf", kind: "brochure" },
  { id: "PDF-02", title: "Wellbore Diagrams", path: "/_files/ugd/1ac9e9_1726174c227f46a7aa42352c72f32498.pdf", kind: "datasheet" },
  { id: "PDF-03", title: "Wellbore Applications", path: "/_files/ugd/1ac9e9_c8af8b32a6894d97a9f1b6696200dd69.pdf", kind: "datasheet" },
  // resources.kind has no 'other'; 'manual' avoids a schema change (decision A).
  { id: "PDF-04", title: "Application for Employment", path: "/_files/ugd/1ac9e9_3c382bf27bb14bdf9f641abf896e4165.pdf", kind: "manual" },
] as const;

export const LEGACY_BASE = "https://www.odessaseparator.com";

/** Entries that need scraping: everything importable. */
export const scrapeTargets = () => LEGACY_ENTRIES.filter((x) => ["product", "page", "blog"].includes(x.target));
