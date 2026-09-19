export const showcaseContent = {
  company: "OSI",
  companyLong: "Odessa Separator Inc.",
  navigation: ["Solutions", "Products", "Industries", "Resources", "Company"],
  hero: {
    eyebrow: "Downhole performance engineering",
    title: "Condition the flow. Extend the run.",
    body: "OSI engineers fluid-conditioning systems that help artificial-lift operations manage gas, sand, solids, and chemical treatment with greater control.",
    primaryAction: "Explore our solutions",
    secondaryAction: "Talk to an engineer",
  },
  outcomes: [
    {
      number: "01",
      title: "Separate gas",
      body: "Improve gas-separation efficiency across challenging fluid and GLR conditions.",
      tag: "Gas Release System",
    },
    {
      number: "02",
      title: "Control sand",
      body: "Protect artificial-lift equipment from abrasive solids and premature failures.",
      tag: "SRP Sand Lift",
    },
    {
      number: "03",
      title: "Deliver chemistry",
      body: "Place treatment where it is needed with precise downhole activation and dispersal.",
      tag: "ESP Chem Screen",
    },
  ],
  capabilities: [
    { title: "Application engineering", body: "Well-specific review, selection, and system configuration." },
    { title: "Precision manufacturing", body: "Purpose-built tools produced for demanding downhole environments." },
    { title: "Field deployment", body: "Practical installation support from experienced technical teams." },
    { title: "Performance analysis", body: "A clear feedback loop from field result to the next design decision." },
  ],
  metrics: [
    { value: "145+", label: "Customers supported" },
    { value: "9+", label: "Countries across five continents" },
    { value: "40,000+", label: "Wells optimized since 1995" },
    { value: "30+", label: "Years solving downhole challenges" },
  ],
  story: {
    eyebrow: "Representative field story",
    title: "A clearer path through a high-GLR well",
    body: "A multidisciplinary team reviews well conditions, configures the separation system, and follows performance after installation—turning field evidence into a more reliable operating window.",
    note: "Illustrative scenario for design comparison; not a published customer result.",
    stat: "1 system",
    statLabel: "configured around the well",
  },
  technology: {
    eyebrow: "Engineering method",
    title: "Designed around the failure mode—not the catalog.",
    body: "Each recommendation connects operating conditions to flow behavior, material selection, tool geometry, and field serviceability.",
    steps: ["Diagnose", "Configure", "Validate", "Improve"],
  },
  responsibility: {
    eyebrow: "Operational responsibility",
    title: "Efficiency starts with longer, more predictable runs.",
    body: "The practical mechanism is straightforward: reduce avoidable interventions, protect lift equipment, improve treatment placement, and use field evidence to refine the next deployment.",
    points: ["Fewer avoidable workovers", "Equipment life considered", "Field feedback documented"],
  },
  insights: [
    { type: "Technical note", date: "Illustrative", title: "What high GLR changes in a horizontal well" },
    { type: "Field guide", date: "Illustrative", title: "A practical sand-control review checklist" },
    { type: "Engineering brief", date: "Illustrative", title: "Treatment placement: questions to ask first" },
  ],
  contact: {
    eyebrow: "Start with the operating challenge",
    title: "What are you trying to improve?",
    body: "Share the well conditions and your team’s target outcome. An OSI engineer can help identify a practical next step.",
  },
} as const;

export type ThemeSlug = "forge" | "vector" | "horizon" | "fieldwork" | "signal";

export const themes: Array<{
  slug: ThemeSlug;
  name: string;
  label: string;
  personality: string;
  idealUse: string;
  characteristics: string;
  palette: readonly string[];
  strengths: string;
  tradeoffs: string;
  accessibility: string;
  complexity: string;
  production: string;
}> = [
  {
    slug: "forge",
    name: "Forge",
    label: "Cinematic Industrial",
    personality: "Powerful, established, global, technically authoritative.",
    idealUse: "Heavy industry, infrastructure, and large-scale operations.",
    characteristics: "Full-bleed operational imagery, near-black surfaces, oversized condensed type, signal orange, and weighty proof points.",
    palette: ["#0b0c0d", "#202427", "#f4f0e8", "#ff5a1f"],
    strengths: "Immediate presence and high perceived authority.",
    tradeoffs: "Relies heavily on consistently excellent photography.",
    accessibility: "Excellent contrast; image overlays require careful art direction.",
    complexity: "High",
    production: "High—media pipeline and art direction are central.",
  },
  {
    slug: "vector",
    name: "Vector",
    label: "Precision Technology",
    personality: "Exact, intelligent, progressive, engineered.",
    idealUse: "Automation, artificial-lift engineering, measurement, and digital tools.",
    characteristics: "Split layouts, technical grids, cropped equipment imagery, coordinate marks, blue, and electric cyan.",
    palette: ["#f7f8f5", "#121820", "#0757d6", "#27e0c1"],
    strengths: "Makes complex engineering feel legible and differentiated.",
    tradeoffs: "Can feel clinical if human stories are underweighted.",
    accessibility: "Strong text contrast; diagrams need non-color cues.",
    complexity: "High",
    production: "Medium-high—requires a disciplined diagram system.",
  },
  {
    slug: "horizon",
    name: "Horizon",
    label: "Sustainable Progress",
    personality: "Optimistic, responsible, open, forward-looking.",
    idealUse: "Responsible operations, efficiency, and energy-transition messaging.",
    characteristics: "Generous whitespace, deep navy, mineral green, warm sand, atmospheric imagery, and contour-inspired curves.",
    palette: ["#f7f2e8", "#082b4c", "#176c5b", "#d9a35b"],
    strengths: "Broadens the brand beyond product performance.",
    tradeoffs: "Claims need careful evidence and precise language.",
    accessibility: "Comfortable reading rhythm; green accents avoid body text.",
    complexity: "Medium",
    production: "Medium—strong editorial content is the main need.",
  },
  {
    slug: "fieldwork",
    name: "Fieldwork",
    label: "Human Industrial",
    personality: "Practical, capable, direct, safety-conscious.",
    idealUse: "Field service, installation, maintenance, operations, and careers.",
    characteristics: "Worker-led compositions, work-order labels, concrete gray, charcoal, safety ochre, and compact utility typography.",
    palette: ["#eceae3", "#202321", "#f5b800", "#65706b"],
    strengths: "Human credibility and a strong service-oriented voice.",
    tradeoffs: "May underplay OSI’s advanced technology story.",
    accessibility: "Large utility labels and clear states; yellow is decorative only.",
    complexity: "Medium",
    production: "Medium—authentic field photography is essential.",
  },
  {
    slug: "signal",
    name: "Signal",
    label: "Editorial Enterprise",
    personality: "Credible, clear, contemporary, adaptable.",
    idealUse: "A diversified corporate website and balanced production baseline.",
    characteristics: "Restrained editorial splits, modular cards, off-white, ink blue, and one electric OSI accent.",
    palette: ["#f4f1ea", "#09213a", "#d8dde0", "#ff6b35"],
    strengths: "Most versatile, scalable, and content-friendly direction.",
    tradeoffs: "Less immediately dramatic than the expressive concepts.",
    accessibility: "Straightforward hierarchy and consistently strong contrast.",
    complexity: "Low-medium",
    production: "Lowest—closest to a durable enterprise system.",
  },
];

export function getTheme(slug: ThemeSlug) {
  const theme = themes.find((item) => item.slug === slug);
  if (!theme) throw new Error(`Unknown theme: ${slug}`);
  return theme;
}
