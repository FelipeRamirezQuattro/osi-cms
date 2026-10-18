# OSI visual guidelines

Use this as the baseline visual language for OSI websites and applications. It is intentionally small enough to adopt in another product without recreating the full marketing site.

## 1. Brand character

OSI should feel engineered, dependable, field-proven, and modern.

- Build the interface around deep navy, warm cream, white, and a restrained signal-gold accent.
- Prefer clear grids, thin technical rules, generous spacing, and strong information hierarchy.
- Mix precise geometric details with softer editorial typography so the product does not feel cold or overly industrial.
- Use gold to direct attention, not to decorate every surface.
- Keep effects quiet: subtle shadows, small movement, and no ornamental animation loops.

## 2. Core color system

Components should use semantic roles such as `surface-dark` and `accent-on-light`, rather than referencing palette names directly.

### Minimum OSI theme

| Role                   | Value     | Use                                                |
| ---------------------- | --------- | -------------------------------------------------- |
| Dark surface / primary | `#001B33` | Header, navigation, footer, hero, dark panels      |
| Secondary dark surface | `#04243D` | Layered dark areas, media overlays                 |
| Light surface          | `#F2E9DE` | Main application background                        |
| Raised light surface   | `#FFFAF4` | Cards, forms, elevated content                     |
| Accent on dark         | `#E2902A` | Primary actions and highlights on navy             |
| Accent on light        | `#885619` | Gold-colored text, icons, and links on cream/white |
| Text on dark           | `#FFFFFF` | Primary copy on navy                               |
| Text on light          | `#001B33` | Primary copy on cream/white                        |
| Muted text on dark     | `#818F9B` | Secondary copy on navy                             |
| Muted text on light    | `#576979` | Secondary copy on cream/white                      |

### Supporting colors

| Role                       | Value     | Use                                              |
| -------------------------- | --------- | ------------------------------------------------ |
| Dark panel                 | `#133752` | Cards and panels within navy areas               |
| Steel accent / information | `#234E7B` | Structural lines, technical details, info states |
| Meta text                  | `#4C6880` | Dates, captions, tertiary metadata               |
| Sand                       | `#D0C0A7` | Neutral supporting surfaces and placeholders     |
| Gold hover on dark         | `#F0A93D` | Hover state for gold actions on navy             |
| Focus indicator            | `#0066FF` | Universal keyboard-focus ring; keep fixed        |
| Error                      | `#B91C1C` | Error text and status                            |
| Success                    | `#047857` | Success text and status                          |
| Warning                    | `#92400E` | Warning text and status                          |

### Accessible pairings

- Use `#001B33` for text on cream: contrast is 14.52:1.
- Use `#576979` for muted text on cream: contrast is 4.72:1.
- Use `#818F9B` for muted text on navy: contrast is 5.26:1.
- Use `#E2902A` for accent text or controls on navy: contrast is 6.85:1.
- Use `#885619`, not bright gold, for text on cream: contrast is 5.16:1.
- Do not use `#E2902A` as normal-sized text on cream or white.
- Do not use color alone to communicate error, success, or status; pair it with text and/or an icon.

## 3. Typography

Use three complementary roles.

| Role        | Family     | Treatment                             | Use                                                                     |
| ----------- | ---------- | ------------------------------------- | ----------------------------------------------------------------------- |
| Display     | Orbitron   | Uppercase, medium/bold, wide tracking | Short hero titles, product names, major metrics, small technical labels |
| Heading     | Montserrat | Sentence/title case, semibold         | Section titles, card titles, dialogs, longer headlines                  |
| Body and UI | Poppins    | Regular/medium/semibold               | Paragraphs, forms, buttons, navigation, tables                          |

Recommended scale:

- Hero display: `clamp(2.5rem, 5vw, 4.5rem)`, line-height `1.05`.
- Section heading: `clamp(1.75rem, 3vw, 2.75rem)`, line-height `1.1`.
- Card title: `1.25rem` to `1.5rem`, line-height `1.2`.
- Body: `1rem`, line-height `1.7`.
- UI text: `0.875rem` to `1rem`.
- Small label: `0.75rem`, line-height `1.4`, uppercase with `0.12em` to `0.15em` tracking.

Rules:

- Reserve Orbitron for short, high-impact text. If a headline becomes long or wraps repeatedly, use Montserrat.
- Use Montserrat for readable mixed-case headings. This contrast with Orbitron is part of the OSI character.
- Keep body copy in Poppins and limit long reading lines to about `68ch`.
- Use tabular figures for measurements, KPIs, dates, and aligned numeric columns.

## 4. Layout and spacing

- Use a 4px base spacing grid, favoring 8px increments.
- Page gutter: `20px` on mobile and `40px` from tablet/desktop upward.
- Main content container: maximum `1152px` (`72rem`).
- Reading width: maximum `68ch`.
- Standard section padding: `64px` top and bottom.
- Compact section padding: `32px`; spacious section padding: `96px`.
- Common component gaps: `8px`, `16px`, `24px`, `32px`, and `48px`.
- Use one-column layouts on mobile, two columns when the content benefits from comparison, and three or four columns only for short cards or metrics.
- Maintain generous whitespace. OSI screens should feel structured, not dense.

## 5. Shape, borders, and elevation

### Radius scale

- Small: `8px` for compact controls and badges.
- Medium: `14px` for alerts and grouped controls.
- Large: `24px` for cards and media frames.
- Pill: `999px` for primary buttons, filters, and compact navigation actions.

### Signature geometry

- Use clipped or chamfered corners on hero media, technical callouts, and high-emphasis CTA bars.
- A typical clip is `20px` to `24px`; mobile seams should be smaller.
- Use diagonal seams between major navy and cream sections when a strong transition is useful.
- Do not apply clipped corners to every card. Pair them with conventional rounded surfaces so the motif remains distinctive.

### Borders and shadows

- On light surfaces, use navy at about `16%` opacity for 1px borders.
- On dark surfaces, use white at about `18%` opacity for 1px borders.
- Prefer hairline grids and borders over heavy boxes.
- Keep elevation subtle. A standard raised card can use `0 18px 45px rgba(0, 27, 51, 0.12)` on hover, with little or no resting shadow.

## 6. Core component patterns

### Application shell

- Use a sticky navy header with the OSI logo, white navigation, and a thin translucent bottom border.
- Keep the primary content area cream.
- Use navy for the footer and for focused technical bands or dashboards, not as the background of every screen.
- Mark the active navigation item with white text plus a thin gold underline or indicator.

### Buttons

- Primary on dark: gold pill, navy label, gold-light hover.
- Secondary on dark: transparent pill with a white border and white label.
- Secondary on light: transparent pill with a navy border and navy label.
- Text action: label plus a directional arrow; move the arrow about `4px` on hover.
- The signature CTA pairs a text pill with a `32px` outlined circular arrow.
- Minimum control height is `44px`; forms and principal actions should generally be `48px`.
- Pressed state may scale to `0.98`; disabled state uses `40%` to `55%` opacity and the semantic disabled attribute.

### Cards

- Use a raised cream/near-white surface, a 1px hairline border, and `20px` to `24px` internal padding.
- Use Montserrat semibold for titles and Poppins for supporting copy.
- Keep content visible without hover; hover is enhancement, not disclosure.
- A selectable or linked card may rise `4px` and gain a soft navy shadow on hover.
- Product and discovery cards should lead with 4:3 imagery and end with a persistent “Learn more →” affordance.

### Forms

- Always show a label above the field; placeholders are examples, not labels.
- Use white fields on cream surfaces, a `12px` radius, `48px` minimum height, and `16px` horizontal padding.
- Use steel blue for the focused border and a subtle three-pixel focus halo.
- Place helper and error text next to the relevant field.
- Show loading, success, and error states after submission; do not rely on a disabled button alone.

### Data, metrics, and tables

- Use navy bands or raised cream panels for high-value metrics.
- Set the primary number in Orbitron and the descriptive label in Poppins.
- Separate data with 1px hairlines and whitespace instead of heavy cell borders.
- For tables, align numeric columns, use tabular figures, keep row targets at least `44px` high, and retain visible labels on small screens.

### Status and system feedback

- Use colored text/border with a pale tonal background for success, warning, error, and information states.
- Include a short title plus a recovery-oriented message where relevant.
- Use `aria-live="polite"` for non-blocking updates and `role="alert"` for errors.

## 7. Imagery and iconography

- Favor real field operations, installed equipment, engineers, and technical product details.
- On navy sections, lightly desaturate photography and apply a navy multiply overlay so white and gold text remains legible.
- A left-to-right navy scrim is appropriate when copy sits over photography.
- Use one consistent SVG icon family with a clean outline style. Do not use emoji as interface icons.
- Use technical grids, coordinate-like labels, fine line diagrams, and restrained duotone treatments as supporting motifs.
- Use the approved OSI logo asset; do not redraw, stretch, rotate, or add effects to it.

## 8. Motion and interaction

- Fast feedback: `160ms` to `200ms`.
- Standard transitions: `260ms`.
- Section reveal: `360ms` to `400ms`.
- Use the OSI easing curve: `cubic-bezier(0.22, 0.61, 0.36, 1)`.
- Limit entrance movement to `8px` and reveal content once.
- Stagger related cards by about `80ms` when useful.
- Animate opacity and transforms; avoid animating layout dimensions.
- Do not use ambient decorative loops in application screens.
- Respect `prefers-reduced-motion`: remove translation and staggering while keeping content immediately available.

## 9. Accessibility baseline

- Normal text must meet WCAG AA contrast of at least 4.5:1.
- Interactive boundaries and focus indicators should meet at least 3:1 against adjacent colors.
- Keep the fixed blue `#0066FF` focus outline because it works on both cream and navy.
- Never remove focus rings without replacing them with an equally visible treatment.
- Support full keyboard navigation and logical focus order.
- Use at least `44px × 44px` touch targets with about `8px` between adjacent targets.
- Provide text alternatives for meaningful imagery and accessible names for icon-only actions.
- Do not disable zoom, hide essential content on mobile, or require hover to reveal essential actions.

## 10. Minimum implementation tokens

```css
:root {
  --osi-primary: #001b33;
  --osi-secondary: #04243d;
  --osi-panel-dark: #133752;
  --osi-steel: #234e7b;

  --osi-surface-light: #f2e9de;
  --osi-surface-raised: #fffaf4;
  --osi-sand: #d0c0a7;

  --osi-accent-on-dark: #e2902a;
  --osi-accent-on-dark-hover: #f0a93d;
  --osi-accent-on-light: #885619;

  --osi-text-on-dark: #ffffff;
  --osi-text-on-light: #001b33;
  --osi-muted-on-dark: #818f9b;
  --osi-muted-on-light: #576979;

  --osi-border-on-dark: rgb(255 255 255 / 18%);
  --osi-border-on-light: rgb(0 27 51 / 16%);
  --osi-focus: #0066ff;

  --osi-font-display: "Orbitron", sans-serif;
  --osi-font-heading: "Montserrat", sans-serif;
  --osi-font-body: "Poppins", sans-serif;

  --osi-radius-sm: 0.5rem;
  --osi-radius-md: 0.875rem;
  --osi-radius-lg: 1.5rem;
  --osi-container: 72rem;
  --osi-reading-width: 68ch;

  --osi-duration-fast: 160ms;
  --osi-duration-base: 260ms;
  --osi-ease: cubic-bezier(0.22, 0.61, 0.36, 1);
}
```

## 11. Quick adoption checklist

A new OSI application is visually aligned when it has:

- A navy shell, cream workspace, and restrained gold primary action.
- Orbitron for short display moments, Montserrat for headings, and Poppins for body/UI.
- Consistent semantic color tokens rather than raw hex values in components.
- 20px/40px page gutters, 64px standard section spacing, and a 1152px maximum container.
- Pill-shaped actions, hairline borders, and occasional clipped technical geometry.
- Visible focus states, 44px minimum targets, and correct light/dark muted text pairs.
- Quiet 160–400ms motion with reduced-motion support.
- Real field/technical imagery treated to remain legible within the navy/cream system.

If an application only adopts a few elements, prioritize the semantic palette, typography roles, spacing rhythm, button treatment, and accessibility rules. Those carry the OSI identity more reliably than decorative motifs alone.
